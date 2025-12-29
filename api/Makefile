# Commander API - Backend Makefile
# Run from api/ directory

.PHONY: help run run-live build lint format clean generate test tidy

# Default target - show help
help:
	@echo "Commander API - Backend Commands"
	@echo ""
	@echo "Development:"
	@echo "  make run          - Run backend server"
	@echo "  make run-live     - Run backend server with hot reload (requires air)"
	@echo ""
	@echo "Code Quality:"
	@echo "  make lint         - Run Go fmt and vet"
	@echo "  make format       - Format Go code with gofmt"
	@echo "  make tidy         - Run go mod tidy"
	@echo ""
	@echo "Build:"
	@echo "  make build        - Build production binary"
	@echo "  make clean        - Clean build artifacts"
	@echo ""
	@echo "Other:"
	@echo "  make generate     - Generate TypeScript types with tygo"
	@echo "  make test         - Run tests"
	@echo ""

# Development
run:
	@echo "Starting Commander API..."
	go run main.go -api -publisher

run-live:
	@echo "Starting Commander API with hot reload..."
	@echo "Watching for changes in api/ directory"
	$(shell go env GOPATH)/bin/air

# Code quality
lint:
	@echo "Running Go linting..."
	go fmt ./...
	go vet ./...
	@echo "Backend linting complete"

format:
	@echo "Formatting Go code..."
	find . -name "*.go" -exec gofmt -s -w {} \;
	@echo "Backend formatting complete"

tidy:
	@echo "Running go mod tidy..."
	go mod tidy
	@echo "Go mod tidy complete"

# Build
build:
	@echo "Building Commander API binary..."
	go build -o bin/api main.go
	@echo "Backend binary: bin/api"

# Cleanup
clean:
	@echo "Cleaning build artifacts..."
	rm -rf bin/
	go clean
	@echo "Cleanup complete"

# Type generation
generate:
	@echo "Generating TypeScript types from Go structs..."
	tygo generate --config export/tygo.yml
	@echo "TypeScript types generated"

# Testing
test:
	@echo "Running backend tests..."
	go test ./...

test-verbose:
	@echo "Running backend tests (verbose)..."
	go test -v ./...
