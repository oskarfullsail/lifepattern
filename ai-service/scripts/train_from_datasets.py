#!/usr/bin/env python3
"""
Training Script for Population Baselines

Loads public health datasets, trains population baselines and ML models,
validates against literature values, and saves pretrained artifacts.

Usage:
    # Train from single dataset
    python scripts/train_from_datasets.py \
        --datasets data/fitbit_daily_activity.csv \
        --types fitbit \
        --output pretrained/

    # Train from multiple datasets
    python scripts/train_from_datasets.py \
        --datasets data/fitbit.csv data/sleep.csv \
        --types fitbit fitbit_sleep \
        --output pretrained/ \
        --validate

    # Generate sample data for testing
    python scripts/train_from_datasets.py --generate-sample --output pretrained/

Example with Kaggle download (manual):
    1. Download FitBit data from: https://www.kaggle.com/datasets/arashnic/fitbit
    2. Extract to data/fitbit/
    3. Run: python scripts/train_from_datasets.py \
        --datasets data/fitbit/dailyActivity_merged.csv \
        --types fitbit \
        --output pretrained/
"""

import os
import sys
import argparse
import logging
from pathlib import Path
from datetime import datetime
import json

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import pandas as pd
import numpy as np

from utils.dataset_loader import DatasetLoader, DATASET_MAPPINGS
from utils.baseline_trainer import BaselineTrainer, MetricBaseline

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description='Train population baselines from health datasets',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    
    # Dataset arguments
    parser.add_argument(
        '--datasets', '-d',
        nargs='+',
        help='Paths to dataset files (CSV, Parquet, or Excel)'
    )
    
    parser.add_argument(
        '--types', '-t',
        nargs='+',
        choices=list(DATASET_MAPPINGS.keys()),
        help='Dataset types for automatic column mapping (one per dataset)'
    )
    
    # Output arguments
    parser.add_argument(
        '--output', '-o',
        default='pretrained/',
        help='Output directory for pretrained artifacts (default: pretrained/)'
    )
    
    # Training options
    parser.add_argument(
        '--threshold-method',
        choices=['iqr', 'percentile', 'zscore'],
        default='iqr',
        help='Method for computing threshold bounds (default: iqr)'
    )
    
    parser.add_argument(
        '--contamination',
        type=float,
        default=0.1,
        help='Isolation Forest contamination parameter (default: 0.1)'
    )
    
    parser.add_argument(
        '--n-estimators',
        type=int,
        default=100,
        help='Number of trees in Isolation Forest (default: 100)'
    )
    
    # Validation
    parser.add_argument(
        '--validate',
        action='store_true',
        help='Validate trained baselines against literature values'
    )
    
    parser.add_argument(
        '--compare-report',
        type=str,
        help='Generate comparison report to specified file'
    )
    
    # Utility options
    parser.add_argument(
        '--generate-sample',
        action='store_true',
        help='Generate sample synthetic data for testing'
    )
    
    parser.add_argument(
        '--list-types',
        action='store_true',
        help='List available dataset types and exit'
    )
    
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Enable verbose logging'
    )
    
    return parser.parse_args()


def list_dataset_types():
    """Print available dataset types."""
    print("\nAvailable Dataset Types:")
    print("=" * 60)
    
    for dtype, mapping in DATASET_MAPPINGS.items():
        print(f"\n{dtype}:")
        print(f"  Description: {mapping.description}")
        if mapping.source_url:
            print(f"  Source: {mapping.source_url}")
        if mapping.required_columns:
            print(f"  Required columns: {', '.join(mapping.required_columns)}")
        print(f"  Column mappings: {len(mapping.column_map)}")


def generate_sample_data(output_dir: str) -> pd.DataFrame:
    """
    Generate synthetic sample data for testing the training pipeline.
    
    Creates realistic-looking health data based on population distributions.
    """
    logger.info("Generating synthetic sample data...")
    
    np.random.seed(42)
    n_samples = 500
    n_users = 10
    
    # Generate dates for 50 days per user
    dates = []
    user_ids = []
    for user in range(n_users):
        for day in range(n_samples // n_users):
            dates.append(f"2024-{(day // 30) + 1:02d}-{(day % 30) + 1:02d}")
            user_ids.append(f"user_{user:03d}")
    
    # Generate realistic distributions
    data = {
        'date': dates,
        'user_id': user_ids,
        
        # Sleep: Normal distribution, mean=7.5, std=1.2
        'sleep_hours': np.clip(np.random.normal(7.5, 1.2, n_samples), 3, 12),
        
        # Steps: Log-normal distribution, median ~7500
        'steps': np.clip(np.random.lognormal(np.log(7500), 0.5, n_samples), 1000, 25000).astype(int),
        
        # Heart rate: Normal, mean=72, std=12
        'heart_rate': np.clip(np.random.normal(72, 12, n_samples), 45, 120).astype(int),
        
        # Resting HR: Normal, mean=65, std=8
        'heart_rate_resting': np.clip(np.random.normal(65, 8, n_samples), 40, 100).astype(int),
        
        # Exercise duration (hours): Exponential distribution, mean=0.4
        'exercise_duration': np.clip(np.random.exponential(0.4, n_samples), 0, 3),
        
        # Stress level (1-10): Beta distribution, shifted
        'stress_level': np.clip(np.random.beta(2, 3, n_samples) * 10 + 1, 1, 10),
        
        # Water intake: Normal, mean=2.2, std=0.6
        'water_intake': np.clip(np.random.normal(2.2, 0.6, n_samples), 0.5, 4),
        
        # Active energy: Log-normal
        'active_energy': np.clip(np.random.lognormal(np.log(300), 0.5, n_samples), 50, 1500).astype(int),
        
        # Sleep quality (0-100): Beta distribution
        'sleep_quality': np.clip(np.random.beta(5, 2, n_samples) * 100, 20, 100),
    }
    
    # Add some anomalies (~5%)
    anomaly_indices = np.random.choice(n_samples, size=int(n_samples * 0.05), replace=False)
    for idx in anomaly_indices:
        anomaly_type = np.random.choice(['sleep', 'stress', 'activity'])
        if anomaly_type == 'sleep':
            data['sleep_hours'][idx] = np.random.choice([3.5, 4.0, 11.0, 12.0])
        elif anomaly_type == 'stress':
            data['stress_level'][idx] = np.random.uniform(8, 10)
        else:
            data['steps'][idx] = np.random.choice([500, 1000, 22000, 25000])
    
    df = pd.DataFrame(data)
    df['source_dataset'] = 'synthetic_sample'
    
    # Save sample data
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    sample_file = output_path.parent / 'data' / 'sample_health_data.csv'
    sample_file.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(sample_file, index=False)
    
    logger.info(f"Generated {n_samples} samples, saved to {sample_file}")
    
    return df


def load_datasets(
    dataset_paths: list,
    dataset_types: list,
    loader: DatasetLoader
) -> pd.DataFrame:
    """Load and combine multiple datasets."""
    
    if len(dataset_types) == 1 and len(dataset_paths) > 1:
        # Use same type for all datasets
        dataset_types = dataset_types * len(dataset_paths)
    
    if len(dataset_paths) != len(dataset_types):
        raise ValueError(
            f"Number of datasets ({len(dataset_paths)}) must match "
            f"number of types ({len(dataset_types)})"
        )
    
    dataset_specs = [
        {'file_path': path, 'dataset_type': dtype}
        for path, dtype in zip(dataset_paths, dataset_types)
    ]
    
    combined_df = loader.load_multiple_datasets(dataset_specs)
    
    return combined_df


def generate_comparison_report(
    trainer: BaselineTrainer,
    output_file: str
) -> None:
    """Generate a detailed comparison report."""
    
    report = {
        'generated_at': datetime.now().isoformat(),
        'metrics': {}
    }
    
    for metric, baseline in trainer.baselines.items():
        report['metrics'][metric] = {
            'trained_values': {
                'mean': baseline.mean,
                'std': baseline.std,
                'median': baseline.median,
                'iqr': baseline.iqr,
                'p5': baseline.p5,
                'p95': baseline.p95,
                'n_samples': baseline.n_samples
            },
            'thresholds': {
                'optimal': [baseline.optimal_min, baseline.optimal_max],
                'warning': [baseline.warning_low, baseline.warning_high],
                'critical': [baseline.critical_low, baseline.critical_high]
            }
        }
        
        # Add literature comparison if available
        if metric in trainer.literature_baselines:
            lit = trainer.literature_baselines[metric]
            report['metrics'][metric]['literature_values'] = lit
            report['metrics'][metric]['difference'] = {
                'mean_diff_pct': abs(baseline.mean - lit['mean']) / lit['mean'] * 100 if lit['mean'] != 0 else 0,
                'std_diff_pct': abs(baseline.std - lit['std']) / lit['std'] * 100 if lit['std'] != 0 else 0
            }
    
    with open(output_file, 'w') as f:
        json.dump(report, f, indent=2)
    
    logger.info(f"Comparison report saved to {output_file}")


def print_training_summary(trainer: BaselineTrainer) -> None:
    """Print a summary of training results."""
    
    print("\n" + "=" * 60)
    print("TRAINING SUMMARY")
    print("=" * 60)
    
    if trainer.training_report:
        report = trainer.training_report
        print(f"\nTotal samples: {report.total_samples}")
        print(f"Training time: {report.training_duration_seconds:.2f}s")
        print(f"Metrics trained: {len(report.metrics_trained)}")
        print(f"Isolation Forest: {'Trained' if report.isolation_forest_trained else 'Not trained'}")
        
        if report.warnings:
            print("\nWarnings:")
            for warning in report.warnings:
                print(f"  ⚠️  {warning}")
    
    print("\nTrained Baselines:")
    print("-" * 60)
    print(f"{'Metric':<25} {'Mean':>10} {'Std':>10} {'Samples':>10}")
    print("-" * 60)
    
    for name, baseline in sorted(trainer.baselines.items()):
        print(f"{name:<25} {baseline.mean:>10.2f} {baseline.std:>10.2f} {baseline.n_samples:>10}")
    
    print("-" * 60)
    
    # Validation results
    if trainer.training_report and trainer.training_report.validation_vs_literature:
        print("\nValidation vs Literature:")
        print("-" * 60)
        
        for metric, validation in trainer.training_report.validation_vs_literature.items():
            status = "✓" if validation['within_10pct'] else "⚠"
            print(f"  {status} {metric}: trained={validation['trained_mean']:.2f}, "
                  f"literature={validation['literature_mean']:.2f} "
                  f"({validation['mean_diff_pct']:.1f}% diff)")
    
    print()


def main():
    """Main entry point."""
    args = parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Handle utility commands
    if args.list_types:
        list_dataset_types()
        return 0
    
    # Initialize components
    loader = DatasetLoader()
    trainer = BaselineTrainer(
        threshold_method=args.threshold_method,
        contamination=args.contamination,
        n_estimators=args.n_estimators
    )
    
    # Load or generate data
    if args.generate_sample:
        combined_df = generate_sample_data(args.output)
        source_datasets = ['synthetic_sample']
    elif args.datasets:
        if not args.types:
            logger.error("--types is required when providing --datasets")
            return 1
        
        combined_df = load_datasets(args.datasets, args.types, loader)
        source_datasets = args.types
    else:
        logger.error("Either --datasets or --generate-sample is required")
        parser = argparse.ArgumentParser()
        parse_args()
        return 1
    
    if combined_df.empty:
        logger.error("No data loaded")
        return 1
    
    logger.info(f"Combined dataset: {len(combined_df)} rows")
    
    # Validate datasets
    if args.validate and args.datasets:
        for path, dtype in zip(args.datasets, args.types or []):
            logger.info(f"Validating {path} ({dtype})...")
            df = loader.load_dataset(path, dtype)
            report = loader.validate_dataset(df, dtype)
            if report['warnings']:
                for warning in report['warnings']:
                    logger.warning(warning)
    
    # Train baselines
    trainer.fit(combined_df, source_datasets=source_datasets)
    
    # Save artifacts
    saved_files = trainer.save(args.output)
    
    # Generate comparison report
    if args.compare_report:
        generate_comparison_report(trainer, args.compare_report)
    
    # Print summary
    print_training_summary(trainer)
    
    print("Saved files:")
    for artifact, path in saved_files.items():
        print(f"  - {artifact}: {path}")
    
    return 0


if __name__ == '__main__':
    sys.exit(main())

