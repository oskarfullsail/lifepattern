# Admin Dashboard Documentation

## Overview

The LifePattern AI Admin Dashboard provides owner-only access to view, analyze, and export all questionnaire data collected from users. It includes screening questionnaires and usability surveys with comprehensive statistics and CSV export functionality.

## Features

### 1. Password Protection
- Default admin password: `lifepattern2025`
- Admin authentication persists locally using AsyncStorage
- Logout functionality to clear admin access

### 2. Statistics Tab
Displays comprehensive analytics including:

**Screening Statistics:**
- Total number of screenings submitted
- Number of qualified testers
- Qualification rate percentage
- Average qualification score

**Usability Survey Statistics:**
- Total number of surveys submitted
- Average SUS (System Usability Scale) score
- Average rating across all questions
- SUS Score Distribution:
  - Excellent (80-100)
  - Good (68-79)
  - OK (50-67)
  - Poor (<50)

**CSV Export:**
- Export all screening responses to CSV
- Export all usability surveys to CSV
- Files include timestamp in filename

### 3. Screenings Tab
View all screening questionnaire responses in a searchable table format:
- User information (age, gender, occupation)
- Device and usage patterns
- Routine and lifestyle data
- Tech comfort and AI openness
- Qualification status and score
- Submission timestamp

**Search functionality** to filter by username or other fields

### 4. Surveys Tab
View all usability survey responses in a card-based format:
- All 10 Likert scale ratings (1-5)
- Calculated SUS score (0-100)
- Average rating
- Three feedback sections:
  - What users liked most
  - What could be improved
  - Issues encountered
- User ID and submission timestamp

**Search functionality** to filter responses

## Database Schema

### Screening Responses Table
Location: `backend/migrations/008_add_questionnaires.sql`

```sql
CREATE TABLE screening_responses (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    age INTEGER,
    gender VARCHAR(50),
    occupation VARCHAR(255),
    smartphone_usage VARCHAR(50),
    device_type VARCHAR(50),
    sleep_hours VARCHAR(50),
    habit_tracking VARCHAR(50),
    routine_structure VARCHAR(50),
    productivity_fluctuation VARCHAR(50),
    tech_comfort VARCHAR(50),
    wellness_apps_used BOOLEAN,
    ai_feedback_openness VARCHAR(50),
    interest_reason TEXT,
    is_qualified_tester BOOLEAN DEFAULT FALSE,
    qualification_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);
```

### Usability Survey Table
```sql
CREATE TABLE usability_survey_responses (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    easy_to_use INTEGER CHECK (1-5),
    felt_confident INTEGER CHECK (1-5),
    clear_design INTEGER CHECK (1-5),
    responsive_smooth INTEGER CHECK (1-5),
    feedback_understandable INTEGER CHECK (1-5),
    easy_to_find INTEGER CHECK (1-5),
    helped_reflect INTEGER CHECK (1-5),
    would_use_regularly INTEGER CHECK (1-5),
    would_recommend INTEGER CHECK (1-5),
    overall_satisfied INTEGER CHECK (1-5),
    liked_most TEXT,
    would_improve TEXT,
    encountered_issues TEXT,
    sus_score DECIMAL(5,2),
    average_rating DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### Questionnaire Endpoints (Protected)
All require authentication via JWT token in Authorization header.

#### Submit Screening
- **Endpoint:** `POST /api/screening`
- **Handler:** `questionnaire.go:SubmitScreening()`
- **Request:** ScreeningRequest JSON
- **Response:** ScreeningResponse with qualification status and score

#### Get User's Screening
- **Endpoint:** `GET /api/screening`
- **Handler:** `questionnaire.go:GetScreening()`
- **Response:** User's screening response or 404 if not found

#### Submit Usability Survey
- **Endpoint:** `POST /api/usability-survey`
- **Handler:** `questionnaire.go:SubmitUsabilitySurvey()`
- **Request:** UsabilitySurveyRequest JSON
- **Response:** UsabilitySurveyResponse with calculated SUS score

#### Get User's Surveys
- **Endpoint:** `GET /api/usability-surveys`
- **Handler:** `questionnaire.go:GetUsabilitySurveys()`
- **Response:** Array of user's survey responses

### Admin Endpoints (Protected)

#### Get All Screenings
- **Endpoint:** `GET /api/admin/screenings`
- **Handler:** `questionnaire.go:GetAllScreenings()`
- **Response:** Array of all screening responses

#### Get All Surveys
- **Endpoint:** `GET /api/admin/usability-surveys`
- **Handler:** `questionnaire.go:GetAllUsabilitySurveys()`
- **Response:** Array of all usability survey responses

#### Export Screenings CSV
- **Endpoint:** `GET /api/admin/screenings/export`
- **Handler:** `questionnaire.go:ExportScreeningsCSV()`
- **Response:** CSV file download

#### Export Surveys CSV
- **Endpoint:** `GET /api/admin/usability-surveys/export`
- **Handler:** `questionnaire.go:ExportUsabilitySurveysCSV()`
- **Response:** CSV file download

#### Get Statistics
- **Endpoint:** `GET /api/admin/questionnaire-stats`
- **Handler:** `questionnaire.go:GetQuestionnaireStats()`
- **Response:** JSON with comprehensive statistics

## Qualification Scoring Algorithm

Location: `backend/internal/handlers/questionnaire.go:calculateQualifiedTester()`

The algorithm scores users on a 0-12 point scale based on:

**Primary Criteria (9 points total):**
1. **Routine Structure (0-3 points):**
   - Unstructured: 3 points
   - Somewhat structured: 2 points
   - Very structured: 0 points

2. **Tech Comfort (0-3 points):**
   - Very comfortable: 3 points
   - Comfortable: 2 points
   - Not comfortable: 0 points

3. **AI Feedback Openness (0-3 points):**
   - Very open: 3 points
   - Open: 2 points
   - Not open: 0 points

**Bonus Criteria (3 points total):**
- Habit tracking (sometimes/often): +1 point
- Productivity fluctuation (frequently/always): +1 point
- Daily smartphone usage: +1 point

**Qualification Threshold:** Score >= 6 (at least 2 of 3 primary criteria met)

## SUS Score Calculation

Location: `backend/internal/handlers/questionnaire.go:calculateSUSScore()`

The System Usability Scale (SUS) is calculated using the standard formula:

1. For odd-numbered items (positive statements): contribution = rating - 1
2. For even-numbered items (negative statements): contribution = 5 - rating
3. Sum all contributions
4. Multiply by 2.5 to get score on 0-100 scale

**Odd items (positive):** easy_to_use, clear_design, easy_to_find, would_use_regularly, overall_satisfied

**Even items (negative):** felt_confident, responsive_smooth, feedback_understandable, helped_reflect, would_recommend

**Score Interpretation:**
- 80-100: Excellent
- 68-79: Good
- 50-67: OK
- <50: Poor

Industry average SUS score is 68.

## Access Instructions

### For Users

1. **Complete Screening Questionnaire:**
   - Shown automatically after registration
   - 15 questions across 3 sections
   - Determines qualification as a tester

2. **Submit Usability Survey:**
   - Navigate to Settings → Provide Feedback
   - 10 rating questions + 3 open-ended questions
   - Can be submitted multiple times

### For Admin/Owner

1. **Access Admin Dashboard:**
   - Navigate to Settings → Admin → Admin Dashboard
   - Enter password: `lifepattern2025`
   - Admin access persists until logout

2. **View Statistics:**
   - Default tab shows overview statistics
   - Includes total counts, averages, and distribution

3. **Browse Screening Data:**
   - Switch to "Screenings" tab
   - Use search to filter by username
   - View qualification status and scores

4. **Browse Survey Data:**
   - Switch to "Surveys" tab
   - View SUS scores and feedback
   - Use search to filter responses

5. **Export Data:**
   - Click "Export Screenings CSV" or "Export Surveys CSV"
   - CSV file downloads with timestamp in filename

## Frontend Components

### Screening Questionnaire
- **File:** `frontend/app/screeningQuestionnaire.tsx`
- **Route:** `/ScreeningQuestionnaire`
- **Features:**
  - Multi-step form with progress bar
  - 3 sections: Basic Info, Routine & Lifestyle, Tech Comfort
  - Shows qualification result after submission
  - Auto-navigates to dashboard on completion

### Usability Survey
- **File:** `frontend/app/usabilitySurvey.tsx`
- **Route:** `/UsabilitySurvey`
- **Features:**
  - Star ratings for 10 questions
  - Likert scale (1-5) with labels
  - 3 text areas for open feedback
  - Shows SUS score and interpretation on submit

### Admin Dashboard
- **File:** `frontend/app/adminDashboard.tsx`
- **Route:** `/AdminDashboard`
- **Features:**
  - Password protection screen
  - Three-tab interface
  - Real-time data loading
  - Pull-to-refresh functionality
  - CSV export buttons
  - Search functionality
  - Logout option

## Testing Checklist

### Database Migration
- [ ] Run migration: `go run cmd/migrate/main.go`
- [ ] Verify tables created: `screening_responses`, `usability_survey_responses`
- [ ] Check UNIQUE constraint on user_id in screening_responses

### Backend API
- [ ] Start server: `go run cmd/server/main.go`
- [ ] Test POST /api/screening with valid data
- [ ] Test GET /api/screening returns user's screening
- [ ] Test POST /api/usability-survey with valid ratings
- [ ] Test GET /api/admin/questionnaire-stats returns statistics
- [ ] Test GET /api/admin/screenings/export returns CSV file
- [ ] Verify SUS score calculation is correct
- [ ] Verify qualification scoring works as expected

### Frontend
- [ ] Registration flow → Screening Questionnaire appears
- [ ] Complete screening → See qualification result
- [ ] Settings → Provide Feedback → Usability Survey opens
- [ ] Submit survey → See SUS score
- [ ] Settings → Admin Dashboard → Password screen appears
- [ ] Enter password → Dashboard loads
- [ ] Statistics tab shows correct data
- [ ] Screenings tab displays all responses
- [ ] Surveys tab displays all responses
- [ ] Search functionality works
- [ ] CSV export downloads files
- [ ] Logout clears admin access

## Security Considerations

1. **Admin Password:** Currently hardcoded as `lifepattern2025`. Consider:
   - Using environment variables for production
   - Implementing proper admin user authentication
   - Adding rate limiting for password attempts

2. **Admin Routes:** Currently protected by auth middleware but no admin role check:
   - Consider adding `is_admin` field to users table
   - Implement admin role verification middleware
   - Separate admin sessions from regular user sessions

3. **CSV Export:** Currently requires authentication token:
   - Token passed as URL parameter for mobile compatibility
   - Consider implementing signed URLs with expiration
   - Add audit logging for data exports

## Troubleshooting

### Backend won't compile
- Verify Go module name in go.mod is `lifepattern-api`
- Check imports use correct module path
- Run `go mod tidy` to clean dependencies

### Database migration fails
- Ensure PostgreSQL is running
- Check database connection string
- Verify previous migrations have run successfully
- Check for existing tables with conflicting names

### Admin dashboard shows no data
- Verify backend is running and accessible
- Check API endpoint URLs match backend routes
- Ensure JWT tokens are being sent in requests
- Check browser/React Native debugger for errors

### CSV export doesn't work on mobile
- Verify `Linking.openURL()` is available
- Check file download permissions
- Test in browser first before mobile app
- Ensure token is being appended to export URL

## Future Enhancements

1. **Analytics:**
   - Time-series analysis of qualification rates
   - Correlation between screening answers and SUS scores
   - Demographic breakdowns

2. **Filtering:**
   - Date range filters
   - Qualification status filters
   - Export filtered data only

3. **Visualization:**
   - Charts for demographic distribution
   - SUS score trends over time
   - Response rate tracking

4. **Notifications:**
   - Email alerts for new submissions
   - Weekly summary reports
   - Low SUS score alerts

5. **User Management:**
   - View individual user profiles
   - Link screening to surveys by user
   - User journey tracking

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review backend logs for error messages
3. Check React Native debugger console
4. Verify database queries in PostgreSQL logs
5. Contact: [Your contact information]

---

**Last Updated:** November 9, 2025
**Version:** 1.0.0
