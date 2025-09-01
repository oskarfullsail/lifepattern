package routes

import (
	"lifepattern-api/internal/container"

	"github.com/gorilla/mux"
)

// SetupHealthRoutes configures health check routes
func SetupHealthRoutes(router *mux.Router, container *container.Container) {
	// Health check endpoint (public)
	router.HandleFunc("/health", container.Handlers.HealthHandler.HealthCheck).Methods("GET")
}
