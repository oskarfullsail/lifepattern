package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"lifepattern-api/internal/auth"
	"lifepattern-api/internal/config"
	"lifepattern-api/internal/database"
	"lifepattern-api/internal/handlers"
	"lifepattern-api/internal/middleware"
	"lifepattern-api/internal/services"

	_ "github.com/lib/pq"

	"github.com/gorilla/mux"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Connect to database
	db, err := sql.Open("postgres", cfg.Database.URL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Test database connection
	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}
	log.Println("✅ Connected to database")

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
