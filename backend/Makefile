# LifePattern Backend Makefile

.PHONY: help test test-unit test-integration test-coverage build run clean setup-db

# Default target
help:
	@echo "Available commands:"
	@echo "  test           - Run all tests"
	@echo "  test-unit      - Run unit tests only"
	@echo "  test-integration - Run integration tests only"
	@echo "  test-coverage  - Run tests with coverage report"
	@echo "  build          - Build the application"
	@echo "  run            - Run the application"
	@echo "  clean          - Clean build artifacts"
	@echo "  setup-db       - Setup test database"
	@echo "  lint           - Run linter"
	@echo "  fmt            - Format code"

# Run all tests
test: test-unit test-integration

# Run unit tests
test-unit:
	@echo "Running unit tests..."
	go test -v ./internal/...

# Run integration tests
test-integration:
	@echo "Running integration tests..."
	go test -v ./test/...

# Run tests with coverage
test-coverage:
	@echo "Running tests with coverage..."
	go test -v -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report generated: coverage.html"

# Build the application
build:
	@echo "Building application..."
	go build -o bin/server cmd/server/main.go

# Run the application
run:
	@echo "Running application..."
	go run cmd/server/main.go

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -rf bin/
	rm -f coverage.out coverage.html
	rm -f main

# Setup test database
setup-db:
	@echo "Setting up test database..."
	@echo "Make sure PostgreSQL is running and create test database:"
	@echo "createdb lifepattern_test"
	@echo "psql -d lifepattern_test -f migrations/001_initial_schema.sql"

# Run linter
lint:
	@echo "Running linter..."
	golangci-lint run

# Format code
fmt:
	@echo "Formatting code..."
	go fmt ./...

# Install dependencies
deps:
	@echo "Installing dependencies..."
	go mod tidy
	go mod download

# Run with hot reload (requires air: go install github.com/cosmtrek/air@latest)
dev:
	@echo "Running with hot reload..."
	air

# Docker commands
docker-build:
	@echo "Building Docker image..."
	docker build -t lifepattern-backend .

docker-run:
	@echo "Running Docker container..."
	docker run -p 8080:8080 --env-file .env lifepattern-backend

# Database commands
db-migrate:
	@echo "Running database migrations..."
	psql -d lifepattern -f migrations/001_initial_schema.sql

db-reset:
	@echo "Resetting database..."
	dropdb lifepattern 2>/dev/null || true
	createdb lifepattern
	psql -d lifepattern -f migrations/001_initial_schema.sql

# Test database commands
test-db-reset:
	@echo "Resetting test database..."
	dropdb lifepattern_test 2>/dev/null || true
	createdb lifepattern_test
	psql -d lifepattern_test -f migrations/001_initial_schema.sql

# Performance testing
bench:
	@echo "Running benchmarks..."
	go test -bench=. ./internal/...

# Security scanning
security:
	@echo "Running security scan..."
	gosec ./...

# Generate mocks (requires mockgen: go install github.com/golang/mock/mockgen@latest)
mocks:
	@echo "Generating mocks..."
	mockgen -source=internal/services/interfaces.go -destination=internal/services/mocks.go

# Show test results in a nice format
test-verbose:
	@echo "Running tests with verbose output..."
	go test -v -count=1 ./internal/... ./test/...

# Run specific test
test-specific:
	@echo "Usage: make test-specific TEST=TestName"
	@echo "Example: make test-specific TEST=TestCreateRoutineLog"
	go test -v -run $(TEST) ./... 