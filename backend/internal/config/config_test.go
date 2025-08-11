package config

import (
	"os"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestLoad(t *testing.T) {
	// Test with default values
	cfg := Load()

	// Test Server config
	assert.Equal(t, "8080", cfg.Server.Port)
	assert.Equal(t, "0.0.0.0", cfg.Server.Host)

	// Test Database config
	assert.Equal(t, "postgres://postgres:password@localhost:5432/lifepattern?sslmode=disable", cfg.Database.URL)

	// Test AI config
	assert.Equal(t, "http://localhost:8000", cfg.AI.ServiceURL)

	// Test Auth config
	assert.Equal(t, "", cfg.Auth.JWTSecretKey) // Will be auto-generated if empty
	assert.Equal(t, "lifepattern", cfg.Auth.JWTIssuer)
	assert.Equal(t, "lifepattern-users", cfg.Auth.JWTAudience)
	assert.Equal(t, 15*time.Minute, cfg.Auth.JWTAccessExpiry)
	assert.Equal(t, 30*24*time.Hour, cfg.Auth.JWTRefreshExpiry)
	assert.Equal(t, "localhost", cfg.Auth.WebAuthnRPID)
	assert.Equal(t, "LifePattern", cfg.Auth.WebAuthnRPName)
	assert.Equal(t, "http://localhost:8080", cfg.Auth.WebAuthnRPOrigin)
	assert.Equal(t, 10, cfg.Auth.RateLimitAuth)
	assert.Equal(t, time.Minute, cfg.Auth.RateLimitWindow)
	assert.Equal(t, []string{"http://localhost:19006", "http://localhost:3000", "https://lifepattern-ai-dc5fe.web.app"}, cfg.Auth.CORSAllowedOrigins)
	assert.Equal(t, 5*time.Minute, cfg.Auth.ChallengeExpiry)
	assert.Equal(t, 10*time.Minute, cfg.Auth.LinkTokenExpiry)
}

func TestLoadWithEnvironmentVariables(t *testing.T) {
	// Set environment variables
	os.Setenv("PORT", "9090")
	os.Setenv("HOST", "127.0.0.1")
	os.Setenv("DATABASE_URL", "postgres://test:test@localhost:5432/testdb")
	os.Setenv("AI_SERVICE_URL", "http://localhost:9000")
	os.Setenv("JWT_SECRET_KEY", "test-secret-key")
	os.Setenv("JWT_ISSUER", "test-issuer")
	os.Setenv("JWT_AUDIENCE", "test-audience")
	os.Setenv("JWT_ACCESS_TOKEN_EXPIRY", "30m")
	os.Setenv("JWT_REFRESH_TOKEN_EXPIRY", "30d")
	os.Setenv("WEBAUTHN_RP_ID", "test.example.com")
	os.Setenv("WEBAUTHN_RP_NAME", "Test App")
	os.Setenv("WEBAUTHN_RP_ORIGIN", "https://test.example.com")
	os.Setenv("RATE_LIMIT_AUTH_REQUESTS", "20")
	os.Setenv("RATE_LIMIT_AUTH_WINDOW", "2m")
	os.Setenv("CORS_ALLOWED_ORIGINS", "https://test.example.com")
	os.Setenv("CHALLENGE_EXPIRY", "10m")
	os.Setenv("LINK_TOKEN_EXPIRY", "15m")

	defer func() {
		// Clean up environment variables
		os.Unsetenv("PORT")
		os.Unsetenv("HOST")
		os.Unsetenv("DATABASE_URL")
		os.Unsetenv("AI_SERVICE_URL")
		os.Unsetenv("JWT_SECRET_KEY")
		os.Unsetenv("JWT_ISSUER")
		os.Unsetenv("JWT_AUDIENCE")
		os.Unsetenv("JWT_ACCESS_TOKEN_EXPIRY")
		os.Unsetenv("JWT_REFRESH_TOKEN_EXPIRY")
		os.Unsetenv("WEBAUTHN_RP_ID")
		os.Unsetenv("WEBAUTHN_RP_NAME")
		os.Unsetenv("WEBAUTHN_RP_ORIGIN")
		os.Unsetenv("RATE_LIMIT_AUTH_REQUESTS")
		os.Unsetenv("RATE_LIMIT_AUTH_WINDOW")
		os.Unsetenv("CORS_ALLOWED_ORIGINS")
		os.Unsetenv("CHALLENGE_EXPIRY")
		os.Unsetenv("LINK_TOKEN_EXPIRY")
	}()

	// Load configuration
	cfg := Load()

	// Check that environment variables are used
	assert.Equal(t, "9090", cfg.Server.Port)
	assert.Equal(t, "127.0.0.1", cfg.Server.Host)
	assert.Equal(t, "postgres://test:test@localhost:5432/testdb", cfg.Database.URL)
	assert.Equal(t, "http://localhost:9000", cfg.AI.ServiceURL)
	assert.Equal(t, "test-secret-key", cfg.Auth.JWTSecretKey)
	assert.Equal(t, "test-issuer", cfg.Auth.JWTIssuer)
	assert.Equal(t, "test-audience", cfg.Auth.JWTAudience)
	assert.Equal(t, 30*time.Minute, cfg.Auth.JWTAccessExpiry)
	assert.Equal(t, 30*24*time.Hour, cfg.Auth.JWTRefreshExpiry)
	assert.Equal(t, "test.example.com", cfg.Auth.WebAuthnRPID)
	assert.Equal(t, "Test App", cfg.Auth.WebAuthnRPName)
	assert.Equal(t, "https://test.example.com", cfg.Auth.WebAuthnRPOrigin)
	assert.Equal(t, 20, cfg.Auth.RateLimitAuth)
	assert.Equal(t, 2*time.Minute, cfg.Auth.RateLimitWindow)
	assert.Equal(t, []string{"https://test.example.com"}, cfg.Auth.CORSAllowedOrigins)
	assert.Equal(t, 10*time.Minute, cfg.Auth.ChallengeExpiry)
	assert.Equal(t, 15*time.Minute, cfg.Auth.LinkTokenExpiry)
}

func TestGetEnv(t *testing.T) {
	// Test with existing environment variable
	os.Setenv("TEST_VAR", "test_value")
	defer os.Unsetenv("TEST_VAR")

	value := getEnv("TEST_VAR", "default_value")
	assert.Equal(t, "test_value", value)

	// Test with non-existing environment variable
	value = getEnv("NON_EXISTENT_VAR", "default_value")
	assert.Equal(t, "default_value", value)

	// Test with empty environment variable
	os.Setenv("EMPTY_VAR", "")
	defer os.Unsetenv("EMPTY_VAR")

	value = getEnv("EMPTY_VAR", "default_value")
	assert.Equal(t, "default_value", value)
}

func TestGetEnvAsInt(t *testing.T) {
	// Test with valid integer environment variable
	os.Setenv("TEST_INT", "123")
	defer os.Unsetenv("TEST_INT")

	value := getEnvAsInt("TEST_INT", 456)
	assert.Equal(t, 123, value)

	// Test with non-existing environment variable
	value = getEnvAsInt("NON_EXISTENT_INT", 456)
	assert.Equal(t, 456, value)

	// Test with invalid integer environment variable
	os.Setenv("INVALID_INT", "not_a_number")
	defer os.Unsetenv("INVALID_INT")

	value = getEnvAsInt("INVALID_INT", 456)
	assert.Equal(t, 456, value)

	// Test with empty environment variable
	os.Setenv("EMPTY_INT", "")
	defer os.Unsetenv("EMPTY_INT")

	value = getEnvAsInt("EMPTY_INT", 456)
	assert.Equal(t, 456, value)
}

func TestGetEnvAsDuration(t *testing.T) {
	// Test with valid duration environment variable
	os.Setenv("TEST_DURATION", "30m")
	defer os.Unsetenv("TEST_DURATION")

	value := getEnvAsDuration("TEST_DURATION", 1*time.Hour)
	assert.Equal(t, 30*time.Minute, value)

	// Test with non-existing environment variable
	value = getEnvAsDuration("NON_EXISTENT_DURATION", 1*time.Hour)
	assert.Equal(t, 1*time.Hour, value)

	// Test with invalid duration environment variable
	os.Setenv("INVALID_DURATION", "not_a_duration")
	defer os.Unsetenv("INVALID_DURATION")

	value = getEnvAsDuration("INVALID_DURATION", 1*time.Hour)
	assert.Equal(t, 1*time.Hour, value)

	// Test with empty environment variable
	os.Setenv("EMPTY_DURATION", "")
	defer os.Unsetenv("EMPTY_DURATION")

	value = getEnvAsDuration("EMPTY_DURATION", 1*time.Hour)
	assert.Equal(t, 1*time.Hour, value)
}

func TestGetEnvAsSlice(t *testing.T) {
	// Test with valid slice environment variable
	os.Setenv("TEST_SLICE", "value1,value2,value3")
	defer os.Unsetenv("TEST_SLICE")

	value := getEnvAsSlice("TEST_SLICE", []string{"default"})
	assert.Equal(t, []string{"value1,value2,value3"}, value)

	// Test with non-existing environment variable
	value = getEnvAsSlice("NON_EXISTENT_SLICE", []string{"default"})
	assert.Equal(t, []string{"default"}, value)

	// Test with empty environment variable
	os.Setenv("EMPTY_SLICE", "")
	defer os.Unsetenv("EMPTY_SLICE")

	value = getEnvAsSlice("EMPTY_SLICE", []string{"default"})
	assert.Equal(t, []string{"default"}, value)
}

func TestConfigStructure(t *testing.T) {
	cfg := Load()

	// Test that all config sections are properly initialized
	assert.NotNil(t, cfg.Server)
	assert.NotNil(t, cfg.Database)
	assert.NotNil(t, cfg.AI)
	assert.NotNil(t, cfg.Auth)

	// Test that required fields have values
	assert.NotEmpty(t, cfg.Server.Port)
	assert.NotEmpty(t, cfg.Server.Host)
	assert.NotEmpty(t, cfg.Database.URL)
	assert.NotEmpty(t, cfg.AI.ServiceURL)
	assert.NotEmpty(t, cfg.Auth.JWTIssuer)
	assert.NotEmpty(t, cfg.Auth.JWTAudience)
	assert.NotEmpty(t, cfg.Auth.WebAuthnRPID)
	assert.NotEmpty(t, cfg.Auth.WebAuthnRPName)
	assert.NotEmpty(t, cfg.Auth.WebAuthnRPOrigin)
	assert.NotEmpty(t, cfg.Auth.CORSAllowedOrigins)
}

func TestConfigEdgeCases(t *testing.T) {
	// Test with very long environment variable
	longValue := strings.Repeat("a", 1000)
	os.Setenv("LONG_VAR", longValue)
	defer os.Unsetenv("LONG_VAR")

	value := getEnv("LONG_VAR", "default")
	assert.Equal(t, longValue, value)

	// Test with special characters
	specialValue := "test@#$%^&*()_+-=[]{}|;':\",./<>?"
	os.Setenv("SPECIAL_VAR", specialValue)
	defer os.Unsetenv("SPECIAL_VAR")

	value = getEnv("SPECIAL_VAR", "default")
	assert.Equal(t, specialValue, value)

	// Test with zero values
	os.Setenv("ZERO_INT", "0")
	defer os.Unsetenv("ZERO_INT")

	valueInt := getEnvAsInt("ZERO_INT", 999)
	assert.Equal(t, 0, valueInt)

	// Test with negative values
	os.Setenv("NEGATIVE_INT", "-123")
	defer os.Unsetenv("NEGATIVE_INT")

	valueInt = getEnvAsInt("NEGATIVE_INT", 999)
	assert.Equal(t, -123, valueInt)
}
