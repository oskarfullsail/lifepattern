# LifePattern Backend Communication Flow

## Overview

The LifePattern backend serves as the **business logic layer** that orchestrates communication between the frontend, AI service, and database. It acts as a bridge that:

1. **Receives requests from the frontend**
2. **Processes business logic**
3. **Communicates with the AI service for analysis**
4. **Stores data in PostgreSQL**
5. **Returns combined responses to the frontend**

## Architecture Diagram

```
┌─────────────┐    HTTP/REST    ┌─────────────┐    HTTP/REST    ┌─────────────┐
│   Frontend  │ ◄──────────────► │   Backend   │ ◄──────────────► │ AI Service  │
│  (React/    │                 │   (Golang)  │                 │  (Python)   │
│   Mobile)   │                 │             │                 │             │
└─────────────┘                 └─────────────┘                 └─────────────┘
                                         │
                                         │ SQL
                                         ▼
                                ┌─────────────┐
                                │ PostgreSQL  │
                                │  Database   │
                                └─────────────┘
```

## Communication Flow Details

### 1. Create Routine Log Flow

```
Frontend → Backend → Database → AI Service → Database → Backend → Frontend
```

**Step-by-step process:**

1. **Frontend → Backend**: `POST /log`
   - Frontend sends routine data (sleep, meals, exercise, etc.)
   - Backend validates input data
   - Backend applies business rules

2. **Backend → Database**: Save routine log
   - Backend saves routine data to PostgreSQL
   - Returns log ID for reference

3. **Backend → AI Service**: `POST /predict`
   - Backend sends routine data to AI service
   - AI service analyzes data for anomalies
   - AI service returns analysis results

4. **Backend → Database**: Save AI analysis
   - Backend saves AI analysis results
   - Links analysis to routine log

5. **Backend → Frontend**: Combined response
   - Backend returns routine log ID + AI analysis
   - Frontend displays results to user

### 2. Get Insights Flow

```
Frontend → Backend → Database → Backend → Frontend
```

**Step-by-step process:**

1. **Frontend → Backend**: `GET /insights?log_id=123`
   - Frontend requests specific insight

2. **Backend → Database**: Retrieve data
   - Backend fetches routine log + AI analysis
   - Combines data into insight response

3. **Backend → Frontend**: Insight data
   - Backend returns complete insight
   - Frontend displays detailed analysis

### 3. Get User Logs Flow

```
Frontend → Backend → Database → Backend → Frontend
```

**Step-by-step process:**

1. **Frontend → Backend**: `GET /logs?user_id=1&limit=10`
   - Frontend requests user's routine logs

2. **Backend → Database**: Retrieve logs
   - Backend fetches user's routine logs
   - Applies pagination/limiting

3. **Backend → Frontend**: Log list
   - Backend returns list of routine logs
   - Frontend displays log history

## API Endpoints

### Frontend → Backend Communication

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| POST | `/log` | Create routine log with AI analysis | Routine data | Log ID + AI result |
| GET | `/logs` | Get user's routine logs | user_id, limit | List of logs |
| GET | `/insights` | Get specific insight | log_id | Complete insight |
| GET | `/user-insights` | Get all insights for user | user_id, limit | List of insights |
| GET | `/health` | Service health check | None | Health status |

### Backend → AI Service Communication

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| POST | `/predict` | Analyze routine data | Routine data | AI analysis |
| GET | `/health` | Check AI service health | None | Health status |

## Data Flow Examples

### Example 1: Creating a Routine Log

```bash
# Frontend sends routine data
curl -X POST http://localhost:8080/log \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "sleep_hours": 6.5,
    "meal_times": ["07:30", "12:00", "18:30"],
    "screen_time": 8.0,
    "exercise_duration": 0.0,
    "wake_up_time": "07:00",
    "bed_time": "23:30",
    "water_intake": 1.5,
    "stress_level": 7
  }'

# Backend processes and returns:
{
  "log_id": 123,
  "message": "Routine log saved and analyzed successfully",
  "has_ai": true,
  "ai_result": {
    "is_anomaly": true,
    "confidence_score": 0.85,
    "anomaly_type": "high_screen_time"
  }
}
```

### Example 2: Getting User Insights

```bash
# Frontend requests user insights
curl "http://localhost:8080/user-insights?user_id=1&limit=5"

# Backend returns combined data:
{
  "user_id": 1,
  "insights": [
    {
      "routine_log": { /* routine data */ },
      "ai_report": { /* AI analysis */ }
    }
  ],
  "count": 5
}
```

## Error Handling

### Graceful Degradation

The backend is designed to handle AI service failures gracefully:

1. **AI Service Down**: Routine logs are still saved, AI analysis is marked as unavailable
2. **Database Issues**: Proper error responses with meaningful messages
3. **Invalid Data**: Validation errors with specific field information

### Error Response Format

```json
{
  "error": "Error description",
  "details": "Additional error information",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Benefits of This Architecture

### 1. **Separation of Concerns**
- Frontend: UI/UX and user interaction
- Backend: Business logic and data orchestration
- AI Service: Machine learning analysis
- Database: Data persistence

### 2. **Scalability**
- Each service can scale independently
- Load balancing possible at each layer
- Microservices architecture

### 3. **Fault Tolerance**
- Backend continues working even if AI service is down
- Graceful degradation for non-critical failures
- Proper error handling and logging

### 4. **Maintainability**
- Clear interfaces between services
- Easy to test individual components
- Modular design for easy updates

### 5. **Security**
- Backend acts as a security layer
- Input validation and sanitization
- CORS handling for frontend communication

## Monitoring and Logging

The backend provides comprehensive logging for monitoring the communication flow:

- **Request/Response logging**: Track all API calls
- **AI service communication**: Monitor AI service health and responses
- **Database operations**: Track data persistence
- **Error tracking**: Detailed error information for debugging

## Development Workflow

1. **Frontend Development**: Focus on UI/UX, API integration
2. **Backend Development**: Business logic, data orchestration
3. **AI Service Development**: Machine learning models and analysis
4. **Database Design**: Schema design and optimization

This architecture ensures that each team can work independently while maintaining clear interfaces for integration. 