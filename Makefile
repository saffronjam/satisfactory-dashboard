# Satisfactory Dashboard - Unified Development Makefile
# Run from project root directory

# Use bun from ~/.bun/bin if not in PATH
BUN := $(shell command -v bun 2>/dev/null || echo "$(HOME)/.bun/bin/bun")

# Container runtime: set CONTAINER_CMD=podman to use podman instead of docker
CONTAINER_CMD ?= docker

# Container image names
ASSET_SERVER_IMAGE ?= ghcr.io/saffronjam/satisfactory-dashboard-asset-server

.PHONY: help run frontend backend backend-live backend-api backend-poller backend-api-2 backend-poller-2 backend-2 kill lint format build clean generate install tidy deps deps-down unpack-assets pack-assets prepare-for-commit asset-server asset-server-push test test-verbose

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
	@echo "Multi-Instance Backend (for testing distributed coordination):"
	@echo "  make backend-api      - Run backend API only (instance 1)"
	@echo "  make backend-poller   - Run backend poller only (instance 1)"
	@echo "  make backend-api-2    - Run backend API only (instance 2, port 8082)"
	@echo "  make backend-poller-2 - Run backend poller only (instance 2)"
	@echo "  make backend-2        - Run full backend (instance 2, port 8082)"
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
	@echo "  make unpack-assets    - Extract LFS assets (run after clone)"
	@echo "  make pack-assets      - Pack assets back to tar files (after updates)"
	@echo "  make install          - Install all dependencies"
	@echo ""
	@echo "Testing:"
	@echo "  make test             - Run backend tests"
	@echo "  make test-verbose     - Run backend tests (verbose)"
	@echo ""
	@echo "Other:"
	@echo "  make generate         - Generate TypeScript types from Go structs"
	@echo "  make tidy             - Run go mod tidy"
	@echo ""
	@echo "Asset Server (production):"
	@echo "  make asset-server     - Build asset server Docker image"
	@echo "  make asset-server-push- Build and push asset server image"
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
		(cd api && SD_MAX_SAMPLE_GAME_DURATION=3600 $(shell go env GOPATH)/bin/air) & \
		(cd dashboard && $(BUN) run dev) & \
		wait

frontend:
	@echo "Starting frontend development server..."
	cd dashboard && $(BUN) run dev

backend:
	@echo "Starting backend server..."
	cd api && SD_NODE_NAME=dev-backend SD_MAX_SAMPLE_GAME_DURATION=3600 go run main.go -api -publisher

backend-live:
	@echo "Starting backend server with hot reload..."
	@echo "Watching for changes in api/ directory"
	cd api && SD_NODE_NAME=dev-backend SD_MAX_SAMPLE_GAME_DURATION=3600 $(shell go env GOPATH)/bin/air

backend-2:
	@echo "Starting full backend (instance 2, port 8082)..."
	cd api && SD_API_PORT=8082 SD_NODE_NAME=dev-backend-2 SD_MAX_SAMPLE_GAME_DURATION=3600 go run main.go -api -publisher

backend-api:
	@echo "Starting backend API (instance 1)..."
	cd api && SD_NODE_NAME=dev-api-1 SD_MAX_SAMPLE_GAME_DURATION=3600 go run main.go -api

backend-poller:
	@echo "Starting backend poller (instance 1)..."
	cd api && SD_NODE_NAME=dev-poller-1 SD_MAX_SAMPLE_GAME_DURATION=3600 go run main.go -publisher

backend-api-2:
	@echo "Starting backend API (instance 2, port 8082)..."
	cd api && SD_API_PORT=8082 SD_NODE_NAME=dev-api-2 SD_MAX_SAMPLE_GAME_DURATION=3600 go run main.go -api

backend-poller-2:
	@echo "Starting backend poller (instance 2)..."
	cd api && SD_NODE_NAME=dev-poller-2 SD_MAX_SAMPLE_GAME_DURATION=3600 go run main.go -publisher

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
	cd api && go fmt ./...
	cd api && go vet ./...
	@echo "Backend linting complete"

lint-frontend:
	@echo "Running frontend linting (oxlint)..."
	cd dashboard && $(BUN) run lint
	@echo "Frontend linting complete"

format: format-backend format-frontend
	@echo "All formatting complete"

format-backend:
	@echo "Formatting backend Go code..."
	cd api && find . -name "*.go" -exec gofmt -s -w {} \;
	@echo "Backend formatting complete"

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
	cd api && go build -o bin/api main.go
	@echo "Backend binary: api/bin/api"

frontend-build:
	@echo "Building frontend for production..."
	cd dashboard && $(BUN) run build
	@echo "Frontend build: dashboard/dist/"

# ============================================================================
# Cleanup
# ============================================================================

clean:
	@echo "Cleaning build artifacts..."
	cd api && rm -rf bin/
	cd api && go clean
	cd dashboard && rm -rf dist build
	@echo "Cleanup complete"

# ============================================================================
# Other
# ============================================================================

generate:
	@echo "Generating TypeScript types from Go structs..."
	cd api && tygo generate --config export/tygo.yml
	@echo "TypeScript types generated"

install:
	@echo "Installing all dependencies..."
	cd api && go mod tidy
	cd dashboard && $(BUN) install
	@echo "All dependencies installed"

tidy:
	@echo "Running go mod tidy..."
	cd api && go mod tidy
	@echo "Go mod tidy complete"

test:
	@echo "Running backend tests..."
	cd api && go test ./...

test-verbose:
	@echo "Running backend tests (verbose)..."
	cd api && go test -v ./...

# ============================================================================
# Asset management (unpack after clone, pack after updates)
# ============================================================================

# Asset paths
ASSETS_DIR := assets
MAP_DIR := dashboard/public/assets/images/satisfactory/map/1763022054
DASHBOARD_IMAGES := dashboard/public/assets/images/satisfactory

unpack-assets:
	@echo "Extracting LFS assets..."
	@mkdir -p $(MAP_DIR)
	tar -xzf $(ASSETS_DIR)/map-realistic.tar.gz -C $(MAP_DIR)
	tar -xzf $(ASSETS_DIR)/map-game.tar.gz -C $(MAP_DIR)
	@echo "Extracting icons to dashboard..."
	tar -xzf $(ASSETS_DIR)/scraped-images.tar.gz --strip-components=1 -C $(DASHBOARD_IMAGES)
	@echo "Assets unpacked successfully"

pack-assets:
	@echo "Packing assets to tar files..."
	@echo "Packing scraped-images.tar.gz..."
	tar -czf $(ASSETS_DIR)/scraped-images.tar.gz -C $(DASHBOARD_IMAGES) --transform 's,^,output/,' 16x16 32x32 64x64 128x128 256x256
	@echo "Packing map-realistic.tar.gz..."
	tar -czf $(ASSETS_DIR)/map-realistic.tar.gz -C $(MAP_DIR) realistic
	@echo "Packing map-game.tar.gz..."
	tar -czf $(ASSETS_DIR)/map-game.tar.gz -C $(MAP_DIR) game
	@echo "Assets packed successfully"

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

# ============================================================================
# Asset Server (production deployment)
# ============================================================================

asset-server:
	@echo "Building asset server image..."
	$(CONTAINER_CMD) build -f asset-server/Dockerfile -t $(ASSET_SERVER_IMAGE):latest \
		--label org.opencontainers.image.source=https://github.com/saffronjam/satisfactory-dashboard \
		.

asset-server-push: asset-server
	@echo "Pushing asset server image..."
	$(CONTAINER_CMD) push $(ASSET_SERVER_IMAGE):latest
