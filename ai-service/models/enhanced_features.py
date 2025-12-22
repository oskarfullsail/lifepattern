"""
Enhanced Feature Module for Behavioral Anomaly Detection

This module adds heart rate and five additional derived features that 
meaningfully improve anomaly detection sensitivity and clinical relevance.

New Features:
1. Heart Rate / Heart Rate Variability (HRV) - Primary physiological signal
2. Sleep Consistency Score - Regularity of sleep patterns
3. Recovery Score - Physiological recovery indicator
4. Activity Balance Index - Distribution of physical activity
5. Resting HR Trend - Cardiovascular health trend
6. Circadian Disruption Score - Alignment with natural rhythms

Academic Justification:
Each feature is derived from clinical research on behavioral health markers
and contributes unique variance to anomaly detection models.
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
from scipy import stats
import logging

logger = logging.getLogger(__name__)


@dataclass
class HeartRateMetrics:
    """
    Heart Rate and HRV metrics for anomaly detection.
    
    Feature Contribution:
    - Resting HR correlates with overall cardiovascular health
    - HRV (Heart Rate Variability) reflects autonomic nervous system balance
    - Low HRV is associated with stress, poor recovery, and health risks
    
    Detection Approach: Hybrid (Rules for clinical bounds, ML for personalization)
    """
    
    # Raw measurements
    heart_rate_avg: float  # Average bpm over measurement period
    heart_rate_resting: float  # Lowest stable HR during rest
    heart_rate_max: float  # Peak HR during the day
    hrv_rmssd: float  # Root mean square of successive differences (ms)
    hrv_sdnn: float  # Standard deviation of NN intervals (ms)
    
    # Derived scores
    recovery_index: float  # 0-100 based on morning HRV
    stress_indicator: float  # 0-10 based on HRV patterns
    
    def is_valid(self) -> bool:
        """Validate heart rate metrics are within physiological bounds."""
        return (
            40 <= self.heart_rate_avg <= 200 and
            35 <= self.heart_rate_resting <= 150 and
            self.hrv_rmssd >= 0
        )


class HeartRateAnalyzer:
    """
    Analyzes heart rate data for anomaly detection.
    
    Uses both clinical thresholds and personal baselines.
    """
    
    # Clinical reference ranges (American Heart Association)
    CLINICAL_BOUNDS = {
        'resting_hr': {'optimal': (60, 80), 'warning': (50, 100), 'critical': (40, 120)},
        'hrv_rmssd': {'optimal': (30, 70), 'warning': (15, 100), 'low_risk': 20},
    }
    
    def __init__(self):
        self.user_baselines: Dict[str, Dict] = {}
        
    def compute_metrics(
        self, 
        hr_samples: List[float],
        timestamps: Optional[List[datetime]] = None
    ) -> HeartRateMetrics:
        """
        Compute heart rate metrics from raw samples.
        
        Args:
            hr_samples: List of heart rate values (bpm)
            timestamps: Optional timestamps for temporal analysis
        """
        if not hr_samples or len(hr_samples) < 2:
            return HeartRateMetrics(
                heart_rate_avg=0, heart_rate_resting=0, heart_rate_max=0,
                hrv_rmssd=0, hrv_sdnn=0, recovery_index=0, stress_indicator=5
            )
        
        hr_array = np.array(hr_samples)
        
        # Basic stats
        avg_hr = float(np.mean(hr_array))
        max_hr = float(np.max(hr_array))
        
        # Resting HR: Use 10th percentile as proxy for resting
        resting_hr = float(np.percentile(hr_array, 10))
        
        # HRV calculations (simplified - ideally needs RR intervals)
        # Using consecutive differences as approximation
        diffs = np.diff(hr_array)
        hrv_rmssd = float(np.sqrt(np.mean(diffs ** 2))) if len(diffs) > 0 else 0
        hrv_sdnn = float(np.std(hr_array))
        
        # Recovery index (0-100): Higher HRV and lower resting HR = better recovery
        recovery_index = self._compute_recovery_index(resting_hr, hrv_rmssd)
        
        # Stress indicator (0-10): Lower HRV = higher stress
        stress_indicator = self._compute_stress_indicator(hrv_rmssd, hrv_sdnn)
        
        return HeartRateMetrics(
            heart_rate_avg=avg_hr,
            heart_rate_resting=resting_hr,
            heart_rate_max=max_hr,
            hrv_rmssd=hrv_rmssd,
            hrv_sdnn=hrv_sdnn,
            recovery_index=recovery_index,
            stress_indicator=stress_indicator
        )
    
    def _compute_recovery_index(self, resting_hr: float, hrv_rmssd: float) -> float:
        """
        Compute recovery index (0-100).
        
        Higher scores indicate better physiological recovery.
        Based on: Low resting HR + High HRV = Good recovery
        """
        # Normalize resting HR (inverse - lower is better)
        # Optimal: 60-70 bpm
        if resting_hr <= 60:
            hr_score = 100
        elif resting_hr <= 70:
            hr_score = 90 - (resting_hr - 60) * 2
        elif resting_hr <= 80:
            hr_score = 70 - (resting_hr - 70) * 3
        else:
            hr_score = max(0, 40 - (resting_hr - 80) * 2)
        
        # Normalize HRV (higher is better)
        # Optimal: 40-60 ms RMSSD
        if hrv_rmssd >= 60:
            hrv_score = 100
        elif hrv_rmssd >= 40:
            hrv_score = 80 + (hrv_rmssd - 40) * 1
        elif hrv_rmssd >= 20:
            hrv_score = 40 + (hrv_rmssd - 20) * 2
        else:
            hrv_score = max(0, hrv_rmssd * 2)
        
        # Weighted average (HR slightly more weight)
        return hr_score * 0.55 + hrv_score * 0.45
    
    def _compute_stress_indicator(self, hrv_rmssd: float, hrv_sdnn: float) -> float:
        """
        Compute stress indicator (0-10, lower is better).
        
        Based on HRV markers - lower HRV indicates higher stress.
        """
        # HRV score (inverse for stress)
        if hrv_rmssd >= 50:
            stress = 1.0
        elif hrv_rmssd >= 40:
            stress = 2.0
        elif hrv_rmssd >= 30:
            stress = 3.0
        elif hrv_rmssd >= 20:
            stress = 5.0
        elif hrv_rmssd >= 10:
            stress = 7.0
        else:
            stress = 9.0
        
        # Adjust based on SDNN variability
        if hrv_sdnn < 30:
            stress += 1.0  # Low variability increases stress score
        elif hrv_sdnn > 100:
            stress = max(1, stress - 1)  # High variability reduces it
        
        return min(10, max(0, stress))
    
    def analyze(
        self, 
        user_id: str,
        hr_samples: List[float],
        historical_metrics: Optional[List[HeartRateMetrics]] = None
    ) -> Dict[str, Any]:
        """
        Full heart rate analysis with anomaly detection.
        """
        metrics = self.compute_metrics(hr_samples)
        
        if not metrics.is_valid():
            return {
                'valid': False,
                'message': 'Invalid heart rate data'
            }
        
        # Update personal baseline
        if user_id not in self.user_baselines:
            self.user_baselines[user_id] = {
                'resting_hr_history': [],
                'hrv_history': [],
                'recovery_history': []
            }
        
        baseline = self.user_baselines[user_id]
        baseline['resting_hr_history'].append(metrics.heart_rate_resting)
        baseline['hrv_history'].append(metrics.hrv_rmssd)
        baseline['recovery_history'].append(metrics.recovery_index)
        
        # Keep last 30 days
        for key in baseline:
            baseline[key] = baseline[key][-30:]
        
        # Detect anomalies
        anomalies = []
        
        # Check clinical bounds
        if not (self.CLINICAL_BOUNDS['resting_hr']['warning'][0] <= 
                metrics.heart_rate_resting <= 
                self.CLINICAL_BOUNDS['resting_hr']['warning'][1]):
            anomalies.append({
                'type': 'abnormal_resting_hr',
                'value': metrics.heart_rate_resting,
                'severity': 'high' if not (
                    self.CLINICAL_BOUNDS['resting_hr']['critical'][0] <=
                    metrics.heart_rate_resting <=
                    self.CLINICAL_BOUNDS['resting_hr']['critical'][1]
                ) else 'medium',
                'description': f'Resting heart rate ({metrics.heart_rate_resting:.0f} bpm) outside normal range'
            })
        
        # Check HRV
        if metrics.hrv_rmssd < self.CLINICAL_BOUNDS['hrv_rmssd']['low_risk']:
            anomalies.append({
                'type': 'low_hrv',
                'value': metrics.hrv_rmssd,
                'severity': 'medium',
                'description': f'Heart rate variability ({metrics.hrv_rmssd:.1f} ms) is below optimal levels'
            })
        
        # Check personal trend
        if len(baseline['resting_hr_history']) >= 7:
            recent_avg = np.mean(baseline['resting_hr_history'][-3:])
            historical_avg = np.mean(baseline['resting_hr_history'][:-3])
            
            if recent_avg > historical_avg + 10:
                anomalies.append({
                    'type': 'elevated_resting_hr_trend',
                    'value': recent_avg,
                    'baseline': historical_avg,
                    'severity': 'medium',
                    'description': f'Resting heart rate has increased from {historical_avg:.0f} to {recent_avg:.0f} bpm'
                })
        
        return {
            'valid': True,
            'metrics': {
                'heart_rate_avg': metrics.heart_rate_avg,
                'heart_rate_resting': metrics.heart_rate_resting,
                'heart_rate_max': metrics.heart_rate_max,
                'hrv_rmssd': metrics.hrv_rmssd,
                'hrv_sdnn': metrics.hrv_sdnn,
                'recovery_index': metrics.recovery_index,
                'stress_indicator': metrics.stress_indicator
            },
            'anomalies': anomalies,
            'is_anomaly': len(anomalies) > 0
        }


class SleepConsistencyAnalyzer:
    """
    Feature 2: Sleep Consistency Score
    
    Measures regularity of sleep-wake patterns, which is independently
    associated with health outcomes beyond sleep duration.
    
    Research basis: Social jetlag and irregular sleep are linked to
    metabolic issues, mood disorders, and cognitive impairment.
    
    Detection Approach: Rules + Statistical deviation
    """
    
    def __init__(self, window_days: int = 7):
        self.window_days = window_days
        self.user_patterns: Dict[str, List[Dict]] = {}
        
    def compute_consistency(
        self,
        sleep_records: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Compute sleep consistency metrics.
        
        Args:
            sleep_records: List of dicts with 'sleep_hours', 'bed_time', 'wake_time'
        """
        if len(sleep_records) < 3:
            return {
                'score': 50,  # Neutral score
                'has_sufficient_data': False
            }
        
        df = pd.DataFrame(sleep_records)
        
        # Parse times to hours
        def time_to_hour(t):
            if isinstance(t, str):
                parts = t.split(':')
                hour = int(parts[0])
                minute = int(parts[1]) if len(parts) > 1 else 0
                return hour + minute / 60
            return t
        
        if 'bed_time' in df.columns:
            bed_hours = df['bed_time'].apply(time_to_hour)
            # Adjust for past midnight
            bed_hours = bed_hours.apply(lambda x: x if x > 12 else x + 24)
        else:
            bed_hours = pd.Series([23.0] * len(df))
            
        if 'wake_time' in df.columns:
            wake_hours = df['wake_time'].apply(time_to_hour)
        else:
            wake_hours = pd.Series([7.0] * len(df))
        
        sleep_hours = df['sleep_hours'] if 'sleep_hours' in df.columns else pd.Series([7.0] * len(df))
        
        # Compute variability metrics
        bed_time_std = float(bed_hours.std())
        wake_time_std = float(wake_hours.std())
        sleep_duration_std = float(sleep_hours.std())
        
        # Social jetlag: Weekend vs weekday difference
        # Simplified: use overall variability
        
        # Consistency score (0-100)
        # Lower variability = higher consistency
        bed_score = max(0, 100 - bed_time_std * 20)
        wake_score = max(0, 100 - wake_time_std * 20)
        duration_score = max(0, 100 - sleep_duration_std * 15)
        
        overall_score = (bed_score * 0.35 + wake_score * 0.35 + duration_score * 0.3)
        
        # Detect anomalies
        anomalies = []
        if bed_time_std > 2.0:
            anomalies.append({
                'type': 'inconsistent_bedtime',
                'variability_hours': bed_time_std,
                'severity': 'medium',
                'description': f'Bedtime varies by {bed_time_std:.1f} hours on average'
            })
        
        if wake_time_std > 2.0:
            anomalies.append({
                'type': 'inconsistent_waketime',
                'variability_hours': wake_time_std,
                'severity': 'medium',
                'description': f'Wake time varies by {wake_time_std:.1f} hours on average'
            })
        
        return {
            'score': round(overall_score, 1),
            'bed_time_variability': bed_time_std,
            'wake_time_variability': wake_time_std,
            'duration_variability': sleep_duration_std,
            'anomalies': anomalies,
            'is_anomaly': len(anomalies) > 0,
            'has_sufficient_data': True,
            'interpretation': self._interpret_score(overall_score)
        }
    
    def _interpret_score(self, score: float) -> str:
        if score >= 80:
            return 'excellent_consistency'
        elif score >= 60:
            return 'good_consistency'
        elif score >= 40:
            return 'moderate_consistency'
        else:
            return 'poor_consistency'


class RecoveryScoreCalculator:
    """
    Feature 3: Recovery Score
    
    Composite score indicating physiological readiness based on:
    - Sleep quality/duration
    - HRV (if available)
    - Previous day's strain
    - Rest day adherence
    
    Detection Approach: Hybrid (weighted formula + ML adjustment)
    """
    
    def compute_recovery(
        self,
        sleep_hours: float,
        sleep_quality: Optional[float] = None,  # 0-10
        hrv_score: Optional[float] = None,  # Recovery index 0-100
        previous_exercise_hours: float = 0,
        stress_level: float = 5,
        days_since_rest: int = 0
    ) -> Dict[str, Any]:
        """
        Compute recovery score (0-100).
        """
        scores = []
        weights = []
        
        # Sleep component (most important)
        if sleep_hours >= 7 and sleep_hours <= 9:
            sleep_score = 100
        elif sleep_hours >= 6:
            sleep_score = 70 + (sleep_hours - 6) * 30
        elif sleep_hours >= 5:
            sleep_score = 40 + (sleep_hours - 5) * 30
        else:
            sleep_score = max(0, sleep_hours * 8)
        
        scores.append(sleep_score)
        weights.append(0.35)
        
        # HRV component (if available)
        if hrv_score is not None:
            scores.append(hrv_score)
            weights.append(0.25)
        
        # Sleep quality (if available)
        if sleep_quality is not None:
            scores.append(sleep_quality * 10)
            weights.append(0.15)
        
        # Strain recovery (higher previous exercise = more recovery needed)
        if previous_exercise_hours > 2:
            strain_penalty = min(30, (previous_exercise_hours - 1) * 15)
            strain_score = max(0, 100 - strain_penalty)
        elif previous_exercise_hours > 1:
            strain_score = 85
        else:
            strain_score = 100
        scores.append(strain_score)
        weights.append(0.15)
        
        # Stress component (inverse)
        stress_score = max(0, 100 - stress_level * 10)
        scores.append(stress_score)
        weights.append(0.10)
        
        # Rest day adherence
        if days_since_rest >= 7:
            rest_score = 40
        elif days_since_rest >= 5:
            rest_score = 60
        elif days_since_rest >= 3:
            rest_score = 80
        else:
            rest_score = 100
        
        # Normalize weights
        weights = np.array(weights)
        weights = weights / weights.sum()
        
        recovery_score = float(np.dot(scores, weights))
        
        # Determine recovery status
        if recovery_score >= 80:
            status = 'fully_recovered'
            recommendation = 'Ready for high-intensity activity'
        elif recovery_score >= 60:
            status = 'recovered'
            recommendation = 'Good for moderate activity'
        elif recovery_score >= 40:
            status = 'recovering'
            recommendation = 'Consider light activity or rest'
        else:
            status = 'low_recovery'
            recommendation = 'Prioritize rest and recovery'
        
        return {
            'score': round(recovery_score, 1),
            'status': status,
            'recommendation': recommendation,
            'components': {
                'sleep': sleep_score,
                'strain': strain_score,
                'stress': stress_score,
                'rest': rest_score
            },
            'is_anomaly': recovery_score < 40
        }


class ActivityBalanceAnalyzer:
    """
    Feature 4: Activity Balance Index
    
    Measures the distribution and balance of physical activity:
    - Exercise vs sedentary time ratio
    - Activity distribution throughout day
    - Movement consistency
    
    Detection Approach: Statistical + Pattern analysis
    """
    
    def compute_balance(
        self,
        exercise_duration: float,  # hours
        steps: int,
        screen_time: float,  # hours
        sedentary_hours: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Compute activity balance score.
        """
        # Estimate sedentary time if not provided
        # Assume 16 waking hours minus active time
        if sedentary_hours is None:
            active_hours = exercise_duration + (steps / 5000)  # ~5000 steps/hour walking
            sedentary_hours = max(0, 16 - active_hours)
        
        # Activity ratio
        total_waking = 16  # hours
        active_ratio = (exercise_duration + (steps / 10000)) / total_waking
        sedentary_ratio = sedentary_hours / total_waking
        
        # Screen time penalty
        screen_penalty = max(0, (screen_time - 4) * 5)  # Penalty for >4 hours
        
        # Calculate balance score
        # Optimal: 30+ min exercise, 7500+ steps, <6 hours screen
        exercise_score = min(100, exercise_duration * 200)  # 0.5 hours = 100
        steps_score = min(100, steps / 100)  # 10000 steps = 100
        screen_score = max(0, 100 - screen_time * 10)  # <4 hours = good
        
        balance_score = (
            exercise_score * 0.4 +
            steps_score * 0.35 +
            screen_score * 0.25
        ) - screen_penalty
        
        balance_score = max(0, min(100, balance_score))
        
        # Detect anomalies
        anomalies = []
        
        if exercise_duration < 0.25 and steps < 5000:
            anomalies.append({
                'type': 'low_activity',
                'severity': 'medium',
                'description': 'Very low physical activity today'
            })
        
        if screen_time > 10:
            anomalies.append({
                'type': 'excessive_screen_time',
                'severity': 'high',
                'description': f'Screen time ({screen_time:.1f}h) significantly exceeds recommended limits'
            })
        elif screen_time > 6:
            anomalies.append({
                'type': 'high_screen_time',
                'severity': 'medium',
                'description': f'Screen time ({screen_time:.1f}h) exceeds recommended limits'
            })
        
        if sedentary_ratio > 0.75:
            anomalies.append({
                'type': 'high_sedentary',
                'severity': 'medium',
                'description': 'Majority of waking hours were sedentary'
            })
        
        return {
            'score': round(balance_score, 1),
            'active_ratio': round(active_ratio, 3),
            'sedentary_ratio': round(sedentary_ratio, 3),
            'components': {
                'exercise': exercise_score,
                'steps': steps_score,
                'screen': screen_score
            },
            'anomalies': anomalies,
            'is_anomaly': len(anomalies) > 0,
            'interpretation': self._interpret(balance_score)
        }
    
    def _interpret(self, score: float) -> str:
        if score >= 80:
            return 'excellent_balance'
        elif score >= 60:
            return 'good_balance'
        elif score >= 40:
            return 'moderate_imbalance'
        else:
            return 'poor_balance'


class RestingHRTrendAnalyzer:
    """
    Feature 5: Resting Heart Rate Trend
    
    Tracks cardiovascular fitness and health trends:
    - Declining resting HR indicates improving fitness
    - Rising resting HR may indicate overtraining, illness, or stress
    
    Detection Approach: Time-series trend analysis
    """
    
    def __init__(self, window_days: int = 14):
        self.window_days = window_days
        self.user_history: Dict[str, List[float]] = {}
        
    def analyze_trend(
        self,
        user_id: str,
        resting_hr_history: List[float]
    ) -> Dict[str, Any]:
        """
        Analyze resting HR trend.
        """
        if len(resting_hr_history) < 5:
            return {
                'trend': 'unknown',
                'has_sufficient_data': False
            }
        
        # Use last N days
        recent = resting_hr_history[-self.window_days:]
        
        # Linear regression for trend
        x = np.arange(len(recent))
        slope, intercept, r_value, p_value, std_err = stats.linregress(x, recent)
        
        # Calculate trend magnitude (bpm per week)
        bpm_per_week = slope * 7
        
        # Determine trend direction
        if abs(bpm_per_week) < 1:
            trend = 'stable'
            severity = 'none'
        elif bpm_per_week < -2:
            trend = 'improving'
            severity = 'none'
        elif bpm_per_week < -1:
            trend = 'slightly_improving'
            severity = 'none'
        elif bpm_per_week > 3:
            trend = 'concerning_increase'
            severity = 'high'
        elif bpm_per_week > 1.5:
            trend = 'increasing'
            severity = 'medium'
        else:
            trend = 'slightly_increasing'
            severity = 'low'
        
        # Check for sudden changes
        last_3_avg = np.mean(recent[-3:])
        earlier_avg = np.mean(recent[:-3])
        sudden_change = abs(last_3_avg - earlier_avg) > 5
        
        anomalies = []
        if severity in ['medium', 'high']:
            anomalies.append({
                'type': 'rising_resting_hr',
                'change_per_week': bpm_per_week,
                'severity': severity,
                'description': f'Resting heart rate increasing by {bpm_per_week:.1f} bpm/week'
            })
        
        if sudden_change and last_3_avg > earlier_avg:
            anomalies.append({
                'type': 'sudden_hr_increase',
                'recent_avg': last_3_avg,
                'earlier_avg': earlier_avg,
                'severity': 'medium',
                'description': f'Sudden increase in resting HR from {earlier_avg:.0f} to {last_3_avg:.0f} bpm'
            })
        
        return {
            'trend': trend,
            'bpm_change_per_week': round(bpm_per_week, 2),
            'current_avg': round(np.mean(recent), 1),
            'trend_strength': abs(r_value),
            'anomalies': anomalies,
            'is_anomaly': len(anomalies) > 0,
            'has_sufficient_data': True
        }


class CircadianDisruptionAnalyzer:
    """
    Feature 6: Circadian Disruption Score
    
    Measures deviation from natural circadian rhythms:
    - Late night activity
    - Irregular meal times
    - Sleep schedule consistency with light/dark cycle
    - Social jetlag
    
    Detection Approach: Rule-based + Pattern matching
    """
    
    def compute_disruption(
        self,
        bed_time: str,  # HH:MM format
        wake_time: str,
        sleep_hours: float,
        meal_times: List[str],
        screen_time_after_9pm: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Compute circadian disruption score (0-100, higher = more disruption).
        """
        disruption_factors = []
        
        # Parse times
        def parse_time(t: str) -> float:
            parts = t.split(':')
            return int(parts[0]) + int(parts[1]) / 60
        
        bed_hour = parse_time(bed_time)
        wake_hour = parse_time(wake_time)
        
        # Adjust for past midnight
        if bed_hour < 12:
            bed_hour += 24
        
        # 1. Late bedtime disruption
        # Optimal: 21:00-23:00
        if bed_hour > 25:  # After 1 AM
            disruption_factors.append({'factor': 'very_late_bedtime', 'score': 30})
        elif bed_hour > 24:  # After midnight
            disruption_factors.append({'factor': 'late_bedtime', 'score': 20})
        elif bed_hour > 23:  # After 11 PM
            disruption_factors.append({'factor': 'slightly_late_bedtime', 'score': 10})
        
        # 2. Early wake (before natural light)
        if wake_hour < 5:
            disruption_factors.append({'factor': 'very_early_wake', 'score': 15})
        
        # 3. Late wake (social jetlag risk)
        if wake_hour > 10:
            disruption_factors.append({'factor': 'late_wake', 'score': 20})
        elif wake_hour > 9:
            disruption_factors.append({'factor': 'slightly_late_wake', 'score': 10})
        
        # 4. Short sleep (circadian misalignment often causes this)
        if sleep_hours < 5:
            disruption_factors.append({'factor': 'severe_sleep_deficit', 'score': 25})
        elif sleep_hours < 6:
            disruption_factors.append({'factor': 'sleep_deficit', 'score': 15})
        
        # 5. Irregular meal timing
        if meal_times:
            meal_hours = [parse_time(m) for m in meal_times]
            
            # Check for very late eating (after 9 PM)
            late_meals = [h for h in meal_hours if h > 21 or h < 5]
            if late_meals:
                disruption_factors.append({'factor': 'late_eating', 'score': 15})
            
            # Check for skipped meals or irregular gaps
            if len(meal_times) < 2:
                disruption_factors.append({'factor': 'irregular_meals', 'score': 10})
        
        # 6. Late screen time
        if screen_time_after_9pm is not None and screen_time_after_9pm > 2:
            disruption_factors.append({'factor': 'evening_screen_exposure', 'score': 15})
        
        # Calculate total disruption score
        total_score = sum(f['score'] for f in disruption_factors)
        total_score = min(100, total_score)
        
        # Determine severity
        if total_score >= 50:
            severity = 'high'
            interpretation = 'significant_circadian_disruption'
        elif total_score >= 30:
            severity = 'medium'
            interpretation = 'moderate_circadian_disruption'
        elif total_score >= 15:
            severity = 'low'
            interpretation = 'mild_circadian_disruption'
        else:
            severity = 'none'
            interpretation = 'aligned_with_circadian_rhythm'
        
        return {
            'disruption_score': total_score,
            'severity': severity,
            'interpretation': interpretation,
            'factors': disruption_factors,
            'is_anomaly': total_score >= 30,
            'recommendations': self._generate_recommendations(disruption_factors)
        }
    
    def _generate_recommendations(self, factors: List[Dict]) -> List[str]:
        """Generate recommendations based on disruption factors."""
        recommendations = []
        
        factor_names = [f['factor'] for f in factors]
        
        if 'very_late_bedtime' in factor_names or 'late_bedtime' in factor_names:
            recommendations.append('Try to get to bed 30 minutes earlier this week')
        
        if 'late_wake' in factor_names:
            recommendations.append('Set a consistent wake time, even on weekends')
        
        if 'late_eating' in factor_names:
            recommendations.append('Avoid eating within 3 hours of bedtime')
        
        if 'evening_screen_exposure' in factor_names:
            recommendations.append('Reduce screen time after 9 PM or use blue light filters')
        
        if 'sleep_deficit' in factor_names or 'severe_sleep_deficit' in factor_names:
            recommendations.append('Prioritize getting 7-8 hours of sleep tonight')
        
        return recommendations


class EnhancedFeatureExtractor:
    """
    Master class that coordinates all enhanced feature extraction.
    """
    
    def __init__(self):
        self.hr_analyzer = HeartRateAnalyzer()
        self.sleep_consistency = SleepConsistencyAnalyzer()
        self.recovery_calculator = RecoveryScoreCalculator()
        self.activity_balance = ActivityBalanceAnalyzer()
        self.hr_trend = RestingHRTrendAnalyzer()
        self.circadian = CircadianDisruptionAnalyzer()
        
    def extract_all_features(
        self,
        user_id: str,
        current_data: Dict[str, Any],
        historical_data: Optional[List[Dict]] = None,
        hr_samples: Optional[List[float]] = None
    ) -> Dict[str, Any]:
        """
        Extract all enhanced features from user data.
        """
        features = {}
        all_anomalies = []
        
        # 1. Heart Rate Analysis
        if hr_samples:
            hr_result = self.hr_analyzer.analyze(user_id, hr_samples)
            features['heart_rate'] = hr_result
            if hr_result.get('is_anomaly'):
                all_anomalies.extend(hr_result.get('anomalies', []))
        
        # 2. Sleep Consistency
        if historical_data and len(historical_data) >= 3:
            sleep_records = [
                {
                    'sleep_hours': r.get('sleep_hours'),
                    'bed_time': r.get('bed_time'),
                    'wake_time': r.get('wake_up_time')
                }
                for r in historical_data if r.get('sleep_hours') is not None
            ]
            consistency = self.sleep_consistency.compute_consistency(sleep_records)
            features['sleep_consistency'] = consistency
            if consistency.get('is_anomaly'):
                all_anomalies.extend(consistency.get('anomalies', []))
        
        # 3. Recovery Score
        recovery = self.recovery_calculator.compute_recovery(
            sleep_hours=current_data.get('sleep_hours', 7),
            hrv_score=features.get('heart_rate', {}).get('metrics', {}).get('recovery_index'),
            previous_exercise_hours=current_data.get('previous_exercise', 0),
            stress_level=current_data.get('stress_level', 5)
        )
        features['recovery'] = recovery
        if recovery.get('is_anomaly'):
            all_anomalies.append({
                'type': 'low_recovery',
                'score': recovery['score'],
                'severity': 'medium',
                'description': f"Recovery score is low ({recovery['score']:.0f}/100)"
            })
        
        # 4. Activity Balance
        balance = self.activity_balance.compute_balance(
            exercise_duration=current_data.get('exercise_duration', 0),
            steps=current_data.get('steps', 0),
            screen_time=current_data.get('screen_time', 0)
        )
        features['activity_balance'] = balance
        if balance.get('is_anomaly'):
            all_anomalies.extend(balance.get('anomalies', []))
        
        # 5. Resting HR Trend
        if historical_data:
            hr_history = [r.get('heart_rate_resting') for r in historical_data 
                         if r.get('heart_rate_resting') is not None]
            if len(hr_history) >= 5:
                trend = self.hr_trend.analyze_trend(user_id, hr_history)
                features['resting_hr_trend'] = trend
                if trend.get('is_anomaly'):
                    all_anomalies.extend(trend.get('anomalies', []))
        
        # 6. Circadian Disruption
        circadian = self.circadian.compute_disruption(
            bed_time=current_data.get('bed_time', '23:00'),
            wake_time=current_data.get('wake_up_time', '07:00'),
            sleep_hours=current_data.get('sleep_hours', 7),
            meal_times=current_data.get('meal_times', [])
        )
        features['circadian'] = circadian
        if circadian.get('is_anomaly'):
            all_anomalies.append({
                'type': 'circadian_disruption',
                'score': circadian['disruption_score'],
                'severity': circadian['severity'],
                'description': f"Circadian rhythm disruption detected (score: {circadian['disruption_score']})"
            })
        
        # Compute overall enhanced health score
        component_scores = [
            features.get('recovery', {}).get('score', 50),
            100 - features.get('circadian', {}).get('disruption_score', 0),
            features.get('activity_balance', {}).get('score', 50),
            features.get('sleep_consistency', {}).get('score', 50)
        ]
        
        overall_score = np.mean([s for s in component_scores if s is not None])
        
        return {
            'features': features,
            'enhanced_health_score': round(overall_score, 1),
            'anomalies': all_anomalies,
            'is_anomaly': len(all_anomalies) > 0,
            'anomaly_count': len(all_anomalies),
            'timestamp': datetime.now().isoformat()
        }


# Singleton instance
enhanced_extractor = EnhancedFeatureExtractor()

def get_enhanced_extractor() -> EnhancedFeatureExtractor:
    """Get the singleton enhanced feature extractor."""
    return enhanced_extractor

