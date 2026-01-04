package worker

import (
	"api/models/models"
	"api/pkg/db/key_value"
	"api/pkg/log"
	"api/service"
	"api/service/client"
	"api/service/session"
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"
)

// SessionManager manages publishers for multiple sessions
type SessionManager struct {
	store      *session.Store
	kvClient   *key_value.Client
	publishers map[string]context.CancelFunc // sessionID -> cancel function
	mu         sync.RWMutex
}

// NewSessionManager creates a new session manager
func NewSessionManager() *SessionManager {
	return &SessionManager{
		store:      session.NewStore(),
		kvClient:   key_value.New(),
		publishers: make(map[string]context.CancelFunc),
	}
}

// Start initializes the session manager and starts publishers for existing sessions
func (sm *SessionManager) Start(ctx context.Context) {
	log.Infoln("Starting session manager...")

	// Load existing sessions and start publishers
	sessions, err := sm.store.List()
	if err != nil {
		log.PrettyError(fmt.Errorf("failed to load sessions: %w", err))
		return
	}

	log.Infof("Found %d existing sessions", len(sessions))
	for _, sess := range sessions {
		if !sess.IsPaused {
			sm.StartSession(ctx, sess)
		} else {
			log.Infof("Skipping paused session: %s (%s)", sess.Name, sess.ID)
		}
	}

	// Keep the manager running and periodically check for new sessions
	go sm.watchForNewSessions(ctx)

	<-ctx.Done()
	log.Infoln("Session manager stopped")
}

// watchForNewSessions periodically checks for new sessions that need publishers
func (sm *SessionManager) watchForNewSessions(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			sessions, err := sm.store.List()
			if err != nil {
				log.PrettyError(fmt.Errorf("failed to list sessions: %w", err))
				continue
			}

			sm.mu.RLock()
			for _, sess := range sessions {
				_, isRunning := sm.publishers[sess.ID]

				if sess.IsPaused && isRunning {
					// Session was paused - stop the publisher
					sm.mu.RUnlock()
					log.Infof("Stopping publisher for paused session: %s (%s)", sess.Name, sess.ID)
					sm.StopSession(sess.ID)
					sm.mu.RLock()
				} else if !sess.IsPaused && !isRunning {
					// Session is not paused and not running - start it
					sm.mu.RUnlock()
					sm.StartSession(ctx, sess)
					sm.mu.RLock()
				}
			}

			// Check for deleted sessions
			for sessionID := range sm.publishers {
				found := false
				for _, sess := range sessions {
					if sess.ID == sessionID {
						found = true
						break
					}
				}
				if !found {
					sm.mu.RUnlock()
					sm.StopSession(sessionID)
					sm.mu.RLock()
				}
			}
			sm.mu.RUnlock()
		}
	}
}

// StartSession starts a publisher for the given session
func (sm *SessionManager) StartSession(parentCtx context.Context, sess *models.Session) {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	// Check if already running
	if _, exists := sm.publishers[sess.ID]; exists {
		log.Warnf("Publisher for session %s already running", sess.ID)
		return
	}

	ctx, cancel := context.WithCancel(parentCtx)
	sm.publishers[sess.ID] = cancel

	log.Infof("Starting publisher for session: %s (%s)", sess.Name, sess.ID)

	go sm.publishLoop(ctx, sess)
}

// StopSession stops the publisher for the given session
func (sm *SessionManager) StopSession(sessionID string) {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	if cancel, exists := sm.publishers[sessionID]; exists {
		cancel()
		delete(sm.publishers, sessionID)
		log.Infof("Stopped publisher for session: %s", sessionID)
	}
}

// publishLoop runs the event publishing loop for a session
func (sm *SessionManager) publishLoop(ctx context.Context, sess *models.Session) {
	channelKey := fmt.Sprintf("%s:%s", models.SatisfactoryEventKey, sess.ID)

	// Create the appropriate client for this session
	var apiClient client.Client
	if sess.IsMock {
		apiClient = service.NewMockClient()
	} else {
		apiClient = service.NewClientWithAddress(sess.Address)
	}

	handler := func(event *models.SatisfactoryEvent) {
		toPublish := []models.SatisfactoryEvent{*event}

		switch event.Type {
		case models.SatisfactoryEventApiStatus:
			// Update session online status
			status := event.Data.(*models.SatisfactoryApiStatus)
			if err := sm.store.UpdateOnlineStatus(sess.ID, status.Running); err != nil {
				log.Warnf("Failed to update session online status: %v", err)
			}
		}

		for _, e := range toPublish {
			asJson, err := json.Marshal(e)
			if err != nil {
				log.PrettyError(fmt.Errorf("failed to marshal event for session %s: %w", sess.ID, err))
				return
			}

			// Cache the event data for /state endpoint (no expiration - updated by polling)
			cacheKey := fmt.Sprintf("state:%s:%s", sess.ID, e.Type)
			eventData, cacheErr := json.Marshal(e.Data)
			if cacheErr == nil {
				if setErr := sm.kvClient.Set(cacheKey, string(eventData), 0); setErr != nil {
					log.Warnf("Failed to cache event %s for session %s: %v", e.Type, sess.ID, setErr)
				}
			}

			// Publish to SSE subscribers
			err = sm.kvClient.Publish(channelKey, asJson)
			if err != nil {
				log.PrettyError(fmt.Errorf("failed to publish event for session %s: %w", sess.ID, err))
			}
		}
	}

	// Start session info monitor in background
	go sm.monitorSessionInfo(ctx, sess, apiClient, channelKey)

	err := apiClient.SetupEventStream(ctx, handler)
	if err != nil {
		log.PrettyError(fmt.Errorf("failed to set up event stream for session %s: %w", sess.ID, err))
		// Mark session as offline
		_ = sm.store.UpdateOnlineStatus(sess.ID, false)
		return
	}

	// Wait for context cancellation
	<-ctx.Done()
	log.Infof("Publisher stopped for session: %s (%s)", sess.Name, sess.ID)
}

// monitorSessionInfo periodically fetches session info and publishes updates when changed
func (sm *SessionManager) monitorSessionInfo(ctx context.Context, sess *models.Session, apiClient client.Client, channelKey string) {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	lastSessionName := sess.SessionName

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			fetchCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
			sessionInfo, err := apiClient.GetSessionInfo(fetchCtx)
			cancel()

			if err != nil {
				log.Debugf("Failed to fetch session info for %s: %v", sess.ID, err)
				continue
			}

			// Check if session name changed
			if sessionInfo.SessionName != lastSessionName {
				log.Infof("Session info changed for %s: %s -> %s", sess.ID, lastSessionName, sessionInfo.SessionName)
				lastSessionName = sessionInfo.SessionName

				// Update in Redis
				currentSession, err := sm.store.Get(sess.ID)
				if err != nil {
					log.Warnf("Failed to get session %s for update: %v", sess.ID, err)
					continue
				}
				if currentSession != nil {
					currentSession.SessionName = sessionInfo.SessionName
					if err := sm.store.Update(currentSession); err != nil {
						log.Warnf("Failed to update session %s: %v", sess.ID, err)
						continue
					}

					// Publish session update event
					event := models.SatisfactoryEvent{
						Type: models.SatisfactoryEventSessionUpdate,
						Data: currentSession,
					}
					asJson, err := json.Marshal(event)
					if err != nil {
						log.Warnf("Failed to marshal session update event: %v", err)
						continue
					}
					if err := sm.kvClient.Publish(channelKey, asJson); err != nil {
						log.Warnf("Failed to publish session update event: %v", err)
					}
				}
			}
		}
	}
}

// SessionManagerWorker is the worker function that starts the session manager
func SessionManagerWorker(ctx context.Context) {
	manager := NewSessionManager()
	manager.Start(ctx)
}
