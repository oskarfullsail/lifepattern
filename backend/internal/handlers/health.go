package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"lifepattern-api/internal/services"
)

type HealthHandler struct {
	repo      services.RepositoryInterface
	aiService services.AIServiceInterface
}

func NewHealthHandler(repo services.RepositoryInterface, aiService services.AIServiceInterface) *HealthHandler {
	return &HealthHandler{
		repo:      repo,
		aiService: aiService,
	}
}

// HealthCheck handles GET /health requests
func (h *HealthHandler) HealthCheck(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Check database connection
	dbStatus := "healthy"
	if err := h.repo.Ping(); err != nil {
		dbStatus = "unhealthy"
	}

	// Check AI service
	aiStatus := "healthy"
	if err := h.aiService.CheckHealth(); err != nil {
		aiStatus = "unhealthy"
	}

	// Determine overall status
	overallStatus := "healthy"
	if dbStatus == "unhealthy" || aiStatus == "unhealthy" {
		overallStatus = "unhealthy"
	}

	response := map[string]interface{}{
		"status":     overallStatus,
		"database":   dbStatus,
		"ai_service": aiStatus,
		"timestamp":  time.Now().Format(time.RFC3339),
	}

	w.Header().Set("Content-Type", "application/json")

	// Set appropriate status code
	if overallStatus == "healthy" {
		w.WriteHeader(http.StatusOK)
	} else {
		w.WriteHeader(http.StatusServiceUnavailable)
	}

	json.NewEncoder(w).Encode(response)
}
