package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"lifepattern-api/internal/services"

	"github.com/google/uuid"
)

// InsightHandler handles insight-related requests
type InsightHandler struct {
	routineService services.RoutineServiceInterface
}

// NewInsightHandler creates a new insight handler
func NewInsightHandler(routineService services.RoutineServiceInterface) *InsightHandler {
	return &InsightHandler{
		routineService: routineService,
	}
}

// GetInsight handles GET /insights/{id} requests
func (h *InsightHandler) GetInsight(w http.ResponseWriter, r *http.Request) {
	// Extract log ID from URL path
	logIDStr := r.URL.Query().Get("log_id")
	if logIDStr == "" {
		http.Error(w, "log_id parameter required", http.StatusBadRequest)
		return
	}

	logID, err := strconv.Atoi(logIDStr)
	if err != nil {
		http.Error(w, "Invalid log_id", http.StatusBadRequest)
		return
	}

	// Get insight
	insight, err := h.routineService.GetInsight(logID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get insight: %v", err), http.StatusInternalServerError)
		return
	}

	// Return insight
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(insight)
}

// GetUserInsights handles GET /user-insights requests
func (h *InsightHandler) GetUserInsights(w http.ResponseWriter, r *http.Request) {
	// Get user_id from query parameter
	userIDStr := r.URL.Query().Get("user_id")
	if userIDStr == "" {
		http.Error(w, "user_id parameter required", http.StatusBadRequest)
		return
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		http.Error(w, "Invalid user_id", http.StatusBadRequest)
		return
	}

	// Get limit from query parameter (default 10)
	limitStr := r.URL.Query().Get("limit")
	limit := 10
	if limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err != nil {
			http.Error(w, "Invalid limit", http.StatusBadRequest)
			return
		} else {
			limit = parsedLimit
		}
	}

	// Get user insights
	insights, err := h.routineService.GetUserInsights(userID, limit)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get user insights: %v", err), http.StatusInternalServerError)
		return
	}

	// Get total count of insights for this user
	totalCount, err := h.routineService.GetUserInsightsCount(userID)
	if err != nil {
		// If we can't get the count, just use the length of insights
		totalCount = len(insights)
	}

	// Return insights in the format expected by frontend
	response := map[string]interface{}{
		"user_id":     userID.String(),
		"insights":    insights,
		"count":       totalCount,
		"total_count": totalCount,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
