package handlers

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"lifepattern-api/internal/database"
	"lifepattern-api/internal/services"
)

// Mock routine service for testing
type MockRoutineService struct {
	shouldFail bool
	response   *services.CreateRoutineLogResponse
	logs       []database.RoutineLog
}

func NewMockRoutineService(shouldFail bool) *MockRoutineService {
	return &MockRoutineService{
		shouldFail: shouldFail,
		response: &services.CreateRoutineLogResponse{
			LogID:   1,
			Message: "Routine log saved and analyzed",
			HasAI:   true,
			AIResult: &services.AIResult{
				IsAnomaly:       true,
				ConfidenceScore: 0.85,
				AnomalyType:     "test_anomaly",
			},
		},
		logs: []database.RoutineLog{},
	}
}

func (m *MockRoutineService) CreateRoutineLog(routineLog database.RoutineLog) (*services.CreateRoutineLogResponse, error) {
	if m.shouldFail {
		return nil, errors.New("service error")
	}
	return m.response, nil
}

func (m *MockRoutineService) GetInsight(logID int) (*database.InsightResponse, error) {
	if m.shouldFail {
		return nil, errors.New("service error")
	}
	return &database.InsightResponse{}, nil
}

func (m *MockRoutineService) GetUserRoutineLogs(userID int, limit int) ([]database.RoutineLog, error) {
	if m.shouldFail {
		return nil, errors.New("service error")
	}
	return m.logs, nil
}

func (m *MockRoutineService) GetUserInsights(userID int, limit int) ([]database.InsightResponse, error) {
	if m.shouldFail {
		return nil, errors.New("service error")
	}
	return []database.InsightResponse{}, nil
}

func TestNewLogHandler(t *testing.T) {
	mockService := NewMockRoutineService(false)
	handler := NewLogHandler(mockService)

	if handler == nil {
		t.Fatal("Expected handler to be created")
	}

	if handler.routineService != mockService {
		t.Fatal("Expected routine service to be set")
	}
}

func TestCreateRoutineLog(t *testing.T) {
	mockService := NewMockRoutineService(false)
	handler := NewLogHandler(mockService)

	// Valid request
	requestBody := database.RoutineLog{
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

	jsonBody, _ := json.Marshal(requestBody)
	req := httptest.NewRequest("POST", "/log", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.CreateRoutineLog(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("Expected status 201, got %d", w.Code)
	}

	var response services.CreateRoutineLogResponse
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if response.LogID != 1 {
		t.Fatalf("Expected log ID 1, got %d", response.LogID)
	}

	if !response.HasAI {
		t.Fatal("Expected AI analysis to be performed")
	}
}

func TestCreateRoutineLogInvalidMethod(t *testing.T) {
	mockService := NewMockRoutineService(false)
	handler := NewLogHandler(mockService)

	req := httptest.NewRequest("GET", "/log", nil)
	w := httptest.NewRecorder()

	handler.CreateRoutineLog(w, req)

	if w.Code != http.StatusMethodNotAllowed {
		t.Fatalf("Expected status 405, got %d", w.Code)
	}
}

func TestCreateRoutineLogInvalidJSON(t *testing.T) {
	mockService := NewMockRoutineService(false)
	handler := NewLogHandler(mockService)

	req := httptest.NewRequest("POST", "/log", bytes.NewBufferString("invalid json"))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.CreateRoutineLog(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("Expected status 400, got %d", w.Code)
	}
}

func TestCreateRoutineLogValidationError(t *testing.T) {
	mockService := NewMockRoutineService(false)
	handler := NewLogHandler(mockService)

	// Invalid request - negative sleep hours
	requestBody := database.RoutineLog{
		UserID:           1,
		SleepHours:       -1.0, // Invalid
		MealTimes:        []string{"07:30", "12:00", "18:30"},
		ScreenTime:       4.5,
		ExerciseDuration: 1.0,
		WakeUpTime:       "07:00",
		BedTime:          "23:00",
		WaterIntake:      2.5,
		StressLevel:      4,
		LogDate:          "2024-01-15",
	}

	jsonBody, _ := json.Marshal(requestBody)
	req := httptest.NewRequest("POST", "/log", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.CreateRoutineLog(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("Expected status 400, got %d", w.Code)
	}

	body := w.Body.String()
	if body == "" {
		t.Fatal("Expected error message in response body")
	}
}

func TestCreateRoutineLogServiceError(t *testing.T) {
	mockService := NewMockRoutineService(true) // Service will fail
	handler := NewLogHandler(mockService)

	requestBody := database.RoutineLog{
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

	jsonBody, _ := json.Marshal(requestBody)
	req := httptest.NewRequest("POST", "/log", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.CreateRoutineLog(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("Expected status 500, got %d", w.Code)
	}
}

func TestGetUserRoutineLogs(t *testing.T) {
	mockService := NewMockRoutineService(false)
	handler := NewLogHandler(mockService)

	req := httptest.NewRequest("GET", "/logs?user_id=1&limit=10", nil)
	w := httptest.NewRecorder()

	handler.GetUserRoutineLogs(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d", w.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if response["user_id"] != float64(1) {
		t.Fatalf("Expected user ID 1, got %v", response["user_id"])
	}
}

func TestGetUserRoutineLogsInvalidMethod(t *testing.T) {
	mockService := NewMockRoutineService(false)
	handler := NewLogHandler(mockService)

	req := httptest.NewRequest("POST", "/logs", nil)
	w := httptest.NewRecorder()

	handler.GetUserRoutineLogs(w, req)

	if w.Code != http.StatusMethodNotAllowed {
		t.Fatalf("Expected status 405, got %d", w.Code)
	}
}

func TestGetUserRoutineLogsMissingUserID(t *testing.T) {
	mockService := NewMockRoutineService(false)
	handler := NewLogHandler(mockService)

	req := httptest.NewRequest("GET", "/logs", nil)
	w := httptest.NewRecorder()

	handler.GetUserRoutineLogs(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("Expected status 400, got %d", w.Code)
	}
}

func TestGetUserRoutineLogsInvalidUserID(t *testing.T) {
	mockService := NewMockRoutineService(false)
	handler := NewLogHandler(mockService)

	req := httptest.NewRequest("GET", "/logs?user_id=invalid", nil)
	w := httptest.NewRecorder()

	handler.GetUserRoutineLogs(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("Expected status 400, got %d", w.Code)
	}
}

func TestGetUserRoutineLogsInvalidLimit(t *testing.T) {
	mockService := NewMockRoutineService(false)
	handler := NewLogHandler(mockService)

	req := httptest.NewRequest("GET", "/logs?user_id=1&limit=invalid", nil)
	w := httptest.NewRecorder()

	handler.GetUserRoutineLogs(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("Expected status 400, got %d", w.Code)
	}
}

func TestGetUserRoutineLogsServiceError(t *testing.T) {
	mockService := NewMockRoutineService(true) // Service will fail
	handler := NewLogHandler(mockService)

	req := httptest.NewRequest("GET", "/logs?user_id=1", nil)
	w := httptest.NewRecorder()

	handler.GetUserRoutineLogs(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("Expected status 500, got %d", w.Code)
	}
}

func TestValidateRoutineLog(t *testing.T) {
	// Test valid log
	validLog := database.RoutineLog{
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

	if err := validateRoutineLog(validLog); err != nil {
		t.Fatalf("Expected no validation error, got %v", err)
	}

	// Test invalid sleep hours
	invalidLog := validLog
	invalidLog.SleepHours = -1.0
	if err := validateRoutineLog(invalidLog); err == nil {
		t.Fatal("Expected validation error for negative sleep hours")
	}

	// Test invalid screen time
	invalidLog = validLog
	invalidLog.ScreenTime = 25.0
	if err := validateRoutineLog(invalidLog); err == nil {
		t.Fatal("Expected validation error for excessive screen time")
	}

	// Test invalid stress level
	invalidLog = validLog
	invalidLog.StressLevel = 11
	if err := validateRoutineLog(invalidLog); err == nil {
		t.Fatal("Expected validation error for invalid stress level")
	}

	// Test empty meal times
	invalidLog = validLog
	invalidLog.MealTimes = []string{}
	if err := validateRoutineLog(invalidLog); err == nil {
		t.Fatal("Expected validation error for empty meal times")
	}

	// Test missing wake up time
	invalidLog = validLog
	invalidLog.WakeUpTime = ""
	if err := validateRoutineLog(invalidLog); err == nil {
		t.Fatal("Expected validation error for missing wake up time")
	}

	// Test missing bed time
	invalidLog = validLog
	invalidLog.BedTime = ""
	if err := validateRoutineLog(invalidLog); err == nil {
		t.Fatal("Expected validation error for missing bed time")
	}
}
