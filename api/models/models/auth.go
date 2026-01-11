package models

// LoginRequest represents the request body for authentication.
type LoginRequest struct {
	Password string `json:"password" binding:"required"`
}

// LoginResponse represents the response after successful authentication.
type LoginResponse struct {
	Success             bool `json:"success"`
	UsedDefaultPassword bool `json:"usedDefaultPassword"`
}

// AuthStatusResponse represents the current authentication status.
type AuthStatusResponse struct {
	Authenticated       bool `json:"authenticated"`
	UsedDefaultPassword bool `json:"usedDefaultPassword,omitempty"`
}

// ChangePasswordRequest represents the request to change the access key.
type ChangePasswordRequest struct {
	CurrentPassword string `json:"currentPassword" binding:"required"`
	NewPassword     string `json:"newPassword" binding:"required,min=1"`
}

// ChangePasswordResponse represents the response after password change.
type ChangePasswordResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message,omitempty"`
}

// LogoutResponse represents the response after logout.
type LogoutResponse struct {
	Success bool `json:"success"`
}
