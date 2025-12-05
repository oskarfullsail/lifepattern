package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"lifepattern-api/internal/services"
)

// mockAIServiceForWeekly is a mock implementation for weekly summary testing
type mockAIServiceForWeekly struct {
	analyzeWeeklySummaryFunc func(ctx interface{}, userID string, endDate string) (*services.WeeklySummaryResponse, error)
}

func (m *mockAIServiceForWeekly) AnalyzeWeeklySummary(ctx interface{}, userID string, endDate string) (*services.WeeklySummaryResponse, error) {
	if m.analyzeWeeklySummaryFunc != nil {
		return m.analyzeWeeklySummaryFunc(ctx, userID, endDate)
	}
	return nil, nil
}

// TestGetWeekSummary tests the GetWeekSummary handler with a mocked AI service
func TestGetWeekSummary(t *testing.T) {
	// Create mock AI service
	mockAI := &mockAIServiceForWeekly{
		analyzeWeeklySummaryFunc: func(ctx interface{}, userID string, endDate string) (*services.WeeklySummaryResponse, error) {
			// Return a sample response
			return &services.WeeklySummaryResponse{
				UserID:    userID,
				WeekStart: "2025-06-01",
				WeekEnd:   "2025-06-07",
				Summary: map[string]float64{
					"average_sleep_hours":        7.2,
					"average_steps":              8450,
					"average_screen_time_minutes": 210,
					"average_mood":               3.4,
					"average_stress_level":       2.8,
				},
				Trends: []struct {
					Metric    string `json:"metric"`
					Direction string `json:"direction"`
					Comment   string `json:"comment"`
				}{
					{
						Metric:    "sleep_hours",
						Direction: "improving",
						Comment:   "You slept about 45 minutes more on average in the second half of the week.",
					},
					{
						Metric:    "steps",
						Direction: "declining",
						Comment:   "Your step count dropped on Thursday and Friday compared to earlier in the week.",
					},
				},
				Insights: []string{
					"You are getting close to your sleep target, but your steps dropped near the end of the week.",
					"Your mood stays more positive on days when you walk over 8,000 steps.",
				},
				MicroGoals: []struct {
					Title           string `json:"title"`
					Reason          string `json:"reason"`
					SuggestedAction string `json:"suggested_action"`
					TimeHorizon     string `json:"time_horizon,omitempty"`
				}{
					{
						Title:           "Two 10-minute walks in the afternoon",
						Reason:          "Your steps dropped on workdays, which correlates with slightly lower mood.",
						SuggestedAction: "Add a 10-minute walk after lunch and another after dinner on weekdays.",
						TimeHorizon:     "this_week",
					},
				},
			}, nil
		},
	}

	// Create handler with mock
	handler := &WeeklySummaryHandler{
		aiService: mockAI,
	}

	// Create test request
	req := httptest.NewRequest("GET", "/api/v1/routines/week-summary?endDate=2025-06-07", nil)
	// Set user_id in context (as auth middleware does)
	ctx := context.WithValue(req.Context(), "user_id", "550e8400-e29b-41d4-a716-446655440000")
	req = req.WithContext(ctx)

	// Create response recorder
	rr := httptest.NewRecorder()

	// Call handler
	handler.GetWeekSummary(rr, req)

	// Check status code
	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	// Parse response
	var response WeeklySummaryResponse
	if err := json.Unmarshal(rr.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	// Verify response
	if response.WeekStart != "2025-06-01" {
		t.Errorf("Expected weekStart '2025-06-01', got '%s'", response.WeekStart)
	}

	if response.WeekEnd != "2025-06-07" {
		t.Errorf("Expected weekEnd '2025-06-07', got '%s'", response.WeekEnd)
	}

	if response.Summary.AverageSleepHours != 7.2 {
		t.Errorf("Expected averageSleepHours 7.2, got %.1f", response.Summary.AverageSleepHours)
	}

	if len(response.Trends) != 2 {
		t.Errorf("Expected 2 trends, got %d", len(response.Trends))
	}

	if len(response.Insights) != 2 {
		t.Errorf("Expected 2 insights, got %d", len(response.Insights))
	}

	if len(response.MicroGoals) != 1 {
		t.Errorf("Expected 1 micro-goal, got %d", len(response.MicroGoals))
	}

	if response.Trends[0].Direction != "improving" {
		t.Errorf("Expected first trend direction 'improving', got '%s'", response.Trends[0].Direction)
	}
}

// TestGetWeekSummary_MissingUserID tests error handling when user ID is missing
func TestGetWeekSummary_MissingUserID(t *testing.T) {
	mockAI := &mockAIServiceForWeekly{}
	handler := &WeeklySummaryHandler{
		aiService: mockAI,
	}

	req := httptest.NewRequest("GET", "/api/v1/routines/week-summary?endDate=2025-06-07", nil)
	// No X-User-ID header

	rr := httptest.NewRecorder()
	handler.GetWeekSummary(rr, req)

	if status := rr.Code; status != http.StatusUnauthorized {
		t.Errorf("Expected status 401, got %v", status)
	}
}

// TestGetWeekSummary_InvalidDate tests error handling for invalid date format
func TestGetWeekSummary_InvalidDate(t *testing.T) {
	mockAI := &mockAIServiceForWeekly{}
	handler := &WeeklySummaryHandler{
		aiService: mockAI,
	}

	req := httptest.NewRequest("GET", "/api/v1/routines/week-summary?endDate=invalid-date", nil)
	// Set user_id in context (as auth middleware does)
	ctx := context.WithValue(req.Context(), "user_id", "550e8400-e29b-41d4-a716-446655440000")
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	handler.GetWeekSummary(rr, req)

	if status := rr.Code; status != http.StatusBadRequest {
		t.Errorf("Expected status 400, got %v", status)
	}
}

