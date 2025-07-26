package services

import (
	"encoding/json"
	"fmt"
	"log"
	"time"

	"lifepattern-api/internal/database"
)

type RoutineService struct {
	repo      RepositoryInterface
	aiService AIServiceInterface
}

func NewRoutineService(repo RepositoryInterface, aiService AIServiceInterface) *RoutineService {
	return &RoutineService{
		repo:      repo,
		aiService: aiService,
	}
}

// CreateRoutineLog creates a new routine log with AI analysis
// This is the main business logic that orchestrates:
// 1. Frontend -> Backend: Receives routine data
// 2. Backend -> Database: Saves routine log
// 3. Backend -> AI Service: Sends data for analysis
// 4. Backend -> Database: Saves AI analysis results
// 5. Backend -> Frontend: Returns combined response
func (s *RoutineService) CreateRoutineLog(routineLog database.RoutineLog) (*CreateRoutineLogResponse, error) {
	// Set default values
	if routineLog.LogDate == "" {
		routineLog.LogDate = time.Now().Format("2006-01-02")
	}
	if routineLog.UserID == 0 {
		routineLog.UserID = 1 // Default user for testing
	}

	log.Printf("📝 Creating routine log for user %d on %s", routineLog.UserID, routineLog.LogDate)

	// Step 1: Save routine log to database
	logID, err := s.repo.SaveRoutineLog(routineLog)
	if err != nil {
		log.Printf("❌ Failed to save routine log: %v", err)
		return nil, fmt.Errorf("failed to save routine log: %w", err)
	}

	log.Printf("✅ Routine log saved with ID: %d", logID)

	// Step 2: Call AI service for analysis
	log.Printf("🤖 Calling AI service for analysis...")
	aiResponse, err := s.aiService.AnalyzeRoutine(routineLog)
	if err != nil {
		log.Printf("⚠️  AI analysis failed: %v", err)
		log.Printf("📊 Continuing without AI analysis - routine log saved successfully")

		// Return success without AI analysis (graceful degradation)
		return &CreateRoutineLogResponse{
			LogID:   logID,
			Message: "Routine log saved (AI analysis temporarily unavailable)",
			HasAI:   false,
		}, nil
	}

	log.Printf("✅ AI analysis completed - Anomaly: %v, Confidence: %.2f",
		aiResponse.IsAnomaly, aiResponse.ConfidenceScore)

	// Step 3: Save AI report to database
	aiResponseJSON, _ := json.Marshal(aiResponse)
	aiReport := database.AIReport{
		RoutineLogID:      logID,
		IsAnomaly:         aiResponse.IsAnomaly,
		ConfidenceScore:   aiResponse.ConfidenceScore,
		AnomalyType:       aiResponse.AnomalyType,
		Recommendations:   aiResponse.Recommendations,
		AIServiceResponse: string(aiResponseJSON),
	}

	if err := s.repo.SaveAIReport(aiReport); err != nil {
		log.Printf("⚠️  Failed to save AI report: %v", err)
		// Continue even if AI report save fails - the routine log is still saved
	}

	log.Printf("✅ AI report saved for log ID: %d", logID)

	// Step 4: Return combined response to frontend
	return &CreateRoutineLogResponse{
		LogID:   logID,
		Message: "Routine log saved and analyzed successfully",
		HasAI:   true,
		AIResult: &AIResult{
			IsAnomaly:       aiResponse.IsAnomaly,
			ConfidenceScore: aiResponse.ConfidenceScore,
			AnomalyType:     aiResponse.AnomalyType,
		},
	}, nil
}

// GetInsight retrieves a routine log with its AI analysis
// Frontend -> Backend: Requests insight for a specific log
// Backend -> Database: Retrieves routine log and AI report
// Backend -> Frontend: Returns combined insight data
func (s *RoutineService) GetInsight(logID int) (*database.InsightResponse, error) {
	log.Printf("🔍 Retrieving insight for log ID: %d", logID)

	insight, err := s.repo.GetRoutineLogWithAIReport(logID)
	if err != nil {
		log.Printf("❌ Failed to get insight for log ID %d: %v", logID, err)
		return nil, fmt.Errorf("failed to get insight: %w", err)
	}

	log.Printf("✅ Insight retrieved successfully for log ID: %d", logID)
	return insight, nil
}

// GetUserRoutineLogs retrieves routine logs for a specific user
// Frontend -> Backend: Requests user's routine logs
// Backend -> Database: Retrieves user's routine logs
// Backend -> Frontend: Returns list of routine logs
func (s *RoutineService) GetUserRoutineLogs(userID int, limit int) ([]database.RoutineLog, error) {
	log.Printf("📋 Retrieving routine logs for user %d (limit: %d)", userID, limit)

	logs, err := s.repo.GetRoutineLogsByUser(userID, limit)
	if err != nil {
		log.Printf("❌ Failed to get routine logs for user %d: %v", userID, err)
		return nil, fmt.Errorf("failed to get user routine logs: %w", err)
	}

	log.Printf("✅ Retrieved %d routine logs for user %d", len(logs), userID)
	return logs, nil
}

// GetUserInsights retrieves insights for all routine logs of a user
// This is a convenience method for the frontend to get all insights at once
func (s *RoutineService) GetUserInsights(userID int, limit int) ([]database.InsightResponse, error) {
	log.Printf("🔍 Retrieving insights for user %d (limit: %d)", userID, limit)

	// Get user's routine logs
	routineLogs, err := s.repo.GetRoutineLogsByUser(userID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get user routine logs: %w", err)
	}

	// Get insights for each log
	var insights []database.InsightResponse
	for _, routineLog := range routineLogs {
		insight, err := s.repo.GetRoutineLogWithAIReport(routineLog.ID)
		if err != nil {
			log.Printf("⚠️  Failed to get insight for log %d: %v", routineLog.ID, err)
			continue // Skip this log but continue with others
		}
		insights = append(insights, *insight)
	}

	log.Printf("✅ Retrieved %d insights for user %d", len(insights), userID)
	return insights, nil
}

// Response types
type CreateRoutineLogResponse struct {
	LogID    int       `json:"log_id"`
	Message  string    `json:"message"`
	HasAI    bool      `json:"has_ai"`
	AIResult *AIResult `json:"ai_result,omitempty"`
}

type AIResult struct {
	IsAnomaly       bool    `json:"is_anomaly"`
	ConfidenceScore float64 `json:"confidence_score"`
	AnomalyType     string  `json:"anomaly_type"`
}
