package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

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

	// Return logs
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(logs)
}
