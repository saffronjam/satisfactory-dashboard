package v1

import (
	"api/models/models"
	"api/service"
	"api/service/session"
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

var (
	sessionStore     *session.Store
	sessionStoreOnce sync.Once
)

func getSessionStore() *session.Store {
	sessionStoreOnce.Do(func() {
		sessionStore = session.NewStore()
	})
	return sessionStore
}

// ListSessions godoc
// @Summary List Sessions
// @Description List all configured sessions
// @Tags Sessions
// @Accept json
// @Produce json
// @Success 200 {array} models.SessionDTO "List of sessions"
// @Failure 500 {object} models.ErrorResponse "Internal Server Error"
// @Router /v1/sessions [get]
func ListSessions(ginContext *gin.Context) {
	requestContext := NewRequestContext(ginContext)

	sessions, err := getSessionStore().List()
	if err != nil {
		requestContext.ServerError(fmt.Errorf("failed to list sessions: %w", err), err)
		return
	}

	// Convert to DTOs with computed stage
	sessionDTOs := make([]models.SessionDTO, 0, len(sessions))
	for _, sess := range sessions {
		stage := session.GetSessionStage(sess.ID)
		sessionDTOs = append(sessionDTOs, sess.ToDTO(stage))
	}

	requestContext.Ok(sessionDTOs)
}

// CreateSession godoc
// @Summary Create Session
// @Description Create a new session targeting a Satisfactory server
// @Tags Sessions
// @Accept json
// @Produce json
// @Param request body models.CreateSessionRequest true "Session creation request"
// @Success 201 {object} models.SessionDTO "Created session"
// @Failure 400 {object} models.ErrorResponse "Bad Request"
// @Failure 500 {object} models.ErrorResponse "Internal Server Error"
// @Router /v1/sessions [post]
func CreateSession(ginContext *gin.Context) {
	requestContext := NewRequestContext(ginContext)

	var req models.CreateSessionRequest
	if err := ginContext.ShouldBindJSON(&req); err != nil {
		requestContext.UserError("Invalid request body: " + err.Error())
		return
	}

	// Validate request
	if req.Name == "" {
		requestContext.UserError("Session name is required")
		return
	}

	if !req.IsMock && req.Address == "" {
		requestContext.UserError("Address is required for non-mock sessions")
		return
	}

	// Check if mock session already exists
	if req.IsMock {
		mockExists, err := getSessionStore().MockExists()
		if err != nil {
			requestContext.ServerError(fmt.Errorf("failed to check mock session: %w", err), err)
			return
		}
		if mockExists {
			requestContext.UserError("A mock session already exists")
			return
		}
	}

	// Create session object
	newSession := &models.Session{
		Name:      req.Name,
		Address:   req.Address,
		IsMock:    req.IsMock,
		IsOnline:  false,
		CreatedAt: time.Now(),
	}

	// Try to fetch session info from the target (but don't fail if it's offline)
	var client = service.NewMockClient()
	if !req.IsMock {
		client = service.NewClientWithAddress(req.Address)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	sessionInfo, err := client.GetSessionInfo(ctx)
	if err == nil {
		// Populate session info from the API response if successful
		newSession.SessionName = sessionInfo.SessionName
		newSession.IsOnline = true
	}
	// If connection fails, session is created with IsOnline=false

	// Store the session
	if err := getSessionStore().Create(newSession); err != nil {
		requestContext.ServerError(fmt.Errorf("failed to create session: %w", err), err)
		return
	}

	// New sessions always start in "init" stage (no cache data yet)
	requestContext.OkCreated(newSession.ToDTO(models.SessionStageInit))
}

// DeleteSession godoc
// @Summary Delete Session
// @Description Delete a session by ID
// @Tags Sessions
// @Accept json
// @Produce json
// @Param id path string true "Session ID"
// @Success 204 "No Content"
// @Failure 404 {object} models.ErrorResponse "Session not found"
// @Failure 500 {object} models.ErrorResponse "Internal Server Error"
// @Router /v1/sessions/{id} [delete]
func DeleteSession(ginContext *gin.Context) {
	requestContext := NewRequestContext(ginContext)

	sessionID := ginContext.Param("id")
	if sessionID == "" {
		requestContext.UserError("Session ID is required")
		return
	}

	// Check if session exists
	existingSession, err := getSessionStore().Get(sessionID)
	if err != nil {
		requestContext.ServerError(fmt.Errorf("failed to get session: %w", err), err)
		return
	}
	if existingSession == nil {
		requestContext.NotFound("Session not found")
		return
	}

	// Delete the session
	if err := getSessionStore().Delete(sessionID); err != nil {
		requestContext.ServerError(fmt.Errorf("failed to delete session: %w", err), err)
		return
	}

	requestContext.OkNoContent()
}

// GetSession godoc
// @Summary Get Session
// @Description Get a session by ID
// @Tags Sessions
// @Accept json
// @Produce json
// @Param id path string true "Session ID"
// @Success 200 {object} models.SessionDTO "Session"
// @Failure 404 {object} models.ErrorResponse "Session not found"
// @Failure 500 {object} models.ErrorResponse "Internal Server Error"
// @Router /v1/sessions/{id} [get]
func GetSession(ginContext *gin.Context) {
	requestContext := NewRequestContext(ginContext)

	sessionID := ginContext.Param("id")
	if sessionID == "" {
		requestContext.UserError("Session ID is required")
		return
	}

	existingSession, err := getSessionStore().Get(sessionID)
	if err != nil {
		requestContext.ServerError(fmt.Errorf("failed to get session: %w", err), err)
		return
	}
	if existingSession == nil {
		requestContext.NotFound("Session not found")
		return
	}

	stage := session.GetSessionStage(sessionID)
	requestContext.Ok(existingSession.ToDTO(stage))
}

// UpdateSession godoc
// @Summary Update Session
// @Description Update a session's properties (name, paused state). All fields are optional.
// @Tags Sessions
// @Accept json
// @Produce json
// @Param id path string true "Session ID"
// @Param request body models.UpdateSessionRequest true "Session update request"
// @Success 200 {object} models.SessionDTO "Updated session"
// @Failure 400 {object} models.ErrorResponse "Bad Request"
// @Failure 404 {object} models.ErrorResponse "Session not found"
// @Failure 500 {object} models.ErrorResponse "Internal Server Error"
// @Router /v1/sessions/{id} [patch]
func UpdateSession(ginContext *gin.Context) {
	requestContext := NewRequestContext(ginContext)

	sessionID := ginContext.Param("id")
	if sessionID == "" {
		requestContext.UserError("Session ID is required")
		return
	}

	var req models.UpdateSessionRequest
	if err := ginContext.ShouldBindJSON(&req); err != nil {
		requestContext.UserError("Invalid request body: " + err.Error())
		return
	}

	// Check that at least one field is provided
	if req.Name == nil && req.IsPaused == nil {
		requestContext.UserError("At least one field (name or isPaused) must be provided")
		return
	}

	// Validate name if provided
	if req.Name != nil && *req.Name == "" {
		requestContext.UserError("Session name cannot be empty")
		return
	}

	existingSession, err := getSessionStore().Get(sessionID)
	if err != nil {
		requestContext.ServerError(fmt.Errorf("failed to get session: %w", err), err)
		return
	}
	if existingSession == nil {
		requestContext.NotFound("Session not found")
		return
	}

	// Update fields if provided
	if req.Name != nil {
		existingSession.Name = *req.Name
	}
	if req.IsPaused != nil {
		existingSession.IsPaused = *req.IsPaused
	}

	if err := getSessionStore().Update(existingSession); err != nil {
		requestContext.ServerError(fmt.Errorf("failed to update session: %w", err), err)
		return
	}

	stage := session.GetSessionStage(sessionID)
	requestContext.Ok(existingSession.ToDTO(stage))
}

// ValidateSession godoc
// @Summary Validate Session
// @Description Validate a session by fetching fresh session info from the Satisfactory server
// @Tags Sessions
// @Accept json
// @Produce json
// @Param id path string true "Session ID"
// @Success 200 {object} models.SessionInfo "Session info from Satisfactory server"
// @Failure 404 {object} models.ErrorResponse "Session not found"
// @Failure 500 {object} models.ErrorResponse "Internal Server Error"
// @Router /v1/sessions/{id}/validate [get]
func ValidateSession(ginContext *gin.Context) {
	requestContext := NewRequestContext(ginContext)

	sessionID := ginContext.Param("id")
	if sessionID == "" {
		requestContext.UserError("Session ID is required")
		return
	}

	existingSession, err := getSessionStore().Get(sessionID)
	if err != nil {
		requestContext.ServerError(fmt.Errorf("failed to get session: %w", err), err)
		return
	}
	if existingSession == nil {
		requestContext.NotFound("Session not found")
		return
	}

	// Create client for the session
	var client = service.NewMockClient()
	if !existingSession.IsMock {
		client = service.NewClientWithAddress(existingSession.Address)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	sessionInfo, err := client.GetSessionInfo(ctx)
	if err != nil {
		// Update session status to offline
		existingSession.IsOnline = false
		_ = getSessionStore().Update(existingSession)

		requestContext.UserError(fmt.Sprintf("Failed to connect to Satisfactory server: %v", err))
		return
	}

	// Update session with fresh info
	existingSession.SessionName = sessionInfo.SessionName
	existingSession.IsOnline = true
	if err := getSessionStore().Update(existingSession); err != nil {
		requestContext.ServerError(fmt.Errorf("failed to update session: %w", err), err)
		return
	}

	requestContext.Ok(sessionInfo)
}

// PreviewSession godoc
// @Summary Preview Session
// @Description Preview a session by fetching session info from a Satisfactory server without creating it
// @Tags Sessions
// @Accept json
// @Produce json
// @Param address query string true "Server address (IP:port)"
// @Success 200 {object} models.SessionInfo "Session info from Satisfactory server"
// @Failure 400 {object} models.ErrorResponse "Bad Request"
// @Failure 500 {object} models.ErrorResponse "Internal Server Error"
// @Router /v1/sessions/preview [get]
func PreviewSession(ginContext *gin.Context) {
	requestContext := NewRequestContext(ginContext)

	address := ginContext.Query("address")
	if address == "" {
		requestContext.UserError("Address query parameter is required")
		return
	}

	client := service.NewClientWithAddress(address)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	sessionInfo, err := client.GetSessionInfo(ctx)
	if err != nil {
		requestContext.UserError(fmt.Sprintf("Failed to connect to Satisfactory server at %s: %v", address, err))
		return
	}

	requestContext.Ok(gin.H{"sessionInfo": sessionInfo})
}
