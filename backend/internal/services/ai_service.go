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
			Timeout: 30 * time.Second,
		},
	}
}

// AnalyzeRoutine sends routine data to AI service and returns analysis
// This method handles the communication between Backend and AI Service
func (s *AIService) AnalyzeRoutine(routineLog database.RoutineLog) (*AIServiceResponse, error) {
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

	resp, err := s.httpClient.Post(s.baseURL+"/predict", "application/json", bytes.NewBuffer(requestJSON))
	if err != nil {
		log.Printf("❌ Failed to call AI service: %v", err)
		return nil, fmt.Errorf("failed to call AI service: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("❌ Failed to read AI service response: %v", err)
		return nil, fmt.Errorf("failed to read AI service response: %w", err)
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

	// Enhanced request with historical context
	enhancedRequest := map[string]interface{}{
		"current_data": AIServiceRequest{
			SleepHours:       routineLog.SleepHours,
			MealTimes:        routineLog.MealTimes,
			ScreenTime:       routineLog.ScreenTime,
			ExerciseDuration: routineLog.ExerciseDuration,
			WakeUpTime:       routineLog.WakeUpTime,
			BedTime:          routineLog.BedTime,
			WaterIntake:      routineLog.WaterIntake,
			StressLevel:      routineLog.StressLevel,
		},
		"historical_data": historicalPayload,
		"user_id":         routineLog.UserID,
	}

	requestJSON, err := json.Marshal(enhancedRequest)
	if err != nil {
		log.Printf("❌ Failed to marshal enhanced AI service request: %v", err)
		return nil, fmt.Errorf("failed to marshal enhanced AI service request: %w", err)
	}

	log.Printf("📤 Sending enhanced request to AI service: %s", string(requestJSON))

	resp, err := s.httpClient.Post(s.baseURL+"/predict", "application/json", bytes.NewBuffer(requestJSON))
	if err != nil {
		log.Printf("❌ Failed to call AI service: %v", err)
		return nil, fmt.Errorf("failed to call AI service: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("❌ Failed to read AI service response: %v", err)
		return nil, fmt.Errorf("failed to read AI service response: %w", err)
	}

	log.Printf("📥 Received enhanced response from AI service (status: %d): %s", resp.StatusCode, string(body))

	if resp.StatusCode != http.StatusOK {
		log.Printf("❌ AI service returned error status %d: %s", resp.StatusCode, string(body))
		return nil, fmt.Errorf("AI service error (status %d): %s", resp.StatusCode, string(body))
	}

	var aiResponse AIServiceResponse
	if err := json.Unmarshal(body, &aiResponse); err != nil {
		log.Printf("❌ Failed to unmarshal AI service response: %v", err)
		return nil, fmt.Errorf("failed to unmarshal AI service response: %w", err)
	}

	log.Printf("✅ Successfully processed enhanced AI service response - Anomaly: %v, Type: %s, Drift: %v",
		aiResponse.IsAnomaly, aiResponse.AnomalyType, aiResponse.DriftAnalysis != nil)

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
