package services

import (
	"encoding/json"
	"fmt"
	"log"
	"time"

	"lifepattern-api/internal/database"

	"github.com/google/uuid"
)

// RoutineService handles routine-related business logic
type RoutineService struct {
	repo      RepositoryInterface
	aiService AIServiceInterface
}

// NewRoutineService creates a new routine service
func NewRoutineService(repo RepositoryInterface, aiService AIServiceInterface) *RoutineService {
	return &RoutineService{
		repo:      repo,
		aiService: aiService,
	}
}

// CreateRoutineLog creates a new routine log with AI analysis
func (s *RoutineService) CreateRoutineLog(routineLog database.RoutineLog) (*CreateRoutineLogResponse, error) {
	// Set default values
	if routineLog.LogDate == "" {
		routineLog.LogDate = time.Now().Format("2006-01-02")
	}
	if routineLog.UserID == uuid.Nil {
		// Generate a new user ID for testing
		routineLog.UserID = uuid.MustParse("550e8400-e29b-41d4-a716-446655440000")
	}

	log.Printf("📝 Creating routine log for user %s on %s", routineLog.UserID, routineLog.LogDate)

	// 1. Save routine log to database
	logID, err := s.repo.SaveRoutineLog(routineLog)
	if err != nil {
		log.Printf("❌ Failed to save routine log: %v", err)
		return nil, fmt.Errorf("failed to save routine log: %w", err)
	}

	// 2. Get historical data for AI analysis
	historicalData, err := s.repo.GetRoutineLogsByUser(routineLog.UserID, 30) // Last 30 logs
	if err != nil {
		log.Printf("⚠️ Failed to get historical data: %v", err)
		// Continue without historical data
	}

	// 3. Analyze with AI service (with historical context)
	var aiResponse *AIServiceResponse
	if len(historicalData) > 0 {
		aiResponse, err = s.aiService.AnalyzeRoutineWithHistory(routineLog, historicalData)
	} else {
		aiResponse, err = s.aiService.AnalyzeRoutine(routineLog)
	}

	if err != nil {
		log.Printf("⚠️ AI analysis failed: %v", err)
		// Continue without AI analysis
	} else {
		// 4. Save AI report to database
		aiReport := database.AIReport{
			RoutineLogID:       logID,
			IsAnomaly:          aiResponse.IsAnomaly,
			ConfidenceScore:    aiResponse.ConfidenceScore,
			AnomalyType:        aiResponse.AnomalyType,
			Recommendations:    aiResponse.Recommendations,
			AIServiceResponse:  aiResponse.Timestamp,
			DriftAnalysis:      json.RawMessage("{}"), // Will be populated from aiResponse.DriftAnalysis
			BaselineComparison: json.RawMessage("{}"), // Will be populated from aiResponse.BaselineComparison
			ModelVersion:       "1.0.0",
		}

		// Convert drift analysis to JSON
		if aiResponse.DriftAnalysis != nil {
			driftJSON, _ := json.Marshal(aiResponse.DriftAnalysis)
			aiReport.DriftAnalysis = driftJSON
		}

		// Convert baseline comparison to JSON
		if aiResponse.BaselineComparison != nil {
			baselineJSON, _ := json.Marshal(aiResponse.BaselineComparison)
			aiReport.BaselineComparison = baselineJSON
		}

		if err := s.repo.SaveAIReport(aiReport); err != nil {
			log.Printf("❌ Failed to save AI report: %v", err)
		} else {
			log.Printf("✅ Saved AI report for routine log %d", logID)
		}
	}

	// 5. Return combined response
	response := &CreateRoutineLogResponse{
		LogID:      logID,
		UserID:     routineLog.UserID,
		AIResponse: aiResponse,
		Message:    "Routine log created successfully",
	}

	log.Printf("✅ Created routine log %d for user %s", logID, routineLog.UserID)
	return response, nil
}

// GetInsight retrieves a routine log with its AI analysis
func (s *RoutineService) GetInsight(logID int) (*database.InsightResponse, error) {
	log.Printf("🔍 Retrieving insight for routine log %d", logID)

	insight, err := s.repo.GetRoutineLogWithAIReport(logID)
	if err != nil {
		log.Printf("❌ Failed to get insight: %v", err)
		return nil, fmt.Errorf("failed to get insight: %w", err)
	}

	log.Printf("✅ Retrieved insight for routine log %d", logID)
	return insight, nil
}

// GetUserRoutineLogs retrieves routine logs for a specific user
func (s *RoutineService) GetUserRoutineLogs(userID uuid.UUID, limit int) ([]database.RoutineLog, error) {
	log.Printf("📋 Retrieving routine logs for user %s (limit: %d)", userID, limit)
	logs, err := s.repo.GetRoutineLogsByUser(userID, limit)
	if err != nil {
		log.Printf("❌ Failed to get routine logs for user %s: %v", userID, err)
		return nil, fmt.Errorf("failed to get user routine logs: %w", err)
	}
	log.Printf("✅ Retrieved %d routine logs for user %s", len(logs), userID)
	return logs, nil
}

// GetUserInsights retrieves insights for all routine logs of a user
func (s *RoutineService) GetUserInsights(userID uuid.UUID, limit int) ([]database.InsightResponse, error) {
	log.Printf("🔍 Retrieving insights for user %s (limit: %d)", userID, limit)

	// Get routine logs for the user
	logs, err := s.repo.GetRoutineLogsByUser(userID, limit)
	if err != nil {
		log.Printf("❌ Failed to get routine logs for user %s: %v", userID, err)
		return nil, fmt.Errorf("failed to get user routine logs: %w", err)
	}

	// Get insights for each log
	var insights []database.InsightResponse
	for _, routineLog := range logs {
		insight, err := s.repo.GetRoutineLogWithAIReport(routineLog.ID)
		if err != nil {
			log.Printf("⚠️ Failed to get insight for log %d: %v", routineLog.ID, err)
			continue
		}
		insights = append(insights, *insight)
	}

	log.Printf("✅ Retrieved %d insights for user %s", len(insights), userID)
	return insights, nil
}

// Response types
type CreateRoutineLogResponse struct {
	LogID      int                `json:"log_id"`
	UserID     uuid.UUID          `json:"user_id"`
	AIResponse *AIServiceResponse `json:"ai_response,omitempty"`
	Message    string             `json:"message"`
}

type AIResult struct {
	IsAnomaly       bool    `json:"is_anomaly"`
	ConfidenceScore float64 `json:"confidence_score"`
	AnomalyType     string  `json:"anomaly_type"`
}
