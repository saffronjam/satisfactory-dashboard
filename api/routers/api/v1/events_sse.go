package v1

import (
	"api/models/models"
	"api/pkg/db/key_value"
	"api/pkg/log"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
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

// CoalescingQueue stores only the latest message per event type.
// When a new message of the same type arrives, it replaces the old one.
type CoalescingQueue struct {
	mu       sync.Mutex
	messages map[models.SatisfactoryEventType]models.SseSatisfactoryEvent
	signal   chan struct{}
	closed   bool
}

func NewCoalescingQueue() *CoalescingQueue {
	return &CoalescingQueue{
		messages: make(map[models.SatisfactoryEventType]models.SseSatisfactoryEvent),
		signal:   make(chan struct{}, 1),
	}
}

// Push adds or replaces a message for the given event type
func (q *CoalescingQueue) Push(msg models.SseSatisfactoryEvent) {
	q.mu.Lock()
	defer q.mu.Unlock()

	if q.closed {
		return
	}

	q.messages[msg.Type] = msg

	// Non-blocking signal that there's data available
	select {
	case q.signal <- struct{}{}:
	default:
	}
}

// Drain returns all pending messages and clears the queue
func (q *CoalescingQueue) Drain() []models.SseSatisfactoryEvent {
	q.mu.Lock()
	defer q.mu.Unlock()

	if len(q.messages) == 0 {
		return nil
	}

	result := make([]models.SseSatisfactoryEvent, 0, len(q.messages))
	for _, msg := range q.messages {
		result = append(result, msg)
	}
	q.messages = make(map[models.SatisfactoryEventType]models.SseSatisfactoryEvent)
	return result
}

// Signal returns the channel to wait on for new messages
func (q *CoalescingQueue) Signal() <-chan struct{} {
	return q.signal
}

// Close closes the queue
func (q *CoalescingQueue) Close() {
	q.mu.Lock()
	defer q.mu.Unlock()
	q.closed = true
	close(q.signal)
}

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

	// Use coalescing queue to deduplicate messages by event type
	// If a new message of the same type arrives before the old one is consumed,
	// the old one is replaced (only the latest state matters)
	queue := NewCoalescingQueue()
	defer queue.Close()

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

		queue.Push(models.SseSatisfactoryEvent{
			SatisfactoryEvent: parsed,
			ClientID:          client.ID,
		})
	})

	if err != nil {
		requestContext.ServerError(fmt.Errorf("failed to create event listener"), nil)
		return
	}

	requestContext.GinContext.Stream(func(w io.Writer) bool {
		select {
		case <-ctx.Done():
			return false
		case <-queue.Signal():
			// Drain all pending messages and send them
			messages := queue.Drain()
			for _, msg := range messages {
				requestContext.GinContext.SSEvent(models.SatisfactoryEventKey, msg)
				AddClientMessageCount(client)
			}
			return true
		}
	})
}
