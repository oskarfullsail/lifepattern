package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"lifepattern-api/internal/database"
	"lifepattern-api/internal/services"
)

// Mock routine service for testing insights
type MockInsightRoutineService struct {
	shouldFail bool
	insight    *database.InsightResponse
}

func NewMockInsightRoutineService(shouldFail bool) *MockInsightRoutineService {
	return &MockInsightRoutineService{
		shouldFail: shouldFail,
		insight: &database.InsightResponse{
			RoutineLog: database.RoutineLog{
				ID:               1,
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
			},
			AIReport: database.AIReport{
				ID:                1,
				RoutineLogID:      1,
				IsAnomaly:         true,
				ConfidenceScore:   0.85,
				AnomalyType:       "test_anomaly",
				Recommendations:   []string{"Test recommendation"},
				AIServiceResponse: `{"test": "response"}`,
			},
		},
	}
}

func (m *MockInsightRoutineService) CreateRoutineLog(routineLog database.RoutineLog) (*services.CreateRoutineLogResponse, error) {
	return nil, errors.New("not implemented")
}

func (m *MockInsightRoutineService) GetInsight(logID int) (*database.InsightResponse, error) {
	if m.shouldFail {
		return nil, errors.New("service error")
	}
	return m.insight, nil
}

func (m *MockInsightRoutineService) GetUserRoutineLogs(userID int, limit int) ([]database.RoutineLog, error) {
	return nil, errors.New("not implemented")
}

func (m *MockInsightRoutineService) GetUserInsights(userID int, limit int) ([]database.InsightResponse, error) {
	if m.shouldFail {
		return nil, errors.New("service error")
	}
	return []database.InsightResponse{*m.insight}, nil
}

func TestNewInsightHandler(t *testing.T) {
	mockService := NewMockInsightRoutineService(false)
	handler := NewInsightHandler(mockService)

	if handler == nil {
		t.Fatal("Expected handler to be created")
	}

	if handler.routineService != mockService {
		t.Fatal("Expected routine service to be set")
	}
}

func TestGetInsight(t *testing.T) {
	mockService := NewMockInsightRoutineService(false)
	handler := NewInsightHandler(mockService)

	req := httptest.NewRequest("GET", "/insights?log_id=1", nil)
	w := httptest.NewRecorder()

	handler.GetInsight(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d", w.Code)
	}

	var response database.InsightResponse
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if response.RoutineLog.ID != 1 {
		t.Fatalf("Expected routine log ID 1, got %d", response.RoutineLog.ID)
	}

	if response.AIReport.RoutineLogID != 1 {
		t.Fatalf("Expected AI report log ID 1, got %d", response.AIReport.RoutineLogID)
	}

	if !response.AIReport.IsAnomaly {
		t.Fatal("Expected anomaly to be true")
	}
}

func TestGetInsightInvalidMethod(t *testing.T) {
	mockService := NewMockInsightRoutineService(false)
	handler := NewInsightHandler(mockService)

	req := httptest.NewRequest("POST", "/insights", nil)
	w := httptest.NewRecorder()

	handler.GetInsight(w, req)

	if w.Code != http.StatusMethodNotAllowed {
		t.Fatalf("Expected status 405, got %d", w.Code)
	}
}

func TestGetInsightMissingLogID(t *testing.T) {
	mockService := NewMockInsightRoutineService(false)
	handler := NewInsightHandler(mockService)

	req := httptest.NewRequest("GET", "/insights", nil)
	w := httptest.NewRecorder()

	handler.GetInsight(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("Expected status 400, got %d", w.Code)
	}
}

func TestGetInsightInvalidLogID(t *testing.T) {
	mockService := NewMockInsightRoutineService(false)
	handler := NewInsightHandler(mockService)

	req := httptest.NewRequest("GET", "/insights?log_id=invalid", nil)
	w := httptest.NewRecorder()

	handler.GetInsight(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("Expected status 400, got %d", w.Code)
	}
}

func TestGetInsightServiceError(t *testing.T) {
	mockService := NewMockInsightRoutineService(true) // Service will fail
	handler := NewInsightHandler(mockService)

	req := httptest.NewRequest("GET", "/insights?log_id=1", nil)
	w := httptest.NewRecorder()

	handler.GetInsight(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("Expected status 500, got %d", w.Code)
	}
}
