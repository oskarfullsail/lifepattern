# Enhanced AI Service Documentation

## Overview

The Enhanced AI Service for LifePattern implements advanced behavioral drift detection and anomaly analysis using state-of-the-art machine learning algorithms. This service provides the core intelligence for detecting changes in user routines and generating personalized recommendations.

## Architecture

### Core Components

1. **AnomalyDetector** (`models/anomaly_detector.py`)
   - RandomForest-based anomaly detection
   - Feature engineering and preprocessing
   - Model persistence and evaluation

2. **DriftDetector** (`models/drift_detector.py`)
   - PADWIN algorithm for behavioral drift detection
   - Isolation Forest for anomaly detection
   - User baseline calculation and comparison
   - Historical drift event tracking

3. **FastAPI Application** (`main.py`)
   - RESTful API endpoints
   - Request/response validation
   - Health monitoring
   - Error handling and logging

## Key Features

### 🔍 **Advanced Drift Detection**

#### PADWIN Algorithm
- **Purpose**: Detects gradual changes in user behavior patterns over time
- **Implementation**: Uses ruptures library with Pelt algorithm for change point detection
- **Features**:
  - Population-aware drift detection
  - Configurable window size (default: 30 days)
  - Confidence scoring for drift events
  - Magnitude calculation for drift severity

#### Isolation Forest
- **Purpose**: Detects sudden anomalies in current behavior
- **Implementation**: Scikit-learn Isolation Forest with synthetic baseline data
- **Features**:
  - Anomaly scoring and classification
  - Baseline-based anomaly detection
  - Confidence scoring for anomalies
  - Anomaly type classification

### 📊 **User Baseline Management**

#### Baseline Calculation
```python
# Calculate user baseline from historical data
baseline = drift_detector.calculate_baseline(user_id, historical_data)
```

**Baseline Metrics**:
- Sleep hours (mean, std, median)
- Screen time patterns
- Exercise duration
- Water intake
- Stress levels
- Health score
- Wake up/bed time patterns
- Meal count and timing

#### Baseline Comparison
- Z-score calculation for each metric
- Deviation level classification (normal, moderate, significant)
- Percentage change tracking
- Trend analysis

### 🎯 **Comprehensive Analysis**

#### Combined Drift Analysis
```python
# Perform comprehensive drift analysis
analysis = drift_detector.analyze_routine_drift(
    user_id=user_id,
    current_data=current_data,
    historical_data=historical_data
)
```

**Analysis Results**:
- Drift detection status
- Overall confidence score
- Drift type classification
- PADWIN analysis results
- Isolation Forest analysis results
- Baseline comparison data

## API Endpoints

### Health Check
```http
GET /health
```

**Response**:
```json
{
  "status": "healthy",
  "model_loaded": true,
  "model_accuracy": 0.875,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Prediction with Drift Analysis
```http
POST /predict
```

**Request Format**:
```json
{
  "sleep_hours": 7.5,
  "meal_times": ["07:30", "12:00", "18:30"],
  "screen_time": 6.0,
  "exercise_duration": 0.8,
  "wake_up_time": "07:00",
  "bed_time": "23:00",
  "water_intake": 2.2,
  "stress_level": 4
}
```

**Enhanced Request Format** (with historical context):
```json
{
  "current_data": {
    "sleep_hours": 7.5,
    "meal_times": ["07:30", "12:00", "18:30"],
    "screen_time": 6.0,
    "exercise_duration": 0.8,
    "wake_up_time": "07:00",
    "bed_time": "23:00",
    "water_intake": 2.2,
    "stress_level": 4
  },
  "historical_data": [
    {
      "sleep_hours": 8.0,
      "screen_time": 5.5,
      "exercise_duration": 0.9,
      "water_intake": 2.5,
      "stress_level": 3,
      "wake_up_hour": 7,
      "bed_time_hour": 23,
      "meal_count": 3,
      "health_score": 0.85
    }
  ],
  "user_id": "user_123"
}
```

**Response Format**:
```json
{
  "is_anomaly": false,
  "confidence_score": 0.92,
  "anomaly_type": "normal",
  "recommendations": [
    "Your daily routine looks healthy! Keep up the good work."
  ],
  "timestamp": "2024-01-15T10:30:00Z",
  "drift_analysis": {
    "drift_detected": false,
    "confidence": 0.15,
    "drift_type": "no_drift",
    "padwin_analysis": {
      "drift_detected": false,
      "confidence": 0.0,
      "drift_type": "no_drift"
    },
    "isolation_analysis": {
      "anomaly_detected": false,
      "confidence": 0.15,
      "anomaly_type": "normal",
      "anomaly_score": -0.12
    }
  },
  "baseline_comparison": {
    "sleep_hours": {
      "current": 7.5,
      "baseline_mean": 8.0,
      "z_score": -0.5,
      "deviation": "normal",
      "percent_change": -6.25
    }
  }
}
```

## Configuration

### Environment Variables
```bash
PORT=8000                    # Service port
PYTHONPATH=/app             # Python path
LOG_LEVEL=INFO              # Logging level
```

### Model Configuration
```python
# DriftDetector configuration
drift_detector = DriftDetector(
    window_size=30,         # Days for drift detection window
    drift_threshold=0.05    # Drift detection threshold
)

# AnomalyDetector configuration
anomaly_detector = AnomalyDetector(
    model_path="models/anomaly_model.joblib"  # Model persistence path
)
```

## Performance Characteristics

### Response Times
- **Basic prediction**: ~100-200ms
- **Drift analysis**: ~500-1000ms (with historical data)
- **Health check**: ~10-50ms

### Resource Usage
- **Memory**: ~200-500MB (depending on model size)
- **CPU**: Low during idle, spikes during analysis
- **Storage**: ~50-100MB for model files

### Scalability
- **Concurrent requests**: 10-50 requests/second
- **Horizontal scaling**: Stateless design supports multiple instances
- **Model updates**: Hot-reloadable without service restart

## Integration with Backend

### Go Backend Integration
The Go backend provides enhanced integration through the `AnalyzeRoutineWithHistory` method:

```go
// Enhanced analysis with historical context
response, err := aiService.AnalyzeRoutineWithHistory(
    routineLog,
    historicalData
)
```

### Data Flow
1. **Frontend** → **Backend**: Sends routine data
2. **Backend** → **Database**: Stores routine log
3. **Backend** → **Database**: Retrieves historical data
4. **Backend** → **AI Service**: Sends current + historical data
5. **AI Service** → **Backend**: Returns analysis results
6. **Backend** → **Database**: Stores AI report
7. **Backend** → **Frontend**: Returns insights

## Testing

### Test Suite
Run the comprehensive test suite:

```bash
cd ai-service
python test_enhanced_service.py
```

**Test Coverage**:
- Health check validation
- Basic anomaly prediction
- Drift detection with historical data
- Backend integration
- Performance under load

### Manual Testing
```bash
# Test health endpoint
curl http://localhost:8000/health

# Test basic prediction
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "sleep_hours": 7.5,
    "meal_times": ["07:30", "12:00", "18:30"],
    "screen_time": 6.0,
    "exercise_duration": 0.8,
    "wake_up_time": "07:00",
    "bed_time": "23:00",
    "water_intake": 2.2,
    "stress_level": 4
  }'
```

## Monitoring and Logging

### Health Monitoring
- Service health endpoint
- Model loading status
- Model accuracy tracking
- Response time monitoring

### Logging
- Structured logging with timestamps
- Error tracking and debugging
- Performance metrics
- Request/response logging

### Metrics to Monitor
- Request success rate
- Average response time
- Model accuracy trends
- Drift detection frequency
- Error rates by endpoint

## Future Enhancements

### Planned Features
1. **Real-time Drift Detection**
   - Streaming data processing
   - Real-time alerts and notifications

2. **Personalized Models**
   - User-specific model training
   - Adaptive learning from feedback

3. **Advanced Algorithms**
   - Deep learning models
   - Time series forecasting
   - Multi-modal data fusion

4. **Enhanced Recommendations**
   - Contextual recommendations
   - A/B testing framework
   - Feedback loop optimization

### Research Integration
- Academic paper implementations
- Novel drift detection algorithms
- Performance benchmarking
- Comparative analysis studies

## Troubleshooting

### Common Issues

#### Model Loading Failures
```bash
# Check model file permissions
ls -la models/anomaly_model.joblib

# Verify model file integrity
python -c "import joblib; joblib.load('models/anomaly_model.joblib')"
```

#### Performance Issues
```bash
# Monitor resource usage
htop
# or
docker stats lifepattern-ai-service
```

#### Drift Detection Not Working
- Verify historical data format
- Check baseline calculation
- Validate feature engineering
- Review algorithm parameters

### Debug Mode
Enable debug logging:
```bash
export LOG_LEVEL=DEBUG
python main.py
```

## Security Considerations

### Data Privacy
- No PII processing in AI service
- Anonymized user identifiers
- Secure model storage
- Audit trail for model versions

### API Security
- Input validation and sanitization
- Rate limiting (implemented in backend)
- Error message sanitization
- Secure communication (HTTPS in production)

## Deployment

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up --build ai-service
```

### Production Considerations
- Use production-grade WSGI server (Gunicorn)
- Implement proper logging and monitoring
- Set up health checks and auto-restart
- Configure resource limits
- Enable HTTPS/TLS
- Set up backup and recovery procedures

---

This enhanced AI service provides the foundation for intelligent behavioral analysis in the LifePattern application, enabling personalized insights and proactive health recommendations. 