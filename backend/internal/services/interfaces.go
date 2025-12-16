package services

import (
	"lifepattern-api/internal/database"

	"github.com/google/uuid"
)

// RepositoryInterface defines the interface for database operations
type RepositoryInterface interface {
	// User operations
	CreateUser(user database.User) error
	GetUser(userID uuid.UUID) (*database.User, error)

	// User credential operations
	SaveUserCredential(cred database.UserCredential) error
	GetUserCredentialByUsername(username string) (*database.UserCredential, error)
	GetUserCredentialByUserID(userID uuid.UUID) (*database.UserCredential, error)
	UpdateUserCredentialLastUsed(credID uuid.UUID) error

	// Credential operations
	SaveCredential(credData map[string]interface{}) error
	GetUserCredentials(userID uuid.UUID) ([]database.Credential, error)

	// Session operations
	SaveSession(session database.Session) error
	GetUserSessions(userID uuid.UUID) ([]database.Session, error)
	RevokeSession(sessionID uuid.UUID) error

	// Mobile challenge operations
	SaveMobileChallenge(challenge database.MobileChallenge) error
	GetMobileChallenge(challengeID uuid.UUID) (*database.MobileChallenge, error)

	// Link token operations
	SaveLinkToken(linkToken database.LinkToken) error
	GetLinkTokens() ([]database.LinkToken, error)
	GetUserLinkTokens(userID uuid.UUID) ([]database.LinkToken, error)
	UpdateLinkToken(linkToken database.LinkToken) error

	// Routine log operations
	SaveRoutineLog(log database.RoutineLog) (int, error)
	SaveAIReport(report database.AIReport) error
	GetRoutineLogWithAIReport(logID int) (*database.InsightResponse, error)
	GetRoutineLogsByUser(userID uuid.UUID, limit int) ([]database.RoutineLog, error)
	GetRoutineLogsCountByUser(userID uuid.UUID) (int, error)
	GetAIReportsCountByUser(userID uuid.UUID) (int, error)

	// Database operations
	Ping() error
	Close() error
}

// AIServiceInterface defines the interface for AI service operations
type AIServiceInterface interface {
	AnalyzeRoutine(routineLog database.RoutineLog) (*AIServiceResponse, error)
	AnalyzeRoutineWithHistory(routineLog database.RoutineLog, historicalData []database.RoutineLog) (*AIServiceResponse, error)
	CheckHealth() error
}

// RoutineServiceInterface defines the interface for routine service operations
type RoutineServiceInterface interface {
	CreateRoutineLog(routineLog database.RoutineLog) (*CreateRoutineLogResponse, error)
	GetInsight(logID int) (*database.InsightResponse, error)
	GetUserRoutineLogs(userID uuid.UUID, limit int) ([]database.RoutineLog, error)
	GetUserRoutineLogsCount(userID uuid.UUID) (int, error)
	GetUserInsights(userID uuid.UUID, limit int) ([]database.InsightResponse, error)
	GetUserInsightsCount(userID uuid.UUID) (int, error)
}
