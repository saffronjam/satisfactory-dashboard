# Satisfactory Dashboard - Unified Development Makefile
# Run from project root directory

# Use bun from ~/.bun/bin if not in PATH
BUN := $(shell command -v bun 2>/dev/null || echo "$(HOME)/.bun/bin/bun")

# Container runtime: set CONTAINER_CMD=podman to use podman instead of docker
CONTAINER_CMD ?= docker

.PHONY: help run frontend backend backend-live kill lint format build clean generate install tidy deps deps-down prepare prepare-for-commit

# Default target - show help
help:
	@echo "Satisfactory Dashboard Development Commands"
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
	@echo "  make prepare-for-commit - Run generate, format, and lint"
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
	@echo "Setup:"
	@echo "  make prepare          - Extract LFS assets (run after clone)"
	@echo "  make install          - Install all dependencies"
	@echo ""
	@echo "Other:"
	@echo "  make generate         - Generate TypeScript types from Go structs"
	@echo "  make tidy             - Run go mod tidy"
	@echo ""

# ============================================================================
# Main development commands
# ============================================================================

run:
	@echo "Starting Satisfactory Dashboard (frontend + backend with hot reload)..."
	@echo "   Frontend: http://localhost:3039"
	@echo "   Backend:  http://localhost:8081"
	@echo "   Press Ctrl+C to stop both servers"
	@echo ""
	@trap 'kill 0' SIGINT; \
		$(MAKE) -C api run-live & \
		(cd dashboard && $(BUN) run dev) & \
		wait

frontend:
	@echo "Starting frontend development server..."
	cd dashboard && $(BUN) run dev

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
	cd dashboard && $(BUN) run lint
	@echo "Frontend linting complete"

format: format-backend format-frontend
	@echo "All formatting complete"

format-backend:
	@echo "Formatting backend Go code..."
	$(MAKE) -C api format

format-frontend:
	@echo "Formatting frontend TypeScript code..."
	cd dashboard && $(BUN) run format:fix
	@echo "Frontend formatting complete"

prepare-for-commit: generate format lint
	@echo "Ready to commit!"

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
	cd dashboard && $(BUN) run build
	@echo "Frontend build: dashboard/dist/"

# ============================================================================
# Cleanup
# ============================================================================

clean:
	@echo "Cleaning build artifacts..."
	$(MAKE) -C api clean
	cd dashboard && rm -rf dist build
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
	cd dashboard && $(BUN) install
	@echo "All dependencies installed"

tidy:
	@echo "Running go mod tidy..."
	$(MAKE) -C api tidy

# ============================================================================
# Asset preparation (run after clone)
# ============================================================================

# Asset paths
ASSETS_DIR := assets
MAP_DIR := dashboard/public/assets/images/satisfactory/map/1763022054
SCRAPE_OUTPUT := scripts/scrape_images/output
DASHBOARD_IMAGES := dashboard/public/assets/images/satisfactory

prepare:
	@echo "Extracting LFS assets..."
	@mkdir -p $(MAP_DIR)
	tar -xzf $(ASSETS_DIR)/map-realistic.tar.gz -C $(MAP_DIR)
	tar -xzf $(ASSETS_DIR)/map-game.tar.gz -C $(MAP_DIR)
	tar -xzf $(ASSETS_DIR)/scraped-images.tar.gz -C scripts/scrape_images
	@echo "Copying icons to dashboard..."
	@cp -r $(SCRAPE_OUTPUT)/32x32 $(DASHBOARD_IMAGES)/
	@cp -r $(SCRAPE_OUTPUT)/64x64 $(DASHBOARD_IMAGES)/
	@echo "Assets prepared successfully"

# ============================================================================
# Dependencies
# ============================================================================

deps:
	@echo "Starting Redis..."
	$(CONTAINER_CMD) compose up -d redis
	@echo "Redis available at localhost:6379"

deps-down:
	@echo "Stopping Redis..."
	$(CONTAINER_CMD) compose down redis

# ============================================================================
# Docker (full stack)
# ============================================================================

docker-build:
	@echo "Building Docker images..."
	$(CONTAINER_CMD) compose build

docker-up:
	@echo "Starting all Docker containers..."
	$(CONTAINER_CMD) compose up -d

docker-down:
	@echo "Stopping all Docker containers..."
	$(CONTAINER_CMD) compose down

docker-logs:
	@echo "Showing Docker logs..."
	$(CONTAINER_CMD) compose logs -f
