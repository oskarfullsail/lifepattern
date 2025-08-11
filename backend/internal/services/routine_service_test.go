package services

import (
	"errors"
	"testing"
	"time"

	"lifepattern-api/internal/database"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Mock repository for testing
type MockRepository struct {
	routineLogs map[int]database.RoutineLog
	aiReports   map[int]database.AIReport
	nextID      int
}

func NewMockRepository() *MockRepository {
	return &MockRepository{
		routineLogs: make(map[int]database.RoutineLog),
		aiReports:   make(map[int]database.AIReport),
		nextID:      1,
	}
}

func (m *MockRepository) SaveRoutineLog(log database.RoutineLog) (int, error) {
	log.ID = m.nextID
	m.routineLogs[m.nextID] = log
	m.nextID++
	return log.ID, nil
}

func (m *MockRepository) SaveAIReport(report database.AIReport) error {
	m.aiReports[report.RoutineLogID] = report
	return nil
}

func (m *MockRepository) GetRoutineLogWithAIReport(logID int) (*database.InsightResponse, error) {
	log, exists := m.routineLogs[logID]
	if !exists {
		return nil, errors.New("routine log not found")
	}

	aiReport, exists := m.aiReports[logID]
	if !exists {
		return nil, errors.New("AI report not found")
	}

	return &database.InsightResponse{
		RoutineLog: log,
		AIReport:   aiReport,
	}, nil
}

func (m *MockRepository) GetRoutineLogsByUser(userID uuid.UUID, limit int) ([]database.RoutineLog, error) {
	var logs []database.RoutineLog
	count := 0
	for _, log := range m.routineLogs {
		if log.UserID == userID && count < limit {
			logs = append(logs, log)
			count++
		}
	}
	return logs, nil
}

// Mock repository interface methods
func (m *MockRepository) CreateUser(user database.User) error {
	return nil
}

func (m *MockRepository) GetUser(userID uuid.UUID) (*database.User, error) {
	return &database.User{ID: userID}, nil
}

func (m *MockRepository) SaveCredential(credData map[string]interface{}) error {
	return nil
}

func (m *MockRepository) GetUserCredentials(userID uuid.UUID) ([]database.Credential, error) {
	return nil, nil
}

func (m *MockRepository) SaveSession(session database.Session) error {
	return nil
}

func (m *MockRepository) GetUserSessions(userID uuid.UUID) ([]database.Session, error) {
	return nil, nil
}

func (m *MockRepository) RevokeSession(sessionID uuid.UUID) error {
	return nil
}

func (m *MockRepository) SaveMobileChallenge(challenge database.MobileChallenge) error {
	return nil
}

func (m *MockRepository) GetMobileChallenge(challengeID uuid.UUID) (*database.MobileChallenge, error) {
	return nil, nil
}

func (m *MockRepository) Ping() error {
	return nil
}

func (m *MockRepository) Close() error {
	return nil
}

// Link token methods
func (m *MockRepository) SaveLinkToken(linkToken database.LinkToken) error {
	return nil
}

func (m *MockRepository) GetLinkTokens() ([]database.LinkToken, error) {
	return nil, nil
}

func (m *MockRepository) GetUserLinkTokens(userID uuid.UUID) ([]database.LinkToken, error) {
	return nil, nil
}

func (m *MockRepository) UpdateLinkToken(linkToken database.LinkToken) error {
	return nil
}

// Mock AI service for testing
type MockAIService struct {
	shouldFail bool
	response   *AIServiceResponse
}

func NewMockAIService(shouldFail bool) *MockAIService {
	return &MockAIService{
		shouldFail: shouldFail,
		response: &AIServiceResponse{
			IsAnomaly:       true,
			ConfidenceScore: 0.85,
			AnomalyType:     "test_anomaly",
			Recommendations: []string{"Test recommendation"},
			Timestamp:       time.Now().Format(time.RFC3339),
		},
	}
}

func (m *MockAIService) AnalyzeRoutine(routineLog database.RoutineLog) (*AIServiceResponse, error) {
	if m.shouldFail {
		return nil, errors.New("AI service error")
	}
	return m.response, nil
}

func (m *MockAIService) AnalyzeRoutineWithHistory(routineLog database.RoutineLog, historicalData []database.RoutineLog) (*AIServiceResponse, error) {
	if m.shouldFail {
		return nil, errors.New("AI service error")
	}
	return m.response, nil
}

func (m *MockAIService) CheckHealth() error {
	if m.shouldFail {
		return errors.New("AI service unhealthy")
	}
	return nil
}

func TestNewRoutineService(t *testing.T) {
	mockRepo := NewMockRepository()
	mockAI := NewMockAIService(false)

	service := NewRoutineService(mockRepo, mockAI)
	assert.NotNil(t, service)
	assert.Equal(t, mockRepo, service.repo)
	assert.Equal(t, mockAI, service.aiService)
}

func TestCreateRoutineLog(t *testing.T) {
	mockRepo := NewMockRepository()
	mockAI := NewMockAIService(false)
	service := NewRoutineService(mockRepo, mockAI)

	userID := uuid.New()
	routineLog := database.RoutineLog{
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

	response, err := service.CreateRoutineLog(routineLog)
	require.NoError(t, err)
	assert.NotNil(t, response)
	assert.Greater(t, response.LogID, 0)
	assert.Equal(t, userID, response.UserID)
	assert.NotEmpty(t, response.Message)
}

func TestCreateRoutineLogWithDefaultValues(t *testing.T) {
	mockRepo := NewMockRepository()
	mockAI := NewMockAIService(false)
	service := NewRoutineService(mockRepo, mockAI)

	routineLog := database.RoutineLog{
		SleepHours:       8.0,
		MealTimes:        []string{"07:30", "12:00", "18:30"},
		ScreenTime:       4.5,
		ExerciseDuration: 1.0,
		WakeUpTime:       "07:00",
		BedTime:          "23:00",
		WaterIntake:      2.5,
		StressLevel:      4,
		// LogDate and UserID not set
	}

	response, err := service.CreateRoutineLog(routineLog)
	require.NoError(t, err)
	assert.Greater(t, response.LogID, 0)

	// Check that default values were set
	savedLog := mockRepo.routineLogs[response.LogID]
	assert.NotEqual(t, uuid.Nil, savedLog.UserID)
	assert.NotEmpty(t, savedLog.LogDate)
}

func TestCreateRoutineLogWithAIFailure(t *testing.T) {
	mockRepo := NewMockRepository()
	mockAI := NewMockAIService(true) // AI service will fail
	service := NewRoutineService(mockRepo, mockAI)

	userID := uuid.New()
	routineLog := database.RoutineLog{
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

	response, err := service.CreateRoutineLog(routineLog)
	require.NoError(t, err) // AI failure should be handled gracefully
	assert.NotNil(t, response)
	assert.Greater(t, response.LogID, 0)
}

func TestGetInsight(t *testing.T) {
	mockRepo := NewMockRepository()
	mockAI := NewMockAIService(false)
	service := NewRoutineService(mockRepo, mockAI)

	userID := uuid.New()
	// Create a routine log and AI report in the mock repository
	routineLog := database.RoutineLog{
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
	}

	aiReport := database.AIReport{
		ID:                 1,
		RoutineLogID:       1,
		IsAnomaly:          true,
		ConfidenceScore:    0.85,
		AnomalyType:        "test_anomaly",
		Recommendations:    []string{"Test recommendation"},
		AIServiceResponse:  `{"test": "response"}`,
		DriftAnalysis:      []byte(`{"drift": "analysis"}`),
		BaselineComparison: []byte(`{"baseline": "comparison"}`),
		ModelVersion:       "1.0.0",
	}

	mockRepo.routineLogs[1] = routineLog
	mockRepo.aiReports[1] = aiReport

	insight, err := service.GetInsight(1)
	require.NoError(t, err)
	assert.NotNil(t, insight)
	assert.Equal(t, 1, insight.RoutineLog.ID)
	assert.Equal(t, 1, insight.AIReport.RoutineLogID)
}

func TestGetInsightNotFound(t *testing.T) {
	mockRepo := NewMockRepository()
	mockAI := NewMockAIService(false)
	service := NewRoutineService(mockRepo, mockAI)

	_, err := service.GetInsight(999)
	assert.Error(t, err)
}

func TestGetUserRoutineLogs(t *testing.T) {
	mockRepo := NewMockRepository()
	mockAI := NewMockAIService(false)
	service := NewRoutineService(mockRepo, mockAI)

	userID := uuid.New()
	// Create multiple logs for user
	for i := 0; i < 3; i++ {
		routineLog := database.RoutineLog{
			ID:               i + 1,
			UserID:           userID,
			SleepHours:       8.0 + float64(i),
			MealTimes:        []string{"07:30", "12:00", "18:30"},
			ScreenTime:       4.5,
			ExerciseDuration: 1.0,
			WakeUpTime:       "07:00",
			BedTime:          "23:00",
			WaterIntake:      2.5,
			StressLevel:      4,
			LogDate:          "2024-01-15",
		}
		mockRepo.routineLogs[i+1] = routineLog
	}

	// Create one log for different user
	otherUserID := uuid.New()
	routineLog := database.RoutineLog{
		ID:               4,
		UserID:           otherUserID,
		SleepHours:       7.0,
		MealTimes:        []string{"08:00", "13:00", "19:00"},
		ScreenTime:       5.0,
		ExerciseDuration: 0.5,
		WakeUpTime:       "07:30",
		BedTime:          "22:30",
		WaterIntake:      2.0,
		StressLevel:      6,
		LogDate:          "2024-01-15",
	}
	mockRepo.routineLogs[4] = routineLog

	logs, err := service.GetUserRoutineLogs(userID, 10)
	require.NoError(t, err)
	assert.Len(t, logs, 3)

	// Verify all logs belong to user
	for _, log := range logs {
		assert.Equal(t, userID, log.UserID)
	}
}

func TestGetUserRoutineLogsWithLimit(t *testing.T) {
	mockRepo := NewMockRepository()
	mockAI := NewMockAIService(false)
	service := NewRoutineService(mockRepo, mockAI)

	userID := uuid.New()
	// Create multiple logs for user
	for i := 0; i < 5; i++ {
		routineLog := database.RoutineLog{
			ID:               i + 1,
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
		mockRepo.routineLogs[i+1] = routineLog
	}

	logs, err := service.GetUserRoutineLogs(userID, 3)
	require.NoError(t, err)
	assert.Len(t, logs, 3)
}

func TestGetUserInsights(t *testing.T) {
	mockRepo := NewMockRepository()
	mockAI := NewMockAIService(false)
	service := NewRoutineService(mockRepo, mockAI)

	userID := uuid.New()
	// Create multiple logs with AI reports for user
	for i := 0; i < 3; i++ {
		logID := i + 1
		routineLog := database.RoutineLog{
			ID:               logID,
			UserID:           userID,
			SleepHours:       8.0 + float64(i),
			MealTimes:        []string{"07:30", "12:00", "18:30"},
			ScreenTime:       4.5,
			ExerciseDuration: 1.0,
			WakeUpTime:       "07:00",
			BedTime:          "23:00",
			WaterIntake:      2.5,
			StressLevel:      4,
			LogDate:          "2024-01-15",
		}

		aiReport := database.AIReport{
			ID:                 logID,
			RoutineLogID:       logID,
			IsAnomaly:          true,
			ConfidenceScore:    0.85 + float64(i)*0.05,
			AnomalyType:        "test_anomaly",
			Recommendations:    []string{"Test recommendation"},
			AIServiceResponse:  `{"test": "response"}`,
			DriftAnalysis:      []byte(`{"drift": "analysis"}`),
			BaselineComparison: []byte(`{"baseline": "comparison"}`),
			ModelVersion:       "1.0.0",
		}

		mockRepo.routineLogs[logID] = routineLog
		mockRepo.aiReports[logID] = aiReport
	}

	insights, err := service.GetUserInsights(userID, 10)
	require.NoError(t, err)
	assert.Len(t, insights, 3)

	// Verify all insights belong to user
	for _, insight := range insights {
		assert.Equal(t, userID, insight.RoutineLog.UserID)
		assert.NotNil(t, insight.AIReport)
	}
}

func TestGetUserInsightsWithLimit(t *testing.T) {
	mockRepo := NewMockRepository()
	mockAI := NewMockAIService(false)
	service := NewRoutineService(mockRepo, mockAI)

	userID := uuid.New()
	// Create multiple logs with AI reports for user
	for i := 0; i < 5; i++ {
		logID := i + 1
		routineLog := database.RoutineLog{
			ID:               logID,
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

		aiReport := database.AIReport{
			ID:                 logID,
			RoutineLogID:       logID,
			IsAnomaly:          true,
			ConfidenceScore:    0.85,
			AnomalyType:        "test_anomaly",
			Recommendations:    []string{"Test recommendation"},
			AIServiceResponse:  `{"test": "response"}`,
			DriftAnalysis:      []byte(`{"drift": "analysis"}`),
			BaselineComparison: []byte(`{"baseline": "comparison"}`),
			ModelVersion:       "1.0.0",
		}

		mockRepo.routineLogs[logID] = routineLog
		mockRepo.aiReports[logID] = aiReport
	}

	insights, err := service.GetUserInsights(userID, 3)
	require.NoError(t, err)
	assert.Len(t, insights, 3)
}

func TestCreateRoutineLogResponseStructure(t *testing.T) {
	response := CreateRoutineLogResponse{
		LogID:      123,
		UserID:     uuid.New(),
		AIResponse: &AIServiceResponse{IsAnomaly: true},
		Message:    "Routine log created successfully",
	}

	assert.Greater(t, response.LogID, 0)
	assert.NotEqual(t, uuid.Nil, response.UserID)
	assert.NotNil(t, response.AIResponse)
	assert.NotEmpty(t, response.Message)
}

func TestRoutineServiceEdgeCases(t *testing.T) {
	mockRepo := NewMockRepository()
	mockAI := NewMockAIService(false)
	service := NewRoutineService(mockRepo, mockAI)

	// Test with empty routine log
	emptyLog := database.RoutineLog{}
	response, err := service.CreateRoutineLog(emptyLog)
	require.NoError(t, err)
	assert.NotNil(t, response)

	// Test with zero values
	zeroLog := database.RoutineLog{
		UserID:           uuid.New(),
		SleepHours:       0.0,
		ScreenTime:       0.0,
		ExerciseDuration: 0.0,
		WaterIntake:      0.0,
		StressLevel:      0,
		MealTimes:        []string{},
		WakeUpTime:       "",
		BedTime:          "",
		LogDate:          "",
	}

	response, err = service.CreateRoutineLog(zeroLog)
	require.NoError(t, err)
	assert.NotNil(t, response)
}

func TestRoutineServiceErrorHandling(t *testing.T) {
	mockRepo := NewMockRepository()
	mockAI := NewMockAIService(true) // AI service will fail
	service := NewRoutineService(mockRepo, mockAI)

	userID := uuid.New()
	routineLog := database.RoutineLog{
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

	// Should not fail even if AI service fails
	response, err := service.CreateRoutineLog(routineLog)
	require.NoError(t, err)
	assert.NotNil(t, response)
	assert.Greater(t, response.LogID, 0)
}
