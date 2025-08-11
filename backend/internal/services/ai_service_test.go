package services

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"lifepattern-api/internal/database"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewAIService(t *testing.T) {
	aiService := NewAIService("http://localhost:8000")
	assert.NotNil(t, aiService)
	assert.Equal(t, "http://localhost:8000", aiService.baseURL)
	assert.NotNil(t, aiService.httpClient)
}

func TestAnalyzeRoutine(t *testing.T) {
	// Create mock server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Check request method
		assert.Equal(t, http.MethodPost, r.Method)

		// Check content type
		assert.Equal(t, "application/json", r.Header.Get("Content-Type"))

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
		UserID:           uuid.New(),
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
	require.NoError(t, err)
	assert.NotNil(t, response)
	assert.True(t, response.IsAnomaly)
	assert.Equal(t, 0.85, response.ConfidenceScore)
	assert.Equal(t, "high_screen_time", response.AnomalyType)
	assert.Len(t, response.Recommendations, 2)
}

func TestAnalyzeRoutineWithHistory(t *testing.T) {
	// Create mock server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Check request method
		assert.Equal(t, http.MethodPost, r.Method)

		// Check content type
		assert.Equal(t, "application/json", r.Header.Get("Content-Type"))

		// Mock response
		response := AIServiceResponse{
			IsAnomaly:       true,
			ConfidenceScore: 0.90,
			AnomalyType:     "sleep_deprivation",
			Recommendations: []string{"Get more sleep", "Reduce stress"},
			Timestamp:       time.Now().Format(time.RFC3339),
			DriftAnalysis: map[string]interface{}{
				"drift_score": 0.75,
				"trend":       "declining",
			},
			BaselineComparison: map[string]interface{}{
				"baseline_score": 0.85,
				"deviation":      0.15,
			},
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
		UserID:           uuid.New(),
		SleepHours:       5.0,
		MealTimes:        []string{"07:00", "12:30", "18:00"},
		ScreenTime:       10.0,
		ExerciseDuration: 0.0,
		WakeUpTime:       "06:30",
		BedTime:          "01:30",
		WaterIntake:      1.0,
		StressLevel:      9,
		LogDate:          "2024-01-15",
	}

	// Create historical data
	historicalData := []database.RoutineLog{
		{
			UserID:           routineLog.UserID,
			SleepHours:       7.0,
			MealTimes:        []string{"07:30", "12:00", "18:30"},
			ScreenTime:       6.0,
			ExerciseDuration: 1.0,
			WakeUpTime:       "07:00",
			BedTime:          "23:00",
			WaterIntake:      2.0,
			StressLevel:      5,
			LogDate:          "2024-01-14",
		},
		{
			UserID:           routineLog.UserID,
			SleepHours:       6.5,
			MealTimes:        []string{"08:00", "13:00", "19:00"},
			ScreenTime:       7.0,
			ExerciseDuration: 0.5,
			WakeUpTime:       "07:30",
			BedTime:          "00:00",
			WaterIntake:      1.8,
			StressLevel:      6,
			LogDate:          "2024-01-13",
		},
	}

	// Test analysis with history
	response, err := aiService.AnalyzeRoutineWithHistory(routineLog, historicalData)
	require.NoError(t, err)
	assert.NotNil(t, response)
	assert.True(t, response.IsAnomaly)
	assert.Equal(t, 0.90, response.ConfidenceScore)
	assert.Equal(t, "sleep_deprivation", response.AnomalyType)
	assert.Len(t, response.Recommendations, 2)
	assert.NotNil(t, response.DriftAnalysis)
	assert.NotNil(t, response.BaselineComparison)
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
		UserID:           uuid.New(),
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
	assert.Error(t, err)
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
		UserID:           uuid.New(),
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
	assert.Error(t, err)
}

func TestAnalyzeRoutineConnectionError(t *testing.T) {
	// Create AI service with invalid URL
	aiService := NewAIService("http://invalid-url:9999")

	routineLog := database.RoutineLog{
		UserID:           uuid.New(),
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
	assert.Error(t, err)
}

func TestCheckHealth(t *testing.T) {
	// Create mock server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodGet, r.Method)
		assert.Equal(t, "/health", r.URL.Path)

		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status": "healthy"}`))
	}))
	defer server.Close()

	aiService := NewAIService(server.URL)

	err := aiService.CheckHealth()
	assert.NoError(t, err)
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
	assert.Error(t, err)
}

func TestCheckHealthConnectionError(t *testing.T) {
	// Create AI service with invalid URL
	aiService := NewAIService("http://invalid-url:9999")

	err := aiService.CheckHealth()
	assert.Error(t, err)
}

func TestAIServiceRequestStructure(t *testing.T) {
	// Test that AIServiceRequest can be properly marshaled
	request := AIServiceRequest{
		SleepHours:       7.5,
		MealTimes:        []string{"08:00", "13:00", "19:00"},
		ScreenTime:       5.0,
		ExerciseDuration: 1.0,
		WakeUpTime:       "07:30",
		BedTime:          "22:30",
		WaterIntake:      2.0,
		StressLevel:      6,
	}

	jsonData, err := json.Marshal(request)
	assert.NoError(t, err)
	assert.NotEmpty(t, jsonData)

	// Test unmarshaling
	var unmarshaledRequest AIServiceRequest
	err = json.Unmarshal(jsonData, &unmarshaledRequest)
	assert.NoError(t, err)
	assert.Equal(t, request.SleepHours, unmarshaledRequest.SleepHours)
	assert.Equal(t, request.MealTimes, unmarshaledRequest.MealTimes)
	assert.Equal(t, request.ScreenTime, unmarshaledRequest.ScreenTime)
	assert.Equal(t, request.ExerciseDuration, unmarshaledRequest.ExerciseDuration)
	assert.Equal(t, request.WakeUpTime, unmarshaledRequest.WakeUpTime)
	assert.Equal(t, request.BedTime, unmarshaledRequest.BedTime)
	assert.Equal(t, request.WaterIntake, unmarshaledRequest.WaterIntake)
	assert.Equal(t, request.StressLevel, unmarshaledRequest.StressLevel)
}

func TestAIServiceResponseStructure(t *testing.T) {
	// Test that AIServiceResponse can be properly marshaled
	response := AIServiceResponse{
		IsAnomaly:       true,
		ConfidenceScore: 0.85,
		AnomalyType:     "test_anomaly",
		Recommendations: []string{"Test recommendation"},
		Timestamp:       time.Now().Format(time.RFC3339),
		DriftAnalysis: map[string]interface{}{
			"drift_score": 0.75,
		},
		BaselineComparison: map[string]interface{}{
			"baseline_score": 0.85,
		},
	}

	jsonData, err := json.Marshal(response)
	assert.NoError(t, err)
	assert.NotEmpty(t, jsonData)

	// Test unmarshaling
	var unmarshaledResponse AIServiceResponse
	err = json.Unmarshal(jsonData, &unmarshaledResponse)
	assert.NoError(t, err)
	assert.Equal(t, response.IsAnomaly, unmarshaledResponse.IsAnomaly)
	assert.Equal(t, response.ConfidenceScore, unmarshaledResponse.ConfidenceScore)
	assert.Equal(t, response.AnomalyType, unmarshaledResponse.AnomalyType)
	assert.Equal(t, response.Recommendations, unmarshaledResponse.Recommendations)
	assert.Equal(t, response.Timestamp, unmarshaledResponse.Timestamp)
	assert.NotNil(t, unmarshaledResponse.DriftAnalysis)
	assert.NotNil(t, unmarshaledResponse.BaselineComparison)
}

func TestAIServiceTimeout(t *testing.T) {
	// Create mock server that delays response
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(35 * time.Second) // Longer than the 30-second timeout
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status": "ok"}`))
	}))
	defer server.Close()

	aiService := NewAIService(server.URL)

	routineLog := database.RoutineLog{
		UserID:           uuid.New(),
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
	assert.Error(t, err)
}
