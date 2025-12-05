package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"strconv"
	"time"

	"lifepattern-api/internal/database"
)

type AIService struct {
	baseURL    string
	httpClient *http.Client
}

type AIServiceRequest struct {
	SleepHours       float64  `json:"sleep_hours"`
	MealTimes        []string `json:"meal_times"`
	ScreenTime       float64  `json:"screen_time"`
	ExerciseDuration float64  `json:"exercise_duration"`
	WakeUpTime       string   `json:"wake_up_time"`
	BedTime          string   `json:"bed_time"`
	WaterIntake      float64  `json:"water_intake"`
	StressLevel      int      `json:"stress_level"`
}

type AIServiceResponse struct {
	IsAnomaly               bool                     `json:"is_anomaly"`
	ConfidenceScore         float64                  `json:"confidence_score"`
	AnomalyType             string                   `json:"anomaly_type"`
	Recommendations         []string                 `json:"recommendations"`
	EnhancedRecommendations []EnhancedRecommendation `json:"enhanced_recommendations,omitempty"`
	BehavioralContexts      []string                 `json:"behavioral_contexts,omitempty"`
	Timestamp               string                   `json:"timestamp"`
	DriftAnalysis           map[string]interface{}   `json:"drift_analysis,omitempty"`
	BaselineComparison      map[string]interface{}   `json:"baseline_comparison,omitempty"`
}

// EnhancedRecommendation represents a rich recommendation with context and metadata
type EnhancedRecommendation struct {
	Type            string `json:"type"`
	Title           string `json:"title"`
	Description     string `json:"description"`
	ActionURL       string `json:"action_url,omitempty"`
	Priority        int    `json:"priority,omitempty"`
	Context         string `json:"context,omitempty"`
	EstimatedImpact string `json:"estimated_impact,omitempty"`
	TimeSensitive   bool   `json:"time_sensitive,omitempty"`
}

func NewAIService(baseURL string) *AIService {
	return &AIService{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 45 * time.Second, // Increased for rate limit retries
		},
	}
}

// makeRequestWithRetry makes an HTTP request with retry logic for rate limits (429)
func (s *AIService) makeRequestWithRetry(url string, requestJSON []byte, maxRetries int) (*http.Response, []byte, error) {
	var resp *http.Response
	var body []byte
	var err error

	for attempt := 0; attempt <= maxRetries; attempt++ {
		if attempt > 0 {
			// Exponential backoff: 2s, 4s, 8s
			waitTime := time.Duration(2<<uint(attempt-1)) * time.Second
			log.Printf("⏳ Rate limited (429), retrying in %v... (attempt %d/%d)", waitTime, attempt+1, maxRetries+1)
			time.Sleep(waitTime)
		}

		resp, err = s.httpClient.Post(url, "application/json", bytes.NewBuffer(requestJSON))
		if err != nil {
			// Network error, don't retry
			return nil, nil, err
		}

		body, err = io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			return nil, nil, err
		}

		// If not rate limited, return immediately
		if resp.StatusCode != http.StatusTooManyRequests {
			return resp, body, nil
		}

		// Log rate limit
		log.Printf("⚠️ AI service rate limited (429) on attempt %d", attempt+1)
	}

	// All retries exhausted
	return resp, body, fmt.Errorf("max retries (%d) exceeded, still rate limited", maxRetries)
}

// ensureAIServiceAwake pings the health endpoint to wake up the service if sleeping
func (s *AIService) ensureAIServiceAwake() error {
	log.Printf("🔔 Pinging AI service to ensure it's awake...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "GET", s.baseURL+"/health", nil)
	if err != nil {
		return err
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		log.Printf("⚠️ AI service wake-up ping failed: %v", err)
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		log.Printf("✅ AI service is awake and ready")
		// Give it a moment to fully initialize
		time.Sleep(500 * time.Millisecond)
		return nil
	}

	return fmt.Errorf("AI service health check returned status %d", resp.StatusCode)
}

// AnalyzeRoutine sends routine data to AI service and returns analysis
// This method handles the communication between Backend and AI Service
func (s *AIService) AnalyzeRoutine(routineLog database.RoutineLog) (*AIServiceResponse, error) {
	// Wake up AI service if sleeping
	if err := s.ensureAIServiceAwake(); err != nil {
		log.Printf("⚠️ Failed to wake AI service: %v", err)
		// Continue anyway, might still work
	}

	log.Printf("🤖 Sending routine data to AI service at %s/predict", s.baseURL)

	request := AIServiceRequest{
		SleepHours:       routineLog.SleepHours,
		MealTimes:        routineLog.MealTimes,
		ScreenTime:       routineLog.ScreenTime,
		ExerciseDuration: routineLog.ExerciseDuration,
		WakeUpTime:       routineLog.WakeUpTime,
		BedTime:          routineLog.BedTime,
		WaterIntake:      routineLog.WaterIntake,
		StressLevel:      routineLog.StressLevel,
	}

	requestJSON, err := json.Marshal(request)
	if err != nil {
		log.Printf("❌ Failed to marshal AI service request: %v", err)
		return nil, fmt.Errorf("failed to marshal AI service request: %w", err)
	}

	log.Printf("📤 Sending request to AI service: %s", string(requestJSON))

	// Use retry logic for rate limits
	resp, body, err := s.makeRequestWithRetry(s.baseURL+"/predict", requestJSON, 3)
	if err != nil {
		log.Printf("❌ Failed to call AI service after retries: %v", err)
		return nil, fmt.Errorf("failed to call AI service: %w", err)
	}

	log.Printf("📥 Received response from AI service (status: %d): %s", resp.StatusCode, string(body))

	if resp.StatusCode != http.StatusOK {
		log.Printf("❌ AI service returned error status %d: %s", resp.StatusCode, string(body))
		return nil, fmt.Errorf("AI service error (status %d): %s", resp.StatusCode, string(body))
	}

	var aiResponse AIServiceResponse
	if err := json.Unmarshal(body, &aiResponse); err != nil {
		log.Printf("❌ Failed to unmarshal AI service response: %v", err)
		return nil, fmt.Errorf("failed to unmarshal AI service response: %w", err)
	}

	log.Printf("✅ Successfully processed AI service response - Anomaly: %v, Type: %s",
		aiResponse.IsAnomaly, aiResponse.AnomalyType)

	return &aiResponse, nil
}

// AnalyzeRoutineWithHistory sends routine data with historical context to AI service
// This method provides enhanced drift detection with user baseline analysis
func (s *AIService) AnalyzeRoutineWithHistory(routineLog database.RoutineLog, historicalData []database.RoutineLog) (*AIServiceResponse, error) {
	// Wake up AI service if sleeping
	if err := s.ensureAIServiceAwake(); err != nil {
		log.Printf("⚠️ Failed to wake AI service: %v", err)
		// Continue anyway, might still work
	}

	log.Printf("🤖 Sending routine data with historical context to AI service at %s/predict", s.baseURL)

	// Convert historical data to format expected by AI service
	historicalPayload := make([]map[string]interface{}, len(historicalData))
	for i, log := range historicalData {
		historicalPayload[i] = map[string]interface{}{
			"sleep_hours":       log.SleepHours,
			"screen_time":       log.ScreenTime,
			"exercise_duration": log.ExerciseDuration,
			"water_intake":      log.WaterIntake,
			"stress_level":      log.StressLevel,
			"wake_up_hour":      extractHourFromTime(log.WakeUpTime),
			"bed_time_hour":     extractHourFromTime(log.BedTime),
			"meal_count":        len(log.MealTimes),
			"health_score":      calculateHealthScore(log), // You'll need to implement this
		}
	}

	// For now, use simple format (AI service doesn't support historical data format yet)
	// TODO: Update when AI service supports enhanced endpoint
	request := AIServiceRequest{
		SleepHours:       routineLog.SleepHours,
		MealTimes:        routineLog.MealTimes,
		ScreenTime:       routineLog.ScreenTime,
		ExerciseDuration: routineLog.ExerciseDuration,
		WakeUpTime:       routineLog.WakeUpTime,
		BedTime:          routineLog.BedTime,
		WaterIntake:      routineLog.WaterIntake,
		StressLevel:      routineLog.StressLevel,
	}

	// Enhanced request with historical context (for future use)
	// enhancedRequest := map[string]interface{}{
	// 	"current_data": request,
	// 	"historical_data": historicalPayload,
	// 	"user_id":         routineLog.UserID,
	// }

	requestJSON, err := json.Marshal(request)
	if err != nil {
		log.Printf("❌ Failed to marshal AI service request: %v", err)
		return nil, fmt.Errorf("failed to marshal AI service request: %w", err)
	}

	log.Printf("📤 Sending request to AI service (with %d historical records for context): %s", len(historicalData), string(requestJSON))

	// Use retry logic for rate limits
	resp, body, err := s.makeRequestWithRetry(s.baseURL+"/predict", requestJSON, 3)
	if err != nil {
		log.Printf("❌ Failed to call AI service after retries: %v", err)
		return nil, fmt.Errorf("failed to call AI service: %w", err)
	}

	log.Printf("📥 Received response from AI service (status: %d): %s", resp.StatusCode, string(body))

	if resp.StatusCode != http.StatusOK {
		log.Printf("❌ AI service returned error status %d: %s", resp.StatusCode, string(body))
		return nil, fmt.Errorf("AI service error (status %d): %s", resp.StatusCode, string(body))
	}

	var aiResponse AIServiceResponse
	if err := json.Unmarshal(body, &aiResponse); err != nil {
		log.Printf("❌ Failed to unmarshal AI service response: %v", err)
		return nil, fmt.Errorf("failed to unmarshal AI service response: %w", err)
	}

	log.Printf("✅ Successfully processed AI service response - Anomaly: %v, Type: %s, Recommendations: %d",
		aiResponse.IsAnomaly, aiResponse.AnomalyType, len(aiResponse.Recommendations))

	return &aiResponse, nil
}

// Helper functions
func extractHourFromTime(timeStr string) int {
	if len(timeStr) >= 2 {
		if hour, err := strconv.Atoi(timeStr[:2]); err == nil {
			return hour
		}
	}
	return 0
}

func calculateHealthScore(log database.RoutineLog) float64 {
	// Simple health score calculation (can be enhanced)
	sleepScore := math.Min(log.SleepHours/8.0, 1.0) * 0.3
	screenScore := math.Max(0, 1.0-log.ScreenTime/12.0) * 0.2
	exerciseScore := math.Min(log.ExerciseDuration/1.0, 1.0) * 0.2
	waterScore := math.Min(log.WaterIntake/2.5, 1.0) * 0.1
	stressScore := math.Max(0, 1.0-float64(log.StressLevel)/10.0) * 0.1
	mealScore := math.Min(float64(len(log.MealTimes))/3.0, 1.0) * 0.1

	return sleepScore + screenScore + exerciseScore + waterScore + stressScore + mealScore
}

// CheckHealth checks if the AI service is healthy
// This is a non-blocking health check that won't affect startup
func (s *AIService) CheckHealth() error {
	log.Printf("🏥 Checking AI service health at %s/health", s.baseURL)

	// Create a context with a shorter timeout for health checks
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "GET", s.baseURL+"/health", nil)
	if err != nil {
		log.Printf("❌ AI service health check failed to create request: %v", err)
		return fmt.Errorf("failed to create health check request: %w", err)
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		log.Printf("❌ AI service health check failed: %v", err)
		return fmt.Errorf("failed to check AI service health: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("❌ AI service health check failed with status %d", resp.StatusCode)
		return fmt.Errorf("AI service health check failed with status %d", resp.StatusCode)
	}

	log.Printf("✅ AI service is healthy")
	return nil
}

// AnalyzeDailyRoutine calls the AI service's /analyze/day endpoint
// This method handles the new daily analysis feature
// Note: ctx parameter is for future use with context.WithTimeout
func (s *AIService) AnalyzeDailyRoutine(ctx context.Context, req DailyAnalysisRequest) (*DailyAnalysisResponse, error) {
	// Wake up AI service if sleeping
	if err := s.ensureAIServiceAwake(); err != nil {
		log.Printf("⚠️ Failed to wake AI service: %v", err)
		// Continue anyway, might still work
	}

	log.Printf("🤖 Sending daily analysis request to AI service at %s/analyze/day", s.baseURL)

	// Convert to AI service request format
	aiRequest := map[string]interface{}{
		"user_id":             req.UserID,
		"date":                req.Date,
		"sleep_hours":         req.SleepHours,
		"bedtime":             req.Bedtime,
		"wake_time":           req.WakeTime,
		"steps":               req.Steps,
		"workout_minutes":     req.WorkoutMinutes,
		"screen_time_minutes": req.ScreenTimeMinutes,
		"meals": map[string]bool{
			"breakfast": req.Meals.Breakfast,
			"lunch":     req.Meals.Lunch,
			"dinner":    req.Meals.Dinner,
		},
		"mood":         req.Mood,
		"stress_level": req.StressLevel,
		"goal_context": map[string]interface{}{
			"sleep_target_hours":      req.GoalContext.SleepTargetHours,
			"daily_step_target":       req.GoalContext.DailyStepTarget,
			"max_screen_time_minutes": req.GoalContext.MaxScreenTimeMinutes,
		},
		"history_window_days": req.HistoryWindowDays,
	}

	requestJSON, err := json.Marshal(aiRequest)
	if err != nil {
		log.Printf("❌ Failed to marshal daily analysis request: %v", err)
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	log.Printf("📤 Sending daily analysis request: %s", string(requestJSON))

	// Use retry logic for rate limits
	resp, body, err := s.makeRequestWithRetry(s.baseURL+"/analyze/day", requestJSON, 3)
	if err != nil {
		log.Printf("❌ Failed to call AI service after retries: %v", err)
		return nil, fmt.Errorf("failed to call AI service: %w", err)
	}

	log.Printf("📥 Received daily analysis response (status: %d): %s", resp.StatusCode, string(body))

	if resp.StatusCode != http.StatusOK {
		log.Printf("❌ AI service returned error status %d: %s", resp.StatusCode, string(body))
		return nil, fmt.Errorf("AI service error (status %d): %s", resp.StatusCode, string(body))
	}

	var aiResponse DailyAnalysisResponse
	if err := json.Unmarshal(body, &aiResponse); err != nil {
		log.Printf("❌ Failed to unmarshal AI service response: %v", err)
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	log.Printf("✅ Successfully processed daily analysis - Score: %.1f, Anomalies: %d, Recommendations: %d",
		aiResponse.DailyScore, len(aiResponse.Anomalies), len(aiResponse.Recommendations))

	return &aiResponse, nil
}

// DailyAnalysisRequest represents the request to AI service
type DailyAnalysisRequest struct {
	UserID            string
	Date              string
	SleepHours        float64
	Bedtime           string
	WakeTime          string
	Steps             int
	WorkoutMinutes    int
	ScreenTimeMinutes int
	Meals             struct {
		Breakfast bool
		Lunch     bool
		Dinner    bool
	}
	Mood        int
	StressLevel int
	GoalContext struct {
		SleepTargetHours     float64
		DailyStepTarget      int
		MaxScreenTimeMinutes int
	}
	HistoryWindowDays int
}

// DailyAnalysisResponse represents the response from AI service
type DailyAnalysisResponse struct {
	UserID         string `json:"user_id"`
	Date           string `json:"date"`
	DailyScore     float64 `json:"daily_score"`
	Anomalies      []struct {
		Code        string `json:"code"`
		Description string `json:"description"`
		Severity    string `json:"severity"`
	} `json:"anomalies"`
	Recommendations []struct {
		Title           string `json:"title"`
		Reason          string `json:"reason"`
		SuggestedAction string `json:"suggested_action"`
		TimeHorizon     string `json:"time_horizon,omitempty"`
	} `json:"recommendations"`
}
