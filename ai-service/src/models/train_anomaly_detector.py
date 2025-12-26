#!/usr/bin/env python3
"""
Unsupervised Anomaly Detector Training

Trains an Isolation Forest on behavioral data for
unsupervised anomaly detection.

This complements the supervised classifier by detecting
outliers that may not have been labeled in training data.

Usage:
    python -m src.models.train_anomaly_detector
"""

import pandas as pd
import numpy as np
import json
import joblib
from pathlib import Path
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def train_anomaly_detector(
    data_path: str = 'data/processed/features_engineered.csv',
    output_dir: str = 'data/models',
    contamination: str = 'auto'
) -> tuple:
    """
    Train Isolation Forest on behavioral data.
    
    Args:
        data_path: Path to feature-engineered data
        output_dir: Directory to save model
        contamination: Expected proportion of anomalies ('auto' or float)
        
    Returns:
        Tuple of (model, results_dict)
    """
    logger.info("=" * 60)
    logger.info("Training Unsupervised Anomaly Detector")
    logger.info("=" * 60)
    
    df = pd.read_csv(data_path)
    
    # Feature columns for anomaly detection
    feature_cols = [
        'sleep_hours', 'stress_level', 'exercise_minutes',
        'sleep_hours_zscore', 'stress_sleep_ratio', 'recovery_score'
    ]
    feature_cols = [c for c in feature_cols if c in df.columns]
    
    if not feature_cols:
        # Fallback to core features
        feature_cols = ['sleep_hours', 'stress_level', 'exercise_minutes']
        feature_cols = [c for c in feature_cols if c in df.columns]
    
    # Handle missing values
    X = df[feature_cols].dropna()
    
    if len(X) < 50:
        logger.warning(f"Small dataset: {len(X)} samples")
    
    logger.info(f"Training samples: {len(X)}")
    logger.info(f"Features: {feature_cols}")
    
    # Determine contamination from labeled data if available
    if contamination == 'auto':
        if 'is_anomaly' in df.columns:
            contamination_rate = df['is_anomaly'].mean()
            logger.info(f"Using labeled anomaly rate: {contamination_rate:.2%}")
        else:
            contamination_rate = 0.1
            logger.info("No labels available, using default contamination: 10%")
    else:
        contamination_rate = float(contamination)
    
    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Train Isolation Forest
    model = IsolationForest(
        contamination=contamination_rate,
        n_estimators=100,
        max_samples='auto',
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_scaled)
    
    # Evaluate
    predictions = model.predict(X_scaled)
    scores = model.decision_function(X_scaled)
    
    detected_anomalies = (predictions == -1).sum()
    detected_rate = detected_anomalies / len(predictions)
    
    # Compare with labels if available
    if 'is_anomaly' in df.columns:
        y_true = df.loc[X.index, 'is_anomaly'].values
        # Convert -1/1 to 1/0 (anomaly/normal)
        y_pred = (predictions == -1).astype(int)
        
        from sklearn.metrics import precision_score, recall_score, f1_score
        
        precision = precision_score(y_true, y_pred, zero_division=0)
        recall = recall_score(y_true, y_pred, zero_division=0)
        f1 = f1_score(y_true, y_pred, zero_division=0)
        
        label_comparison = {
            'precision': float(precision),
            'recall': float(recall),
            'f1': float(f1),
            'true_anomaly_rate': float(y_true.mean()),
            'detected_rate': float(detected_rate)
        }
    else:
        label_comparison = None
    
    results = {
        'model_type': 'IsolationForest',
        'contamination': float(contamination_rate),
        'n_estimators': 100,
        'n_samples': len(X),
        'features_used': feature_cols,
        'detected_anomalies': int(detected_anomalies),
        'detected_anomaly_rate': float(detected_rate),
        'anomaly_score_stats': {
            'mean': float(np.mean(scores)),
            'std': float(np.std(scores)),
            'min': float(np.min(scores)),
            'max': float(np.max(scores)),
            'threshold': float(np.percentile(scores, contamination_rate * 100))
        },
        'label_comparison': label_comparison,
        'trained_at': datetime.now().isoformat()
    }
    
    # Save
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    joblib.dump({
        'model': model,
        'scaler': scaler,
        'feature_cols': feature_cols
    }, output_path / 'anomaly_detector.pkl')
    
    with open(output_path / 'anomaly_results.json', 'w') as f:
        json.dump(results, f, indent=2, default=str)
    
    # Print summary
    print("\n" + "=" * 60)
    print("ANOMALY DETECTOR TRAINING COMPLETE")
    print("=" * 60)
    print(f"\nContamination:      {contamination_rate:.2%}")
    print(f"Detected anomalies: {detected_anomalies} ({detected_rate:.2%})")
    print(f"Score range:        [{results['anomaly_score_stats']['min']:.3f}, "
          f"{results['anomaly_score_stats']['max']:.3f}]")
    
    if label_comparison:
        print(f"\nComparison with Labels:")
        print(f"  Precision: {label_comparison['precision']:.4f}")
        print(f"  Recall:    {label_comparison['recall']:.4f}")
        print(f"  F1:        {label_comparison['f1']:.4f}")
    
    print(f"\nModel saved to: {output_path / 'anomaly_detector.pkl'}")
    
    return model, results


if __name__ == "__main__":
    train_anomaly_detector()

