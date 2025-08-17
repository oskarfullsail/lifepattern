package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"lifepattern-api/internal/auth"
	"lifepattern-api/internal/config"
	"lifepattern-api/internal/database"
	"lifepattern-api/internal/handlers"
	"lifepattern-api/internal/middleware"
	"lifepattern-api/internal/services"

	_ "github.com/lib/pq"

	"github.com/gorilla/mux"
)

// applyMigrations applies database migrations
func applyMigrations(db *sql.DB) error {
	// Create migrations table if it doesn't exist
	createMigrationsTable := `
	CREATE TABLE IF NOT EXISTS migrations (
		id SERIAL PRIMARY KEY,
		filename VARCHAR(255) NOT NULL UNIQUE,
		applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
	);`

	if _, err := db.Exec(createMigrationsTable); err != nil {
		return fmt.Errorf("failed to create migrations table: %v", err)
	}

	// Apply complete database schema
	completeSchema := `
	-- Enable UUID extension
	CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
	
	-- Create users table
	CREATE TABLE IF NOT EXISTS users (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
	);
	
	-- Create user_credentials table
	CREATE TABLE IF NOT EXISTS user_credentials (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		username VARCHAR(255) NOT NULL,
		hashed_passphrase VARCHAR(255) NOT NULL,
		salt VARCHAR(255) NOT NULL,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		UNIQUE(user_id),
		UNIQUE(username)
	);
	
	-- Create webauthn_credentials table
	CREATE TABLE IF NOT EXISTS webauthn_credentials (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		credential_id BYTEA NOT NULL,
		public_key BYTEA NOT NULL,
		attestation_type VARCHAR(255),
		transport TEXT[],
		flags INTEGER NOT NULL,
		authenticator VARCHAR(255),
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		UNIQUE(credential_id)
	);
	
	-- Create sessions table
	CREATE TABLE IF NOT EXISTS sessions (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		cred_id UUID REFERENCES webauthn_credentials(id) ON DELETE SET NULL,
		refresh_hash VARCHAR(255) NOT NULL,
		device_label VARCHAR(255),
		ip_fingerprint VARCHAR(255),
		user_agent_hash VARCHAR(255),
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
		revoked_at TIMESTAMP WITH TIME ZONE,
		UNIQUE(refresh_hash)
	);
	
	-- Create mobile_challenges table
	CREATE TABLE IF NOT EXISTS mobile_challenges (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		challenge_id VARCHAR(255) NOT NULL,
		challenge_hash VARCHAR(255) NOT NULL,
		device_label VARCHAR(255),
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
		UNIQUE(challenge_id)
	);
	
	-- Create link_tokens table
	CREATE TABLE IF NOT EXISTS link_tokens (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		token_hash VARCHAR(255) NOT NULL,
		device_label VARCHAR(255),
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
		used_at TIMESTAMP WITH TIME ZONE,
		UNIQUE(token_hash)
	);
	
	-- Create routine_logs table
	CREATE TABLE IF NOT EXISTS routine_logs (
		id SERIAL PRIMARY KEY,
		user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		sleep_hours DECIMAL(3,1),
		meal_times TEXT[],
		screen_time INTEGER,
		exercise_duration INTEGER,
		wake_up_time TIME,
		bed_time TIME,
		water_intake INTEGER,
		stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 10),
		log_date DATE NOT NULL,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		UNIQUE(user_id, log_date)
	);
	
	-- Create indexes
	CREATE INDEX IF NOT EXISTS idx_user_credentials_username ON user_credentials(username);
	CREATE INDEX IF NOT EXISTS idx_user_credentials_user_id ON user_credentials(user_id);
	CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_user_id ON webauthn_credentials(user_id);
	CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
	CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token_hash ON sessions(refresh_hash);
	CREATE INDEX IF NOT EXISTS idx_mobile_challenges_user_id ON mobile_challenges(user_id);
	CREATE INDEX IF NOT EXISTS idx_mobile_challenges_challenge_id ON mobile_challenges(challenge_id);
	CREATE INDEX IF NOT EXISTS idx_link_tokens_user_id ON link_tokens(user_id);
	CREATE INDEX IF NOT EXISTS idx_link_tokens_token_hash ON link_tokens(token_hash);
	CREATE INDEX IF NOT EXISTS idx_routine_logs_user_id ON routine_logs(user_id);
	CREATE INDEX IF NOT EXISTS idx_routine_logs_log_date ON routine_logs(log_date);
	`

	if _, err := db.Exec(completeSchema); err != nil {
		return fmt.Errorf("failed to apply complete schema: %v", err)
	}

	// Record migration as applied
	_, err := db.Exec("INSERT INTO migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING", "complete_schema_setup.sql")
	if err != nil {
		log.Printf("⚠️ Failed to record migration (this is okay if it already exists): %v", err)
	}

	return nil
}

func main() {
	// Load configuration
	cfg := config.Load()

	// Connect to database
	db, err := sql.Open("postgres", cfg.Database.URL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Test database connection with retry logic
	maxRetries := 5
	for i := 0; i < maxRetries; i++ {
		if err := db.Ping(); err != nil {
			log.Printf("⚠️ Database connection attempt %d/%d failed: %v", i+1, maxRetries, err)
			if i == maxRetries-1 {
				log.Printf("❌ Failed to connect to database after %d attempts. Please check your DATABASE_URL environment variable.", maxRetries)
				log.Printf("💡 Make sure you have created a PostgreSQL database in Render and set the DATABASE_URL environment variable.")
				os.Exit(1)
			}
			// Wait before retrying
			time.Sleep(2 * time.Second)
		} else {
			log.Println("✅ Connected to database")
			break
		}
	}

	// Apply database migrations
	log.Println("🔄 Applying database migrations...")
	if err := applyMigrations(db); err != nil {
		log.Printf("❌ Failed to apply migrations: %v", err)
		os.Exit(1)
	}
	log.Println("✅ Database migrations completed")

	// Create repository
	repo := database.NewRepository(db)

	// Create services
	aiService := services.NewAIService(cfg.AI.ServiceURL)
	routineService := services.NewRoutineService(repo, aiService)

	// Create authentication services
	jwtService := auth.NewJWTService(cfg.Auth.JWTSecretKey, cfg.Auth.JWTIssuer, cfg.Auth.JWTAudience, cfg.Auth.JWTAccessExpiry, cfg.Auth.JWTRefreshExpiry)
	webAuthnService, err := auth.NewWebAuthnService(cfg.Auth.WebAuthnRPID, cfg.Auth.WebAuthnRPName, cfg.Auth.WebAuthnRPOrigin)
	if err != nil {
		log.Fatalf("Failed to create WebAuthn service: %v", err)
	}
	sessionService := auth.NewSessionService(cfg.Auth.JWTRefreshExpiry)
	mobileService := auth.NewMobileAuthService(cfg.Auth.ChallengeExpiry)

	// Create handlers
	healthHandler := handlers.NewHealthHandler(repo, aiService)
	logHandler := handlers.NewLogHandler(routineService)
	insightHandler := handlers.NewInsightHandler(routineService)
	authHandler := handlers.NewAuthHandler(repo, jwtService, webAuthnService, sessionService, mobileService)
	deviceHandler := handlers.NewDeviceHandler()

	// Create middleware
	authMiddleware := middleware.NewAuthMiddleware(jwtService)

	// Create router
	router := mux.NewRouter()

	// Add CORS middleware
	router.Use(middleware.CORS)

	// Health check endpoint (public)
	router.HandleFunc("/health", healthHandler.HealthCheck).Methods("GET")

	// Authentication endpoints (public)
	authRouter := router.PathPrefix("/auth").Subrouter()
	authRouter.Use(middleware.CORS) // Apply CORS to auth subrouter
	authRouter.HandleFunc("/register", authHandler.Register).Methods("POST", "OPTIONS")
	authRouter.HandleFunc("/login", authHandler.Login).Methods("POST", "OPTIONS")
	authRouter.HandleFunc("/webauthn/register/start", authHandler.WebAuthnRegistrationStart).Methods("POST", "OPTIONS")
	authRouter.HandleFunc("/webauthn/register/finish", authHandler.WebAuthnRegistrationFinish).Methods("POST", "OPTIONS")
	authRouter.HandleFunc("/webauthn/login/start", authHandler.WebAuthnLoginStart).Methods("POST", "OPTIONS")
	authRouter.HandleFunc("/webauthn/login/finish", authHandler.WebAuthnLoginFinish).Methods("POST", "OPTIONS")
	authRouter.HandleFunc("/mobile/challenge", authHandler.MobileChallenge).Methods("POST", "OPTIONS")
	authRouter.HandleFunc("/mobile/verify", authHandler.MobileVerify).Methods("POST", "OPTIONS")
	authRouter.HandleFunc("/refresh", authHandler.RefreshToken).Methods("POST", "OPTIONS")

	// Cross-device linking endpoints (public)
	authRouter.HandleFunc("/link/verify", authHandler.VerifyLinkToken).Methods("POST")

	// Protected endpoints
	protectedRouter := router.PathPrefix("/api").Subrouter()
	protectedRouter.Use(authMiddleware.RequireAuth)

	// Routine log endpoints
	protectedRouter.HandleFunc("/log", logHandler.CreateRoutineLog).Methods("POST")
	protectedRouter.HandleFunc("/logs", logHandler.GetUserRoutineLogs).Methods("GET")

	// Insight endpoints
	protectedRouter.HandleFunc("/insights", insightHandler.GetInsight).Methods("GET")
	protectedRouter.HandleFunc("/user-insights", insightHandler.GetUserInsights).Methods("GET")

	// Session management endpoints
	protectedRouter.HandleFunc("/auth/logout", authHandler.Logout).Methods("POST")
	protectedRouter.HandleFunc("/auth/sessions", authHandler.GetSessions).Methods("GET")

	// Cross-device linking endpoints (protected)
	protectedRouter.HandleFunc("/auth/link/generate", authHandler.GenerateLinkToken).Methods("POST")
	protectedRouter.HandleFunc("/auth/link/status", authHandler.GetLinkStatus).Methods("GET")

	// Device endpoints (protected)
	protectedRouter.HandleFunc("/device/info", deviceHandler.GetDeviceInfo).Methods("GET")
	protectedRouter.HandleFunc("/device/sync-watch", deviceHandler.SyncWatchData).Methods("POST")

	// Start server
	serverAddr := fmt.Sprintf("%s:%s", cfg.Server.Host, cfg.Server.Port)
	log.Printf("🚀 Starting server on %s", serverAddr)

	// Create server
	server := &http.Server{
		Addr:    serverAddr,
		Handler: router,
	}

	// Start server in a goroutine
	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("🛑 Shutting down server...")

	// Close database connection
	if err := repo.Close(); err != nil {
		log.Printf("Error closing database: %v", err)
	}

	log.Println("✅ Server stopped")
}
