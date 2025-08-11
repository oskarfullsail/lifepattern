import numpy as np
import pandas as pd
from typing import List, Tuple, Optional, Dict, Any
from datetime import datetime, timedelta
import logging
from scipy import stats
from sklearn.ensemble import IsolationForest
import ruptures

logger = logging.getLogger(__name__)

class DriftDetector:
    """
    Advanced drift detection using PADWIN and Isolation Forest
    for detecting behavioral changes in user routines over time
    """
    
    def __init__(self, window_size: int = 30, drift_threshold: float = 0.05):
        self.window_size = window_size
        self.drift_threshold = drift_threshold
        self.user_baselines = {}  # Store user baseline patterns
        self.drift_history = {}   # Track drift events per user
        
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
    
    def detect_drift_padwin(self, user_id: str, recent_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Detect drift using PADWIN (Population-Aware Drift Detection)
        """
        if len(recent_data) < self.window_size:
            return {'drift_detected': False, 'confidence': 0.0, 'drift_type': 'insufficient_data'}
        
        # Extract health scores for drift detection
        health_scores = [d['health_score'] for d in recent_data]
        
        # Use ruptures for change point detection
        try:
            # Convert to numpy array
            signal = np.array(health_scores)
            
            # Detect change points using Pelt algorithm
            algo = ruptures.Pelt(model="rbf").fit(signal)
            change_points = algo.predict(pen=10)  # Penalty parameter
            
            # Check if recent change points indicate drift
            recent_changes = [cp for cp in change_points if cp > len(signal) - 7]  # Last week
            
            if recent_changes:
                # Calculate drift magnitude
                before_change = signal[:recent_changes[0]]
                after_change = signal[recent_changes[0]:]
                
                if len(before_change) > 0 and len(after_change) > 0:
                    drift_magnitude = np.mean(after_change) - np.mean(before_change)
                    drift_confidence = min(abs(drift_magnitude) * 2, 1.0)  # Scale to 0-1
                    
                    return {
                        'drift_detected': True,
                        'confidence': drift_confidence,
                        'drift_type': 'behavioral_change',
                        'magnitude': drift_magnitude,
                        'change_point': recent_changes[0],
                        'before_mean': np.mean(before_change),
                        'after_mean': np.mean(after_change)
                    }
        
        except Exception as e:
            logger.error(f"Error in PADWIN drift detection: {str(e)}")
        
        return {'drift_detected': False, 'confidence': 0.0, 'drift_type': 'no_drift'}
    
    def detect_anomalies_isolation_forest(self, user_id: str, current_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Detect anomalies using Isolation Forest
        """
        if user_id not in self.user_baselines:
            return {'anomaly_detected': False, 'confidence': 0.0, 'anomaly_type': 'no_baseline'}
        
        baseline = self.user_baselines[user_id]
        
        # Prepare features for anomaly detection
        features = [
            current_data['sleep_hours'],
            current_data['screen_time'],
            current_data['exercise_duration'],
            current_data['water_intake'],
            current_data['stress_level'],
            current_data['health_score']
        ]
        
        # Create synthetic dataset for training (using baseline)
        n_samples = 100
        synthetic_data = []
        
        for _ in range(n_samples):
            sample = [
                np.random.normal(baseline['sleep_hours']['mean'], baseline['sleep_hours']['std']),
                np.random.normal(baseline['screen_time']['mean'], baseline['screen_time']['std']),
                np.random.normal(baseline['exercise_duration']['mean'], baseline['exercise_duration']['std']),
                np.random.normal(baseline['water_intake']['mean'], baseline['water_intake']['std']),
                np.random.normal(baseline['stress_level']['mean'], baseline['stress_level']['std']),
                np.random.normal(baseline['health_score']['mean'], baseline['health_score']['std'])
            ]
            synthetic_data.append(sample)
        
        # Add current data point
        synthetic_data.append(features)
        
        # Train Isolation Forest
        iso_forest = IsolationForest(contamination=0.1, random_state=42)
        iso_forest.fit(synthetic_data)
        
        # Predict anomaly
        prediction = iso_forest.predict([features])[0]
        anomaly_score = iso_forest.decision_function([features])[0]
        
        is_anomaly = prediction == -1  # -1 indicates anomaly
        confidence = abs(anomaly_score)
        
        if is_anomaly:
            anomaly_type = self._classify_anomaly_type(current_data, baseline)
        else:
            anomaly_type = 'normal'
        
        return {
            'anomaly_detected': is_anomaly,
            'confidence': confidence,
            'anomaly_type': anomaly_type,
            'anomaly_score': anomaly_score
        }
    
    def analyze_routine_drift(self, user_id: str, current_data: Dict[str, Any], 
                            historical_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Comprehensive drift analysis combining PADWIN and Isolation Forest
        """
        # Update baseline if needed
        if user_id not in self.user_baselines or len(historical_data) > 30:
            self.calculate_baseline(user_id, historical_data)
        
        # Get recent data for PADWIN
        recent_data = historical_data[-self.window_size:] if len(historical_data) >= self.window_size else historical_data
        
        # Detect drift using PADWIN
        padwin_result = self.detect_drift_padwin(user_id, recent_data)
        
        # Detect anomalies using Isolation Forest
        isolation_result = self.detect_anomalies_isolation_forest(user_id, current_data)
        
        # Combine results
        drift_detected = padwin_result['drift_detected'] or isolation_result['anomaly_detected']
        overall_confidence = max(padwin_result['confidence'], isolation_result['confidence'])
        
        # Determine drift type
        if padwin_result['drift_detected'] and isolation_result['anomaly_detected']:
            drift_type = 'significant_behavioral_change'
        elif padwin_result['drift_detected']:
            drift_type = 'gradual_drift'
        elif isolation_result['anomaly_detected']:
            drift_type = 'sudden_anomaly'
        else:
            drift_type = 'no_drift'
        
        # Store drift event
        if drift_detected:
            self._store_drift_event(user_id, {
                'timestamp': datetime.now().isoformat(),
                'drift_type': drift_type,
                'confidence': overall_confidence,
                'padwin_result': padwin_result,
                'isolation_result': isolation_result,
                'current_data': current_data
            })
        
        return {
            'drift_detected': drift_detected,
            'confidence': overall_confidence,
            'drift_type': drift_type,
            'padwin_analysis': padwin_result,
            'isolation_analysis': isolation_result,
            'baseline_comparison': self._compare_with_baseline(user_id, current_data)
        }
    
    def _compare_with_baseline(self, user_id: str, current_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Compare current data with user baseline
        """
        if user_id not in self.user_baselines:
            return {}
        
        baseline = self.user_baselines[user_id]
        comparisons = {}
        
        for metric in ['sleep_hours', 'screen_time', 'exercise_duration', 'water_intake', 'stress_level', 'health_score']:
            if metric in current_data and metric in baseline:
                current_value = current_data[metric]
                baseline_mean = baseline[metric]['mean']
                baseline_std = baseline[metric]['std']
                
                # Calculate z-score
                if baseline_std > 0:
                    z_score = (current_value - baseline_mean) / baseline_std
                else:
                    z_score = 0
                
                # Determine deviation level
                if abs(z_score) < 1:
                    deviation = 'normal'
                elif abs(z_score) < 2:
                    deviation = 'moderate'
                else:
                    deviation = 'significant'
                
                comparisons[metric] = {
                    'current': current_value,
                    'baseline_mean': baseline_mean,
                    'z_score': z_score,
                    'deviation': deviation,
                    'percent_change': ((current_value - baseline_mean) / baseline_mean * 100) if baseline_mean != 0 else 0
                }
        
        return comparisons
    
    def _classify_anomaly_type(self, current_data: Dict[str, Any], baseline: Dict[str, Any]) -> str:
        """
        Classify the type of anomaly based on deviations from baseline
        """
        deviations = []
        
        for metric in ['sleep_hours', 'screen_time', 'exercise_duration', 'water_intake', 'stress_level']:
            if metric in current_data and metric in baseline:
                current_value = current_data[metric]
                baseline_mean = baseline[metric]['mean']
                baseline_std = baseline[metric]['std']
                
                if baseline_std > 0:
                    z_score = abs((current_value - baseline_mean) / baseline_std)
                    if z_score > 2:  # Significant deviation
                        deviations.append((metric, z_score))
        
        if not deviations:
            return 'general_anomaly'
        
        # Sort by most significant deviation
        deviations.sort(key=lambda x: x[1], reverse=True)
        primary_deviation = deviations[0][0]
        
        return f"{primary_deviation}_anomaly"
    
    def _store_drift_event(self, user_id: str, drift_event: Dict[str, Any]) -> None:
        """
        Store drift event for historical analysis
        """
        if user_id not in self.drift_history:
            self.drift_history[user_id] = []
        
        self.drift_history[user_id].append(drift_event)
        
        # Keep only last 100 events
        if len(self.drift_history[user_id]) > 100:
            self.drift_history[user_id] = self.drift_history[user_id][-100:]
    
    def _get_default_baseline(self) -> Dict[str, Any]:
        """
        Return default baseline for new users
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
    
    def get_user_baseline(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get user baseline if available
        """
        return self.user_baselines.get(user_id)
    
    def get_drift_history(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Get drift history for a user
        """
        return self.drift_history.get(user_id, []) 