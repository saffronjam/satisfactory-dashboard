#!/bin/bash
# Flush instance, lease, and session data from Redis
# This removes all node heartbeat keys, session lease assignments, sessions, and session state
# Does NOT touch settings or other data

set -e

# Use docker/podman compose to connect to Redis container
CONTAINER_CMD="${CONTAINER_CMD:-docker}"
REDIS_CMD="$CONTAINER_CMD compose exec -T redis redis-cli"

echo "Flushing instance, lease, and session data from Redis..."
echo "Using Docker Redis container (started with 'make deps')"
echo ""

# Delete all node heartbeat keys (node:heartbeat:*)
echo "Deleting node heartbeat keys..."
HEARTBEAT_COUNT=$($REDIS_CMD --scan --pattern "node:heartbeat:*" | wc -l)
if [ "$HEARTBEAT_COUNT" -gt 0 ]; then
    $REDIS_CMD --scan --pattern "node:heartbeat:*" | xargs -r $REDIS_CMD DEL
    echo "  Deleted $HEARTBEAT_COUNT heartbeat key(s)"
else
    echo "  No heartbeat keys found"
fi

# Delete all session lease keys (lease:*)
echo "Deleting session lease keys..."
LEASE_COUNT=$($REDIS_CMD --scan --pattern "lease:*" | wc -l)
if [ "$LEASE_COUNT" -gt 0 ]; then
    $REDIS_CMD --scan --pattern "lease:*" | xargs -r $REDIS_CMD DEL
    echo "  Deleted $LEASE_COUNT lease key(s)"
else
    echo "  No lease keys found"
fi

# Delete all sessions (session:*)
echo "Deleting sessions..."
SESSION_COUNT=$($REDIS_CMD --scan --pattern "session:*" | wc -l)
if [ "$SESSION_COUNT" -gt 0 ]; then
    $REDIS_CMD --scan --pattern "session:*" | xargs -r $REDIS_CMD DEL
    echo "  Deleted $SESSION_COUNT session key(s)"
else
    echo "  No session keys found"
fi

# Delete all session state data (state:*)
echo "Deleting session state data..."
STATE_COUNT=$($REDIS_CMD --scan --pattern "state:*" | wc -l)
if [ "$STATE_COUNT" -gt 0 ]; then
    $REDIS_CMD --scan --pattern "state:*" | xargs -r $REDIS_CMD DEL
    echo "  Deleted $STATE_COUNT state key(s)"
else
    echo "  No state keys found"
fi

echo ""
echo "Instance, lease, session, and state data flushed successfully"
echo "Settings and auth data remain untouched"
