#!/usr/bin/env python3
"""
Hybrid Biological Predictor

Combined predictor using all trained models.
Replaces hardcoded rules with DATA-TRAINED models.

Combines:
1. Negative State Classifier (RandomForest) - Supervised
2. Wellness Score Predictor (RandomForest) - Multi-output regression
3. Anomaly Detector (Isolation Forest) - Unsupervised

Usage:
    from src.models.hybrid_predictor import HybridBiologicalPredictor
    
    predictor = HybridBiologicalPredictor()
    result = predictor.predict({
        'sleep_hours': 5.5,
        'stress_level': 8,
        'exercise_minutes': 10
    })
"""

import json
import numpy as np
import pandas as pd
import joblib
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class HybridBiologicalPredictor:
    """
    Combined predictor using all trained models.
    Replaces hardcoded rules with DATA-TRAINED models.
    """
    
    def __init__(
        self,
        models_dir: str = 'data/models',
        thresholds_path: str = 'data/processed/data_driven_thresholds.json'
    ):
        """
        Initialize with trained models and data-driven thresholds.
        
        Args:
            models_dir: Directory containing trained models
            thresholds_path: Path to data-driven thresholds JSON
        """
        self.models_dir = Path(models_dir)
        self.thresholds_path = Path(thresholds_path)
        
        # Load models
        self.classifier = None
        self.classifier_features = []
        
        self.wellness_predictor = None
        self.wellness_features = []
        self.wellness_targets = []
        
        self.anomaly_detector = None
        self.anomaly_scaler = None
        self.anomaly_features = []
        
        # Load thresholds
        self.thresholds = {}
        
        # Initialize
        self._load_models()
        self._load_thresholds()
        
        logger.info("HybridBiologicalPredictor initialized")
    
    def _load_models(self):
        """Load all trained models."""
        
        # Load classifier
        classifier_path = self.models_dir / 'negative_state_classifier.pkl'
        if classifier_path.exists():
            self.classifier = joblib.load(classifier_path)
            # Infer feature columns from model
            if hasattr(self.classifier, 'n_features_in_'):
                # Will use default features
                pass
            logger.info("Loaded negative state classifier")
        else:
            logger.warning(f"Classifier not found at {classifier_path}")
        
        # Load wellness predictor
        wellness_path = self.models_dir / 'wellness_predictor.pkl'
        if wellness_path.exists():
            wellness_data = joblib.load(wellness_path)
            self.wellness_predictor = wellness_data.get('model')
            self.wellness_features = wellness_data.get('feature_cols', [])
            self.wellness_targets = wellness_data.get('target_cols', [])
            logger.info("Loaded wellness predictor")
        else:
            logger.warning(f"Wellness predictor not found at {wellness_path}")
        
        # Load anomaly detector
        anomaly_path = self.models_dir / 'anomaly_detector.pkl'
        if anomaly_path.exists():
            anomaly_data = joblib.load(anomaly_path)
            self.anomaly_detector = anomaly_data.get('model')
            self.anomaly_scaler = anomaly_data.get('scaler')
            self.anomaly_features = anomaly_data.get('feature_cols', [])
            logger.info("Loaded anomaly detector")
        else:
            logger.warning(f"Anomaly detector not found at {anomaly_path}")
    
    def _load_thresholds(self):
        """Load data-driven thresholds."""
        if self.thresholds_path.exists():
            with open(self.thresholds_path) as f:
                self.thresholds = json.load(f)
            logger.info("Loaded data-driven thresholds")
        else:
            logger.warning(f"Thresholds not found at {self.thresholds_path}")
            # Use fallback defaults
            self.thresholds = {
                'general': {
                    'sleep_hours': {'population_mean': 7.0, 'population_std': 1.5, 'warning_low': 6.0, 'warning_high': 9.0},
                    'stress_level': {'population_mean': 5.0, 'population_std': 2.0, 'warning_low': 2.0, 'warning_high': 7.0},
                    'exercise_minutes': {'population_mean': 30, 'population_std': 20, 'warning_low': 15, 'warning_high': 60}
                }
            }
    
    def predict(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Full prediction from behavioral inputs.
        
        Args:
            inputs: Dictionary with behavioral inputs:
                - sleep_hours: float
                - stress_level: float (1-10)
                - exercise_minutes: float
                - gender: str (optional, 'male' or 'female')
                
        Returns:
            Comprehensive prediction with:
                - wellness_scores: Mental clarity, energy, mood, focus
                - negative_state_risk: Probability of anomaly (0-1)
                - anomaly_score: Isolation Forest anomaly score
                - risk_level: LOW, MEDIUM, HIGH, CRITICAL
                - recommendations: List of actionable recommendations
        """
        # Prepare features
        features_df = self._prepare_features(inputs)
        
        result = {
            'wellness_scores': {},
            'negative_state_risk': 0.5,
            'anomaly_score': 0.0,
            'risk_level': 'MEDIUM',
            'recommendations': [],
            'feature_analysis': {},
            'timestamp': datetime.now().isoformat()
        }
        
        # Get classifier prediction
        if self.classifier is not None:
            try:
                classifier_features = self._get_classifier_feature_values(features_df)
                prob = self.classifier.predict_proba(classifier_features)[:, 1][0]
                result['negative_state_risk'] = float(prob)
            except Exception as e:
                logger.warning(f"Classifier prediction failed: {e}")
        
        # Get wellness predictions
        if self.wellness_predictor is not None:
            try:
                wellness_features = features_df[self.wellness_features].fillna(0)
                predictions = self.wellness_predictor.predict(wellness_features)[0]
                
                for i, target in enumerate(self.wellness_targets):
                    result['wellness_scores'][target] = float(predictions[i])
            except Exception as e:
                logger.warning(f"Wellness prediction failed: {e}")
        
        # Get anomaly score
        if self.anomaly_detector is not None:
            try:
                anomaly_features = features_df[self.anomaly_features].fillna(0)
                
                if self.anomaly_scaler is not None:
                    anomaly_features_scaled = self.anomaly_scaler.transform(anomaly_features)
                else:
                    anomaly_features_scaled = anomaly_features.values
                
                score = -self.anomaly_detector.decision_function(anomaly_features_scaled)[0]
                # Normalize to 0-1
                result['anomaly_score'] = float(min(max(score / 0.5, 0), 1))
            except Exception as e:
                logger.warning(f"Anomaly detection failed: {e}")
        
        # Calculate risk level
        result['risk_level'] = self._get_risk_level(
            result['negative_state_risk'], 
            result['anomaly_score']
        )
        
        # Generate recommendations
        result['recommendations'] = self._get_recommendations(
            inputs, 
            result['negative_state_risk'],
            result['risk_level']
        )
        
        # Feature analysis
        result['feature_analysis'] = self._analyze_features(inputs)
        
        return result
    
    def _prepare_features(self, inputs: Dict[str, Any]) -> pd.DataFrame:
        """Prepare feature vector from inputs."""
        
        # Get threshold values
        sleep_mean = self.thresholds.get('general', {}).get('sleep_hours', {}).get('population_mean', 7.0)
        sleep_std = self.thresholds.get('general', {}).get('sleep_hours', {}).get('population_std', 1.5)
        stress_mean = self.thresholds.get('general', {}).get('stress_level', {}).get('population_mean', 5.0)
        stress_std = self.thresholds.get('general', {}).get('stress_level', {}).get('population_std', 2.0)
        
        sleep_hours = inputs.get('sleep_hours', 7.0)
        stress_level = inputs.get('stress_level', 5.0)
        exercise_minutes = inputs.get('exercise_minutes', 30.0)
        
        features = {
            # Original features
            'sleep_hours': sleep_hours,
            'stress_level': stress_level,
            'exercise_minutes': exercise_minutes,
            
            # Encoded features
            'gender_encoded': 1 if str(inputs.get('gender', 'male')).lower() == 'female' else 0,
            
            # Z-scores using DATA-DRIVEN thresholds
            'sleep_hours_zscore': (sleep_hours - sleep_mean) / sleep_std if sleep_std > 0 else 0,
            'stress_level_zscore': (stress_level - stress_mean) / stress_std if stress_std > 0 else 0,
            
            # Derived features
            'recovery_score': (10 - stress_level) / 10 * 0.5 + sleep_hours / 8 * 0.5,
            'sleep_quality_index': max(0, 1 - abs(sleep_hours - sleep_mean) / sleep_mean),
            'stress_sleep_ratio': stress_level / (sleep_hours + 0.1),
            'exercise_adequacy': min(exercise_minutes / 30, 2.0),
            
            # Health score
            'health_score': (
                sleep_hours / 9 * 30 +
                (10 - stress_level) / 10 * 25 +
                min(exercise_minutes / 45, 1) * 25 +
                max(0, 1 - abs(sleep_hours - 7.5) / 7.5) * 20
            )
        }
        
        return pd.DataFrame([features])
    
    def _get_classifier_feature_values(self, features_df: pd.DataFrame) -> pd.DataFrame:
        """Extract features for classifier."""
        classifier_features = [
            'sleep_hours', 'stress_level', 'exercise_minutes', 'gender_encoded',
            'sleep_hours_zscore', 'recovery_score', 'stress_sleep_ratio',
            'sleep_quality_index', 'exercise_adequacy', 'health_score'
        ]
        
        available = [c for c in classifier_features if c in features_df.columns]
        return features_df[available].fillna(0)
    
    def _get_risk_level(self, negative_risk: float, anomaly_score: float) -> str:
        """Determine overall risk level."""
        combined = negative_risk * 0.6 + anomaly_score * 0.4
        
        if combined < 0.3:
            return 'LOW'
        elif combined < 0.5:
            return 'MEDIUM'
        elif combined < 0.7:
            return 'HIGH'
        else:
            return 'CRITICAL'
    
    def _get_recommendations(
        self, 
        inputs: Dict[str, Any], 
        risk: float,
        risk_level: str
    ) -> List[Dict[str, str]]:
        """Generate data-driven recommendations."""
        recommendations = []
        
        # Get thresholds
        thresholds = self.thresholds.get('general', {})
        
        # Sleep recommendations
        sleep_hours = inputs.get('sleep_hours', 7)
        sleep_thresholds = thresholds.get('sleep_hours', {})
        sleep_low = sleep_thresholds.get('warning_low', 6.0)
        sleep_high = sleep_thresholds.get('warning_high', 9.0)
        
        if sleep_hours < sleep_low:
            recommendations.append({
                'type': 'sleep',
                'priority': 'high',
                'message': f'Sleep ({sleep_hours:.1f}h) is below the data-derived threshold ({sleep_low:.1f}h). '
                          'Try to get 7-8 hours of sleep for optimal recovery.'
            })
        elif sleep_hours > sleep_high:
            recommendations.append({
                'type': 'sleep',
                'priority': 'medium',
                'message': f'Sleep ({sleep_hours:.1f}h) is above typical range. '
                          'Excessive sleep may indicate fatigue or health issues.'
            })
        
        # Stress recommendations
        stress_level = inputs.get('stress_level', 5)
        stress_thresholds = thresholds.get('stress_level', {})
        stress_high = stress_thresholds.get('warning_high', 7.0)
        
        if stress_level > stress_high:
            recommendations.append({
                'type': 'stress',
                'priority': 'high',
                'message': f'Stress level ({stress_level}) is above the data-derived threshold ({stress_high:.0f}). '
                          'Consider stress-reduction activities like meditation or exercise.'
            })
        
        # Exercise recommendations
        exercise_minutes = inputs.get('exercise_minutes', 30)
        exercise_thresholds = thresholds.get('exercise_minutes', {})
        exercise_low = exercise_thresholds.get('warning_low', 15)
        
        if exercise_minutes < exercise_low:
            recommendations.append({
                'type': 'exercise',
                'priority': 'medium',
                'message': f'Exercise ({exercise_minutes:.0f} min) is below recommended ({exercise_low:.0f} min). '
                          'Aim for at least 30 minutes of moderate activity daily.'
            })
        
        # Risk-based general recommendations
        if risk_level == 'CRITICAL':
            recommendations.append({
                'type': 'general',
                'priority': 'critical',
                'message': 'Your current behavioral pattern shows significant deviation from healthy norms. '
                          'Consider consulting a healthcare professional.'
            })
        elif risk_level == 'HIGH':
            recommendations.append({
                'type': 'general',
                'priority': 'high',
                'message': 'Your routine shows concerning patterns. '
                          'Focus on improving sleep and reducing stress as priority.'
            })
        
        return recommendations
    
    def _analyze_features(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze input features against thresholds."""
        analysis = {}
        thresholds = self.thresholds.get('general', {})
        
        for feature in ['sleep_hours', 'stress_level', 'exercise_minutes']:
            if feature in inputs and feature in thresholds:
                value = inputs[feature]
                thresh = thresholds[feature]
                
                mean = thresh.get('population_mean', 0)
                std = thresh.get('population_std', 1)
                
                z_score = (value - mean) / std if std > 0 else 0
                
                if abs(z_score) < 1:
                    status = 'normal'
                elif abs(z_score) < 2:
                    status = 'moderate_deviation'
                else:
                    status = 'significant_deviation'
                
                analysis[feature] = {
                    'value': value,
                    'population_mean': mean,
                    'z_score': z_score,
                    'status': status
                }
        
        return analysis
    
    def is_ready(self) -> bool:
        """Check if predictor has all required models loaded."""
        return (
            self.classifier is not None and
            self.wellness_predictor is not None and
            self.anomaly_detector is not None
        )
    
    def get_status(self) -> Dict[str, Any]:
        """Get status of loaded models."""
        return {
            'classifier_loaded': self.classifier is not None,
            'wellness_predictor_loaded': self.wellness_predictor is not None,
            'anomaly_detector_loaded': self.anomaly_detector is not None,
            'thresholds_loaded': bool(self.thresholds),
            'ready': self.is_ready()
        }


if __name__ == "__main__":
    import json
    
    predictor = HybridBiologicalPredictor()
    
    print("Model Status:", json.dumps(predictor.get_status(), indent=2))
    
    if predictor.is_ready():
        # Test prediction
        result = predictor.predict({
            'sleep_hours': 5.5,
            'stress_level': 8,
            'exercise_minutes': 10,
            'gender': 'female'
        })
        
        print("\nPrediction Result:")
        print(json.dumps(result, indent=2))
    else:
        print("\n⚠️  Models not fully loaded. Train models first:")
        print("   python -m src.models.train_classifier")
        print("   python -m src.models.train_wellness_predictor")
        print("   python -m src.models.train_anomaly_detector")

