package auth

import (
	"api/pkg/config"
	"api/pkg/db/key_value"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"time"

	"golang.org/x/crypto/bcrypt"
)

const (
	// Redis key patterns
	passwordKey    = "auth:password"
	tokenKeyPrefix = "auth:token:"

	// Token configuration
	tokenLength = 32 // 32 bytes = 64 hex characters
	tokenTTL    = 7 * 24 * time.Hour

	// bcrypt cost factor (12 provides ~250ms hashing time)
	bcryptCost = 12
)

// TokenData represents the metadata stored with an access token in Redis.
type TokenData struct {
	CreatedAt int64  `json:"created_at"`
	LastUsed  int64  `json:"last_used"`
	ClientIP  string `json:"client_ip"`
}

// Service handles authentication operations including password hashing,
// token generation, and Redis storage.
type Service struct {
	kvClient *key_value.Client
}

// NewService creates a new authentication service.
func NewService() *Service {
	return &Service{
		kvClient: key_value.New(),
	}
}

// InitializePassword checks if a password exists in Redis and initializes it
// with the bootstrap password if not. Returns true if the bootstrap password
// was used (first-time setup).
func (s *Service) InitializePassword() (bool, error) {
	exists, err := s.kvClient.IsSet(passwordKey)
	if err != nil {
		return false, fmt.Errorf("failed to check password existence: %w", err)
	}

	if exists {
		return false, nil
	}

	bootstrapPassword := config.Config.Auth.BootstrapPassword
	if bootstrapPassword == "" {
		bootstrapPassword = "change-me"
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(bootstrapPassword), bcryptCost)
	if err != nil {
		return false, fmt.Errorf("failed to hash bootstrap password: %w", err)
	}

	if err := s.kvClient.Set(passwordKey, string(hash), 0); err != nil {
		return false, fmt.Errorf("failed to store password hash: %w", err)
	}

	return true, nil
}

// ValidatePassword checks if the provided password matches the stored hash.
func (s *Service) ValidatePassword(password string) (bool, error) {
	hash, err := s.kvClient.Get(passwordKey)
	if err != nil {
		return false, fmt.Errorf("failed to get stored password: %w", err)
	}

	if hash == "" {
		return false, fmt.Errorf("no password configured")
	}

	err = bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	if err == bcrypt.ErrMismatchedHashAndPassword {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("failed to compare password: %w", err)
	}

	return true, nil
}

// IsDefaultPassword checks if the provided password is the default "change-me".
func (s *Service) IsDefaultPassword(password string) bool {
	return password == "change-me"
}

// IsUsingDefaultPassword checks if the currently stored password is the default "change-me".
func (s *Service) IsUsingDefaultPassword() bool {
	valid, err := s.ValidatePassword("change-me")
	if err != nil {
		return false
	}
	return valid
}

// ChangePassword updates the stored password hash after verifying the current password.
func (s *Service) ChangePassword(currentPassword, newPassword string) error {
	valid, err := s.ValidatePassword(currentPassword)
	if err != nil {
		return fmt.Errorf("failed to validate current password: %w", err)
	}
	if !valid {
		return fmt.Errorf("current password is incorrect")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcryptCost)
	if err != nil {
		return fmt.Errorf("failed to hash new password: %w", err)
	}

	if err := s.kvClient.Set(passwordKey, string(hash), 0); err != nil {
		return fmt.Errorf("failed to store new password hash: %w", err)
	}

	return nil
}

// GenerateToken creates a new cryptographically secure access token.
func (s *Service) GenerateToken() (string, error) {
	bytes := make([]byte, tokenLength)
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("failed to generate random bytes: %w", err)
	}

	return hex.EncodeToString(bytes), nil
}

// StoreToken saves a token with its metadata in Redis.
func (s *Service) StoreToken(token, clientIP string) error {
	now := time.Now().Unix()
	data := TokenData{
		CreatedAt: now,
		LastUsed:  now,
		ClientIP:  clientIP,
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("failed to marshal token data: %w", err)
	}

	key := tokenKeyPrefix + token
	if err := s.kvClient.Set(key, string(jsonData), tokenTTL); err != nil {
		return fmt.Errorf("failed to store token: %w", err)
	}

	return nil
}

// ValidateToken checks if a token exists and is valid, returning the token data.
func (s *Service) ValidateToken(token string) (*TokenData, error) {
	key := tokenKeyPrefix + token
	data, err := s.kvClient.Get(key)
	if err != nil {
		return nil, fmt.Errorf("failed to get token: %w", err)
	}

	if data == "" {
		return nil, nil
	}

	var tokenData TokenData
	if err := json.Unmarshal([]byte(data), &tokenData); err != nil {
		return nil, fmt.Errorf("failed to unmarshal token data: %w", err)
	}

	return &tokenData, nil
}

// RefreshToken updates the token's last_used timestamp and extends its TTL.
func (s *Service) RefreshToken(token string) error {
	tokenData, err := s.ValidateToken(token)
	if err != nil {
		return err
	}
	if tokenData == nil {
		return fmt.Errorf("token not found")
	}

	tokenData.LastUsed = time.Now().Unix()

	jsonData, err := json.Marshal(tokenData)
	if err != nil {
		return fmt.Errorf("failed to marshal token data: %w", err)
	}

	key := tokenKeyPrefix + token
	if err := s.kvClient.Set(key, string(jsonData), tokenTTL); err != nil {
		return fmt.Errorf("failed to refresh token: %w", err)
	}

	return nil
}

// DeleteToken removes a token from Redis.
func (s *Service) DeleteToken(token string) error {
	key := tokenKeyPrefix + token
	if err := s.kvClient.Del(key); err != nil {
		return fmt.Errorf("failed to delete token: %w", err)
	}

	return nil
}

// GetTokenTTL returns the token TTL duration for cookie configuration.
func GetTokenTTL() time.Duration {
	return tokenTTL
}
