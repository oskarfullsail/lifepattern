package test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"lifepattern-api/internal/database"
	"lifepattern-api/internal/handlers"
	"lifepattern-api/internal/services"
)

// IntegrationTestSetup holds test dependencies
type IntegrationTestSetup struct {
	repo           *database.Repository
	aiService      *services.AIService
	routineService *services.RoutineService
	logHandler     *handlers.LogHandler
	insightHandler *handlers.InsightHandler
	healthHandler  *handlers.HealthHandler
}

func setupIntegrationTest(t *testing.T) *IntegrationTestSetup {
	// Use test database
	testDBURL := os.Getenv("TEST_DATABASE_URL")
	if testDBURL == "" {
		testDBURL = "postgres://postgres:password@localhost:5432/lifepattern_test?sslmode=disable"
	}

	// Initialize repository
	repo, err := database.NewRepository(testDBURL)
	if err != nil {
		t.Fatalf("Failed to initialize test database: %v", err)
	}

	// Initialize AI service (use mock URL for testing)
	aiService := services.NewAIService("http://localhost:9999") // Invalid URL for testing

	// Initialize routine service
	routineService := services.NewRoutineService(repo, aiService)

	// Initialize handlers
	logHandler := handlers.NewLogHandler(routineService)
	insightHandler := handlers.NewInsightHandler(routineService)
	healthHandler := handlers.NewHealthHandler(repo, aiService)

	return &IntegrationTestSetup{
		repo:           repo,
		aiService:      aiService,
		routineService: routineService,
		logHandler:     logHandler,
		insightHandler: insightHandler,
		healthHandler:  healthHandler,
	}
}

func (setup *IntegrationTestSetup) cleanup() {
	if setup.repo != nil {
		setup.repo.Close()
	}
}

func TestIntegrationCreateAndRetrieveRoutineLog(t *testing.T) {
	setup := setupIntegrationTest(t)
	defer setup.cleanup()

	// Create routine log
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

	// Test creating routine log via service
	response, err := setup.routineService.CreateRoutineLog(routineLog)
	if err != nil {
		t.Fatalf("Failed to create routine log: %v", err)
	}

	if response.LogID <= 0 {
		t.Fatalf("Expected positive log ID, got %d", response.LogID)
	}

	// Test retrieving routine log
	logs, err := setup.routineService.GetUserRoutineLogs(1, 10)
	if err != nil {
		t.Fatalf("Failed to retrieve routine logs: %v", err)
	}

	if len(logs) == 0 {
		t.Fatal("Expected at least one routine log")
	}

	// Verify the log was saved correctly
	found := false
	for _, log := range logs {
		if log.UserID == 1 && log.SleepHours == 8.0 {
			found = true
			break
		}
	}

	if !found {
		t.Fatal("Expected to find the created routine log")
	}
}

func TestIntegrationHTTPEndpoints(t *testing.T) {
	setup := setupIntegrationTest(t)
	defer setup.cleanup()

	// Test health endpoint
	req := httptest.NewRequest("GET", "/health", nil)
	w := httptest.NewRecorder()

	setup.healthHandler.HealthCheck(w, req)

	if w.Code != http.StatusServiceUnavailable {
		t.Fatalf("Expected status 503 (AI service down), got %d", w.Code)
	}

	// Test creating routine log via HTTP
	routineLog := database.RoutineLog{
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

	jsonBody, _ := json.Marshal(routineLog)
	req = httptest.NewRequest("POST", "/log", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()

	setup.logHandler.CreateRoutineLog(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("Expected status 201, got %d", w.Code)
	}

	var response services.CreateRoutineLogResponse
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if response.LogID <= 0 {
		t.Fatalf("Expected positive log ID, got %d", response.LogID)
	}

	// Test retrieving logs via HTTP
	req = httptest.NewRequest("GET", fmt.Sprintf("/logs?user_id=1&limit=10"), nil)
	w = httptest.NewRecorder()

	setup.logHandler.GetUserRoutineLogs(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d", w.Code)
	}

	var logsResponse map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &logsResponse); err != nil {
		t.Fatalf("Failed to unmarshal logs response: %v", err)
	}

	if logsResponse["user_id"] != float64(1) {
		t.Fatalf("Expected user ID 1, got %v", logsResponse["user_id"])
	}
}

func TestIntegrationValidation(t *testing.T) {
	setup := setupIntegrationTest(t)
	defer setup.cleanup()

	// Test invalid routine log
	invalidLog := database.RoutineLog{
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

	jsonBody, _ := json.Marshal(invalidLog)
	req := httptest.NewRequest("POST", "/log", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	setup.logHandler.CreateRoutineLog(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("Expected status 400 for invalid data, got %d", w.Code)
	}
}

func TestIntegrationErrorHandling(t *testing.T) {
	setup := setupIntegrationTest(t)
	defer setup.cleanup()

	// Test missing user_id parameter
	req := httptest.NewRequest("GET", "/logs", nil)
	w := httptest.NewRecorder()

	setup.logHandler.GetUserRoutineLogs(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("Expected status 400 for missing user_id, got %d", w.Code)
	}

	// Test invalid user_id parameter
	req = httptest.NewRequest("GET", "/logs?user_id=invalid", nil)
	w = httptest.NewRecorder()

	setup.logHandler.GetUserRoutineLogs(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("Expected status 400 for invalid user_id, got %d", w.Code)
	}

	// Test missing log_id parameter
	req = httptest.NewRequest("GET", "/insights", nil)
	w = httptest.NewRecorder()

	setup.insightHandler.GetInsight(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("Expected status 400 for missing log_id, got %d", w.Code)
	}
}
