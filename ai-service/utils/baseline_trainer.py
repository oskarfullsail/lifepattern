"""
Baseline Trainer Module

Trains population baselines and ML models from public health datasets.
Produces pretrained artifacts that can be loaded at runtime for data-driven
anomaly detection thresholds.

Outputs:
- baselines.json: Population statistics (mean, std, percentiles) per metric
- isolation_forest.pkl: Pretrained Isolation Forest model
- training_report.json: Training metadata and validation results

Usage:
    from utils.baseline_trainer import BaselineTrainer
    
    trainer = BaselineTrainer()
    trainer.fit(combined_dataset)
    trainer.save("pretrained/")
"""

import os
import json
import logging
import joblib
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field, asdict
from pathlib import Path
from datetime import datetime
import pandas as pd
import numpy as np
from scipy import stats
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler, RobustScaler
from sklearn.model_selection import train_test_split

logger = logging.getLogger(__name__)


@dataclass
class MetricBaseline:
    """
    Statistical baseline for a single metric, derived from dataset.
    """
    metric_name: str
    
    # Central tendency
    mean: float
    median: float
    
    # Dispersion
    std: float
    mad: float  # Median Absolute Deviation (robust)
    iqr: float  # Interquartile Range
    
    # Percentiles for threshold derivation
    p5: float   # 5th percentile
    p10: float  # 10th percentile
    p25: float  # 25th percentile (Q1)
    p75: float  # 75th percentile (Q3)
    p90: float  # 90th percentile
    p95: float  # 95th percentile
    
    # Range
    min_value: float
    max_value: float
    
    # Sample info
    n_samples: int
    n_valid: int  # Non-null samples
    
    # Derived thresholds
    warning_low: float = 0.0
    warning_high: float = 0.0
    critical_low: float = 0.0
    critical_high: float = 0.0
    optimal_min: float = 0.0
    optimal_max: float = 0.0
    
    # Metadata
    source_datasets: List[str] = field(default_factory=list)
    trained_at: str = ""
    
    def compute_thresholds(self, method: str = "iqr") -> None:
        """
        Compute threshold bounds from statistics.
        
        Methods:
            - "iqr": Use IQR-based bounds (robust to outliers)
            - "percentile": Use percentile-based bounds
            - "zscore": Use mean ± k*std bounds
        """
        if method == "iqr":
            # IQR method (Tukey's fences)
            self.warning_low = self.p25 - 1.5 * self.iqr
            self.warning_high = self.p75 + 1.5 * self.iqr
            self.critical_low = self.p25 - 3.0 * self.iqr
            self.critical_high = self.p75 + 3.0 * self.iqr
            self.optimal_min = self.p25
            self.optimal_max = self.p75
            
        elif method == "percentile":
            # Percentile-based
            self.warning_low = self.p10
            self.warning_high = self.p90
            self.critical_low = self.p5
            self.critical_high = self.p95
            self.optimal_min = self.p25
            self.optimal_max = self.p75
            
        elif method == "zscore":
            # Z-score based (less robust)
            self.warning_low = self.mean - 1.5 * self.std
            self.warning_high = self.mean + 1.5 * self.std
            self.critical_low = self.mean - 2.5 * self.std
            self.critical_high = self.mean + 2.5 * self.std
            self.optimal_min = self.mean - 0.5 * self.std
            self.optimal_max = self.mean + 0.5 * self.std
        
        # Ensure bounds don't go negative for metrics that can't be negative
        non_negative_metrics = [
            'sleep_hours', 'steps', 'heart_rate', 'exercise_duration',
            'water_intake', 'active_energy'
        ]
        if self.metric_name in non_negative_metrics:
            self.warning_low = max(0, self.warning_low)
            self.critical_low = max(0, self.critical_low)
            self.optimal_min = max(0, self.optimal_min)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return asdict(self)


@dataclass
class TrainingReport:
    """
    Report generated after training baselines.
    """
    trained_at: str
    training_duration_seconds: float
    
    # Dataset info
    total_samples: int
    source_datasets: List[str]
    
    # Per-metric info
    metrics_trained: List[str]
    metric_coverage: Dict[str, float]  # Metric -> % non-null
    
    # Model info
    isolation_forest_trained: bool
    isolation_forest_contamination: float
    isolation_forest_n_estimators: int
    
    # Validation (if literature baselines provided)
    validation_vs_literature: Dict[str, Dict[str, float]] = field(default_factory=dict)
    
    # Warnings
    warnings: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class BaselineTrainer:
    """
    Trains population baselines and ML models from datasets.
    """
    
    # Metrics to train baselines for
    TARGET_METRICS = [
        'sleep_hours',
        'steps', 
        'heart_rate',
        'heart_rate_resting',
        'heart_rate_variability',
        'exercise_duration',
        'active_energy',
        'stress_level',
        'water_intake',
        'sleep_quality',
    ]
    
    # Features for Isolation Forest training
    ISOLATION_FOREST_FEATURES = [
        'sleep_hours',
        'steps',
        'heart_rate',
        'exercise_duration',
        'stress_level',
    ]
    
    def __init__(
        self,
        threshold_method: str = "iqr",
        contamination: float = 0.1,
        n_estimators: int = 100,
        random_state: int = 42
    ):
        """
        Initialize the baseline trainer.
        
        Args:
            threshold_method: Method for computing threshold bounds
            contamination: Isolation Forest contamination parameter
            n_estimators: Number of trees in Isolation Forest
            random_state: Random seed for reproducibility
        """
        self.threshold_method = threshold_method
        self.contamination = contamination
        self.n_estimators = n_estimators
        self.random_state = random_state
        
        # Trained artifacts
        self.baselines: Dict[str, MetricBaseline] = {}
        self.isolation_forest: Optional[IsolationForest] = None
        self.scaler: Optional[RobustScaler] = None
        self.training_report: Optional[TrainingReport] = None
        
        # Literature baselines for comparison
        self.literature_baselines: Dict[str, Dict[str, float]] = {
            'sleep_hours': {'mean': 7.5, 'std': 1.2},
            'steps': {'mean': 7500, 'std': 3000},
            'heart_rate': {'mean': 72, 'std': 12},
            'heart_rate_resting': {'mean': 65, 'std': 10},
            'exercise_duration': {'mean': 0.4, 'std': 0.3},
            'stress_level': {'mean': 4.5, 'std': 2.0},
            'water_intake': {'mean': 2.2, 'std': 0.6},
        }
    
    def fit(
        self,
        df: pd.DataFrame,
        source_datasets: Optional[List[str]] = None
    ) -> "BaselineTrainer":
        """
        Fit baselines from a unified dataset.
        
        Args:
            df: DataFrame with unified schema columns
            source_datasets: List of source dataset names for tracking
            
        Returns:
            self for chaining
        """
        start_time = datetime.now()
        warnings = []
        
        if source_datasets is None:
            if 'source_dataset' in df.columns:
                source_datasets = df['source_dataset'].unique().tolist()
            else:
                source_datasets = ['unknown']
        
        logger.info(f"Training baselines from {len(df)} samples")
        
        # Train per-metric baselines
        metric_coverage = {}
        metrics_trained = []
        
        for metric in self.TARGET_METRICS:
            if metric not in df.columns:
                logger.debug(f"Metric {metric} not in dataset, skipping")
                continue
            
            values = df[metric].dropna()
            coverage = len(values) / len(df) if len(df) > 0 else 0
            metric_coverage[metric] = coverage
            
            if len(values) < 10:
                warnings.append(f"Insufficient samples for {metric}: {len(values)}")
                continue
            
            # Compute statistics
            baseline = self._compute_metric_baseline(
                metric_name=metric,
                values=values,
                source_datasets=source_datasets
            )
            
            self.baselines[metric] = baseline
            metrics_trained.append(metric)
            
            logger.info(f"  {metric}: mean={baseline.mean:.2f}, std={baseline.std:.2f}, n={baseline.n_valid}")
        
        # Train Isolation Forest
        isolation_trained = self._train_isolation_forest(df)
        
        # Generate training report
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        self.training_report = TrainingReport(
            trained_at=start_time.isoformat(),
            training_duration_seconds=duration,
            total_samples=len(df),
            source_datasets=source_datasets,
            metrics_trained=metrics_trained,
            metric_coverage=metric_coverage,
            isolation_forest_trained=isolation_trained,
            isolation_forest_contamination=self.contamination,
            isolation_forest_n_estimators=self.n_estimators,
            warnings=warnings
        )
        
        # Validate against literature
        self._validate_against_literature()
        
        logger.info(f"Training completed in {duration:.2f}s")
        
        return self
    
    def _compute_metric_baseline(
        self,
        metric_name: str,
        values: pd.Series,
        source_datasets: List[str]
    ) -> MetricBaseline:
        """Compute comprehensive statistics for a metric."""
        
        values_array = values.values
        
        # Compute percentiles
        percentiles = np.percentile(values_array, [5, 10, 25, 50, 75, 90, 95])
        
        # Compute MAD (Median Absolute Deviation)
        median = percentiles[3]  # 50th percentile
        mad = np.median(np.abs(values_array - median))
        
        baseline = MetricBaseline(
            metric_name=metric_name,
            mean=float(np.mean(values_array)),
            median=float(median),
            std=float(np.std(values_array)),
            mad=float(mad),
            iqr=float(percentiles[4] - percentiles[2]),  # Q3 - Q1
            p5=float(percentiles[0]),
            p10=float(percentiles[1]),
            p25=float(percentiles[2]),
            p75=float(percentiles[4]),
            p90=float(percentiles[5]),
            p95=float(percentiles[6]),
            min_value=float(np.min(values_array)),
            max_value=float(np.max(values_array)),
            n_samples=len(values),
            n_valid=int(np.sum(~np.isnan(values_array))),
            source_datasets=source_datasets,
            trained_at=datetime.now().isoformat()
        )
        
        # Compute threshold bounds
        baseline.compute_thresholds(method=self.threshold_method)
        
        return baseline
    
    def _train_isolation_forest(self, df: pd.DataFrame) -> bool:
        """Train Isolation Forest on available features."""
        
        # Get available features
        available_features = [f for f in self.ISOLATION_FOREST_FEATURES if f in df.columns]
        
        if len(available_features) < 2:
            logger.warning("Insufficient features for Isolation Forest training")
            return False
        
        # Prepare feature matrix
        feature_df = df[available_features].copy()
        
        # Drop rows with any NaN
        feature_df = feature_df.dropna()
        
        if len(feature_df) < 50:
            logger.warning(f"Insufficient clean samples for Isolation Forest: {len(feature_df)}")
            return False
        
        X = feature_df.values
        
        # Fit robust scaler
        self.scaler = RobustScaler()
        X_scaled = self.scaler.fit_transform(X)
        
        # Train Isolation Forest
        self.isolation_forest = IsolationForest(
            contamination=self.contamination,
            n_estimators=self.n_estimators,
            random_state=self.random_state,
            n_jobs=-1
        )
        self.isolation_forest.fit(X_scaled)
        
        # Store feature order for inference
        self.isolation_forest_features = available_features
        
        logger.info(f"Trained Isolation Forest on {len(available_features)} features, {len(X)} samples")
        
        return True
    
    def _validate_against_literature(self) -> None:
        """Compare trained baselines against literature values."""
        
        if self.training_report is None:
            return
        
        validation = {}
        
        for metric, trained in self.baselines.items():
            if metric in self.literature_baselines:
                lit = self.literature_baselines[metric]
                
                # Compute relative difference
                mean_diff = abs(trained.mean - lit['mean']) / lit['mean'] if lit['mean'] != 0 else 0
                std_diff = abs(trained.std - lit['std']) / lit['std'] if lit['std'] != 0 else 0
                
                validation[metric] = {
                    'trained_mean': trained.mean,
                    'literature_mean': lit['mean'],
                    'mean_diff_pct': mean_diff * 100,
                    'trained_std': trained.std,
                    'literature_std': lit['std'],
                    'std_diff_pct': std_diff * 100,
                    'within_10pct': mean_diff < 0.1
                }
                
                if mean_diff > 0.3:
                    self.training_report.warnings.append(
                        f"{metric}: Trained mean differs >30% from literature "
                        f"({trained.mean:.2f} vs {lit['mean']:.2f})"
                    )
        
        self.training_report.validation_vs_literature = validation
    
    def save(
        self,
        output_dir: str,
        baselines_filename: str = "baselines.json",
        model_filename: str = "isolation_forest.pkl",
        report_filename: str = "training_report.json"
    ) -> Dict[str, str]:
        """
        Save trained artifacts to disk.
        
        Args:
            output_dir: Directory to save files
            baselines_filename: Name for baselines JSON file
            model_filename: Name for Isolation Forest pickle file
            report_filename: Name for training report JSON file
            
        Returns:
            Dict mapping artifact type to file path
        """
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        saved_files = {}
        
        # Save baselines
        baselines_path = output_path / baselines_filename
        baselines_dict = {
            name: baseline.to_dict() 
            for name, baseline in self.baselines.items()
        }
        with open(baselines_path, 'w') as f:
            json.dump(baselines_dict, f, indent=2)
        saved_files['baselines'] = str(baselines_path)
        logger.info(f"Saved baselines to {baselines_path}")
        
        # Save Isolation Forest model
        if self.isolation_forest is not None:
            model_path = output_path / model_filename
            model_data = {
                'isolation_forest': self.isolation_forest,
                'scaler': self.scaler,
                'features': getattr(self, 'isolation_forest_features', self.ISOLATION_FOREST_FEATURES)
            }
            joblib.dump(model_data, model_path)
            saved_files['model'] = str(model_path)
            logger.info(f"Saved model to {model_path}")
        
        # Save training report
        if self.training_report is not None:
            report_path = output_path / report_filename
            with open(report_path, 'w') as f:
                json.dump(self.training_report.to_dict(), f, indent=2)
            saved_files['report'] = str(report_path)
            logger.info(f"Saved report to {report_path}")
        
        return saved_files
    
    @classmethod
    def load(
        cls,
        pretrained_dir: str,
        baselines_filename: str = "baselines.json",
        model_filename: str = "isolation_forest.pkl"
    ) -> "BaselineTrainer":
        """
        Load pretrained baselines and model from disk.
        
        Args:
            pretrained_dir: Directory containing pretrained files
            baselines_filename: Name of baselines JSON file
            model_filename: Name of model pickle file
            
        Returns:
            BaselineTrainer instance with loaded artifacts
        """
        trainer = cls()
        pretrained_path = Path(pretrained_dir)
        
        # Load baselines
        baselines_path = pretrained_path / baselines_filename
        if baselines_path.exists():
            with open(baselines_path, 'r') as f:
                baselines_dict = json.load(f)
            
            for name, data in baselines_dict.items():
                trainer.baselines[name] = MetricBaseline(**data)
            
            logger.info(f"Loaded {len(trainer.baselines)} baselines from {baselines_path}")
        else:
            logger.warning(f"Baselines file not found: {baselines_path}")
        
        # Load model
        model_path = pretrained_path / model_filename
        if model_path.exists():
            model_data = joblib.load(model_path)
            trainer.isolation_forest = model_data.get('isolation_forest')
            trainer.scaler = model_data.get('scaler')
            trainer.isolation_forest_features = model_data.get('features', cls.ISOLATION_FOREST_FEATURES)
            logger.info(f"Loaded Isolation Forest from {model_path}")
        else:
            logger.warning(f"Model file not found: {model_path}")
        
        return trainer
    
    def get_baseline_dict(self) -> Dict[str, Dict[str, float]]:
        """
        Get baselines as a simple dict for use in PopulationBaseline.
        
        Returns dict compatible with PopulationBaseline field format.
        """
        result = {}
        
        for name, baseline in self.baselines.items():
            result[name] = {
                'optimal_min': baseline.optimal_min,
                'optimal_max': baseline.optimal_max,
                'warning_low': baseline.warning_low,
                'warning_high': baseline.warning_high,
                'critical_low': baseline.critical_low,
                'critical_high': baseline.critical_high,
                'population_mean': baseline.mean,
                'population_std': baseline.std
            }
        
        return result
    
    def predict_anomaly(
        self,
        data: Dict[str, float]
    ) -> Dict[str, Any]:
        """
        Predict if data point is anomalous using trained Isolation Forest.
        
        Args:
            data: Dict of metric values
            
        Returns:
            Dict with is_anomaly, score, and details
        """
        if self.isolation_forest is None:
            return {'is_anomaly': False, 'score': 0.0, 'error': 'No model trained'}
        
        # Prepare features
        features = []
        for feat in self.isolation_forest_features:
            val = data.get(feat)
            if val is None:
                return {'is_anomaly': False, 'score': 0.0, 'error': f'Missing feature: {feat}'}
            features.append(float(val))
        
        X = np.array([features])
        X_scaled = self.scaler.transform(X)
        
        # Predict
        score = self.isolation_forest.decision_function(X_scaled)[0]
        prediction = self.isolation_forest.predict(X_scaled)[0]
        
        return {
            'is_anomaly': prediction == -1,
            'score': float(score),
            'prediction': int(prediction)
        }


def get_baseline_trainer(**kwargs) -> BaselineTrainer:
    """Get a BaselineTrainer instance."""
    return BaselineTrainer(**kwargs)

