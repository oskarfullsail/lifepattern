"""
Alternative Drift Detector for Behavioral Analysis
Uses scikit-learn and statistical methods instead of ruptures library
"""

import numpy as np
import pandas as pd
from typing import List, Tuple, Optional, Dict, Any
from datetime import datetime, timedelta
import logging
from scipy import stats
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import DBSCAN

logger = logging.getLogger(__name__)

class DriftDetectorAlt:
    """
    Alternative drift detection using statistical methods and scikit-learn
    for detecting behavioral changes in user routines over time
    """
    
    def __init__(self, window_size: int = 30, drift_threshold: float = 0.05):
        self.window_size = window_size
        self.drift_threshold = drift_threshold
        self.user_baselines = {}  # Store user baseline patterns
        self.drift_history = {}   # Track drift events per user
        self.isolation_forest = IsolationForest(contamination=0.1, random_state=42)
        
    def calculate_baseline(self, user_id: str, historical_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Calculate user baseline from historical routine data
        """
        if len(historical_data) < 7:  # Need at least a week of data
            return self._get_default_baseline()
            
        df = pd.DataFrame(historical_data)
        
        baseline = {
            'sleep_hours': {
                'mean': df['sleep_hours'].mean(),
                'std': df['sleep_hours'].std(),
                'median': df['sleep_hours'].median()
            },
            'screen_time': {
                'mean': df['screen_time'].mean(),
                'std': df['screen_time'].std(),
                'median': df['screen_time'].median()
            },
            'exercise_duration': {
                'mean': df['exercise_duration'].mean(),
                'std': df['exercise_duration'].std(),
                'median': df['exercise_duration'].median()
            },
            'water_intake': {
                'mean': df['water_intake'].mean(),
                'std': df['water_intake'].std(),
                'median': df['water_intake'].median()
            },
            'stress_level': {
                'mean': df['stress_level'].mean(),
                'std': df['stress_level'].std(),
                'median': df['stress_level'].median()
            },
            'health_score': {
                'mean': df['health_score'].mean(),
                'std': df['health_score'].std(),
                'median': df['health_score'].median()
            },
            'wake_up_hour': {
                'mean': df['wake_up_hour'].mean(),
                'std': df['wake_up_hour'].std(),
                'median': df['wake_up_hour'].median()
            },
            'bed_time_hour': {
                'mean': df['bed_time_hour'].mean(),
                'std': df['bed_time_hour'].std(),
                'median': df['bed_time_hour'].median()
            },
            'meal_count': {
                'mean': df['meal_count'].mean(),
                'std': df['meal_count'].std(),
                'median': df['meal_count'].median()
            },
            'calculated_at': datetime.now().isoformat(),
            'data_points': len(historical_data)
        }
        
        self.user_baselines[user_id] = baseline
        logger.info(f"Calculated baseline for user {user_id} with {len(historical_data)} data points")
        return baseline
    
    def detect_drift_statistical(self, user_id: str, recent_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Detect drift using statistical methods (t-test, z-score analysis)
        """
        if len(recent_data) < 10:  # Need at least 10 data points
            return {'drift_detected': False, 'confidence': 0.0, 'drift_type': 'insufficient_data'}
        
        if user_id not in self.user_baselines:
            return {'drift_detected': False, 'confidence': 0.0, 'drift_type': 'no_baseline'}
        
        baseline = self.user_baselines[user_id]
        df_recent = pd.DataFrame(recent_data)
        
        drift_scores = {}
        total_drift_score = 0
        metrics_checked = 0
        
        # Check each metric for drift
        for metric in ['sleep_hours', 'screen_time', 'exercise_duration', 'water_intake', 'stress_level', 'health_score']:
            if metric in baseline and metric in df_recent.columns:
                baseline_mean = baseline[metric]['mean']
                baseline_std = baseline[metric]['std']
                recent_mean = df_recent[metric].mean()
                
                # Calculate z-score
                z_score = abs(recent_mean - baseline_mean) / baseline_std if baseline_std > 0 else 0
                
                # Perform t-test
                try:
                    t_stat, p_value = stats.ttest_1samp(df_recent[metric], baseline_mean)
                    drift_score = min(z_score / 3.0 + (1 - p_value), 1.0)  # Combine z-score and p-value
                except:
                    drift_score = min(z_score / 3.0, 1.0)
                
                drift_scores[metric] = {
                    'z_score': z_score,
                    'p_value': p_value if 'p_value' in locals() else None,
                    'drift_score': drift_score,
                    'baseline_mean': baseline_mean,
                    'recent_mean': recent_mean
                }
                
                total_drift_score += drift_score
                metrics_checked += 1
        
        # Calculate overall drift
        avg_drift_score = total_drift_score / metrics_checked if metrics_checked > 0 else 0
        drift_detected = avg_drift_score > self.drift_threshold
        
        # Determine drift type
        if drift_detected:
            if avg_drift_score > 0.7:
                drift_type = 'significant_drift'
            elif avg_drift_score > 0.4:
                drift_type = 'moderate_drift'
            else:
                drift_type = 'minor_drift'
        else:
            drift_type = 'no_drift'
        
        return {
            'drift_detected': drift_detected,
            'confidence': avg_drift_score,
            'drift_type': drift_type,
            'drift_scores': drift_scores,
            'avg_drift_score': avg_drift_score
        }
    
    def detect_anomalies_isolation_forest(self, user_id: str, recent_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Detect anomalies using Isolation Forest
        """
        if len(recent_data) < 5:
            return {'anomaly_detected': False, 'confidence': 0.0, 'anomaly_type': 'insufficient_data'}
        
        # Prepare features for anomaly detection
        features = []
        for data_point in recent_data:
            feature_vector = [
                data_point.get('sleep_hours', 0),
                data_point.get('screen_time', 0),
                data_point.get('exercise_duration', 0),
                data_point.get('water_intake', 0),
                data_point.get('stress_level', 0),
                data_point.get('health_score', 0),
                data_point.get('wake_up_hour', 0),
                data_point.get('bed_time_hour', 0),
                data_point.get('meal_count', 0)
            ]
            features.append(feature_vector)
        
        features = np.array(features)
        
        # Fit isolation forest
        try:
            self.isolation_forest.fit(features)
            anomaly_scores = self.isolation_forest.decision_function(features)
            anomaly_labels = self.isolation_forest.predict(features)
            
            # Calculate anomaly statistics
            avg_anomaly_score = np.mean(anomaly_scores)
            anomaly_count = np.sum(anomaly_labels == -1)
            anomaly_ratio = anomaly_count / len(anomaly_labels)
            
            # Determine anomaly type
            if anomaly_ratio > 0.3:
                anomaly_type = 'high_anomaly'
                confidence = min(anomaly_ratio * 2, 1.0)
            elif anomaly_ratio > 0.1:
                anomaly_type = 'moderate_anomaly'
                confidence = min(anomaly_ratio * 1.5, 1.0)
            elif avg_anomaly_score < -0.1:
                anomaly_type = 'low_anomaly'
                confidence = min(abs(avg_anomaly_score), 1.0)
            else:
                anomaly_type = 'normal'
                confidence = 0.0
            
            anomaly_detected = anomaly_ratio > 0.1 or avg_anomaly_score < -0.05
            
        except Exception as e:
            logger.error(f"Error in isolation forest: {e}")
            return {'anomaly_detected': False, 'confidence': 0.0, 'anomaly_type': 'error'}
        
        return {
            'anomaly_detected': anomaly_detected,
            'confidence': confidence,
            'anomaly_type': anomaly_type,
            'anomaly_score': avg_anomaly_score,
            'anomaly_ratio': anomaly_ratio,
            'anomaly_count': anomaly_count
        }
    
    def analyze_routine_drift(self, user_id: str, current_data: Dict[str, Any], 
                            historical_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Comprehensive drift analysis combining statistical and anomaly detection
        """
        # Calculate baseline if not exists
        if user_id not in self.user_baselines:
            self.calculate_baseline(user_id, historical_data)
        
        # Prepare recent data for analysis
        recent_data = historical_data[-self.window_size:] if len(historical_data) >= self.window_size else historical_data
        
        # Perform statistical drift detection
        statistical_analysis = self.detect_drift_statistical(user_id, recent_data)
        
        # Perform anomaly detection
        anomaly_analysis = self.detect_anomalies_isolation_forest(user_id, recent_data)
        
        # Combine results
        overall_drift_detected = statistical_analysis['drift_detected'] or anomaly_analysis['anomaly_detected']
        
        # Calculate combined confidence
        stat_confidence = statistical_analysis['confidence']
        anomaly_confidence = anomaly_analysis['confidence']
        combined_confidence = max(stat_confidence, anomaly_confidence)
        
        # Determine overall drift type
        if statistical_analysis['drift_detected'] and anomaly_analysis['anomaly_detected']:
            overall_drift_type = 'combined_drift'
        elif statistical_analysis['drift_detected']:
            overall_drift_type = statistical_analysis['drift_type']
        elif anomaly_analysis['anomaly_detected']:
            overall_drift_type = 'anomaly_drift'
        else:
            overall_drift_type = 'no_drift'
        
        # Baseline comparison
        baseline_comparison = self._compare_with_baseline(user_id, current_data)
        
        return {
            'drift_detected': overall_drift_detected,
            'confidence': combined_confidence,
            'drift_type': overall_drift_type,
            'statistical_analysis': statistical_analysis,
            'anomaly_analysis': anomaly_analysis,
            'baseline_comparison': baseline_comparison,
            'analysis_timestamp': datetime.now().isoformat()
        }
    
    def _compare_with_baseline(self, user_id: str, current_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Compare current data with user baseline
        """
        if user_id not in self.user_baselines:
            return {}
        
        baseline = self.user_baselines[user_id]
        comparison = {}
        
        for metric in ['sleep_hours', 'screen_time', 'exercise_duration', 'water_intake', 'stress_level', 'health_score']:
            if metric in baseline and metric in current_data:
                baseline_mean = baseline[metric]['mean']
                baseline_std = baseline[metric]['std']
                current_value = current_data[metric]
                
                # Calculate z-score
                z_score = (current_value - baseline_mean) / baseline_std if baseline_std > 0 else 0
                
                # Calculate percentage change
                percent_change = ((current_value - baseline_mean) / baseline_mean * 100) if baseline_mean > 0 else 0
                
                # Determine deviation level
                if abs(z_score) < 1:
                    deviation = 'normal'
                elif abs(z_score) < 2:
                    deviation = 'moderate'
                else:
                    deviation = 'significant'
                
                comparison[metric] = {
                    'current': current_value,
                    'baseline_mean': baseline_mean,
                    'z_score': z_score,
                    'percent_change': percent_change,
                    'deviation': deviation
                }
        
        return comparison
    
    def _get_default_baseline(self) -> Dict[str, Any]:
        """
        Return default baseline when insufficient data
        """
        return {
            'sleep_hours': {'mean': 8.0, 'std': 1.0, 'median': 8.0},
            'screen_time': {'mean': 6.0, 'std': 2.0, 'median': 6.0},
            'exercise_duration': {'mean': 0.5, 'std': 0.3, 'median': 0.5},
            'water_intake': {'mean': 2.0, 'std': 0.5, 'median': 2.0},
            'stress_level': {'mean': 5.0, 'std': 2.0, 'median': 5.0},
            'health_score': {'mean': 0.7, 'std': 0.2, 'median': 0.7},
            'wake_up_hour': {'mean': 7.0, 'std': 1.0, 'median': 7.0},
            'bed_time_hour': {'mean': 23.0, 'std': 1.0, 'median': 23.0},
            'meal_count': {'mean': 3.0, 'std': 0.5, 'median': 3.0},
            'calculated_at': datetime.now().isoformat(),
            'data_points': 0
        } 