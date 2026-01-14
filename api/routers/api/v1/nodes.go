package v1

import (
	"api/models/models"
	"api/worker"
	"context"
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
)

// GetNodes godoc
// @Summary Get Nodes
// @Description Get information about all live API instances and their lease ownership
// @Tags Nodes
// @Produce json
// @Success 200 {object} models.NodesResponse "Node information"
// @Failure 500 {object} models.ErrorResponse "Internal Server Error"
// @Failure 503 {object} models.ErrorResponse "Service Unavailable - Lease manager not initialized"
// @Router /v1/nodes [get]
func GetNodes(ginContext *gin.Context) {
	requestContext := NewRequestContext(ginContext)

	// Get global lease manager
	leaseManager := worker.GetGlobalLeaseManager()
	if leaseManager == nil {
		requestContext.ServerError(
			fmt.Errorf("lease manager not initialized"),
			fmt.Errorf("lease manager not available"),
		)
		return
	}

	ctx := context.Background()

	// Get this instance's ID
	thisInstanceID := leaseManager.InstanceID()

	// Get all live nodes
	liveNodeIDs, err := leaseManager.GetLiveNodes(ctx)
	if err != nil {
		requestContext.ServerError(
			fmt.Errorf("failed to get live nodes: %w", err),
			err,
		)
		return
	}

	// Get all sessions from store
	sessionStore := getSessionStore()
	allSessions, err := sessionStore.List()
	if err != nil {
		requestContext.ServerError(
			fmt.Errorf("failed to list sessions: %w", err),
			err,
		)
		return
	}

	// Build map of nodeID -> sessions owned by that node
	nodeSessionsMap := make(map[string][]models.SessionLease)
	for _, nodeID := range liveNodeIDs {
		nodeSessionsMap[nodeID] = []models.SessionLease{}
	}

	// For each session, determine which node owns it
	for _, sess := range allSessions {
		// Get the lease value from Redis (includes owner + timestamps)
		leaseValue, err := leaseManager.GetLeaseValue(ctx, sess.ID)
		if err != nil {
			// Skip this session on error
			continue
		}

		owner := leaseValue.OwnerID
		if owner == "" {
			// No owner
			continue
		}

		// Check if owner is in live nodes list
		if _, exists := nodeSessionsMap[owner]; !exists {
			// Owner is not in live nodes (stale lease)
			continue
		}

		// Get preferred owner
		preferredOwner, err := leaseManager.PreferredOwner(ctx, sess.ID)
		if err != nil {
			preferredOwner = "" // Unknown preferred owner
		}

		// Get state and uncertain timestamp
		// These are only available for "this instance" from the lease manager
		var state string
		var uncertainSince time.Time

		if owner == thisInstanceID {
			// For this instance, get detailed state from lease manager
			leaseInfo := leaseManager.GetLeaseInfo(sess.ID)
			if leaseInfo != nil {
				state = leaseInfo.State.String()
				uncertainSince = leaseInfo.UncertainSince
			} else {
				state = "unknown"
			}
		} else {
			// For other instances, we know they own it based on Redis
			state = "owned"
		}

		sessionLease := models.SessionLease{
			SessionID:        sess.ID,
			SessionName:      sess.Name,
			OwnerID:          owner,
			PreferredOwnerID: preferredOwner,
			State:            state,
			AcquiredAt:       leaseValue.AcquiredAt,    // Now available for all nodes!
			LastRenewedAt:    leaseValue.LastRenewedAt, // Now available for all nodes!
			UncertainSince:   uncertainSince,
		}

		nodeSessionsMap[owner] = append(nodeSessionsMap[owner], sessionLease)
	}

	// Build NodeInfo list
	nodeInfos := make([]models.NodeInfo, 0, len(liveNodeIDs))
	for _, nodeID := range liveNodeIDs {
		// Get node's self-reported status from Redis
		status, err := leaseManager.CheckNodeReady(ctx, nodeID)
		var statusStr string
		if err != nil {
			statusStr = "offline"
		} else if status {
			statusStr = "online"
		} else {
			statusStr = "init"
		}

		nodeInfo := models.NodeInfo{
			InstanceID:     nodeID,
			IsThisInstance: nodeID == thisInstanceID,
			Status:         statusStr,
			OwnedSessions:  nodeSessionsMap[nodeID],
		}
		nodeInfos = append(nodeInfos, nodeInfo)
	}

	response := models.NodesResponse{
		ThisInstanceID: thisInstanceID,
		LiveNodes:      nodeInfos,
		Timestamp:      time.Now(),
	}

	requestContext.Ok(response)
}
