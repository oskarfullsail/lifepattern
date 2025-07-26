import logging
import numpy as np
import pandas as pd
from datetime import datetime
from typing import Tuple, List, Any
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, classification_report
import joblib
import os

logger = logging.getLogger(__name__)

class AnomalyDetector:
    """
    Anomaly detection model for daily routine data using RandomForestClassifier
    """
    
    def __init__(self, model_path: str = "models/anomaly_model.joblib"):
        self.model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            random_state=42,
            n_jobs=-1
        )
        self.scaler = StandardScaler()
        self.is_trained = False
        self.model_path = model_path
        self.accuracy = 0.0
        self.feature_names = [
            'sleep_hours', 'screen_time', 'exercise_duration', 'water_intake',
            'stress_level', 'meal_count', 'wake_up_hour', 'bed_time_hour',
            'sleep_consistency', 'activity_balance', 'health_score'
        ]
        
    def preprocess_data(self, data) -> np.ndarray:
        """
        Preprocess input data into features for the model
        """
        try:
            # Extract basic features
            sleep_hours = data.sleep_hours
            screen_time = data.screen_time
            exercise_duration = data.exercise_duration
            water_intake = data.water_intake
            stress_level = data.stress_level
            
            # Process meal times
            meal_count = len(data.meal_times)
            
            # Process wake up and bed times
            wake_up_hour = int(data.wake_up_time.split(':')[0])
            bed_time_hour = int(data.bed_time.split(':')[0])
            
            # Calculate sleep consistency (how close to 8 hours)
            sleep_consistency = 1.0 - abs(sleep_hours - 8.0) / 8.0
            
            # Calculate activity balance (exercise vs screen time ratio)
            total_active_time = exercise_duration + screen_time
            if total_active_time > 0:
                activity_balance = exercise_duration / total_active_time
            else:
                activity_balance = 0.0
            
            # Calculate overall health score
            health_score = (
                (sleep_hours / 8.0) * 0.3 +  # Sleep weight
                (1.0 - screen_time / 12.0) * 0.2 +  # Screen time weight
                (exercise_duration / 1.0) * 0.2 +  # Exercise weight
                (water_intake / 2.5) * 0.1 +  # Water intake weight
                (1.0 - stress_level / 10.0) * 0.1 +  # Stress weight
                (meal_count / 3.0) * 0.1  # Meal count weight
            )
            
            # Create feature array
            features = np.array([
                sleep_hours, screen_time, exercise_duration, water_intake,
                stress_level, meal_count, wake_up_hour, bed_time_hour,
                sleep_consistency, activity_balance, health_score
            ]).reshape(1, -1)
            
            # Scale features if model is trained
            if self.is_trained:
                features = self.scaler.transform(features)
            
            return features
            
        except Exception as e:
            logger.error(f"Error preprocessing data: {str(e)}")
            raise
    
    def train(self, X_train: np.ndarray, y_train: np.ndarray) -> None:
        """
        Train the anomaly detection model
        """
        try:
            logger.info("Training anomaly detection model...")
            
            # Scale the training data
            X_train_scaled = self.scaler.fit_transform(X_train)
            
            # Train the model
            self.model.fit(X_train_scaled, y_train)
            
            self.is_trained = True
            logger.info("Model training completed successfully")
            
        except Exception as e:
            logger.error(f"Error training model: {str(e)}")
            raise
    
    def predict(self, features: np.ndarray) -> Tuple[bool, float, str]:
        """
        Make prediction on input features
        Returns: (is_anomaly, confidence_score, anomaly_type)
        """
        try:
            if not self.is_trained:
                raise ValueError("Model is not trained yet")
            
            # Make prediction
            prediction = self.model.predict(features)[0]
            probabilities = self.model.predict_proba(features)[0]
            
            # Get confidence score
            confidence_score = max(probabilities)
            
            # Determine if anomaly
            is_anomaly = bool(prediction == 1)
            
            # Determine anomaly type based on feature values
            anomaly_type = self._determine_anomaly_type(features[0])
            
            return is_anomaly, confidence_score, anomaly_type
            
        except Exception as e:
            logger.error(f"Error making prediction: {str(e)}")
            raise
    
    def evaluate(self, X_test: np.ndarray, y_test: np.ndarray) -> float:
        """
        Evaluate the model performance
        """
        try:
            if not self.is_trained:
                raise ValueError("Model is not trained yet")
            
            X_test_scaled = self.scaler.transform(X_test)
            y_pred = self.model.predict(X_test_scaled)
            
            accuracy = accuracy_score(y_test, y_pred)
            self.accuracy = accuracy
            
            logger.info(f"Model accuracy: {accuracy:.3f}")
            logger.info(f"Classification report:\n{classification_report(y_test, y_pred)}")
            
            return accuracy
            
        except Exception as e:
            logger.error(f"Error evaluating model: {str(e)}")
            raise
    
    def _determine_anomaly_type(self, features: np.ndarray) -> str:
        """
        Determine the type of anomaly based on feature values
        """
        # Unscale features for interpretation
        if self.is_trained:
            features_unscaled = self.scaler.inverse_transform(features.reshape(1, -1))[0]
        else:
            features_unscaled = features
        
        sleep_hours = features_unscaled[0]
        screen_time = features_unscaled[1]
        exercise_duration = features_unscaled[2]
        water_intake = features_unscaled[3]
        stress_level = features_unscaled[4]
        meal_count = features_unscaled[5]
        health_score = features_unscaled[10]
        
        if health_score < 0.5:
            return "general_unhealthy_routine"
        elif sleep_hours < 6:
            return "insufficient_sleep"
        elif sleep_hours > 10:
            return "excessive_sleep"
        elif screen_time > 10:
            return "excessive_screen_time"
        elif exercise_duration < 0.3:
            return "insufficient_exercise"
        elif water_intake < 1.5:
            return "low_water_intake"
        elif stress_level > 8:
            return "high_stress_level"
        elif meal_count < 2:
            return "irregular_meals"
        else:
            return "multiple_anomalies"
    
    def get_accuracy(self) -> float:
        """Get the model's accuracy score"""
        return self.accuracy
    
    def save_model(self) -> None:
        """Save the trained model to disk"""
        try:
            os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
            model_data = {
                'model': self.model,
                'scaler': self.scaler,
                'accuracy': self.accuracy,
                'feature_names': self.feature_names
            }
            joblib.dump(model_data, self.model_path)
            logger.info(f"Model saved to {self.model_path}")
        except Exception as e:
            logger.error(f"Error saving model: {str(e)}")
            raise
    
    def load_model(self) -> None:
        """Load a trained model from disk"""
        try:
            if os.path.exists(self.model_path):
                model_data = joblib.load(self.model_path)
                self.model = model_data['model']
                self.scaler = model_data['scaler']
                self.accuracy = model_data['accuracy']
                self.feature_names = model_data['feature_names']
                self.is_trained = True
                logger.info(f"Model loaded from {self.model_path}")
            else:
                logger.warning(f"Model file not found at {self.model_path}")
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            raise 