package handlers

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"

	"lifepattern-api/internal/database"
)

// AdminLogsHandler handles admin operations for routine logs export
type AdminLogsHandler struct {
	repo *database.Repository
}

// NewAdminLogsHandler creates a new admin logs handler
func NewAdminLogsHandler(repo *database.Repository) *AdminLogsHandler {
	return &AdminLogsHandler{repo: repo}
}

// GetAllRoutineLogs handles GET /admin/routine-logs (JSON format)
func (h *AdminLogsHandler) GetAllRoutineLogs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	logs, err := h.repo.GetAllRoutineLogsWithAIReports()
	if err != nil {
		log.Printf("❌ Failed to get routine logs: %v", err)
		http.Error(w, fmt.Sprintf("Failed to get routine logs: %v", err), http.StatusInternalServerError)
		return
	}

	count, _ := h.repo.GetRoutineLogsCount()

	response := map[string]interface{}{
		"total_count": count,
		"logs":        logs,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// ExportRoutineLogsCSV handles GET /admin/routine-logs/export (CSV format)
// This exports all routine logs with AI reports in a format suitable for ML training
func (h *AdminLogsHandler) ExportRoutineLogsCSV(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	logs, err := h.repo.GetAllRoutineLogsWithAIReports()
	if err != nil {
		log.Printf("❌ Failed to get routine logs for export: %v", err)
		http.Error(w, fmt.Sprintf("Failed to get routine logs: %v", err), http.StatusInternalServerError)
		return
	}

	// Set headers for CSV download
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", "attachment; filename=routine_logs_export.csv")

	writer := csv.NewWriter(w)
	defer writer.Flush()

	// Write header row - comprehensive for ML training
	headers := []string{
		// Routine log fields
		"log_id",
		"user_id",
		"log_date",
		"sleep_hours",
		"screen_time",
		"exercise_duration",
		"water_intake",
		"stress_level",
		"wake_up_time",
		"bed_time",
		"meal_times",
		"created_at",
		// AI Report fields
		"has_ai_report",
		"is_anomaly",
		"confidence_score",
		"anomaly_type",
		"model_version",
		"recommendations",
		"behavioral_contexts",
	}
	writer.Write(headers)

	// Write data rows
	for _, item := range logs {
		rl := item.RoutineLog

		// Format meal times as comma-separated string
		mealTimesStr := strings.Join(rl.MealTimes, ";")

		// AI report fields (may be nil)
		hasAIReport := "false"
		isAnomaly := ""
		confidence := ""
		anomalyType := ""
		modelVersion := ""
		recommendations := ""
		behavioralContexts := ""

		if item.AIReport != nil {
			hasAIReport = "true"
			if item.AIReport.IsAnomaly {
				isAnomaly = "true"
			} else {
				isAnomaly = "false"
			}
			confidence = fmt.Sprintf("%.4f", item.AIReport.ConfidenceScore)
			anomalyType = item.AIReport.AnomalyType
			modelVersion = item.AIReport.ModelVersion
			recommendations = strings.Join(item.AIReport.Recommendations, ";")
			behavioralContexts = strings.Join(item.AIReport.BehavioralContexts, ";")
		}

		row := []string{
			fmt.Sprintf("%d", rl.ID),
			rl.UserID.String(),
			rl.LogDate,
			fmt.Sprintf("%.2f", rl.SleepHours),
			fmt.Sprintf("%.2f", rl.ScreenTime),
			fmt.Sprintf("%.2f", rl.ExerciseDuration),
			fmt.Sprintf("%.2f", rl.WaterIntake),
			fmt.Sprintf("%d", rl.StressLevel),
			rl.WakeUpTime,
			rl.BedTime,
			mealTimesStr,
			rl.CreatedAt.Format("2006-01-02T15:04:05Z"),
			hasAIReport,
			isAnomaly,
			confidence,
			anomalyType,
			modelVersion,
			recommendations,
			behavioralContexts,
		}
		writer.Write(row)
	}

	log.Printf("✅ Exported %d routine logs to CSV", len(logs))
}

// GetRoutineLogsStats handles GET /admin/routine-logs/stats
func (h *AdminLogsHandler) GetRoutineLogsStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	count, err := h.repo.GetRoutineLogsCount()
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get count: %v", err), http.StatusInternalServerError)
		return
	}

	logs, err := h.repo.GetAllRoutineLogsWithAIReports()
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get logs: %v", err), http.StatusInternalServerError)
		return
	}

	// Calculate statistics
	anomalyCount := 0
	withAIReport := 0
	uniqueUsers := make(map[string]bool)

	for _, item := range logs {
		uniqueUsers[item.RoutineLog.UserID.String()] = true
		if item.AIReport != nil {
			withAIReport++
			if item.AIReport.IsAnomaly {
				anomalyCount++
			}
		}
	}

	stats := map[string]interface{}{
		"total_logs":         count,
		"logs_with_ai_report": withAIReport,
		"anomaly_count":      anomalyCount,
		"unique_users":       len(uniqueUsers),
		"anomaly_rate":       float64(anomalyCount) / float64(max(withAIReport, 1)),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

