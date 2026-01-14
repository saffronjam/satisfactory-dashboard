package models

import "time"

// NodeInfo represents information about a single API instance
// tygo:alias object
type NodeInfo struct {
	InstanceID     string         `json:"instanceId"`     // This instance's unique ID
	IsThisInstance bool           `json:"isThisInstance"` // True if this is the current instance
	Status         string         `json:"status"`         // Node status: "online", "initializing", or "offline"
	OwnedSessions  []SessionLease `json:"ownedSessions"`  // Sessions owned by this instance
}

// SessionLease represents lease information for a single session
// tygo:alias object
type SessionLease struct {
	SessionID        string    `json:"sessionId"`        // Session ID
	SessionName      string    `json:"sessionName"`      // Human-readable session name
	OwnerID          string    `json:"ownerId"`          // Instance that owns this lease
	PreferredOwnerID string    `json:"preferredOwnerId"` // Preferred owner per rendezvous hashing
	State            string    `json:"state"`            // "owned", "other", "uncertain", "unknown"
	AcquiredAt       time.Time `json:"acquiredAt"`       // When lease was acquired (zero if not owned)
	LastRenewedAt    time.Time `json:"lastRenewedAt"`    // When lease was last renewed (zero if not owned)
	UncertainSince   time.Time `json:"uncertainSince"`   // When lease became uncertain (zero if not uncertain)
}

// NodesResponse is the response for GET /v1/nodes
// tygo:alias object
type NodesResponse struct {
	ThisInstanceID string     `json:"thisInstanceId"` // ID of this instance
	LiveNodes      []NodeInfo `json:"liveNodes"`      // All live instances with their owned sessions
	Timestamp      time.Time  `json:"timestamp"`      // When this snapshot was taken
}
