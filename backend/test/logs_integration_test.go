package test

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"lifepattern-api/internal/database"
	"lifepattern-api/internal/handlers"
	"lifepattern-api/internal/services"

	"github.com/google/uuid"
	_ "github.com/lib/pq"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestCreateRoutineLog_Success tests successful routine log creation
func TestCreateRoutineLog_Success(t *testing.T) {
	// Setup
	db := setupTestDB(t)
	defer db.Close()

	routineService := services.NewRoutineService(database.NewRoutineRepository(db))
	logHandler := handlers.NewLogHandler(routineService)

	// Create a test user first
	userID := createTestUser(t, db)

	// Prepare request payload
	payload := database.RoutineLog{
		UserID:           userID,
		SleepHours:       7.5,
		MealTimes:        database.JSONStringArray{"08:00", "12:30", "19:00"},
		ScreenTime:       5.0,
		ExerciseDuration: 1.5,
		WakeUpTime:       "07:00",
		BedTime:          "23:00",
		WaterIntake:      2.5,
		StressLevel:      5,
		LogDate:          time.Now().Format("2006-01-02"),
	}

	body, err := json.Marshal(payload)
	require.NoError(t, err)

	// Create request
	req := httptest.NewRequest(http.MethodPost, "/api/log", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	// Execute
	logHandler.CreateRoutineLog(w, req)

	// Assert
	assert.Equal(t, http.StatusCreated, w.Code, "Expected 201 Created status")

	var response map[string]interface{}
	err = json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Contains(t, response, "routine_log", "Response should contain routine_log")
	assert.Contains(t, response, "ai_report", "Response should contain ai_report")

	routineLog := response["routine_log"].(map[string]interface{})
	assert.NotZero(t, routineLog["id"], "Routine log ID should be set")
	assert.Equal(t, userID.String(), routineLog["user_id"], "User ID should match")
	assert.Equal(t, 7.5, routineLog["sleep_hours"], "Sleep hours should match")
	assert.Equal(t, 5.0, routineLog["screen_time"], "Screen time should match")

	t.Logf("✅ CreateRoutineLog_Success: Log created with ID %v", routineLog["id"])
}

// TestCreateRoutineLog_InvalidPayload tests handling of invalid request payload
func TestCreateRoutineLog_InvalidPayload(t *testing.T) {
	// Setup
	db := setupTestDB(t)
	defer db.Close()

	routineService := services.NewRoutineService(database.NewRoutineRepository(db))
	logHandler := handlers.NewLogHandler(routineService)

	// Invalid JSON
	req := httptest.NewRequest(http.MethodPost, "/api/log", bytes.NewReader([]byte("invalid json")))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	// Execute
	logHandler.CreateRoutineLog(w, req)

	// Assert
	assert.Equal(t, http.StatusBadRequest, w.Code, "Expected 400 Bad Request for invalid JSON")
	t.Logf("✅ CreateRoutineLog_InvalidPayload: Correctly rejected invalid JSON")
}

// TestCreateRoutineLog_MissingUserID tests handling of missing user ID
func TestCreateRoutineLog_MissingUserID(t *testing.T) {
	// Setup
	db := setupTestDB(t)
	defer db.Close()

	routineService := services.NewRoutineService(database.NewRoutineRepository(db))
	logHandler := handlers.NewLogHandler(routineService)

	// Payload without user_id
	payload := map[string]interface{}{
		"sleep_hours":       7.5,
		"meal_times":        []string{"08:00"},
		"screen_time":       5.0,
		"exercise_duration": 1.5,
		"wake_up_time":      "07:00",
		"bed_time":          "23:00",
		"water_intake":      2.5,
		"stress_level":      5,
		"log_date":          time.Now().Format("2006-01-02"),
	}

	body, err := json.Marshal(payload)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodPost, "/api/log", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	// Execute
	logHandler.CreateRoutineLog(w, req)

	// Assert
	assert.Equal(t, http.StatusInternalServerError, w.Code, "Expected 500 for missing user_id")
	t.Logf("✅ CreateRoutineLog_MissingUserID: Correctly handled missing user ID")
}

// TestCreateRoutineLog_InvalidDataTypes tests handling of invalid data types
func TestCreateRoutineLog_InvalidDataTypes(t *testing.T) {
	// Setup
	db := setupTestDB(t)
	defer db.Close()

	routineService := services.NewRoutineService(database.NewRoutineRepository(db))
	logHandler := handlers.NewLogHandler(routineService)

	userID := createTestUser(t, db)

	// Test cases with invalid data
	testCases := []struct {
		name    string
		payload map[string]interface{}
	}{
		{
			name: "negative_sleep_hours",
			payload: map[string]interface{}{
				"user_id":           userID.String(),
				"sleep_hours":       -1.0,
				"meal_times":        []string{"08:00"},
				"screen_time":       5.0,
				"exercise_duration": 1.5,
				"wake_up_time":      "07:00",
				"bed_time":          "23:00",
				"water_intake":      2.5,
				"stress_level":      5,
				"log_date":          time.Now().Format("2006-01-02"),
			},
		},
		{
			name: "stress_level_out_of_range",
			payload: map[string]interface{}{
				"user_id":           userID.String(),
				"sleep_hours":       7.5,
				"meal_times":        []string{"08:00"},
				"screen_time":       5.0,
				"exercise_duration": 1.5,
				"wake_up_time":      "07:00",
				"bed_time":          "23:00",
				"water_intake":      2.5,
				"stress_level":      15, // Should be 1-10
				"log_date":          time.Now().Format("2006-01-02"),
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			body, err := json.Marshal(tc.payload)
			require.NoError(t, err)

			req := httptest.NewRequest(http.MethodPost, "/api/log", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			logHandler.CreateRoutineLog(w, req)

			assert.Equal(t, http.StatusInternalServerError, w.Code, fmt.Sprintf("Test case %s should fail", tc.name))
			t.Logf("✅ %s: Correctly rejected invalid data", tc.name)
		})
	}
}

// TestGetUserRoutineLogs_Success tests successful retrieval of user logs
func TestGetUserRoutineLogs_Success(t *testing.T) {
	// Setup
	db := setupTestDB(t)
	defer db.Close()

	routineService := services.NewRoutineService(database.NewRoutineRepository(db))
	logHandler := handlers.NewLogHandler(routineService)

	userID := createTestUser(t, db)

	// Create some test logs
	for i := 0; i < 3; i++ {
		log := database.RoutineLog{
			UserID:           userID,
			SleepHours:       7.0 + float64(i)*0.5,
			MealTimes:        database.JSONStringArray{"08:00", "12:00", "18:00"},
			ScreenTime:       5.0,
			ExerciseDuration: 1.0,
			WakeUpTime:       "07:00",
			BedTime:          "23:00",
			WaterIntake:      2.0,
			StressLevel:      5,
			LogDate:          time.Now().AddDate(0, 0, -i).Format("2006-01-02"),
		}

		_, err := routineService.CreateRoutineLog(log)
		require.NoError(t, err)
	}

	// Create request
	req := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/logs?user_id=%s&limit=10", userID.String()), nil)
	w := httptest.NewRecorder()

	// Execute
	logHandler.GetUserRoutineLogs(w, req)

	// Assert
	assert.Equal(t, http.StatusOK, w.Code, "Expected 200 OK")

	var logs []database.RoutineLog
	err := json.Unmarshal(w.Body.Bytes(), &logs)
	require.NoError(t, err)

	assert.Len(t, logs, 3, "Should return 3 logs")
	assert.Equal(t, 7.0, logs[0].SleepHours, "First log sleep hours should match")

	t.Logf("✅ GetUserRoutineLogs_Success: Retrieved %d logs", len(logs))
}

// TestGetUserRoutineLogs_MissingUserID tests handling of missing user_id parameter
func TestGetUserRoutineLogs_MissingUserID(t *testing.T) {
	// Setup
	db := setupTestDB(t)
	defer db.Close()

	routineService := services.NewRoutineService(database.NewRoutineRepository(db))
	logHandler := handlers.NewLogHandler(routineService)

	// Request without user_id
	req := httptest.NewRequest(http.MethodGet, "/api/logs", nil)
	w := httptest.NewRecorder()

	// Execute
	logHandler.GetUserRoutineLogs(w, req)

	// Assert
	assert.Equal(t, http.StatusBadRequest, w.Code, "Expected 400 Bad Request")
	t.Logf("✅ GetUserRoutineLogs_MissingUserID: Correctly rejected request without user_id")
}

// TestGetUserRoutineLogs_InvalidUserID tests handling of invalid user_id format
func TestGetUserRoutineLogs_InvalidUserID(t *testing.T) {
	// Setup
	db := setupTestDB(t)
	defer db.Close()

	routineService := services.NewRoutineService(database.NewRoutineRepository(db))
	logHandler := handlers.NewLogHandler(routineService)

	// Request with invalid UUID
	req := httptest.NewRequest(http.MethodGet, "/api/logs?user_id=invalid-uuid", nil)
	w := httptest.NewRecorder()

	// Execute
	logHandler.GetUserRoutineLogs(w, req)

	// Assert
	assert.Equal(t, http.StatusBadRequest, w.Code, "Expected 400 Bad Request for invalid UUID")
	t.Logf("✅ GetUserRoutineLogs_InvalidUserID: Correctly rejected invalid UUID")
}

// TestGetUserRoutineLogs_WithLimit tests the limit parameter
func TestGetUserRoutineLogs_WithLimit(t *testing.T) {
	// Setup
	db := setupTestDB(t)
	defer db.Close()

	routineService := services.NewRoutineService(database.NewRoutineRepository(db))
	logHandler := handlers.NewLogHandler(routineService)

	userID := createTestUser(t, db)

	// Create 5 test logs
	for i := 0; i < 5; i++ {
		log := database.RoutineLog{
			UserID:           userID,
			SleepHours:       7.0,
			MealTimes:        database.JSONStringArray{"08:00"},
			ScreenTime:       5.0,
			ExerciseDuration: 1.0,
			WakeUpTime:       "07:00",
			BedTime:          "23:00",
			WaterIntake:      2.0,
			StressLevel:      5,
			LogDate:          time.Now().AddDate(0, 0, -i).Format("2006-01-02"),
		}

		_, err := routineService.CreateRoutineLog(log)
		require.NoError(t, err)
	}

	// Request with limit=2
	req := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/logs?user_id=%s&limit=2", userID.String()), nil)
	w := httptest.NewRecorder()

	// Execute
	logHandler.GetUserRoutineLogs(w, req)

	// Assert
	assert.Equal(t, http.StatusOK, w.Code, "Expected 200 OK")

	var logs []database.RoutineLog
	err := json.Unmarshal(w.Body.Bytes(), &logs)
	require.NoError(t, err)

	assert.LessOrEqual(t, len(logs), 2, "Should return at most 2 logs")
	t.Logf("✅ GetUserRoutineLogs_WithLimit: Correctly limited to %d logs", len(logs))
}

// TestCreateRoutineLog_MealTimesArray tests that meal_times array is properly handled
func TestCreateRoutineLog_MealTimesArray(t *testing.T) {
	// Setup
	db := setupTestDB(t)
	defer db.Close()

	routineService := services.NewRoutineService(database.NewRoutineRepository(db))
	logHandler := handlers.NewLogHandler(routineService)

	userID := createTestUser(t, db)

	// Test with multiple meal times
	payload := database.RoutineLog{
		UserID:           userID,
		SleepHours:       7.5,
		MealTimes:        database.JSONStringArray{"07:30", "12:00", "15:00", "19:30"},
		ScreenTime:       5.0,
		ExerciseDuration: 1.5,
		WakeUpTime:       "07:00",
		BedTime:          "23:00",
		WaterIntake:      2.5,
		StressLevel:      5,
		LogDate:          time.Now().Format("2006-01-02"),
	}

	body, err := json.Marshal(payload)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodPost, "/api/log", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	// Execute
	logHandler.CreateRoutineLog(w, req)

	// Assert
	assert.Equal(t, http.StatusCreated, w.Code, "Expected 201 Created")

	var response map[string]interface{}
	err = json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	routineLog := response["routine_log"].(map[string]interface{})
	mealTimes := routineLog["meal_times"].([]interface{})
	assert.Len(t, mealTimes, 4, "Should have 4 meal times")

	t.Logf("✅ CreateRoutineLog_MealTimesArray: Meal times array properly stored and retrieved")
}

// Helper function to create a test user
func createTestUser(t *testing.T, db *sql.DB) uuid.UUID {
	userID := uuid.New()
	_, err := db.Exec("INSERT INTO users (id, created_at, last_seen_at) VALUES ($1, NOW(), NOW())", userID)
	require.NoError(t, err, "Failed to create test user")
	return userID
}
