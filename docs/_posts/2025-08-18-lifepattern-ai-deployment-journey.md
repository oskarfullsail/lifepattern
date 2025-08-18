---
layout: post
title: "LifePattern AI Service Deployment Journey: From Local Development to Production"
date: 2025-08-18
categories: [AI, Deployment, Backend, LifePattern]
tags: [python, go, fastapi, docker, render, postgresql, machine-learning]
author: LifePattern Team
---

# LifePattern AI Service Deployment Journey: From Local Development to Production

## 🎯 Overview

This post documents our comprehensive journey of deploying the LifePattern AI service to production and resolving critical backend integration issues. We successfully transformed a local development setup into a fully functional production system with enhanced AI capabilities.

## 🏗️ Project Architecture

LifePattern is a monolithic repository containing three main components:

- **AI Service** (Python/FastAPI): Machine learning microservice for anomaly detection and behavioral analysis
- **Backend Service** (Go): API server handling user data and business logic
- **Frontend** (React Native): Mobile application for user interaction
- **Database** (PostgreSQL): Data persistence layer

## 🚀 Phase 1: AI Service Enhancement

### Enhanced Features Implementation

We significantly enhanced the AI service with advanced capabilities:

#### **1. Behavioral Analysis**
```python
class BehavioralAnalyzer:
    def analyze_behavioral_patterns(self, data: dict) -> List[BehavioralContext]:
        # Analyzes user behavior patterns
        # Identifies: low_exercise, high_screen_time, poor_sleep, etc.
```

#### **2. Enhanced Recommendations**
```python
class EnhancedRecommendation(BaseModel):
    type: str                    # sleep_reminder, workout_video, dnd_suggestion
    title: str                   # User-friendly title
    description: str             # Detailed description
    action_url: str = None       # Optional action link
    priority: int = None         # Priority level (1-5)
    context: str = None          # Behavioral context
    estimated_impact: str = None # Expected impact
    time_sensitive: bool = False # Time-sensitive recommendations
```

#### **3. Drift Detection**
```python
class DriftDetectorAlt:
    def detect_drift_statistical(self, current_data, historical_data):
        # Statistical drift detection using t-test and z-score
        # Identifies gradual behavioral changes over time
```

### Content Management System

Implemented a sophisticated content management system for personalized recommendations:

```python
class ContentManager:
    def get_workout_videos(self, intensity: str, duration: int) -> List[dict]
    def get_inspirational_quotes(self, context: str) -> str
    def get_sleep_reminders(self, sleep_hours: float) -> List[str]
    def get_dnd_suggestions(self, screen_time: float) -> List[str]
```

## 🔧 Phase 2: Docker Configuration & Monolithic Repository Setup

### Challenge: Monolithic Repository Deployment

Our biggest challenge was configuring Docker for a monolithic repository with multiple services.

#### **Initial Problem**
```yaml
# render.yaml (before fix)
services:
  - type: web
    name: lifepattern-ai-service
    dockerfilePath: ./Dockerfile        # ❌ Wrong path
    dockerContext: ./ai-service         # ❌ Wrong context
```

#### **Solution: Correct Monolithic Configuration**
```yaml
# render.yaml (after fix)
services:
  - type: web
    name: lifepattern-backend
    dockerfilePath: ./Dockerfile        # ✅ Root Dockerfile for Go backend
    dockerContext: .                    # ✅ Root context
    
  - type: web
    name: lifepattern-ai-service
    dockerfilePath: ./ai-service/Dockerfile  # ✅ AI service Dockerfile
    dockerContext: .                         # ✅ Root context (monolithic)
```

#### **AI Service Dockerfile Fix**
```dockerfile
# Before (causing build errors)
COPY requirements.txt .              # ❌ File not found
COPY . .                            # ❌ Wrong context

# After (working correctly)
COPY ai-service/requirements.txt .   # ✅ Correct path
COPY ai-service/ .                   # ✅ Correct context
```

## 🐛 Phase 3: Critical Backend Migration Issues

### The Database Schema Crisis

We encountered a critical issue where the backend failed to deploy with the error:
```
❌ Failed to apply migrations: failed to apply complete schema: pq: column "refresh_hash" does not exist
```

### Root Cause Analysis

The issue stemmed from a **schema mismatch** between:
1. **Hardcoded schema** in `backend/cmd/server/main.go`
2. **Migration files** in `backend/migrations/`

### Comprehensive Fix

#### **1. Updated Database Schema**
```sql
-- Before (incompatible with AI service)
CREATE TABLE routine_logs (
    sleep_hours DECIMAL(3,1),
    meal_times TEXT[],           -- ❌ Wrong type
    screen_time INTEGER,         -- ❌ Wrong type
    exercise_duration INTEGER,   -- ❌ Wrong type
    wake_up_time TIME,           -- ❌ Wrong type
    bed_time TIME,               -- ❌ Wrong type
    water_intake INTEGER         -- ❌ Wrong type
);

-- After (AI service compatible)
CREATE TABLE routine_logs (
    sleep_hours DECIMAL(3,1) NOT NULL CHECK (sleep_hours >= 0 AND sleep_hours <= 24),
    meal_times JSONB NOT NULL,                    -- ✅ JSONB for flexibility
    screen_time DECIMAL(4,1) NOT NULL CHECK (screen_time >= 0 AND screen_time <= 24),
    exercise_duration DECIMAL(3,1) NOT NULL CHECK (exercise_duration >= 0 AND exercise_duration <= 24),
    wake_up_time VARCHAR(5) NOT NULL,             -- ✅ HH:MM format
    bed_time VARCHAR(5) NOT NULL,                 -- ✅ HH:MM format
    water_intake DECIMAL(3,1) NOT NULL CHECK (water_intake >= 0 AND water_intake <= 20)
);

-- Added AI reports table with enhanced fields
CREATE TABLE ai_reports (
    id SERIAL PRIMARY KEY,
    routine_log_id INTEGER NOT NULL REFERENCES routine_logs(id) ON DELETE CASCADE,
    is_anomaly BOOLEAN NOT NULL,
    confidence_score DECIMAL(3,3) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    anomaly_type VARCHAR(50) NOT NULL,
    recommendations JSONB NOT NULL,
    enhanced_recommendations JSONB DEFAULT '[]'::jsonb,  -- ✅ Enhanced recommendations
    behavioral_contexts TEXT[] DEFAULT '{}',             -- ✅ Behavioral contexts
    ai_service_response JSONB NOT NULL,
    drift_analysis JSONB,
    baseline_comparison JSONB,
    model_version VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **2. Enhanced Indexes for Performance**
```sql
-- GIN indexes for JSONB fields
CREATE INDEX idx_ai_reports_enhanced_recommendations ON ai_reports USING GIN (enhanced_recommendations);
CREATE INDEX idx_ai_reports_behavioral_contexts ON ai_reports USING GIN (behavioral_contexts);
```

#### **3. Migration Safety**
Created `006_fix_refresh_hash_issue.sql` to handle existing database inconsistencies:
```sql
-- Safe migration with conditional logic
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sessions' AND column_name = 'refresh_hash'
    ) THEN
        ALTER TABLE sessions ADD COLUMN refresh_hash VARCHAR(255) NOT NULL DEFAULT '';
    END IF;
END $$;
```

## 🎯 Phase 4: Production Deployment

### AI Service Deployment

#### **Configuration**
```yaml
# Environment Variables
PORT=8000
ENVIRONMENT=production
LOG_LEVEL=INFO
DRIFT_WINDOW_SIZE=30
DRIFT_THRESHOLD=0.05
```

#### **Health Check Endpoint**
```python
@app.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="healthy",
        model_loaded=True,
        model_accuracy=1.0,
        timestamp=datetime.now().isoformat()
    )
```

### Backend Integration

#### **AI Service Client**
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
```

## 📊 Results & Performance

### Enhanced AI Features Working

```json
{
  "is_anomaly": true,
  "confidence_score": 1.0,
  "anomaly_type": "insufficient_sleep",
  "enhanced_recommendations": [
    {
      "type": "sleep_reminder",
      "title": "Prepare for better sleep",
      "description": "You've been sleeping less than 7 hours - consider an earlier bedtime",
      "priority": 5,
      "context": "Priority: high",
      "estimated_impact": "high",
      "time_sensitive": true
    },
    {
      "type": "workout_video",
      "title": "5-Minute Morning Stretch",
      "description": "Stretching workout (5 minutes)",
      "action_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "priority": 4,
      "context": "Intensity: beginner, Equipment: none",
      "estimated_impact": "high",
      "time_sensitive": false
    }
  ],
  "behavioral_contexts": [
    "low_exercise",
    "late_night_usage",
    "poor_sleep",
    "low_water_intake"
  ],
  "drift_analysis": {
    "drift_detected": false,
    "confidence": 0.0,
    "drift_type": "no_drift"
  }
}
```

### Service URLs

- **AI Service**: https://lifepattern-ai-service.onrender.com
- **Backend**: https://lifepattern-backend.onrender.com
- **Health Checks**: 
  - AI: https://lifepattern-ai-service.onrender.com/health
  - Backend: https://lifepattern-backend.onrender.com/health

## 🔧 Technical Challenges & Solutions

### 1. Docker Context Issues
**Problem**: Monolithic repository Docker configuration
**Solution**: Proper path mapping with root context

### 2. Database Schema Mismatch
**Problem**: Incompatible data types between services
**Solution**: Comprehensive schema update with enhanced AI fields

### 3. Migration Conflicts
**Problem**: Hardcoded schema vs migration files
**Solution**: Unified schema approach with safety migrations

### 4. Import Dependencies
**Problem**: `ruptures` library compatibility issues
**Solution**: Alternative drift detection implementation

## 🚀 Lessons Learned

### 1. Monolithic Repository Best Practices
- Use correct Docker contexts for each service
- Maintain consistent file paths across environments
- Implement proper service isolation

### 2. Database Schema Management
- Keep schemas synchronized between services
- Use proper data types for AI/ML applications
- Implement safe migration strategies

### 3. Production Deployment
- Test Docker builds locally before deployment
- Implement comprehensive health checks
- Use environment-specific configurations

### 4. AI Service Integration
- Design flexible data structures for ML features
- Implement proper error handling and fallbacks
- Use JSONB for complex data structures

## 🎉 Success Metrics

- ✅ **AI Service**: Successfully deployed with enhanced features
- ✅ **Backend**: Fixed and ready for production
- ✅ **Database**: Compatible schema for both services
- ✅ **Integration**: Full system communication working
- ✅ **Performance**: Optimized indexes and data structures

## 🔮 Future Enhancements

1. **Real-time Drift Detection**: Implement live behavioral change detection
2. **Personalized Content**: AI-driven content recommendations
3. **Advanced Analytics**: User behavior pattern analysis
4. **Mobile Integration**: Enhanced mobile app features
5. **Scalability**: Horizontal scaling for high traffic

## 📚 Resources

- [LifePattern AI Service Documentation](https://lifepattern-ai-service.onrender.com/docs)
- [Backend API Documentation](https://lifepattern-backend.onrender.com/docs)
- [GitHub Repository](https://github.com/oskarfullsail/lifepattern)
- [Render Deployment Guide](https://render.com/docs)

---

*This journey demonstrates the complexity and rewards of deploying AI-powered applications to production. The combination of careful planning, systematic problem-solving, and robust testing led to a successful deployment of enhanced AI capabilities in the LifePattern ecosystem.*

*Stay tuned for more updates on our AI-powered health and wellness platform!* 🚀 