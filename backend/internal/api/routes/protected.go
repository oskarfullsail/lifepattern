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
	protectedRouter.HandleFunc("/log", container.Handlers.LogHandler.CreateRoutineLog).Methods("POST", "OPTIONS")
	protectedRouter.HandleFunc("/logs", container.Handlers.LogHandler.GetUserRoutineLogs).Methods("GET", "OPTIONS")
	
	// Daily analysis endpoint (v1 API)
	v1Router := protectedRouter.PathPrefix("/v1/routines").Subrouter()
	v1Router.HandleFunc("/analyze-day", container.Handlers.DailyAnalysisHandler.AnalyzeDay).Methods("POST", "OPTIONS")
	v1Router.HandleFunc("/week-summary", container.Handlers.WeeklySummaryHandler.GetWeekSummary).Methods("GET", "OPTIONS")
	log.Println("✅ Routine log routes registered")
	
	// AI heartbeat endpoint (v1 API) - can be public or protected
	aiRouter := protectedRouter.PathPrefix("/v1/ai").Subrouter()
	aiRouter.HandleFunc("/heartbeat", container.Handlers.HeartbeatHandler.GetHeartbeat).Methods("GET", "OPTIONS")
	log.Println("✅ AI routes registered")

	// Drift detection endpoint
	protectedRouter.HandleFunc("/ai/drift", container.Handlers.DriftHandler.GetDriftAnalysis).Methods("GET", "OPTIONS")
	log.Println("✅ Drift detection route registered")

	// Insight endpoints
	protectedRouter.HandleFunc("/insights", container.Handlers.InsightHandler.GetInsight).Methods("GET", "OPTIONS")
	protectedRouter.HandleFunc("/user-insights", container.Handlers.InsightHandler.GetUserInsights).Methods("GET", "OPTIONS")
	log.Println("✅ Insight routes registered")

	// Session management endpoints
	protectedRouter.HandleFunc("/auth/logout", container.Handlers.AuthHandler.Logout).Methods("POST", "OPTIONS")
	protectedRouter.HandleFunc("/auth/sessions", container.Handlers.AuthHandler.GetSessions).Methods("GET", "OPTIONS")
	log.Println("✅ Session management routes registered")

	// Cross-device linking endpoints (protected)
	protectedRouter.HandleFunc("/auth/link/generate", container.Handlers.AuthHandler.GenerateLinkToken).Methods("POST", "OPTIONS")
	protectedRouter.HandleFunc("/auth/link/status", container.Handlers.AuthHandler.GetLinkStatus).Methods("GET", "OPTIONS")
	log.Println("✅ Cross-device linking routes registered")

	// Device endpoints (protected)
	protectedRouter.HandleFunc("/device/info", container.Handlers.DeviceHandler.GetDeviceInfo).Methods("GET", "OPTIONS")
	protectedRouter.HandleFunc("/device/sync-watch", container.Handlers.DeviceHandler.SyncWatchData).Methods("POST", "OPTIONS")
	log.Println("✅ Device routes registered")

	// Questionnaire endpoints (protected)
	protectedRouter.HandleFunc("/screening", container.Handlers.QuestionnaireHandler.SubmitScreening).Methods("POST", "OPTIONS")
	protectedRouter.HandleFunc("/screening", container.Handlers.QuestionnaireHandler.GetScreening).Methods("GET", "OPTIONS")
	protectedRouter.HandleFunc("/usability-survey", container.Handlers.QuestionnaireHandler.SubmitUsabilitySurvey).Methods("POST", "OPTIONS")
	protectedRouter.HandleFunc("/usability-surveys", container.Handlers.QuestionnaireHandler.GetUsabilitySurveys).Methods("GET", "OPTIONS")
	log.Println("✅ Questionnaire routes registered")

	// Admin endpoints for questionnaires (protected - should add admin check in future)
	protectedRouter.HandleFunc("/admin/screenings", container.Handlers.QuestionnaireHandler.GetAllScreenings).Methods("GET", "OPTIONS")
	protectedRouter.HandleFunc("/admin/usability-surveys", container.Handlers.QuestionnaireHandler.GetAllUsabilitySurveys).Methods("GET", "OPTIONS")
	protectedRouter.HandleFunc("/admin/screenings/export", container.Handlers.QuestionnaireHandler.ExportScreeningsCSV).Methods("GET", "OPTIONS")
	protectedRouter.HandleFunc("/admin/usability-surveys/export", container.Handlers.QuestionnaireHandler.ExportUsabilitySurveysCSV).Methods("GET", "OPTIONS")
	protectedRouter.HandleFunc("/admin/questionnaire-stats", container.Handlers.QuestionnaireHandler.GetQuestionnaireStats).Methods("GET", "OPTIONS")
	log.Println("✅ Admin questionnaire routes registered")

	// Admin endpoints for routine logs export (for thesis data analysis)
	protectedRouter.HandleFunc("/admin/routine-logs", container.Handlers.AdminLogsHandler.GetAllRoutineLogs).Methods("GET", "OPTIONS")
	protectedRouter.HandleFunc("/admin/routine-logs/export", container.Handlers.AdminLogsHandler.ExportRoutineLogsCSV).Methods("GET", "OPTIONS")
	protectedRouter.HandleFunc("/admin/routine-logs/stats", container.Handlers.AdminLogsHandler.GetRoutineLogsStats).Methods("GET", "OPTIONS")
	log.Println("✅ Admin routine logs routes registered")

	log.Println("🎉 All protected routes configured successfully")
}
