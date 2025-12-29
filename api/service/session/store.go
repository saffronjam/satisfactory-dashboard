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
	mockSessionKey   = "session:mock:id"
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

	// If this is a mock session, check if one already exists
	if session.IsMock {
		existingMockID, err := s.kvClient.Get(mockSessionKey)
		if err != nil {
			return fmt.Errorf("failed to check for existing mock session: %w", err)
		}
		if existingMockID != "" {
			return fmt.Errorf("a mock session already exists")
		}

		// Store the mock session ID reference
		if err := s.kvClient.Set(mockSessionKey, session.ID, 0); err != nil {
			return fmt.Errorf("failed to store mock session reference: %w", err)
		}
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
		// Skip the mock session reference key
		if key == mockSessionKey {
			continue
		}

		// Extract session ID from key
		id := strings.TrimPrefix(key, sessionKeyPrefix)
		if id == "mock:id" {
			continue // Skip the mock reference key
		}

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

	// If this is a mock session, remove the reference
	if session.IsMock {
		if err := s.kvClient.Del(mockSessionKey); err != nil {
			log.Warnf("Failed to delete mock session reference: %v", err)
		}
	}

	if err := s.kvClient.Del(sessionKey(id)); err != nil {
		return fmt.Errorf("failed to delete session: %w", err)
	}

	log.Infof("Deleted session: %s (%s)", session.Name, id)
	return nil
}

// GetMockSession retrieves the mock session if it exists
func (s *Store) GetMockSession() (*models.Session, error) {
	mockID, err := s.kvClient.Get(mockSessionKey)
	if err != nil {
		return nil, fmt.Errorf("failed to get mock session ID: %w", err)
	}
	if mockID == "" {
		return nil, nil // No mock session exists
	}

	return s.Get(mockID)
}

// MockExists checks if a mock session exists
func (s *Store) MockExists() (bool, error) {
	mockID, err := s.kvClient.Get(mockSessionKey)
	if err != nil {
		return false, fmt.Errorf("failed to check mock session: %w", err)
	}
	return mockID != "", nil
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
