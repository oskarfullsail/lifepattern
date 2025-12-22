"""
Adaptive Threshold Learning Module for Data-Driven Anomaly Detection

This module replaces hardcoded thresholds with statistically-derived, 
personalized thresholds based on population baselines and individual user data.

Supports three modes:
- "literature": Use thresholds derived from CDC/WHO/AHA guidelines (default)
- "pretrained": Load thresholds trained from public datasets (FitBit, PPG-DaLiA, etc.)
- "hybrid": Start with pretrained, fall back to literature if unavailable

Academic Justification:
- Population baselines derived from public health datasets establish 
  scientifically-grounded default thresholds
- Adaptive Z-score normalization adjusts for individual variation
- Percentile-based thresholds (IQR method) are robust to outliers
- Time-series analysis captures circadian and weekly rhythms

References:
- Chandola, V., Banerjee, A., & Kumar, V. (2009). Anomaly detection: A survey.
- Goldstein, M., & Uchida, S. (2016). A comparative evaluation of unsupervised 
  anomaly detection algorithms for multivariate data.
"""

import os
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple, Literal
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from scipy import stats
from sklearn.preprocessing import StandardScaler, RobustScaler
from sklearn.ensemble import IsolationForest
from sklearn.covariance import EllipticEnvelope
import logging
import json
import joblib

logger = logging.getLogger(__name__)

# Type alias for threshold modes
ThresholdMode = Literal["literature", "pretrained", "hybrid"]


@dataclass
class ThresholdConfig:
    """
    Configuration for threshold source and behavior.
    
    Modes:
    - "literature": Use hardcoded thresholds from medical literature (CDC, WHO, AHA)
    - "pretrained": Load thresholds from trained dataset artifacts
    - "hybrid": Use pretrained if available, fall back to literature
    
    Usage:
        # Use pretrained baselines
        config = ThresholdConfig(
            mode="pretrained",
            pretrained_path="pretrained/baselines.json"
        )
        baseline = PopulationBaseline(config)
        
        # Use hybrid mode (recommended for production)
        config = ThresholdConfig(mode="hybrid")
        baseline = PopulationBaseline(config)
    """
    mode: ThresholdMode = "hybrid"
    pretrained_baselines_path: Optional[str] = None
    pretrained_model_path: Optional[str] = None
    fallback_to_literature: bool = True
    
    def __post_init__(self):
        # Set default paths if not provided
        if self.pretrained_baselines_path is None:
            default_path = Path(__file__).parent.parent / "pretrained" / "baselines.json"
            if default_path.exists():
                self.pretrained_baselines_path = str(default_path)
        
        if self.pretrained_model_path is None:
            default_path = Path(__file__).parent.parent / "pretrained" / "isolation_forest.pkl"
            if default_path.exists():
                self.pretrained_model_path = str(default_path)


class PopulationBaseline:
    """
    Population-level baseline thresholds derived from public health research
    or trained from public datasets.
    
    Supports three modes:
    - Literature: Static values from CDC/WHO/AHA guidelines
    - Pretrained: Loaded from trained dataset artifacts
    - Hybrid: Use pretrained with literature fallback
    
    These serve as initial priors before sufficient user data is collected.
    """
    
    # Literature-based defaults (CDC/WHO/AHA guidelines)
    LITERATURE_BASELINES = {
        # Sleep (hours) - Based on CDC recommendations and sleep research
        'sleep_hours': {
            'optimal_min': 7.0,
            'optimal_max': 9.0,
            'warning_low': 6.0,
            'warning_high': 10.0,
            'critical_low': 5.0,
            'critical_high': 11.0,
            'population_mean': 7.5,
            'population_std': 1.2
        },
        
        # Heart Rate (bpm) - Based on AHA guidelines
        'heart_rate': {
            'resting_min': 60,
            'resting_max': 100,
            'optimal_min': 60,
            'optimal_max': 80,
            'warning_low': 50,
            'warning_high': 100,
            'critical_low': 40,
            'critical_high': 120,
            'population_mean': 72,
            'population_std': 12
        },
        
        # Heart Rate Variability (ms RMSSD) - Based on clinical studies
        'heart_rate_variability': {
            'optimal_min': 20,
            'optimal_max': 70,
            'warning_low': 15,
            'warning_high': 100,
            'population_mean': 42,
            'population_std': 15
        },
        
        # Steps per day - Based on physical activity guidelines
        'steps': {
            'sedentary_max': 5000,
            'low_active_min': 5000,
            'somewhat_active_min': 7500,
            'active_min': 10000,
            'highly_active_min': 12500,
            'optimal_min': 7500,
            'optimal_max': 15000,
            'warning_low': 3000,
            'warning_high': 25000,
            'population_mean': 7500,
            'population_std': 3000
        },
        
        # For backward compatibility
        'daily_steps': {
            'sedentary_max': 5000,
            'low_active_min': 5000,
            'somewhat_active_min': 7500,
            'active_min': 10000,
            'highly_active_min': 12500,
            'population_mean': 7500,
            'population_std': 3000
        },
        
        # Screen Time (hours) - Based on digital wellness research
        'screen_time': {
            'optimal_min': 0,
            'optimal_max': 4.0,
            'warning_low': 0,
            'warning_high': 6.0,
            'critical_low': 0,
            'critical_high': 10.0,
            'population_mean': 5.5,
            'population_std': 2.5
        },
        
        # Stress Level (1-10 scale) - Based on PSS research
        'stress_level': {
            'low_max': 3,
            'moderate_max': 6,
            'high_min': 7,
            'critical_min': 8,
            'optimal_min': 1,
            'optimal_max': 4,
            'warning_low': 1,
            'warning_high': 7,
            'critical_low': 1,
            'critical_high': 9,
            'population_mean': 4.5,
            'population_std': 2.0
        },
        
        # Exercise Duration (hours) - Based on WHO guidelines (150-300 min/week)
        'exercise_duration': {
            'optimal_min': 0.35,  # ~21 min/day
            'optimal_max': 2.0,
            'ideal_daily': 0.5,  # 30 min/day
            'warning_low': 0,
            'warning_high': 3.0,
            'population_mean': 0.4,
            'population_std': 0.3
        },
        
        # Water Intake (liters) - Based on hydration research
        'water_intake': {
            'optimal_min': 2.0,
            'optimal_max': 3.5,
            'warning_low': 1.5,
            'warning_high': 4.5,
            'population_mean': 2.2,
            'population_std': 0.6
        },
        
        # Wake Time Consistency (hour of day) - Circadian research
        'wake_time': {
            'optimal_min': 6,
            'optimal_max': 8,
            'warning_low': 4,
            'warning_high': 10,
            'population_mean': 7,
            'population_std': 1.5
        },
        
        # Bed Time (hour of day, 24h format)
        'bed_time': {
            'optimal_min': 21,  # 9 PM
            'optimal_max': 23,  # 11 PM
            'warning_low': 20,
            'warning_high': 24,  # Midnight
            'population_mean': 22.5,
            'population_std': 1.5
        },
        
        # Active Energy (calories) - From wearable studies
        'active_energy': {
            'optimal_min': 200,
            'optimal_max': 800,
            'warning_low': 100,
            'warning_high': 1500,
            'population_mean': 350,
            'population_std': 200
        },
        
        # Sleep quality (0-100 percentage)
        'sleep_quality': {
            'optimal_min': 75,
            'optimal_max': 100,
            'warning_low': 60,
            'warning_high': 100,
            'population_mean': 78,
            'population_std': 12
        },
        
        # Resting heart rate
        'heart_rate_resting': {
            'optimal_min': 50,
            'optimal_max': 70,
            'warning_low': 40,
            'warning_high': 90,
            'population_mean': 65,
            'population_std': 10
        }
    }
    
    def __init__(self, config: Optional[ThresholdConfig] = None):
        """
        Initialize population baselines.
        
        Args:
            config: Configuration for threshold source. Defaults to hybrid mode.
        """
        self.config = config or ThresholdConfig()
        self._baselines: Dict[str, Dict[str, float]] = {}
        self._pretrained_loaded = False
        self._source = "literature"
        
        self._load_baselines()
    
    def _load_baselines(self) -> None:
        """Load baselines based on configuration mode."""
        
        # Start with literature defaults
        self._baselines = {k: v.copy() for k, v in self.LITERATURE_BASELINES.items()}
        
        if self.config.mode in ("pretrained", "hybrid"):
            self._try_load_pretrained()
        
        # Set properties for backward compatibility
        self._set_properties()
    
    def _try_load_pretrained(self) -> bool:
        """Attempt to load pretrained baselines from file."""
        
        if not self.config.pretrained_baselines_path:
            logger.debug("No pretrained baselines path configured")
            return False
        
        path = Path(self.config.pretrained_baselines_path)
        if not path.exists():
            logger.info(f"Pretrained baselines not found at {path}")
            if self.config.mode == "pretrained" and not self.config.fallback_to_literature:
                raise FileNotFoundError(f"Pretrained baselines required but not found: {path}")
            return False
        
        try:
            with open(path, 'r') as f:
                pretrained = json.load(f)
            
            # Merge pretrained into baselines
            for metric, values in pretrained.items():
                if metric in self._baselines:
                    # Update existing with pretrained values
                    self._baselines[metric].update(values)
                else:
                    self._baselines[metric] = values
            
            self._pretrained_loaded = True
            self._source = "pretrained" if self.config.mode == "pretrained" else "hybrid"
            logger.info(f"Loaded pretrained baselines from {path}: {len(pretrained)} metrics")
            return True
            
        except Exception as e:
            logger.warning(f"Failed to load pretrained baselines: {e}")
            if self.config.mode == "pretrained" and not self.config.fallback_to_literature:
                raise
            return False
    
    def _set_properties(self) -> None:
        """Set class properties for backward compatibility with dataclass-style access."""
        for metric, values in self._baselines.items():
            setattr(self, metric, values)
    
    def get(self, metric: str, default: Any = None) -> Optional[Dict[str, float]]:
        """Get baseline for a metric."""
        return self._baselines.get(metric, default)
    
    def __getattr__(self, name: str) -> Optional[Dict[str, float]]:
        """Allow attribute-style access to metrics."""
        if name.startswith('_') or name in ('config', 'LITERATURE_BASELINES'):
            raise AttributeError(f"'{type(self).__name__}' object has no attribute '{name}'")
        return self._baselines.get(name)
    
    def get_threshold(
        self, 
        metric: str, 
        threshold_type: str = 'warning'
    ) -> Tuple[float, float]:
        """
        Get threshold bounds for a metric.
        
        Args:
            metric: Name of the metric
            threshold_type: 'optimal', 'warning', or 'critical'
            
        Returns:
            Tuple of (lower_bound, upper_bound)
        """
        baseline = self._baselines.get(metric)
        if baseline is None:
            return (0.0, float('inf'))
        
        if threshold_type == 'optimal':
            lower = baseline.get('optimal_min', 0)
            upper = baseline.get('optimal_max', float('inf'))
        elif threshold_type == 'critical':
            lower = baseline.get('critical_low', baseline.get('warning_low', 0))
            upper = baseline.get('critical_high', baseline.get('warning_high', float('inf')))
        else:  # warning
            lower = baseline.get('warning_low', baseline.get('optimal_min', 0))
            upper = baseline.get('warning_high', baseline.get('optimal_max', float('inf')))
        
        return (lower, upper)
    
    def get_statistics(self, metric: str) -> Tuple[float, float]:
        """
        Get population mean and std for a metric.
        
        Returns:
            Tuple of (mean, std)
        """
        baseline = self._baselines.get(metric, {})
        return (
            baseline.get('population_mean', 0),
            baseline.get('population_std', 1)
        )
    
    @property
    def source(self) -> str:
        """Get the source of current baselines."""
        return self._source
    
    @property
    def is_pretrained(self) -> bool:
        """Check if pretrained baselines are loaded."""
        return self._pretrained_loaded
    
    def to_dict(self) -> Dict[str, Dict[str, float]]:
        """Export all baselines as dictionary."""
        return self._baselines.copy()
    
    def list_metrics(self) -> List[str]:
        """List all available metrics."""
        return list(self._baselines.keys())


class AdaptiveThresholdLearner:
    """
    Learns personalized anomaly thresholds by combining:
    1. Population-level baselines (priors) - from literature or pretrained
    2. Individual historical data (personal baselines)
    3. Temporal patterns (circadian rhythms, weekly cycles)
    
    Uses Bayesian-inspired approach: as more user data is collected,
    thresholds shift from population priors to personalized estimates.
    """
    
    def __init__(
        self, 
        min_samples_for_personalization: int = 7,
        adaptation_rate: float = 0.1,
        anomaly_sensitivity: float = 2.0,  # Z-score threshold
        config: Optional[ThresholdConfig] = None
    ):
        self.config = config or ThresholdConfig()
        self.population_baseline = PopulationBaseline(self.config)
        self.min_samples = min_samples_for_personalization
        self.adaptation_rate = adaptation_rate
        self.anomaly_sensitivity = anomaly_sensitivity
        
        # User-specific learned thresholds
        self.user_baselines: Dict[str, Dict[str, Any]] = {}
        
        # Feature scalers for each user
        self.user_scalers: Dict[str, StandardScaler] = {}
        
        # Isolation Forest models per user
        self.user_isolation_forests: Dict[str, IsolationForest] = {}
        
        # Pretrained Isolation Forest (loaded from file)
        self.pretrained_isolation_forest: Optional[IsolationForest] = None
        self.pretrained_scaler: Optional[RobustScaler] = None
        self.pretrained_features: List[str] = []
        
        # Try to load pretrained model
        self._try_load_pretrained_model()
    
    def _try_load_pretrained_model(self) -> bool:
        """Attempt to load pretrained Isolation Forest model."""
        
        if not self.config.pretrained_model_path:
            return False
        
        path = Path(self.config.pretrained_model_path)
        if not path.exists():
            logger.debug(f"Pretrained model not found at {path}")
            return False
        
        try:
            model_data = joblib.load(path)
            self.pretrained_isolation_forest = model_data.get('isolation_forest')
            self.pretrained_scaler = model_data.get('scaler')
            self.pretrained_features = model_data.get('features', [])
            
            logger.info(f"Loaded pretrained Isolation Forest from {path}")
            return True
            
        except Exception as e:
            logger.warning(f"Failed to load pretrained model: {e}")
            return False
    
    def predict_with_pretrained(
        self, 
        data: Dict[str, float]
    ) -> Optional[Dict[str, Any]]:
        """
        Predict anomaly using pretrained Isolation Forest.
        
        Returns None if pretrained model not available.
        """
        if self.pretrained_isolation_forest is None:
            return None
        
        # Build feature vector
        features = []
        for feat in self.pretrained_features:
            val = data.get(feat)
            if val is None:
                # Can't make prediction with missing features
                return None
            features.append(float(val))
        
        X = np.array([features])
        
        if self.pretrained_scaler:
            X = self.pretrained_scaler.transform(X)
        
        score = self.pretrained_isolation_forest.decision_function(X)[0]
        prediction = self.pretrained_isolation_forest.predict(X)[0]
        
        return {
            'is_anomaly': prediction == -1,
            'score': float(score),
            'method': 'pretrained_isolation_forest'
        }
        
    def get_threshold(
        self, 
        user_id: str, 
        metric: str, 
        threshold_type: str = 'warning'
    ) -> Tuple[float, float]:
        """
        Get adaptive threshold for a metric.
        
        Returns (lower_bound, upper_bound) tuple.
        Uses weighted combination of population and personal baselines.
        """
        # Get population baseline
        pop_baseline = getattr(self.population_baseline, metric, None)
        if pop_baseline is None:
            logger.warning(f"No population baseline for metric: {metric}")
            return (0.0, float('inf'))
        
        # Check if user has personalized baseline
        if user_id in self.user_baselines and metric in self.user_baselines[user_id]:
            user_data = self.user_baselines[user_id][metric]
            n_samples = user_data.get('n_samples', 0)
            
            # Compute personalization weight (0 to 1)
            # More samples = more weight on personal data
            personal_weight = min(n_samples / (self.min_samples * 3), 0.8)
            pop_weight = 1 - personal_weight
            
            # Blend population and personal statistics
            mean = (pop_weight * pop_baseline['population_mean'] + 
                    personal_weight * user_data['mean'])
            std = (pop_weight * pop_baseline['population_std'] + 
                   personal_weight * user_data['std'])
            
            # Calculate thresholds based on Z-scores
            if threshold_type == 'warning':
                z = 1.5
            elif threshold_type == 'critical':
                z = 2.5
            else:
                z = 1.0
            
            lower = mean - z * std
            upper = mean + z * std
            
            logger.debug(f"Personalized threshold for {metric}: [{lower:.2f}, {upper:.2f}]")
            return (lower, upper)
        
        # Fall back to population baseline
        if threshold_type == 'warning':
            lower = pop_baseline.get('warning_low', pop_baseline.get('optimal_min', 0))
            upper = pop_baseline.get('warning_high', pop_baseline.get('optimal_max', float('inf')))
        elif threshold_type == 'critical':
            lower = pop_baseline.get('critical_low', pop_baseline.get('warning_low', 0))
            upper = pop_baseline.get('critical_high', pop_baseline.get('warning_high', float('inf')))
        else:
            lower = pop_baseline.get('optimal_min', 0)
            upper = pop_baseline.get('optimal_max', float('inf'))
            
        return (lower, upper)
    
    def update_user_baseline(
        self, 
        user_id: str, 
        historical_data: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Update user's personalized baseline from historical data.
        
        Uses exponential moving average for online learning.
        """
        if len(historical_data) < self.min_samples:
            logger.info(f"Insufficient data for user {user_id}: {len(historical_data)} samples")
            return {}
        
        df = pd.DataFrame(historical_data)
        
        if user_id not in self.user_baselines:
            self.user_baselines[user_id] = {}
        
        metrics = [
            'sleep_hours', 'screen_time', 'exercise_duration', 
            'water_intake', 'stress_level', 'wake_up_hour', 
            'bed_time_hour', 'heart_rate', 'heart_rate_variability',
            'steps', 'health_score'
        ]
        
        for metric in metrics:
            if metric in df.columns:
                values = df[metric].dropna()
                if len(values) >= 3:
                    # Compute robust statistics (resistant to outliers)
                    q25, q50, q75 = np.percentile(values, [25, 50, 75])
                    iqr = q75 - q25
                    
                    # Winsorized mean (trimmed mean for robustness)
                    lower_bound = q25 - 1.5 * iqr
                    upper_bound = q75 + 1.5 * iqr
                    trimmed = values[(values >= lower_bound) & (values <= upper_bound)]
                    
                    self.user_baselines[user_id][metric] = {
                        'mean': float(trimmed.mean() if len(trimmed) > 0 else values.mean()),
                        'std': float(trimmed.std() if len(trimmed) > 1 else values.std()),
                        'median': float(q50),
                        'q25': float(q25),
                        'q75': float(q75),
                        'iqr': float(iqr),
                        'min': float(values.min()),
                        'max': float(values.max()),
                        'n_samples': len(values),
                        'last_updated': datetime.now().isoformat()
                    }
        
        logger.info(f"Updated baseline for user {user_id} with {len(historical_data)} samples")
        return self.user_baselines[user_id]
    
    def detect_anomaly_statistical(
        self, 
        user_id: str, 
        current_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Detect anomalies using adaptive statistical thresholds.
        
        Returns detailed anomaly analysis with per-feature scores.
        """
        anomalies = []
        feature_scores = {}
        total_anomaly_score = 0.0
        checked_features = 0
        
        metrics_config = {
            'sleep_hours': {'inverse': False, 'weight': 1.5},
            'screen_time': {'inverse': True, 'weight': 1.0},
            'exercise_duration': {'inverse': False, 'weight': 1.0},
            'water_intake': {'inverse': False, 'weight': 0.8},
            'stress_level': {'inverse': True, 'weight': 1.2},
            'heart_rate': {'inverse': False, 'weight': 1.5},
            'steps': {'inverse': False, 'weight': 1.0},
        }
        
        for metric, config in metrics_config.items():
            if metric not in current_data:
                continue
                
            value = current_data[metric]
            warning_bounds = self.get_threshold(user_id, metric, 'warning')
            critical_bounds = self.get_threshold(user_id, metric, 'critical')
            
            # Get baseline stats for Z-score calculation
            pop_baseline = getattr(self.population_baseline, metric, None)
            user_baseline = (self.user_baselines.get(user_id, {}).get(metric, {}) 
                           if user_id in self.user_baselines else {})
            
            # Calculate personalized mean and std
            if user_baseline:
                mean = user_baseline.get('mean', pop_baseline['population_mean'] if pop_baseline else value)
                std = user_baseline.get('std', pop_baseline['population_std'] if pop_baseline else 1)
            elif pop_baseline:
                mean = pop_baseline['population_mean']
                std = pop_baseline['population_std']
            else:
                mean = value
                std = 1
            
            # Calculate Z-score
            z_score = (value - mean) / std if std > 0 else 0
            
            # Determine anomaly severity
            if config['inverse']:
                # Higher is worse (e.g., stress, screen time)
                if value > critical_bounds[1]:
                    severity = 'high'
                    anomaly_score = min(abs(z_score) / 3.0, 1.0)
                elif value > warning_bounds[1]:
                    severity = 'medium'
                    anomaly_score = min(abs(z_score) / 4.0, 0.7)
                else:
                    severity = None
                    anomaly_score = 0
            else:
                # Check both bounds
                if value < critical_bounds[0] or value > critical_bounds[1]:
                    severity = 'high'
                    anomaly_score = min(abs(z_score) / 3.0, 1.0)
                elif value < warning_bounds[0] or value > warning_bounds[1]:
                    severity = 'medium'
                    anomaly_score = min(abs(z_score) / 4.0, 0.7)
                else:
                    severity = None
                    anomaly_score = 0
            
            feature_scores[metric] = {
                'value': value,
                'z_score': z_score,
                'mean': mean,
                'std': std,
                'warning_bounds': warning_bounds,
                'critical_bounds': critical_bounds,
                'anomaly_score': anomaly_score,
                'severity': severity
            }
            
            if severity:
                anomalies.append({
                    'metric': metric,
                    'value': value,
                    'expected_range': warning_bounds,
                    'z_score': z_score,
                    'severity': severity,
                    'description': self._generate_anomaly_description(metric, value, mean, z_score)
                })
            
            total_anomaly_score += anomaly_score * config['weight']
            checked_features += config['weight']
        
        # Normalize total score
        overall_score = total_anomaly_score / checked_features if checked_features > 0 else 0
        
        return {
            'is_anomaly': overall_score > 0.3,
            'anomaly_score': overall_score,
            'severity': self._determine_overall_severity(overall_score),
            'anomalies': anomalies,
            'feature_scores': feature_scores,
            'method': 'adaptive_statistical',
            'personalization_level': self._get_personalization_level(user_id)
        }
    
    def _generate_anomaly_description(
        self, 
        metric: str, 
        value: float, 
        expected: float, 
        z_score: float
    ) -> str:
        """Generate human-readable anomaly description."""
        direction = "above" if z_score > 0 else "below"
        deviation = abs(z_score)
        
        metric_names = {
            'sleep_hours': 'sleep duration',
            'screen_time': 'screen time',
            'exercise_duration': 'exercise duration',
            'water_intake': 'water intake',
            'stress_level': 'stress level',
            'heart_rate': 'heart rate',
            'steps': 'step count'
        }
        
        name = metric_names.get(metric, metric)
        
        if deviation > 3:
            severity_text = "significantly"
        elif deviation > 2:
            severity_text = "notably"
        else:
            severity_text = "slightly"
        
        return f"Your {name} ({value:.1f}) is {severity_text} {direction} your typical level ({expected:.1f})"
    
    def _determine_overall_severity(self, score: float) -> str:
        """Determine overall anomaly severity from score."""
        if score >= 0.7:
            return 'high'
        elif score >= 0.4:
            return 'medium'
        elif score >= 0.2:
            return 'low'
        return 'none'
    
    def _get_personalization_level(self, user_id: str) -> str:
        """Determine how personalized the thresholds are."""
        if user_id not in self.user_baselines:
            return 'population'
        
        user_data = self.user_baselines[user_id]
        if not user_data:
            return 'population'
        
        # Check average sample count across metrics
        sample_counts = [m.get('n_samples', 0) for m in user_data.values() if isinstance(m, dict)]
        avg_samples = np.mean(sample_counts) if sample_counts else 0
        
        if avg_samples >= self.min_samples * 3:
            return 'fully_personalized'
        elif avg_samples >= self.min_samples:
            return 'partially_personalized'
        return 'population'


class TimeSeriesAnomalyDetector:
    """
    Time-series aware anomaly detection that captures:
    1. Circadian rhythm deviations
    2. Weekly patterns
    3. Trend changes
    4. Sudden behavioral shifts
    """
    
    def __init__(self, window_size: int = 7):
        self.window_size = window_size
        self.user_patterns: Dict[str, Dict] = {}
        
    def learn_temporal_patterns(
        self, 
        user_id: str, 
        historical_data: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Learn user's temporal patterns from historical data.
        """
        if len(historical_data) < self.window_size:
            return {}
        
        df = pd.DataFrame(historical_data)
        
        # Parse dates if available
        if 'date' in df.columns:
            df['date'] = pd.to_datetime(df['date'])
            df['day_of_week'] = df['date'].dt.dayofweek
            df['is_weekend'] = df['day_of_week'].isin([5, 6])
        
        patterns = {}
        
        metrics = ['sleep_hours', 'exercise_duration', 'screen_time', 'stress_level']
        
        for metric in metrics:
            if metric not in df.columns:
                continue
                
            values = df[metric].dropna()
            if len(values) < self.window_size:
                continue
            
            # Calculate rolling statistics
            rolling_mean = values.rolling(window=self.window_size, min_periods=3).mean()
            rolling_std = values.rolling(window=self.window_size, min_periods=3).std()
            
            # Calculate weekday vs weekend patterns if date available
            weekday_pattern = None
            weekend_pattern = None
            if 'is_weekend' in df.columns:
                weekday_data = df[~df['is_weekend']][metric].dropna()
                weekend_data = df[df['is_weekend']][metric].dropna()
                
                if len(weekday_data) >= 3 and len(weekend_data) >= 2:
                    weekday_pattern = {
                        'mean': float(weekday_data.mean()),
                        'std': float(weekday_data.std())
                    }
                    weekend_pattern = {
                        'mean': float(weekend_data.mean()),
                        'std': float(weekend_data.std())
                    }
            
            # Detect trend
            if len(values) >= 7:
                recent = values.tail(3).mean()
                older = values.head(3).mean()
                trend = 'improving' if recent > older else 'declining' if recent < older else 'stable'
            else:
                trend = 'unknown'
            
            patterns[metric] = {
                'rolling_mean': float(rolling_mean.iloc[-1]) if len(rolling_mean) > 0 else None,
                'rolling_std': float(rolling_std.iloc[-1]) if len(rolling_std) > 0 else None,
                'weekday_pattern': weekday_pattern,
                'weekend_pattern': weekend_pattern,
                'trend': trend,
                'last_updated': datetime.now().isoformat()
            }
        
        self.user_patterns[user_id] = patterns
        return patterns
    
    def detect_temporal_anomaly(
        self, 
        user_id: str, 
        current_data: Dict[str, Any],
        is_weekend: bool = None
    ) -> Dict[str, Any]:
        """
        Detect anomalies considering temporal patterns.
        """
        if user_id not in self.user_patterns:
            return {'has_pattern_data': False, 'anomalies': []}
        
        patterns = self.user_patterns[user_id]
        anomalies = []
        
        for metric, pattern in patterns.items():
            if metric not in current_data:
                continue
            
            value = current_data[metric]
            
            # Use weekend/weekday specific patterns if available
            if is_weekend is not None and pattern.get('weekend_pattern') and pattern.get('weekday_pattern'):
                expected = pattern['weekend_pattern'] if is_weekend else pattern['weekday_pattern']
                mean = expected['mean']
                std = expected['std']
            elif pattern.get('rolling_mean') is not None:
                mean = pattern['rolling_mean']
                std = pattern.get('rolling_std', 1) or 1
            else:
                continue
            
            z_score = (value - mean) / std if std > 0 else 0
            
            if abs(z_score) > 2.0:
                anomalies.append({
                    'metric': metric,
                    'value': value,
                    'expected_mean': mean,
                    'z_score': z_score,
                    'pattern_type': 'weekend' if is_weekend else 'weekday',
                    'trend': pattern.get('trend', 'unknown')
                })
        
        return {
            'has_pattern_data': True,
            'anomalies': anomalies,
            'is_anomaly': len(anomalies) > 0
        }


class HybridAnomalyDetector:
    """
    Combines multiple anomaly detection methods:
    1. Adaptive statistical thresholds (with pretrained population baselines)
    2. Time-series pattern analysis
    3. Isolation Forest (per-user trained or pretrained from datasets)
    4. Multivariate analysis
    
    Supports configurable modes for threshold sources:
    - literature: Use CDC/WHO/AHA guidelines
    - pretrained: Use thresholds trained from public datasets
    - hybrid: Use pretrained with literature fallback (recommended)
    
    Uses ensemble voting for final decision.
    """
    
    def __init__(self, config: Optional[ThresholdConfig] = None):
        self.config = config or ThresholdConfig()
        self.adaptive_learner = AdaptiveThresholdLearner(config=self.config)
        self.temporal_detector = TimeSeriesAnomalyDetector()
        self.isolation_forests: Dict[str, IsolationForest] = {}
        
        # Track baseline source for metrics/logging
        self._baseline_source = self.adaptive_learner.population_baseline.source
        
    def train(self, user_id: str, historical_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Train all detection methods on user's historical data.
        """
        results = {
            'user_id': user_id,
            'training_samples': len(historical_data),
            'methods_trained': []
        }
        
        # Update adaptive thresholds
        baseline = self.adaptive_learner.update_user_baseline(user_id, historical_data)
        if baseline:
            results['methods_trained'].append('adaptive_statistical')
        
        # Learn temporal patterns
        patterns = self.temporal_detector.learn_temporal_patterns(user_id, historical_data)
        if patterns:
            results['methods_trained'].append('temporal_pattern')
        
        # Train Isolation Forest
        if len(historical_data) >= 10:
            features = self._extract_features(historical_data)
            if features is not None and len(features) >= 10:
                self.isolation_forests[user_id] = IsolationForest(
                    contamination=0.1,
                    random_state=42,
                    n_estimators=100
                )
                self.isolation_forests[user_id].fit(features)
                results['methods_trained'].append('isolation_forest')
        
        results['personalization_level'] = self.adaptive_learner._get_personalization_level(user_id)
        return results
    
    def detect(
        self, 
        user_id: str, 
        current_data: Dict[str, Any],
        is_weekend: bool = None
    ) -> Dict[str, Any]:
        """
        Run ensemble anomaly detection.
        
        Uses multiple methods and combines their votes:
        1. Adaptive statistical thresholds (population + user-personalized)
        2. Temporal pattern analysis (weekday/weekend, trends)
        3. Isolation Forest (user-specific or pretrained from datasets)
        """
        votes = []
        method_results = {}
        
        # Method 1: Adaptive Statistical
        stat_result = self.adaptive_learner.detect_anomaly_statistical(user_id, current_data)
        method_results['statistical'] = stat_result
        votes.append(stat_result['anomaly_score'])
        
        # Method 2: Temporal Pattern
        temporal_result = self.temporal_detector.detect_temporal_anomaly(
            user_id, current_data, is_weekend
        )
        method_results['temporal'] = temporal_result
        if temporal_result.get('has_pattern_data'):
            votes.append(1.0 if temporal_result['is_anomaly'] else 0.0)
        
        # Method 3: Isolation Forest (user-specific)
        if user_id in self.isolation_forests:
            features = self._extract_features([current_data])
            if features is not None and len(features) > 0:
                score = self.isolation_forests[user_id].decision_function(features)[0]
                is_anomaly = self.isolation_forests[user_id].predict(features)[0] == -1
                method_results['isolation_forest'] = {
                    'score': float(score),
                    'is_anomaly': is_anomaly,
                    'source': 'user_trained'
                }
                votes.append(1.0 if is_anomaly else 0.0)
        
        # Method 4: Pretrained Isolation Forest (if available and user model not trained)
        elif user_id not in self.isolation_forests:
            pretrained_result = self.adaptive_learner.predict_with_pretrained(current_data)
            if pretrained_result is not None:
                method_results['isolation_forest'] = {
                    'score': pretrained_result['score'],
                    'is_anomaly': pretrained_result['is_anomaly'],
                    'source': 'pretrained'
                }
                votes.append(1.0 if pretrained_result['is_anomaly'] else 0.0)
        
        # Ensemble decision
        avg_vote = np.mean(votes) if votes else 0
        
        # Aggregate anomalies from all methods
        all_anomalies = stat_result.get('anomalies', [])
        all_anomalies.extend(temporal_result.get('anomalies', []))
        
        # Deduplicate by metric
        seen_metrics = set()
        unique_anomalies = []
        for a in all_anomalies:
            if a['metric'] not in seen_metrics:
                seen_metrics.add(a['metric'])
                unique_anomalies.append(a)
        
        return {
            'is_anomaly': avg_vote > 0.4,
            'confidence': avg_vote,
            'severity': self._determine_severity(avg_vote),
            'anomalies': unique_anomalies,
            'method_results': method_results,
            'methods_used': list(method_results.keys()),
            'personalization_level': self.adaptive_learner._get_personalization_level(user_id),
            'baseline_source': self._baseline_source,
            'timestamp': datetime.now().isoformat()
        }
    
    def _extract_features(self, data: List[Dict]) -> Optional[np.ndarray]:
        """Extract feature matrix from data records."""
        feature_cols = [
            'sleep_hours', 'screen_time', 'exercise_duration',
            'water_intake', 'stress_level', 'heart_rate', 'steps'
        ]
        
        rows = []
        for record in data:
            row = []
            for col in feature_cols:
                val = record.get(col)
                if val is not None:
                    row.append(float(val))
                else:
                    row.append(0.0)  # Default value
            rows.append(row)
        
        if not rows:
            return None
        
        return np.array(rows)
    
    def _determine_severity(self, score: float) -> str:
        if score >= 0.7:
            return 'high'
        elif score >= 0.4:
            return 'medium'
        elif score >= 0.2:
            return 'low'
        return 'none'


# Module-level configuration (can be set before first use)
_default_config: Optional[ThresholdConfig] = None
_hybrid_detector: Optional[HybridAnomalyDetector] = None


def configure_thresholds(
    mode: ThresholdMode = "hybrid",
    pretrained_baselines_path: Optional[str] = None,
    pretrained_model_path: Optional[str] = None,
    fallback_to_literature: bool = True
) -> ThresholdConfig:
    """
    Configure the threshold mode for the module.
    
    Call this before get_hybrid_detector() to customize behavior.
    
    Args:
        mode: "literature", "pretrained", or "hybrid"
        pretrained_baselines_path: Path to baselines.json
        pretrained_model_path: Path to isolation_forest.pkl
        fallback_to_literature: Whether to fall back to literature if pretrained not found
        
    Returns:
        The configured ThresholdConfig
        
    Example:
        # Use pretrained baselines from trained datasets
        configure_thresholds(
            mode="pretrained",
            pretrained_baselines_path="pretrained/baselines.json",
            pretrained_model_path="pretrained/isolation_forest.pkl"
        )
        
        # Later, get detector with this configuration
        detector = get_hybrid_detector()
    """
    global _default_config, _hybrid_detector
    
    _default_config = ThresholdConfig(
        mode=mode,
        pretrained_baselines_path=pretrained_baselines_path,
        pretrained_model_path=pretrained_model_path,
        fallback_to_literature=fallback_to_literature
    )
    
    # Reset detector so next call creates fresh one with new config
    _hybrid_detector = None
    
    return _default_config


def get_hybrid_detector(config: Optional[ThresholdConfig] = None) -> HybridAnomalyDetector:
    """
    Get the hybrid anomaly detector instance.
    
    Args:
        config: Optional configuration. If not provided, uses default config
                (set via configure_thresholds) or creates hybrid mode config.
    
    Returns:
        HybridAnomalyDetector instance
    """
    global _hybrid_detector, _default_config
    
    # If explicit config provided, create new detector
    if config is not None:
        return HybridAnomalyDetector(config)
    
    # Create singleton if needed
    if _hybrid_detector is None:
        effective_config = _default_config or ThresholdConfig()
        _hybrid_detector = HybridAnomalyDetector(effective_config)
        logger.info(f"Initialized HybridAnomalyDetector with mode: {effective_config.mode}")
    
    return _hybrid_detector


# Backward compatibility: lazy-initialized singleton
@property
def hybrid_detector() -> HybridAnomalyDetector:
    """Backward-compatible access to hybrid detector."""
    return get_hybrid_detector()

