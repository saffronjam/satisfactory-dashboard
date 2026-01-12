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
		// Get the actual owner from Redis
		owner, err := leaseManager.GetLeaseOwner(ctx, sess.ID)
		if err != nil {
			// Skip this session on error
			continue
		}

		if owner == "" {
			// No owner (lease not acquired by anyone yet)
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

		// Get lease details
		var state string
		var acquiredAt, lastRenewedAt, uncertainSince time.Time

		if owner == thisInstanceID {
			// For this instance, get detailed info from lease manager
			leaseInfo := leaseManager.GetLeaseInfo(sess.ID)
			if leaseInfo != nil {
				state = leaseInfo.State.String()
				acquiredAt = leaseInfo.AcquiredAt
				lastRenewedAt = leaseInfo.LastRenewedAt
				uncertainSince = leaseInfo.UncertainSince
			} else {
				state = "unknown"
			}
		} else {
			// For other instances, we only know they own it
			state = "owned"
		}

		sessionLease := models.SessionLease{
			SessionID:        sess.ID,
			SessionName:      sess.Name,
			OwnerID:          owner,
			PreferredOwnerID: preferredOwner,
			State:            state,
			AcquiredAt:       acquiredAt,
			LastRenewedAt:    lastRenewedAt,
			UncertainSince:   uncertainSince,
		}

		nodeSessionsMap[owner] = append(nodeSessionsMap[owner], sessionLease)
	}

	// Build NodeInfo list
	nodeInfos := make([]models.NodeInfo, 0, len(liveNodeIDs))
	for _, nodeID := range liveNodeIDs {
		nodeInfo := models.NodeInfo{
			InstanceID:     nodeID,
			IsThisInstance: nodeID == thisInstanceID,
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
