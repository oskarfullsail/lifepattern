package config

import (
	"os"
	"strconv"
	"time"
)

// Config holds all configuration for the application
type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	AI       AIConfig
	Auth     AuthConfig
}

// ServerConfig holds server-related configuration
type ServerConfig struct {
	Port string
	Host string
}

// DatabaseConfig holds database-related configuration
type DatabaseConfig struct {
	URL string
}

// AIConfig holds AI service-related configuration
type AIConfig struct {
	ServiceURL string
}

// AuthConfig holds authentication-related configuration
type AuthConfig struct {
	JWTSecretKey       string
	JWTIssuer          string
	JWTAudience        string
	JWTAccessExpiry    time.Duration
	JWTRefreshExpiry   time.Duration
	WebAuthnRPID       string
	WebAuthnRPName     string
	WebAuthnRPOrigin   string
	RateLimitAuth      int
	RateLimitWindow    time.Duration
	CORSAllowedOrigins []string
	ChallengeExpiry    time.Duration
	LinkTokenExpiry    time.Duration
}

// Load loads configuration from environment variables
func Load() *Config {
	return &Config{
		Server: ServerConfig{
			Port: getEnv("PORT", "8080"),
			Host: getEnv("HOST", "0.0.0.0"),
		},
		Database: DatabaseConfig{
			URL: getEnv("DATABASE_URL", "postgres://postgres:password@localhost:5432/lifepattern?sslmode=disable"),
		},
		AI: AIConfig{
			ServiceURL: getEnv("AI_SERVICE_URL", "http://localhost:8000"),
		},
		Auth: AuthConfig{
			JWTSecretKey:       getEnv("JWT_SECRET_KEY", ""), // Will be auto-generated if empty
			JWTIssuer:          getEnv("JWT_ISSUER", "lifepattern"),
			JWTAudience:        getEnv("JWT_AUDIENCE", "lifepattern-users"),
			JWTAccessExpiry:    getEnvAsDuration("JWT_ACCESS_TOKEN_EXPIRY", 15*time.Minute),
			JWTRefreshExpiry:   getEnvAsDuration("JWT_REFRESH_TOKEN_EXPIRY", 30*24*time.Hour), // 30 days
			WebAuthnRPID:       getEnv("WEBAUTHN_RP_ID", "localhost"),
			WebAuthnRPName:     getEnv("WEBAUTHN_RP_NAME", "LifePattern"),
			WebAuthnRPOrigin:   getEnv("WEBAUTHN_RP_ORIGIN", "http://localhost:8080"),
			RateLimitAuth:      getEnvAsInt("RATE_LIMIT_AUTH_REQUESTS", 10),
			RateLimitWindow:    getEnvAsDuration("RATE_LIMIT_AUTH_WINDOW", time.Minute),
			CORSAllowedOrigins: getEnvAsSlice("CORS_ALLOWED_ORIGINS", []string{"http://localhost:19006", "http://localhost:3000", "https://lifepattern-ai-dc5fe.web.app", "https://lifepattern-ai-dc5fe.web.app"}),
			ChallengeExpiry:    getEnvAsDuration("CHALLENGE_EXPIRY", 5*time.Minute),
			LinkTokenExpiry:    getEnvAsDuration("LINK_TOKEN_EXPIRY", 10*time.Minute),
		},
	}
}

// getEnv gets an environment variable or returns a default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// getEnvAsInt gets an environment variable as an integer or returns a default value
func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

// getEnvAsDuration gets an environment variable as a duration or returns a default value
func getEnvAsDuration(key string, defaultValue time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		if duration, err := time.ParseDuration(value); err == nil {
			return duration
		}
	}
	return defaultValue
}

// getEnvAsSlice gets an environment variable as a slice or returns a default value
func getEnvAsSlice(key string, defaultValue []string) []string {
	if value := os.Getenv(key); value != "" {
		// Simple comma-separated values for now
		// In production, you might want more sophisticated parsing
		return []string{value}
	}
	return defaultValue
}
