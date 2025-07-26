package database

import (
	"time"
)

// RoutineLog represents a daily routine log entry
type RoutineLog struct {
	ID               int       `json:"id,omitempty" db:"id"`
	UserID           string    `json:"user_id" db:"user_id"` // Changed from int to string
	SleepHours       float64   `json:"sleep_hours" db:"sleep_hours"`
	MealTimes        []string  `json:"meal_times" db:"meal_times"`
	ScreenTime       float64   `json:"screen_time" db:"screen_time"`
	ExerciseDuration float64   `json:"exercise_duration" db:"exercise_duration"`
	WakeUpTime       string    `json:"wake_up_time" db:"wake_up_time"`
	BedTime          string    `json:"bed_time" db:"bed_time"`
	WaterIntake      float64   `json:"water_intake" db:"water_intake"`
	StressLevel      int       `json:"stress_level" db:"stress_level"`
	LogDate          string    `json:"log_date" db:"log_date"`
	CreatedAt        time.Time `json:"created_at,omitempty" db:"created_at"`
	UpdatedAt        time.Time `json:"updated_at,omitempty" db:"updated_at"`
}

// AIReport represents an AI analysis report for a routine log
type AIReport struct {
	ID                int       `json:"id,omitempty" db:"id"`
	RoutineLogID      int       `json:"routine_log_id" db:"routine_log_id"`
	IsAnomaly         bool      `json:"is_anomaly" db:"is_anomaly"`
	ConfidenceScore   float64   `json:"confidence_score" db:"confidence_score"`
	AnomalyType       string    `json:"anomaly_type" db:"anomaly_type"`
	Recommendations   []string  `json:"recommendations" db:"recommendations"`
	AIServiceResponse string    `json:"ai_service_response" db:"ai_service_response"`
	CreatedAt         time.Time `json:"created_at,omitempty" db:"created_at"`
}

// InsightResponse combines routine log and AI report
type InsightResponse struct {
	RoutineLog RoutineLog `json:"routine_log"`
	AIReport   AIReport   `json:"ai_report"`
}

// User represents a system user (simplified for privacy)
type User struct {
	ID        string    `json:"id,omitempty" db:"id"` // Changed from int to string
	Username  string    `json:"username" db:"username"`
	DeviceID  string    `json:"device_id" db:"device_id"`
	CreatedAt time.Time `json:"created_at,omitempty" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at,omitempty" db:"updated_at"`
}
