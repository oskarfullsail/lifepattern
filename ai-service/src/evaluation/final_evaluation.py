#!/usr/bin/env python3
"""
Final Model Evaluation

Evaluates trained models on held-out test set.
Generates comprehensive metrics for thesis documentation.

Usage:
    python -m src.evaluation.final_evaluation
"""

import pandas as pd
import numpy as np
import json
import joblib
from pathlib import Path
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, classification_report,
    roc_curve, precision_recall_curve
)
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def get_feature_columns(df: pd.DataFrame) -> list:
    """Get feature columns for training."""
    exclude = ['is_anomaly', 'source', 'gender', 'age']
    return [c for c in df.columns if c not in exclude]


def evaluate_on_test_set(
    test_path: str = 'data/processed/test.csv',
    model_path: str = 'data/models/negative_state_classifier.pkl',
    output_dir: str = 'data/models'
) -> dict:
    """
    Final evaluation on held-out test set.
    
    Args:
        test_path: Path to test data
        model_path: Path to trained model
        output_dir: Directory to save results
        
    Returns:
        Dictionary with evaluation metrics
    """
    logger.info("=" * 60)
    logger.info("FINAL MODEL EVALUATION")
    logger.info("=" * 60)
    
    # Load test data
    test = pd.read_csv(test_path)
    
    # Load model
    model = joblib.load(model_path)
    
    feature_cols = get_feature_columns(test)
    
    # Convert all columns to numeric and handle missing values
    X_test = test[feature_cols].copy()
    
    for col in X_test.columns:
        X_test[col] = pd.to_numeric(X_test[col], errors='coerce')
    
    # Fill NaN with median, then with 0 for any remaining
    medians = X_test.median()
    X_test = X_test.fillna(medians)
    X_test = X_test.fillna(0)
    
    y_test = test['is_anomaly'].astype(int)
    
    logger.info(f"Test samples: {len(X_test)}")
    logger.info(f"Test anomaly rate: {y_test.mean():.2%}")
    
    # Predict
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    
    # Calculate metrics
    cm = confusion_matrix(y_test, y_pred)
    tn, fp, fn, tp = cm.ravel() if cm.size == 4 else (0, 0, 0, 0)
    
    # ROC and PR curves
    fpr, tpr, roc_thresholds = roc_curve(y_test, y_prob)
    precision_curve, recall_curve, pr_thresholds = precision_recall_curve(y_test, y_prob)
    
    results = {
        'evaluation_type': 'final_test_set',
        'test_samples': len(y_test),
        'test_anomaly_rate': float(y_test.mean()),
        'metrics': {
            'accuracy': float(accuracy_score(y_test, y_pred)),
            'precision': float(precision_score(y_test, y_pred, zero_division=0)),
            'recall': float(recall_score(y_test, y_pred, zero_division=0)),
            'f1': float(f1_score(y_test, y_pred, zero_division=0)),
            'roc_auc': float(roc_auc_score(y_test, y_prob)) if len(np.unique(y_test)) > 1 else 0,
            'specificity': float(tn / (tn + fp)) if (tn + fp) > 0 else 0,
            'false_positive_rate': float(fp / (fp + tn)) if (fp + tn) > 0 else 0,
            'false_negative_rate': float(fn / (fn + tp)) if (fn + tp) > 0 else 0
        },
        'confusion_matrix': {
            'true_negatives': int(tn),
            'false_positives': int(fp),
            'false_negatives': int(fn),
            'true_positives': int(tp)
        },
        'classification_report': classification_report(y_test, y_pred, output_dict=True),
        'roc_curve': {
            'fpr': fpr.tolist(),
            'tpr': tpr.tolist(),
            'thresholds': roc_thresholds.tolist()
        },
        'feature_importance': {
            feat: float(imp) 
            for feat, imp in zip(feature_cols, model.feature_importances_)
        } if hasattr(model, 'feature_importances_') else {},
        'evaluated_at': datetime.now().isoformat()
    }
    
    # Save results
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    with open(output_path / 'final_test_results.json', 'w') as f:
        json.dump(results, f, indent=2, default=str)
    
    # Print summary
    print("\n" + "=" * 60)
    print("FINAL TEST SET RESULTS")
    print("=" * 60)
    print(f"\nDataset:")
    print(f"  Test samples:    {results['test_samples']}")
    print(f"  Anomaly rate:    {results['test_anomaly_rate']:.2%}")
    
    print(f"\nClassification Metrics:")
    print(f"  Accuracy:        {results['metrics']['accuracy']:.4f}")
    print(f"  Precision:       {results['metrics']['precision']:.4f}")
    print(f"  Recall:          {results['metrics']['recall']:.4f}")
    print(f"  F1 Score:        {results['metrics']['f1']:.4f}")
    print(f"  ROC-AUC:         {results['metrics']['roc_auc']:.4f}")
    print(f"  Specificity:     {results['metrics']['specificity']:.4f}")
    
    print(f"\nConfusion Matrix:")
    print(f"                 Predicted")
    print(f"              Normal  Anomaly")
    print(f"  Actual Normal  {tn:4d}    {fp:4d}")
    print(f"  Actual Anomaly {fn:4d}    {tp:4d}")
    
    print(f"\nError Rates:")
    print(f"  False Positive Rate: {results['metrics']['false_positive_rate']:.4f}")
    print(f"  False Negative Rate: {results['metrics']['false_negative_rate']:.4f}")
    
    if results['feature_importance']:
        print(f"\nTop 5 Feature Importance:")
        sorted_importance = sorted(
            results['feature_importance'].items(), 
            key=lambda x: x[1], 
            reverse=True
        )[:5]
        for i, (feat, imp) in enumerate(sorted_importance):
            print(f"  {i+1}. {feat}: {imp:.4f}")
    
    print(f"\nResults saved to: {output_path / 'final_test_results.json'}")
    
    return results


def compare_with_baseline(test_path: str = 'data/processed/test.csv') -> dict:
    """
    Compare trained model with simple baseline.
    
    Baseline: Predict anomaly if sleep < 6h OR stress > 7.
    """
    test = pd.read_csv(test_path)
    y_test = test['is_anomaly'].astype(int)
    
    # Simple rule-based baseline
    baseline_pred = np.zeros(len(test))
    
    if 'sleep_hours' in test.columns:
        baseline_pred[test['sleep_hours'] < 6] = 1
    if 'stress_level' in test.columns:
        baseline_pred[test['stress_level'] > 7] = 1
    
    baseline_metrics = {
        'accuracy': float(accuracy_score(y_test, baseline_pred)),
        'precision': float(precision_score(y_test, baseline_pred, zero_division=0)),
        'recall': float(recall_score(y_test, baseline_pred, zero_division=0)),
        'f1': float(f1_score(y_test, baseline_pred, zero_division=0))
    }
    
    return baseline_metrics


def generate_thesis_figures(output_dir: str = 'data/models/figures'):
    """
    Generate figures for thesis (ROC curve, confusion matrix, etc.)
    
    Requires matplotlib - optional for thesis documentation.
    """
    try:
        import matplotlib.pyplot as plt
        
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        # Load results
        with open('data/models/final_test_results.json') as f:
            results = json.load(f)
        
        # ROC Curve
        plt.figure(figsize=(8, 6))
        plt.plot(
            results['roc_curve']['fpr'],
            results['roc_curve']['tpr'],
            label=f"ROC (AUC = {results['metrics']['roc_auc']:.3f})"
        )
        plt.plot([0, 1], [0, 1], 'k--', label='Random')
        plt.xlabel('False Positive Rate')
        plt.ylabel('True Positive Rate')
        plt.title('ROC Curve - Anomaly Detection Model')
        plt.legend()
        plt.savefig(output_path / 'roc_curve.png', dpi=150, bbox_inches='tight')
        plt.close()
        
        logger.info(f"Figures saved to {output_path}")
        
    except ImportError:
        logger.warning("matplotlib not available for figure generation")


if __name__ == "__main__":
    # Run final evaluation
    results = evaluate_on_test_set()
    
    # Compare with baseline
    print("\n" + "=" * 60)
    print("COMPARISON WITH RULE-BASED BASELINE")
    print("=" * 60)
    
    baseline = compare_with_baseline()
    print(f"\nBaseline (sleep<6h OR stress>7):")
    print(f"  Accuracy:  {baseline['accuracy']:.4f}")
    print(f"  Precision: {baseline['precision']:.4f}")
    print(f"  Recall:    {baseline['recall']:.4f}")
    print(f"  F1:        {baseline['f1']:.4f}")
    
    print(f"\nTrained Model Improvement over Baseline:")
    print(f"  Accuracy:  +{(results['metrics']['accuracy'] - baseline['accuracy'])*100:.1f}%")
    print(f"  F1 Score:  +{(results['metrics']['f1'] - baseline['f1'])*100:.1f}%")

