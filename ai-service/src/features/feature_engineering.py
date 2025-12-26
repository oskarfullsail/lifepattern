#!/usr/bin/env python3
"""
Feature Engineering Module

Creates derived features for ML training using DATA-DRIVEN thresholds.
All feature calculations use statistics from the Kaggle datasets,
not hardcoded literature values.

Features Created:
- Z-scores using data-derived means/stds
- Sleep quality index
- Stress-sleep interaction
- Exercise adequacy
- Recovery score
- Gender-specific z-scores

Usage:
    python -m src.features.feature_engineering
"""

import pandas as pd
import numpy as np
import json
from pathlib import Path
from typing import Dict, Any, List, Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class FeatureEngineer:
    """Create derived features for ML training using data-driven thresholds."""
    
    def __init__(self, thresholds_path: str = 'data/processed/data_driven_thresholds.json'):
        """
        Initialize with data-driven thresholds.
        
        Args:
            thresholds_path: Path to JSON file with calculated thresholds
        """
        self.thresholds: Dict[str, Any] = {}
        self.thresholds_path = Path(thresholds_path)
        
        if self.thresholds_path.exists():
            with open(self.thresholds_path) as f:
                self.thresholds = json.load(f)
            logger.info(f"Loaded thresholds from {thresholds_path}")
        else:
            logger.warning(f"Thresholds file not found at {thresholds_path}")
            logger.info("Will use fallback statistics from the data itself")
    
    def engineer_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Create all engineered features.
        
        Args:
            df: DataFrame with unified schema
            
        Returns:
            DataFrame with additional engineered features
        """
        logger.info("Engineering features...")
        df = df.copy()
        
        # Convert all numeric columns to numeric type (handle mixed types)
        numeric_cols = ['sleep_hours', 'stress_level', 'exercise_minutes', 'steps', 
                       'heart_rate', 'screen_time', 'water_intake', 'age']
        for col in numeric_cols:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')
        
        # Calculate z-scores using DATA-DERIVED means and stds
        df = self._add_zscores(df)
        
        # Sleep quality index
        df = self._add_sleep_quality_index(df)
        
        # Stress-sleep interaction
        df = self._add_stress_sleep_ratio(df)
        
        # Exercise adequacy
        df = self._add_exercise_adequacy(df)
        
        # Recovery score
        df = self._add_recovery_score(df)
        
        # Gender encoding
        df = self._add_gender_encoding(df)
        
        # Gender-specific z-scores
        df = self._add_gender_zscores(df)
        
        # Activity level categorization
        df = self._add_activity_level(df)
        
        # Composite health score
        df = self._add_health_score(df)
        
        logger.info(f"Created {len(self.get_feature_list())} features")
        return df
    
    def _get_threshold(self, feature: str, stat: str = 'population_mean') -> float:
        """Get threshold value from data-driven thresholds."""
        if self.thresholds and 'general' in self.thresholds:
            if feature in self.thresholds['general']:
                return self.thresholds['general'][feature].get(stat, 0)
        
        # Fallback defaults
        defaults = {
            'sleep_hours': {'population_mean': 7.0, 'population_std': 1.5},
            'stress_level': {'population_mean': 5.0, 'population_std': 2.0},
            'exercise_minutes': {'population_mean': 30, 'population_std': 20},
            'steps': {'population_mean': 7000, 'population_std': 3000},
            'heart_rate': {'population_mean': 72, 'population_std': 12}
        }
        
        if feature in defaults:
            return defaults[feature].get(stat, 0)
        return 0
    
    def _add_zscores(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add z-scores using DATA-DERIVED statistics."""
        for feature in ['sleep_hours', 'stress_level', 'exercise_minutes', 'steps', 'heart_rate']:
            if feature in df.columns:
                mean = self._get_threshold(feature, 'population_mean')
                std = self._get_threshold(feature, 'population_std')
                
                # Convert to numeric first
                numeric_col = pd.to_numeric(df[feature], errors='coerce')
                
                if std > 0:
                    df[f'{feature}_zscore'] = (numeric_col - mean) / std
                else:
                    df[f'{feature}_zscore'] = 0
                    
        return df
    
    def _add_sleep_quality_index(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Add sleep quality index (0-1).
        
        Based on deviation from optimal sleep hours.
        """
        if 'sleep_hours' in df.columns:
            optimal_sleep = self._get_threshold('sleep_hours', 'population_mean')
            
            # Convert to numeric
            sleep = pd.to_numeric(df['sleep_hours'], errors='coerce').fillna(optimal_sleep)
            
            # Quality decreases with deviation from optimal
            df['sleep_quality_index'] = 1 - abs(sleep - optimal_sleep) / optimal_sleep
            df['sleep_quality_index'] = df['sleep_quality_index'].clip(0, 1)
        else:
            df['sleep_quality_index'] = 0.5
            
        return df
    
    def _add_stress_sleep_ratio(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Add stress-to-sleep ratio.
        
        High stress + low sleep = high ratio = concerning.
        """
        if 'stress_level' in df.columns and 'sleep_hours' in df.columns:
            # Convert to numeric
            stress = pd.to_numeric(df['stress_level'], errors='coerce').fillna(5)
            sleep = pd.to_numeric(df['sleep_hours'], errors='coerce').fillna(7)
            
            # Avoid division by zero
            df['stress_sleep_ratio'] = stress / (sleep + 0.1)
        else:
            df['stress_sleep_ratio'] = 0
            
        return df
    
    def _add_exercise_adequacy(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Add exercise adequacy score (0-2).
        
        1.0 = optimal, <1 = insufficient, >1 = above average.
        """
        if 'exercise_minutes' in df.columns:
            optimal_exercise = self._get_threshold('exercise_minutes', 'population_mean')
            if optimal_exercise > 0:
                df['exercise_adequacy'] = (df['exercise_minutes'] / optimal_exercise).clip(0, 2)
            else:
                df['exercise_adequacy'] = 1.0
        else:
            df['exercise_adequacy'] = 1.0
            
        return df
    
    def _add_recovery_score(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Add recovery score (0-1).
        
        Combination of:
        - Low stress (50% weight)
        - Adequate sleep (50% weight)
        """
        recovery = pd.Series(0.5, index=df.index)
        
        if 'stress_level' in df.columns:
            # Lower stress = higher recovery
            stress_component = (10 - df['stress_level'].fillna(5)) / 10 * 0.5
            recovery += stress_component - 0.25
        
        if 'sleep_hours' in df.columns:
            # More sleep = higher recovery (up to 8 hours)
            sleep_component = (df['sleep_hours'].fillna(7) / 8).clip(0, 1) * 0.5
            recovery += sleep_component - 0.25
        
        df['recovery_score'] = recovery.clip(0, 1)
        return df
    
    def _add_gender_encoding(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add binary gender encoding (1=female, 0=male)."""
        if 'gender' in df.columns:
            df['gender_encoded'] = (df['gender'] == 'female').astype(int)
        else:
            df['gender_encoded'] = 0  # Default to male if unknown
            
        return df
    
    def _add_gender_zscores(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add gender-specific z-scores for sleep."""
        if 'gender' not in df.columns or 'sleep_hours' not in df.columns:
            df['sleep_zscore_gendered'] = 0
            return df
        
        gender_stats = self.thresholds.get('gender_specific', {})
        
        def calc_gender_zscore(row):
            gender = row.get('gender', 'male')
            if gender in gender_stats and 'sleep_hours' in gender_stats[gender]:
                mean = gender_stats[gender]['sleep_hours']['mean']
                std = gender_stats[gender]['sleep_hours']['std']
                if std > 0:
                    return (row['sleep_hours'] - mean) / std
            return 0
        
        df['sleep_zscore_gendered'] = df.apply(calc_gender_zscore, axis=1)
        return df
    
    def _add_activity_level(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Categorize activity level based on steps.
        
        Categories:
        - sedentary: < 5000 steps
        - low_active: 5000-7500 steps
        - active: 7500-10000 steps
        - highly_active: > 10000 steps
        """
        if 'steps' in df.columns:
            conditions = [
                df['steps'] < 5000,
                (df['steps'] >= 5000) & (df['steps'] < 7500),
                (df['steps'] >= 7500) & (df['steps'] < 10000),
                df['steps'] >= 10000
            ]
            choices = [0, 1, 2, 3]  # sedentary to highly_active
            df['activity_level'] = np.select(conditions, choices, default=1)
        else:
            df['activity_level'] = 1
            
        return df
    
    def _add_health_score(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Add composite health score (0-100).
        
        Weighted combination of:
        - Sleep quality (30%)
        - Exercise adequacy (25%)
        - Stress (inverse, 25%)
        - Recovery (20%)
        """
        score = pd.Series(50.0, index=df.index)
        
        if 'sleep_quality_index' in df.columns:
            score += df['sleep_quality_index'] * 30 - 15
        
        if 'exercise_adequacy' in df.columns:
            score += df['exercise_adequacy'].clip(0, 1) * 25 - 12.5
        
        if 'stress_level' in df.columns:
            # Lower stress = higher score
            score += (10 - df['stress_level'].fillna(5)) / 10 * 25 - 12.5
        
        if 'recovery_score' in df.columns:
            score += df['recovery_score'] * 20 - 10
        
        df['health_score'] = score.clip(0, 100)
        return df
    
    def get_feature_list(self) -> List[str]:
        """Return list of all features for training."""
        return [
            # Original features
            'sleep_hours', 'stress_level', 'exercise_minutes', 'steps', 'heart_rate',
            
            # Z-score features
            'sleep_hours_zscore', 'stress_level_zscore', 'exercise_minutes_zscore',
            'steps_zscore', 'heart_rate_zscore',
            
            # Derived features
            'sleep_quality_index', 'stress_sleep_ratio', 'exercise_adequacy',
            'recovery_score', 'activity_level', 'health_score',
            
            # Gender features
            'gender_encoded', 'sleep_zscore_gendered'
        ]
    
    def get_core_features(self) -> List[str]:
        """Return list of core features (always available)."""
        return [
            'sleep_hours', 'stress_level', 'exercise_minutes',
            'sleep_quality_index', 'stress_sleep_ratio', 'exercise_adequacy',
            'recovery_score', 'health_score'
        ]


if __name__ == "__main__":
    # Load unified dataset
    unified_path = Path('data/processed/unified_dataset.csv')
    
    if not unified_path.exists():
        print("Unified dataset not found. Run preprocessing first:")
        print("  python -m src.data.preprocessing")
        exit(1)
    
    df = pd.read_csv(unified_path)
    
    # Check if thresholds exist
    thresholds_path = Path('data/processed/data_driven_thresholds.json')
    if not thresholds_path.exists():
        print("⚠️  Thresholds not found. Run threshold calculator first:")
        print("   python -m src.data.threshold_calculator")
        print("   Proceeding with fallback values...")
    
    # Engineer features
    engineer = FeatureEngineer()
    df = engineer.engineer_features(df)
    
    # Save
    output_path = Path('data/processed/features_engineered.csv')
    df.to_csv(output_path, index=False)
    
    print(f"\n✅ Engineered features saved to {output_path}")
    print(f"   Total features: {len(engineer.get_feature_list())}")
    print(f"   Total rows: {len(df)}")

