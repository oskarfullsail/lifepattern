package handlers

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"lifepattern-api/internal/database"

	"github.com/google/uuid"
)

// QuestionnaireHandler handles screening and usability survey operations
type QuestionnaireHandler struct {
	repo *database.Repository
}

// NewQuestionnaireHandler creates a new questionnaire handler
func NewQuestionnaireHandler(repo *database.Repository) *QuestionnaireHandler {
	return &QuestionnaireHandler{repo: repo}
}

// ScreeningRequest represents the screening questionnaire submission
type ScreeningRequest struct {
	Age                     int    `json:"age"`
	Gender                  string `json:"gender"`
	Occupation              string `json:"occupation"`
	SmartphoneUsage         string `json:"smartphone_usage"`
	DeviceType              string `json:"device_type"`
	SleepHours              string `json:"sleep_hours"`
	HabitTracking           string `json:"habit_tracking"`
	RoutineStructure        string `json:"routine_structure"`
	ProductivityFluctuation string `json:"productivity_fluctuation"`
	TechComfort             string `json:"tech_comfort"`
	WellnessAppsUsed        bool   `json:"wellness_apps_used"`
	AIFeedbackOpenness      string `json:"ai_feedback_openness"`
	InterestReason          string `json:"interest_reason"`
}

// UsabilitySurveyRequest represents the usability survey submission
type UsabilitySurveyRequest struct {
	EasyToUse              int    `json:"easy_to_use"`
	FeltConfident          int    `json:"felt_confident"`
	ClearDesign            int    `json:"clear_design"`
	ResponsiveSmooth       int    `json:"responsive_smooth"`
	FeedbackUnderstandable int    `json:"feedback_understandable"`
	EasyToFind             int    `json:"easy_to_find"`
	HelpedReflect          int    `json:"helped_reflect"`
	WouldUseRegularly      int    `json:"would_use_regularly"`
	WouldRecommend         int    `json:"would_recommend"`
	OverallSatisfied       int    `json:"overall_satisfied"`
	LikedMost              string `json:"liked_most"`
	WouldImprove           string `json:"would_improve"`
	EncounteredIssues      string `json:"encountered_issues"`
}

// Calculate if user is a qualified tester based on criteria
func calculateQualifiedTester(req *ScreeningRequest) (bool, int) {
	score := 0

	// Criteria 1: Somewhat or unstructured routine (3 points)
	if req.RoutineStructure == "somewhat_structured" {
		score += 2
	} else if req.RoutineStructure == "unstructured" {
		score += 3
	}

	// Criteria 2: Comfortable using apps (3 points)
	if req.TechComfort == "comfortable" {
		score += 2
	} else if req.TechComfort == "very_comfortable" {
		score += 3
	}

	// Criteria 3: Open to AI feedback (3 points)
	if req.AIFeedbackOpenness == "open" {
		score += 2
	} else if req.AIFeedbackOpenness == "very_open" {
		score += 3
	}

	// Additional positive factors
	if req.HabitTracking == "sometimes" || req.HabitTracking == "often" {
		score += 1
	}
	if req.ProductivityFluctuation == "frequently" || req.ProductivityFluctuation == "always" {
		score += 1
	}
	if req.SmartphoneUsage == "daily" {
		score += 1
	}

	// Qualified if score >= 6 (at least 2 of the 3 main criteria met)
	isQualified := score >= 6

	return isQualified, score
}

// Calculate SUS score from usability survey responses
func calculateSUSScore(req *UsabilitySurveyRequest) float64 {
	// SUS scoring formula:
	// For odd items (1,3,5,7,9): score contribution = rating - 1
	// For even items (2,4,6,8,10): score contribution = 5 - rating
	// Sum all contributions and multiply by 2.5 to get final score (0-100)

	oddItems := []int{
		req.EasyToUse,         // 1
		req.ClearDesign,       // 3
		req.EasyToFind,        // 5
		req.WouldUseRegularly, // 7
		req.OverallSatisfied,  // 9
	}

	evenItems := []int{
		req.FeltConfident,          // 2 (confidence is positive, so treat as odd)
		req.ResponsiveSmooth,       // 4 (positive, treat as odd)
		req.FeedbackUnderstandable, // 6 (positive, treat as odd)
		req.HelpedReflect,          // 8 (positive, treat as odd)
		req.WouldRecommend,         // 10 (positive, treat as odd)
	}

	sum := 0

	// Calculate odd items contribution
	for _, rating := range oddItems {
		sum += rating - 1
	}

	// For our positive items, we treat them as odd (since all questions are positively framed)
	for _, rating := range evenItems {
		sum += rating - 1
	}

	// Multiply by 2.5 to get final SUS score
	susScore := float64(sum) * 2.5

	return susScore
}

// Calculate average rating
func calculateAverageRating(req *UsabilitySurveyRequest) float64 {
	ratings := []int{
		req.EasyToUse,
		req.FeltConfident,
		req.ClearDesign,
		req.ResponsiveSmooth,
		req.FeedbackUnderstandable,
		req.EasyToFind,
		req.HelpedReflect,
		req.WouldUseRegularly,
		req.WouldRecommend,
		req.OverallSatisfied,
	}

	sum := 0
	for _, rating := range ratings {
		sum += rating
	}

	return float64(sum) / float64(len(ratings))
}

// SubmitScreening handles POST /api/screening
func (h *QuestionnaireHandler) SubmitScreening(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context (set by auth middleware)
	userIDValue := r.Context().Value("userID")
	if userIDValue == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	userID, ok := userIDValue.(uuid.UUID)
	if !ok {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	var req ScreeningRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("❌ Error decoding screening request: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Calculate qualification status
	isQualified, score := calculateQualifiedTester(&req)

	// Create screening response
	screening := &database.ScreeningResponse{
		ID:                      uuid.New(),
		UserID:                  userID,
		Age:                     req.Age,
		Gender:                  req.Gender,
		Occupation:              req.Occupation,
		SmartphoneUsage:         req.SmartphoneUsage,
		DeviceType:              req.DeviceType,
		SleepHours:              req.SleepHours,
		HabitTracking:           req.HabitTracking,
		RoutineStructure:        req.RoutineStructure,
		ProductivityFluctuation: req.ProductivityFluctuation,
		TechComfort:             req.TechComfort,
		WellnessAppsUsed:        req.WellnessAppsUsed,
		AIFeedbackOpenness:      req.AIFeedbackOpenness,
		InterestReason:          req.InterestReason,
		IsQualifiedTester:       isQualified,
		QualificationScore:      score,
	}

	// Save to database
	query := `
		INSERT INTO screening_responses (
			id, user_id, age, gender, occupation, smartphone_usage, device_type,
			sleep_hours, habit_tracking, routine_structure, productivity_fluctuation,
			tech_comfort, wellness_apps_used, ai_feedback_openness, interest_reason,
			is_qualified_tester, qualification_score
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
		)
		ON CONFLICT (user_id)
		DO UPDATE SET
			age = EXCLUDED.age,
			gender = EXCLUDED.gender,
			occupation = EXCLUDED.occupation,
			smartphone_usage = EXCLUDED.smartphone_usage,
			device_type = EXCLUDED.device_type,
			sleep_hours = EXCLUDED.sleep_hours,
			habit_tracking = EXCLUDED.habit_tracking,
			routine_structure = EXCLUDED.routine_structure,
			productivity_fluctuation = EXCLUDED.productivity_fluctuation,
			tech_comfort = EXCLUDED.tech_comfort,
			wellness_apps_used = EXCLUDED.wellness_apps_used,
			ai_feedback_openness = EXCLUDED.ai_feedback_openness,
			interest_reason = EXCLUDED.interest_reason,
			is_qualified_tester = EXCLUDED.is_qualified_tester,
			qualification_score = EXCLUDED.qualification_score,
			updated_at = CURRENT_TIMESTAMP
		RETURNING id, created_at, updated_at
	`

	err := h.repo.GetDB().QueryRow(query,
		screening.ID, screening.UserID, screening.Age, screening.Gender,
		screening.Occupation, screening.SmartphoneUsage, screening.DeviceType,
		screening.SleepHours, screening.HabitTracking, screening.RoutineStructure,
		screening.ProductivityFluctuation, screening.TechComfort, screening.WellnessAppsUsed,
		screening.AIFeedbackOpenness, screening.InterestReason, screening.IsQualifiedTester,
		screening.QualificationScore,
	).Scan(&screening.ID, &screening.CreatedAt, &screening.UpdatedAt)

	if err != nil {
		log.Printf("❌ Error saving screening response: %v", err)
		http.Error(w, "Failed to save screening response", http.StatusInternalServerError)
		return
	}

	log.Printf("✅ Screening response saved for user %s (Qualified: %v, Score: %d)", userID, isQualified, score)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(screening)
}

// GetScreening handles GET /api/screening
func (h *QuestionnaireHandler) GetScreening(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userIDValue := r.Context().Value("userID")
	if userIDValue == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	userID, ok := userIDValue.(uuid.UUID)
	if !ok {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	var screening database.ScreeningResponse
	query := `
		SELECT id, user_id, age, gender, occupation, smartphone_usage, device_type,
			sleep_hours, habit_tracking, routine_structure, productivity_fluctuation,
			tech_comfort, wellness_apps_used, ai_feedback_openness, interest_reason,
			is_qualified_tester, qualification_score, created_at, updated_at
		FROM screening_responses
		WHERE user_id = $1
	`

	err := h.repo.GetDB().QueryRow(query, userID).Scan(
		&screening.ID, &screening.UserID, &screening.Age, &screening.Gender,
		&screening.Occupation, &screening.SmartphoneUsage, &screening.DeviceType,
		&screening.SleepHours, &screening.HabitTracking, &screening.RoutineStructure,
		&screening.ProductivityFluctuation, &screening.TechComfort, &screening.WellnessAppsUsed,
		&screening.AIFeedbackOpenness, &screening.InterestReason, &screening.IsQualifiedTester,
		&screening.QualificationScore, &screening.CreatedAt, &screening.UpdatedAt,
	)

	if err != nil {
		if err.Error() == "sql: no rows in result set" {
			http.Error(w, "No screening response found", http.StatusNotFound)
			return
		}
		log.Printf("❌ Error retrieving screening response: %v", err)
		http.Error(w, "Failed to retrieve screening response", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(screening)
}

// SubmitUsabilitySurvey handles POST /api/usability-survey
func (h *QuestionnaireHandler) SubmitUsabilitySurvey(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userIDValue := r.Context().Value("userID")
	if userIDValue == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	userID, ok := userIDValue.(uuid.UUID)
	if !ok {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	var req UsabilitySurveyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("❌ Error decoding usability survey request: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate ratings are in range 1-5
	ratings := []int{
		req.EasyToUse, req.FeltConfident, req.ClearDesign, req.ResponsiveSmooth,
		req.FeedbackUnderstandable, req.EasyToFind, req.HelpedReflect,
		req.WouldUseRegularly, req.WouldRecommend, req.OverallSatisfied,
	}

	for _, rating := range ratings {
		if rating < 1 || rating > 5 {
			http.Error(w, "All ratings must be between 1 and 5", http.StatusBadRequest)
			return
		}
	}

	// Calculate SUS score and average rating
	susScore := calculateSUSScore(&req)
	avgRating := calculateAverageRating(&req)

	// Create survey response
	survey := &database.UsabilitySurveyResponse{
		ID:                     uuid.New(),
		UserID:                 userID,
		EasyToUse:              req.EasyToUse,
		FeltConfident:          req.FeltConfident,
		ClearDesign:            req.ClearDesign,
		ResponsiveSmooth:       req.ResponsiveSmooth,
		FeedbackUnderstandable: req.FeedbackUnderstandable,
		EasyToFind:             req.EasyToFind,
		HelpedReflect:          req.HelpedReflect,
		WouldUseRegularly:      req.WouldUseRegularly,
		WouldRecommend:         req.WouldRecommend,
		OverallSatisfied:       req.OverallSatisfied,
		LikedMost:              req.LikedMost,
		WouldImprove:           req.WouldImprove,
		EncounteredIssues:      req.EncounteredIssues,
		SUSScore:               susScore,
		AverageRating:          avgRating,
	}

	// Save to database
	query := `
		INSERT INTO usability_survey_responses (
			id, user_id, easy_to_use, felt_confident, clear_design, responsive_smooth,
			feedback_understandable, easy_to_find, helped_reflect, would_use_regularly,
			would_recommend, overall_satisfied, liked_most, would_improve, encountered_issues,
			sus_score, average_rating
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
		)
		RETURNING created_at, updated_at
	`

	err := h.repo.GetDB().QueryRow(query,
		survey.ID, survey.UserID, survey.EasyToUse, survey.FeltConfident,
		survey.ClearDesign, survey.ResponsiveSmooth, survey.FeedbackUnderstandable,
		survey.EasyToFind, survey.HelpedReflect, survey.WouldUseRegularly,
		survey.WouldRecommend, survey.OverallSatisfied, survey.LikedMost,
		survey.WouldImprove, survey.EncounteredIssues, survey.SUSScore,
		survey.AverageRating,
	).Scan(&survey.CreatedAt, &survey.UpdatedAt)

	if err != nil {
		log.Printf("❌ Error saving usability survey: %v", err)
		http.Error(w, "Failed to save usability survey", http.StatusInternalServerError)
		return
	}

	log.Printf("✅ Usability survey saved for user %s (SUS Score: %.2f)", userID, susScore)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(survey)
}

// GetUsabilitySurveys handles GET /api/usability-surveys
func (h *QuestionnaireHandler) GetUsabilitySurveys(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userIDValue := r.Context().Value("userID")
	if userIDValue == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	userID, ok := userIDValue.(uuid.UUID)
	if !ok {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	query := `
		SELECT id, user_id, easy_to_use, felt_confident, clear_design, responsive_smooth,
			feedback_understandable, easy_to_find, helped_reflect, would_use_regularly,
			would_recommend, overall_satisfied, liked_most, would_improve, encountered_issues,
			sus_score, average_rating, created_at, updated_at
		FROM usability_survey_responses
		WHERE user_id = $1
		ORDER BY created_at DESC
	`

	rows, err := h.repo.GetDB().Query(query, userID)
	if err != nil {
		log.Printf("❌ Error retrieving usability surveys: %v", err)
		http.Error(w, "Failed to retrieve usability surveys", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var surveys []database.UsabilitySurveyResponse
	for rows.Next() {
		var survey database.UsabilitySurveyResponse
		err := rows.Scan(
			&survey.ID, &survey.UserID, &survey.EasyToUse, &survey.FeltConfident,
			&survey.ClearDesign, &survey.ResponsiveSmooth, &survey.FeedbackUnderstandable,
			&survey.EasyToFind, &survey.HelpedReflect, &survey.WouldUseRegularly,
			&survey.WouldRecommend, &survey.OverallSatisfied, &survey.LikedMost,
			&survey.WouldImprove, &survey.EncounteredIssues, &survey.SUSScore,
			&survey.AverageRating, &survey.CreatedAt, &survey.UpdatedAt,
		)
		if err != nil {
			log.Printf("❌ Error scanning survey row: %v", err)
			continue
		}
		surveys = append(surveys, survey)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(surveys)
}

// GetAllScreenings handles GET /api/admin/screenings (admin endpoint)
func (h *QuestionnaireHandler) GetAllScreenings(w http.ResponseWriter, r *http.Request) {
	query := `
		SELECT id, user_id, age, gender, occupation, smartphone_usage, device_type,
			sleep_hours, habit_tracking, routine_structure, productivity_fluctuation,
			tech_comfort, wellness_apps_used, ai_feedback_openness, interest_reason,
			is_qualified_tester, qualification_score, created_at, updated_at
		FROM screening_responses
		ORDER BY created_at DESC
	`

	rows, err := h.repo.GetDB().Query(query)
	if err != nil {
		log.Printf("❌ Error retrieving all screening responses: %v", err)
		http.Error(w, "Failed to retrieve screening responses", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var screenings []database.ScreeningResponse
	for rows.Next() {
		var screening database.ScreeningResponse
		err := rows.Scan(
			&screening.ID, &screening.UserID, &screening.Age, &screening.Gender,
			&screening.Occupation, &screening.SmartphoneUsage, &screening.DeviceType,
			&screening.SleepHours, &screening.HabitTracking, &screening.RoutineStructure,
			&screening.ProductivityFluctuation, &screening.TechComfort, &screening.WellnessAppsUsed,
			&screening.AIFeedbackOpenness, &screening.InterestReason, &screening.IsQualifiedTester,
			&screening.QualificationScore, &screening.CreatedAt, &screening.UpdatedAt,
		)
		if err != nil {
			log.Printf("❌ Error scanning screening row: %v", err)
			continue
		}
		screenings = append(screenings, screening)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(screenings)
}

// GetAllUsabilitySurveys handles GET /api/admin/usability-surveys (admin endpoint)
func (h *QuestionnaireHandler) GetAllUsabilitySurveys(w http.ResponseWriter, r *http.Request) {
	query := `
		SELECT id, user_id, easy_to_use, felt_confident, clear_design, responsive_smooth,
			feedback_understandable, easy_to_find, helped_reflect, would_use_regularly,
			would_recommend, overall_satisfied, liked_most, would_improve, encountered_issues,
			sus_score, average_rating, created_at, updated_at
		FROM usability_survey_responses
		ORDER BY created_at DESC
	`

	rows, err := h.repo.GetDB().Query(query)
	if err != nil {
		log.Printf("❌ Error retrieving all usability surveys: %v", err)
		http.Error(w, "Failed to retrieve usability surveys", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var surveys []database.UsabilitySurveyResponse
	for rows.Next() {
		var survey database.UsabilitySurveyResponse
		err := rows.Scan(
			&survey.ID, &survey.UserID, &survey.EasyToUse, &survey.FeltConfident,
			&survey.ClearDesign, &survey.ResponsiveSmooth, &survey.FeedbackUnderstandable,
			&survey.EasyToFind, &survey.HelpedReflect, &survey.WouldUseRegularly,
			&survey.WouldRecommend, &survey.OverallSatisfied, &survey.LikedMost,
			&survey.WouldImprove, &survey.EncounteredIssues, &survey.SUSScore,
			&survey.AverageRating, &survey.CreatedAt, &survey.UpdatedAt,
		)
		if err != nil {
			log.Printf("❌ Error scanning survey row: %v", err)
			continue
		}
		surveys = append(surveys, survey)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(surveys)
}

// ExportScreeningsCSV handles GET /api/admin/screenings/export (admin endpoint)
func (h *QuestionnaireHandler) ExportScreeningsCSV(w http.ResponseWriter, r *http.Request) {
	query := `
		SELECT id, user_id, age, gender, occupation, smartphone_usage, device_type,
			sleep_hours, habit_tracking, routine_structure, productivity_fluctuation,
			tech_comfort, wellness_apps_used, ai_feedback_openness, interest_reason,
			is_qualified_tester, qualification_score, created_at, updated_at
		FROM screening_responses
		ORDER BY created_at DESC
	`

	rows, err := h.repo.GetDB().Query(query)
	if err != nil {
		log.Printf("❌ Error retrieving screening responses for export: %v", err)
		http.Error(w, "Failed to retrieve screening responses", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	// Set headers for CSV download
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=screening_responses_%s.csv", time.Now().Format("2006-01-02")))

	csvWriter := csv.NewWriter(w)
	defer csvWriter.Flush()

	// Write CSV header
	header := []string{
		"ID", "User ID", "Age", "Gender", "Occupation", "Smartphone Usage", "Device Type",
		"Sleep Hours", "Habit Tracking", "Routine Structure", "Productivity Fluctuation",
		"Tech Comfort", "Wellness Apps Used", "AI Feedback Openness", "Interest Reason",
		"Is Qualified Tester", "Qualification Score", "Created At", "Updated At",
	}
	if err := csvWriter.Write(header); err != nil {
		log.Printf("❌ Error writing CSV header: %v", err)
		return
	}

	// Write data rows
	for rows.Next() {
		var screening database.ScreeningResponse
		err := rows.Scan(
			&screening.ID, &screening.UserID, &screening.Age, &screening.Gender,
			&screening.Occupation, &screening.SmartphoneUsage, &screening.DeviceType,
			&screening.SleepHours, &screening.HabitTracking, &screening.RoutineStructure,
			&screening.ProductivityFluctuation, &screening.TechComfort, &screening.WellnessAppsUsed,
			&screening.AIFeedbackOpenness, &screening.InterestReason, &screening.IsQualifiedTester,
			&screening.QualificationScore, &screening.CreatedAt, &screening.UpdatedAt,
		)
		if err != nil {
			log.Printf("❌ Error scanning screening row: %v", err)
			continue
		}

		row := []string{
			screening.ID.String(),
			screening.UserID.String(),
			strconv.Itoa(screening.Age),
			screening.Gender,
			screening.Occupation,
			screening.SmartphoneUsage,
			screening.DeviceType,
			screening.SleepHours,
			screening.HabitTracking,
			screening.RoutineStructure,
			screening.ProductivityFluctuation,
			screening.TechComfort,
			strconv.FormatBool(screening.WellnessAppsUsed),
			screening.AIFeedbackOpenness,
			screening.InterestReason,
			strconv.FormatBool(screening.IsQualifiedTester),
			strconv.Itoa(screening.QualificationScore),
			screening.CreatedAt.Format(time.RFC3339),
			screening.UpdatedAt.Format(time.RFC3339),
		}

		if err := csvWriter.Write(row); err != nil {
			log.Printf("❌ Error writing CSV row: %v", err)
			continue
		}
	}

	log.Printf("✅ Exported screening responses to CSV")
}

// ExportUsabilitySurveysCSV handles GET /api/admin/usability-surveys/export (admin endpoint)
func (h *QuestionnaireHandler) ExportUsabilitySurveysCSV(w http.ResponseWriter, r *http.Request) {
	query := `
		SELECT id, user_id, easy_to_use, felt_confident, clear_design, responsive_smooth,
			feedback_understandable, easy_to_find, helped_reflect, would_use_regularly,
			would_recommend, overall_satisfied, liked_most, would_improve, encountered_issues,
			sus_score, average_rating, created_at, updated_at
		FROM usability_survey_responses
		ORDER BY created_at DESC
	`

	rows, err := h.repo.GetDB().Query(query)
	if err != nil {
		log.Printf("❌ Error retrieving usability surveys for export: %v", err)
		http.Error(w, "Failed to retrieve usability surveys", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	// Set headers for CSV download
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=usability_surveys_%s.csv", time.Now().Format("2006-01-02")))

	csvWriter := csv.NewWriter(w)
	defer csvWriter.Flush()

	// Write CSV header
	header := []string{
		"ID", "User ID", "Easy to Use", "Felt Confident", "Clear Design", "Responsive/Smooth",
		"Feedback Understandable", "Easy to Find", "Helped Reflect", "Would Use Regularly",
		"Would Recommend", "Overall Satisfied", "Liked Most", "Would Improve", "Encountered Issues",
		"SUS Score", "Average Rating", "Created At", "Updated At",
	}
	if err := csvWriter.Write(header); err != nil {
		log.Printf("❌ Error writing CSV header: %v", err)
		return
	}

	// Write data rows
	for rows.Next() {
		var survey database.UsabilitySurveyResponse
		err := rows.Scan(
			&survey.ID, &survey.UserID, &survey.EasyToUse, &survey.FeltConfident,
			&survey.ClearDesign, &survey.ResponsiveSmooth, &survey.FeedbackUnderstandable,
			&survey.EasyToFind, &survey.HelpedReflect, &survey.WouldUseRegularly,
			&survey.WouldRecommend, &survey.OverallSatisfied, &survey.LikedMost,
			&survey.WouldImprove, &survey.EncounteredIssues, &survey.SUSScore,
			&survey.AverageRating, &survey.CreatedAt, &survey.UpdatedAt,
		)
		if err != nil {
			log.Printf("❌ Error scanning survey row: %v", err)
			continue
		}

		row := []string{
			survey.ID.String(),
			survey.UserID.String(),
			strconv.Itoa(survey.EasyToUse),
			strconv.Itoa(survey.FeltConfident),
			strconv.Itoa(survey.ClearDesign),
			strconv.Itoa(survey.ResponsiveSmooth),
			strconv.Itoa(survey.FeedbackUnderstandable),
			strconv.Itoa(survey.EasyToFind),
			strconv.Itoa(survey.HelpedReflect),
			strconv.Itoa(survey.WouldUseRegularly),
			strconv.Itoa(survey.WouldRecommend),
			strconv.Itoa(survey.OverallSatisfied),
			survey.LikedMost,
			survey.WouldImprove,
			survey.EncounteredIssues,
			fmt.Sprintf("%.2f", survey.SUSScore),
			fmt.Sprintf("%.2f", survey.AverageRating),
			survey.CreatedAt.Format(time.RFC3339),
			survey.UpdatedAt.Format(time.RFC3339),
		}

		if err := csvWriter.Write(row); err != nil {
			log.Printf("❌ Error writing CSV row: %v", err)
			continue
		}
	}

	log.Printf("✅ Exported usability surveys to CSV")
}

// GetQuestionnaireStats handles GET /api/admin/questionnaire-stats (admin endpoint)
func (h *QuestionnaireHandler) GetQuestionnaireStats(w http.ResponseWriter, r *http.Request) {
	stats := make(map[string]interface{})

	// Screening statistics
	var totalScreenings, qualifiedCount int
	var avgQualificationScore float64

	err := h.repo.GetDB().QueryRow(`
		SELECT COUNT(*),
			   SUM(CASE WHEN is_qualified_tester THEN 1 ELSE 0 END),
			   AVG(qualification_score)
		FROM screening_responses
	`).Scan(&totalScreenings, &qualifiedCount, &avgQualificationScore)

	if err != nil {
		log.Printf("❌ Error getting screening stats: %v", err)
	} else {
		stats["total_screenings"] = totalScreenings
		stats["qualified_testers"] = qualifiedCount
		stats["qualification_rate"] = float64(qualifiedCount) / float64(totalScreenings) * 100
		stats["avg_qualification_score"] = avgQualificationScore
	}

	// Usability survey statistics
	var totalSurveys int
	var avgSUSScore, avgRating float64

	err = h.repo.GetDB().QueryRow(`
		SELECT COUNT(*), AVG(sus_score), AVG(average_rating)
		FROM usability_survey_responses
	`).Scan(&totalSurveys, &avgSUSScore, &avgRating)

	if err != nil {
		log.Printf("❌ Error getting usability stats: %v", err)
	} else {
		stats["total_surveys"] = totalSurveys
		stats["avg_sus_score"] = avgSUSScore
		stats["avg_rating"] = avgRating
	}

	// SUS score distribution
	var excellent, good, ok, poor int
	rows, err := h.repo.GetDB().Query(`
		SELECT
			SUM(CASE WHEN sus_score >= 80 THEN 1 ELSE 0 END) as excellent,
			SUM(CASE WHEN sus_score >= 68 AND sus_score < 80 THEN 1 ELSE 0 END) as good,
			SUM(CASE WHEN sus_score >= 50 AND sus_score < 68 THEN 1 ELSE 0 END) as ok,
			SUM(CASE WHEN sus_score < 50 THEN 1 ELSE 0 END) as poor
		FROM usability_survey_responses
	`)
	if err == nil && rows.Next() {
		rows.Scan(&excellent, &good, &ok, &poor)
		stats["sus_distribution"] = map[string]int{
			"excellent": excellent,
			"good":      good,
			"ok":        ok,
			"poor":      poor,
		}
		rows.Close()
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}
