package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"lifepattern-api/internal/database"
	"lifepattern-api/internal/services"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Mock routine service for testing insights
type MockInsightRoutineService struct {
	shouldFail bool
	insight    *database.InsightResponse
	insights   []database.InsightResponse
}

func NewMockInsightRoutineService(shouldFail bool) *MockInsightRoutineService {
	userID := uuid.New()
	return &MockInsightRoutineService{
		shouldFail: shouldFail,
		insight: &database.InsightResponse{
			RoutineLog: database.RoutineLog{
				ID:               1,
				UserID:           userID,
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
				ID:                 1,
				RoutineLogID:       1,
				IsAnomaly:          true,
				ConfidenceScore:    0.85,
				AnomalyType:        "test_anomaly",
				Recommendations:    []string{"Test recommendation"},
				AIServiceResponse:  json.RawMessage(`{"test": "response"}`),
				DriftAnalysis:      []byte(`{"drift": "analysis"}`),
				BaselineComparison: []byte(`{"baseline": "comparison"}`),
				ModelVersion:       "1.0.0",
			},
		},
		insights: []database.InsightResponse{},
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

func (m *MockInsightRoutineService) GetUserRoutineLogs(userID uuid.UUID, limit int) ([]database.RoutineLog, error) {
	return nil, errors.New("not implemented")
}

func (m *MockInsightRoutineService) GetUserInsights(userID uuid.UUID, limit int) ([]database.InsightResponse, error) {
	if m.shouldFail {
		return nil, errors.New("service error")
	}
	if len(m.insights) > 0 {
		return m.insights, nil
	}
	return []database.InsightResponse{*m.insight}, nil
}

func (m *MockInsightRoutineService) GetUserRoutineLogsCount(userID uuid.UUID) (int, error) {
	if m.shouldFail {
		return 0, errors.New("service error")
	}
	return len(m.insights), nil
}

func (m *MockInsightRoutineService) GetUserInsightsCount(userID uuid.UUID) (int, error) {
	if m.shouldFail {
		return 0, errors.New("service error")
	}
	if len(m.insights) > 0 {
		return len(m.insights), nil
	}
	return 1, nil
}

func TestNewInsightHandler(t *testing.T) {
	mockService := NewMockInsightRoutineService(false)
	handler := NewInsightHandler(mockService)

	assert.NotNil(t, handler)
	assert.Equal(t, mockService, handler.routineService)
}

func TestGetInsight(t *testing.T) {
	mockService := NewMockInsightRoutineService(false)
	handler := NewInsightHandler(mockService)

	req := httptest.NewRequest("GET", "/insights?log_id=1", nil)
	w := httptest.NewRecorder()

	handler.GetInsight(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response database.InsightResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Equal(t, 1, response.RoutineLog.ID)
	assert.Equal(t, 1, response.AIReport.RoutineLogID)
	assert.True(t, response.AIReport.IsAnomaly)
	assert.Equal(t, 0.85, response.AIReport.ConfidenceScore)
}

func TestGetInsightInvalidMethod(t *testing.T) {
	mockService := NewMockInsightRoutineService(false)
	handler := NewInsightHandler(mockService)

	req := httptest.NewRequest("POST", "/insights", nil)
	w := httptest.NewRecorder()

	handler.GetInsight(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestGetInsightMissingLogID(t *testing.T) {
	mockService := NewMockInsightRoutineService(false)
	handler := NewInsightHandler(mockService)

	req := httptest.NewRequest("GET", "/insights", nil)
	w := httptest.NewRecorder()

	handler.GetInsight(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestGetInsightInvalidLogID(t *testing.T) {
	mockService := NewMockInsightRoutineService(false)
	handler := NewInsightHandler(mockService)

	req := httptest.NewRequest("GET", "/insights?log_id=invalid", nil)
	w := httptest.NewRecorder()

	handler.GetInsight(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestGetInsightServiceError(t *testing.T) {
	mockService := NewMockInsightRoutineService(true) // Service will fail
	handler := NewInsightHandler(mockService)

	req := httptest.NewRequest("GET", "/insights?log_id=1", nil)
	w := httptest.NewRecorder()

	handler.GetInsight(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestGetUserInsights(t *testing.T) {
	mockService := NewMockInsightRoutineService(false)
	handler := NewInsightHandler(mockService)

	userID := uuid.New()
	req := httptest.NewRequest("GET", "/user-insights?user_id="+userID.String()+"&limit=10", nil)
	w := httptest.NewRecorder()

	handler.GetUserInsights(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response []database.InsightResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Len(t, response, 1)
	assert.Equal(t, 1, response[0].RoutineLog.ID)
	assert.True(t, response[0].AIReport.IsAnomaly)
}

func TestGetUserInsightsMissingUserID(t *testing.T) {
	mockService := NewMockInsightRoutineService(false)
	handler := NewInsightHandler(mockService)

	req := httptest.NewRequest("GET", "/user-insights", nil)
	w := httptest.NewRecorder()

	handler.GetUserInsights(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestGetUserInsightsInvalidUserID(t *testing.T) {
	mockService := NewMockInsightRoutineService(false)
	handler := NewInsightHandler(mockService)

	req := httptest.NewRequest("GET", "/user-insights?user_id=invalid", nil)
	w := httptest.NewRecorder()

	handler.GetUserInsights(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestGetUserInsightsInvalidLimit(t *testing.T) {
	mockService := NewMockInsightRoutineService(false)
	handler := NewInsightHandler(mockService)

	userID := uuid.New()
	req := httptest.NewRequest("GET", "/user-insights?user_id="+userID.String()+"&limit=invalid", nil)
	w := httptest.NewRecorder()

	handler.GetUserInsights(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestGetUserInsightsServiceError(t *testing.T) {
	mockService := NewMockInsightRoutineService(true) // Service will fail
	handler := NewInsightHandler(mockService)

	userID := uuid.New()
	req := httptest.NewRequest("GET", "/user-insights?user_id="+userID.String(), nil)
	w := httptest.NewRecorder()

	handler.GetUserInsights(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestGetUserInsightsWithDefaultLimit(t *testing.T) {
	mockService := NewMockInsightRoutineService(false)
	handler := NewInsightHandler(mockService)

	userID := uuid.New()
	req := httptest.NewRequest("GET", "/user-insights?user_id="+userID.String(), nil)
	w := httptest.NewRecorder()

	handler.GetUserInsights(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestGetUserInsightsWithCustomLimit(t *testing.T) {
	mockService := NewMockInsightRoutineService(false)
	handler := NewInsightHandler(mockService)

	userID := uuid.New()
	req := httptest.NewRequest("GET", "/user-insights?user_id="+userID.String()+"&limit=5", nil)
	w := httptest.NewRecorder()

	handler.GetUserInsights(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestInsightHandlerResponseStructure(t *testing.T) {
	mockService := NewMockInsightRoutineService(false)
	handler := NewInsightHandler(mockService)

	req := httptest.NewRequest("GET", "/insights?log_id=1", nil)
	w := httptest.NewRecorder()

	handler.GetInsight(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "application/json", w.Header().Get("Content-Type"))

	var response database.InsightResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Equal(t, 1, response.RoutineLog.ID)
	assert.NotEqual(t, uuid.Nil, response.RoutineLog.UserID)
	assert.Equal(t, 1, response.AIReport.RoutineLogID)
	assert.True(t, response.AIReport.IsAnomaly)
	assert.Equal(t, 0.85, response.AIReport.ConfidenceScore)
	assert.NotEmpty(t, response.AIReport.AnomalyType)
	assert.Len(t, response.AIReport.Recommendations, 1)
}
