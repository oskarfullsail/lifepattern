package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"lifepattern-api/internal/services"
)

// mockAIServiceForHeartbeat is a mock implementation for heartbeat testing
type mockAIServiceForHeartbeat struct {
	checkHeartbeatFunc func(ctx context.Context) (*services.HeartbeatResponse, error)
}

func (m *mockAIServiceForHeartbeat) CheckHeartbeat(ctx context.Context) (*services.HeartbeatResponse, error) {
	if m.checkHeartbeatFunc != nil {
		return m.checkHeartbeatFunc(ctx)
	}
	return nil, nil
}

// TestGetHeartbeat_Success tests the heartbeat handler with successful AI service response
func TestGetHeartbeat_Success(t *testing.T) {
	// Create mock AI service that returns success
	mockAI := &mockAIServiceForHeartbeat{
		checkHeartbeatFunc: func(ctx context.Context) (*services.HeartbeatResponse, error) {
			return &services.HeartbeatResponse{
				Status:    "ok",
				Timestamp: time.Now().UTC().Format(time.RFC3339),
				Greeting:  "You're building great habits, one day at a time.",
			}, nil
		},
	}

	handler := &HeartbeatHandler{
		aiService: mockAI,
	}

	req := httptest.NewRequest("GET", "/api/v1/ai/heartbeat", nil)
	rr := httptest.NewRecorder()

	handler.GetHeartbeat(rr, req)

	// Check status code
	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	// Parse response
	var response HeartbeatResponse
	if err := json.Unmarshal(rr.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	// Verify response
	if response.Status != "ok" {
		t.Errorf("Expected status 'ok', got '%s'", response.Status)
	}

	if response.Greeting == "" {
		t.Error("Expected greeting, got empty string")
	}

	if response.Timestamp == "" {
		t.Error("Expected timestamp, got empty string")
	}
}

// TestGetHeartbeat_Failure tests the heartbeat handler when AI service fails
func TestGetHeartbeat_Failure(t *testing.T) {
	// Create mock AI service that returns error
	mockAI := &mockAIServiceForHeartbeat{
		checkHeartbeatFunc: func(ctx context.Context) (*services.HeartbeatResponse, error) {
			return nil, fmt.Errorf("AI service unreachable")
		},
	}

	handler := &HeartbeatHandler{
		aiService: mockAI,
	}

	req := httptest.NewRequest("GET", "/api/v1/ai/heartbeat", nil)
	rr := httptest.NewRecorder()

	handler.GetHeartbeat(rr, req)

	// Should still return 200 OK with fallback response
	if status := rr.Code; status != http.StatusOK {
		t.Errorf("Expected status 200, got %v", status)
	}

	// Parse response
	var response HeartbeatResponse
	if err := json.Unmarshal(rr.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	// Verify fallback response
	if response.Status != "unreachable" {
		t.Errorf("Expected status 'unreachable', got '%s'", response.Status)
	}

	if response.Greeting == "" {
		t.Error("Expected fallback greeting, got empty string")
	}
}

// TestGetHeartbeat_Timeout tests the heartbeat handler with timeout
func TestGetHeartbeat_Timeout(t *testing.T) {
	// Create mock AI service that times out
	mockAI := &mockAIServiceForHeartbeat{
		checkHeartbeatFunc: func(ctx context.Context) (*services.HeartbeatResponse, error) {
			// Simulate timeout by checking context
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-time.After(3 * time.Second):
				return &services.HeartbeatResponse{
					Status:    "ok",
					Timestamp: time.Now().UTC().Format(time.RFC3339),
					Greeting:  "Test greeting",
				}, nil
			}
		},
	}

	handler := &HeartbeatHandler{
		aiService: mockAI,
	}

	req := httptest.NewRequest("GET", "/api/v1/ai/heartbeat", nil)
	rr := httptest.NewRecorder()

	handler.GetHeartbeat(rr, req)

	// Should return 200 OK with fallback (timeout is handled in the handler)
	if status := rr.Code; status != http.StatusOK {
		t.Errorf("Expected status 200, got %v", status)
	}
}

