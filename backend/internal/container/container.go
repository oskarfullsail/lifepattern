package container

import (
	"database/sql"
	"log"

	"lifepattern-api/internal/auth"
	"lifepattern-api/internal/config"
	"lifepattern-api/internal/database"
	"lifepattern-api/internal/handlers"
	"lifepattern-api/internal/middleware"
	"lifepattern-api/internal/services"
)

// Container holds all application dependencies
type Container struct {
	Config     *config.Config
	DB         *sql.DB
	Repository *database.Repository
	Services   *Services
	Handlers   *Handlers
	Middleware *Middleware
}

// Services holds all business logic services
type Services struct {
	JWTService      *auth.JWTService
	WebAuthnService *auth.WebAuthnService
	SessionService  *auth.SessionService
	MobileService   *auth.MobileAuthService
	AIService       *services.AIService
	RoutineService  *services.RoutineService
}

// Handlers holds all HTTP handlers
type Handlers struct {
	AuthHandler          *handlers.AuthHandler
	HealthHandler        *handlers.HealthHandler
	LogHandler           *handlers.LogHandler
	InsightHandler       *handlers.InsightHandler
	DeviceHandler        *handlers.DeviceHandler
	QuestionnaireHandler *handlers.QuestionnaireHandler
	DailyAnalysisHandler *handlers.DailyAnalysisHandler
	WeeklySummaryHandler *handlers.WeeklySummaryHandler
	HeartbeatHandler     *handlers.HeartbeatHandler
	DriftHandler         *handlers.DriftHandler
	FeatureHandler       *handlers.FeatureHandler
}

// Middleware holds all HTTP middleware
type Middleware struct {
	AuthMiddleware *middleware.AuthMiddleware
}

// NewContainer creates a new dependency injection container
func NewContainer(cfg *config.Config, db *sql.DB) *Container {
	log.Println("🏗️ Creating dependency injection container...")

	// Create repository
	repo := database.NewRepository(db)
	log.Println("✅ Repository created")

	// Create services
	aiService := services.NewAIService(cfg.AI.ServiceURL)
	log.Println("✅ AI Service created")

	services := &Services{
		JWTService:     auth.NewJWTService(cfg.Auth.JWTSecretKey, cfg.Auth.JWTIssuer, cfg.Auth.JWTAudience, cfg.Auth.JWTAccessExpiry, cfg.Auth.JWTRefreshExpiry),
		SessionService: auth.NewSessionService(cfg.Auth.JWTRefreshExpiry),
		MobileService:  auth.NewMobileAuthService(cfg.Auth.ChallengeExpiry),
		AIService:      aiService,
		RoutineService: services.NewRoutineService(repo, aiService),
	}
	log.Println("✅ All services created")

	// Create WebAuthn service (handle error)
	webAuthnService, err := auth.NewWebAuthnService(cfg.Auth.WebAuthnRPID, cfg.Auth.WebAuthnRPName, cfg.Auth.WebAuthnRPOrigin)
	if err != nil {
		panic(err) // This should be handled in main.go
	}
	services.WebAuthnService = webAuthnService
	log.Println("✅ WebAuthn Service created")

	// Create handlers
	handlers := &Handlers{
		AuthHandler:          handlers.NewAuthHandler(repo, services.JWTService, services.WebAuthnService, services.SessionService, services.MobileService),
		HealthHandler:        handlers.NewHealthHandler(repo, services.AIService),
		LogHandler:           handlers.NewLogHandler(services.RoutineService),
		InsightHandler:       handlers.NewInsightHandler(services.RoutineService),
		DeviceHandler:        handlers.NewDeviceHandler(),
		QuestionnaireHandler: handlers.NewQuestionnaireHandler(repo),
		DailyAnalysisHandler: handlers.NewDailyAnalysisHandler(services.AIService),
		WeeklySummaryHandler: handlers.NewWeeklySummaryHandler(services.AIService),
		HeartbeatHandler:     handlers.NewHeartbeatHandler(services.AIService),
		DriftHandler:         handlers.NewDriftHandler(services.RoutineService, services.AIService),
		FeatureHandler:       handlers.NewFeatureHandler(&cfg.Features),
	}
	log.Println("✅ All handlers created")

	// Create middleware
	middleware := &Middleware{
		AuthMiddleware: middleware.NewAuthMiddleware(services.JWTService),
	}
	log.Println("✅ All middleware created")

	container := &Container{
		Config:     cfg,
		DB:         db,
		Repository: repo,
		Services:   services,
		Handlers:   handlers,
		Middleware: middleware,
	}

	log.Println("🎉 Container created successfully")
	return container
}

// Close closes all resources in the container
func (c *Container) Close() error {
	if err := c.Repository.Close(); err != nil {
		return err
	}
	return c.DB.Close()
}
