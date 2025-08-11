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

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Mock routine service for testing
type MockRoutineService struct {
	shouldFail bool
	response   *services.CreateRoutineLogResponse
	logs       []database.RoutineLog
	insights   []database.InsightResponse
}

func NewMockRoutineService(shouldFail bool) *MockRoutineService {
	return &MockRoutineService{
		shouldFail: shouldFail,
		response: &services.CreateRoutineLogResponse{
			LogID:   1,
			UserID:  uuid.New(),
			Message: "Routine log saved and analyzed",
			AIResponse: &services.AIServiceResponse{
				IsAnomaly:       true,
				ConfidenceScore: 0.85,
				AnomalyType:     "test_anomaly",
				Recommendations: []string{"Test recommendation"},
				Timestamp:       "2024-01-15T10:00:00Z",
			},
		},
		logs:     []database.RoutineLog{},
		insights: []database.InsightResponse{},
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
	if len(m.insights) > 0 {
		return &m.insights[0], nil
	}
	return &database.InsightResponse{}, nil
}

func (m *MockRoutineService) GetUserRoutineLogs(userID uuid.UUID, limit int) ([]database.RoutineLog, error) {
	if m.shouldFail {
		return nil, errors.New("service error")
	}
	return m.logs, nil
}

func (m *MockRoutineService) GetUserInsights(userID uuid.UUID, limit int) ([]database.InsightResponse, error) {
	if m.shouldFail {
		return nil, errors.New("service error")
	}
	return m.insights, nil
}

func TestNewLogHandler(t *testing.T) {
	mockService := NewMockRoutineService(false)
	handler := NewLogHandler(mockService)

	assert.NotNil(t, handler)
	assert.Equal(t, mockService, handler.routineService)
}

func TestCreateRoutineLog(t *testing.T) {
	mockService := NewMockRoutineService(false)
	handler := NewLogHandler(mockService)

	userID := uuid.New()
	// Valid request
	requestBody := database.RoutineLog{
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
	}

	jsonBody, _ := json.Marshal(requestBody)
	req := httptest.NewRequest("POST", "/log", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.CreateRoutineLog(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)

	var response services.CreateRoutineLogResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Equal(t, 1, response.LogID)
	assert.NotNil(t, response.AIResponse)
	assert.True(t, response.AIResponse.IsAnomaly)
}

func TestCreateRoutineLogInvalidMethod(t *testing.T) {
	mockService := NewMockRoutineService(false)
	handler := NewLogHandler(mockService)

	req := httptest.NewRequest("GET", "/log", nil)
	w := httptest.NewRecorder()

	handler.CreateRoutineLog(w, req)

	assert.Equal(t, http.StatusMethodNotAllowed, w.Code)
}

func TestCreateRoutineLogInvalidJSON(t *testing.T) {
	mockService := NewMockRoutineService(false)
	handler := NewLogHandler(mockService)

	req := httptest.NewRequest("POST", "/log", bytes.NewBufferString("invalid json"))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.CreateRoutineLog(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestCreateRoutineLogServiceError(t *testing.T) {
	mockService := NewMockRoutineService(true) // Service will fail
	handler := NewLogHandler(mockService)

	userID := uuid.New()
	requestBody := database.RoutineLog{
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
	}

	jsonBody, _ := json.Marshal(requestBody)
	req := httptest.NewRequest("POST", "/log", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.CreateRoutineLog(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestGetUserRoutineLogs(t *testing.T) {
	mockService := NewMockRoutineService(false)
	handler := NewLogHandler(mockService)

	userID := uuid.New()
	req := httptest.NewRequest("GET", "/logs?user_id="+userID.String()+"&limit=10", nil)
	w := httptest.NewRecorder()

	handler.GetUserRoutineLogs(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response []database.RoutineLog
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
}

func TestGetUserRoutineLogsInvalidMethod(t *testing.T) {
	mockService := NewMockRoutineService(false)
	handler := NewLogHandler(mockService)

	req := httptest.NewRequest("POST", "/logs", nil)
	w := httptest.NewRecorder()

	handler.GetUserRoutineLogs(w, req)

	assert.Equal(t, http.StatusMethodNotAllowed, w.Code)
}

func TestGetUserRoutineLogsMissingUserID(t *testing.T) {
	mockService := NewMockRoutineService(false)
	handler := NewLogHandler(mockService)

	req := httptest.NewRequest("GET", "/logs", nil)
	w := httptest.NewRecorder()

	handler.GetUserRoutineLogs(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestGetUserRoutineLogsInvalidUserID(t *testing.T) {
	mockService := NewMockRoutineService(false)
	handler := NewLogHandler(mockService)

	req := httptest.NewRequest("GET", "/logs?user_id=invalid", nil)
	w := httptest.NewRecorder()

	handler.GetUserRoutineLogs(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestGetUserRoutineLogsInvalidLimit(t *testing.T) {
	mockService := NewMockRoutineService(false)
	handler := NewLogHandler(mockService)

	userID := uuid.New()
	req := httptest.NewRequest("GET", "/logs?user_id="+userID.String()+"&limit=invalid", nil)
	w := httptest.NewRecorder()

	handler.GetUserRoutineLogs(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestGetUserRoutineLogsServiceError(t *testing.T) {
	mockService := NewMockRoutineService(true) // Service will fail
	handler := NewLogHandler(mockService)

	userID := uuid.New()
	req := httptest.NewRequest("GET", "/logs?user_id="+userID.String(), nil)
	w := httptest.NewRecorder()

	handler.GetUserRoutineLogs(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestGetUserRoutineLogsWithDefaultLimit(t *testing.T) {
	mockService := NewMockRoutineService(false)
	handler := NewLogHandler(mockService)

	userID := uuid.New()
	req := httptest.NewRequest("GET", "/logs?user_id="+userID.String(), nil)
	w := httptest.NewRecorder()

	handler.GetUserRoutineLogs(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestGetUserRoutineLogsWithCustomLimit(t *testing.T) {
	mockService := NewMockRoutineService(false)
	handler := NewLogHandler(mockService)

	userID := uuid.New()
	req := httptest.NewRequest("GET", "/logs?user_id="+userID.String()+"&limit=5", nil)
	w := httptest.NewRecorder()

	handler.GetUserRoutineLogs(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestLogHandlerEdgeCases(t *testing.T) {
	mockService := NewMockRoutineService(false)
	handler := NewLogHandler(mockService)

	// Test with empty routine log
	emptyLog := database.RoutineLog{}
	jsonBody, _ := json.Marshal(emptyLog)
	req := httptest.NewRequest("POST", "/log", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.CreateRoutineLog(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)
}

func TestLogHandlerResponseStructure(t *testing.T) {
	mockService := NewMockRoutineService(false)
	handler := NewLogHandler(mockService)

	userID := uuid.New()
	requestBody := database.RoutineLog{
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
	}

	jsonBody, _ := json.Marshal(requestBody)
	req := httptest.NewRequest("POST", "/log", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.CreateRoutineLog(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)
	assert.Equal(t, "application/json", w.Header().Get("Content-Type"))

	var response services.CreateRoutineLogResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Greater(t, response.LogID, 0)
	assert.NotEqual(t, uuid.Nil, response.UserID)
	assert.NotEmpty(t, response.Message)
	assert.NotNil(t, response.AIResponse)
}
