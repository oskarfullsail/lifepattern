package handlers

import (
	"encoding/json"
	"net/http"

	"lifepattern-api/internal/config"
)

// FeatureHandler handles feature configuration requests
type FeatureHandler struct {
	featureConfig *config.FeatureConfig
}

// FeatureFlagsResponse represents the API response for feature flags
type FeatureFlagsResponse struct {
	EnableSurveyPrompt bool `json:"enable_survey_prompt"`
}

// NewFeatureHandler creates a new feature handler
func NewFeatureHandler(featureConfig *config.FeatureConfig) *FeatureHandler {
	return &FeatureHandler{
		featureConfig: featureConfig,
	}
}

// GetFeatureFlags handles GET /api/config/features requests
func (h *FeatureHandler) GetFeatureFlags(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	response := FeatureFlagsResponse{
		EnableSurveyPrompt: h.featureConfig.EnableSurveyPrompt,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

