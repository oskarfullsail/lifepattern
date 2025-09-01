# Backend-AI Service Integration Guide

## 🎯 **Integration Status: FULLY INTEGRATED**

The backend is now fully configured to connect to the AI service, send routine data, and store all AI analysis results including enhanced recommendations and drift detection.

## 🔗 **Connection Configuration**

### **Environment Variables**
```bash
# In render.yaml and environment files
AI_SERVICE_URL=https://lifepattern-ai-service.onrender.com
```

### **Service Configuration**
- **Health Check**: `/health` endpoint
- **Prediction Endpoint**: `/predict` 
- **Enhanced Prediction**: `/predict/enhanced`
- **Timeout**: 30 seconds
- **Retry Logic**: Built into HTTP client

## 📊 **Data Flow**

### **1. Routine Log Creation**
```
Frontend → Backend → AI Service → Database
```

1. **Frontend** sends routine data to backend
2. **Backend** saves routine log to database
3. **Backend** fetches historical data (last 30 days)
4. **Backend** sends data + history to AI service
5. **AI Service** analyzes and returns results
6. **Backend** stores AI analysis in database
7. **Backend** returns combined response to frontend

### **2. Data Storage**

#### **Routine Logs Table**
```sql
CREATE TABLE routine_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    sleep_hours DECIMAL,
    meal_times TEXT[],
    screen_time DECIMAL,
    exercise_duration DECIMAL,
    wake_up_time TEXT,
    bed_time TEXT,
    water_intake DECIMAL,
    stress_level INTEGER,
    log_date TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

#### **AI Reports Table** (Enhanced)
```sql
CREATE TABLE ai_reports (
    id SERIAL PRIMARY KEY,
    routine_log_id INTEGER REFERENCES routine_logs(id),
    is_anomaly BOOLEAN,
    confidence_score DECIMAL,
    anomaly_type TEXT,
    recommendations TEXT[],
    enhanced_recommendations JSONB,  -- NEW: Rich recommendations
    behavioral_contexts TEXT[],      -- NEW: Behavioral contexts
    ai_service_response TEXT,
    drift_analysis JSONB,
    baseline_comparison JSONB,
    model_version TEXT,
    created_at TIMESTAMP
);
```

## 🔧 **Updated Components**

### **1. AI Service Client (`ai_service.go`)**

#### **Enhanced Response Structure**
```go
type AIServiceResponse struct {
    IsAnomaly              bool                     `json:"is_anomaly"`
    ConfidenceScore        float64                  `json:"confidence_score"`
    AnomalyType            string                   `json:"anomaly_type"`
    Recommendations        []string                 `json:"recommendations"`
    EnhancedRecommendations []EnhancedRecommendation `json:"enhanced_recommendations,omitempty"`
    BehavioralContexts     []string                 `json:"behavioral_contexts,omitempty"`
    Timestamp              string                   `json:"timestamp"`
    DriftAnalysis          map[string]interface{}   `json:"drift_analysis,omitempty"`
    BaselineComparison     map[string]interface{}   `json:"baseline_comparison,omitempty"`
}

type EnhancedRecommendation struct {
    Type            string `json:"type"`
    Title           string `json:"title"`
    Description     string `json:"description"`
    ActionURL       string `json:"action_url,omitempty"`
    Priority        int    `json:"priority,omitempty"`
    Context         string `json:"context,omitempty"`
    EstimatedImpact string `json:"estimated_impact,omitempty"`
    TimeSensitive   bool   `json:"time_sensitive,omitempty"`
}
```

#### **Key Methods**
- `AnalyzeRoutine()` - Basic analysis
- `AnalyzeRoutineWithHistory()` - Enhanced analysis with drift detection
- `CheckHealth()` - Service health verification

### **2. Database Models (`models.go`)**

#### **Enhanced AIReport Structure**
```go
type AIReport struct {
    ID                     int             `json:"id,omitempty" db:"id"`
    RoutineLogID           int             `json:"routine_log_id" db:"routine_log_id"`
    IsAnomaly              bool            `json:"is_anomaly" db:"is_anomaly"`
    ConfidenceScore        float64         `json:"confidence_score" db:"confidence_score"`
    AnomalyType            string          `json:"anomaly_type" db:"anomaly_type"`
    Recommendations        []string        `json:"recommendations" db:"recommendations"`
    EnhancedRecommendations json.RawMessage `json:"enhanced_recommendations" db:"enhanced_recommendations"`
    BehavioralContexts     []string        `json:"behavioral_contexts" db:"behavioral_contexts"`
    AIServiceResponse      string          `json:"ai_service_response" db:"ai_service_response"`
    DriftAnalysis          json.RawMessage `json:"drift_analysis" db:"drift_analysis"`
    BaselineComparison     json.RawMessage `json:"baseline_comparison" db:"baseline_comparison"`
    ModelVersion           string          `json:"model_version" db:"model_version"`
    CreatedAt              time.Time       `json:"created_at,omitempty" db:"created_at"`
}
```

### **3. Routine Service (`routine_service.go`)**

#### **Enhanced Storage Logic**
```go
// Convert enhanced recommendations to JSON
if aiResponse.EnhancedRecommendations != nil {
    enhancedJSON, _ := json.Marshal(aiResponse.EnhancedRecommendations)
    aiReport.EnhancedRecommendations = enhancedJSON
}

// Store behavioral contexts
aiReport.BehavioralContexts = aiResponse.BehavioralContexts
```

## 📡 **API Endpoints**

### **1. Create Routine Log**
```http
POST /api/routines
Content-Type: application/json

{
  "sleep_hours": 8.0,
  "meal_times": ["07:30", "12:00", "18:30"],
  "screen_time": 4.0,
  "exercise_duration": 1.0,
  "wake_up_time": "07:00",
  "bed_time": "23:00",
  "water_intake": 2.5,
  "stress_level": 4
}
```

**Response:**
```json
{
  "log_id": 123,
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "ai_response": {
    "is_anomaly": false,
    "confidence_score": 0.967,
    "anomaly_type": "normal",
    "recommendations": ["Keep up the good work!"],
    "enhanced_recommendations": [
      {
        "type": "exercise",
        "title": "Morning Workout",
        "description": "Great job with 1 hour of exercise!",
        "priority": 1,
        "context": "high_exercise"
      }
    ],
    "behavioral_contexts": ["high_exercise"],
    "drift_analysis": {
      "drift_detected": false,
      "confidence": 0.95
    }
  },
  "message": "Routine log created successfully"
}
```

### **2. Get Insight**
```http
GET /api/routines/{log_id}/insight
```

**Response:**
```json
{
  "routine_log": {
    "id": 123,
    "sleep_hours": 8.0,
    "meal_times": ["07:30", "12:00", "18:30"],
    "screen_time": 4.0,
    "exercise_duration": 1.0,
    "wake_up_time": "07:00",
    "bed_time": "23:00",
    "water_intake": 2.5,
    "stress_level": 4,
    "log_date": "2024-01-15"
  },
  "ai_report": {
    "is_anomaly": false,
    "confidence_score": 0.967,
    "anomaly_type": "normal",
    "recommendations": ["Keep up the good work!"],
    "enhanced_recommendations": [...],
    "behavioral_contexts": ["high_exercise"],
    "drift_analysis": {...},
    "model_version": "1.0.0"
  }
}
```

### **3. Get User Insights**
```http
GET /api/routines/insights?limit=10
```

## 🔄 **Data Processing Flow**

### **1. Historical Data Preparation**
```go
// Get last 30 days of routine logs
historicalData, err := s.repo.GetRoutineLogsByUser(routineLog.UserID, 30)

// Convert to AI service format
historicalPayload := make([]map[string]interface{}, len(historicalData))
for i, log := range historicalData {
    historicalPayload[i] = map[string]interface{}{
        "sleep_hours":       log.SleepHours,
        "screen_time":       log.ScreenTime,
        "exercise_duration": log.ExerciseDuration,
        "water_intake":      log.WaterIntake,
        "stress_level":      log.StressLevel,
        "wake_up_hour":      extractHourFromTime(log.WakeUpTime),
        "bed_time_hour":     extractHourFromTime(log.BedTime),
        "meal_count":        len(log.MealTimes),
        "health_score":      calculateHealthScore(log),
    }
}
```

### **2. AI Service Communication**
```go
// Send enhanced request with historical context
enhancedRequest := map[string]interface{}{
    "current_data": AIServiceRequest{...},
    "historical_data": historicalPayload,
    "user_id": routineLog.UserID,
}

resp, err := s.httpClient.Post(s.baseURL+"/predict", "application/json", bytes.NewBuffer(requestJSON))
```

### **3. Response Processing**
```go
// Parse AI service response
var aiResponse AIServiceResponse
json.Unmarshal(body, &aiResponse)

// Store all data in database
aiReport := database.AIReport{
    RoutineLogID:           logID,
    IsAnomaly:              aiResponse.IsAnomaly,
    ConfidenceScore:        aiResponse.ConfidenceScore,
    AnomalyType:            aiResponse.AnomalyType,
    Recommendations:        aiResponse.Recommendations,
    EnhancedRecommendations: enhancedJSON,
    BehavioralContexts:     aiResponse.BehavioralContexts,
    DriftAnalysis:          driftJSON,
    BaselineComparison:     baselineJSON,
}
```

## 🚨 **Error Handling**

### **1. AI Service Unavailable**
- Logs warning but continues without AI analysis
- Routine log is still saved
- Returns response without AI data

### **2. Network Timeouts**
- 30-second timeout configured
- Automatic retry logic in HTTP client
- Graceful degradation

### **3. Invalid Responses**
- JSON parsing error handling
- Response validation
- Fallback to basic analysis

## 📈 **Performance Considerations**

### **1. Database Indexes**
```sql
-- Performance indexes for AI reports
CREATE INDEX idx_ai_reports_routine_log_id ON ai_reports(routine_log_id);
CREATE INDEX idx_ai_reports_enhanced_recommendations ON ai_reports USING GIN (enhanced_recommendations);
CREATE INDEX idx_ai_reports_behavioral_contexts ON ai_reports USING GIN (behavioral_contexts);
CREATE INDEX idx_ai_reports_drift_analysis ON ai_reports USING GIN (drift_analysis);
```

### **2. Caching Strategy**
- Consider caching AI responses for similar data
- Cache historical data for frequent users
- Implement response caching for performance

### **3. Batch Processing**
- Consider batch AI analysis for multiple logs
- Implement queue system for high-volume scenarios

## 🔐 **Security Considerations**

### **1. Input Validation**
- Validate all routine data before sending to AI service
- Sanitize user inputs
- Rate limiting on API endpoints

### **2. Data Privacy**
- No PII sent to AI service
- Encrypted communication (HTTPS)
- Secure storage of AI responses

### **3. Access Control**
- JWT authentication required
- User-specific data isolation
- Audit logging for AI service calls

## 🧪 **Testing**

### **1. Integration Tests**
```bash
# Test AI service integration
go test ./test -v -run TestAIServiceIntegration

# Test enhanced recommendations
go test ./test -v -run TestEnhancedRecommendations

# Test drift detection
go test ./test -v -run TestDriftDetection
```

### **2. Health Checks**
```bash
# Check AI service health
curl https://lifepattern-ai-service.onrender.com/health

# Test backend-AI service communication
curl -X POST http://localhost:8080/api/routines \
  -H "Content-Type: application/json" \
  -d '{"sleep_hours": 8.0, "meal_times": ["07:30"], "screen_time": 4.0, "exercise_duration": 1.0, "wake_up_time": "07:00", "bed_time": "23:00", "water_intake": 2.5, "stress_level": 4}'
```

## 🎯 **Next Steps**

### **1. Frontend Integration**
- Update frontend to display enhanced recommendations
- Implement behavioral context visualization
- Add drift analysis charts

### **2. Monitoring**
- Add AI service response time monitoring
- Track drift detection accuracy
- Monitor enhanced recommendation effectiveness

### **3. Optimization**
- Implement caching for AI responses
- Optimize historical data queries
- Add batch processing for multiple logs

---

**Status**: ✅ Fully Integrated and Enhanced
**Last Updated**: August 2024
**Version**: 2.0.0 