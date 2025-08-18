import logging
import os
from datetime import datetime
from typing import Dict, Any, List
import time # Added for model retraining

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from models.anomaly_detector import AnomalyDetector
from models.behavioral_analyzer import BehavioralAnalyzer, RecommendationType, BehavioralContext
from utils.content_manager import ContentManager
# from models.drift_detector_alt import DriftDetectorAlt as DriftDetector
# from models.drift_detector import DriftDetector
from utils.data_generator import generate_mock_dataset
from config import config

# Configure logging
logging.basicConfig(
    level=getattr(logging, config.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Daily Routine Anomaly Detection Service",
    description="AI microservice for detecting anomalies in daily routine data",
    version="1.0.0",
    debug=config.DEBUG
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the anomaly detector and drift detector
anomaly_detector = AnomalyDetector()
# drift_detector = DriftDetector()

# Initialize enhanced behavioral analysis components
behavioral_analyzer = BehavioralAnalyzer()
content_manager = ContentManager()

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

class EnhancedRecommendation(BaseModel):
    type: str
    title: str
    description: str
    action_url: str = None
    priority: int = None
    context: str = None
    estimated_impact: str = None
    time_sensitive: bool = False

class PredictionResponse(BaseModel):
    is_anomaly: bool
    confidence_score: float
    anomaly_type: str
    recommendations: list[str]
    enhanced_recommendations: list[EnhancedRecommendation] = None
    behavioral_contexts: list[str] = None
    timestamp: str
    drift_analysis: dict = None
    baseline_comparison: dict = None

class BatchPredictionRequest(BaseModel):
    routines: list[DailyRoutineData] = Field(..., description="List of daily routine data")

class BatchPredictionResponse(BaseModel):
    predictions: list[PredictionResponse]
    summary: dict
    timestamp: str

class ModelRetrainRequest(BaseModel):
    force_retrain: bool = Field(default=False, description="Force retraining even if model is recent")
    new_data_ratio: float = Field(default=0.1, ge=0, le=1, description="Ratio of new data to add")

class ModelRetrainResponse(BaseModel):
    success: bool
    old_accuracy: float
    new_accuracy: float
    training_time: float
    samples_used: int
    message: str
    timestamp: str

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_accuracy: float
    timestamp: str

class EnhancedPredictionResponse(BaseModel):
    is_anomaly: bool
    confidence_score: float
    anomaly_type: str
    recommendations: list[str]
    enhanced_recommendations: list[EnhancedRecommendation]
    behavioral_contexts: list[str]
    timestamp: str
    drift_analysis: dict = None
    baseline_comparison: dict = None

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
        
        # Generate enhanced behavioral recommendations
        behavioral_contexts = behavioral_analyzer.analyze_behavioral_patterns(data.dict())
        enhanced_recommendations = generate_enhanced_recommendations(data, behavioral_contexts)
        
        # Also generate basic recommendations for backward compatibility
        basic_recommendations = generate_recommendations(data, is_anomaly, anomaly_type)
        
        # Perform drift analysis with current data as historical context
        # In production, this would come from the backend with actual historical data
        current_data_dict = data.dict()
        
        # Add derived features for drift detection
        current_data_dict['health_score'] = _calculate_health_score(data)
        current_data_dict['wake_up_hour'] = int(data.wake_up_time.split(':')[0])
        current_data_dict['bed_time_hour'] = int(data.bed_time.split(':')[0])
        current_data_dict['meal_count'] = len(data.meal_times)
        
        # Use current data as historical context for demonstration
        # In production, this would be actual historical data from the database
        historical_data = [current_data_dict] * 30  # Simulate 30 days of similar data
        
        # Perform comprehensive drift analysis
        # drift_analysis = drift_detector.analyze_routine_drift(
        #     user_id="demo_user",
        #     current_data=current_data_dict,
        #     historical_data=historical_data
        # )
        drift_analysis = {"drift_detected": False, "confidence": 0.0, "drift_type": "no_drift"}
        
        response = PredictionResponse(
            is_anomaly=is_anomaly,
            confidence_score=confidence_score,
            anomaly_type=anomaly_type,
            recommendations=basic_recommendations,
            enhanced_recommendations=enhanced_recommendations,
            behavioral_contexts=[context.value for context in behavioral_contexts],
            timestamp=datetime.now().isoformat(),
            drift_analysis=drift_analysis,
            baseline_comparison=drift_analysis.get('baseline_comparison', {})
        )
        
        logger.info(f"Prediction completed: {response}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

def generate_enhanced_recommendations(routine_data: DailyRoutineData, contexts: List[BehavioralContext]) -> List[EnhancedRecommendation]:
    """Generate enhanced behavioral recommendations"""
    enhanced_recommendations = []
    context_strings = [context.value for context in contexts]
    
    # Get recommendation priorities
    priorities = behavioral_analyzer.get_recommendation_priorities(contexts)
    
    # Generate recommendations based on priorities
    for rec_type, priority in sorted(priorities.items(), key=lambda x: x[1], reverse=True):
        if rec_type == RecommendationType.INSPIRATIONAL_QUOTE:
            quote = content_manager.get_contextual_quote(context_strings)
            enhanced_recommendations.append(EnhancedRecommendation(
                type="inspirational_quote",
                title="Daily Inspiration",
                description=quote["text"],
                priority=priority,
                context=f"Author: {quote['author']}",
                estimated_impact="medium",
                time_sensitive=False
            ))
        
        elif rec_type == RecommendationType.WORKOUT_VIDEO:
            video = content_manager.get_workout_video(contexts=context_strings)
            enhanced_recommendations.append(EnhancedRecommendation(
                type="workout_video",
                title=video["title"],
                description=f"{video['category'].title()} workout ({video['duration']//60} minutes)",
                action_url=video["url"],
                priority=priority,
                context=f"Intensity: {video['intensity']}, Equipment: {video['equipment']}",
                estimated_impact="high",
                time_sensitive=False
            ))
        
        elif rec_type == RecommendationType.DND_SUGGESTION:
            dnd = content_manager.get_dnd_suggestion(context_strings)
            enhanced_recommendations.append(EnhancedRecommendation(
                type="dnd_suggestion",
                title=dnd["suggestion"],
                description=dnd["reason"],
                priority=priority,
                context=f"Duration: {dnd['duration']}, Priority: {dnd['priority']}",
                estimated_impact="medium",
                time_sensitive=True
            ))
        
        elif rec_type == RecommendationType.SOCIAL_CONNECTION:
            social = content_manager.get_social_suggestion(context_strings)
            enhanced_recommendations.append(EnhancedRecommendation(
                type="social_connection",
                title=social["suggestion"],
                description=social["reason"],
                priority=priority,
                context=f"Context: {social['context']}",
                estimated_impact="high",
                time_sensitive=False
            ))
        
        elif rec_type == RecommendationType.SLEEP_REMINDER:
            sleep = content_manager.get_sleep_reminder(context_strings)
            enhanced_recommendations.append(EnhancedRecommendation(
                type="sleep_reminder",
                title=sleep["suggestion"],
                description=sleep["reason"],
                priority=priority,
                context=f"Priority: {sleep['priority']}",
                estimated_impact="high",
                time_sensitive=True
            ))
    
    return enhanced_recommendations[:5]  # Limit to top 5 recommendations

@app.post("/predict/enhanced", response_model=EnhancedPredictionResponse)
async def predict_enhanced_anomaly(data: DailyRoutineData):
    """Enhanced prediction with behavioral recommendations"""
    try:
        logger.info(f"Received enhanced prediction request for data: {data}")
        
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
        
        # Analyze behavioral patterns
        routine_dict = {
            'sleep_hours': data.sleep_hours,
            'meal_times': data.meal_times,
            'screen_time': data.screen_time,
            'exercise_duration': data.exercise_duration,
            'wake_up_time': data.wake_up_time,
            'bed_time': data.bed_time,
            'water_intake': data.water_intake,
            'stress_level': data.stress_level
        }
        
        behavioral_contexts = behavioral_analyzer.analyze_behavioral_patterns(routine_dict)
        
        # Generate traditional recommendations
        recommendations = generate_recommendations(data, is_anomaly, anomaly_type)
        
        # Generate enhanced recommendations
        enhanced_recommendations = generate_enhanced_recommendations(data, behavioral_contexts)
        
        # Perform drift analysis (temporarily disabled)
        drift_analysis = {
            'drift_detected': False,
            'confidence': 0.0,
            'drift_type': 'no_drift',
            'padwin_analysis': {'drift_detected': False, 'confidence': 0.0, 'drift_type': 'no_drift'},
            'isolation_analysis': {'anomaly_detected': False, 'confidence': 0.0, 'anomaly_type': 'normal'},
            'baseline_comparison': {}
        }
        
        response = EnhancedPredictionResponse(
            is_anomaly=is_anomaly,
            confidence_score=confidence_score,
            anomaly_type=anomaly_type,
            recommendations=recommendations,
            enhanced_recommendations=enhanced_recommendations,
            behavioral_contexts=[context.value for context in behavioral_contexts],
            timestamp=datetime.now().isoformat(),
            drift_analysis=drift_analysis,
            baseline_comparison=drift_analysis.get('baseline_comparison', {})
        )
        
        logger.info(f"Enhanced prediction completed: {len(enhanced_recommendations)} enhanced recommendations")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Enhanced prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/predict/batch", response_model=BatchPredictionResponse)
async def predict_batch_anomalies(data: BatchPredictionRequest):
    """Predict anomalies for multiple daily routine data points"""
    try:
        logger.info(f"Received batch prediction request for {len(data.routines)} routines")
        
        predictions = []
        anomaly_count = 0
        total_confidence = 0.0
        
        for i, routine in enumerate(data.routines):
            try:
                # Validate meal times format
                for meal_time in routine.meal_times:
                    try:
                        datetime.strptime(meal_time, "%H:%M")
                    except ValueError:
                        raise HTTPException(
                            status_code=400, 
                            detail=f"Invalid meal time format in routine {i+1}: {meal_time}. Use HH:MM format"
                        )
                
                # Validate time formats
                try:
                    datetime.strptime(routine.wake_up_time, "%H:%M")
                    datetime.strptime(routine.bed_time, "%H:%M")
                except ValueError:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Invalid time format in routine {i+1}. Use HH:MM format for wake_up_time and bed_time"
                    )
                
                # Convert data to features
                features = anomaly_detector.preprocess_data(routine)
                
                # Make prediction
                is_anomaly, confidence_score, anomaly_type = anomaly_detector.predict(features)
                
                # Generate recommendations
                recommendations = generate_recommendations(routine, is_anomaly, anomaly_type)
                
                # Create prediction response
                prediction = PredictionResponse(
                    is_anomaly=is_anomaly,
                    confidence_score=confidence_score,
                    anomaly_type=anomaly_type,
                    recommendations=recommendations,
                    timestamp=datetime.now().isoformat(),
                    drift_analysis={
                        'drift_detected': False,
                        'confidence': 0.0,
                        'drift_type': 'no_drift',
                        'padwin_analysis': {'drift_detected': False, 'confidence': 0.0, 'drift_type': 'no_drift'},
                        'isolation_analysis': {'anomaly_detected': False, 'confidence': 0.0, 'anomaly_type': 'normal'},
                        'baseline_comparison': {}
                    },
                    baseline_comparison={}
                )
                
                predictions.append(prediction)
                
                if is_anomaly:
                    anomaly_count += 1
                total_confidence += confidence_score
                
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Error processing routine {i+1}: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Error processing routine {i+1}")
        
        # Calculate summary statistics
        summary = {
            "total_routines": len(data.routines),
            "anomaly_count": anomaly_count,
            "anomaly_percentage": (anomaly_count / len(data.routines)) * 100 if data.routines else 0,
            "average_confidence": total_confidence / len(data.routines) if data.routines else 0,
            "healthy_count": len(data.routines) - anomaly_count
        }
        
        response = BatchPredictionResponse(
            predictions=predictions,
            summary=summary,
            timestamp=datetime.now().isoformat()
        )
        
        logger.info(f"Batch prediction completed: {summary}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Batch prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/model/retrain", response_model=ModelRetrainResponse)
async def retrain_model(data: ModelRetrainRequest):
    """Retrain the anomaly detection model with new data"""
    try:
        logger.info(f"Received model retrain request - Force: {data.force_retrain}, New data ratio: {data.new_data_ratio}")
        
        start_time = time.time()
        old_accuracy = anomaly_detector.get_accuracy()
        
        # Generate new training data
        X_train, X_test, y_train, y_test = generate_mock_dataset()
        
        # Retrain the model
        anomaly_detector.train(X_train, y_train)
        
        # Evaluate new model
        new_accuracy = anomaly_detector.evaluate(X_test, y_test)
        
        training_time = time.time() - start_time
        
        response = ModelRetrainResponse(
            success=True,
            old_accuracy=old_accuracy,
            new_accuracy=new_accuracy,
            training_time=training_time,
            samples_used=len(X_train),
            message=f"Model retrained successfully. Accuracy improved from {old_accuracy:.3f} to {new_accuracy:.3f}",
            timestamp=datetime.now().isoformat()
        )
        
        logger.info(f"Model retraining completed: {response.message}")
        return response
        
    except Exception as e:
        logger.error(f"Model retraining error: {str(e)}")
        raise HTTPException(status_code=500, detail="Model retraining failed")

@app.get("/model/info")
async def get_model_info():
    """Get information about the current model"""
    try:
        return {
            "model_type": "RandomForestClassifier",
            "is_trained": anomaly_detector.is_trained,
            "accuracy": anomaly_detector.get_accuracy(),
            "feature_count": len(anomaly_detector.feature_names),
            "features": anomaly_detector.feature_names,
            "model_path": anomaly_detector.model_path,
            "last_trained": datetime.now().isoformat(),
            "version": "1.0.0"
        }
    except Exception as e:
        logger.error(f"Model info error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get model info")

def _calculate_health_score(data: DailyRoutineData) -> float:
    """Calculate a health score based on routine data"""
    score = 0.0
    
    # Sleep score (0-25 points)
    if 7 <= data.sleep_hours <= 9:
        score += 25
    elif 6 <= data.sleep_hours <= 10:
        score += 15
    else:
        score += 5
    
    # Exercise score (0-20 points)
    if data.exercise_duration >= 1.0:
        score += 20
    elif data.exercise_duration >= 0.5:
        score += 15
    elif data.exercise_duration >= 0.25:
        score += 10
    else:
        score += 5
    
    # Screen time score (0-15 points)
    if data.screen_time <= 4:
        score += 15
    elif data.screen_time <= 6:
        score += 10
    elif data.screen_time <= 8:
        score += 5
    else:
        score += 0
    
    # Water intake score (0-15 points)
    if data.water_intake >= 2.5:
        score += 15
    elif data.water_intake >= 2.0:
        score += 12
    elif data.water_intake >= 1.5:
        score += 8
    else:
        score += 5
    
    # Stress score (0-15 points)
    if data.stress_level <= 3:
        score += 15
    elif data.stress_level <= 5:
        score += 12
    elif data.stress_level <= 7:
        score += 8
    else:
        score += 5
    
    # Meal regularity score (0-10 points)
    if len(data.meal_times) >= 3:
        score += 10
    elif len(data.meal_times) >= 2:
        score += 7
    else:
        score += 3
    
    return min(score / 100.0, 1.0)  # Normalize to 0-1

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
    uvicorn.run(
        app, 
        host=config.HOST, 
        port=config.PORT,
        log_level=config.LOG_LEVEL.lower()
    ) 