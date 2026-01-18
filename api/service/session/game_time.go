package session

import (
	"api/models/models"
	"api/pkg/log"
	"sync"
	"time"
)

// TimeDiscontinuity represents a detected time discontinuity event where game time moved backward.
type TimeDiscontinuity struct {
	PreviousTime int64 // The game time before the discontinuity
	NewTime      int64 // The game time after the discontinuity (lower than previous)
	Delta        int64 // How far back time jumped (positive value)
}

// GameTimeTracker tracks the game time offset for a session and provides
// the current game time calculation based on TotalPlayDuration and elapsed wall-clock time.
type GameTimeTracker struct {
	offset models.GameTimeOffset
	mu     sync.RWMutex
}

// NewGameTimeTracker creates a new GameTimeTracker instance.
func NewGameTimeTracker() *GameTimeTracker {
	return &GameTimeTracker{}
}

// Update sets the offset from a new TotalPlayDuration reading.
// This should be called each time session info is polled.
// Returns a TimeDiscontinuity if time moved backward (e.g., save rollback), or nil otherwise.
func (t *GameTimeTracker) Update(totalPlayDuration int64) *TimeDiscontinuity {
	t.mu.Lock()
	defer t.mu.Unlock()

	var discontinuity *TimeDiscontinuity

	if !t.offset.ProbedAt.IsZero() {
		expectedGameTime := t.offset.OffsetSeconds + int64(time.Since(t.offset.ProbedAt).Seconds())

		if totalPlayDuration < expectedGameTime {
			discontinuity = &TimeDiscontinuity{
				PreviousTime: expectedGameTime,
				NewTime:      totalPlayDuration,
				Delta:        expectedGameTime - totalPlayDuration,
			}
			log.Warnf("Game time discontinuity detected: expected %ds, got %ds (jumped back %ds)",
				expectedGameTime, totalPlayDuration, discontinuity.Delta)
		}
	}

	t.offset = models.GameTimeOffset{
		OffsetSeconds: totalPlayDuration,
		ProbedAt:      time.Now(),
	}

	return discontinuity
}

// CurrentGameTime returns the current game time in seconds.
// It calculates this as: OffsetSeconds + seconds(now - ProbedAt).
// Returns 0 if the tracker has not been initialized.
func (t *GameTimeTracker) CurrentGameTime() int64 {
	t.mu.RLock()
	defer t.mu.RUnlock()

	if t.offset.ProbedAt.IsZero() {
		return 0
	}

	elapsedSeconds := int64(time.Since(t.offset.ProbedAt).Seconds())
	return t.offset.OffsetSeconds + elapsedSeconds
}

// IsInitialized returns true if the tracker has been initialized with at least one reading.
func (t *GameTimeTracker) IsInitialized() bool {
	t.mu.RLock()
	defer t.mu.RUnlock()
	return !t.offset.ProbedAt.IsZero()
}

// Offset returns the current offset snapshot. Used for debugging/logging.
func (t *GameTimeTracker) Offset() models.GameTimeOffset {
	t.mu.RLock()
	defer t.mu.RUnlock()
	return t.offset
}
