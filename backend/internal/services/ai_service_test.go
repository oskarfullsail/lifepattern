package services

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"lifepattern-api/internal/database"
)

func TestNewAIService(t *testing.T) {
	aiService := NewAIService("http://localhost:8000")
	if aiService == nil {
		t.Fatal("Expected AI service to be created")
	}

	if aiService.baseURL != "http://localhost:8000" {
		t.Fatalf("Expected base URL http://localhost:8000, got %s", aiService.baseURL)
	}

	if aiService.httpClient == nil {
		t.Fatal("Expected HTTP client to be initialized")
	}
}

func TestAnalyzeRoutine(t *testing.T) {
	// Create mock server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Check request method
		if r.Method != http.MethodPost {
			t.Errorf("Expected POST request, got %s", r.Method)
		}

		// Check content type
		if r.Header.Get("Content-Type") != "application/json" {
			t.Errorf("Expected Content-Type application/json, got %s", r.Header.Get("Content-Type"))
		}

		// Mock response
		response := AIServiceResponse{
			IsAnomaly:       true,
			ConfidenceScore: 0.85,
			AnomalyType:     "high_screen_time",
			Recommendations: []string{"Reduce screen time", "Take more breaks"},
			Timestamp:       time.Now().Format(time.RFC3339),
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(response)
	}))
	defer server.Close()

	// Create AI service with mock server URL
	aiService := NewAIService(server.URL)

	// Create test routine log
	routineLog := database.RoutineLog{
		UserID:           1,
		SleepHours:       6.0,
		MealTimes:        []string{"07:00", "12:30", "18:00"},
		ScreenTime:       8.0,
		ExerciseDuration: 0.0,
		WakeUpTime:       "06:30",
		BedTime:          "00:30",
		WaterIntake:      1.5,
		StressLevel:      8,
		LogDate:          "2024-01-15",
	}

	// Test analysis
	response, err := aiService.AnalyzeRoutine(routineLog)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if response == nil {
		t.Fatal("Expected response, got nil")
	}

	if !response.IsAnomaly {
		t.Fatalf("Expected anomaly to be true")
	}

	if response.ConfidenceScore != 0.85 {
		t.Fatalf("Expected confidence score 0.85, got %f", response.ConfidenceScore)
	}

	if response.AnomalyType != "high_screen_time" {
		t.Fatalf("Expected anomaly type 'high_screen_time', got %s", response.AnomalyType)
	}

	if len(response.Recommendations) != 2 {
		t.Fatalf("Expected 2 recommendations, got %d", len(response.Recommendations))
	}
}

func TestAnalyzeRoutineServerError(t *testing.T) {
	// Create mock server that returns error
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error": "Internal server error"}`))
	}))
	defer server.Close()

	aiService := NewAIService(server.URL)

	routineLog := database.RoutineLog{
		UserID:           1,
		SleepHours:       8.0,
		MealTimes:        []string{"07:30", "12:00", "18:30"},
		ScreenTime:       4.5,
		ExerciseDuration: 1.0,
		WakeUpTime:       "07:00",
		BedTime:          "23:00",
		WaterIntake:      2.5,
		StressLevel:      4,
		LogDate:          "2024-01-15",
	}

	_, err := aiService.AnalyzeRoutine(routineLog)
	if err == nil {
		t.Fatal("Expected error for server error")
	}
}

func TestAnalyzeRoutineInvalidJSON(t *testing.T) {
	// Create mock server that returns invalid JSON
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`invalid json`))
	}))
	defer server.Close()

	aiService := NewAIService(server.URL)

	routineLog := database.RoutineLog{
		UserID:           1,
		SleepHours:       8.0,
		MealTimes:        []string{"07:30", "12:00", "18:30"},
		ScreenTime:       4.5,
		ExerciseDuration: 1.0,
		WakeUpTime:       "07:00",
		BedTime:          "23:00",
		WaterIntake:      2.5,
		StressLevel:      4,
		LogDate:          "2024-01-15",
	}

	_, err := aiService.AnalyzeRoutine(routineLog)
	if err == nil {
		t.Fatal("Expected error for invalid JSON")
	}
}

func TestAnalyzeRoutineConnectionError(t *testing.T) {
	// Create AI service with invalid URL
	aiService := NewAIService("http://invalid-url:9999")

	routineLog := database.RoutineLog{
		UserID:           1,
		SleepHours:       8.0,
		MealTimes:        []string{"07:30", "12:00", "18:30"},
		ScreenTime:       4.5,
		ExerciseDuration: 1.0,
		WakeUpTime:       "07:00",
		BedTime:          "23:00",
		WaterIntake:      2.5,
		StressLevel:      4,
		LogDate:          "2024-01-15",
	}

	_, err := aiService.AnalyzeRoutine(routineLog)
	if err == nil {
		t.Fatal("Expected error for connection failure")
	}
}

func TestCheckHealth(t *testing.T) {
	// Create mock server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			t.Errorf("Expected GET request, got %s", r.Method)
		}

		if r.URL.Path != "/health" {
			t.Errorf("Expected path /health, got %s", r.URL.Path)
		}

		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status": "healthy"}`))
	}))
	defer server.Close()

	aiService := NewAIService(server.URL)

	err := aiService.CheckHealth()
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
}

func TestCheckHealthUnhealthy(t *testing.T) {
	// Create mock server that returns error
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
		w.Write([]byte(`{"status": "unhealthy"}`))
	}))
	defer server.Close()

	aiService := NewAIService(server.URL)

	err := aiService.CheckHealth()
	if err == nil {
		t.Fatal("Expected error for unhealthy service")
	}
}

func TestCheckHealthConnectionError(t *testing.T) {
	// Create AI service with invalid URL
	aiService := NewAIService("http://invalid-url:9999")

	err := aiService.CheckHealth()
	if err == nil {
		t.Fatal("Expected error for connection failure")
	}
}
