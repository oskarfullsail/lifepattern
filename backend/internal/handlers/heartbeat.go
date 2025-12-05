package handlers

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"lifepattern-api/internal/services"
)

// HeartbeatHandler handles AI service heartbeat requests
type HeartbeatHandler struct {
	aiService *services.AIService
}

// NewHeartbeatHandler creates a new heartbeat handler
func NewHeartbeatHandler(aiService *services.AIService) *HeartbeatHandler {
	return &HeartbeatHandler{
		aiService: aiService,
	}
}

// HeartbeatResponse represents the response to frontend
type HeartbeatResponse struct {
	Status    string `json:"status"`    // "ok" | "unreachable" | "degraded"
	Timestamp string `json:"timestamp"`
	Greeting  string `json:"greeting"`
}

// GetHeartbeat handles GET /api/v1/ai/heartbeat
// This endpoint:
// 1. Optionally reads userID from auth context (for future personalization)
// 2. Calls AI service heartbeat endpoint with short timeout
// 3. Returns status and greeting, or fallback if AI service is unreachable
func (h *HeartbeatHandler) GetHeartbeat(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Optional: Extract userID from context for future personalization
	// For now, we don't use it, but it's available if needed
	// userID := r.Context().Value("userID") // Would be set by auth middleware

	log.Printf("💓 Checking AI service heartbeat...")

	// Call AI service with short timeout (1-2 seconds for heartbeat)
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()

	aiResponse, err := h.aiService.CheckHeartbeat(ctx)
	if err != nil {
		log.Printf("⚠️ AI service heartbeat failed: %v", err)
		
		// Return fallback response
		response := HeartbeatResponse{
			Status:    "unreachable",
			Timestamp: time.Now().UTC().Format(time.RFC3339),
			Greeting:  "Welcome back! We're having trouble reaching the AI right now, but you can still track your habits.",
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK) // Still return 200, but with "unreachable" status
		if err := json.NewEncoder(w).Encode(response); err != nil {
			log.Printf("❌ Failed to encode heartbeat response: %v", err)
		}
		return
	}

	// Transform AI service response to frontend format
	response := HeartbeatResponse{
		Status:    aiResponse.Status,
		Timestamp: aiResponse.Timestamp,
		Greeting:  aiResponse.Greeting,
	}

	log.Printf("✅ AI service heartbeat successful: %s", aiResponse.Greeting)

	// Return response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("❌ Failed to encode heartbeat response: %v", err)
	}
}

