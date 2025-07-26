package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"lifepattern-api/internal/services"
)

type InsightHandler struct {
	routineService services.RoutineServiceInterface
}

func NewInsightHandler(routineService services.RoutineServiceInterface) *InsightHandler {
	return &InsightHandler{
		routineService: routineService,
	}
}

// GetInsight handles GET /insights requests
func (h *InsightHandler) GetInsight(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get log ID from query parameter
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
		http.Error(w, fmt.Sprintf("Error retrieving insight: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(insight)
}

// GetUserInsights handles GET /user-insights requests
func (h *InsightHandler) GetUserInsights(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get user ID from query parameter
	userIDStr := r.URL.Query().Get("user_id")
	if userIDStr == "" {
		http.Error(w, "user_id parameter required", http.StatusBadRequest)
		return
	}

	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		http.Error(w, "Invalid user_id", http.StatusBadRequest)
		return
	}

	// Get limit from query parameter (default 10)
	limitStr := r.URL.Query().Get("limit")
	limit := 10
	if limitStr != "" {
		if limit, err = strconv.Atoi(limitStr); err != nil {
			http.Error(w, "Invalid limit", http.StatusBadRequest)
			return
		}
	}

	// Get user insights
	insights, err := h.routineService.GetUserInsights(userID, limit)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error retrieving user insights: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"user_id":  userID,
		"insights": insights,
		"count":    len(insights),
	})
}
