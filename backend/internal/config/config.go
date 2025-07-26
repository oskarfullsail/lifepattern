package config

import (
	"os"
	"strconv"
)

type Config struct {
	Server    ServerConfig
	Database  DatabaseConfig
	AIService AIServiceConfig
}

type ServerConfig struct {
	Port string
	Host string
}

type DatabaseConfig struct {
	URL string
}

type AIServiceConfig struct {
	URL string
}

func Load() *Config {
	return &Config{
		Server: ServerConfig{
			Port: getEnv("PORT", "8080"),
			Host: getEnv("HOST", "0.0.0.0"),
		},
		Database: DatabaseConfig{
			URL: getEnv("DATABASE_URL", "postgres://postgres:password@localhost:5432/lifepattern?sslmode=disable"),
		},
		AIService: AIServiceConfig{
			URL: getEnv("AI_SERVICE_URL", "http://localhost:8000"),
		},
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}
