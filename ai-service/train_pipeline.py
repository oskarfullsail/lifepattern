#!/usr/bin/env python3
"""
LifePattern AI - Complete Training Pipeline

Master script that executes all training phases:
1. Data Preprocessing (unified dataset)
2. Threshold Calculation (data-driven thresholds)
3. Feature Engineering
4. Train/Val/Test Splits
5. Model Training (Classifier, Wellness, Anomaly)
6. Final Evaluation

This replaces hardcoded LITERATURE_BASELINES with DATA-DRIVEN thresholds
trained on Kaggle datasets.

Usage:
    # Full pipeline
    python train_pipeline.py --full
    
    # Individual phases
    python train_pipeline.py --preprocess
    python train_pipeline.py --thresholds
    python train_pipeline.py --features
    python train_pipeline.py --split
    python train_pipeline.py --train
    python train_pipeline.py --evaluate
    
    # Download Kaggle datasets first
    python train_pipeline.py --download
"""

import argparse
import logging
import sys
from pathlib import Path
from datetime import datetime

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def run_download():
    """Download Kaggle datasets."""
    import subprocess
    
    datasets = [
        ('uom190346a/sleep-health-and-lifestyle-dataset', 'Sleep Health'),
        ('ydalat/lifestyle-and-wellbeing-data', 'Lifestyle & Wellbeing'),
        ('arashnic/fitbit', 'FitBit'),
    ]
    
    print("\n" + "=" * 60)
    print("DOWNLOADING KAGGLE DATASETS")
    print("=" * 60)
    
    Path('data/raw').mkdir(parents=True, exist_ok=True)
    
    for dataset_id, name in datasets:
        print(f"\nDownloading {name}...")
        cmd = f"kaggle datasets download -d {dataset_id} -p data/raw/ --unzip"
        try:
            subprocess.run(cmd.split(), check=True)
            print(f"  ✓ Downloaded {name}")
        except Exception as e:
            print(f"  ✗ Failed: {e}")
            print("  Make sure kaggle CLI is installed: pip install kaggle")
            print("  And ~/.kaggle/kaggle.json is configured")


def run_preprocess():
    """Phase 1: Preprocess datasets."""
    from src.data.preprocessing import DataPreprocessor
    
    print("\n" + "=" * 60)
    print("PHASE 1: DATA PREPROCESSING")
    print("=" * 60)
    
    preprocessor = DataPreprocessor()
    df = preprocessor.create_unified_dataset()
    
    if len(df) == 0:
        print("\n⚠️  No data found! Download datasets first:")
        print("   python train_pipeline.py --download")
        return False
    
    return True


def run_thresholds():
    """Phase 2: Calculate data-driven thresholds."""
    from src.data.threshold_calculator import ThresholdCalculator
    import pandas as pd
    
    print("\n" + "=" * 60)
    print("PHASE 2: THRESHOLD CALCULATION")
    print("=" * 60)
    
    unified_path = Path('data/processed/unified_dataset.csv')
    if not unified_path.exists():
        print("Unified dataset not found. Run preprocessing first.")
        return False
    
    df = pd.read_csv(unified_path)
    calc = ThresholdCalculator(df)
    calc.calculate_all_thresholds()
    output = calc.save_thresholds()
    
    # Print comparison
    print("\nComparison with Literature:")
    comparison = calc.compare_with_literature()
    if not comparison.empty:
        print(comparison.to_string(index=False))
    
    return True


def run_features():
    """Phase 3: Feature engineering."""
    from src.features.feature_engineering import FeatureEngineer
    import pandas as pd
    
    print("\n" + "=" * 60)
    print("PHASE 3: FEATURE ENGINEERING")
    print("=" * 60)
    
    unified_path = Path('data/processed/unified_dataset.csv')
    if not unified_path.exists():
        print("Unified dataset not found. Run preprocessing first.")
        return False
    
    df = pd.read_csv(unified_path)
    engineer = FeatureEngineer()
    df = engineer.engineer_features(df)
    
    output_path = Path('data/processed/features_engineered.csv')
    df.to_csv(output_path, index=False)
    
    print(f"\n✓ Engineered features saved to {output_path}")
    print(f"  Total features: {len(engineer.get_feature_list())}")
    
    return True


def run_split():
    """Phase 4: Create train/val/test splits."""
    from src.data.split_data import create_splits
    import pandas as pd
    
    print("\n" + "=" * 60)
    print("PHASE 4: DATA SPLITTING")
    print("=" * 60)
    
    features_path = Path('data/processed/features_engineered.csv')
    if not features_path.exists():
        print("Engineered features not found. Run feature engineering first.")
        return False
    
    df = pd.read_csv(features_path)
    train_df, val_df, test_df = create_splits(df)
    
    return True


def run_train():
    """Phase 5: Train all models."""
    
    print("\n" + "=" * 60)
    print("PHASE 5: MODEL TRAINING")
    print("=" * 60)
    
    # Check data exists
    train_path = Path('data/processed/train.csv')
    if not train_path.exists():
        print("Training data not found. Run data splitting first.")
        return False
    
    # Train classifier
    print("\n--- Training Negative State Classifier ---")
    from src.models.train_classifier import train_negative_state_classifier
    classifier, classifier_results = train_negative_state_classifier()
    
    # Train wellness predictor
    print("\n--- Training Wellness Predictor ---")
    from src.models.train_wellness_predictor import train_wellness_predictor
    wellness, wellness_results = train_wellness_predictor()
    
    # Train anomaly detector
    print("\n--- Training Anomaly Detector ---")
    from src.models.train_anomaly_detector import train_anomaly_detector
    anomaly, anomaly_results = train_anomaly_detector()
    
    return True


def run_evaluate():
    """Phase 6: Final evaluation."""
    from src.evaluation.final_evaluation import evaluate_on_test_set, compare_with_baseline
    
    print("\n" + "=" * 60)
    print("PHASE 6: FINAL EVALUATION")
    print("=" * 60)
    
    test_path = Path('data/processed/test.csv')
    model_path = Path('data/models/negative_state_classifier.pkl')
    
    if not test_path.exists() or not model_path.exists():
        print("Test data or model not found. Run training first.")
        return False
    
    results = evaluate_on_test_set()
    baseline = compare_with_baseline()
    
    print("\n" + "=" * 60)
    print("BASELINE COMPARISON")
    print("=" * 60)
    print(f"\nRule-based baseline (sleep<6h OR stress>7):")
    print(f"  Accuracy:  {baseline['accuracy']:.4f}")
    print(f"  F1:        {baseline['f1']:.4f}")
    print(f"\nTrained model improvement:")
    print(f"  Accuracy:  +{(results['metrics']['accuracy'] - baseline['accuracy'])*100:.1f}%")
    print(f"  F1:        +{(results['metrics']['f1'] - baseline['f1'])*100:.1f}%")
    
    return True


def run_full_pipeline():
    """Run complete training pipeline."""
    
    print("\n" + "=" * 60)
    print("LIFEPATTERN AI - FULL TRAINING PIPELINE")
    print("=" * 60)
    print(f"Started at: {datetime.now().isoformat()}")
    
    phases = [
        ("Preprocessing", run_preprocess),
        ("Thresholds", run_thresholds),
        ("Features", run_features),
        ("Split", run_split),
        ("Training", run_train),
        ("Evaluation", run_evaluate),
    ]
    
    for name, func in phases:
        print(f"\n{'='*60}")
        print(f"Running: {name}")
        print(f"{'='*60}")
        
        success = func()
        if not success:
            print(f"\n❌ Pipeline failed at: {name}")
            return False
    
    print("\n" + "=" * 60)
    print("✅ PIPELINE COMPLETE")
    print("=" * 60)
    print(f"\nCompleted at: {datetime.now().isoformat()}")
    print("\nGenerated files:")
    print("  data/processed/unified_dataset.csv")
    print("  data/processed/data_driven_thresholds.json")
    print("  data/processed/features_engineered.csv")
    print("  data/processed/train.csv, val.csv, test.csv")
    print("  data/models/negative_state_classifier.pkl")
    print("  data/models/wellness_predictor.pkl")
    print("  data/models/anomaly_detector.pkl")
    print("  data/models/final_test_results.json")
    
    return True


def main():
    parser = argparse.ArgumentParser(
        description="LifePattern AI Training Pipeline"
    )
    
    parser.add_argument('--download', action='store_true',
                       help='Download Kaggle datasets')
    parser.add_argument('--preprocess', action='store_true',
                       help='Run preprocessing phase')
    parser.add_argument('--thresholds', action='store_true',
                       help='Calculate data-driven thresholds')
    parser.add_argument('--features', action='store_true',
                       help='Run feature engineering')
    parser.add_argument('--split', action='store_true',
                       help='Create train/val/test splits')
    parser.add_argument('--train', action='store_true',
                       help='Train all models')
    parser.add_argument('--evaluate', action='store_true',
                       help='Run final evaluation')
    parser.add_argument('--full', action='store_true',
                       help='Run full pipeline')
    
    args = parser.parse_args()
    
    # If no arguments, show help
    if len(sys.argv) == 1:
        parser.print_help()
        return
    
    if args.download:
        run_download()
    elif args.preprocess:
        run_preprocess()
    elif args.thresholds:
        run_thresholds()
    elif args.features:
        run_features()
    elif args.split:
        run_split()
    elif args.train:
        run_train()
    elif args.evaluate:
        run_evaluate()
    elif args.full:
        run_full_pipeline()


if __name__ == "__main__":
    main()

