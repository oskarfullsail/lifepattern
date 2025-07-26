package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"lifepattern-api/internal/database"
	"lifepattern-api/internal/services"
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

func (m *MockHealthRepository) SaveRoutineLog(log database.RoutineLog) (int, error) {
	return 0, errors.New("not implemented")
}

func (m *MockHealthRepository) SaveAIReport(report database.AIReport) error {
	return errors.New("not implemented")
}

func (m *MockHealthRepository) GetRoutineLogWithAIReport(logID int) (*database.InsightResponse, error) {
	return nil, errors.New("not implemented")
}

func (m *MockHealthRepository) GetRoutineLogsByUser(userID int, limit int) ([]database.RoutineLog, error) {
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

	if handler == nil {
		t.Fatal("Expected handler to be created")
	}

	if handler.repo != mockRepo {
		t.Fatal("Expected repository to be set")
	}

	if handler.aiService != mockAI {
		t.Fatal("Expected AI service to be set")
	}
}

func TestHealthCheck(t *testing.T) {
	mockRepo := NewMockHealthRepository(false)
	mockAI := NewMockHealthAIService(false)
	handler := NewHealthHandler(mockRepo, mockAI)

	req := httptest.NewRequest("GET", "/health", nil)
	w := httptest.NewRecorder()

	handler.HealthCheck(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d", w.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if response["status"] != "healthy" {
		t.Fatalf("Expected status 'healthy', got %v", response["status"])
	}

	if response["database"] != "healthy" {
		t.Fatalf("Expected database 'healthy', got %v", response["database"])
	}

	if response["ai_service"] != "healthy" {
		t.Fatalf("Expected ai_service 'healthy', got %v", response["ai_service"])
	}

	if response["timestamp"] == "" {
		t.Fatal("Expected timestamp to be set")
	}
}

func TestHealthCheckInvalidMethod(t *testing.T) {
	mockRepo := NewMockHealthRepository(false)
	mockAI := NewMockHealthAIService(false)
	handler := NewHealthHandler(mockRepo, mockAI)

	req := httptest.NewRequest("POST", "/health", nil)
	w := httptest.NewRecorder()

	handler.HealthCheck(w, req)

	if w.Code != http.StatusMethodNotAllowed {
		t.Fatalf("Expected status 405, got %d", w.Code)
	}
}

func TestHealthCheckDatabaseFailure(t *testing.T) {
	mockRepo := NewMockHealthRepository(true) // Database will fail
	mockAI := NewMockHealthAIService(false)
	handler := NewHealthHandler(mockRepo, mockAI)

	req := httptest.NewRequest("GET", "/health", nil)
	w := httptest.NewRecorder()

	handler.HealthCheck(w, req)

	if w.Code != http.StatusServiceUnavailable {
		t.Fatalf("Expected status 503, got %d", w.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if response["status"] != "unhealthy" {
		t.Fatalf("Expected status 'unhealthy', got %v", response["status"])
	}

	if response["database"] != "unhealthy" {
		t.Fatalf("Expected database 'unhealthy', got %v", response["database"])
	}

	if response["ai_service"] != "healthy" {
		t.Fatalf("Expected ai_service 'healthy', got %v", response["ai_service"])
	}
}

func TestHealthCheckAIServiceFailure(t *testing.T) {
	mockRepo := NewMockHealthRepository(false)
	mockAI := NewMockHealthAIService(true) // AI service will fail
	handler := NewHealthHandler(mockRepo, mockAI)

	req := httptest.NewRequest("GET", "/health", nil)
	w := httptest.NewRecorder()

	handler.HealthCheck(w, req)

	if w.Code != http.StatusServiceUnavailable {
		t.Fatalf("Expected status 503, got %d", w.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if response["status"] != "unhealthy" {
		t.Fatalf("Expected status 'unhealthy', got %v", response["status"])
	}

	if response["database"] != "healthy" {
		t.Fatalf("Expected database 'healthy', got %v", response["database"])
	}

	if response["ai_service"] != "unhealthy" {
		t.Fatalf("Expected ai_service 'unhealthy', got %v", response["ai_service"])
	}
}

func TestHealthCheckBothFailures(t *testing.T) {
	mockRepo := NewMockHealthRepository(true) // Database will fail
	mockAI := NewMockHealthAIService(true)    // AI service will fail
	handler := NewHealthHandler(mockRepo, mockAI)

	req := httptest.NewRequest("GET", "/health", nil)
	w := httptest.NewRecorder()

	handler.HealthCheck(w, req)

	if w.Code != http.StatusServiceUnavailable {
		t.Fatalf("Expected status 503, got %d", w.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if response["status"] != "unhealthy" {
		t.Fatalf("Expected status 'unhealthy', got %v", response["status"])
	}

	if response["database"] != "unhealthy" {
		t.Fatalf("Expected database 'unhealthy', got %v", response["database"])
	}

	if response["ai_service"] != "unhealthy" {
		t.Fatalf("Expected ai_service 'unhealthy', got %v", response["ai_service"])
	}
}
