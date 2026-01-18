package session

import (
	"api/models/models"
	"api/pkg/db/key_value"
	"api/pkg/log"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/google/uuid"
)

const (
	// Key patterns for Redis
	sessionKeyPrefix = "session:"
)

// Store manages session persistence in Redis
type Store struct {
	kvClient *key_value.Client
}

// NewStore creates a new session store
func NewStore() *Store {
	return &Store{
		kvClient: key_value.New(),
	}
}

// sessionKey returns the Redis key for a session
func sessionKey(id string) string {
	return sessionKeyPrefix + id
}

// Create stores a new session in Redis
func (s *Store) Create(session *models.Session) error {
	// Generate UUID if not set
	if session.ID == "" {
		session.ID = uuid.New().String()
	}

	data, err := json.Marshal(session)
	if err != nil {
		return fmt.Errorf("failed to marshal session: %w", err)
	}

	if err := s.kvClient.Set(sessionKey(session.ID), string(data), 0); err != nil {
		return fmt.Errorf("failed to store session: %w", err)
	}

	log.Infof("Created session: %s (%s)", session.Name, session.ID)
	return nil
}

// Get retrieves a session by ID
func (s *Store) Get(id string) (*models.Session, error) {
	data, err := s.kvClient.Get(sessionKey(id))
	if err != nil {
		return nil, fmt.Errorf("failed to get session: %w", err)
	}
	if data == "" {
		return nil, nil // Session not found
	}

	var session models.Session
	if err := json.Unmarshal([]byte(data), &session); err != nil {
		return nil, fmt.Errorf("failed to unmarshal session: %w", err)
	}

	return &session, nil
}

// List retrieves all sessions
func (s *Store) List() ([]*models.Session, error) {
	keys, err := s.kvClient.List(sessionKeyPrefix + "*")
	if err != nil {
		return nil, fmt.Errorf("failed to list session keys: %w", err)
	}

	sessions := make([]*models.Session, 0, len(keys))
	for _, key := range keys {
		// Extract session ID from key
		id := strings.TrimPrefix(key, sessionKeyPrefix)

		session, err := s.Get(id)
		if err != nil {
			log.Warnf("Failed to get session %s: %v", id, err)
			continue
		}
		if session != nil {
			sessions = append(sessions, session)
		}
	}

	return sessions, nil
}

// Update updates an existing session
func (s *Store) Update(session *models.Session) error {
	// Check if session exists
	existing, err := s.Get(session.ID)
	if err != nil {
		return err
	}
	if existing == nil {
		return fmt.Errorf("session not found: %s", session.ID)
	}

	data, err := json.Marshal(session)
	if err != nil {
		return fmt.Errorf("failed to marshal session: %w", err)
	}

	if err := s.kvClient.Set(sessionKey(session.ID), string(data), 0); err != nil {
		return fmt.Errorf("failed to update session: %w", err)
	}

	return nil
}

// Delete removes a session by ID
func (s *Store) Delete(id string) error {
	session, err := s.Get(id)
	if err != nil {
		return err
	}
	if session == nil {
		return fmt.Errorf("session not found: %s", id)
	}

	if err := s.kvClient.Del(sessionKey(id)); err != nil {
		return fmt.Errorf("failed to delete session: %w", err)
	}

	log.Infof("Deleted session: %s (%s)", session.Name, id)
	return nil
}

// UpdateOnlineStatus updates the online status of a session
func (s *Store) UpdateOnlineStatus(id string, isOnline bool) error {
	session, err := s.Get(id)
	if err != nil {
		return err
	}
	if session == nil {
		return fmt.Errorf("session not found: %s", id)
	}

	session.IsOnline = isOnline
	return s.Update(session)
}

// UpdateDisconnectedStatus updates the disconnected status of a session
func (s *Store) UpdateDisconnectedStatus(id string, isDisconnected bool) error {
	session, err := s.Get(id)
	if err != nil {
		return err
	}
	if session == nil {
		return fmt.Errorf("session not found: %s", id)
	}

	session.IsDisconnected = isDisconnected
	if isDisconnected {
		session.IsOnline = false // Disconnected implies offline
	}
	return s.Update(session)
}
