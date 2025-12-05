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

// WeeklySummaryHandler handles weekly pattern analysis requests
type WeeklySummaryHandler struct {
	aiService *services.AIService
}

// NewWeeklySummaryHandler creates a new weekly summary handler
func NewWeeklySummaryHandler(aiService *services.AIService) *WeeklySummaryHandler {
	return &WeeklySummaryHandler{
		aiService: aiService,
	}
}

// WeeklySummaryRequest represents the request (endDate from query param)
type WeeklySummaryRequest struct {
	EndDate string `json:"endDate"` // YYYY-MM-DD format
}

// WeeklySummaryResponse represents the response to frontend (camelCase)
type WeeklySummaryResponse struct {
	WeekStart string                `json:"weekStart"`
	WeekEnd   string                `json:"weekEnd"`
	Summary   WeeklySummaryStats    `json:"summary"`
	Trends    []WeeklyTrendResponse `json:"trends"`
	Insights  []string              `json:"insights"`
	MicroGoals []WeeklyMicroGoalResponse `json:"microGoals"`
}

// WeeklySummaryStats represents summary statistics
type WeeklySummaryStats struct {
	AverageSleepHours        float64 `json:"averageSleepHours"`
	AverageSteps             float64 `json:"averageSteps"`
	AverageScreenTimeMinutes float64 `json:"averageScreenTimeMinutes"`
	AverageMood              float64 `json:"averageMood"`
	AverageStress            float64 `json:"averageStress"`
}

// WeeklyTrendResponse represents a trend in the response
type WeeklyTrendResponse struct {
	Metric    string `json:"metric"`
	Direction string `json:"direction"` // "improving" | "declining" | "stable"
	Comment   string `json:"comment"`
}

// WeeklyMicroGoalResponse represents a micro-goal in the response
type WeeklyMicroGoalResponse struct {
	Title          string `json:"title"`
	Reason         string `json:"reason"`
	SuggestedAction string `json:"suggestedAction"`
	TimeHorizon    string `json:"timeHorizon,omitempty"`
}

// GetWeekSummary handles GET /api/v1/routines/week-summary?endDate=YYYY-MM-DD
// This endpoint:
// 1. Authenticates the user (userID extracted from auth context)
// 2. Gets endDate from query parameter
// 3. Calls AI service to analyze the week
// 4. Transforms response to frontend-friendly format
func (h *WeeklySummaryHandler) GetWeekSummary(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
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

	// Get endDate from query parameter
	endDate := r.URL.Query().Get("endDate")
	if endDate == "" {
		// Default to today
		endDate = time.Now().Format("2006-01-02")
	}

	// Validate date format
	if _, err := time.Parse("2006-01-02", endDate); err != nil {
		http.Error(w, "Invalid date format. Use YYYY-MM-DD", http.StatusBadRequest)
		return
	}

	log.Printf("📊 Analyzing week ending %s for user %s", endDate, userID)

	// Call AI service with timeout
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	aiResponse, err := h.aiService.AnalyzeWeeklySummary(ctx, userID.String(), endDate)
	if err != nil {
		log.Printf("❌ AI service call failed: %v", err)
		http.Error(w, fmt.Sprintf("Failed to analyze weekly summary: %v", err), http.StatusInternalServerError)
		return
	}

	// Transform AI service response to frontend format
	response := WeeklySummaryResponse{
		WeekStart: aiResponse.WeekStart,
		WeekEnd:   aiResponse.WeekEnd,
		Summary: WeeklySummaryStats{
			AverageSleepHours:        aiResponse.Summary["average_sleep_hours"],
			AverageSteps:             aiResponse.Summary["average_steps"],
			AverageScreenTimeMinutes: aiResponse.Summary["average_screen_time_minutes"],
			AverageMood:              aiResponse.Summary["average_mood"],
			AverageStress:            aiResponse.Summary["average_stress_level"],
		},
		Trends: make([]WeeklyTrendResponse, len(aiResponse.Trends)),
		Insights: aiResponse.Insights,
		MicroGoals: make([]WeeklyMicroGoalResponse, len(aiResponse.MicroGoals)),
	}

	for i, trend := range aiResponse.Trends {
		response.Trends[i] = WeeklyTrendResponse{
			Metric:    trend.Metric,
			Direction: trend.Direction,
			Comment:   trend.Comment,
		}
	}

	for i, goal := range aiResponse.MicroGoals {
		response.MicroGoals[i] = WeeklyMicroGoalResponse{
			Title:           goal.Title,
			Reason:          goal.Reason,
			SuggestedAction: goal.SuggestedAction,
			TimeHorizon:     goal.TimeHorizon,
		}
	}

	// Return response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("❌ Failed to encode response: %v", err)
	}
}

