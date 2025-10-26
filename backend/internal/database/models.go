package database

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
)

// JSONStringArray is a custom type for handling PostgreSQL JSONB arrays of strings
type JSONStringArray []string

// Value implements the driver.Valuer interface for database writes
func (j JSONStringArray) Value() (driver.Value, error) {
	if j == nil {
		return json.Marshal([]string{})
	}
	return json.Marshal(j)
}

// Scan implements the sql.Scanner interface for database reads
func (j *JSONStringArray) Scan(value interface{}) error {
	if value == nil {
		*j = []string{}
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("failed to scan JSONStringArray: value is not []byte")
	}

	var arr []string
	if err := json.Unmarshal(bytes, &arr); err != nil {
		return err
	}

	*j = arr
	return nil
}

// User represents a user in the zero-PII authentication system
type User struct {
	ID         uuid.UUID `json:"id" db:"id"`
	CreatedAt  time.Time `json:"created_at" db:"created_at"`
	LastSeenAt time.Time `json:"last_seen_at" db:"last_seen_at"`
}

// UserCredential represents stored username/passphrase credentials
type UserCredential struct {
	ID               uuid.UUID `json:"id" db:"id"`
	UserID           uuid.UUID `json:"user_id" db:"user_id"`
	Username         string    `json:"username" db:"username"`
	HashedPassphrase string    `json:"hashed_passphrase" db:"hashed_passphrase"`
	Salt             string    `json:"salt" db:"salt"`
	CreatedAt        time.Time `json:"created_at" db:"created_at"`
	LastUsedAt       time.Time `json:"last_used_at" db:"last_used_at"`
}

// Credential represents a WebAuthn credential or device key
type Credential struct {
	ID                uuid.UUID  `json:"id" db:"id"`
	UserID            uuid.UUID  `json:"user_id" db:"user_id"`
	PublicKey         []byte     `json:"public_key" db:"public_key"`
	AttestationType   string     `json:"attestation_type" db:"attestation_type"`
	AttestationSource string     `json:"attestation_source" db:"attestation_source"`
	AAGUID            *uuid.UUID `json:"aaguid" db:"aaguid"`
	SignCount         int64      `json:"sign_count" db:"sign_count"`
	CloneWarning      bool       `json:"clone_warning" db:"clone_warning"`
	BackupEligible    bool       `json:"backup_eligible" db:"backup_eligible"`
	BackupState       bool       `json:"backup_state" db:"backup_state"`
	DeviceType        string     `json:"device_type" db:"device_type"`
	DeviceLabel       string     `json:"device_label" db:"device_label"`
	AddedAt           time.Time  `json:"added_at" db:"added_at"`
	LastUsedAt        time.Time  `json:"last_used_at" db:"last_used_at"`
	RevokedAt         *time.Time `json:"revoked_at" db:"revoked_at"`
}

// Session represents a user session with refresh token
type Session struct {
	ID            uuid.UUID  `json:"id" db:"id"`
	UserID        uuid.UUID  `json:"user_id" db:"user_id"`
	CredID        *uuid.UUID `json:"cred_id" db:"cred_id"`
	RefreshHash   string     `json:"refresh_hash" db:"refresh_hash"`
	DeviceLabel   string     `json:"device_label" db:"device_label"`
	IPFingerprint string     `json:"ip_fingerprint" db:"ip_fingerprint"`
	UserAgentHash string     `json:"user_agent_hash" db:"user_agent_hash"`
	CreatedAt     time.Time  `json:"created_at" db:"created_at"`
	LastUsedAt    time.Time  `json:"last_used_at" db:"last_used_at"`
	ExpiresAt     time.Time  `json:"expires_at" db:"expires_at"`
	RevokedAt     *time.Time `json:"revoked_at" db:"revoked_at"`
}

// LinkToken represents a cross-device linking token
type LinkToken struct {
	ID          uuid.UUID  `json:"id" db:"id"`
	TokenHash   string     `json:"token_hash" db:"token_hash"`
	UserID      uuid.UUID  `json:"user_id" db:"user_id"`
	CreatedAt   time.Time  `json:"created_at" db:"created_at"`
	ExpiresAt   time.Time  `json:"expires_at" db:"expires_at"`
	UsedAt      *time.Time `json:"used_at" db:"used_at"`
	DeviceLabel string     `json:"device_label" db:"device_label"`
}

// RoutineLog represents a daily routine log entry
type RoutineLog struct {
	ID               int             `json:"id,omitempty" db:"id"`
	UserID           uuid.UUID       `json:"user_id" db:"user_id"`
	SleepHours       float64         `json:"sleep_hours" db:"sleep_hours"`
	MealTimes        JSONStringArray `json:"meal_times" db:"meal_times"`
	ScreenTime       float64         `json:"screen_time" db:"screen_time"`
	ExerciseDuration float64         `json:"exercise_duration" db:"exercise_duration"`
	WakeUpTime       string          `json:"wake_up_time" db:"wake_up_time"`
	BedTime          string          `json:"bed_time" db:"bed_time"`
	WaterIntake      float64         `json:"water_intake" db:"water_intake"`
	StressLevel      int             `json:"stress_level" db:"stress_level"`
	LogDate          string          `json:"log_date" db:"log_date"`
	CreatedAt        time.Time       `json:"created_at,omitempty" db:"created_at"`
	UpdatedAt        time.Time       `json:"updated_at,omitempty" db:"updated_at"`
}

// AIReport represents an AI analysis report for a routine log
type AIReport struct {
	ID                      int             `json:"id,omitempty" db:"id"`
	RoutineLogID            int             `json:"routine_log_id" db:"routine_log_id"`
	IsAnomaly               bool            `json:"is_anomaly" db:"is_anomaly"`
	ConfidenceScore         float64         `json:"confidence_score" db:"confidence_score"`
	AnomalyType             string          `json:"anomaly_type" db:"anomaly_type"`
	Recommendations         JSONStringArray `json:"recommendations" db:"recommendations"`
	EnhancedRecommendations json.RawMessage `json:"enhanced_recommendations" db:"enhanced_recommendations"`
	BehavioralContexts      JSONStringArray `json:"behavioral_contexts" db:"behavioral_contexts"`
	AIServiceResponse       string          `json:"ai_service_response" db:"ai_service_response"`
	DriftAnalysis           json.RawMessage `json:"drift_analysis" db:"drift_analysis"`
	BaselineComparison      json.RawMessage `json:"baseline_comparison" db:"baseline_comparison"`
	ModelVersion            string          `json:"model_version" db:"model_version"`
	CreatedAt               time.Time       `json:"created_at,omitempty" db:"created_at"`
}

// InsightResponse combines routine log and AI report data
type InsightResponse struct {
	RoutineLog RoutineLog `json:"routine_log"`
	AIReport   AIReport   `json:"ai_report"`
}

// AuthRequest represents authentication request data
type AuthRequest struct {
	UserID      uuid.UUID `json:"user_id"`
	DeviceLabel string    `json:"device_label,omitempty"`
	IPAddress   string    `json:"ip_address,omitempty"`
	UserAgent   string    `json:"user_agent,omitempty"`
}

// AuthResponse represents authentication response data
type AuthResponse struct {
	UserID       uuid.UUID `json:"user_id"`
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token,omitempty"`
	ExpiresIn    int       `json:"expires_in"`
	DeviceLabel  string    `json:"device_label,omitempty"`
}

// SessionInfo represents session information for listing
type SessionInfo struct {
	ID          uuid.UUID `json:"id"`
	DeviceLabel string    `json:"device_label"`
	IPAddress   string    `json:"ip_address,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	LastUsedAt  time.Time `json:"last_used_at"`
	ExpiresAt   time.Time `json:"expires_at"`
	IsCurrent   bool      `json:"is_current"`
}

// LinkTokenResponse represents cross-device linking response
type LinkTokenResponse struct {
	Token       string    `json:"token"`
	QRCode      string    `json:"qr_code,omitempty"`
	ExpiresAt   time.Time `json:"expires_at"`
	DeviceLabel string    `json:"device_label"`
}

// MobileChallenge represents a challenge for mobile authentication
type MobileChallenge struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	Challenge string    `json:"challenge"`
	CreatedAt time.Time `json:"created_at"`
	ExpiresAt time.Time `json:"expires_at"`
}
