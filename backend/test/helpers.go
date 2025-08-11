package test

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"lifepattern-api/internal/database"

	"github.com/google/uuid"
)

// TestDB holds test database connection
var TestDB *sql.DB

// TestRepo holds test repository
var TestRepo *database.Repository

// SetupTestDB initializes test database connection
func SetupTestDB() error {
	// Use test database URL from environment or default
	dbURL := os.Getenv("TEST_DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:password@localhost:5434/lifepattern_test?sslmode=disable"
	}

	var err error
	TestDB, err = sql.Open("postgres", dbURL)
	if err != nil {
		return fmt.Errorf("failed to connect to test database: %w", err)
	}

	// Test connection
	if err := TestDB.Ping(); err != nil {
		return fmt.Errorf("failed to ping test database: %w", err)
	}

	// Create repository
	TestRepo = database.NewRepository(TestDB)

	log.Println("✅ Test database connected")
	return nil
}

// CleanupTestDB cleans up test database
func CleanupTestDB() error {
	if TestDB != nil {
		return TestDB.Close()
	}
	return nil
}

// CreateTestUser creates a test user
func CreateTestUser() (database.User, error) {
	user := database.User{
		ID: uuid.New(),
	}

	err := TestRepo.CreateUser(user)
	if err != nil {
		return database.User{}, fmt.Errorf("failed to create test user: %w", err)
	}

	return user, nil
}

// CreateTestRoutineLog creates a test routine log
func CreateTestRoutineLog(userID uuid.UUID) (database.RoutineLog, error) {
	routineLog := database.RoutineLog{
		UserID:           userID,
		SleepHours:       7.5,
		MealTimes:        []string{"07:30", "12:00", "18:30"},
		ScreenTime:       4.5,
		ExerciseDuration: 1.0,
		WakeUpTime:       "07:00",
		BedTime:          "23:00",
		WaterIntake:      2.5,
		StressLevel:      4,
		LogDate:          "2024-01-15",
	}

	logID, err := TestRepo.SaveRoutineLog(routineLog)
	if err != nil {
		return database.RoutineLog{}, fmt.Errorf("failed to create test routine log: %w", err)
	}

	routineLog.ID = logID
	return routineLog, nil
}

// CleanupTestData cleans up test data
func CleanupTestData() error {
	// Clean up routine logs
	_, err := TestDB.Exec("DELETE FROM routine_logs")
	if err != nil {
		return fmt.Errorf("failed to cleanup routine logs: %w", err)
	}

	// Clean up users
	_, err = TestDB.Exec("DELETE FROM users")
	if err != nil {
		return fmt.Errorf("failed to cleanup users: %w", err)
	}

	log.Println("✅ Test data cleaned up")
	return nil
}
