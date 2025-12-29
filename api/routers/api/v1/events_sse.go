package v1

import (
	"api/models/models"
	"api/pkg/db/key_value"
	"api/pkg/log"
	"context"
	"encoding/json"
	"fmt"
	"github.com/gin-gonic/gin"
	"io"
	"sync"
	"time"
)

type Client struct {
	ID             int64
	MessageCount   int
	CreatedAt      time.Time
	LastMeasuredAt time.Time
}

var (
	clients   = make(map[int64]*Client)
	clientsMu sync.Mutex
)

func CreateNewClient() *Client {
	clientsMu.Lock()
	defer clientsMu.Unlock()

	client := &Client{
		ID:             time.Now().UnixNano(),
		CreatedAt:      time.Now(),
		MessageCount:   0,
		LastMeasuredAt: time.Now(),
	}

	clients[client.ID] = client

	log.Debugf("Adding new client %d [currently %d]", client.ID, len(clients))
	return client
}

func RemoveClient(client *Client) {
	clientsMu.Lock()
	defer clientsMu.Unlock()

	delete(clients, client.ID)
	log.Debugf("Removing client %d [currently %d]", client.ID, len(clients))
}

func AddClientMessageCount(client *Client) {
	clientsMu.Lock()
	defer clientsMu.Unlock()

	client.MessageCount++

	if client.LastMeasuredAt.Add(5 * time.Second).Before(time.Now()) {
		client.LastMeasuredAt = time.Now()
		sinceCreation := time.Since(client.CreatedAt).Seconds()

		log.Debugf("Client %d has message frequency %s%s%d msg/s%s", client.ID, log.Orange, log.Bold, client.MessageCount/int(sinceCreation), log.Reset)
	}
}

// StartSessionEventsSSE godoc
// @Summary Stream events for a session
// @Description Stream events from a specific session
// @Tags Sessions
// @Accept json
// @Produce json
// @Param id path string true "Session ID"
// @Success 200 "SSE stream"
// @Failure 400 {object} models.ErrorResponse "Bad Request"
// @Failure 500 {object} models.ErrorResponse "Internal Server Error"
// @Router /v1/sessions/{id}/events [get]
func StartSessionEventsSSE(ginContext *gin.Context) {
	requestContext := NewRequestContext(ginContext)

	sessionID := ginContext.Param("id")
	if sessionID == "" {
		requestContext.UserError("Session ID is required")
		return
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	ch := make(chan models.SseSatisfactoryEvent)

	// Create a new client
	client := CreateNewClient()
	defer RemoveClient(client)

	// Subscribe to session-specific channel
	channelKey := fmt.Sprintf("%s:%s", models.SatisfactoryEventKey, sessionID)
	log.Debugf("SSE client subscribing to channel: %s", channelKey)

	err := key_value.New().AddListener(ctx, channelKey, func(value string) {
		parsed := models.SatisfactoryEvent{}
		err := json.Unmarshal([]byte(value), &parsed)
		if err != nil {
			log.PrettyError(fmt.Errorf("failed to parse event, skipping, details: %w", err))
			return
		}

		ch <- models.SseSatisfactoryEvent{
			SatisfactoryEvent: parsed,
			ClientID:          client.ID,
		}
	})

	if err != nil {
		requestContext.ServerError(fmt.Errorf("failed to create event listener"), nil)
		return
	}

	requestContext.GinContext.Stream(func(w io.Writer) bool {
		select {
		case <-ctx.Done():
			return false
		case msg := <-ch:
			requestContext.GinContext.SSEvent(models.SatisfactoryEventKey, msg)
			AddClientMessageCount(client)
			return true
		}
	})
}
