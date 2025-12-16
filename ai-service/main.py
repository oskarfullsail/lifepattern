import logging
import os
from datetime import datetime
from typing import Dict, Any, List, Optional
from datetime import timedelta
import time # Added for model retraining
import numpy as np

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from models.anomaly_detector import AnomalyDetector
from models.behavioral_analyzer import BehavioralAnalyzer, RecommendationType, BehavioralContext
from models.daily_analyzer import DailyAnalyzer
from models.weekly_analyzer import WeeklyAnalyzer
from utils.content_manager import ContentManager
from models.drift_detector_alt import DriftDetectorAlt as DriftDetector
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
drift_detector = DriftDetector()

# Initialize enhanced behavioral analysis components
behavioral_analyzer = BehavioralAnalyzer()
content_manager = ContentManager()
daily_analyzer = DailyAnalyzer()
weekly_analyzer = WeeklyAnalyzer()

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

# Pydantic models for daily analysis endpoint
class MealsData(BaseModel):
    breakfast: bool = Field(default=False, description="Had breakfast")
    lunch: bool = Field(default=False, description="Had lunch")
    dinner: bool = Field(default=False, description="Had dinner")

class GoalContext(BaseModel):
    sleep_target_hours: float = Field(default=7.5, ge=4, le=12, description="Target sleep hours")
    daily_step_target: int = Field(default=8000, ge=0, description="Daily step target")
    max_screen_time_minutes: int = Field(default=180, ge=0, le=1440, description="Max screen time in minutes")

class DailyAnalysisRequest(BaseModel):
    user_id: str = Field(..., description="User identifier")
    date: str = Field(..., description="Date in YYYY-MM-DD format")
    sleep_hours: float = Field(..., ge=0, le=24, description="Hours of sleep")
    bedtime: str = Field(..., description="Bedtime in HH:MM format")
    wake_time: str = Field(..., description="Wake time in HH:MM format")
    steps: int = Field(..., ge=0, description="Daily step count")
    workout_minutes: int = Field(..., ge=0, le=1440, description="Minutes of exercise")
    screen_time_minutes: int = Field(..., ge=0, le=1440, description="Minutes of screen time")
    meals: MealsData = Field(..., description="Meal information")
    mood: int = Field(..., ge=1, le=5, description="Mood score (1-5, higher is better)")
    stress_level: int = Field(..., ge=1, le=10, description="Stress level (1-10, lower is better)")
    goal_context: GoalContext = Field(..., description="User's goal context")
    history_window_days: int = Field(default=14, ge=0, le=90, description="History window for analysis")

class AnomalyResponse(BaseModel):
    code: str
    description: str
    severity: str

class RecommendationResponse(BaseModel):
    title: str
    reason: str
    suggested_action: str
    time_horizon: str = None

class DailyAnalysisResponse(BaseModel):
    user_id: str
    date: str
    daily_score: float
    anomalies: list[AnomalyResponse]
    recommendations: list[RecommendationResponse]

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
        try:
            # Calculate baseline if not exists
            if "demo_user" not in drift_detector.user_baselines:
                drift_detector.calculate_baseline("demo_user", historical_data)
            
            # Detect drift using statistical methods
            drift_analysis = drift_detector.detect_drift_statistical(
                user_id="demo_user",
                recent_data=historical_data[-10:]  # Use last 10 days for recent analysis
            )
            
            # Convert numpy types to Python native types for JSON serialization
            def convert_numpy_types(obj):
                if hasattr(obj, 'item'):  # numpy scalar
                    return obj.item()
                elif isinstance(obj, dict):
                    return {k: convert_numpy_types(v) for k, v in obj.items()}
                elif isinstance(obj, list):
                    return [convert_numpy_types(v) for v in obj]
                elif isinstance(obj, (np.bool_, np.integer, np.floating)):
                    return obj.item()
                elif isinstance(obj, (np.ndarray,)):
                    return obj.tolist()
                return obj
            
            # Convert drift analysis to JSON-serializable format
            drift_analysis = convert_numpy_types(drift_analysis)
            
            # Add baseline comparison
            baseline = drift_detector.user_baselines.get("demo_user", {})
            baseline_comparison = {
                'sleep_hours': {
                    'current': float(current_data_dict['sleep_hours']),
                    'baseline_mean': float(baseline.get('sleep_hours', {}).get('mean', 0)),
                    'baseline_std': float(baseline.get('sleep_hours', {}).get('std', 0))
                },
                'screen_time': {
                    'current': float(current_data_dict['screen_time']),
                    'baseline_mean': float(baseline.get('screen_time', {}).get('mean', 0)),
                    'baseline_std': float(baseline.get('screen_time', {}).get('std', 0))
                },
                'exercise_duration': {
                    'current': float(current_data_dict['exercise_duration']),
                    'baseline_mean': float(baseline.get('exercise_duration', {}).get('mean', 0)),
                    'baseline_std': float(baseline.get('exercise_duration', {}).get('std', 0))
                }
            }
            drift_analysis['baseline_comparison'] = baseline_comparison
            
        except Exception as e:
            logger.warning(f"Drift detection failed: {e}")
            drift_analysis = {"drift_detected": False, "confidence": 0.0, "drift_type": "error", "error": str(e)}
        
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

@app.post("/analyze/day", response_model=DailyAnalysisResponse)
async def analyze_day(data: DailyAnalysisRequest):
    """
    Analyze a single day's routine data and compute daily score, detect anomalies, and generate recommendations.
    
    This endpoint provides comprehensive daily analysis including:
    - Daily routine score (0-100)
    - Anomaly detection (sleep, activity, screen time, etc.)
    - Actionable recommendations with time horizons
    """
    try:
        logger.info(f"Received daily analysis request for user {data.user_id} on {data.date}")
        
        # Validate time formats
        try:
            datetime.strptime(data.bedtime, "%H:%M")
            datetime.strptime(data.wake_time, "%H:%M")
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid time format. Use HH:MM format for bedtime and wake_time"
            )
        
        # Validate date format
        try:
            datetime.strptime(data.date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid date format. Use YYYY-MM-DD format"
            )
        
        # Perform daily analysis using the DailyAnalyzer
        result = daily_analyzer.analyze_day(
            user_id=data.user_id,
            date=data.date,
            sleep_hours=data.sleep_hours,
            bedtime=data.bedtime,
            wake_time=data.wake_time,
            steps=data.steps,
            workout_minutes=data.workout_minutes,
            screen_time_minutes=data.screen_time_minutes,
            meals={
                "breakfast": data.meals.breakfast,
                "lunch": data.meals.lunch,
                "dinner": data.meals.dinner
            },
            mood=data.mood,
            stress_level=data.stress_level,
            goal_context={
                "sleep_target_hours": data.goal_context.sleep_target_hours,
                "daily_step_target": data.goal_context.daily_step_target,
                "max_screen_time_minutes": data.goal_context.max_screen_time_minutes
            },
            history_window_days=data.history_window_days
        )
        
        # Convert to response format
        response = DailyAnalysisResponse(
            user_id=result["user_id"],
            date=result["date"],
            daily_score=result["daily_score"],
            anomalies=[
                AnomalyResponse(
                    code=anomaly["code"],
                    description=anomaly["description"],
                    severity=anomaly["severity"]
                )
                for anomaly in result["anomalies"]
            ],
            recommendations=[
                RecommendationResponse(
                    title=rec["title"],
                    reason=rec["reason"],
                    suggested_action=rec["suggested_action"],
                    time_horizon=rec.get("time_horizon")
                )
                for rec in result["recommendations"]
            ]
        )
        
        logger.info(f"Daily analysis completed for user {data.user_id}: score={result['daily_score']}, anomalies={len(result['anomalies'])}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Daily analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# Pydantic models for weekly analysis endpoint
class WeeklyTrendResponse(BaseModel):
    metric: str
    direction: str  # "improving" | "declining" | "stable"
    comment: str

class WeeklyMicroGoalResponse(BaseModel):
    title: str
    reason: str
    suggested_action: str
    time_horizon: Optional[str] = None

class WeeklySummaryResponse(BaseModel):
    user_id: str
    week_start: str
    week_end: str
    summary: Dict[str, Any]
    trends: List[WeeklyTrendResponse]
    insights: List[str]
    micro_goals: List[WeeklyMicroGoalResponse]

@app.get("/analyze/week-summary", response_model=WeeklySummaryResponse)
async def analyze_week_summary(user_id: str, end_date: str):
    """
    Analyze the last 7 days of routine data and generate weekly summary, trends, insights, and micro-goals.
    
    This endpoint:
    - Takes the last 7 days up to end_date
    - Computes averages and trends
    - Generates 3 key insights
    - Proposes 1-3 micro-goals for the upcoming week
    """
    try:
        logger.info(f"Received weekly analysis request for user {user_id}, end_date: {end_date}")
        
        # Validate date format
        try:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
        except ValueError:
            logger.error(f"Invalid date format: {end_date}")
            raise HTTPException(
                status_code=400,
                detail="Invalid date format. Use YYYY-MM-DD format"
            )
        
        # For now, we'll use mock data or expect data to be passed
        # In production, this would fetch from database via backend
        # For now, generate mock weekly data for demonstration
        logger.info(f"Generating mock weekly data for end_date: {end_date}")
        daily_records = _generate_mock_weekly_data(end_date)
        logger.info(f"Generated {len(daily_records)} daily records")
        
        # Perform weekly analysis
        logger.info("Starting weekly analysis...")
        result = weekly_analyzer.analyze_week(daily_records)
        logger.info(f"Analysis result keys: {result.keys()}")
        
        # Convert to response format
        logger.info("Building response...")
        response = WeeklySummaryResponse(
            user_id=user_id,
            week_start=result.get("week_start", ""),
            week_end=result.get("week_end", ""),
            summary=result.get("summary", {}),
            trends=[
                WeeklyTrendResponse(
                    metric=trend.get("metric", ""),
                    direction=trend.get("direction", "stable"),
                    comment=trend.get("comment", "")
                )
                for trend in result.get("trends", [])
            ],
            insights=result.get("insights", []),
            micro_goals=[
                WeeklyMicroGoalResponse(
                    title=goal.get("title", ""),
                    reason=goal.get("reason", ""),
                    suggested_action=goal.get("suggested_action", ""),
                    time_horizon=goal.get("time_horizon")
                )
                for goal in result.get("micro_goals", [])
            ]
        )
        
        logger.info(f"Weekly analysis completed for user {user_id}: {len(result.get('trends', []))} trends, {len(result.get('insights', []))} insights, {len(result.get('micro_goals', []))} goals")
        return response
        
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Weekly analysis validation error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Weekly analysis error: {str(e)}", exc_info=True)
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

def _generate_mock_weekly_data(end_date: str) -> List[Dict[str, Any]]:
    """
    Generate mock weekly data for testing/demonstration.
    In production, this data would come from the backend database.
    """
    try:
        end_dt = datetime.strptime(end_date, "%Y-%m-%d")
        records = []
        
        # Generate 7 days of data with some variation
        for i in range(6, -1, -1):  # Last 7 days
            date = end_dt - timedelta(days=i)
            date_str = date.strftime("%Y-%m-%d")
            
            # Create realistic variation
            # Days 0-3: Better patterns
            # Days 4-6: Slightly declining (simulating work week stress)
            if i >= 4:
                sleep = 7.5 + (i - 4) * 0.2  # Slightly less sleep
                steps = 8500 - (i - 4) * 200  # Fewer steps
                workout = 30 - (i - 4) * 5
                screen_time = 180 + (i - 4) * 20
                mood = 4.0 - (i - 4) * 0.1
                stress = 3.0 + (i - 4) * 0.3
            else:
                sleep = 8.0 - i * 0.1
                steps = 9000 - i * 100
                workout = 35 - i * 2
                screen_time = 150 + i * 10
                mood = 4.2 - i * 0.05
                stress = 2.5 + i * 0.1
            
            records.append({
                "date": date_str,
                "sleep_hours": round(sleep, 1),
                "steps": int(steps),
                "workout_minutes": int(workout),
                "screen_time_minutes": int(screen_time),
                "mood": int(round(mood)),
                "stress_level": int(round(stress))
            })
        
        return records
    except Exception as e:
        logger.error(f"Error generating mock weekly data: {str(e)}")
        # Return minimal data
        return [
            {
                "date": end_date,
                "sleep_hours": 7.5,
                "steps": 8000,
                "workout_minutes": 30,
                "screen_time_minutes": 200,
                "mood": 4,
                "stress_level": 3
            }
        ]

# Pydantic models for heartbeat endpoint
class HeartbeatResponse(BaseModel):
    status: str  # "ok" | "degraded"
    timestamp: str
    greeting: str

# ============================================================================
# Drift Detection Endpoints
# ============================================================================

class DriftAnalysisRequest(BaseModel):
    user_id: str = Field(..., description="User identifier")
    historical_data: list = Field(..., description="List of historical routine data points")
    window_days: int = Field(default=30, ge=3, le=90, description="Window for baseline calculation")

class DriftFeature(BaseModel):
    name: str
    current_value: float
    baseline_mean: float
    zscore: float
    deviation: str  # "normal", "moderate", "significant"
    percent_change: float

class DriftAnalysisResponse(BaseModel):
    user_id: str
    drift_detected: bool
    drift_score: float  # 0.0 to 1.0
    severity: str  # "none", "low", "moderate", "high"
    drift_type: str
    top_features: list[DriftFeature]
    recommendation: str
    statistical_analysis: dict = None
    anomaly_analysis: dict = None
    baseline_data_points: int
    analysis_timestamp: str

@app.post("/drift/analyze", response_model=DriftAnalysisResponse)
async def analyze_drift(data: DriftAnalysisRequest):
    """
    Analyze behavioral drift for a user based on their historical data.
    
    This endpoint:
    - Calculates user baseline from historical data
    - Detects drift using Z-score, T-test, and Isolation Forest
    - Returns severity, top drifting features, and recommendations
    """
    try:
        logger.info(f"Received drift analysis request for user {data.user_id} with {len(data.historical_data)} data points")
        
        if len(data.historical_data) < 3:
            return DriftAnalysisResponse(
                user_id=data.user_id,
                drift_detected=False,
                drift_score=0.0,
                severity="none",
                drift_type="insufficient_data",
                top_features=[],
                recommendation="Need at least 3 days of data to analyze behavioral patterns. Keep logging your daily routines!",
                statistical_analysis={},
                anomaly_analysis={},
                baseline_data_points=len(data.historical_data),
                analysis_timestamp=datetime.now().isoformat()
            )
        
        # Prepare historical data with derived features
        processed_data = []
        for record in data.historical_data:
            processed_record = {
                'sleep_hours': record.get('sleep_hours', 0),
                'screen_time': record.get('screen_time', 0),
                'exercise_duration': record.get('exercise_duration', 0),
                'water_intake': record.get('water_intake', 0),
                'stress_level': record.get('stress_level', 5),
                'health_score': record.get('health_score', 0.5),
                'wake_up_hour': record.get('wake_up_hour', 7),
                'bed_time_hour': record.get('bed_time_hour', 23),
                'meal_count': record.get('meal_count', 3)
            }
            
            # Calculate health score if not provided
            if processed_record['health_score'] == 0.5:
                processed_record['health_score'] = _calculate_health_score_from_dict(processed_record)
            
            processed_data.append(processed_record)
        
        # Calculate baseline from first portion of data
        baseline_window = min(data.window_days, len(processed_data) - 3)
        baseline_data = processed_data[:baseline_window] if baseline_window > 0 else processed_data
        recent_data = processed_data[-10:] if len(processed_data) >= 10 else processed_data[-3:]
        
        # Calculate baseline for user
        drift_detector.calculate_baseline(data.user_id, baseline_data)
        
        # Perform statistical drift detection
        statistical_analysis = drift_detector.detect_drift_statistical(data.user_id, recent_data)
        
        # Perform anomaly detection
        anomaly_analysis = drift_detector.detect_anomalies_isolation_forest(data.user_id, recent_data)
        
        # Combine results
        drift_detected = statistical_analysis.get('drift_detected', False) or anomaly_analysis.get('anomaly_detected', False)
        drift_score = max(statistical_analysis.get('confidence', 0), anomaly_analysis.get('confidence', 0))
        
        # Determine severity
        if drift_score >= 0.7:
            severity = "high"
        elif drift_score >= 0.4:
            severity = "moderate"
        elif drift_score >= 0.1:
            severity = "low"
        else:
            severity = "none"
        
        # Determine drift type
        if statistical_analysis.get('drift_detected') and anomaly_analysis.get('anomaly_detected'):
            drift_type = "combined_behavioral_drift"
        elif statistical_analysis.get('drift_detected'):
            drift_type = statistical_analysis.get('drift_type', 'statistical_drift')
        elif anomaly_analysis.get('anomaly_detected'):
            drift_type = "anomaly_drift"
        else:
            drift_type = "no_drift"
        
        # Extract top drifting features
        top_features = []
        drift_scores = statistical_analysis.get('drift_scores', {})
        
        # Sort features by drift score
        sorted_features = sorted(
            drift_scores.items(),
            key=lambda x: x[1].get('drift_score', 0),
            reverse=True
        )[:5]  # Top 5 features
        
        for feature_name, feature_data in sorted_features:
            if feature_data.get('drift_score', 0) > 0.1:  # Only include notable drift
                top_features.append(DriftFeature(
                    name=feature_name,
                    current_value=round(feature_data.get('recent_mean', 0), 2),
                    baseline_mean=round(feature_data.get('baseline_mean', 0), 2),
                    zscore=round(feature_data.get('z_score', 0), 2),
                    deviation="significant" if abs(feature_data.get('z_score', 0)) > 2 else 
                              "moderate" if abs(feature_data.get('z_score', 0)) > 1 else "normal",
                    percent_change=round(
                        ((feature_data.get('recent_mean', 0) - feature_data.get('baseline_mean', 1)) / 
                         max(feature_data.get('baseline_mean', 1), 0.01)) * 100, 1
                    )
                ))
        
        # Generate recommendation
        recommendation = _generate_drift_recommendation(drift_detected, severity, top_features, drift_type)
        
        # Convert numpy types for JSON serialization
        def convert_numpy_types(obj):
            if hasattr(obj, 'item'):
                return obj.item()
            elif isinstance(obj, dict):
                return {k: convert_numpy_types(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [convert_numpy_types(v) for v in obj]
            elif isinstance(obj, (np.bool_, np.integer, np.floating)):
                return obj.item()
            elif isinstance(obj, (np.ndarray,)):
                return obj.tolist()
            return obj
        
        response = DriftAnalysisResponse(
            user_id=data.user_id,
            drift_detected=drift_detected,
            drift_score=round(drift_score, 3),
            severity=severity,
            drift_type=drift_type,
            top_features=top_features,
            recommendation=recommendation,
            statistical_analysis=convert_numpy_types(statistical_analysis),
            anomaly_analysis=convert_numpy_types(anomaly_analysis),
            baseline_data_points=len(baseline_data),
            analysis_timestamp=datetime.now().isoformat()
        )
        
        logger.info(f"Drift analysis completed for user {data.user_id}: detected={drift_detected}, severity={severity}")
        return response
        
    except Exception as e:
        logger.error(f"Drift analysis error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Drift analysis failed: {str(e)}")

def _calculate_health_score_from_dict(data: dict) -> float:
    """Calculate health score from dictionary data"""
    score = 0.0
    
    sleep = data.get('sleep_hours', 0)
    if 7 <= sleep <= 9:
        score += 0.25
    elif 6 <= sleep <= 10:
        score += 0.15
    else:
        score += 0.05
    
    exercise = data.get('exercise_duration', 0)
    if exercise >= 1.0:
        score += 0.20
    elif exercise >= 0.5:
        score += 0.15
    else:
        score += 0.05
    
    screen = data.get('screen_time', 0)
    if screen <= 4:
        score += 0.15
    elif screen <= 6:
        score += 0.10
    else:
        score += 0.05
    
    water = data.get('water_intake', 0)
    if water >= 2.5:
        score += 0.15
    elif water >= 2.0:
        score += 0.12
    else:
        score += 0.05
    
    stress = data.get('stress_level', 5)
    if stress <= 3:
        score += 0.15
    elif stress <= 5:
        score += 0.12
    else:
        score += 0.05
    
    meals = data.get('meal_count', 0)
    if meals >= 3:
        score += 0.10
    elif meals >= 2:
        score += 0.07
    else:
        score += 0.03
    
    return min(score, 1.0)

def _generate_drift_recommendation(drift_detected: bool, severity: str, 
                                   top_features: list, drift_type: str) -> str:
    """Generate personalized recommendation based on drift analysis"""
    if not drift_detected or severity == "none":
        return "Your behavioral patterns are stable and consistent. Keep up the great work maintaining healthy habits!"
    
    if not top_features:
        return "Some minor variations detected in your routine. Continue monitoring your habits."
    
    # Build recommendation based on top drifting features
    recommendations = []
    
    for feature in top_features[:3]:  # Focus on top 3
        name = feature.name
        zscore = feature.zscore
        percent_change = feature.percent_change
        
        if name == "sleep_hours":
            if zscore < 0:
                recommendations.append(f"Your sleep has decreased by {abs(percent_change):.0f}%. Try to maintain 7-9 hours for optimal recovery.")
            else:
                recommendations.append(f"You're sleeping {percent_change:.0f}% more than usual. While rest is good, oversleeping may indicate fatigue.")
        
        elif name == "exercise_duration":
            if zscore < 0:
                recommendations.append(f"Exercise has dropped by {abs(percent_change):.0f}%. Even 15-minute walks can help maintain momentum.")
            else:
                recommendations.append(f"Great job increasing exercise by {percent_change:.0f}%! Make sure to include rest days.")
        
        elif name == "screen_time":
            if zscore > 0:
                recommendations.append(f"Screen time increased by {percent_change:.0f}%. Consider digital detox breaks.")
            else:
                recommendations.append(f"Good work reducing screen time by {abs(percent_change):.0f}%!")
        
        elif name == "stress_level":
            if zscore > 0:
                recommendations.append(f"Stress levels are up {percent_change:.0f}%. Try breathing exercises or meditation.")
            else:
                recommendations.append(f"Stress is down {abs(percent_change):.0f}% — keep up whatever you're doing!")
        
        elif name == "water_intake":
            if zscore < 0:
                recommendations.append(f"Hydration dropped by {abs(percent_change):.0f}%. Aim for at least 2L daily.")
    
    if recommendations:
        severity_prefix = {
            "high": "⚠️ Significant changes detected: ",
            "moderate": "📊 Notable patterns emerging: ",
            "low": "ℹ️ Minor variations noticed: "
        }
        return severity_prefix.get(severity, "") + " ".join(recommendations)
    
    return "Your patterns show some variation. Consider reviewing your recent habits."

@app.get("/status/heartbeat", response_model=HeartbeatResponse)
async def heartbeat(user_id: Optional[str] = None):
    """
    Heartbeat endpoint that returns service status and a positive greeting.
    
    This endpoint:
    - Checks service health
    - Returns a random positive greeting
    - Can be personalized by user_id in the future
    """
    try:
        # List of positive greetings
        greetings = [
            "You're building great habits, one day at a time.",
            "Small steps today create big changes tomorrow.",
            "You showed up — that's already a win.",
            "Progress, not perfection. You've got this.",
            "Every day is a fresh start. Keep going!",
            "Your consistency is paying off. Well done!",
            "You're making progress, even when it doesn't feel like it.",
            "One day at a time, one habit at a time. You've got this!",
            "Your future self will thank you for today's choices.",
            "Every small action adds up to big results."
        ]
        
        import random
        selected_greeting = random.choice(greetings)
        
        # For now, assume service is healthy
        # In production, add actual health checks here
        status = "ok"
        
        response = HeartbeatResponse(
            status=status,
            timestamp=datetime.now().isoformat(),
            greeting=selected_greeting
        )
        
        logger.info(f"Heartbeat check: status={status}, greeting='{selected_greeting[:30]}...'")
        return response
        
    except Exception as e:
        logger.error(f"Heartbeat error: {str(e)}")
        # Even on error, return a fallback response
        return HeartbeatResponse(
            status="degraded",
            timestamp=datetime.now().isoformat(),
            greeting="Welcome back! We're here to support your journey."
        )

if __name__ == "__main__":
    uvicorn.run(
        app, 
        host=config.HOST, 
        port=config.PORT,
        log_level=config.LOG_LEVEL.lower()
    ) 