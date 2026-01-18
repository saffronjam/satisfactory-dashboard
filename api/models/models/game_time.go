package models

import "time"

// GameTimeOffset stores a cached reference point for calculating game time.
// One instance per active session, stored in memory.
type GameTimeOffset struct {
	OffsetSeconds int64     `json:"offsetSeconds"` // TotalPlayDuration from last getSessionInfo call
	ProbedAt      time.Time `json:"probedAt"`      // Wall-clock timestamp when offset was captured
}
