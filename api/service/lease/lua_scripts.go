// Package lease provides distributed polling lease coordination across API instances.
package lease

import "github.com/redis/go-redis/v9"

// renewScript atomically renews a lease only if the caller is the current owner.
// KEYS[1] = lease key (poll:lease:{sessionID})
// ARGV[1] = expected owner (instanceID)
// ARGV[2] = TTL in milliseconds
// ARGV[3] = new lease value (JSON)
// Returns: 1 if renewed successfully, 0 if caller is not the owner
var renewScript = redis.NewScript(`
local key = KEYS[1]
local ownerID = ARGV[1]
local ttlMs = tonumber(ARGV[2])
local jsonValue = ARGV[3]

local currentValue = redis.call('GET', key)
if not currentValue then
  return 0
end

-- Parse JSON lease value
local parsed = cjson.decode(currentValue)
if parsed.owner_id == ownerID then
  redis.call('SET', key, jsonValue)
  redis.call('PEXPIRE', key, ttlMs)
  return 1
else
  return 0
end
`)

// releaseScript atomically releases a lease only if the caller is the current owner.
// KEYS[1] = lease key (poll:lease:{sessionID})
// ARGV[1] = expected owner (instanceID)
// Returns: 1 if released successfully, 0 if caller is not the owner
var releaseScript = redis.NewScript(`
local key = KEYS[1]
local ownerID = ARGV[1]

local currentValue = redis.call('GET', key)
if not currentValue then
  return 0
end

-- Parse JSON lease value
local parsed = cjson.decode(currentValue)
if parsed.owner_id == ownerID then
  return redis.call('DEL', key)
else
  return 0
end
`)
