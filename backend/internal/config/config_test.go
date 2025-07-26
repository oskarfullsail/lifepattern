package config

import (
	"os"
	"testing"
)

func TestLoad(t *testing.T) {
	// Test with default values
	cfg := Load()

	if cfg.Server.Port != "8080" {
		t.Fatalf("Expected default port 8080, got %s", cfg.Server.Port)
	}

	if cfg.Server.Host != "0.0.0.0" {
		t.Fatalf("Expected default host 0.0.0.0, got %s", cfg.Server.Host)
	}

	if cfg.Database.URL != "postgres://postgres:password@localhost:5432/lifepattern?sslmode=disable" {
		t.Fatalf("Expected default database URL, got %s", cfg.Database.URL)
	}

	if cfg.AIService.URL != "http://localhost:8000" {
		t.Fatalf("Expected default AI service URL http://localhost:8000, got %s", cfg.AIService.URL)
	}
}

func TestLoadWithEnvironmentVariables(t *testing.T) {
	// Set environment variables
	os.Setenv("PORT", "9090")
	os.Setenv("HOST", "127.0.0.1")
	os.Setenv("DATABASE_URL", "postgres://test:test@localhost:5432/testdb")
	os.Setenv("AI_SERVICE_URL", "http://localhost:9000")

	// Load configuration
	cfg := Load()

	// Check that environment variables are used
	if cfg.Server.Port != "9090" {
		t.Fatalf("Expected port 9090, got %s", cfg.Server.Port)
	}

	if cfg.Server.Host != "127.0.0.1" {
		t.Fatalf("Expected host 127.0.0.1, got %s", cfg.Server.Host)
	}

	if cfg.Database.URL != "postgres://test:test@localhost:5432/testdb" {
		t.Fatalf("Expected database URL postgres://test:test@localhost:5432/testdb, got %s", cfg.Database.URL)
	}

	if cfg.AIService.URL != "http://localhost:9000" {
		t.Fatalf("Expected AI service URL http://localhost:9000, got %s", cfg.AIService.URL)
	}

	// Clean up environment variables
	os.Unsetenv("PORT")
	os.Unsetenv("HOST")
	os.Unsetenv("DATABASE_URL")
	os.Unsetenv("AI_SERVICE_URL")
}

func TestGetEnv(t *testing.T) {
	// Test with existing environment variable
	os.Setenv("TEST_VAR", "test_value")
	defer os.Unsetenv("TEST_VAR")

	value := getEnv("TEST_VAR", "default_value")
	if value != "test_value" {
		t.Fatalf("Expected test_value, got %s", value)
	}

	// Test with non-existing environment variable
	value = getEnv("NON_EXISTENT_VAR", "default_value")
	if value != "default_value" {
		t.Fatalf("Expected default_value, got %s", value)
	}

	// Test with empty environment variable
	os.Setenv("EMPTY_VAR", "")
	defer os.Unsetenv("EMPTY_VAR")

	value = getEnv("EMPTY_VAR", "default_value")
	if value != "default_value" {
		t.Fatalf("Expected default_value for empty env var, got %s", value)
	}
}

func TestGetEnvAsInt(t *testing.T) {
	// Test with valid integer environment variable
	os.Setenv("TEST_INT", "123")
	defer os.Unsetenv("TEST_INT")

	value := getEnvAsInt("TEST_INT", 456)
	if value != 123 {
		t.Fatalf("Expected 123, got %d", value)
	}

	// Test with non-existing environment variable
	value = getEnvAsInt("NON_EXISTENT_INT", 456)
	if value != 456 {
		t.Fatalf("Expected 456, got %d", value)
	}

	// Test with invalid integer environment variable
	os.Setenv("INVALID_INT", "not_a_number")
	defer os.Unsetenv("INVALID_INT")

	value = getEnvAsInt("INVALID_INT", 456)
	if value != 456 {
		t.Fatalf("Expected 456 for invalid int, got %d", value)
	}

	// Test with empty environment variable
	os.Setenv("EMPTY_INT", "")
	defer os.Unsetenv("EMPTY_INT")

	value = getEnvAsInt("EMPTY_INT", 456)
	if value != 456 {
		t.Fatalf("Expected 456 for empty int, got %d", value)
	}
}
