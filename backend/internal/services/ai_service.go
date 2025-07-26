package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
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
	IsAnomaly       bool     `json:"is_anomaly"`
	ConfidenceScore float64  `json:"confidence_score"`
	AnomalyType     string   `json:"anomaly_type"`
	Recommendations []string `json:"recommendations"`
	Timestamp       string   `json:"timestamp"`
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

// CheckHealth checks if the AI service is healthy
// This method verifies the AI service is available for communication
func (s *AIService) CheckHealth() error {
	log.Printf("🏥 Checking AI service health at %s/health", s.baseURL)

	resp, err := s.httpClient.Get(s.baseURL + "/health")
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
