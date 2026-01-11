# Feature Specification: Distributed Polling Lease System

**Feature Branch**: `002-redis-poll-lease`
**Created**: 2026-01-11
**Status**: Draft
**Input**: Redis-based distributed polling coordination for multi-instance API auto-scaling

## Clarifications

### Session 2026-01-11

- Q: What is the source of truth for which endpoints exist to poll? → A: Existing sessions stored in Redis (dynamic - sessions can be added/removed at runtime)
- Q: What observability should the lease system provide? → A: Structured logging of lease events (acquire, renew, release, fail)

## Overview

Enable multiple API instances to automatically coordinate polling responsibilities using Redis-based leases. When an instance starts, it participates in the distributed lease system. When an instance dies, its responsibilities are automatically redistributed. No manual configuration of instance counts is required - the system auto-adjusts when instances scale up or down.

**Core Principle**: One poll target = one Redis lease. Exactly one API instance holds the lease for each endpoint at any given time.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automatic Work Distribution (Priority: P1)

As a system operator, I want polling responsibilities to be automatically distributed across running API instances without any manual configuration, so that I can simply scale up/down instances and the system adapts.

**Why this priority**: This is the fundamental capability - without automatic distribution, the feature provides no value.

**Independent Test**: Start 1 instance, verify it polls all endpoints. Start a 2nd instance, verify endpoints redistribute between both instances.

**Acceptance Scenarios**:

1. **Given** a single API instance starts, **When** it completes initialization, **Then** it acquires leases and begins polling all configured endpoints
2. **Given** two API instances are running with distributed leases, **When** a third instance starts, **Then** polling responsibilities rebalance across all three instances
3. **Given** three API instances are running, **When** one instance is stopped, **Then** its endpoints are taken over by remaining instances within 30 seconds

---

### User Story 2 - Failover and Self-Healing (Priority: P1)

As a system operator, I want the system to automatically recover from instance failures without duplicate polling or missed polls, so that I can trust the system remains operational without manual intervention.

**Why this priority**: Equal priority to P1 since reliability is core to the feature's purpose.

**Independent Test**: Kill an instance holding leases and verify another instance takes over within the TTL period without duplicates.

**Acceptance Scenarios**:

1. **Given** an instance holding leases for 3 endpoints crashes unexpectedly, **When** the lease TTL expires (30 seconds), **Then** other running instances acquire those leases and resume polling
2. **Given** an instance loses network connectivity to Redis temporarily, **When** it cannot renew its leases, **Then** it stops polling to avoid duplicates, and other instances take over
3. **Given** an instance restarts with a new process ID, **When** it attempts to renew old leases, **Then** it cannot (different instance ID) and must re-acquire legitimately

---

### User Story 3 - Single Poller Guarantee (Priority: P2)

As a system operator, I want to guarantee that each endpoint is polled by exactly one instance at a time, so that I avoid duplicate data, race conditions, and unnecessary load on polled endpoints.

**Why this priority**: Critical for correctness but builds on the lease mechanism from P1.

**Independent Test**: Run multiple instances and verify via logging/metrics that each endpoint is only polled by one instance at any moment.

**Acceptance Scenarios**:

1. **Given** 5 API instances all start simultaneously, **When** they compete for leases on 10 endpoints, **Then** each endpoint is acquired by exactly one instance (no duplicates)
2. **Given** an instance holds a lease and is actively polling, **When** another instance attempts to acquire the same lease, **Then** the attempt fails and no duplicate polling occurs
3. **Given** lease renewal is in progress, **When** the instance performs the renewal, **Then** it only succeeds if the instance still owns the lease (safe renewal)

---

### User Story 4 - Balanced Distribution (Priority: P3)

As a system operator, I want polling responsibilities to be reasonably balanced across instances, so that no single instance becomes overloaded while others are idle.

**Why this priority**: Important for optimal resource utilization but system works correctly even without perfect balance.

**Independent Test**: With 3 instances and 9 endpoints, verify each instance handles approximately 3 endpoints.

**Acceptance Scenarios**:

1. **Given** 3 API instances and 9 polling targets, **When** the system reaches steady state, **Then** each instance owns approximately 3 leases (within 1 of ideal)
2. **Given** a new instance joins a cluster of 2 instances with 10 endpoints, **When** rebalancing occurs, **Then** the new instance acquires roughly 1/3 of the endpoints
3. **Given** an instance determines it is no longer the preferred owner for an endpoint, **When** it releases the lease voluntarily, **Then** the preferred owner acquires it promptly

---

### Edge Cases

- What happens when Redis becomes unavailable? System pauses polling (fail-closed) to avoid duplicates
- What happens when polling takes longer than the lease TTL? Lease is renewed in background during polling to prevent expiry
- What happens when two instances generate the same instance ID? Instance IDs include hostname + boot timestamp + random component to ensure uniqueness
- What happens during network partition where instance can reach polled service but not Redis? Instance cannot confirm ownership and stops polling (fail-closed)
- What happens when all instances crash and restart simultaneously? They compete fairly for leases via SET NX, endpoints get distributed

## Requirements *(mandatory)*

### Functional Requirements

**Lease Management**

- **FR-001**: System MUST acquire leases atomically using Redis SET with NX and PX flags
- **FR-002**: System MUST renew leases only if the instance still owns them (conditional renewal via Lua script)
- **FR-003**: System MUST release leases only if the instance still owns them (conditional release via Lua script)
- **FR-004**: System MUST use a lease TTL of 30 seconds with renewal every 10 seconds
- **FR-005**: System MUST generate a unique instance ID per process start (hostname + boot timestamp + random)

**Instance Registry**

- **FR-006**: Each API instance MUST maintain a heartbeat key in Redis with TTL
- **FR-007**: System MUST be able to discover all live instances by scanning heartbeat keys
- **FR-008**: Instance heartbeats MUST expire automatically if the instance dies

**Polling Coordination**

- **FR-009**: Each instance MUST only poll endpoints for which it holds a valid lease
- **FR-010**: Instance MUST verify lease ownership before each polling operation
- **FR-011**: System MUST dynamically discover polling targets from sessions stored in Redis (no static configuration required)
- **FR-012**: Instance MUST stop polling an endpoint immediately when it loses the lease

**Load Balancing**

- **FR-013**: System MUST use rendezvous hashing to determine preferred owner for each endpoint
- **FR-014**: Preferred owner MUST attempt lease acquisition; non-preferred owners act as fallback
- **FR-015**: Non-preferred owners SHOULD voluntarily release leases to enable faster rebalancing

**Fault Tolerance**

- **FR-016**: System MUST treat lease renewal failure as potential lease loss and pause polling
- **FR-017**: System MUST support worst-case failover time bounded by lease TTL (30 seconds)
- **FR-018**: System MUST continue operating with remaining instances when some instances fail

**Observability**

- **FR-019**: System MUST emit structured log entries for lease acquisition (success/failure)
- **FR-020**: System MUST emit structured log entries for lease renewal (success/failure)
- **FR-021**: System MUST emit structured log entries for lease release (voluntary/expired)
- **FR-022**: Log entries MUST include instance ID, endpoint ID, and timestamp

### Key Entities

- **Lease**: Represents ownership of a polling target. Key: `poll:lease:<endpointId>`, Value: `<instanceId>`, TTL: 30s
- **Instance Heartbeat**: Represents a live API instance. Key: `poll:node:<instanceId>`, Value: `1`, TTL: 30s
- **Endpoint/Poll Target**: A session or data source that needs periodic polling. Identified by unique endpoint ID
- **Instance ID**: Unique identifier for each API process (format: `hostname-bootTimestamp-randomSuffix`)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Each endpoint is polled by exactly one instance at any point in time (zero duplicate polls)
- **SC-002**: Failover completes within 30 seconds when an instance fails
- **SC-003**: System supports horizontal scaling to at least 10 API instances without manual configuration
- **SC-004**: Polling responsibility distribution remains within 20% of ideal balance (e.g., with 3 instances and 9 endpoints, each instance handles 2-4 endpoints)
- **SC-005**: System recovers automatically from Redis temporary unavailability without data corruption or duplicate polls
- **SC-006**: Adding or removing an instance does not cause missed polls beyond the rebalancing window (max 30 seconds)

## Assumptions

- Redis is available and reachable from all API instances (single Redis instance or cluster)
- All API instances have synchronized clocks within reasonable tolerance (a few seconds)
- Network latency to Redis is low enough that operations complete well within TTL periods
- The polling interval for endpoints is shorter than the lease TTL to ensure proper coordination
- Redis Lua scripting is available (standard in Redis 2.6+)
- Existing session management already uses Redis, so Redis connectivity is established

## Out of Scope

- Redis cluster/sentinel configuration (assumes Redis is already deployed)
- Monitoring and alerting for lease system (can be added separately)
- Configuration UI for tuning TTL or renewal intervals
- Cross-datacenter coordination (assumes single datacenter/region deployment)
