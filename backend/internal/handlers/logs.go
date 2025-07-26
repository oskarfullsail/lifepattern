package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"lifepattern-api/internal/database"
	"lifepattern-api/internal/services"
)

type LogHandler struct {
	routineService services.RoutineServiceInterface
}

func NewLogHandler(routineService services.RoutineServiceInterface) *LogHandler {
	return &LogHandler{
		routineService: routineService,
	}
}

// CreateRoutineLog handles POST /log requests
func (h *LogHandler) CreateRoutineLog(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var routineLog database.RoutineLog
	if err := json.NewDecoder(r.Body).Decode(&routineLog); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if err := validateRoutineLog(routineLog); err != nil {
		http.Error(w, fmt.Sprintf("Validation error: %v", err), http.StatusBadRequest)
		return
	}

	// Create routine log with AI analysis
	response, err := h.routineService.CreateRoutineLog(routineLog)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error creating routine log: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

// GetUserRoutineLogs handles GET /logs requests
func (h *LogHandler) GetUserRoutineLogs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get user ID from query parameter
	userIDStr := r.URL.Query().Get("user_id")
	if userIDStr == "" {
		http.Error(w, "user_id parameter required", http.StatusBadRequest)
		return
	}

	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		http.Error(w, "Invalid user_id", http.StatusBadRequest)
		return
	}

	// Get limit from query parameter (default 10)
	limitStr := r.URL.Query().Get("limit")
	limit := 10
	if limitStr != "" {
		if limit, err = strconv.Atoi(limitStr); err != nil {
			http.Error(w, "Invalid limit", http.StatusBadRequest)
			return
		}
	}

	// Get routine logs
	logs, err := h.routineService.GetUserRoutineLogs(userID, limit)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error retrieving routine logs: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"user_id": userID,
		"logs":    logs,
		"count":   len(logs),
	})
}

// validateRoutineLog validates routine log data
func validateRoutineLog(log database.RoutineLog) error {
	if log.SleepHours < 0 || log.SleepHours > 24 {
		return fmt.Errorf("sleep_hours must be between 0 and 24")
	}
	if log.ScreenTime < 0 || log.ScreenTime > 24 {
		return fmt.Errorf("screen_time must be between 0 and 24")
	}
	if log.ExerciseDuration < 0 || log.ExerciseDuration > 24 {
		return fmt.Errorf("exercise_duration must be between 0 and 24")
	}
	if log.WaterIntake < 0 {
		return fmt.Errorf("water_intake must be positive")
	}
	if log.StressLevel < 1 || log.StressLevel > 10 {
		return fmt.Errorf("stress_level must be between 1 and 10")
	}
	if len(log.MealTimes) == 0 {
		return fmt.Errorf("meal_times cannot be empty")
	}
	if log.WakeUpTime == "" {
		return fmt.Errorf("wake_up_time is required")
	}
	if log.BedTime == "" {
		return fmt.Errorf("bed_time is required")
	}

	return nil
}
