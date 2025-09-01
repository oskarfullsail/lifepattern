package routes

import (
	"lifepattern-api/internal/container"
	"log"

	"github.com/gorilla/mux"
)

// SetupProtectedRoutes configures protected routes that require authentication
func SetupProtectedRoutes(router *mux.Router, container *container.Container) {
	log.Println("🔒 Setting up protected routes...")

	// Protected endpoints
	protectedRouter := router.PathPrefix("/api").Subrouter()
	protectedRouter.Use(container.Middleware.AuthMiddleware.RequireAuth)
	log.Println("✅ Auth middleware applied to /api routes")

	// Routine log endpoints
	protectedRouter.HandleFunc("/log", container.Handlers.LogHandler.CreateRoutineLog).Methods("POST")
	protectedRouter.HandleFunc("/logs", container.Handlers.LogHandler.GetUserRoutineLogs).Methods("GET")
	log.Println("✅ Routine log routes registered")

	// Insight endpoints
	protectedRouter.HandleFunc("/insights", container.Handlers.InsightHandler.GetInsight).Methods("GET")
	protectedRouter.HandleFunc("/user-insights", container.Handlers.InsightHandler.GetUserInsights).Methods("GET")
	log.Println("✅ Insight routes registered")

	// Session management endpoints
	protectedRouter.HandleFunc("/auth/logout", container.Handlers.AuthHandler.Logout).Methods("POST")
	protectedRouter.HandleFunc("/auth/sessions", container.Handlers.AuthHandler.GetSessions).Methods("GET")
	log.Println("✅ Session management routes registered")

	// Cross-device linking endpoints (protected)
	protectedRouter.HandleFunc("/auth/link/generate", container.Handlers.AuthHandler.GenerateLinkToken).Methods("POST")
	protectedRouter.HandleFunc("/auth/link/status", container.Handlers.AuthHandler.GetLinkStatus).Methods("GET")
	log.Println("✅ Cross-device linking routes registered")

	// Device endpoints (protected)
	protectedRouter.HandleFunc("/device/info", container.Handlers.DeviceHandler.GetDeviceInfo).Methods("GET")
	protectedRouter.HandleFunc("/device/sync-watch", container.Handlers.DeviceHandler.SyncWatchData).Methods("POST")
	log.Println("✅ Device routes registered")

	log.Println("🎉 All protected routes configured successfully")
}
