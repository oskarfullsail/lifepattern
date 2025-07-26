package services

import "lifepattern-api/internal/database"

// RepositoryInterface defines the interface for database operations
type RepositoryInterface interface {
	SaveRoutineLog(log database.RoutineLog) (int, error)
	SaveAIReport(report database.AIReport) error
	GetRoutineLogWithAIReport(logID int) (*database.InsightResponse, error)
	GetRoutineLogsByUser(userID int, limit int) ([]database.RoutineLog, error)
	Ping() error
	Close() error
}

// AIServiceInterface defines the interface for AI service operations
type AIServiceInterface interface {
	AnalyzeRoutine(routineLog database.RoutineLog) (*AIServiceResponse, error)
	CheckHealth() error
}

// RoutineServiceInterface defines the interface for routine service operations
type RoutineServiceInterface interface {
	CreateRoutineLog(routineLog database.RoutineLog) (*CreateRoutineLogResponse, error)
	GetInsight(logID int) (*database.InsightResponse, error)
	GetUserRoutineLogs(userID int, limit int) ([]database.RoutineLog, error)
	GetUserInsights(userID int, limit int) ([]database.InsightResponse, error)
}
