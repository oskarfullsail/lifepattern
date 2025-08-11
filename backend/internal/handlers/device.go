 package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"
)

// DeviceInfo represents device information
type DeviceInfo struct {
	Platform   string `json:"platform"`
	DeviceID   string `json:"device_id"`
	DeviceName string `json:"device_name"`
	OSVersion  string `json:"os_version"`
	AppVersion string `json:"app_version"`
}

// WatchData represents health data from smartwatch
type WatchData struct {
	HeartRate     int       `json:"heart_rate"`
	Steps         int       `json:"steps"`
	Calories      int       `json:"calories"`
	SleepHours    float64   `json:"sleep_hours"`
	ActivityLevel string    `json:"activity_level"`
	Timestamp     time.Time `json:"timestamp"`
}

// SyncWatchDataRequest represents the request to sync watch data
type SyncWatchDataRequest struct {
	UserID     string      `json:"user_id"`
	DeviceInfo DeviceInfo  `json:"device_info"`
	WatchData  []WatchData `json:"watch_data"`
}

// SyncWatchDataResponse represents the response from watch data sync
type SyncWatchDataResponse struct {
	SyncedCount int    `json:"synced_count"`
	Message     string `json:"message"`
}

// DeviceHandler handles device-related requests
type DeviceHandler struct{}

// NewDeviceHandler creates a new device handler
func NewDeviceHandler() *DeviceHandler {
	return &DeviceHandler{}
}

// GetDeviceInfo returns device information
func (h *DeviceHandler) GetDeviceInfo(w http.ResponseWriter, r *http.Request) {
	// In a real implementation, this would extract device info from headers or request
	// For now, return mock data based on User-Agent
	userAgent := r.Header.Get("User-Agent")

	deviceInfo := DeviceInfo{
		DeviceID:   uuid.New().String(),
		DeviceName: "Unknown Device",
		OSVersion:  "Unknown",
		AppVersion: "1.0.0",
	}

	// Simple platform detection based on User-Agent
	if userAgent != "" {
		if contains(userAgent, "iPhone") || contains(userAgent, "iPad") {
			deviceInfo.Platform = "ios"
			deviceInfo.DeviceName = "iPhone/iPad"
		} else if contains(userAgent, "Android") {
			deviceInfo.Platform = "android"
			deviceInfo.DeviceName = "Android Device"
		} else {
			deviceInfo.Platform = "web"
			deviceInfo.DeviceName = "Web Browser"
		}
	} else {
		deviceInfo.Platform = "web"
		deviceInfo.DeviceName = "Web Browser"
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(deviceInfo)
}

// SyncWatchData handles watch data synchronization
func (h *DeviceHandler) SyncWatchData(w http.ResponseWriter, r *http.Request) {
	var req SyncWatchDataRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate request
	if req.UserID == "" {
		http.Error(w, "User ID is required", http.StatusBadRequest)
		return
	}

	if len(req.WatchData) == 0 {
		http.Error(w, "Watch data is required", http.StatusBadRequest)
		return
	}

	// In a real implementation, this would save the watch data to the database
	// For now, just return success response
	response := SyncWatchDataResponse{
		SyncedCount: len(req.WatchData),
		Message:     "Watch data synced successfully",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Helper function to check if string contains substring
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr ||
		(len(s) > len(substr) && (s[:len(substr)] == substr ||
			s[len(s)-len(substr):] == substr ||
			func() bool {
				for i := 1; i <= len(s)-len(substr); i++ {
					if s[i:i+len(substr)] == substr {
						return true
					}
				}
				return false
			}())))
}
