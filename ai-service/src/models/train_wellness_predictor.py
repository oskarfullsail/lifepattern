#!/usr/bin/env python3
"""
Wellness Score Predictor Training

Trains a multi-output regressor to predict wellness outcomes
from behavioral inputs.

Predicts:
- Mental Clarity (0-100)
- Energy Score (0-100)
- Mood Score (0-100)
- Focus Score (0-100)

Usage:
    python -m src.models.train_wellness_predictor
"""

import pandas as pd
import numpy as np
import json
import joblib
from pathlib import Path
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.multioutput import MultiOutputRegressor
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_wellness_labels(df: pd.DataFrame) -> pd.DataFrame:
    """
    Create wellness output scores from behavioral inputs.
    
    These are derived scores that represent wellness outcomes
    based on input behaviors.
    """
    df = df.copy()
    
    # Mental Clarity (0-100): Based on sleep + inverse stress
    df['mental_clarity'] = (
        df['sleep_hours'].fillna(7) / 9 * 50 +
        (10 - df['stress_level'].fillna(5)) / 10 * 50
    ).clip(0, 100)
    
    # Energy (0-100): Based on sleep + exercise
    df['energy_score'] = (
        df['sleep_hours'].fillna(7) / 8 * 40 +
        df['exercise_minutes'].fillna(30) / 60 * 40 +
        (10 - df['stress_level'].fillna(5)) / 10 * 20
    ).clip(0, 100)
    
    # Mood (0-100): Based on exercise + sleep + low stress
    df['mood_score'] = (
        df['exercise_minutes'].fillna(30) / 45 * 35 +
        df['sleep_hours'].fillna(7) / 8 * 35 +
        (10 - df['stress_level'].fillna(5)) / 10 * 30
    ).clip(0, 100)
    
    # Focus (0-100): Based on sleep quality + low stress
    df['focus_score'] = (
        df['sleep_hours'].fillna(7) / 8 * 60 +
        (10 - df['stress_level'].fillna(5)) / 10 * 40
    ).clip(0, 100)
    
    return df


def train_wellness_predictor(
    data_path: str = 'data/processed/features_engineered.csv',
    output_dir: str = 'data/models'
) -> tuple:
    """
    Train multi-output regressor for wellness scores.
    
    Args:
        data_path: Path to feature-engineered data
        output_dir: Directory to save model
        
    Returns:
        Tuple of (model, results_dict)
    """
    logger.info("=" * 60)
    logger.info("Training Wellness Score Predictor")
    logger.info("=" * 60)
    
    # Load and create labels
    df = pd.read_csv(data_path)
    df = create_wellness_labels(df)
    
    # Feature columns - use core behavioral features
    feature_cols = ['sleep_hours', 'stress_level', 'exercise_minutes']
    
    # Add engineered features if available
    for col in ['recovery_score', 'sleep_quality_index', 'gender_encoded', 'health_score']:
        if col in df.columns:
            feature_cols.append(col)
    
    # Ensure all features exist
    feature_cols = [c for c in feature_cols if c in df.columns]
    
    # Target columns
    target_cols = ['mental_clarity', 'energy_score', 'mood_score', 'focus_score']
    
    # Remove NaNs
    df_clean = df.dropna(subset=feature_cols + target_cols)
    
    if len(df_clean) < 50:
        logger.warning(f"Small dataset: {len(df_clean)} samples")
    
    logger.info(f"Training samples: {len(df_clean)}")
    logger.info(f"Features: {feature_cols}")
    
    X = df_clean[feature_cols]
    y = df_clean[target_cols]
    
    # Train model
    model = RandomForestRegressor(
        n_estimators=100, 
        max_depth=10, 
        random_state=42,
        n_jobs=-1
    )
    model.fit(X, y)
    
    # Evaluate
    y_pred = model.predict(X)
    
    results = {
        'model_type': 'RandomForestRegressor (MultiOutput)',
        'r2_scores': {},
        'rmse_scores': {},
        'mae_scores': {},
        'feature_importance': {},
        'training_info': {
            'n_samples': len(df_clean),
            'features_used': feature_cols,
            'targets': target_cols,
            'trained_at': datetime.now().isoformat()
        }
    }
    
    for i, col in enumerate(target_cols):
        results['r2_scores'][col] = float(r2_score(y[col], y_pred[:, i]))
        results['rmse_scores'][col] = float(np.sqrt(mean_squared_error(y[col], y_pred[:, i])))
        results['mae_scores'][col] = float(mean_absolute_error(y[col], y_pred[:, i]))
    
    # Feature importance
    for feat, imp in zip(feature_cols, model.feature_importances_):
        results['feature_importance'][feat] = float(imp)
    
    # Save
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    joblib.dump({
        'model': model,
        'feature_cols': feature_cols,
        'target_cols': target_cols
    }, output_path / 'wellness_predictor.pkl')
    
    with open(output_path / 'wellness_results.json', 'w') as f:
        json.dump(results, f, indent=2, default=str)
    
    # Print summary
    print("\n" + "=" * 60)
    print("WELLNESS PREDICTOR TRAINING COMPLETE")
    print("=" * 60)
    print("\nPerformance by Target:")
    for col in target_cols:
        print(f"  {col}:")
        print(f"    R²:   {results['r2_scores'][col]:.4f}")
        print(f"    RMSE: {results['rmse_scores'][col]:.2f}")
        print(f"    MAE:  {results['mae_scores'][col]:.2f}")
    
    print(f"\nModel saved to: {output_path / 'wellness_predictor.pkl'}")
    
    return model, results


if __name__ == "__main__":
    train_wellness_predictor()

