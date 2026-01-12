// Package lease provides distributed polling lease coordination across API instances.
package lease

import "github.com/redis/go-redis/v9"

// renewScript atomically renews a lease only if the caller is the current owner.
// KEYS[1] = lease key (poll:lease:{sessionID})
// ARGV[1] = expected owner (instanceID)
// ARGV[2] = TTL in milliseconds
// Returns: 1 if renewed successfully, 0 if caller is not the owner
var renewScript = redis.NewScript(`
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("PEXPIRE", KEYS[1], ARGV[2])
else
  return 0
end
`)

// releaseScript atomically releases a lease only if the caller is the current owner.
// KEYS[1] = lease key (poll:lease:{sessionID})
// ARGV[1] = expected owner (instanceID)
// Returns: 1 if released successfully, 0 if caller is not the owner
var releaseScript = redis.NewScript(`
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
else
  return 0
end
`)
