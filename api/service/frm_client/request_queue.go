package frm_client

import (
	"api/pkg/log"
	"context"
	"sync"
)

// RequestQueue serializes requests to the FRM API and prevents duplicate requests
// from piling up when the API is slow to respond.
type RequestQueue struct {
	mu            sync.Mutex
	pendingTypes  map[string]bool     // Tracks which endpoint types have pending requests
	requestChan   chan *queuedRequest // Channel for serializing request execution
	workerCtx     context.Context
	workerCancel  context.CancelFunc
	clientAddress string // For logging purposes
}

type queuedRequest struct {
	endpointType string
	execute      func() error
	done         chan error
}

// NewRequestQueue creates a new request queue for serializing FRM API requests
func NewRequestQueue(clientAddress string) *RequestQueue {
	ctx, cancel := context.WithCancel(context.Background())
	q := &RequestQueue{
		pendingTypes:  make(map[string]bool),
		requestChan:   make(chan *queuedRequest, 100), // Buffer for pending requests
		workerCtx:     ctx,
		workerCancel:  cancel,
		clientAddress: clientAddress,
	}
	go q.worker()
	return q
}

// worker processes requests sequentially
func (q *RequestQueue) worker() {
	for {
		select {
		case req := <-q.requestChan:
			// Execute the request
			err := req.execute()

			// Mark this endpoint type as no longer pending
			q.mu.Lock()
			delete(q.pendingTypes, req.endpointType)
			q.mu.Unlock()

			// Send result back
			req.done <- err
			close(req.done)

		case <-q.workerCtx.Done():
			return
		}
	}
}

// Enqueue adds a request to the queue. If a request for this endpoint type is already
// pending, it returns immediately with (false, nil) and logs a warning.
// Returns (true, error) when the request completes.
func (q *RequestQueue) Enqueue(endpointType string, execute func() error) (bool, error) {
	q.mu.Lock()

	// Check if this endpoint type already has a pending request
	if q.pendingTypes[endpointType] {
		q.mu.Unlock()
		// CHANGED: WARN → DEBUG (expected during disconnected state)
		log.Debugf("Request already queued for endpoint '%s' on %s - FRM API may be overloaded or unresponsive",
			endpointType, q.clientAddress)
		return false, nil
	}

	// Mark this endpoint type as pending
	q.pendingTypes[endpointType] = true
	q.mu.Unlock()

	// Create the request
	req := &queuedRequest{
		endpointType: endpointType,
		execute:      execute,
		done:         make(chan error, 1),
	}

	// Send to worker
	select {
	case q.requestChan <- req:
		// Wait for completion
		err := <-req.done
		return true, err
	case <-q.workerCtx.Done():
		// Queue is shutting down
		q.mu.Lock()
		delete(q.pendingTypes, endpointType)
		q.mu.Unlock()
		return false, nil
	}
}

// Stop shuts down the request queue worker
func (q *RequestQueue) Stop() {
	q.workerCancel()
}

// PendingCount returns the number of pending request types (for debugging)
func (q *RequestQueue) PendingCount() int {
	q.mu.Lock()
	defer q.mu.Unlock()
	return len(q.pendingTypes)
}
