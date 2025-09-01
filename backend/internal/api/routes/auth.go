package routes

import (
	"lifepattern-api/internal/container"
	"lifepattern-api/internal/middleware"

	"github.com/gorilla/mux"
)

// SetupAuthRoutes configures authentication routes
func SetupAuthRoutes(router *mux.Router, container *container.Container) {
	// Authentication endpoints (public)
	authRouter := router.PathPrefix("/auth").Subrouter()
	authRouter.Use(middleware.CORS) // Apply CORS to auth subrouter
	
	// Registration and login
	authRouter.HandleFunc("/register", container.Handlers.AuthHandler.Register).Methods("POST", "OPTIONS")
	authRouter.HandleFunc("/login", container.Handlers.AuthHandler.Login).Methods("POST", "OPTIONS")
	authRouter.HandleFunc("/refresh", container.Handlers.AuthHandler.RefreshToken).Methods("POST", "OPTIONS")
	authRouter.HandleFunc("/recovery", container.Handlers.AuthHandler.PasswordRecovery).Methods("POST", "OPTIONS")

	// WebAuthn endpoints
	authRouter.HandleFunc("/webauthn/register/start", container.Handlers.AuthHandler.WebAuthnRegistrationStart).Methods("POST", "OPTIONS")
	authRouter.HandleFunc("/webauthn/register/finish", container.Handlers.AuthHandler.WebAuthnRegistrationFinish).Methods("POST", "OPTIONS")
	authRouter.HandleFunc("/webauthn/login/start", container.Handlers.AuthHandler.WebAuthnLoginStart).Methods("POST", "OPTIONS")
	authRouter.HandleFunc("/webauthn/login/finish", container.Handlers.AuthHandler.WebAuthnLoginFinish).Methods("POST", "OPTIONS")

	// Mobile authentication
	authRouter.HandleFunc("/mobile/challenge", container.Handlers.AuthHandler.MobileChallenge).Methods("POST", "OPTIONS")
	authRouter.HandleFunc("/mobile/verify", container.Handlers.AuthHandler.MobileVerify).Methods("POST", "OPTIONS")

	// Cross-device linking (public)
	authRouter.HandleFunc("/link/verify", container.Handlers.AuthHandler.VerifyLinkToken).Methods("POST")
}
