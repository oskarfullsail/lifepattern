package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"lifepattern-api/internal/services"
)

// mockAIService is a mock implementation of AIService for testing
type mockAIService struct {
	analyzeDailyRoutineFunc func(ctx context.Context, req services.DailyAnalysisRequest) (*services.DailyAnalysisResponse, error)
}

func (m *mockAIService) AnalyzeDailyRoutine(ctx context.Context, req services.DailyAnalysisRequest) (*services.DailyAnalysisResponse, error) {
	if m.analyzeDailyRoutineFunc != nil {
		return m.analyzeDailyRoutineFunc(ctx, req)
	}
	return nil, nil
}

// TestAnalyzeDay tests the AnalyzeDay handler with a mocked AI service
func TestAnalyzeDay(t *testing.T) {
	// Create mock AI service
	mockAI := &mockAIService{
		analyzeDailyRoutineFunc: func(ctx context.Context, req services.DailyAnalysisRequest) (*services.DailyAnalysisResponse, error) {
			// Return a sample response
			return &services.DailyAnalysisResponse{
				UserID:     req.UserID,
				Date:       req.Date,
				DailyScore: 72.5,
				Anomalies: []struct {
					Code        string `json:"code"`
					Description string `json:"description"`
					Severity    string `json:"severity"`
				}{
					{
						Code:        "LATE_SLEEP",
						Description: "You went to bed much later than usual.",
						Severity:    "medium",
					},
				},
				Recommendations: []struct {
					Title           string `json:"title"`
					Reason          string `json:"reason"`
					SuggestedAction string `json:"suggested_action"`
					TimeHorizon     string `json:"time_horizon,omitempty"`
				}{
					{
						Title:           "Normalize your bedtime",
						Reason:          "You slept 1.5 hours less than your target and later than your usual time.",
						SuggestedAction: "Try starting your wind-down routine 30 minutes earlier tonight (no screens after 10:30 PM).",
						TimeHorizon:     "today",
					},
				},
			}, nil
		},
	}

	// Create handler with mock
	handler := &DailyAnalysisHandler{
		aiService: mockAI,
	}

	// Create test request
	requestBody := DailyAnalysisRequest{
		Date:              "2025-06-01",
		SleepHours:        6.5,
		Bedtime:           "23:45",
		WakeTime:          "06:30",
		Steps:             7200,
		WorkoutMinutes:    30,
		ScreenTimeMinutes: 260,
		Meals: struct {
			Breakfast bool `json:"breakfast"`
			Lunch     bool `json:"lunch"`
			Dinner    bool `json:"dinner"`
		}{
			Breakfast: true,
			Lunch:     true,
			Dinner:    true,
		},
		Mood:        3,
		StressLevel: 4,
		GoalContext: struct {
			SleepTargetHours     float64 `json:"sleepTargetHours"`
			DailyStepTarget      int     `json:"dailyStepTarget"`
			MaxScreenTimeMinutes int     `json:"maxScreenTimeMinutes"`
		}{
			SleepTargetHours:     7.5,
			DailyStepTarget:      8000,
			MaxScreenTimeMinutes: 180,
		},
		HistoryWindowDays: 14,
	}

	body, _ := json.Marshal(requestBody)
	req := httptest.NewRequest("POST", "/api/v1/routines/analyze-day", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	// Set user_id in context (as auth middleware does)
	ctx := context.WithValue(req.Context(), "user_id", "550e8400-e29b-41d4-a716-446655440000")
	req = req.WithContext(ctx)

	// Create response recorder
	rr := httptest.NewRecorder()

	// Call handler
	handler.AnalyzeDay(rr, req)

	// Check status code
	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	// Parse response
	var response DailyAnalysisResponse
	if err := json.Unmarshal(rr.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	// Verify response
	if response.Date != "2025-06-01" {
		t.Errorf("Expected date '2025-06-01', got '%s'", response.Date)
	}

	if response.DailyScore != 72.5 {
		t.Errorf("Expected daily score 72.5, got %.1f", response.DailyScore)
	}

	if len(response.Anomalies) != 1 {
		t.Errorf("Expected 1 anomaly, got %d", len(response.Anomalies))
	}

	if len(response.Recommendations) != 1 {
		t.Errorf("Expected 1 recommendation, got %d", len(response.Recommendations))
	}

	if response.Anomalies[0].Code != "LATE_SLEEP" {
		t.Errorf("Expected anomaly code 'LATE_SLEEP', got '%s'", response.Anomalies[0].Code)
	}
}

// TestAnalyzeDay_MissingUserID tests error handling when user ID is missing
func TestAnalyzeDay_MissingUserID(t *testing.T) {
	mockAI := &mockAIService{}
	handler := &DailyAnalysisHandler{
		aiService: mockAI,
	}

	requestBody := DailyAnalysisRequest{
		Date: "2025-06-01",
	}
	body, _ := json.Marshal(requestBody)
	req := httptest.NewRequest("POST", "/api/v1/routines/analyze-day", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	// No user_id in context (simulating unauthenticated request)

	rr := httptest.NewRecorder()
	handler.AnalyzeDay(rr, req)

	if status := rr.Code; status != http.StatusUnauthorized {
		t.Errorf("Expected status 401, got %v", status)
	}
}

// Note: In a real implementation, we would need to properly mock the AIService interface
// For now, this test demonstrates the structure. The mockAIService would need to implement
// all methods of the AIServiceInterface, or we'd need to create a proper interface for testing.

