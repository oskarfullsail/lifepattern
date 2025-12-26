package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"lifepattern-api/internal/database"
	"lifepattern-api/internal/services"

	"github.com/google/uuid"
)

// LogHandler handles log-related requests
type LogHandler struct {
	routineService services.RoutineServiceInterface
}

// NewLogHandler creates a new log handler
func NewLogHandler(routineService services.RoutineServiceInterface) *LogHandler {
	return &LogHandler{
		routineService: routineService,
	}
}

// normalizeTimeInput converts various time formats to HH:MM format
// Handles inputs like: "7", "7:30", "07:30", "7:30:00", "07:30:00"
func normalizeTimeInput(timeStr string) string {
	if timeStr == "" {
		return ""
	}

	// Trim whitespace
	timeStr = strings.TrimSpace(timeStr)

	// If it's just a number (e.g., "7"), convert to "07:00"
	if num, err := strconv.Atoi(timeStr); err == nil {
		if num >= 0 && num <= 23 {
			return fmt.Sprintf("%02d:00", num)
		}
		return "00:00" // Invalid hour
	}

	// If it contains a colon, parse it
	parts := strings.Split(timeStr, ":")
	if len(parts) >= 2 {
		// Parse hour and minute
		hour, err1 := strconv.Atoi(parts[0])
		minute, err2 := strconv.Atoi(parts[1])

		if err1 == nil && err2 == nil {
			// Validate ranges
			if hour < 0 || hour > 23 {
				hour = 0
			}
			if minute < 0 || minute > 59 {
				minute = 0
			}
			return fmt.Sprintf("%02d:%02d", hour, minute)
		}
	}

	// If we can't parse it, return as-is (might already be in correct format)
	return timeStr
}

// CreateRoutineLog handles POST /log requests
func (h *LogHandler) CreateRoutineLog(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse request body
	var routineLog database.RoutineLog
	if err := json.NewDecoder(r.Body).Decode(&routineLog); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Normalize time inputs to handle various formats
	routineLog.WakeUpTime = normalizeTimeInput(routineLog.WakeUpTime)
	routineLog.BedTime = normalizeTimeInput(routineLog.BedTime)

	// Create routine log
	response, err := h.routineService.CreateRoutineLog(routineLog)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to create routine log: %v", err), http.StatusInternalServerError)
		return
	}

	// Return response
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

	// Get user_id from query parameter
	userIDStr := r.URL.Query().Get("user_id")
	if userIDStr == "" {
		http.Error(w, "user_id parameter required", http.StatusBadRequest)
		return
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		http.Error(w, "Invalid user_id", http.StatusBadRequest)
		return
	}

	// Get limit from query parameter (default 10)
	limitStr := r.URL.Query().Get("limit")
	limit := 10
	if limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err != nil {
			http.Error(w, "Invalid limit", http.StatusBadRequest)
			return
		} else {
			limit = parsedLimit
		}
	}

	// Get routine logs
	logs, err := h.routineService.GetUserRoutineLogs(userID, limit)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get routine logs: %v", err), http.StatusInternalServerError)
		return
	}

	// Get total count of logs for this user
	totalCount, err := h.routineService.GetUserRoutineLogsCount(userID)
	if err != nil {
		// If we can't get the count, just use the length of logs
		totalCount = len(logs)
	}

	// Return logs in the format expected by frontend
	response := map[string]interface{}{
		"user_id":     userID.String(),
		"logs":        logs,
		"total_count": totalCount,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
