package auth

import (
	"sync"
	"time"

	"golang.org/x/time/rate"
)

const (
	// Rate limiting configuration
	requestsPerMinute = 5
	cleanupInterval   = 10 * time.Minute
	entryTTL          = 10 * time.Minute
)

// ipLimiter holds a rate limiter and its last access time.
type ipLimiter struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

// RateLimiter provides per-IP rate limiting for authentication endpoints.
type RateLimiter struct {
	limiters sync.Map
	stopChan chan struct{}
}

// NewRateLimiter creates a new rate limiter and starts the cleanup goroutine.
func NewRateLimiter() *RateLimiter {
	rl := &RateLimiter{
		stopChan: make(chan struct{}),
	}
	go rl.cleanupLoop()
	return rl
}

// Allow checks if a request from the given IP is allowed under the rate limit.
// Returns true if the request is allowed, false if rate limited.
func (rl *RateLimiter) Allow(ip string) bool {
	limiter := rl.getLimiter(ip)
	return limiter.Allow()
}

// getLimiter retrieves or creates a rate limiter for the given IP.
func (rl *RateLimiter) getLimiter(ip string) *rate.Limiter {
	now := time.Now()

	if existing, ok := rl.limiters.Load(ip); ok {
		entry := existing.(*ipLimiter)
		entry.lastSeen = now
		return entry.limiter
	}

	limiter := rate.NewLimiter(rate.Limit(float64(requestsPerMinute)/60.0), requestsPerMinute)
	entry := &ipLimiter{
		limiter:  limiter,
		lastSeen: now,
	}

	actual, _ := rl.limiters.LoadOrStore(ip, entry)
	return actual.(*ipLimiter).limiter
}

// cleanupLoop periodically removes stale rate limiter entries.
func (rl *RateLimiter) cleanupLoop() {
	ticker := time.NewTicker(cleanupInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			rl.cleanup()
		case <-rl.stopChan:
			return
		}
	}
}

// cleanup removes entries that haven't been accessed within the TTL.
func (rl *RateLimiter) cleanup() {
	cutoff := time.Now().Add(-entryTTL)
	rl.limiters.Range(func(key, value interface{}) bool {
		entry := value.(*ipLimiter)
		if entry.lastSeen.Before(cutoff) {
			rl.limiters.Delete(key)
		}
		return true
	})
}

// Stop terminates the cleanup goroutine.
func (rl *RateLimiter) Stop() {
	close(rl.stopChan)
}
