package database

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	_ "github.com/lib/pq"
)

// Repository implements database operations
type Repository struct {
	db *sql.DB
}

// NewRepository creates a new repository instance
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// Ping checks database connectivity
func (r *Repository) Ping() error {
	return r.db.Ping()
}

// Close closes the database connection
func (r *Repository) Close() error {
	return r.db.Close()
}

// CreateUser creates a new user
func (r *Repository) CreateUser(user User) error {
	query := `INSERT INTO users (id, created_at, last_seen_at) VALUES ($1, $2, $3)`
	_, err := r.db.Exec(query, user.ID, user.CreatedAt, user.LastSeenAt)
	if err != nil {
		return fmt.Errorf("failed to create user: %w", err)
	}
	log.Printf("✅ Created user %s", user.ID)
	return nil
}

// GetUser retrieves a user by ID
func (r *Repository) GetUser(userID uuid.UUID) (*User, error) {
	query := `SELECT id, created_at, last_seen_at FROM users WHERE id = $1`
	user := &User{}
	err := r.db.QueryRow(query, userID).Scan(&user.ID, &user.CreatedAt, &user.LastSeenAt)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	return user, nil
}

// SaveUserCredential saves user credentials to the database
func (r *Repository) SaveUserCredential(cred UserCredential) error {
	query := `INSERT INTO user_credentials (id, user_id, username, hashed_passphrase, salt, created_at, last_used_at) 
		VALUES ($1, $2, $3, $4, $5, $6, $7)`

	_, err := r.db.Exec(query, cred.ID, cred.UserID, cred.Username, cred.HashedPassphrase, cred.Salt, cred.CreatedAt, cred.LastUsedAt)
	if err != nil {
		return fmt.Errorf("failed to save user credential: %w", err)
	}
	log.Printf("✅ Saved user credential for user %s", cred.UserID)
	return nil
}

// GetUserCredentialByUsername retrieves user credentials by username
func (r *Repository) GetUserCredentialByUsername(username string) (*UserCredential, error) {
	query := `SELECT id, user_id, username, hashed_passphrase, salt, created_at, last_used_at 
		FROM user_credentials WHERE username = $1`

	cred := &UserCredential{}
	err := r.db.QueryRow(query, username).Scan(&cred.ID, &cred.UserID, &cred.Username,
		&cred.HashedPassphrase, &cred.Salt, &cred.CreatedAt, &cred.LastUsedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to get user credential by username: %w", err)
	}
	return cred, nil
}

// GetUserCredentialByUserID retrieves user credentials by user ID
func (r *Repository) GetUserCredentialByUserID(userID uuid.UUID) (*UserCredential, error) {
	query := `SELECT id, user_id, username, hashed_passphrase, salt, created_at, last_used_at 
		FROM user_credentials WHERE user_id = $1`

	cred := &UserCredential{}
	err := r.db.QueryRow(query, userID).Scan(&cred.ID, &cred.UserID, &cred.Username,
		&cred.HashedPassphrase, &cred.Salt, &cred.CreatedAt, &cred.LastUsedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to get user credential by user ID: %w", err)
	}
	return cred, nil
}

// UpdateUserCredentialLastUsed updates the last_used_at timestamp for a credential
func (r *Repository) UpdateUserCredentialLastUsed(credID uuid.UUID) error {
	query := `UPDATE user_credentials SET last_used_at = $1 WHERE id = $2`

	_, err := r.db.Exec(query, time.Now(), credID)
	if err != nil {
		return fmt.Errorf("failed to update user credential last used: %w", err)
	}
	return nil
}

// SaveCredential saves a credential to the database
func (r *Repository) SaveCredential(credData map[string]interface{}) error {
	query := `INSERT INTO credentials (id, user_id, public_key, attestation_type, attestation_source, 
		aaguid, sign_count, clone_warning, backup_eligible, backup_state, device_type, device_label, 
		added_at, last_used_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`

	_, err := r.db.Exec(query,
		credData["id"], credData["user_id"], credData["public_key"],
		credData["attestation_type"], credData["attestation_source"], credData["aaguid"],
		credData["sign_count"], credData["clone_warning"], credData["backup_eligible"],
		credData["backup_state"], credData["device_type"], credData["device_label"],
		credData["added_at"], credData["last_used_at"])

	if err != nil {
		return fmt.Errorf("failed to save credential: %w", err)
	}
	log.Printf("✅ Saved credential for user %s", credData["user_id"])
	return nil
}

// GetUserCredentials retrieves credentials for a user
func (r *Repository) GetUserCredentials(userID uuid.UUID) ([]Credential, error) {
	query := `SELECT id, user_id, public_key, attestation_type, attestation_source, 
		aaguid, sign_count, clone_warning, backup_eligible, backup_state, device_type, 
		device_label, added_at, last_used_at FROM credentials WHERE user_id = $1 AND revoked_at IS NULL`

	rows, err := r.db.Query(query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user credentials: %w", err)
	}
	defer rows.Close()

	var credentials []Credential
	for rows.Next() {
		var cred Credential
		err := rows.Scan(&cred.ID, &cred.UserID, &cred.PublicKey,
			&cred.AttestationType, &cred.AttestationSource, &cred.AAGUID,
			&cred.SignCount, &cred.CloneWarning, &cred.BackupEligible,
			&cred.BackupState, &cred.DeviceType, &cred.DeviceLabel,
			&cred.AddedAt, &cred.LastUsedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan credential: %w", err)
		}
		credentials = append(credentials, cred)
	}
	return credentials, nil
}

// SaveSession saves a session to the database
func (r *Repository) SaveSession(session Session) error {
	query := `INSERT INTO sessions (id, user_id, cred_id, refresh_hash, device_label, 
		ip_fingerprint, user_agent_hash, created_at, last_used_at, expires_at) 
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`

	_, err := r.db.Exec(query, session.ID, session.UserID, session.CredID,
		session.RefreshHash, session.DeviceLabel, session.IPFingerprint,
		session.UserAgentHash, session.CreatedAt, session.LastUsedAt, session.ExpiresAt)

	if err != nil {
		return fmt.Errorf("failed to save session: %w", err)
	}
	log.Printf("✅ Saved session %s for user %s", session.ID, session.UserID)
	return nil
}

// GetUserSessions retrieves sessions for a user
func (r *Repository) GetUserSessions(userID uuid.UUID) ([]Session, error) {
	query := `SELECT id, user_id, cred_id, refresh_hash, device_label, 
		ip_fingerprint, user_agent_hash, created_at, last_used_at, expires_at, revoked_at 
		FROM sessions WHERE user_id = $1 ORDER BY created_at DESC`

	rows, err := r.db.Query(query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user sessions: %w", err)
	}
	defer rows.Close()

	var sessions []Session
	for rows.Next() {
		var session Session
		err := rows.Scan(&session.ID, &session.UserID, &session.CredID,
			&session.RefreshHash, &session.DeviceLabel, &session.IPFingerprint,
			&session.UserAgentHash, &session.CreatedAt, &session.LastUsedAt,
			&session.ExpiresAt, &session.RevokedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan session: %w", err)
		}
		sessions = append(sessions, session)
	}
	return sessions, nil
}

// RevokeSession marks a session as revoked
func (r *Repository) RevokeSession(sessionID uuid.UUID) error {
	query := `UPDATE sessions SET revoked_at = $1 WHERE id = $2`
	_, err := r.db.Exec(query, time.Now(), sessionID)
	if err != nil {
		return fmt.Errorf("failed to revoke session: %w", err)
	}
	log.Printf("✅ Revoked session %s", sessionID)
	return nil
}

// SaveMobileChallenge saves a mobile challenge to the database
func (r *Repository) SaveMobileChallenge(challenge MobileChallenge) error {
	query := `INSERT INTO mobile_challenges (id, user_id, challenge, created_at, expires_at) 
		VALUES ($1, $2, $3, $4, $5)`

	_, err := r.db.Exec(query, challenge.ID, challenge.UserID, challenge.Challenge,
		challenge.CreatedAt, challenge.ExpiresAt)

	if err != nil {
		return fmt.Errorf("failed to save mobile challenge: %w", err)
	}
	log.Printf("✅ Saved mobile challenge %s for user %s", challenge.ID, challenge.UserID)
	return nil
}

// GetMobileChallenge retrieves a mobile challenge by ID
func (r *Repository) GetMobileChallenge(challengeID uuid.UUID) (*MobileChallenge, error) {
	query := `SELECT id, user_id, challenge, created_at, expires_at 
		FROM mobile_challenges WHERE id = $1`

	challenge := &MobileChallenge{}
	err := r.db.QueryRow(query, challengeID).Scan(&challenge.ID, &challenge.UserID,
		&challenge.Challenge, &challenge.CreatedAt, &challenge.ExpiresAt)

	if err != nil {
		return nil, fmt.Errorf("failed to get mobile challenge: %w", err)
	}
	return challenge, nil
}

// SaveRoutineLog saves a routine log to the database
func (r *Repository) SaveRoutineLog(routineLog RoutineLog) (int, error) {
	query := `INSERT INTO routine_logs (user_id, sleep_hours, meal_times, screen_time, 
		exercise_duration, wake_up_time, bed_time, water_intake, stress_level, log_date) 
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`

	var id int
	err := r.db.QueryRow(query, routineLog.UserID, routineLog.SleepHours, routineLog.MealTimes, routineLog.ScreenTime,
		routineLog.ExerciseDuration, routineLog.WakeUpTime, routineLog.BedTime, routineLog.WaterIntake, routineLog.StressLevel, routineLog.LogDate).Scan(&id)

	if err != nil {
		return 0, fmt.Errorf("failed to save routine log: %w", err)
	}
	log.Printf("✅ Saved routine log %d for user %s", id, routineLog.UserID.String())
	return id, nil
}

// SaveAIReport saves an AI report to the database
func (r *Repository) SaveAIReport(report AIReport) error {
	query := `INSERT INTO ai_reports (routine_log_id, is_anomaly, confidence_score, 
		anomaly_type, recommendations, ai_service_response, drift_analysis, 
		baseline_comparison, model_version) 
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`

	_, err := r.db.Exec(query, report.RoutineLogID, report.IsAnomaly, report.ConfidenceScore,
		report.AnomalyType, report.Recommendations, report.AIServiceResponse,
		report.DriftAnalysis, report.BaselineComparison, report.ModelVersion)

	if err != nil {
		return fmt.Errorf("failed to save AI report: %w", err)
	}
	log.Printf("✅ Saved AI report for routine log %d", report.RoutineLogID)
	return nil
}

// GetRoutineLogWithAIReport retrieves a routine log with its AI report
func (r *Repository) GetRoutineLogWithAIReport(logID int) (*InsightResponse, error) {
	query := `SELECT rl.id, rl.user_id, rl.sleep_hours, rl.meal_times, rl.screen_time,
		rl.exercise_duration, rl.wake_up_time, rl.bed_time, rl.water_intake, rl.stress_level,
		rl.log_date, rl.created_at, rl.updated_at,
		ar.id, ar.routine_log_id, ar.is_anomaly, ar.confidence_score, ar.anomaly_type,
		ar.recommendations, ar.ai_service_response, ar.drift_analysis, ar.baseline_comparison,
		ar.model_version, ar.created_at
		FROM routine_logs rl
		LEFT JOIN ai_reports ar ON rl.id = ar.routine_log_id
		WHERE rl.id = $1`

	var insight InsightResponse
	err := r.db.QueryRow(query, logID).Scan(
		&insight.RoutineLog.ID, &insight.RoutineLog.UserID, &insight.RoutineLog.SleepHours,
		&insight.RoutineLog.MealTimes, &insight.RoutineLog.ScreenTime, &insight.RoutineLog.ExerciseDuration,
		&insight.RoutineLog.WakeUpTime, &insight.RoutineLog.BedTime, &insight.RoutineLog.WaterIntake,
		&insight.RoutineLog.StressLevel, &insight.RoutineLog.LogDate, &insight.RoutineLog.CreatedAt,
		&insight.RoutineLog.UpdatedAt,
		&insight.AIReport.ID, &insight.AIReport.RoutineLogID, &insight.AIReport.IsAnomaly,
		&insight.AIReport.ConfidenceScore, &insight.AIReport.AnomalyType, &insight.AIReport.Recommendations,
		&insight.AIReport.AIServiceResponse, &insight.AIReport.DriftAnalysis, &insight.AIReport.BaselineComparison,
		&insight.AIReport.ModelVersion, &insight.AIReport.CreatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to get routine log with AI report: %w", err)
	}
	return &insight, nil
}

// GetRoutineLogsByUser retrieves routine logs for a specific user
func (r *Repository) GetRoutineLogsByUser(userID uuid.UUID, limit int) ([]RoutineLog, error) {
	query := `SELECT id, user_id, sleep_hours, meal_times, screen_time, exercise_duration,
		wake_up_time, bed_time, water_intake, stress_level, log_date, created_at, updated_at
		FROM routine_logs 
		WHERE user_id = $1 
		ORDER BY created_at DESC 
		LIMIT $2`

	rows, err := r.db.Query(query, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get routine logs: %w", err)
	}
	defer rows.Close()

	var logs []RoutineLog
	for rows.Next() {
		var log RoutineLog
		err := rows.Scan(&log.ID, &log.UserID, &log.SleepHours, &log.MealTimes, &log.ScreenTime,
			&log.ExerciseDuration, &log.WakeUpTime, &log.BedTime, &log.WaterIntake, &log.StressLevel,
			&log.LogDate, &log.CreatedAt, &log.UpdatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan routine log: %w", err)
		}
		logs = append(logs, log)
	}
	return logs, nil
}

// SaveLinkToken saves a link token to the database
func (r *Repository) SaveLinkToken(linkToken LinkToken) error {
	query := `INSERT INTO link_tokens (id, token_hash, user_id, created_at, expires_at, device_label) 
		VALUES ($1, $2, $3, $4, $5, $6)`

	_, err := r.db.Exec(query, linkToken.ID, linkToken.TokenHash, linkToken.UserID,
		linkToken.CreatedAt, linkToken.ExpiresAt, linkToken.DeviceLabel)
	if err != nil {
		return fmt.Errorf("failed to save link token: %w", err)
	}
	log.Printf("✅ Saved link token %s for user %s", linkToken.ID, linkToken.UserID)
	return nil
}

// GetLinkTokens retrieves all link tokens from the database
func (r *Repository) GetLinkTokens() ([]LinkToken, error) {
	query := `SELECT id, token_hash, user_id, created_at, expires_at, used_at, device_label 
		FROM link_tokens`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to get link tokens: %w", err)
	}
	defer rows.Close()

	var linkTokens []LinkToken
	for rows.Next() {
		var token LinkToken
		err := rows.Scan(&token.ID, &token.TokenHash, &token.UserID,
			&token.CreatedAt, &token.ExpiresAt, &token.UsedAt, &token.DeviceLabel)
		if err != nil {
			return nil, fmt.Errorf("failed to scan link token: %w", err)
		}
		linkTokens = append(linkTokens, token)
	}
	return linkTokens, nil
}

// GetUserLinkTokens retrieves link tokens for a specific user
func (r *Repository) GetUserLinkTokens(userID uuid.UUID) ([]LinkToken, error) {
	query := `SELECT id, token_hash, user_id, created_at, expires_at, used_at, device_label 
		FROM link_tokens WHERE user_id = $1`

	rows, err := r.db.Query(query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user link tokens: %w", err)
	}
	defer rows.Close()

	var linkTokens []LinkToken
	for rows.Next() {
		var token LinkToken
		err := rows.Scan(&token.ID, &token.TokenHash, &token.UserID,
			&token.CreatedAt, &token.ExpiresAt, &token.UsedAt, &token.DeviceLabel)
		if err != nil {
			return nil, fmt.Errorf("failed to scan link token: %w", err)
		}
		linkTokens = append(linkTokens, token)
	}
	return linkTokens, nil
}

// UpdateLinkToken updates a link token in the database
func (r *Repository) UpdateLinkToken(linkToken LinkToken) error {
	query := `UPDATE link_tokens SET used_at = $1 WHERE id = $2`

	_, err := r.db.Exec(query, linkToken.UsedAt, linkToken.ID)
	if err != nil {
		return fmt.Errorf("failed to update link token: %w", err)
	}
	log.Printf("✅ Updated link token %s", linkToken.ID)
	return nil
}
