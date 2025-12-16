package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"lifepattern-api/internal/database"
	"lifepattern-api/internal/services"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Mock repository for testing health
type MockHealthRepository struct {
	shouldFail bool
}

func NewMockHealthRepository(shouldFail bool) *MockHealthRepository {
	return &MockHealthRepository{
		shouldFail: shouldFail,
	}
}

// Repository interface methods
func (m *MockHealthRepository) CreateUser(user database.User) error {
	return errors.New("not implemented")
}

func (m *MockHealthRepository) GetUser(userID uuid.UUID) (*database.User, error) {
	return nil, errors.New("not implemented")
}

func (m *MockHealthRepository) SaveCredential(credData map[string]interface{}) error {
	return errors.New("not implemented")
}

func (m *MockHealthRepository) GetUserCredentials(userID uuid.UUID) ([]database.Credential, error) {
	return nil, errors.New("not implemented")
}

func (m *MockHealthRepository) SaveSession(session database.Session) error {
	return errors.New("not implemented")
}

func (m *MockHealthRepository) GetUserSessions(userID uuid.UUID) ([]database.Session, error) {
	return nil, errors.New("not implemented")
}

func (m *MockHealthRepository) RevokeSession(sessionID uuid.UUID) error {
	return errors.New("not implemented")
}

func (m *MockHealthRepository) SaveMobileChallenge(challenge database.MobileChallenge) error {
	return errors.New("not implemented")
}

func (m *MockHealthRepository) GetMobileChallenge(challengeID uuid.UUID) (*database.MobileChallenge, error) {
	return nil, errors.New("not implemented")
}

func (m *MockHealthRepository) SaveRoutineLog(log database.RoutineLog) (int, error) {
	return 0, errors.New("not implemented")
}

func (m *MockHealthRepository) SaveAIReport(report database.AIReport) error {
	return errors.New("not implemented")
}

func (m *MockHealthRepository) GetRoutineLogWithAIReport(logID int) (*database.InsightResponse, error) {
	return nil, errors.New("not implemented")
}

func (m *MockHealthRepository) GetRoutineLogsByUser(userID uuid.UUID, limit int) ([]database.RoutineLog, error) {
	return nil, errors.New("not implemented")
}

func (m *MockHealthRepository) Ping() error {
	if m.shouldFail {
		return errors.New("database ping failed")
	}
	return nil
}

func (m *MockHealthRepository) Close() error {
	return nil
}

// Link token methods
func (m *MockHealthRepository) SaveLinkToken(linkToken database.LinkToken) error {
	return errors.New("not implemented")
}

func (m *MockHealthRepository) GetLinkTokens() ([]database.LinkToken, error) {
	return nil, errors.New("not implemented")
}

func (m *MockHealthRepository) GetUserLinkTokens(userID uuid.UUID) ([]database.LinkToken, error) {
	return nil, errors.New("not implemented")
}

func (m *MockHealthRepository) UpdateLinkToken(linkToken database.LinkToken) error {
	return errors.New("not implemented")
}

// UserCredential methods
func (m *MockHealthRepository) SaveUserCredential(cred database.UserCredential) error {
	return errors.New("not implemented")
}

func (m *MockHealthRepository) GetUserCredentialByUsername(username string) (*database.UserCredential, error) {
	return nil, errors.New("not implemented")
}

func (m *MockHealthRepository) GetUserCredentialByUserID(userID uuid.UUID) (*database.UserCredential, error) {
	return nil, errors.New("not implemented")
}

func (m *MockHealthRepository) UpdateUserCredentialLastUsed(credID uuid.UUID) error {
	return errors.New("not implemented")
}

// Count methods
func (m *MockHealthRepository) GetRoutineLogsCountByUser(userID uuid.UUID) (int, error) {
	return 0, errors.New("not implemented")
}

func (m *MockHealthRepository) GetAIReportsCountByUser(userID uuid.UUID) (int, error) {
	return 0, errors.New("not implemented")
}

// Mock AI service for testing health
type MockHealthAIService struct {
	shouldFail bool
}

func NewMockHealthAIService(shouldFail bool) *MockHealthAIService {
	return &MockHealthAIService{
		shouldFail: shouldFail,
	}
}

func (m *MockHealthAIService) AnalyzeRoutine(routineLog database.RoutineLog) (*services.AIServiceResponse, error) {
	return nil, errors.New("not implemented")
}

func (m *MockHealthAIService) AnalyzeRoutineWithHistory(routineLog database.RoutineLog, historicalData []database.RoutineLog) (*services.AIServiceResponse, error) {
	return nil, errors.New("not implemented")
}

func (m *MockHealthAIService) CheckHealth() error {
	if m.shouldFail {
		return errors.New("AI service health check failed")
	}
	return nil
}

func TestNewHealthHandler(t *testing.T) {
	mockRepo := NewMockHealthRepository(false)
	mockAI := NewMockHealthAIService(false)
	handler := NewHealthHandler(mockRepo, mockAI)

	assert.NotNil(t, handler)
	assert.Equal(t, mockRepo, handler.repo)
	assert.Equal(t, mockAI, handler.aiService)
}

func TestHealthCheck(t *testing.T) {
	mockRepo := NewMockHealthRepository(false)
	mockAI := NewMockHealthAIService(false)
	handler := NewHealthHandler(mockRepo, mockAI)

	req := httptest.NewRequest("GET", "/health", nil)
	w := httptest.NewRecorder()

	handler.HealthCheck(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Equal(t, "healthy", response["status"])
	assert.Equal(t, "healthy", response["database"])
	assert.Equal(t, "healthy", response["ai_service"])
	assert.NotEmpty(t, response["timestamp"])

	// Verify timestamp format
	timestamp, ok := response["timestamp"].(string)
	assert.True(t, ok)
	_, err = time.Parse(time.RFC3339, timestamp)
	assert.NoError(t, err)
}

func TestHealthCheckInvalidMethod(t *testing.T) {
	mockRepo := NewMockHealthRepository(false)
	mockAI := NewMockHealthAIService(false)
	handler := NewHealthHandler(mockRepo, mockAI)

	req := httptest.NewRequest("POST", "/health", nil)
	w := httptest.NewRecorder()

	handler.HealthCheck(w, req)

	assert.Equal(t, http.StatusMethodNotAllowed, w.Code)
}

func TestHealthCheckDatabaseFailure(t *testing.T) {
	mockRepo := NewMockHealthRepository(true) // Database will fail
	mockAI := NewMockHealthAIService(false)
	handler := NewHealthHandler(mockRepo, mockAI)

	req := httptest.NewRequest("GET", "/health", nil)
	w := httptest.NewRecorder()

	handler.HealthCheck(w, req)

	assert.Equal(t, http.StatusServiceUnavailable, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Equal(t, "unhealthy", response["status"])
	assert.Equal(t, "unhealthy", response["database"])
	assert.Equal(t, "healthy", response["ai_service"])
	assert.NotEmpty(t, response["timestamp"])
}

func TestHealthCheckAIServiceFailure(t *testing.T) {
	mockRepo := NewMockHealthRepository(false)
	mockAI := NewMockHealthAIService(true) // AI service will fail
	handler := NewHealthHandler(mockRepo, mockAI)

	req := httptest.NewRequest("GET", "/health", nil)
	w := httptest.NewRecorder()

	handler.HealthCheck(w, req)

	assert.Equal(t, http.StatusServiceUnavailable, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Equal(t, "unhealthy", response["status"])
	assert.Equal(t, "healthy", response["database"])
	assert.Equal(t, "unhealthy", response["ai_service"])
	assert.NotEmpty(t, response["timestamp"])
}

func TestHealthCheckBothFailures(t *testing.T) {
	mockRepo := NewMockHealthRepository(true) // Database will fail
	mockAI := NewMockHealthAIService(true)    // AI service will fail
	handler := NewHealthHandler(mockRepo, mockAI)

	req := httptest.NewRequest("GET", "/health", nil)
	w := httptest.NewRecorder()

	handler.HealthCheck(w, req)

	assert.Equal(t, http.StatusServiceUnavailable, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Equal(t, "unhealthy", response["status"])
	assert.Equal(t, "unhealthy", response["database"])
	assert.Equal(t, "unhealthy", response["ai_service"])
	assert.NotEmpty(t, response["timestamp"])
}

func TestHealthCheckResponseStructure(t *testing.T) {
	mockRepo := NewMockHealthRepository(false)
	mockAI := NewMockHealthAIService(false)
	handler := NewHealthHandler(mockRepo, mockAI)

	req := httptest.NewRequest("GET", "/health", nil)
	w := httptest.NewRecorder()

	handler.HealthCheck(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "application/json", w.Header().Get("Content-Type"))

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	// Check all required fields
	requiredFields := []string{"status", "database", "ai_service", "timestamp"}
	for _, field := range requiredFields {
		assert.Contains(t, response, field)
		assert.NotNil(t, response[field])
	}

	// Check status values are valid
	status, ok := response["status"].(string)
	assert.True(t, ok)
	assert.Contains(t, []string{"healthy", "unhealthy"}, status)

	database, ok := response["database"].(string)
	assert.True(t, ok)
	assert.Contains(t, []string{"healthy", "unhealthy"}, database)

	aiService, ok := response["ai_service"].(string)
	assert.True(t, ok)
	assert.Contains(t, []string{"healthy", "unhealthy"}, aiService)
}

func TestHealthCheckTimestampFormat(t *testing.T) {
	mockRepo := NewMockHealthRepository(false)
	mockAI := NewMockHealthAIService(false)
	handler := NewHealthHandler(mockRepo, mockAI)

	req := httptest.NewRequest("GET", "/health", nil)
	w := httptest.NewRecorder()

	handler.HealthCheck(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	timestamp, ok := response["timestamp"].(string)
	assert.True(t, ok)

	// Parse timestamp to ensure it's valid RFC3339 format
	parsedTime, err := time.Parse(time.RFC3339, timestamp)
	assert.NoError(t, err)
	assert.NotZero(t, parsedTime)

	// Ensure timestamp is recent (within last minute)
	now := time.Now()
	diff := now.Sub(parsedTime)
	assert.Less(t, diff, time.Minute)
	assert.Greater(t, diff, -time.Minute)
}

func TestHealthCheckEdgeCases(t *testing.T) {
	// Test with PUT method
	mockRepo := NewMockHealthRepository(false)
	mockAI := NewMockHealthAIService(false)
	handler := NewHealthHandler(mockRepo, mockAI)

	req := httptest.NewRequest("PUT", "/health", nil)
	w := httptest.NewRecorder()

	handler.HealthCheck(w, req)

	assert.Equal(t, http.StatusMethodNotAllowed, w.Code)

	// Test with DELETE method
	req = httptest.NewRequest("DELETE", "/health", nil)
	w = httptest.NewRecorder()

	handler.HealthCheck(w, req)

	assert.Equal(t, http.StatusMethodNotAllowed, w.Code)
}
