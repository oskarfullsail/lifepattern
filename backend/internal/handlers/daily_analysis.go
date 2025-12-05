package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"lifepattern-api/internal/services"

	"github.com/google/uuid"
)

// DailyAnalysisHandler handles daily routine analysis requests
type DailyAnalysisHandler struct {
	aiService *services.AIService
}

// NewDailyAnalysisHandler creates a new daily analysis handler
func NewDailyAnalysisHandler(aiService *services.AIService) *DailyAnalysisHandler {
	return &DailyAnalysisHandler{
		aiService: aiService,
	}
}

// DailyAnalysisRequest represents the request body from frontend
// Note: user_id is derived from auth context, not from request body
type DailyAnalysisRequest struct {
	Date              string `json:"date"`
	SleepHours        float64 `json:"sleepHours"`
	Bedtime           string  `json:"bedtime"`
	WakeTime          string  `json:"wakeTime"`
	Steps             int     `json:"steps"`
	WorkoutMinutes    int     `json:"workoutMinutes"`
	ScreenTimeMinutes int     `json:"screenTimeMinutes"`
	Meals             struct {
		Breakfast bool `json:"breakfast"`
		Lunch     bool `json:"lunch"`
		Dinner    bool `json:"dinner"`
	} `json:"meals"`
	Mood        int `json:"mood"`
	StressLevel int `json:"stressLevel"`
	GoalContext struct {
		SleepTargetHours      float64 `json:"sleepTargetHours"`
		DailyStepTarget       int     `json:"dailyStepTarget"`
		MaxScreenTimeMinutes  int     `json:"maxScreenTimeMinutes"`
	} `json:"goalContext"`
	HistoryWindowDays int `json:"historyWindowDays,omitempty"`
}

// DailyAnalysisResponse represents the response to frontend (camelCase)
type DailyAnalysisResponse struct {
	Date         string `json:"date"`
	DailyScore   float64 `json:"dailyScore"`
	Anomalies    []AnomalyResponse `json:"anomalies"`
	Recommendations []RecommendationResponse `json:"recommendations"`
}

// AnomalyResponse represents an anomaly in the response
type AnomalyResponse struct {
	Code        string `json:"code"`
	Description string `json:"description"`
	Severity    string `json:"severity"`
}

// RecommendationResponse represents a recommendation in the response
type RecommendationResponse struct {
	Title          string `json:"title"`
	Reason         string `json:"reason"`
	SuggestedAction string `json:"suggestedAction"`
	TimeHorizon    string `json:"timeHorizon,omitempty"`
}


// AnalyzeDay handles POST /api/v1/routines/analyze-day
// This endpoint:
// 1. Authenticates the user (userID extracted from auth context/middleware)
// 2. Accepts daily routine data from frontend
// 3. Forwards request to AI service
// 4. Transforms response to frontend-friendly format
func (h *DailyAnalysisHandler) AnalyzeDay(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract userID from context (set by auth middleware)
	userIDValue := r.Context().Value("user_id")
	if userIDValue == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	userIDStr, ok := userIDValue.(string)
	if !ok {
		http.Error(w, "Invalid user ID type", http.StatusBadRequest)
		return
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		http.Error(w, "Invalid user ID format", http.StatusBadRequest)
		return
	}

	// Parse request body
	var req DailyAnalysisRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("❌ Failed to decode request: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if req.Date == "" {
		http.Error(w, "date is required", http.StatusBadRequest)
		return
	}

	// Set default history window if not provided
	if req.HistoryWindowDays == 0 {
		req.HistoryWindowDays = 14
	}

	log.Printf("📊 Analyzing day %s for user %s", req.Date, userID)

	// Call AI service with timeout
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	// Convert to AIService request format
	aiServiceReq := services.DailyAnalysisRequest{
		UserID:            userID.String(),
		Date:              req.Date,
		SleepHours:        req.SleepHours,
		Bedtime:           req.Bedtime,
		WakeTime:          req.WakeTime,
		Steps:             req.Steps,
		WorkoutMinutes:    req.WorkoutMinutes,
		ScreenTimeMinutes: req.ScreenTimeMinutes,
		Meals: struct {
			Breakfast bool
			Lunch     bool
			Dinner    bool
		}{
			Breakfast: req.Meals.Breakfast,
			Lunch:     req.Meals.Lunch,
			Dinner:    req.Meals.Dinner,
		},
		Mood:        req.Mood,
		StressLevel: req.StressLevel,
		GoalContext: struct {
			SleepTargetHours     float64
			DailyStepTarget      int
			MaxScreenTimeMinutes int
		}{
			SleepTargetHours:     req.GoalContext.SleepTargetHours,
			DailyStepTarget:      req.GoalContext.DailyStepTarget,
			MaxScreenTimeMinutes: req.GoalContext.MaxScreenTimeMinutes,
		},
		HistoryWindowDays: req.HistoryWindowDays,
	}

	aiResponse, err := h.aiService.AnalyzeDailyRoutine(ctx, aiServiceReq)
	if err != nil {
		log.Printf("❌ AI service call failed: %v", err)
		http.Error(w, fmt.Sprintf("Failed to analyze routine: %v", err), http.StatusInternalServerError)
		return
	}

	// Transform AI service response to frontend format
	response := DailyAnalysisResponse{
		Date:       aiResponse.Date,
		DailyScore: aiResponse.DailyScore,
		Anomalies:  make([]AnomalyResponse, len(aiResponse.Anomalies)),
		Recommendations: make([]RecommendationResponse, len(aiResponse.Recommendations)),
	}

	for i, anomaly := range aiResponse.Anomalies {
		response.Anomalies[i] = AnomalyResponse{
			Code:        anomaly.Code,
			Description: anomaly.Description,
			Severity:    anomaly.Severity,
		}
	}

	for i, rec := range aiResponse.Recommendations {
		response.Recommendations[i] = RecommendationResponse{
			Title:           rec.Title,
			Reason:          rec.Reason,
			SuggestedAction: rec.SuggestedAction,
			TimeHorizon:     rec.TimeHorizon,
		}
	}

	// Return response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("❌ Failed to encode response: %v", err)
	}
}

