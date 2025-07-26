# Daily Routine Anomaly Detection AI Service

A Python-based AI microservice using FastAPI to analyze users' daily routine data and detect anomalies that may indicate unhealthy habits or disruptions in their schedules.

## Features

- **Anomaly Detection**: Uses RandomForestClassifier to identify deviations from normal behavior patterns
- **Real-time Analysis**: FastAPI endpoints for instant predictions
- **Comprehensive Monitoring**: Health check endpoint for service monitoring
- **Personalized Recommendations**: Generates actionable feedback based on detected anomalies
- **Docker Support**: Containerized for easy deployment and scaling
- **Input Validation**: Robust validation for all input data
- **Logging**: Comprehensive logging for debugging and monitoring

## Architecture

The service consists of:

- **FastAPI Application** (`main.py`): Main API server with endpoints
- **Anomaly Detector** (`models/anomaly_detector.py`): ML model for anomaly detection
- **Data Generator** (`utils/data_generator.py`): Mock dataset generation for training
- **Docker Configuration**: Containerization setup

## API Endpoints

### Health Check
```
GET /health
```
Returns service status and model information.

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "model_accuracy": 0.923,
  "timestamp": "2024-01-15T10:30:00"
}
```

### Predict Anomaly
```
POST /predict
```
Analyzes daily routine data and returns anomaly predictions.

**Request Body:**
```json
{
  "sleep_hours": 8.0,
  "meal_times": ["07:30", "12:00", "18:30"],
  "screen_time": 4.5,
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
  "is_anomaly": false,
  "confidence_score": 0.89,
  "anomaly_type": "normal_routine",
  "recommendations": ["Your daily routine looks healthy! Keep up the good work."],
  "timestamp": "2024-01-15T10:30:00"
}
```

## Installation & Setup

### Prerequisites
- Python 3.11+
- Docker (optional)
- Docker Compose (optional)

### Local Development

1. **Clone and navigate to the project:**
```bash
cd ai-service
```

2. **Create virtual environment:**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies:**
```bash
pip install -r requirements.txt
```

4. **Run the service:**
```bash
python main.py
```

The service will be available at `http://localhost:8000`

### Docker Deployment

1. **Build and run with Docker Compose:**
```bash
docker-compose up --build
```

2. **Or build and run manually:**
```bash
docker build -t ai-service .
docker run -p 8000:8000 ai-service
```

## Usage Examples

### Testing with Sample Data

The service includes sample data for testing. Here are examples of normal and anomalous routines:

**Normal Routine:**
```json
{
  "sleep_hours": 8.0,
  "meal_times": ["07:30", "12:00", "18:30"],
  "screen_time": 4.5,
  "exercise_duration": 1.0,
  "wake_up_time": "07:00",
  "bed_time": "23:00",
  "water_intake": 2.5,
  "stress_level": 4
}
```

**Anomalous Routine:**
```json
{
  "sleep_hours": 5.0,
  "meal_times": ["10:00", "15:00"],
  "screen_time": 10.0,
  "exercise_duration": 0.2,
  "wake_up_time": "05:00",
  "bed_time": "22:00",
  "water_intake": 1.0,
  "stress_level": 8
}
```

### API Testing with curl

```bash
# Health check
curl http://localhost:8000/health

# Predict anomaly
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "sleep_hours": 8.0,
    "meal_times": ["07:30", "12:00", "18:30"],
    "screen_time": 4.5,
    "exercise_duration": 1.0,
    "wake_up_time": "07:00",
    "bed_time": "23:00",
    "water_intake": 2.5,
    "stress_level": 4
  }'
```

## Model Details

### Features
The model analyzes the following features:
- Sleep hours
- Screen time
- Exercise duration
- Water intake
- Stress level
- Meal count
- Wake up time
- Bed time
- Sleep consistency
- Activity balance
- Health score

### Anomaly Types
The model can detect various types of anomalies:
- `insufficient_sleep`: Less than 6 hours of sleep
- `excessive_sleep`: More than 10 hours of sleep
- `excessive_screen_time`: More than 10 hours of screen time
- `insufficient_exercise`: Less than 30 minutes of exercise
- `low_water_intake`: Less than 1.5 liters of water
- `high_stress_level`: Stress level above 7
- `irregular_meals`: Less than 2 meals per day
- `multiple_anomalies`: Combination of multiple issues

### Training Data
The model is trained on a mock dataset of 1000 samples:
- 700 normal routines (70%)
- 300 anomalous routines (30%)

## Monitoring & Logging

The service includes comprehensive logging:
- Application startup and model training logs
- API request/response logging
- Error tracking and debugging information
- Model performance metrics

Logs are available in the console and can be redirected to files for production deployment.

## Development

### Project Structure
```
ai-service/
├── main.py                 # FastAPI application
├── requirements.txt        # Python dependencies
├── Dockerfile             # Docker configuration
├── docker-compose.yml     # Docker Compose setup
├── README.md              # This file
├── models/
│   ├── __init__.py
│   └── anomaly_detector.py # ML model implementation
└── utils/
    ├── __init__.py
    └── data_generator.py   # Mock data generation
```

### Adding New Features
1. **New Anomaly Types**: Modify `_determine_anomaly_type()` in `AnomalyDetector`
2. **Additional Features**: Update feature extraction in `preprocess_data()`
3. **New Endpoints**: Add routes in `main.py`
4. **Model Improvements**: Enhance the ML model in `anomaly_detector.py`

## Production Deployment

For production deployment, consider:
- Using a production WSGI server (Gunicorn)
- Setting up proper logging to files
- Implementing authentication and rate limiting
- Using environment variables for configuration
- Setting up monitoring and alerting
- Implementing model versioning and A/B testing

## License

This project is part of the LifePattern application suite. 