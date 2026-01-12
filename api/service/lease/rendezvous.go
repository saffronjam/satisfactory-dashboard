// Package lease provides distributed polling lease coordination across API instances.
package lease

import (
	"hash/fnv"
)

// computeWeight calculates the rendezvous hash weight for a node-session pair.
// Uses FNV-1a hash algorithm for fast, well-distributed hashing.
// The weight is computed by hashing the concatenation of nodeID and sessionID.
func computeWeight(nodeID, sessionID string) uint64 {
	h := fnv.New64a()
	h.Write([]byte(nodeID))
	h.Write([]byte(sessionID))
	return h.Sum64()
}

// ComputePreferredOwner determines which node should own the given session
// using rendezvous (Highest Random Weight) hashing.
// Returns the nodeID with the highest weight for the given sessionID.
// Returns empty string if nodes slice is empty.
func ComputePreferredOwner(sessionID string, nodes []string) string {
	if len(nodes) == 0 {
		return ""
	}

	var bestNode string
	var bestWeight uint64

	for _, nodeID := range nodes {
		weight := computeWeight(nodeID, sessionID)
		if weight > bestWeight || bestNode == "" {
			bestWeight = weight
			bestNode = nodeID
		}
	}

	return bestNode
}
