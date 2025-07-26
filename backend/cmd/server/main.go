package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"

	"lifepattern-api/internal/config"
	"lifepattern-api/internal/database"
	"lifepattern-api/internal/handlers"
	"lifepattern-api/internal/middleware"
	"lifepattern-api/internal/services"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: .env file not found, using default values")
	}

	// Load configuration
	cfg := config.Load()

	// Initialize database repository
	repo, err := database.NewRepository(cfg.Database.URL)
	if err != nil {
		log.Fatal("Failed to initialize database:", err)
	}
	defer repo.Close()

	// Initialize AI service
	aiService := services.NewAIService(cfg.AIService.URL)

	// Initialize business services
	routineService := services.NewRoutineService(repo, aiService)

	// Initialize handlers
	logHandler := handlers.NewLogHandler(routineService)
	insightHandler := handlers.NewInsightHandler(routineService)
	healthHandler := handlers.NewHealthHandler(repo, aiService)

	// Create router
	r := mux.NewRouter()

	// Apply CORS middleware
	r.Use(middleware.CORS)

	// Define routes
	r.HandleFunc("/health", healthHandler.HealthCheck).Methods("GET")
	r.HandleFunc("/log", logHandler.CreateRoutineLog).Methods("POST")
	r.HandleFunc("/logs", logHandler.GetUserRoutineLogs).Methods("GET")
	r.HandleFunc("/insights", insightHandler.GetInsight).Methods("GET")
	r.HandleFunc("/user-insights", insightHandler.GetUserInsights).Methods("GET")

	// Start server
	serverAddr := fmt.Sprintf("%s:%s", cfg.Server.Host, cfg.Server.Port)
	fmt.Printf("🚀 LifePattern Backend Server Starting...\n")
	fmt.Printf("📍 Server Address: http://%s\n", serverAddr)
	fmt.Printf("🤖 AI Service URL: %s\n", cfg.AIService.URL)
	fmt.Printf("🗄️  Database URL: %s\n", cfg.Database.URL)
	fmt.Printf("🌐 CORS Enabled: All origins allowed\n")
	fmt.Printf("📊 API Endpoints:\n")
	fmt.Printf("   GET  /health         - Service health check\n")
	fmt.Printf("   POST /log            - Create routine log with AI analysis\n")
	fmt.Printf("   GET  /logs           - Get user routine logs\n")
	fmt.Printf("   GET  /insights       - Get specific insight\n")
	fmt.Printf("   GET  /user-insights  - Get all insights for user\n")
	fmt.Printf("✅ Server ready to handle requests!\n")
	fmt.Printf("🔄 Communication Flow: Frontend ↔ Backend ↔ AI Service ↔ Database\n")

	log.Fatal(http.ListenAndServe(serverAddr, r))
}
