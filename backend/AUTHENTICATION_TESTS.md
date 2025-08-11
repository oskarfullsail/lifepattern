# Authentication Test Suite

This document describes the comprehensive test suite for the LifePattern authentication system.

## Overview

The authentication test suite covers all aspects of the authentication system including:

- **JWT Token Management** - Token generation, validation, and refresh
- **Session Management** - Session creation, validation, and rotation
- **Mobile Authentication** - Challenge-response authentication flow
- **WebAuthn Authentication** - Passwordless authentication using WebAuthn
- **Authentication Handlers** - HTTP endpoint handlers and request processing
- **Integration Tests** - End-to-end authentication flows

## Test Structure

### Unit Tests

#### JWT Service Tests (`internal/auth/jwt_test.go`)
- Token generation and validation
- Refresh token handling
- Password hashing and verification
- IP address and user agent hashing
- Token expiry and security validation

#### Session Service Tests (`internal/auth/sessions_test.go`)
- Session creation and management
- Refresh token rotation
- Session validation and expiry
- Concurrent session handling
- Edge cases and error scenarios

#### Mobile Authentication Tests (`internal/auth/mobile_test.go`)
- Challenge creation and validation
- Mobile credential generation
- Challenge timeout handling
- Performance and security testing

#### WebAuthn Service Tests (`internal/auth/webauthn_test.go`)
- Registration and login flows
- Credential conversion and validation
- Session data management
- Security and performance testing

#### Authentication Handler Tests (`internal/handlers/auth_test.go`)
- HTTP endpoint testing
- Request validation and error handling
- Mock repository integration
- Response format validation

### Integration Tests

#### Complete Authentication Flow (`test/auth_integration_test.go`)
- End-to-end mobile authentication
- Multiple session management
- WebAuthn registration and login
- Error handling and edge cases
- Performance and concurrent access testing
- Data cleanup and validation

## Running Tests

### Quick Start

```bash
# Run all authentication tests
./run_auth_tests.sh

# Run tests with coverage report
./run_auth_tests.sh -c

# Run only unit tests
./run_auth_tests.sh -u

# Run only integration tests
./run_auth_tests.sh -i
```

### Specific Test Categories

```bash
# Run JWT service tests only
./run_auth_tests.sh jwt

# Run session service tests only
./run_auth_tests.sh session

# Run mobile authentication tests only
./run_auth_tests.sh mobile

# Run WebAuthn tests only
./run_auth_tests.sh webauthn

# Run auth handler tests only
./run_auth_tests.sh handler
```

### Manual Test Execution

```bash
# Run all auth-related tests
go test -v ./internal/auth ./internal/handlers ./test -run "TestAuth"

# Run specific test file
go test -v ./internal/auth -run "TestJWT"

# Run with coverage
go test -v -coverprofile=coverage.out ./internal/auth ./internal/handlers ./test -run "TestAuth"
go tool cover -html=coverage.out -o coverage.html
```

## Test Environment Setup

### Prerequisites

- Go 1.19 or later
- Docker (for integration tests)
- PostgreSQL (for integration tests)

### Environment Variables

The test runner automatically sets these environment variables:

```bash
TEST_DATABASE_URL="postgres://postgres:password@localhost:5434/lifepattern_test?sslmode=disable"
JWT_SECRET_KEY="test-secret-key-for-testing-only"
JWT_ISSUER="test-issuer"
JWT_AUDIENCE="test-audience"
```

### Database Setup

The test runner automatically:
1. Starts a PostgreSQL container for testing
2. Creates the test database
3. Runs migrations
4. Cleans up after tests

## Test Coverage

### JWT Service Coverage

- ✅ Token generation with various claims
- ✅ Token validation and parsing
- ✅ Token expiry handling
- ✅ Refresh token generation and hashing
- ✅ Password hashing and verification
- ✅ IP address and user agent hashing
- ✅ Security validation (different keys, expired tokens)
- ✅ Edge cases (empty values, invalid formats)

### Session Service Coverage

- ✅ Session creation with all required fields
- ✅ Refresh token validation
- ✅ Session rotation and token refresh
- ✅ Session expiry handling
- ✅ Multiple sessions per user
- ✅ Concurrent session access
- ✅ Edge cases (empty device labels, special characters)

### Mobile Authentication Coverage

- ✅ Challenge creation and uniqueness
- ✅ Challenge validation and expiry
- ✅ Mobile credential generation
- ✅ Challenge timeout behavior
- ✅ Performance testing
- ✅ Security validation

### WebAuthn Service Coverage

- ✅ Registration flow (begin/finish)
- ✅ Login flow (begin/finish)
- ✅ Credential conversion
- ✅ Session data management
- ✅ Challenge uniqueness
- ✅ Security isolation between users

### Authentication Handler Coverage

- ✅ HTTP endpoint testing
- ✅ Request validation
- ✅ Error handling
- ✅ Response format validation
- ✅ Database integration
- ✅ Mock repository testing

### Integration Test Coverage

- ✅ Complete authentication flows
- ✅ Multiple session scenarios
- ✅ Error handling and edge cases
- ✅ Performance and concurrent access
- ✅ Data persistence and cleanup
- ✅ Real database interactions

## Test Data and Mocking

### Mock Repository

The handler tests use a mock repository that implements the `RepositoryInterface`:

```go
type MockRepository struct {
    mock.Mock
}
```

This allows testing handlers without requiring a real database connection.

### Test Helpers

The `test/helpers.go` file provides:

- Database setup and cleanup
- Test user creation
- Test data generation
- Common test utilities

### Integration Test Database

Integration tests use a real PostgreSQL database to test:

- Data persistence
- Transaction handling
- Real database constraints
- Performance characteristics

## Performance Testing

The test suite includes performance tests that verify:

- Concurrent authentication requests
- Token generation performance
- Session creation performance
- Database operation performance

Performance thresholds are set to ensure the system can handle expected load.

## Security Testing

Security tests verify:

- Token signature validation
- Challenge uniqueness
- Session isolation
- Expired token handling
- Invalid input handling

## Error Handling

Tests cover various error scenarios:

- Invalid request bodies
- Missing required fields
- Invalid UUID formats
- Database connection errors
- Expired challenges/tokens
- Non-existent users/credentials

## Continuous Integration

The test suite is designed to run in CI/CD pipelines:

- Fast execution (under 30 seconds for unit tests)
- Isolated test environment
- Automatic cleanup
- Coverage reporting
- Exit codes for CI integration

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Ensure Docker is running
   - Check if test database container is started
   - Verify port 5434 is available

2. **Test Timeouts**
   - Increase timeout values for slow environments
   - Check system resources
   - Verify database performance

3. **Coverage Report Issues**
   - Ensure `go tool cover` is available
   - Check file permissions for coverage directory
   - Verify test execution completed successfully

### Debug Mode

Run tests with verbose output:

```bash
go test -v -timeout 60s ./internal/auth -run "TestJWT"
```

### Cleanup

Clean up test environment:

```bash
./run_auth_tests.sh --cleanup
```

## Contributing

When adding new authentication features:

1. Add unit tests for the new functionality
2. Add integration tests for end-to-end flows
3. Update this documentation
4. Ensure all tests pass
5. Maintain or improve test coverage

### Test Naming Conventions

- Unit tests: `Test[ServiceName]_[FunctionName]`
- Integration tests: `TestAuthIntegration_[Scenario]`
- Performance tests: `Test[ServiceName]_Performance`
- Security tests: `Test[ServiceName]_Security`

### Test Organization

- Group related tests using `t.Run()`
- Use descriptive test names
- Include both positive and negative test cases
- Test edge cases and error conditions
- Use table-driven tests for multiple scenarios

## Metrics and Monitoring

The test suite provides:

- Test execution time
- Coverage percentages
- Performance benchmarks
- Error rate tracking

Use these metrics to:

- Monitor test performance
- Identify slow tests
- Track coverage trends
- Ensure system reliability 