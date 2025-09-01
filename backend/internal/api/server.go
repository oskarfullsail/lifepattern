package api

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"time"

	"lifepattern-api/internal/api/routes"
	"lifepattern-api/internal/container"
	"lifepattern-api/internal/middleware"

	"github.com/gorilla/mux"
)

// Server represents the HTTP server
type Server struct {
	router    *mux.Router
	server    *http.Server
	container *container.Container
}

// NewServer creates a new HTTP server instance
func NewServer(container *container.Container) *Server {
	router := mux.NewRouter()

	// Apply global middleware
	router.Use(middleware.CORS)
	router.Use(middleware.RequestLogger)
	router.Use(middleware.Recovery)

	server := &Server{
		router:    router,
		container: container,
		server: &http.Server{
			Addr:         fmt.Sprintf("%s:%s", container.Config.Server.Host, container.Config.Server.Port),
			Handler:      router,
			ReadTimeout:  15 * time.Second,
			WriteTimeout: 15 * time.Second,
			IdleTimeout:  60 * time.Second,
		},
	}

	// Setup routes
	server.setupRoutes()

	return server
}

// setupRoutes configures all application routes
func (s *Server) setupRoutes() {
	log.Println("🔧 Setting up application routes...")

	// Setup route groups
	log.Println("🏥 Setting up health routes...")
	routes.SetupHealthRoutes(s.router, s.container)

	log.Println("🔐 Setting up auth routes...")
	routes.SetupAuthRoutes(s.router, s.container)

	log.Println("🔒 Setting up protected routes...")
	routes.SetupProtectedRoutes(s.router, s.container)

	log.Println("✅ All routes configured successfully")
}

// Start starts the HTTP server
func (s *Server) Start() error {
	log.Printf("🚀 Starting server on %s", s.server.Addr)
	return s.server.ListenAndServe()
}

// Shutdown gracefully shuts down the server
func (s *Server) Shutdown(ctx context.Context) error {
	log.Println("🛑 Shutting down server...")
	return s.server.Shutdown(ctx)
}

// GetRouter returns the router for testing purposes
func (s *Server) GetRouter() *mux.Router {
	return s.router
}
