package database

import (
	"database/sql"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	_ "github.com/lib/pq"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var testRepo *Repository

func TestMain(m *testing.M) {
	// Setup test database
	testDBURL := os.Getenv("TEST_DATABASE_URL")
	if testDBURL == "" {
		testDBURL = "postgres://postgres:password@localhost:5434/lifepattern_test?sslmode=disable"
	}

	// Connect to test database
	db, err := sql.Open("postgres", testDBURL)
	if err != nil {
		panic("Failed to connect to test database: " + err.Error())
	}

	// Test connection
	if err := db.Ping(); err != nil {
		panic("Failed to ping test database: " + err.Error())
	}

	testRepo = NewRepository(db)

	// Run tests
	code := m.Run()

	// Cleanup
	testRepo.Close()
	os.Exit(code)
}

func TestNewRepository(t *testing.T) {
	// Test successful connection
	db, err := sql.Open("postgres", "postgres://postgres:password@localhost:5434/lifepattern_test?sslmode=disable")
	require.NoError(t, err)
	defer db.Close()

	repo := NewRepository(db)
	assert.NotNil(t, repo)

	// Test ping
	err = repo.Ping()
	assert.NoError(t, err)
}

func TestCreateUser(t *testing.T) {
	userID := uuid.New()
	user := User{
		ID:         userID,
		CreatedAt:  time.Now(),
		LastSeenAt: time.Now(),
	}

	err := testRepo.CreateUser(user)
	assert.NoError(t, err)

	// Verify user was created
	retrievedUser, err := testRepo.GetUser(userID)
	assert.NoError(t, err)
	assert.Equal(t, userID, retrievedUser.ID)
}

func TestGetUser(t *testing.T) {
	userID := uuid.New()
	user := User{
		ID:         userID,
		CreatedAt:  time.Now(),
		LastSeenAt: time.Now(),
	}

	err := testRepo.CreateUser(user)
	require.NoError(t, err)

	// Test successful retrieval
	retrievedUser, err := testRepo.GetUser(userID)
	assert.NoError(t, err)
	assert.Equal(t, userID, retrievedUser.ID)

	// Test non-existent user
	nonExistentID := uuid.New()
	_, err = testRepo.GetUser(nonExistentID)
	assert.Error(t, err)
}

func TestSaveCredential(t *testing.T) {
	userID := uuid.New()
	credID := uuid.New()

	credData := map[string]interface{}{
		"id":                 credID,
		"user_id":            userID,
		"public_key":         []byte("test-public-key"),
		"attestation_type":   "none",
		"attestation_source": "test",
		"aaguid":             nil,
		"sign_count":         int64(1),
		"clone_warning":      false,
		"backup_eligible":    false,
		"backup_state":       false,
		"device_type":        "test",
		"device_label":       "Test Device",
		"added_at":           time.Now(),
		"last_used_at":       time.Now(),
	}

	err := testRepo.SaveCredential(credData)
	assert.NoError(t, err)
}

func TestGetUserCredentials(t *testing.T) {
	userID := uuid.New()

	// Create user first
	user := User{
		ID:         userID,
		CreatedAt:  time.Now(),
		LastSeenAt: time.Now(),
	}
	err := testRepo.CreateUser(user)
	require.NoError(t, err)

	// Create credentials
	credID1 := uuid.New()
	credData1 := map[string]interface{}{
		"id":                 credID1,
		"user_id":            userID,
		"public_key":         []byte("test-public-key-1"),
		"attestation_type":   "none",
		"attestation_source": "test",
		"aaguid":             nil,
		"sign_count":         int64(1),
		"clone_warning":      false,
		"backup_eligible":    false,
		"backup_state":       false,
		"device_type":        "test",
		"device_label":       "Test Device 1",
		"added_at":           time.Now(),
		"last_used_at":       time.Now(),
	}

	err = testRepo.SaveCredential(credData1)
	require.NoError(t, err)

	credID2 := uuid.New()
	credData2 := map[string]interface{}{
		"id":                 credID2,
		"user_id":            userID,
		"public_key":         []byte("test-public-key-2"),
		"attestation_type":   "none",
		"attestation_source": "test",
		"aaguid":             nil,
		"sign_count":         int64(2),
		"clone_warning":      false,
		"backup_eligible":    false,
		"backup_state":       false,
		"device_type":        "test",
		"device_label":       "Test Device 2",
		"added_at":           time.Now(),
		"last_used_at":       time.Now(),
	}

	err = testRepo.SaveCredential(credData2)
	require.NoError(t, err)

	// Test retrieval
	credentials, err := testRepo.GetUserCredentials(userID)
	assert.NoError(t, err)
	assert.Len(t, credentials, 2)

	// Verify all credentials belong to the user
	for _, cred := range credentials {
		assert.Equal(t, userID, cred.UserID)
	}
}

func TestSaveSession(t *testing.T) {
	userID := uuid.New()
	sessionID := uuid.New()
	credID := uuid.New()

	session := Session{
		ID:            sessionID,
		UserID:        userID,
		CredID:        &credID,
		RefreshHash:   "test-refresh-hash",
		DeviceLabel:   "Test Device",
		IPFingerprint: "test-ip-fingerprint",
		UserAgentHash: "test-user-agent-hash",
		CreatedAt:     time.Now(),
		LastUsedAt:    time.Now(),
		ExpiresAt:     time.Now().Add(24 * time.Hour),
	}

	err := testRepo.SaveSession(session)
	assert.NoError(t, err)
}

func TestGetUserSessions(t *testing.T) {
	userID := uuid.New()

	// Create user first
	user := User{
		ID:         userID,
		CreatedAt:  time.Now(),
		LastSeenAt: time.Now(),
	}
	err := testRepo.CreateUser(user)
	require.NoError(t, err)

	// Create sessions
	sessionID1 := uuid.New()
	credID1 := uuid.New()
	session1 := Session{
		ID:            sessionID1,
		UserID:        userID,
		CredID:        &credID1,
		RefreshHash:   "test-refresh-hash-1",
		DeviceLabel:   "Test Device 1",
		IPFingerprint: "test-ip-fingerprint-1",
		UserAgentHash: "test-user-agent-hash-1",
		CreatedAt:     time.Now(),
		LastUsedAt:    time.Now(),
		ExpiresAt:     time.Now().Add(24 * time.Hour),
	}

	err = testRepo.SaveSession(session1)
	require.NoError(t, err)

	sessionID2 := uuid.New()
	credID2 := uuid.New()
	session2 := Session{
		ID:            sessionID2,
		UserID:        userID,
		CredID:        &credID2,
		RefreshHash:   "test-refresh-hash-2",
		DeviceLabel:   "Test Device 2",
		IPFingerprint: "test-ip-fingerprint-2",
		UserAgentHash: "test-user-agent-hash-2",
		CreatedAt:     time.Now(),
		LastUsedAt:    time.Now(),
		ExpiresAt:     time.Now().Add(24 * time.Hour),
	}

	err = testRepo.SaveSession(session2)
	require.NoError(t, err)

	// Test retrieval
	sessions, err := testRepo.GetUserSessions(userID)
	assert.NoError(t, err)
	assert.Len(t, sessions, 2)

	// Verify all sessions belong to the user
	for _, session := range sessions {
		assert.Equal(t, userID, session.UserID)
	}
}

func TestRevokeSession(t *testing.T) {
	userID := uuid.New()
	sessionID := uuid.New()
	credID := uuid.New()

	// Create user first
	user := User{
		ID:         userID,
		CreatedAt:  time.Now(),
		LastSeenAt: time.Now(),
	}
	err := testRepo.CreateUser(user)
	require.NoError(t, err)

	// Create session
	session := Session{
		ID:            sessionID,
		UserID:        userID,
		CredID:        &credID,
		RefreshHash:   "test-refresh-hash",
		DeviceLabel:   "Test Device",
		IPFingerprint: "test-ip-fingerprint",
		UserAgentHash: "test-user-agent-hash",
		CreatedAt:     time.Now(),
		LastUsedAt:    time.Now(),
		ExpiresAt:     time.Now().Add(24 * time.Hour),
	}

	err = testRepo.SaveSession(session)
	require.NoError(t, err)

	// Test revocation
	err = testRepo.RevokeSession(sessionID)
	assert.NoError(t, err)

	// Verify session is revoked (should not appear in user sessions)
	sessions, err := testRepo.GetUserSessions(userID)
	assert.NoError(t, err)
	assert.Len(t, sessions, 0)
}

func TestSaveMobileChallenge(t *testing.T) {
	userID := uuid.New()
	challengeID := uuid.New()

	challenge := MobileChallenge{
		ID:        challengeID,
		UserID:    userID,
		Challenge: "test-challenge",
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(5 * time.Minute),
	}

	err := testRepo.SaveMobileChallenge(challenge)
	assert.NoError(t, err)
}

func TestGetMobileChallenge(t *testing.T) {
	userID := uuid.New()
	challengeID := uuid.New()

	challenge := MobileChallenge{
		ID:        challengeID,
		UserID:    userID,
		Challenge: "test-challenge",
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(5 * time.Minute),
	}

	err := testRepo.SaveMobileChallenge(challenge)
	require.NoError(t, err)

	// Test retrieval
	retrievedChallenge, err := testRepo.GetMobileChallenge(challengeID)
	assert.NoError(t, err)
	assert.Equal(t, challengeID, retrievedChallenge.ID)
	assert.Equal(t, userID, retrievedChallenge.UserID)
	assert.Equal(t, "test-challenge", retrievedChallenge.Challenge)

	// Test non-existent challenge
	nonExistentID := uuid.New()
	_, err = testRepo.GetMobileChallenge(nonExistentID)
	assert.Error(t, err)
}

func TestSaveRoutineLog(t *testing.T) {
	userID := uuid.New()

	// Create user first
	user := User{
		ID:         userID,
		CreatedAt:  time.Now(),
		LastSeenAt: time.Now(),
	}
	err := testRepo.CreateUser(user)
	require.NoError(t, err)

	routineLog := RoutineLog{
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

	logID, err := testRepo.SaveRoutineLog(routineLog)
	assert.NoError(t, err)
	assert.Greater(t, logID, 0)
}

func TestSaveAIReport(t *testing.T) {
	userID := uuid.New()

	// Create user first
	user := User{
		ID:         userID,
		CreatedAt:  time.Now(),
		LastSeenAt: time.Now(),
	}
	err := testRepo.CreateUser(user)
	require.NoError(t, err)

	// First create a routine log
	routineLog := RoutineLog{
		UserID:           userID,
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
	require.NoError(t, err)

	// Create AI report
	aiReport := AIReport{
		RoutineLogID:       logID,
		IsAnomaly:          true,
		ConfidenceScore:    0.85,
		AnomalyType:        "high_screen_time",
		Recommendations:    []string{"Reduce screen time", "Take more breaks"},
		AIServiceResponse:  `{"is_anomaly": true, "confidence": 0.85}`,
		DriftAnalysis:      []byte(`{"drift": "analysis"}`),
		BaselineComparison: []byte(`{"baseline": "comparison"}`),
		ModelVersion:       "1.0.0",
	}

	err = testRepo.SaveAIReport(aiReport)
	assert.NoError(t, err)
}

func TestGetRoutineLogWithAIReport(t *testing.T) {
	userID := uuid.New()

	// Create user first
	user := User{
		ID:         userID,
		CreatedAt:  time.Now(),
		LastSeenAt: time.Now(),
	}
	err := testRepo.CreateUser(user)
	require.NoError(t, err)

	// First create a routine log and AI report
	routineLog := RoutineLog{
		UserID:           userID,
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
	require.NoError(t, err)

	aiReport := AIReport{
		RoutineLogID:       logID,
		IsAnomaly:          true,
		ConfidenceScore:    0.92,
		AnomalyType:        "sleep_deprivation",
		Recommendations:    []string{"Get more sleep", "Reduce stress"},
		AIServiceResponse:  `{"is_anomaly": true, "confidence": 0.92}`,
		DriftAnalysis:      []byte(`{"drift": "analysis"}`),
		BaselineComparison: []byte(`{"baseline": "comparison"}`),
		ModelVersion:       "1.0.0",
	}

	err = testRepo.SaveAIReport(aiReport)
	require.NoError(t, err)

	// Test retrieval
	insight, err := testRepo.GetRoutineLogWithAIReport(logID)
	assert.NoError(t, err)
	assert.Equal(t, logID, insight.RoutineLog.ID)
	assert.Equal(t, logID, insight.AIReport.RoutineLogID)
	assert.True(t, insight.AIReport.IsAnomaly)
	assert.Equal(t, 0.92, insight.AIReport.ConfidenceScore)
}

func TestGetRoutineLogsByUser(t *testing.T) {
	userID := uuid.New()

	// Create user first
	user := User{
		ID:         userID,
		CreatedAt:  time.Now(),
		LastSeenAt: time.Now(),
	}
	err := testRepo.CreateUser(user)
	require.NoError(t, err)

	// Create multiple logs for user
	for i := 0; i < 3; i++ {
		routineLog := RoutineLog{
			UserID:           userID,
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
		require.NoError(t, err)
	}

	// Test retrieval
	logs, err := testRepo.GetRoutineLogsByUser(userID, 10)
	assert.NoError(t, err)
	assert.Len(t, logs, 3)

	// Verify all logs belong to user
	for _, log := range logs {
		assert.Equal(t, userID, log.UserID)
	}
}

func TestGetRoutineLogsByUserWithLimit(t *testing.T) {
	userID := uuid.New()

	// Create user first
	user := User{
		ID:         userID,
		CreatedAt:  time.Now(),
		LastSeenAt: time.Now(),
	}
	err := testRepo.CreateUser(user)
	require.NoError(t, err)

	// Create multiple logs for user
	for i := 0; i < 5; i++ {
		routineLog := RoutineLog{
			UserID:           userID,
			SleepHours:       7.0,
			MealTimes:        []string{"08:00", "13:00", "19:00"},
			ScreenTime:       4.0,
			ExerciseDuration: 1.0,
			WakeUpTime:       "07:00",
			BedTime:          "23:00",
			WaterIntake:      2.0,
			StressLevel:      5,
			LogDate:          "2024-01-19",
		}

		_, err := testRepo.SaveRoutineLog(routineLog)
		require.NoError(t, err)
	}

	// Test with limit
	logs, err := testRepo.GetRoutineLogsByUser(userID, 2)
	assert.NoError(t, err)
	assert.Len(t, logs, 2)
}

func TestGetRoutineLogWithAIReportNotFound(t *testing.T) {
	_, err := testRepo.GetRoutineLogWithAIReport(99999)
	assert.Error(t, err)
}

func TestPing(t *testing.T) {
	err := testRepo.Ping()
	assert.NoError(t, err)
}
