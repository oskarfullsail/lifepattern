package database

import (
	"os"
	"testing"

	_ "github.com/lib/pq"
)

var testRepo *Repository

func TestMain(m *testing.M) {
	// Setup test database
	testDBURL := os.Getenv("TEST_DATABASE_URL")
	if testDBURL == "" {
		testDBURL = "postgres://postgres:password@localhost:5432/lifepattern_test?sslmode=disable"
	}

	var err error
	testRepo, err = NewRepository(testDBURL)
	if err != nil {
		panic("Failed to connect to test database: " + err.Error())
	}

	// Run tests
	code := m.Run()

	// Cleanup
	testRepo.Close()
	os.Exit(code)
}

func TestNewRepository(t *testing.T) {
	// Test successful connection
	repo, err := NewRepository("postgres://postgres:password@localhost:5432/lifepattern_test?sslmode=disable")
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	defer repo.Close()

	// Test ping
	if err := repo.Ping(); err != nil {
		t.Fatalf("Expected ping to succeed, got %v", err)
	}
}

func TestSaveRoutineLog(t *testing.T) {
	routineLog := RoutineLog{
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

	id, err := testRepo.SaveRoutineLog(routineLog)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if id <= 0 {
		t.Fatalf("Expected positive ID, got %d", id)
	}
}

func TestSaveAIReport(t *testing.T) {
	// First create a routine log
	routineLog := RoutineLog{
		UserID:           1,
		SleepHours:       7.5,
		MealTimes:        []string{"08:00", "13:00", "19:00"},
		ScreenTime:       5.0,
		ExerciseDuration: 0.5,
		WakeUpTime:       "07:30",
		BedTime:          "22:30",
		WaterIntake:      2.0,
		StressLevel:      6,
		LogDate:          "2024-01-16",
	}

	logID, err := testRepo.SaveRoutineLog(routineLog)
	if err != nil {
		t.Fatalf("Failed to save routine log: %v", err)
	}

	// Create AI report
	aiReport := AIReport{
		RoutineLogID:      logID,
		IsAnomaly:         true,
		ConfidenceScore:   0.85,
		AnomalyType:       "high_screen_time",
		Recommendations:   []string{"Reduce screen time", "Take more breaks"},
		AIServiceResponse: `{"is_anomaly": true, "confidence": 0.85}`,
	}

	err = testRepo.SaveAIReport(aiReport)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
}

func TestGetRoutineLogWithAIReport(t *testing.T) {
	// First create a routine log and AI report
	routineLog := RoutineLog{
		UserID:           1,
		SleepHours:       6.0,
		MealTimes:        []string{"07:00", "12:30", "18:00"},
		ScreenTime:       6.0,
		ExerciseDuration: 0.0,
		WakeUpTime:       "06:30",
		BedTime:          "00:30",
		WaterIntake:      1.5,
		StressLevel:      8,
		LogDate:          "2024-01-17",
	}

	logID, err := testRepo.SaveRoutineLog(routineLog)
	if err != nil {
		t.Fatalf("Failed to save routine log: %v", err)
	}

	aiReport := AIReport{
		RoutineLogID:      logID,
		IsAnomaly:         true,
		ConfidenceScore:   0.92,
		AnomalyType:       "sleep_deprivation",
		Recommendations:   []string{"Get more sleep", "Reduce stress"},
		AIServiceResponse: `{"is_anomaly": true, "confidence": 0.92}`,
	}

	err = testRepo.SaveAIReport(aiReport)
	if err != nil {
		t.Fatalf("Failed to save AI report: %v", err)
	}

	// Test retrieval
	insight, err := testRepo.GetRoutineLogWithAIReport(logID)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if insight.RoutineLog.ID != logID {
		t.Fatalf("Expected log ID %d, got %d", logID, insight.RoutineLog.ID)
	}

	if insight.AIReport.RoutineLogID != logID {
		t.Fatalf("Expected AI report log ID %d, got %d", logID, insight.AIReport.RoutineLogID)
	}

	if !insight.AIReport.IsAnomaly {
		t.Fatalf("Expected anomaly to be true")
	}

	if insight.AIReport.ConfidenceScore != 0.92 {
		t.Fatalf("Expected confidence score 0.92, got %f", insight.AIReport.ConfidenceScore)
	}
}

func TestGetRoutineLogsByUser(t *testing.T) {
	// Create multiple logs for user 1
	for i := 0; i < 3; i++ {
		routineLog := RoutineLog{
			UserID:           1,
			SleepHours:       7.0 + float64(i),
			MealTimes:        []string{"08:00", "13:00", "19:00"},
			ScreenTime:       4.0 + float64(i),
			ExerciseDuration: 1.0,
			WakeUpTime:       "07:00",
			BedTime:          "23:00",
			WaterIntake:      2.0,
			StressLevel:      5,
			LogDate:          "2024-01-18",
		}

		_, err := testRepo.SaveRoutineLog(routineLog)
		if err != nil {
			t.Fatalf("Failed to save routine log: %v", err)
		}
	}

	// Test retrieval
	logs, err := testRepo.GetRoutineLogsByUser(1, 10)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if len(logs) < 3 {
		t.Fatalf("Expected at least 3 logs, got %d", len(logs))
	}

	// Verify all logs belong to user 1
	for _, log := range logs {
		if log.UserID != 1 {
			t.Fatalf("Expected user ID 1, got %d", log.UserID)
		}
	}
}

func TestGetRoutineLogsByUserWithLimit(t *testing.T) {
	// Test with limit
	logs, err := testRepo.GetRoutineLogsByUser(1, 2)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	if len(logs) > 2 {
		t.Fatalf("Expected at most 2 logs, got %d", len(logs))
	}
}

func TestGetRoutineLogWithAIReportNotFound(t *testing.T) {
	_, err := testRepo.GetRoutineLogWithAIReport(99999)
	if err == nil {
		t.Fatalf("Expected error for non-existent log")
	}
}

func TestPing(t *testing.T) {
	err := testRepo.Ping()
	if err != nil {
		t.Fatalf("Expected ping to succeed, got %v", err)
	}
}
