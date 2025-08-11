#!/bin/bash

# Authentication Test Runner
# This script runs all authentication-related tests for the LifePattern backend

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if we're in the backend directory
check_directory() {
    if [ ! -f "go.mod" ]; then
        print_error "This script must be run from the backend directory"
        exit 1
    fi
}

# Function to setup test environment
setup_test_env() {
    print_status "Setting up test environment..."
    
    # Check if required commands exist
    if ! command_exists go; then
        print_error "Go is not installed or not in PATH"
        exit 1
    fi
    
    if ! command_exists docker; then
        print_warning "Docker not found. Some integration tests may fail."
    fi
    
    # Check if test database is running
    if command_exists docker; then
        if docker ps | grep -q "lifepattern_test"; then
            print_success "Test database is running"
        else
            print_warning "Test database not found. Starting test database..."
            docker run -d --name lifepattern_test \
                -e POSTGRES_DB=lifepattern_test \
                -e POSTGRES_USER=postgres \
                -e POSTGRES_PASSWORD=password \
                -p 5434:5432 \
                postgres:15 > /dev/null 2>&1 || true
            
            # Wait for database to be ready
            print_status "Waiting for test database to be ready..."
            sleep 5
        fi
    fi
    
    # Set test environment variables
    export TEST_DATABASE_URL="postgres://postgres:password@localhost:5434/lifepattern_test?sslmode=disable"
    export JWT_SECRET_KEY="test-secret-key-for-testing-only"
    export JWT_ISSUER="test-issuer"
    export JWT_AUDIENCE="test-audience"
}

# Function to run unit tests
run_unit_tests() {
    print_status "Running authentication unit tests..."
    
    # Run JWT service tests
    print_status "Testing JWT service..."
    go test -v ./internal/auth -run "TestJWT" -timeout 30s
    
    # Run session service tests
    print_status "Testing session service..."
    go test -v ./internal/auth -run "TestSession" -timeout 30s
    
    # Run mobile auth service tests
    print_status "Testing mobile authentication service..."
    go test -v ./internal/auth -run "TestMobile" -timeout 30s
    
    # Run WebAuthn service tests
    print_status "Testing WebAuthn service..."
    go test -v ./internal/auth -run "TestWebAuthn" -timeout 30s
    
    # Run auth handler tests
    print_status "Testing authentication handlers..."
    go test -v ./internal/handlers -run "TestAuth" -timeout 30s
}

# Function to run integration tests
run_integration_tests() {
    print_status "Running authentication integration tests..."
    
    # Run integration tests
    go test -v ./test -run "TestAuthIntegration" -timeout 60s
}

# Function to run all tests
run_all_tests() {
    print_status "Running all authentication tests..."
    
    # Run unit tests
    run_unit_tests
    
    # Run integration tests
    run_integration_tests
}

# Function to run specific test category
run_test_category() {
    case $1 in
        "unit")
            run_unit_tests
            ;;
        "integration")
            run_integration_tests
            ;;
        "jwt")
            print_status "Running JWT service tests..."
            go test -v ./internal/auth -run "TestJWT" -timeout 30s
            ;;
        "session")
            print_status "Running session service tests..."
            go test -v ./internal/auth -run "TestSession" -timeout 30s
            ;;
        "mobile")
            print_status "Running mobile authentication tests..."
            go test -v ./internal/auth -run "TestMobile" -timeout 30s
            ;;
        "webauthn")
            print_status "Running WebAuthn tests..."
            go test -v ./internal/auth -run "TestWebAuthn" -timeout 30s
            ;;
        "handler")
            print_status "Running auth handler tests..."
            go test -v ./internal/handlers -run "TestAuth" -timeout 30s
            ;;
        *)
            print_error "Unknown test category: $1"
            print_usage
            exit 1
            ;;
    esac
}

# Function to run tests with coverage
run_tests_with_coverage() {
    print_status "Running tests with coverage..."
    
    # Create coverage directory
    mkdir -p coverage
    
    # Run tests with coverage
    go test -v -coverprofile=coverage/auth.out ./internal/auth ./internal/handlers ./test -run "TestAuth" -timeout 60s
    
    # Generate coverage report
    go tool cover -html=coverage/auth.out -o coverage/auth.html
    
    print_success "Coverage report generated: coverage/auth.html"
}

# Function to clean up test environment
cleanup_test_env() {
    print_status "Cleaning up test environment..."
    
    # Stop and remove test database container
    if command_exists docker; then
        docker stop lifepattern_test > /dev/null 2>&1 || true
        docker rm lifepattern_test > /dev/null 2>&1 || true
    fi
    
    # Remove coverage files
    rm -rf coverage/
    
    print_success "Cleanup completed"
}

# Function to print usage
print_usage() {
    echo "Usage: $0 [OPTIONS] [CATEGORY]"
    echo ""
    echo "Options:"
    echo "  -h, --help          Show this help message"
    echo "  -c, --coverage      Run tests with coverage report"
    echo "  -u, --unit          Run only unit tests"
    echo "  -i, --integration   Run only integration tests"
    echo "  --cleanup           Clean up test environment"
    echo ""
    echo "Categories:"
    echo "  jwt                 Run JWT service tests only"
    echo "  session             Run session service tests only"
    echo "  mobile              Run mobile authentication tests only"
    echo "  webauthn            Run WebAuthn tests only"
    echo "  handler             Run auth handler tests only"
    echo "  unit                Run all unit tests"
    echo "  integration         Run all integration tests"
    echo ""
    echo "Examples:"
    echo "  $0                  Run all authentication tests"
    echo "  $0 -c               Run all tests with coverage"
    echo "  $0 jwt              Run JWT tests only"
    echo "  $0 -u               Run unit tests only"
    echo "  $0 --cleanup        Clean up test environment"
}

# Main script logic
main() {
    # Check if we're in the right directory
    check_directory
    
    # Parse command line arguments
    COVERAGE=false
    UNIT_ONLY=false
    INTEGRATION_ONLY=false
    CLEANUP_ONLY=false
    CATEGORY=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                print_usage
                exit 0
                ;;
            -c|--coverage)
                COVERAGE=true
                shift
                ;;
            -u|--unit)
                UNIT_ONLY=true
                shift
                ;;
            -i|--integration)
                INTEGRATION_ONLY=true
                shift
                ;;
            --cleanup)
                CLEANUP_ONLY=true
                shift
                ;;
            -*)
                print_error "Unknown option: $1"
                print_usage
                exit 1
                ;;
            *)
                if [ -z "$CATEGORY" ]; then
                    CATEGORY="$1"
                else
                    print_error "Multiple categories specified"
                    print_usage
                    exit 1
                fi
                shift
                ;;
        esac
    done
    
    # Handle cleanup only
    if [ "$CLEANUP_ONLY" = true ]; then
        cleanup_test_env
        exit 0
    fi
    
    # Setup test environment
    setup_test_env
    
    # Run tests based on options
    if [ "$COVERAGE" = true ]; then
        run_tests_with_coverage
    elif [ "$UNIT_ONLY" = true ]; then
        run_unit_tests
    elif [ "$INTEGRATION_ONLY" = true ]; then
        run_integration_tests
    elif [ -n "$CATEGORY" ]; then
        run_test_category "$CATEGORY"
    else
        run_all_tests
    fi
    
    print_success "All tests completed successfully!"
}

# Run main function with all arguments
main "$@" 