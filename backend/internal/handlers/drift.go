package handlers

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"lifepattern-api/internal/services"

	"github.com/google/uuid"
)

// DriftHandler handles drift analysis requests
type DriftHandler struct {
	routineService services.RoutineServiceInterface
	aiService      *services.AIService
}

// NewDriftHandler creates a new drift handler
func NewDriftHandler(routineService services.RoutineServiceInterface, aiService *services.AIService) *DriftHandler {
	return &DriftHandler{
		routineService: routineService,
		aiService:      aiService,
	}
}

// GetDriftAnalysis handles GET /api/ai/drift requests
// Query params: user_id (required), window_days (optional, default 30)
func (h *DriftHandler) GetDriftAnalysis(w http.ResponseWriter, r *http.Request) {
	log.Printf("🔍 Drift analysis request received")

	// Get user_id from query parameter
	userIDStr := r.URL.Query().Get("user_id")
	if userIDStr == "" {
		log.Printf("❌ Missing user_id parameter")
		http.Error(w, `{"error": "user_id parameter required"}`, http.StatusBadRequest)
		return
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		log.Printf("❌ Invalid user_id: %v", err)
		http.Error(w, `{"error": "Invalid user_id format"}`, http.StatusBadRequest)
		return
	}

	log.Printf("📊 Fetching historical logs for user %s", userID)

	// Fetch user's historical routine logs (last 60 days for good baseline)
	logs, err := h.routineService.GetUserLogs(userID, 60)
	if err != nil {
		log.Printf("❌ Failed to fetch user logs: %v", err)
		http.Error(w, `{"error": "Failed to fetch user data"}`, http.StatusInternalServerError)
		return
	}

	log.Printf("📊 Found %d historical logs for user %s", len(logs), userID)

	// Check minimum data requirement
	if len(logs) < 7 {
		response := map[string]interface{}{
			"user_id":        userIDStr,
			"drift_detected": false,
			"drift_score":    0.0,
			"severity":       "none",
			"drift_type":     "insufficient_data",
			"top_features":   []interface{}{},
			"recommendation": "Need at least 7 days of data to analyze behavioral patterns. Keep logging your daily routines!",
			"data_points":    len(logs),
			"timestamp":      time.Now().Format(time.RFC3339),
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	// Create context with timeout for AI service call
	ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
	defer cancel()

	// Call AI service for drift analysis
	log.Printf("🤖 Calling AI service for drift analysis...")
	driftResponse, err := h.aiService.AnalyzeDrift(ctx, userIDStr, logs)
	if err != nil {
		log.Printf("❌ AI service drift analysis failed: %v", err)
		
		// Return graceful fallback response
		response := map[string]interface{}{
			"user_id":        userIDStr,
			"drift_detected": false,
			"drift_score":    0.0,
			"severity":       "unknown",
			"drift_type":     "analysis_error",
			"top_features":   []interface{}{},
			"recommendation": "Unable to analyze drift patterns at this time. Please try again later.",
			"error":          err.Error(),
			"data_points":    len(logs),
			"timestamp":      time.Now().Format(time.RFC3339),
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusServiceUnavailable)
		json.NewEncoder(w).Encode(response)
		return
	}

	log.Printf("✅ Drift analysis completed: detected=%v, severity=%s", 
		driftResponse.DriftDetected, driftResponse.Severity)

	// Return successful response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(driftResponse)
}

