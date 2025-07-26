import logging
import os
from datetime import datetime
from typing import Dict, Any

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from models.anomaly_detector import AnomalyDetector
from utils.data_generator import generate_mock_dataset

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Daily Routine Anomaly Detection Service",
    description="AI microservice for detecting anomalies in daily routine data",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the anomaly detector
anomaly_detector = AnomalyDetector()

# Pydantic models for request/response
class DailyRoutineData(BaseModel):
    sleep_hours: float = Field(..., ge=0, le=24, description="Hours of sleep")
    meal_times: list = Field(..., description="List of meal timestamps (HH:MM format)")
    screen_time: float = Field(..., ge=0, le=24, description="Hours of screen time")
    exercise_duration: float = Field(..., ge=0, le=24, description="Hours of exercise")
    wake_up_time: str = Field(..., description="Wake up time (HH:MM format)")
    bed_time: str = Field(..., description="Bed time (HH:MM format)")
    water_intake: float = Field(..., ge=0, description="Liters of water consumed")
    stress_level: int = Field(..., ge=1, le=10, description="Stress level (1-10 scale)")

class PredictionResponse(BaseModel):
    is_anomaly: bool
    confidence_score: float
    anomaly_type: str
    recommendations: list[str]
    timestamp: str

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_accuracy: float
    timestamp: str

@app.on_event("startup")
async def startup_event():
    """Initialize the model on startup"""
    try:
        logger.info("Starting anomaly detection service...")
        
        # Generate mock dataset and train model
        logger.info("Generating mock dataset...")
        X_train, X_test, y_train, y_test = generate_mock_dataset()
        
        logger.info("Training anomaly detection model...")
        anomaly_detector.train(X_train, y_train)
        
        # Evaluate model
        accuracy = anomaly_detector.evaluate(X_test, y_test)
        logger.info(f"Model trained successfully with accuracy: {accuracy:.3f}")
        
    except Exception as e:
        logger.error(f"Error during startup: {str(e)}")
        raise

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint for monitoring"""
    try:
        accuracy = anomaly_detector.get_accuracy() if anomaly_detector.is_trained else 0.0
        return HealthResponse(
            status="healthy",
            model_loaded=anomaly_detector.is_trained,
            model_accuracy=accuracy,
            timestamp=datetime.now().isoformat()
        )
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Service unhealthy")

@app.post("/predict", response_model=PredictionResponse)
async def predict_anomaly(data: DailyRoutineData):
    """Predict anomalies in daily routine data"""
    try:
        logger.info(f"Received prediction request for data: {data}")
        
        # Validate meal times format
        for meal_time in data.meal_times:
            try:
                datetime.strptime(meal_time, "%H:%M")
            except ValueError:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Invalid meal time format: {meal_time}. Use HH:MM format"
                )
        
        # Validate time formats
        try:
            datetime.strptime(data.wake_up_time, "%H:%M")
            datetime.strptime(data.bed_time, "%H:%M")
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid time format. Use HH:MM format for wake_up_time and bed_time"
            )
        
        # Convert data to features
        features = anomaly_detector.preprocess_data(data)
        
        # Make prediction
        is_anomaly, confidence_score, anomaly_type = anomaly_detector.predict(features)
        
        # Generate recommendations
        recommendations = generate_recommendations(data, is_anomaly, anomaly_type)
        
        response = PredictionResponse(
            is_anomaly=is_anomaly,
            confidence_score=confidence_score,
            anomaly_type=anomaly_type,
            recommendations=recommendations,
            timestamp=datetime.now().isoformat()
        )
        
        logger.info(f"Prediction completed: {response}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

def generate_recommendations(data: DailyRoutineData, is_anomaly: bool, anomaly_type: str) -> list[str]:
    """Generate personalized recommendations based on the prediction"""
    recommendations = []
    
    if not is_anomaly:
        recommendations.append("Your daily routine looks healthy! Keep up the good work.")
        return recommendations
    
    # Sleep-related recommendations
    if data.sleep_hours < 7:
        recommendations.append("Consider increasing your sleep duration to 7-9 hours for better health.")
    elif data.sleep_hours > 9:
        recommendations.append("You might be oversleeping. Aim for 7-9 hours of sleep.")
    
    # Screen time recommendations
    if data.screen_time > 8:
        recommendations.append("Try to reduce screen time and take regular breaks to protect your eyes.")
    
    # Exercise recommendations
    if data.exercise_duration < 0.5:
        recommendations.append("Aim for at least 30 minutes of moderate exercise daily.")
    
    # Water intake recommendations
    if data.water_intake < 2:
        recommendations.append("Increase your water intake to at least 2 liters per day.")
    
    # Stress level recommendations
    if data.stress_level > 7:
        recommendations.append("Consider stress management techniques like meditation or deep breathing.")
    
    # Meal timing recommendations
    if len(data.meal_times) < 3:
        recommendations.append("Try to have 3 regular meals per day for better metabolism.")
    
    return recommendations

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port) 