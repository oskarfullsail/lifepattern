package services

import (
	"errors"
	"testing"
	"time"

	"lifepattern-api/internal/database"
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

func (m *MockRepository) GetRoutineLogsByUser(userID int, limit int) ([]database.RoutineLog, error) {
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

func (m *MockRepository) Ping() error {
	return nil
}

func (m *MockRepository) Close() error {
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
	if service == nil {
		t.Fatal("Expected service to be created")
	}

	if service.repo != mockRepo {
		t.Fatal("Expected repository to be set")
	}

	if service.aiService != mockAI {
		t.Fatal("Expected AI service to be set")
	}
}

func TestCreateRoutineLog(t *testing.T) {
	mockRepo := NewMockRepository()
	mockAI := NewMockAIService(false)
	service := NewRoutineService(mockRepo, mockAI)

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

	response, err := service.CreateRoutineLog(routineLog)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if response == nil {
		t.Fatal("Expected response, got nil")
	}

	if response.LogID <= 0 {
		t.Fatalf("Expected positive log ID, got %d", response.LogID)
	}

	if !response.HasAI {
		t.Fatal("Expected AI analysis to be performed")
	}

	if response.AIResult == nil {
		t.Fatal("Expected AI result, got nil")
	}

	if !response.AIResult.IsAnomaly {
		t.Fatal("Expected anomaly to be true")
	}
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
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if response.LogID <= 0 {
		t.Fatalf("Expected positive log ID, got %d", response.LogID)
	}

	// Check that default values were set
	savedLog := mockRepo.routineLogs[response.LogID]
	if savedLog.UserID != 1 {
		t.Fatalf("Expected default user ID 1, got %d", savedLog.UserID)
	}

	if savedLog.LogDate == "" {
		t.Fatal("Expected log date to be set")
	}
}

func TestCreateRoutineLogWithAIFailure(t *testing.T) {
	mockRepo := NewMockRepository()
	mockAI := NewMockAIService(true) // AI service will fail
	service := NewRoutineService(mockRepo, mockAI)

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

	response, err := service.CreateRoutineLog(routineLog)
	if err != nil {
		t.Fatalf("Expected no error (AI failure should be handled gracefully), got %v", err)
	}

	if response == nil {
		t.Fatal("Expected response, got nil")
	}

	if response.HasAI {
		t.Fatal("Expected AI analysis to be marked as failed")
	}

	if response.AIResult != nil {
		t.Fatal("Expected no AI result when AI service fails")
	}
}

func TestGetInsight(t *testing.T) {
	mockRepo := NewMockRepository()
	mockAI := NewMockAIService(false)
	service := NewRoutineService(mockRepo, mockAI)

	// Create a routine log and AI report in the mock repository
	routineLog := database.RoutineLog{
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
	}

	aiReport := database.AIReport{
		ID:                1,
		RoutineLogID:      1,
		IsAnomaly:         true,
		ConfidenceScore:   0.85,
		AnomalyType:       "test_anomaly",
		Recommendations:   []string{"Test recommendation"},
		AIServiceResponse: `{"test": "response"}`,
	}

	mockRepo.routineLogs[1] = routineLog
	mockRepo.aiReports[1] = aiReport

	insight, err := service.GetInsight(1)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if insight == nil {
		t.Fatal("Expected insight, got nil")
	}

	if insight.RoutineLog.ID != 1 {
		t.Fatalf("Expected routine log ID 1, got %d", insight.RoutineLog.ID)
	}

	if insight.AIReport.RoutineLogID != 1 {
		t.Fatalf("Expected AI report log ID 1, got %d", insight.AIReport.RoutineLogID)
	}
}

func TestGetInsightNotFound(t *testing.T) {
	mockRepo := NewMockRepository()
	mockAI := NewMockAIService(false)
	service := NewRoutineService(mockRepo, mockAI)

	_, err := service.GetInsight(999)
	if err == nil {
		t.Fatal("Expected error for non-existent insight")
	}
}

func TestGetUserRoutineLogs(t *testing.T) {
	mockRepo := NewMockRepository()
	mockAI := NewMockAIService(false)
	service := NewRoutineService(mockRepo, mockAI)

	// Create multiple logs for user 1
	for i := 0; i < 3; i++ {
		routineLog := database.RoutineLog{
			ID:               i + 1,
			UserID:           1,
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

	// Create one log for user 2
	routineLog := database.RoutineLog{
		ID:               4,
		UserID:           2,
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

	logs, err := service.GetUserRoutineLogs(1, 10)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if len(logs) != 3 {
		t.Fatalf("Expected 3 logs for user 1, got %d", len(logs))
	}

	// Verify all logs belong to user 1
	for _, log := range logs {
		if log.UserID != 1 {
			t.Fatalf("Expected user ID 1, got %d", log.UserID)
		}
	}
}

func TestGetUserRoutineLogsWithLimit(t *testing.T) {
	mockRepo := NewMockRepository()
	mockAI := NewMockAIService(false)
	service := NewRoutineService(mockRepo, mockAI)

	// Create multiple logs for user 1
	for i := 0; i < 5; i++ {
		routineLog := database.RoutineLog{
			ID:               i + 1,
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
		mockRepo.routineLogs[i+1] = routineLog
	}

	logs, err := service.GetUserRoutineLogs(1, 3)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if len(logs) != 3 {
		t.Fatalf("Expected 3 logs with limit, got %d", len(logs))
	}
}
