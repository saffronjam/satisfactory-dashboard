# Commander - Unified Development Makefile
# Run from project root directory

# Use bun from ~/.bun/bin if not in PATH
BUN := $(shell command -v bun 2>/dev/null || echo "$(HOME)/.bun/bin/bun")

.PHONY: help run frontend backend backend-live kill lint format build clean generate install tidy deps deps-down

# Default target - show help
help:
	@echo "Commander Development Commands"
	@echo ""
	@echo "Main Commands:"
	@echo "  make run              - Run both frontend and backend with hot reload"
	@echo "  make frontend         - Run frontend development server (port 3039)"
	@echo "  make backend          - Run backend server (port 8081)"
	@echo "  make backend-live     - Run backend server with hot reload"
	@echo "  make kill             - Kill all development processes"
	@echo ""
	@echo "Code Quality:"
	@echo "  make lint             - Run all linters (backend + frontend)"
	@echo "  make format           - Format all code (Go + TypeScript)"
	@echo ""
	@echo "Build:"
	@echo "  make build            - Build both frontend and backend"
	@echo "  make frontend-build   - Build frontend for production"
	@echo "  make backend-build    - Build backend binary"
	@echo "  make clean            - Clean build artifacts"
	@echo ""
	@echo "Dependencies:"
	@echo "  make deps             - Start Redis (required for local dev)"
	@echo "  make deps-down        - Stop Redis"
	@echo ""
	@echo "Other:"
	@echo "  make generate         - Generate TypeScript types from Go structs"
	@echo "  make install          - Install all dependencies"
	@echo "  make tidy             - Run go mod tidy"
	@echo ""

# ============================================================================
# Main development commands
# ============================================================================

run:
	@echo "Starting Commander (frontend + backend with hot reload)..."
	@echo "   Frontend: http://localhost:3039"
	@echo "   Backend:  http://localhost:8081"
	@echo "   Press Ctrl+C to stop both servers"
	@echo ""
	@trap 'kill 0' SIGINT; \
		$(MAKE) -C api run-live & \
		(cd commander && $(BUN) run dev) & \
		wait

frontend:
	@echo "Starting frontend development server..."
	cd commander && $(BUN) run dev

backend:
	@echo "Starting backend server..."
	$(MAKE) -C api run

backend-live:
	@echo "Starting backend server with hot reload..."
	$(MAKE) -C api run-live

kill:
	@echo "Killing all development servers..."
	@-pkill -f "vite" 2>/dev/null || true
	@-pkill -f "air" 2>/dev/null || true
	@-pkill -f "go run" 2>/dev/null || true
	@echo "All servers stopped"

# ============================================================================
# Code quality
# ============================================================================

lint: lint-backend lint-frontend
	@echo "All linting complete"

lint-backend:
	@echo "Running backend linting..."
	$(MAKE) -C api lint

lint-frontend:
	@echo "Running frontend linting (oxlint)..."
	cd commander && $(BUN) run lint
	@echo "Frontend linting complete"

format: format-backend format-frontend
	@echo "All formatting complete"

format-backend:
	@echo "Formatting backend Go code..."
	$(MAKE) -C api format

format-frontend:
	@echo "Formatting frontend TypeScript code..."
	cd commander && $(BUN) run format:fix
	@echo "Frontend formatting complete"

# ============================================================================
# Build
# ============================================================================

build: backend-build frontend-build
	@echo "All builds complete"

backend-build:
	@echo "Building backend binary..."
	$(MAKE) -C api build

frontend-build:
	@echo "Building frontend for production..."
	cd commander && $(BUN) run build
	@echo "Frontend build: commander/dist/"

# ============================================================================
# Cleanup
# ============================================================================

clean:
	@echo "Cleaning build artifacts..."
	$(MAKE) -C api clean
	cd commander && rm -rf dist build
	@echo "Cleanup complete"

# ============================================================================
# Other
# ============================================================================

generate:
	@echo "Generating TypeScript types from Go structs..."
	$(MAKE) -C api generate

install:
	@echo "Installing all dependencies..."
	$(MAKE) -C api tidy
	cd commander && $(BUN) install
	@echo "All dependencies installed"

tidy:
	@echo "Running go mod tidy..."
	$(MAKE) -C api tidy

# ============================================================================
# Dependencies
# ============================================================================

deps:
	@echo "Starting Redis..."
	docker compose up -d redis
	@echo "Redis available at localhost:6379"

deps-down:
	@echo "Stopping Redis..."
	docker compose down redis

# ============================================================================
# Docker (full stack)
# ============================================================================

docker-build:
	@echo "Building Docker images..."
	docker compose build

docker-up:
	@echo "Starting all Docker containers..."
	docker compose up -d

docker-down:
	@echo "Stopping all Docker containers..."
	docker compose down

docker-logs:
	@echo "Showing Docker logs..."
	docker compose logs -f
