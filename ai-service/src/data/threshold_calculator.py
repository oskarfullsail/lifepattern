#!/usr/bin/env python3
"""
Data-Driven Threshold Calculator

Calculates thresholds FROM DATA instead of hardcoding.
This replaces all hardcoded LITERATURE_BASELINES in adaptive_thresholds.py.

The output file (data_driven_thresholds.json) contains:
- Population statistics (mean, std, percentiles) per feature
- Gender-specific statistics
- Warning and critical thresholds based on percentiles

Usage:
    python -m src.data.threshold_calculator
"""

import pandas as pd
import numpy as np
import json
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ThresholdCalculator:
    """
    Calculate thresholds FROM DATA instead of hardcoding.
    This replaces all hardcoded LITERATURE_BASELINES.
    """
    
    # Features to calculate thresholds for
    TARGET_FEATURES = [
        'sleep_hours', 
        'stress_level', 
        'exercise_minutes',
        'screen_time', 
        'steps', 
        'heart_rate',
        'water_intake'
    ]
    
    def __init__(self, df: pd.DataFrame):
        """
        Initialize with unified dataset.
        
        Args:
            df: DataFrame with unified schema from preprocessing
        """
        self.df = df
        self.thresholds: Dict[str, Dict[str, float]] = {}
        self.gender_thresholds: Dict[str, Dict[str, Dict[str, float]]] = {}
        self.metadata: Dict[str, Any] = {}
        
    def calculate_all_thresholds(self) -> Dict[str, Dict[str, float]]:
        """
        Calculate thresholds for all features from data.
        
        Uses percentile-based thresholds which are more robust than z-scores.
        """
        logger.info("Calculating data-driven thresholds...")
        
        for feature in self.TARGET_FEATURES:
            if feature in self.df.columns:
                result = self._calculate_feature_thresholds(feature)
                if result is not None:
                    self.thresholds[feature] = result
                    logger.info(f"  {feature}: mean={result['population_mean']:.2f}, "
                              f"warning=[{result['warning_low']:.2f}, {result['warning_high']:.2f}]")
        
        return self.thresholds
    
    def _calculate_feature_thresholds(self, feature: str) -> Optional[Dict[str, float]]:
        """
        Calculate thresholds for a single feature using percentiles.
        
        Percentile-based thresholds are more robust to outliers than
        mean ± std approaches.
        
        Threshold levels:
        - Critical: 5th/95th percentile (extreme values)
        - Warning: 15th/85th percentile (concerning values)
        - Optimal: 25th/75th percentile (healthy range)
        """
        # Convert to numeric and drop NaN
        data = pd.to_numeric(self.df[feature], errors='coerce').dropna()
        
        if len(data) < 10:
            logger.warning(f"Insufficient data for {feature}: {len(data)} samples")
            return None
        
        return {
            # Percentile-based thresholds
            'critical_low': float(data.quantile(0.05)),
            'warning_low': float(data.quantile(0.15)),
            'optimal_min': float(data.quantile(0.25)),
            'population_mean': float(data.mean()),
            'population_median': float(data.median()),
            'optimal_max': float(data.quantile(0.75)),
            'warning_high': float(data.quantile(0.85)),
            'critical_high': float(data.quantile(0.95)),
            'population_std': float(data.std()),
            
            # IQR-based bounds (for outlier detection)
            'iqr': float(data.quantile(0.75) - data.quantile(0.25)),
            'iqr_lower_bound': float(data.quantile(0.25) - 1.5 * (data.quantile(0.75) - data.quantile(0.25))),
            'iqr_upper_bound': float(data.quantile(0.75) + 1.5 * (data.quantile(0.75) - data.quantile(0.25))),
            
            # Sample statistics
            'min': float(data.min()),
            'max': float(data.max()),
            'n_samples': len(data)
        }
    
    def calculate_gender_thresholds(self) -> Dict[str, Dict[str, Dict[str, float]]]:
        """
        Calculate separate thresholds for male and female.
        
        This enables gender-aware anomaly detection.
        """
        logger.info("Calculating gender-specific thresholds...")
        
        if 'gender' not in self.df.columns:
            logger.warning("No gender column in dataset")
            return {}
        
        self.gender_thresholds = {'male': {}, 'female': {}}
        
        for gender in ['male', 'female']:
            gender_df = self.df[self.df['gender'] == gender]
            
            if len(gender_df) < 50:
                logger.warning(f"Insufficient data for {gender}: {len(gender_df)} samples")
                continue
            
            logger.info(f"  {gender}: {len(gender_df)} samples")
            
            for feature in ['sleep_hours', 'stress_level', 'exercise_minutes', 'heart_rate']:
                if feature in gender_df.columns:
                    data = pd.to_numeric(gender_df[feature], errors='coerce').dropna()
                    if len(data) > 10:
                        self.gender_thresholds[gender][feature] = {
                            'mean': float(data.mean()),
                            'std': float(data.std()),
                            'low': float(data.quantile(0.25)),
                            'high': float(data.quantile(0.75)),
                            'n_samples': int(len(data))
                        }
        
        return self.gender_thresholds
    
    def calculate_age_thresholds(self) -> Dict[str, Dict[str, Dict[str, float]]]:
        """
        Calculate age-group specific thresholds.
        
        Age groups: 18-25, 26-35, 36-45, 46-55, 55+
        """
        if 'age' not in self.df.columns:
            return {}
        
        # Convert age to numeric
        df_with_age = self.df.copy()
        df_with_age['age'] = pd.to_numeric(df_with_age['age'], errors='coerce')
        df_with_age = df_with_age.dropna(subset=['age'])
        
        age_bins = [(18, 25), (26, 35), (36, 45), (46, 55), (56, 100)]
        age_thresholds = {}
        
        for low, high in age_bins:
            group_name = f"{low}-{high}"
            group_df = df_with_age[(df_with_age['age'] >= low) & (df_with_age['age'] <= high)]
            
            if len(group_df) < 30:
                continue
            
            age_thresholds[group_name] = {}
            
            for feature in ['sleep_hours', 'heart_rate', 'exercise_minutes']:
                if feature in group_df.columns:
                    data = pd.to_numeric(group_df[feature], errors='coerce').dropna()
                    if len(data) > 10:
                        age_thresholds[group_name][feature] = {
                            'mean': float(data.mean()),
                            'std': float(data.std()),
                            'n_samples': int(len(data))
                        }
        
        return age_thresholds
    
    def save_thresholds(self, filepath: str = 'data/processed/data_driven_thresholds.json') -> Dict[str, Any]:
        """
        Save calculated thresholds to JSON.
        
        This file REPLACES all hardcoded LITERATURE_BASELINES.
        """
        # Ensure thresholds are calculated
        if not self.thresholds:
            self.calculate_all_thresholds()
        
        if not self.gender_thresholds:
            self.calculate_gender_thresholds()
        
        # Compile output
        output = {
            'general': self.thresholds,
            'gender_specific': self.gender_thresholds,
            'age_specific': self.calculate_age_thresholds(),
            'metadata': {
                'total_samples': len(self.df),
                'anomaly_rate': float(self.df['is_anomaly'].mean()) if 'is_anomaly' in self.df.columns else None,
                'sources': self.df['source'].value_counts().to_dict() if 'source' in self.df.columns else {},
                'generated_at': datetime.now().isoformat(),
                'generated_from': 'kaggle_datasets',
                'description': 'Data-driven thresholds calculated from Kaggle health datasets. '
                              'These replace hardcoded LITERATURE_BASELINES values.'
            }
        }
        
        # Save
        filepath = Path(filepath)
        filepath.parent.mkdir(parents=True, exist_ok=True)
        
        with open(filepath, 'w') as f:
            json.dump(output, f, indent=2)
        
        logger.info(f"Saved thresholds to {filepath}")
        return output
    
    def compare_with_literature(self) -> pd.DataFrame:
        """
        Compare data-driven thresholds with literature baselines.
        
        Useful for thesis documentation.
        """
        literature = {
            'sleep_hours': {'mean': 7.5, 'std': 1.2, 'source': 'CDC'},
            'stress_level': {'mean': 4.5, 'std': 2.0, 'source': 'PSS Research'},
            'steps': {'mean': 7500, 'std': 3000, 'source': 'Physical Activity Guidelines'},
            'heart_rate': {'mean': 72, 'std': 12, 'source': 'AHA'},
            'exercise_minutes': {'mean': 30, 'std': 20, 'source': 'WHO'}
        }
        
        comparisons = []
        
        for feature, lit_values in literature.items():
            if feature in self.thresholds:
                data_values = self.thresholds[feature]
                comparisons.append({
                    'feature': feature,
                    'literature_mean': lit_values['mean'],
                    'data_mean': data_values['population_mean'],
                    'mean_diff_pct': (data_values['population_mean'] - lit_values['mean']) / lit_values['mean'] * 100,
                    'literature_std': lit_values['std'],
                    'data_std': data_values['population_std'],
                    'data_n': data_values['n_samples'],
                    'source': lit_values['source']
                })
        
        return pd.DataFrame(comparisons)


if __name__ == "__main__":
    # Load unified dataset
    unified_path = Path('data/processed/unified_dataset.csv')
    
    if not unified_path.exists():
        print("Unified dataset not found. Run preprocessing first:")
        print("  python -m src.data.preprocessing")
        exit(1)
    
    df = pd.read_csv(unified_path)
    
    # Calculate thresholds
    calc = ThresholdCalculator(df)
    calc.calculate_all_thresholds()
    output = calc.save_thresholds()
    
    # Print comparison with literature
    print("\n" + "=" * 60)
    print("COMPARISON WITH LITERATURE BASELINES")
    print("=" * 60)
    comparison = calc.compare_with_literature()
    if not comparison.empty:
        print(comparison.to_string(index=False))
    
    print("\n✅ Data-driven thresholds saved!")
    print("   These replace hardcoded LITERATURE_BASELINES values.")

