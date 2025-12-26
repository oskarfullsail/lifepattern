#!/usr/bin/env python3
"""
Trained Model Service

Integrates the Kaggle-trained models into the LifePattern AI service.
This module provides a unified interface for:
1. Loading pre-trained models
2. Making predictions using data-driven thresholds
3. Generating recommendations based on trained models

Usage:
    from src.models.trained_model_service import TrainedModelService
    
    service = TrainedModelService()
    result = service.predict(routine_data)
"""

import os
import json
import logging
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import intervention engine for data-driven recommendations
try:
    from src.recommendations.intervention_engine import get_intervention_engine
    INTERVENTION_ENGINE_AVAILABLE = True
except ImportError:
    INTERVENTION_ENGINE_AVAILABLE = False
    logger.warning("Intervention engine not available")


class TrainedModelService:
    """
    Service for making predictions using Kaggle-trained models.
    
    This replaces hardcoded thresholds with data-driven predictions.
    """
    
    def __init__(
        self,
        models_dir: str = None,
        thresholds_path: str = None
    ):
        """
        Initialize the trained model service.
        
        Args:
            models_dir: Directory containing trained models
            thresholds_path: Path to data-driven thresholds JSON
        """
        # Find the correct paths relative to the ai-service directory
        base_path = Path(__file__).parent.parent.parent
        
        if models_dir is None:
            models_dir = base_path / 'data' / 'models'
        else:
            models_dir = Path(models_dir)
            
        if thresholds_path is None:
            thresholds_path = base_path / 'data' / 'processed' / 'data_driven_thresholds.json'
        else:
            thresholds_path = Path(thresholds_path)
        
        self.models_dir = models_dir
        self.thresholds_path = thresholds_path
        
        # Models
        self.classifier = None
        self.wellness_predictor = None
        self.anomaly_detector = None
        self.anomaly_scaler = None
        
        # Thresholds
        self.thresholds = {}
        
        # Feature names
        self.classifier_features = []
        self.wellness_features = []
        self.anomaly_features = []
        
        # Recommendation database
        self.recommendations_db = {}
        
        # Intervention engine for data-driven recommendations
        self.intervention_engine = None
        
        # Load everything
        self._load_models()
        self._load_thresholds()
        self._load_recommendations()
        self._load_intervention_engine()
        
        logger.info(f"TrainedModelService initialized: models_loaded={self.is_ready()}")
    
    def _load_models(self):
        """Load all trained models."""
        
        # Load classifier
        classifier_path = self.models_dir / 'negative_state_classifier.pkl'
        if classifier_path.exists():
            self.classifier = joblib.load(classifier_path)
            logger.info("✓ Loaded negative state classifier")
        else:
            logger.warning(f"✗ Classifier not found at {classifier_path}")
        
        # Load wellness predictor
        wellness_path = self.models_dir / 'wellness_predictor.pkl'
        if wellness_path.exists():
            wellness_data = joblib.load(wellness_path)
            self.wellness_predictor = wellness_data.get('model')
            self.wellness_features = wellness_data.get('feature_cols', [])
            logger.info("✓ Loaded wellness predictor")
        else:
            logger.warning(f"✗ Wellness predictor not found at {wellness_path}")
        
        # Load anomaly detector
        anomaly_path = self.models_dir / 'anomaly_detector.pkl'
        if anomaly_path.exists():
            anomaly_data = joblib.load(anomaly_path)
            self.anomaly_detector = anomaly_data.get('model')
            self.anomaly_scaler = anomaly_data.get('scaler')
            self.anomaly_features = anomaly_data.get('feature_cols', [])
            logger.info("✓ Loaded anomaly detector")
        else:
            logger.warning(f"✗ Anomaly detector not found at {anomaly_path}")
    
    def _load_thresholds(self):
        """Load data-driven thresholds."""
        if self.thresholds_path.exists():
            with open(self.thresholds_path) as f:
                self.thresholds = json.load(f)
            logger.info("✓ Loaded data-driven thresholds")
        else:
            logger.warning(f"✗ Thresholds not found at {self.thresholds_path}")
            self._use_fallback_thresholds()
    
    def _use_fallback_thresholds(self):
        """Use fallback thresholds if data-driven ones are not available."""
        self.thresholds = {
            'general': {
                'sleep_hours': {
                    'population_mean': 7.0, 'population_std': 1.5,
                    'warning_low': 6.0, 'warning_high': 9.0,
                    'critical_low': 5.0, 'critical_high': 10.0
                },
                'stress_level': {
                    'population_mean': 5.0, 'population_std': 2.0,
                    'warning_low': 2.0, 'warning_high': 7.0,
                    'critical_low': 1.0, 'critical_high': 9.0
                },
                'exercise_minutes': {
                    'population_mean': 30, 'population_std': 20,
                    'warning_low': 15, 'warning_high': 60
                }
            }
        }
    
    def _load_intervention_engine(self):
        """Load the intervention engine for data-driven recommendations."""
        if INTERVENTION_ENGINE_AVAILABLE:
            try:
                self.intervention_engine = get_intervention_engine()
                logger.info("✓ Loaded intervention engine")
            except Exception as e:
                logger.warning(f"Could not load intervention engine: {e}")
    
    def _load_recommendations(self):
        """Load recommendation database."""
        # Data-driven recommendations based on anomaly types
        self.recommendations_db = {
            'low_sleep': [
                {
                    'title': 'Improve Sleep Duration',
                    'description': 'Your sleep is below the data-derived threshold. Aim for 7-8 hours.',
                    'actions': [
                        'Set a consistent bedtime alarm',
                        'Avoid screens 1 hour before bed',
                        'Keep bedroom cool and dark'
                    ],
                    'priority': 'high',
                    'category': 'sleep',
                    'expected_impact': 'Increased energy and focus'
                },
                {
                    'title': 'Sleep Hygiene Tips',
                    'description': 'Improve your sleep quality with evidence-based techniques.',
                    'actions': [
                        'Avoid caffeine after 2pm',
                        'Exercise, but not close to bedtime',
                        'Consider relaxation techniques'
                    ],
                    'priority': 'medium',
                    'category': 'sleep',
                    'expected_impact': 'Better sleep quality'
                }
            ],
            'high_stress': [
                {
                    'title': 'Stress Management Required',
                    'description': 'Your stress level exceeds population norms. Take action to reduce it.',
                    'actions': [
                        'Try 5-minute breathing exercises',
                        'Take a short walk outside',
                        'Practice mindfulness meditation'
                    ],
                    'priority': 'high',
                    'category': 'stress',
                    'expected_impact': 'Reduced anxiety, improved focus'
                },
                {
                    'title': 'Work-Life Balance',
                    'description': 'High stress often comes from imbalanced work-life dynamics.',
                    'actions': [
                        'Set boundaries for work hours',
                        'Schedule regular breaks',
                        'Connect with friends or family'
                    ],
                    'priority': 'medium',
                    'category': 'stress',
                    'expected_impact': 'Improved mental wellbeing'
                }
            ],
            'low_exercise': [
                {
                    'title': 'Increase Physical Activity',
                    'description': 'Your exercise level is below optimal. Even small increases help.',
                    'actions': [
                        'Start with 10-minute walks',
                        'Take stairs instead of elevator',
                        'Set movement reminders every hour'
                    ],
                    'priority': 'medium',
                    'category': 'exercise',
                    'expected_impact': 'Better mood and energy'
                }
            ],
            'low_hydration': [
                {
                    'title': 'Improve Hydration',
                    'description': 'Water intake is below recommended levels.',
                    'actions': [
                        'Keep a water bottle with you',
                        'Set hourly hydration reminders',
                        'Drink water before meals'
                    ],
                    'priority': 'low',
                    'category': 'hydration',
                    'expected_impact': 'Better cognitive function'
                }
            ],
            'combined_risk': [
                {
                    'title': 'Holistic Wellness Check',
                    'description': 'Multiple areas need attention. Prioritize sleep and stress.',
                    'actions': [
                        'Start with improving sleep',
                        'Then address stress levels',
                        'Gradually add exercise'
                    ],
                    'priority': 'critical',
                    'category': 'wellness',
                    'expected_impact': 'Overall health improvement'
                }
            ]
        }
    
    def is_ready(self) -> bool:
        """Check if the service has loaded models."""
        return self.classifier is not None
    
    def get_threshold(self, metric: str, stat: str = 'population_mean') -> float:
        """Get a data-driven threshold value."""
        if 'general' in self.thresholds and metric in self.thresholds['general']:
            return self.thresholds['general'][metric].get(stat, 0)
        return 0
    
    def predict(self, routine_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Make prediction using trained models.
        
        Args:
            routine_data: Dictionary with routine data (sleep_hours, stress_level, etc.)
            
        Returns:
            Comprehensive prediction result with:
            - is_anomaly: Boolean
            - confidence_score: Float 0-1
            - anomaly_type: String description
            - wellness_scores: Dict of wellness metrics
            - risk_level: LOW/MEDIUM/HIGH/CRITICAL
            - recommendations: List of data-driven recommendations
        """
        # Prepare features
        features_df = self._prepare_features(routine_data)
        
        result = {
            'is_anomaly': False,
            'confidence_score': 0.5,
            'anomaly_type': 'normal',
            'wellness_scores': {},
            'risk_level': 'LOW',
            'recommendations': [],
            'feature_analysis': {},
            'data_driven': True,
            'model_version': 'kaggle_trained_v1',
            'timestamp': datetime.now().isoformat()
        }
        
        # Classifier prediction
        if self.classifier is not None:
            try:
                # Get expected feature names from trained model
                expected_features = list(self.classifier.feature_names_in_)
                
                # Ensure features are in correct order
                X = features_df[expected_features].values
                
                # Make prediction
                prediction = self.classifier.predict(X)[0]
                probabilities = self.classifier.predict_proba(X)[0]
                
                result['is_anomaly'] = bool(prediction == 1)
                result['confidence_score'] = float(max(probabilities))
                result['anomaly_type'] = self._determine_anomaly_type(routine_data)
                
            except Exception as e:
                logger.warning(f"Classifier prediction failed: {e}")
                # Fall back to threshold-based detection
                result['anomaly_type'] = self._determine_anomaly_type(routine_data)
                result['is_anomaly'] = result['anomaly_type'] != 'normal'
                result['confidence_score'] = 0.7 if result['is_anomaly'] else 0.3
        
        # Wellness prediction
        if self.wellness_predictor is not None:
            try:
                wellness_features = features_df[self.wellness_features].fillna(0)
                predictions = self.wellness_predictor.predict(wellness_features)[0]
                
                targets = ['mental_clarity', 'energy_score', 'mood_score', 'focus_score']
                for i, target in enumerate(targets):
                    if i < len(predictions):
                        result['wellness_scores'][target] = float(predictions[i])
                        
            except Exception as e:
                logger.warning(f"Wellness prediction failed: {e}")
        
        # Anomaly score (Isolation Forest)
        if self.anomaly_detector is not None:
            try:
                anomaly_features = features_df[self.anomaly_features].fillna(0)
                
                if self.anomaly_scaler is not None:
                    anomaly_scaled = self.anomaly_scaler.transform(anomaly_features)
                else:
                    anomaly_scaled = anomaly_features.values
                
                score = -self.anomaly_detector.decision_function(anomaly_scaled)[0]
                result['isolation_forest_score'] = float(min(max(score / 0.5, 0), 1))
                
            except Exception as e:
                logger.warning(f"Isolation Forest failed: {e}")
        
        # Determine risk level
        result['risk_level'] = self._calculate_risk_level(
            result['is_anomaly'],
            result['confidence_score'],
            routine_data
        )
        
        # Generate data-driven recommendations
        result['recommendations'] = self._generate_recommendations(
            routine_data,
            result['is_anomaly'],
            result['anomaly_type'],
            result['risk_level']
        )
        
        # Feature analysis
        result['feature_analysis'] = self._analyze_features(routine_data)
        
        return result
    
    def _prepare_features(self, routine_data: Dict[str, Any]) -> pd.DataFrame:
        """Prepare feature DataFrame for model prediction with all 20 expected features."""
        
        # Get threshold values from data-driven thresholds
        sleep_mean = self.get_threshold('sleep_hours', 'population_mean') or 7.0
        sleep_std = self.get_threshold('sleep_hours', 'population_std') or 1.5
        stress_mean = self.get_threshold('stress_level', 'population_mean') or 5.0
        stress_std = self.get_threshold('stress_level', 'population_std') or 2.0
        exercise_mean = self.get_threshold('exercise_minutes', 'population_mean') or 30.0
        exercise_std = self.get_threshold('exercise_minutes', 'population_std') or 20.0
        steps_mean = self.get_threshold('steps', 'population_mean') or 7000
        steps_std = self.get_threshold('steps', 'population_std') or 3000
        hr_mean = self.get_threshold('heart_rate', 'population_mean') or 72
        hr_std = self.get_threshold('heart_rate', 'population_std') or 10
        
        # Extract values
        sleep_hours = routine_data.get('sleep_hours', 7)
        stress_level = routine_data.get('stress_level', 5)
        exercise_minutes = routine_data.get('exercise_duration', 0) * 60  # Convert hours to minutes
        screen_time = routine_data.get('screen_time', 0)
        water_intake = routine_data.get('water_intake', 2)
        steps = routine_data.get('steps', 5000)
        heart_rate = routine_data.get('heart_rate', 72)
        
        # Calculate Z-scores using data-driven thresholds
        sleep_zscore = (sleep_hours - sleep_mean) / sleep_std if sleep_std > 0 else 0
        stress_zscore = (stress_level - stress_mean) / stress_std if stress_std > 0 else 0
        exercise_zscore = (exercise_minutes - exercise_mean) / exercise_std if exercise_std > 0 else 0
        steps_zscore = (steps - steps_mean) / steps_std if steps_std > 0 else 0
        hr_zscore = (heart_rate - hr_mean) / hr_std if hr_std > 0 else 0
        
        # Build features in EXACT order expected by trained classifier (20 features)
        features = {
            # 1-7: Original features
            'sleep_hours': sleep_hours,
            'stress_level': stress_level,
            'exercise_minutes': exercise_minutes,
            'screen_time': screen_time,
            'water_intake': water_intake,
            'heart_rate': heart_rate,
            'steps': steps,
            
            # 8-12: Z-scores using data-driven thresholds
            'sleep_hours_zscore': sleep_zscore,
            'stress_level_zscore': stress_zscore,
            'exercise_minutes_zscore': exercise_zscore,
            'steps_zscore': steps_zscore,
            'heart_rate_zscore': hr_zscore,
            
            # 13-16: Derived wellness features
            'sleep_quality_index': max(0, 1 - abs(sleep_hours - sleep_mean) / sleep_mean),
            'stress_sleep_ratio': stress_level / (sleep_hours + 0.1),
            'exercise_adequacy': min(exercise_minutes / 30, 2.0),
            'recovery_score': (10 - stress_level) / 10 * 0.5 + sleep_hours / 8 * 0.5,
            
            # 17-19: Encodings
            'gender_encoded': routine_data.get('gender_encoded', 0),
            'sleep_zscore_gendered': sleep_zscore,  # Same as sleep_zscore for unknown gender
            'activity_level': 1 if exercise_minutes > 15 else 0,
            
            # 20: Health score
            'health_score': self._calculate_health_score(routine_data),
        }
        
        return pd.DataFrame([features])
    
    def _calculate_health_score(self, routine_data: Dict[str, Any]) -> float:
        """Calculate composite health score (0-100)."""
        score = 50.0
        
        # Sleep component (30%)
        sleep = routine_data.get('sleep_hours', 7)
        sleep_mean = self.get_threshold('sleep_hours', 'population_mean') or 7.0
        sleep_score = max(0, 1 - abs(sleep - sleep_mean) / sleep_mean)
        score += (sleep_score - 0.5) * 30
        
        # Stress component (25%)
        stress = routine_data.get('stress_level', 5)
        stress_score = (10 - stress) / 10
        score += (stress_score - 0.5) * 25
        
        # Exercise component (25%)
        exercise = routine_data.get('exercise_duration', 0)
        exercise_score = min(exercise / 0.5, 1)  # 30 min = 0.5 hours = 100%
        score += (exercise_score - 0.5) * 25
        
        # Screen time component (20%)
        screen = routine_data.get('screen_time', 4)
        screen_score = max(0, 1 - screen / 8)
        score += (screen_score - 0.5) * 20
        
        return max(0, min(100, score))
    
    def _determine_anomaly_type(self, routine_data: Dict[str, Any]) -> str:
        """Determine the type of anomaly based on data-driven thresholds."""
        anomaly_types = []
        
        # Check sleep
        sleep = routine_data.get('sleep_hours', 7)
        sleep_low = self.get_threshold('sleep_hours', 'warning_low') or 6.0
        if sleep < sleep_low:
            anomaly_types.append('low_sleep')
        
        # Check stress
        stress = routine_data.get('stress_level', 5)
        stress_high = self.get_threshold('stress_level', 'warning_high') or 7.0
        if stress > stress_high:
            anomaly_types.append('high_stress')
        
        # Check exercise
        exercise = routine_data.get('exercise_duration', 0) * 60
        exercise_low = self.get_threshold('exercise_minutes', 'warning_low') or 15
        if exercise < exercise_low:
            anomaly_types.append('low_exercise')
        
        if len(anomaly_types) > 1:
            return 'combined_risk'
        elif anomaly_types:
            return anomaly_types[0]
        return 'normal'
    
    def _calculate_risk_level(
        self,
        is_anomaly: bool,
        confidence: float,
        routine_data: Dict[str, Any]
    ) -> str:
        """Calculate risk level based on predictions."""
        if not is_anomaly:
            return 'LOW'
        
        health_score = self._calculate_health_score(routine_data)
        
        if confidence > 0.9 and health_score < 30:
            return 'CRITICAL'
        elif confidence > 0.7 and health_score < 50:
            return 'HIGH'
        elif confidence > 0.5:
            return 'MEDIUM'
        return 'LOW'
    
    def _generate_recommendations(
        self,
        routine_data: Dict[str, Any],
        is_anomaly: bool,
        anomaly_type: str,
        risk_level: str
    ) -> List[Dict[str, Any]]:
        """Generate data-driven recommendations using intervention engine."""
        
        if not is_anomaly:
            return [{
                'id': 'healthy_001',
                'title': 'Keep Up the Good Work!',
                'description': 'Your routine is within healthy parameters based on data-driven thresholds.',
                'actions': ['Maintain your current habits', 'Continue monitoring your wellness'],
                'priority': 'low',
                'category': 'wellness',
                'expected_impact': 'Continued wellbeing',
                'data_driven': True,
                'effectiveness_score': 1.0
            }]
        
        # Use intervention engine if available (richer, evidence-based recommendations)
        if self.intervention_engine is not None:
            recommendations = self.intervention_engine.get_recommendations(
                anomaly_type=anomaly_type,
                risk_level=risk_level,
                routine_data=routine_data,
                max_recommendations=5
            )
            
            # Add threshold context to each recommendation
            for rec in recommendations:
                rec['thresholds_used'] = {
                    'sleep_warning': self.get_threshold('sleep_hours', 'warning_low'),
                    'stress_warning': self.get_threshold('stress_level', 'warning_high'),
                    'exercise_warning': self.get_threshold('exercise_minutes', 'warning_low')
                }
            
            if recommendations:
                return recommendations
        
        # Fallback to basic recommendations database
        recommendations = []
        
        # Get recommendations for the anomaly type
        if anomaly_type in self.recommendations_db:
            recommendations.extend(self.recommendations_db[anomaly_type])
        
        # Add critical recommendation if needed
        if risk_level == 'CRITICAL' and 'combined_risk' in self.recommendations_db:
            recommendations = self.recommendations_db['combined_risk'] + recommendations
        
        # Personalize with data-driven thresholds
        for rec in recommendations:
            rec['data_driven'] = True
            rec['thresholds_used'] = {
                'sleep_warning': self.get_threshold('sleep_hours', 'warning_low'),
                'stress_warning': self.get_threshold('stress_level', 'warning_high')
            }
        
        return recommendations[:5]  # Limit to top 5
    
    def _analyze_features(self, routine_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze features against data-driven thresholds."""
        analysis = {}
        
        for metric in ['sleep_hours', 'stress_level', 'exercise_duration']:
            if metric in routine_data:
                value = routine_data[metric]
                
                # Convert exercise to minutes for comparison
                if metric == 'exercise_duration':
                    value = value * 60
                    metric_key = 'exercise_minutes'
                else:
                    metric_key = metric
                
                mean = self.get_threshold(metric_key, 'population_mean')
                std = self.get_threshold(metric_key, 'population_std')
                warning_low = self.get_threshold(metric_key, 'warning_low')
                warning_high = self.get_threshold(metric_key, 'warning_high')
                
                if std and std > 0:
                    z_score = (value - mean) / std
                else:
                    z_score = 0
                
                # Determine status
                if warning_low and value < warning_low:
                    status = 'below_threshold'
                elif warning_high and value > warning_high:
                    status = 'above_threshold'
                else:
                    status = 'normal'
                
                analysis[metric] = {
                    'value': value if metric != 'exercise_duration' else routine_data[metric],
                    'population_mean': mean,
                    'z_score': round(z_score, 2),
                    'status': status,
                    'data_driven': True
                }
        
        return analysis
    
    def get_status(self) -> Dict[str, Any]:
        """Get service status."""
        return {
            'classifier_loaded': self.classifier is not None,
            'wellness_predictor_loaded': self.wellness_predictor is not None,
            'anomaly_detector_loaded': self.anomaly_detector is not None,
            'thresholds_loaded': bool(self.thresholds),
            'recommendations_count': sum(len(v) for v in self.recommendations_db.values()),
            'ready': self.is_ready()
        }


# Singleton instance for the service
_trained_service: Optional[TrainedModelService] = None


def get_trained_model_service() -> TrainedModelService:
    """Get or create the trained model service singleton."""
    global _trained_service
    if _trained_service is None:
        _trained_service = TrainedModelService()
    return _trained_service

