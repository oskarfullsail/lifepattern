package database

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"

	_ "github.com/lib/pq"
)

type Repository struct {
	db *sql.DB
}

func NewRepository(dbURL string) (*Repository, error) {
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	log.Println("✅ Connected to database")
	return &Repository{db: db}, nil
}

func (r *Repository) Close() error {
	return r.db.Close()
}

// SaveRoutineLog saves a routine log to the database
func (r *Repository) SaveRoutineLog(log RoutineLog) (int, error) {
	query := `
		INSERT INTO routine_logs (user_id, sleep_hours, meal_times, screen_time, exercise_duration, 
		                         wake_up_time, bed_time, water_intake, stress_level, log_date)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id`

	mealTimesJSON, err := json.Marshal(log.MealTimes)
	if err != nil {
		return 0, fmt.Errorf("failed to marshal meal times: %w", err)
	}

	var id int
	err = r.db.QueryRow(query,
		log.UserID, log.SleepHours, mealTimesJSON, log.ScreenTime, log.ExerciseDuration,
		log.WakeUpTime, log.BedTime, log.WaterIntake, log.StressLevel, log.LogDate).Scan(&id)

	if err != nil {
		return 0, fmt.Errorf("failed to save routine log: %w", err)
	}

	return id, nil
}

// SaveAIReport saves an AI report to the database
func (r *Repository) SaveAIReport(report AIReport) error {
	query := `
		INSERT INTO ai_reports (routine_log_id, is_anomaly, confidence_score, anomaly_type, 
		                       recommendations, ai_service_response)
		VALUES ($1, $2, $3, $4, $5, $6)`

	recommendationsJSON, err := json.Marshal(report.Recommendations)
	if err != nil {
		return fmt.Errorf("failed to marshal recommendations: %w", err)
	}

	_, err = r.db.Exec(query,
		report.RoutineLogID, report.IsAnomaly, report.ConfidenceScore,
		report.AnomalyType, recommendationsJSON, report.AIServiceResponse)

	if err != nil {
		return fmt.Errorf("failed to save AI report: %w", err)
	}

	return nil
}

// GetRoutineLogWithAIReport retrieves a routine log with its AI report
func (r *Repository) GetRoutineLogWithAIReport(logID int) (*InsightResponse, error) {
	// Get routine log
	logQuery := `SELECT id, user_id, sleep_hours, meal_times, screen_time, exercise_duration,
	                    wake_up_time, bed_time, water_intake, stress_level, log_date, created_at
	             FROM routine_logs WHERE id = $1`

	var routineLog RoutineLog
	var mealTimesJSON []byte
	err := r.db.QueryRow(logQuery, logID).Scan(
		&routineLog.ID, &routineLog.UserID, &routineLog.SleepHours, &mealTimesJSON,
		&routineLog.ScreenTime, &routineLog.ExerciseDuration, &routineLog.WakeUpTime,
		&routineLog.BedTime, &routineLog.WaterIntake, &routineLog.StressLevel,
		&routineLog.LogDate, &routineLog.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to get routine log: %w", err)
	}

	if err := json.Unmarshal(mealTimesJSON, &routineLog.MealTimes); err != nil {
		return nil, fmt.Errorf("failed to unmarshal meal times: %w", err)
	}

	// Get AI report
	aiQuery := `SELECT id, routine_log_id, is_anomaly, confidence_score, anomaly_type,
	                   recommendations, ai_service_response, created_at
	            FROM ai_reports WHERE routine_log_id = $1`

	var aiReport AIReport
	var recommendationsJSON []byte
	err = r.db.QueryRow(aiQuery, logID).Scan(
		&aiReport.ID, &aiReport.RoutineLogID, &aiReport.IsAnomaly, &aiReport.ConfidenceScore,
		&aiReport.AnomalyType, &recommendationsJSON, &aiReport.AIServiceResponse, &aiReport.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to get AI report: %w", err)
	}

	if err := json.Unmarshal(recommendationsJSON, &aiReport.Recommendations); err != nil {
		return nil, fmt.Errorf("failed to unmarshal recommendations: %w", err)
	}

	return &InsightResponse{RoutineLog: routineLog, AIReport: aiReport}, nil
}

// GetRoutineLogsByUser retrieves routine logs for a specific user
func (r *Repository) GetRoutineLogsByUser(userID int, limit int) ([]RoutineLog, error) {
	query := `SELECT id, user_id, sleep_hours, meal_times, screen_time, exercise_duration,
	                 wake_up_time, bed_time, water_intake, stress_level, log_date, created_at
	          FROM routine_logs 
	          WHERE user_id = $1 
	          ORDER BY created_at DESC 
	          LIMIT $2`

	rows, err := r.db.Query(query, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to query routine logs: %w", err)
	}
	defer rows.Close()

	var logs []RoutineLog
	for rows.Next() {
		var log RoutineLog
		var mealTimesJSON []byte
		err := rows.Scan(
			&log.ID, &log.UserID, &log.SleepHours, &mealTimesJSON, &log.ScreenTime,
			&log.ExerciseDuration, &log.WakeUpTime, &log.BedTime, &log.WaterIntake,
			&log.StressLevel, &log.LogDate, &log.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan routine log: %w", err)
		}

		if err := json.Unmarshal(mealTimesJSON, &log.MealTimes); err != nil {
			return nil, fmt.Errorf("failed to unmarshal meal times: %w", err)
		}

		logs = append(logs, log)
	}

	return logs, nil
}

// Ping checks database connectivity
func (r *Repository) Ping() error {
	return r.db.Ping()
}
