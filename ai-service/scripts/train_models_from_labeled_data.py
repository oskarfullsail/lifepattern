#!/usr/bin/env python3
"""
Model Training Script for LifePattern AI Thesis

This script trains the anomaly detection models using labeled user data.
It addresses the committee's feedback about documenting the training methodology.

Training Pipeline:
1. Load labeled_dataset.csv (from export_and_label_data.py)
2. Extract features using the same feature engineering as runtime
3. Train RandomForestClassifier on labeled data
4. Train Isolation Forest for unsupervised backup
5. Tune hyperparameters with cross-validation
6. Evaluate on held-out test set
7. Generate training report with metrics

Usage:
    python scripts/train_models_from_labeled_data.py \
        --train data/train.csv \
        --val data/val.csv \
        --test data/test.csv \
        --output models/

Output:
    - models/anomaly_model.joblib (trained RandomForest)
    - models/isolation_forest.joblib (trained Isolation Forest)
    - models/scaler.joblib (fitted StandardScaler)
    - models/training_report.json (metrics, confusion matrix, etc.)
"""

import os
import sys
import json
import argparse
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Tuple, Optional

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import numpy as np
import pandas as pd
import joblib
from scipy import stats

from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.preprocessing import StandardScaler, RobustScaler
from sklearn.model_selection import GridSearchCV, cross_val_score, StratifiedKFold
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, classification_report, roc_auc_score, roc_curve
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ============================================================================
# Feature Engineering (Same as runtime)
# ============================================================================

# Features used by the anomaly detector
FEATURE_COLUMNS = [
    'sleep_hours',
    'screen_time', 
    'exercise_duration',
    'water_intake',
    'stress_level',
    'meal_count',
    'wake_up_hour',
    'bed_time_hour',
    'sleep_consistency',
    'activity_balance',
    'health_score'
]

# Core metrics (available in routine logs)
CORE_METRICS = [
    'sleep_hours',
    'screen_time',
    'exercise_duration', 
    'water_intake',
    'stress_level'
]


def compute_derived_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute derived features from raw routine log data.
    
    This mirrors the feature engineering in anomaly_detector.py
    """
    df = df.copy()
    
    # Meal count (from meal_times if available)
    if 'meal_times' in df.columns:
        df['meal_count'] = df['meal_times'].apply(
            lambda x: len(x.split(';')) if isinstance(x, str) and x else 3
        )
    elif 'meal_count' not in df.columns:
        df['meal_count'] = 3  # Default
    
    # Wake up hour
    if 'wake_up_time' in df.columns:
        df['wake_up_hour'] = df['wake_up_time'].apply(
            lambda x: int(str(x).split(':')[0]) if pd.notna(x) and ':' in str(x) else 7
        )
    elif 'wake_up_hour' not in df.columns:
        df['wake_up_hour'] = 7
    
    # Bed time hour
    if 'bed_time' in df.columns:
        df['bed_time_hour'] = df['bed_time'].apply(
            lambda x: int(str(x).split(':')[0]) if pd.notna(x) and ':' in str(x) else 23
        )
    elif 'bed_time_hour' not in df.columns:
        df['bed_time_hour'] = 23
    
    # Sleep consistency (how close to 8 hours)
    if 'sleep_hours' in df.columns:
        df['sleep_consistency'] = 1.0 - abs(df['sleep_hours'] - 8.0) / 8.0
        df['sleep_consistency'] = df['sleep_consistency'].clip(0, 1)
    else:
        df['sleep_consistency'] = 0.5
    
    # Activity balance (exercise vs screen time ratio)
    if 'exercise_duration' in df.columns and 'screen_time' in df.columns:
        total_time = df['exercise_duration'] + df['screen_time']
        df['activity_balance'] = np.where(
            total_time > 0,
            df['exercise_duration'] / total_time,
            0.0
        )
    else:
        df['activity_balance'] = 0.0
    
    # Health score (composite metric)
    if 'health_score' not in df.columns:
        df['health_score'] = compute_health_score(df)
    
    return df


def compute_health_score(df: pd.DataFrame) -> pd.Series:
    """
    Compute health score (0-1) from routine metrics.
    
    Same formula as anomaly_detector.py but vectorized.
    """
    score = pd.Series(0.0, index=df.index)
    
    # Sleep component (30%)
    if 'sleep_hours' in df.columns:
        score += (df['sleep_hours'] / 8.0).clip(0, 1) * 0.3
    
    # Screen time component (20%) - lower is better
    if 'screen_time' in df.columns:
        score += (1.0 - df['screen_time'] / 12.0).clip(0, 1) * 0.2
    
    # Exercise component (20%)
    if 'exercise_duration' in df.columns:
        score += (df['exercise_duration'] / 1.0).clip(0, 1) * 0.2
    
    # Water intake component (10%)
    if 'water_intake' in df.columns:
        score += (df['water_intake'] / 2.5).clip(0, 1) * 0.1
    
    # Stress component (10%) - lower is better
    if 'stress_level' in df.columns:
        score += (1.0 - df['stress_level'] / 10.0).clip(0, 1) * 0.1
    
    # Meal count component (10%)
    if 'meal_count' in df.columns:
        score += (df['meal_count'] / 3.0).clip(0, 1) * 0.1
    
    return score


def prepare_features(df: pd.DataFrame) -> Tuple[np.ndarray, List[str]]:
    """
    Prepare feature matrix from DataFrame.
    
    Returns (X, feature_names) tuple.
    """
    # Compute derived features
    df = compute_derived_features(df)
    
    # Select features that exist
    available_features = [f for f in FEATURE_COLUMNS if f in df.columns]
    
    # Fill missing values with defaults
    for col in available_features:
        if df[col].isna().any():
            median_val = df[col].median()
            df[col] = df[col].fillna(median_val if pd.notna(median_val) else 0)
    
    X = df[available_features].values
    
    return X, available_features


# ============================================================================
# Model Training
# ============================================================================

def train_random_forest(
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_val: np.ndarray,
    y_val: np.ndarray,
    tune_hyperparameters: bool = True
) -> Tuple[RandomForestClassifier, Dict[str, Any]]:
    """
    Train RandomForestClassifier with optional hyperparameter tuning.
    """
    logger.info("Training RandomForestClassifier...")
    
    if tune_hyperparameters and len(X_train) >= 50:
        # Grid search for hyperparameters
        param_grid = {
            'n_estimators': [50, 100, 200],
            'max_depth': [5, 10, 15, None],
            'min_samples_split': [2, 5, 10],
            'min_samples_leaf': [1, 2, 4],
            'class_weight': ['balanced', None]
        }
        
        base_model = RandomForestClassifier(random_state=42, n_jobs=-1)
        
        # Use stratified k-fold
        cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        
        logger.info("Running hyperparameter search...")
        grid_search = GridSearchCV(
            base_model,
            param_grid,
            cv=cv,
            scoring='f1',
            n_jobs=-1,
            verbose=0
        )
        grid_search.fit(X_train, y_train)
        
        model = grid_search.best_estimator_
        best_params = grid_search.best_params_
        
        logger.info(f"Best hyperparameters: {best_params}")
        
    else:
        # Use default parameters
        model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            min_samples_split=5,
            class_weight='balanced',
            random_state=42,
            n_jobs=-1
        )
        model.fit(X_train, y_train)
        best_params = model.get_params()
    
    # Evaluate on validation set
    y_val_pred = model.predict(X_val)
    y_val_proba = model.predict_proba(X_val)[:, 1]
    
    val_metrics = {
        'accuracy': float(accuracy_score(y_val, y_val_pred)),
        'precision': float(precision_score(y_val, y_val_pred, zero_division=0)),
        'recall': float(recall_score(y_val, y_val_pred, zero_division=0)),
        'f1': float(f1_score(y_val, y_val_pred, zero_division=0)),
        'roc_auc': float(roc_auc_score(y_val, y_val_proba)) if len(np.unique(y_val)) > 1 else 0.0
    }
    
    logger.info(f"Validation metrics: {val_metrics}")
    
    training_info = {
        'model_type': 'RandomForestClassifier',
        'hyperparameters': best_params,
        'validation_metrics': val_metrics,
        'n_train_samples': len(X_train),
        'n_val_samples': len(X_val),
        'class_distribution_train': {
            'normal': int((y_train == 0).sum()),
            'anomaly': int((y_train == 1).sum())
        }
    }
    
    return model, training_info


def train_isolation_forest(
    X_train: np.ndarray,
    contamination: float = 0.1
) -> Tuple[IsolationForest, Dict[str, Any]]:
    """
    Train Isolation Forest for unsupervised anomaly detection.
    
    This serves as a backup/comparison method.
    """
    logger.info("Training IsolationForest...")
    
    model = IsolationForest(
        contamination=contamination,
        n_estimators=100,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train)
    
    # Get anomaly scores for training data
    scores = model.decision_function(X_train)
    predictions = model.predict(X_train)
    
    training_info = {
        'model_type': 'IsolationForest',
        'contamination': contamination,
        'n_estimators': 100,
        'n_train_samples': len(X_train),
        'predicted_anomalies': int((predictions == -1).sum()),
        'anomaly_score_stats': {
            'mean': float(np.mean(scores)),
            'std': float(np.std(scores)),
            'min': float(np.min(scores)),
            'max': float(np.max(scores))
        }
    }
    
    return model, training_info


def evaluate_on_test_set(
    model: RandomForestClassifier,
    scaler: StandardScaler,
    X_test: np.ndarray,
    y_test: np.ndarray
) -> Dict[str, Any]:
    """
    Final evaluation on held-out test set.
    """
    logger.info("Evaluating on test set...")
    
    X_test_scaled = scaler.transform(X_test)
    y_pred = model.predict(X_test_scaled)
    y_proba = model.predict_proba(X_test_scaled)[:, 1]
    
    # Compute metrics
    cm = confusion_matrix(y_test, y_pred)
    tn, fp, fn, tp = cm.ravel() if cm.size == 4 else (0, 0, 0, 0)
    
    metrics = {
        'accuracy': float(accuracy_score(y_test, y_pred)),
        'precision': float(precision_score(y_test, y_pred, zero_division=0)),
        'recall': float(recall_score(y_test, y_pred, zero_division=0)),
        'f1': float(f1_score(y_test, y_pred, zero_division=0)),
        'roc_auc': float(roc_auc_score(y_test, y_proba)) if len(np.unique(y_test)) > 1 else 0.0,
        'confusion_matrix': {
            'true_negatives': int(tn),
            'false_positives': int(fp),
            'false_negatives': int(fn),
            'true_positives': int(tp)
        },
        'classification_report': classification_report(y_test, y_pred, output_dict=True)
    }
    
    # False positive rate and specificity
    if tn + fp > 0:
        metrics['false_positive_rate'] = float(fp / (fp + tn))
        metrics['specificity'] = float(tn / (tn + fp))
    
    logger.info(f"Test metrics: accuracy={metrics['accuracy']:.3f}, "
                f"precision={metrics['precision']:.3f}, recall={metrics['recall']:.3f}, "
                f"f1={metrics['f1']:.3f}")
    
    return metrics


def compute_feature_importance(
    model: RandomForestClassifier,
    feature_names: List[str]
) -> Dict[str, float]:
    """
    Compute and rank feature importance.
    """
    importances = model.feature_importances_
    
    importance_dict = {}
    for name, importance in zip(feature_names, importances):
        importance_dict[name] = float(importance)
    
    # Sort by importance
    sorted_importance = dict(
        sorted(importance_dict.items(), key=lambda x: x[1], reverse=True)
    )
    
    return sorted_importance


# ============================================================================
# Main Pipeline
# ============================================================================

def run_training_pipeline(
    train_path: str,
    val_path: str,
    test_path: str,
    output_dir: str,
    tune_hyperparameters: bool = True,
    contamination: float = 0.1
) -> Dict[str, Any]:
    """
    Run the complete training pipeline.
    """
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    # =========================================================================
    # Step 1: Load Data
    # =========================================================================
    logger.info("=" * 60)
    logger.info("STEP 1: Loading Data")
    logger.info("=" * 60)
    
    train_df = pd.read_csv(train_path)
    val_df = pd.read_csv(val_path)
    test_df = pd.read_csv(test_path)
    
    logger.info(f"Train: {len(train_df)} samples")
    logger.info(f"Val: {len(val_df)} samples")
    logger.info(f"Test: {len(test_df)} samples")
    
    # Check for label column
    label_col = 'anomaly_label'
    if label_col not in train_df.columns:
        raise ValueError(f"Label column '{label_col}' not found. Run export_and_label_data.py first.")
    
    # =========================================================================
    # Step 2: Feature Engineering
    # =========================================================================
    logger.info("=" * 60)
    logger.info("STEP 2: Feature Engineering")
    logger.info("=" * 60)
    
    X_train, feature_names = prepare_features(train_df)
    X_val, _ = prepare_features(val_df)
    X_test, _ = prepare_features(test_df)
    
    y_train = train_df[label_col].values.astype(int)
    y_val = val_df[label_col].values.astype(int)
    y_test = test_df[label_col].values.astype(int)
    
    logger.info(f"Features: {feature_names}")
    logger.info(f"Train class distribution: normal={int((y_train==0).sum())}, anomaly={int((y_train==1).sum())}")
    
    # =========================================================================
    # Step 3: Scale Features
    # =========================================================================
    logger.info("=" * 60)
    logger.info("STEP 3: Scaling Features")
    logger.info("=" * 60)
    
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)
    
    # =========================================================================
    # Step 4: Train RandomForest
    # =========================================================================
    logger.info("=" * 60)
    logger.info("STEP 4: Training RandomForest Classifier")
    logger.info("=" * 60)
    
    rf_model, rf_info = train_random_forest(
        X_train_scaled, y_train,
        X_val_scaled, y_val,
        tune_hyperparameters=tune_hyperparameters
    )
    
    # =========================================================================
    # Step 5: Train Isolation Forest
    # =========================================================================
    logger.info("=" * 60)
    logger.info("STEP 5: Training Isolation Forest")
    logger.info("=" * 60)
    
    # Train only on normal data for better anomaly detection
    X_train_normal = X_train_scaled[y_train == 0]
    if len(X_train_normal) < 10:
        X_train_normal = X_train_scaled  # Use all if too few normals
    
    iso_model, iso_info = train_isolation_forest(X_train_normal, contamination)
    
    # =========================================================================
    # Step 6: Evaluate on Test Set
    # =========================================================================
    logger.info("=" * 60)
    logger.info("STEP 6: Evaluating on Test Set")
    logger.info("=" * 60)
    
    test_metrics = evaluate_on_test_set(rf_model, scaler, X_test, y_test)
    
    # =========================================================================
    # Step 7: Feature Importance
    # =========================================================================
    logger.info("=" * 60)
    logger.info("STEP 7: Computing Feature Importance")
    logger.info("=" * 60)
    
    feature_importance = compute_feature_importance(rf_model, feature_names)
    
    logger.info("Feature Importance Ranking:")
    for feat, imp in feature_importance.items():
        logger.info(f"  {feat}: {imp:.4f}")
    
    # =========================================================================
    # Step 8: Save Models
    # =========================================================================
    logger.info("=" * 60)
    logger.info("STEP 8: Saving Models")
    logger.info("=" * 60)
    
    # Save RandomForest model (compatible with anomaly_detector.py)
    model_data = {
        'model': rf_model,
        'scaler': scaler,
        'accuracy': test_metrics['accuracy'],
        'feature_names': feature_names
    }
    joblib.dump(model_data, output_path / 'anomaly_model.joblib')
    logger.info(f"Saved RandomForest to {output_path / 'anomaly_model.joblib'}")
    
    # Save Isolation Forest
    iso_data = {
        'isolation_forest': iso_model,
        'scaler': scaler,
        'features': feature_names
    }
    joblib.dump(iso_data, output_path / 'isolation_forest.joblib')
    logger.info(f"Saved IsolationForest to {output_path / 'isolation_forest.joblib'}")
    
    # Save scaler separately
    joblib.dump(scaler, output_path / 'scaler.joblib')
    
    # =========================================================================
    # Step 9: Generate Training Report
    # =========================================================================
    logger.info("=" * 60)
    logger.info("STEP 9: Generating Training Report")
    logger.info("=" * 60)
    
    report = {
        'trained_at': datetime.now().isoformat(),
        'data_summary': {
            'train_samples': len(train_df),
            'val_samples': len(val_df),
            'test_samples': len(test_df),
            'total_samples': len(train_df) + len(val_df) + len(test_df),
            'features_used': feature_names,
            'n_features': len(feature_names)
        },
        'class_distribution': {
            'train': {
                'normal': int((y_train == 0).sum()),
                'anomaly': int((y_train == 1).sum()),
                'anomaly_rate': float(y_train.mean())
            },
            'val': {
                'normal': int((y_val == 0).sum()),
                'anomaly': int((y_val == 1).sum()),
                'anomaly_rate': float(y_val.mean())
            },
            'test': {
                'normal': int((y_test == 0).sum()),
                'anomaly': int((y_test == 1).sum()),
                'anomaly_rate': float(y_test.mean())
            }
        },
        'random_forest': rf_info,
        'isolation_forest': iso_info,
        'test_metrics': test_metrics,
        'feature_importance': feature_importance,
        'model_files': {
            'random_forest': 'anomaly_model.joblib',
            'isolation_forest': 'isolation_forest.joblib',
            'scaler': 'scaler.joblib'
        }
    }
    
    with open(output_path / 'training_report.json', 'w') as f:
        json.dump(report, f, indent=2, default=str)
    
    logger.info(f"Saved training report to {output_path / 'training_report.json'}")
    
    # Print summary
    print("\n" + "=" * 60)
    print("TRAINING COMPLETE")
    print("=" * 60)
    print(f"\nTest Set Performance:")
    print(f"  Accuracy:  {test_metrics['accuracy']:.3f}")
    print(f"  Precision: {test_metrics['precision']:.3f}")
    print(f"  Recall:    {test_metrics['recall']:.3f}")
    print(f"  F1 Score:  {test_metrics['f1']:.3f}")
    print(f"  ROC-AUC:   {test_metrics['roc_auc']:.3f}")
    print(f"\nConfusion Matrix:")
    cm = test_metrics['confusion_matrix']
    print(f"  TN: {cm['true_negatives']:4d}  FP: {cm['false_positives']:4d}")
    print(f"  FN: {cm['false_negatives']:4d}  TP: {cm['true_positives']:4d}")
    print(f"\nModels saved to: {output_path}")
    
    return report


def main():
    parser = argparse.ArgumentParser(
        description="Train anomaly detection models from labeled data"
    )
    parser.add_argument(
        "--train",
        type=str,
        default="data/train.csv",
        help="Path to training data CSV"
    )
    parser.add_argument(
        "--val",
        type=str,
        default="data/val.csv",
        help="Path to validation data CSV"
    )
    parser.add_argument(
        "--test",
        type=str,
        default="data/test.csv",
        help="Path to test data CSV"
    )
    parser.add_argument(
        "--output",
        type=str,
        default="models/",
        help="Output directory for trained models"
    )
    parser.add_argument(
        "--no-tune",
        action="store_true",
        help="Skip hyperparameter tuning"
    )
    parser.add_argument(
        "--contamination",
        type=float,
        default=0.1,
        help="Isolation Forest contamination rate (default: 0.1)"
    )
    
    args = parser.parse_args()
    
    run_training_pipeline(
        train_path=args.train,
        val_path=args.val,
        test_path=args.test,
        output_dir=args.output,
        tune_hyperparameters=not args.no_tune,
        contamination=args.contamination
    )


if __name__ == "__main__":
    main()

