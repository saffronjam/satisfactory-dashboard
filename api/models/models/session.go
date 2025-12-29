package models

import "time"

// Session represents a Satisfactory server connection target
type Session struct {
	ID          string    `json:"id"`          // UUID
	Name        string    `json:"name"`        // User-provided display name
	Address     string    `json:"address"`     // IP:port (e.g., "192.168.1.100:8080")
	SessionName string    `json:"sessionName"` // From getSessionInfo API
	IsMock      bool      `json:"isMock"`      // True for mock session
	IsOnline    bool      `json:"isOnline"`    // Current connection status
	IsPaused    bool      `json:"isPaused"`    // True if polling is paused by user
	CreatedAt   time.Time `json:"createdAt"`
}

// SessionInfoRaw represents the raw response from Satisfactory's getSessionInfo endpoint (PascalCase)
type SessionInfoRaw struct {
	SessionName                string  `json:"SessionName"`
	IsPaused                   bool    `json:"IsPaused"`
	DayLength                  int     `json:"DayLength"`
	NightLength                int     `json:"NightLength"`
	PassedDays                 int     `json:"PassedDays"`
	NumberOfDaysSinceLastDeath int     `json:"NumberOfDaysSinceLastDeath"`
	Hours                      int     `json:"Hours"`
	Minutes                    int     `json:"Minutes"`
	Seconds                    float64 `json:"Seconds"`
	IsDay                      bool    `json:"IsDay"`
	TotalPlayDuration          int     `json:"TotalPlayDuration"`
	TotalPlayDurationText      string  `json:"TotalPlayDurationText"`
}

// SessionInfo is the normalized DTO sent to the frontend (camelCase)
type SessionInfo struct {
	SessionName                string  `json:"sessionName"`
	IsPaused                   bool    `json:"isPaused"`
	DayLength                  int     `json:"dayLength"`
	NightLength                int     `json:"nightLength"`
	PassedDays                 int     `json:"passedDays"`
	NumberOfDaysSinceLastDeath int     `json:"numberOfDaysSinceLastDeath"`
	Hours                      int     `json:"hours"`
	Minutes                    int     `json:"minutes"`
	Seconds                    float64 `json:"seconds"`
	IsDay                      bool    `json:"isDay"`
	TotalPlayDuration          int     `json:"totalPlayDuration"`
	TotalPlayDurationText      string  `json:"totalPlayDurationText"`
}

// ToDTO converts raw FRM API response to the normalized DTO
func (r *SessionInfoRaw) ToDTO() *SessionInfo {
	return &SessionInfo{
		SessionName:                r.SessionName,
		IsPaused:                   r.IsPaused,
		DayLength:                  r.DayLength,
		NightLength:                r.NightLength,
		PassedDays:                 r.PassedDays,
		NumberOfDaysSinceLastDeath: r.NumberOfDaysSinceLastDeath,
		Hours:                      r.Hours,
		Minutes:                    r.Minutes,
		Seconds:                    r.Seconds,
		IsDay:                      r.IsDay,
		TotalPlayDuration:          r.TotalPlayDuration,
		TotalPlayDurationText:      r.TotalPlayDurationText,
	}
}

// CreateSessionRequest is the request body for creating a new session
type CreateSessionRequest struct {
	Name    string `json:"name" binding:"required"`
	Address string `json:"address"` // Required for non-mock sessions
	IsMock  bool   `json:"isMock"`
}

// UpdateSessionRequest is the request body for updating a session (all fields optional)
type UpdateSessionRequest struct {
	Name     *string `json:"name,omitempty"`
	IsPaused *bool   `json:"isPaused,omitempty"`
}

// SessionDTO is the data transfer object for Session
type SessionDTO = Session
