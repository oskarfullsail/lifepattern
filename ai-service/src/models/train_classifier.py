#!/usr/bin/env python3
"""
Negative State Classifier Training

Trains a RandomForest classifier to predict anomalies (negative states)
from behavioral inputs.

This model is trained on KAGGLE DATA with real labels:
- Sleep Disorder != 'None' (from Sleep Health dataset)
- Low Wellness Score (from Lifestyle dataset)
- Low activity/sleep (from FitBit dataset)
- Stress condition (from HRV dataset)

Usage:
    python -m src.models.train_classifier
"""

import pandas as pd
import numpy as np
import json
import joblib
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import GridSearchCV, cross_val_score, StratifiedKFold
from sklearn.metrics import (
    classification_report, confusion_matrix, roc_auc_score,
    accuracy_score, precision_score, recall_score, f1_score
)
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def get_feature_columns(df: pd.DataFrame) -> list:
    """Get feature columns for training."""
    # Exclude non-feature columns
    exclude = ['is_anomaly', 'source', 'gender', 'age']
    return [c for c in df.columns if c not in exclude]


def train_negative_state_classifier(
    train_path: str = 'data/processed/train.csv',
    val_path: str = 'data/processed/val.csv',
    output_dir: str = 'data/models',
    tune_hyperparameters: bool = True
) -> tuple:
    """
    Train classifier on Kaggle data.
    
    Args:
        train_path: Path to training data
        val_path: Path to validation data
        output_dir: Directory to save model and results
        tune_hyperparameters: Whether to run hyperparameter search
        
    Returns:
        Tuple of (model, results_dict)
    """
    logger.info("=" * 60)
    logger.info("Training Negative State Classifier")
    logger.info("=" * 60)
    
    # Load data
    train = pd.read_csv(train_path)
    val = pd.read_csv(val_path)
    
    feature_cols = get_feature_columns(train)
    
    # Handle missing values - more robust approach
    numeric_cols = train[feature_cols].select_dtypes(include=[np.number]).columns.tolist()
    
    # Fill NaN with median, then fill any remaining with 0
    train_medians = train[numeric_cols].median()
    train_medians = train_medians.fillna(0)  # In case median is NaN too
    
    X_train = train[feature_cols].copy()
    X_train[numeric_cols] = X_train[numeric_cols].fillna(train_medians)
    X_train = X_train.fillna(0)  # Fill any remaining non-numeric NaNs
    y_train = train['is_anomaly'].astype(int)
    
    X_val = val[feature_cols].copy()
    X_val[numeric_cols] = X_val[numeric_cols].fillna(train_medians)
    X_val = X_val.fillna(0)
    y_val = val['is_anomaly'].astype(int)
    
    # Drop columns that are still problematic
    cols_to_drop = []
    for col in X_train.columns:
        if X_train[col].isna().any() or X_val[col].isna().any():
            cols_to_drop.append(col)
    
    if cols_to_drop:
        logger.warning(f"Dropping columns with NaN: {cols_to_drop}")
        X_train = X_train.drop(columns=cols_to_drop)
        X_val = X_val.drop(columns=cols_to_drop)
        feature_cols = [c for c in feature_cols if c not in cols_to_drop]
    
    logger.info(f"Training samples: {len(X_train)}")
    logger.info(f"Validation samples: {len(X_val)}")
    logger.info(f"Features: {len(feature_cols)}")
    logger.info(f"Train anomaly rate: {y_train.mean():.2%}")
    
    if tune_hyperparameters and len(X_train) >= 50:
        logger.info("Running hyperparameter search...")
        
        # Hyperparameter grid
        param_grid = {
            'n_estimators': [50, 100, 200],
            'max_depth': [5, 10, 15],
            'min_samples_split': [2, 5, 10],
            'class_weight': ['balanced', None]
        }
        
        rf = RandomForestClassifier(random_state=42, n_jobs=-1)
        cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        
        grid_search = GridSearchCV(
            rf, param_grid, 
            cv=cv, 
            scoring='f1', 
            n_jobs=-1,
            verbose=1
        )
        grid_search.fit(X_train, y_train)
        
        best_model = grid_search.best_estimator_
        best_params = grid_search.best_params_
        cv_score = grid_search.best_score_
        
        logger.info(f"Best params: {best_params}")
        logger.info(f"Best CV F1: {cv_score:.4f}")
        
    else:
        logger.info("Training with default parameters...")
        best_model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            min_samples_split=5,
            class_weight='balanced',
            random_state=42,
            n_jobs=-1
        )
        best_model.fit(X_train, y_train)
        best_params = best_model.get_params()
        
        # Cross-validation score
        cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        cv_scores = cross_val_score(best_model, X_train, y_train, cv=cv, scoring='f1')
        cv_score = cv_scores.mean()
    
    # Evaluate on validation
    y_pred = best_model.predict(X_val)
    y_prob = best_model.predict_proba(X_val)[:, 1]
    
    # Calculate metrics
    cm = confusion_matrix(y_val, y_pred)
    
    results = {
        'model_type': 'RandomForestClassifier',
        'best_params': {k: v for k, v in best_params.items() if v is not None},
        'cv_f1_score': float(cv_score),
        'validation': {
            'accuracy': float(accuracy_score(y_val, y_pred)),
            'precision': float(precision_score(y_val, y_pred, zero_division=0)),
            'recall': float(recall_score(y_val, y_pred, zero_division=0)),
            'f1': float(f1_score(y_val, y_pred, zero_division=0)),
            'roc_auc': float(roc_auc_score(y_val, y_prob)) if len(np.unique(y_val)) > 1 else 0
        },
        'confusion_matrix': cm.tolist(),
        'classification_report': classification_report(y_val, y_pred, output_dict=True),
        'feature_importance': {
            feat: float(imp) 
            for feat, imp in sorted(
                zip(feature_cols, best_model.feature_importances_),
                key=lambda x: x[1], 
                reverse=True
            )
        },
        'training_info': {
            'n_train': len(X_train),
            'n_val': len(X_val),
            'train_anomaly_rate': float(y_train.mean()),
            'val_anomaly_rate': float(y_val.mean()),
            'features_used': feature_cols,
            'trained_at': datetime.now().isoformat()
        }
    }
    
    # Save model and results
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    joblib.dump(best_model, output_path / 'negative_state_classifier.pkl')
    
    with open(output_path / 'classifier_results.json', 'w') as f:
        json.dump(results, f, indent=2, default=str)
    
    # Print summary
    print("\n" + "=" * 60)
    print("CLASSIFIER TRAINING COMPLETE")
    print("=" * 60)
    print(f"\nCV F1 Score:    {cv_score:.4f}")
    print(f"Val Accuracy:   {results['validation']['accuracy']:.4f}")
    print(f"Val Precision:  {results['validation']['precision']:.4f}")
    print(f"Val Recall:     {results['validation']['recall']:.4f}")
    print(f"Val F1:         {results['validation']['f1']:.4f}")
    print(f"Val ROC-AUC:    {results['validation']['roc_auc']:.4f}")
    print(f"\nConfusion Matrix:")
    print(f"  TN: {cm[0][0]:4d}  FP: {cm[0][1]:4d}")
    print(f"  FN: {cm[1][0]:4d}  TP: {cm[1][1]:4d}")
    print(f"\nTop 5 Features:")
    for i, (feat, imp) in enumerate(list(results['feature_importance'].items())[:5]):
        print(f"  {i+1}. {feat}: {imp:.4f}")
    print(f"\nModel saved to: {output_path / 'negative_state_classifier.pkl'}")
    
    return best_model, results


if __name__ == "__main__":
    train_negative_state_classifier()

