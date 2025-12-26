#!/usr/bin/env python3
"""
Data Export and Labeling Script for LifePattern AI Thesis

This script:
1. Fetches routine logs from the backend API
2. Loads pretrained population baselines for threshold-based detection
3. Applies multi-criteria anomaly labeling (4 methods)
4. Computes derived features (z-scores, rolling averages)
5. Splits data into train/val/test sets
6. Outputs labeled_dataset.csv for model training

Usage:
    python scripts/export_and_label_data.py \
        --api-url https://lifepattern-backend.onrender.com \
        --token YOUR_JWT_TOKEN \
        --output data/

    # Use pretrained baselines for labeling
    python scripts/export_and_label_data.py \
        --input-csv data/routine_logs_export.csv \
        --baselines pretrained/baselines.json \
        --output data/

Labeling Strategy (per thesis plan):
    Anomaly = TRUE if ANY of:
      1. Value outside pretrained warning thresholds
      2. Per-user z-score > 2.0 or < -2.0
      3. Daily health score dropped >20% from 7-day rolling average
      4. AI service flagged as anomaly (is_anomaly=true)
"""

import os
import sys
import json
import argparse
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import requests
import pandas as pd
import numpy as np
from scipy import stats

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Try to import pretrained baseline utilities
try:
    from utils.baseline_trainer import BaselineTrainer
    HAS_BASELINE_TRAINER = True
except ImportError:
    HAS_BASELINE_TRAINER = False
    logger.warning("Could not import BaselineTrainer, using fallback thresholds")


# ============================================================================
# Configuration
# ============================================================================

# Metrics to analyze for z-score anomalies
METRICS = [
    'sleep_hours',
    'screen_time', 
    'exercise_duration',
    'water_intake',
    'stress_level',
]

# Metrics available in pretrained baselines
PRETRAINED_METRICS = [
    'sleep_hours',
    'steps',
    'heart_rate',
    'heart_rate_resting',
    'exercise_duration',
    'active_energy',
    'stress_level',
    'water_intake',
    'sleep_quality',
]

# Z-score threshold for anomaly detection
ZSCORE_THRESHOLD = 2.0

# Health score drop threshold (percentage)
HEALTH_SCORE_DROP_THRESHOLD = 0.20

# Rolling window for baseline calculation
ROLLING_WINDOW = 7

# Train/Val/Test split ratios
TRAIN_RATIO = 0.70
VAL_RATIO = 0.15
TEST_RATIO = 0.15

# Default path to pretrained baselines
DEFAULT_BASELINES_PATH = Path(__file__).parent.parent / "pretrained" / "baselines.json"


# ============================================================================
# Pretrained Baseline Loading
# ============================================================================

def load_pretrained_baselines(baselines_path: Optional[str] = None) -> Dict[str, Dict]:
    """
    Load pretrained population baselines from JSON file.
    
    Returns dict with threshold values for each metric:
    {
        'sleep_hours': {
            'mean': 7.5,
            'std': 1.26,
            'warning_low': 4.2,
            'warning_high': 10.7,
            'critical_low': 1.8,
            'critical_high': 13.2,
            'optimal_min': 6.6,
            'optimal_max': 8.3,
            ...
        },
        ...
    }
    """
    if baselines_path is None:
        baselines_path = DEFAULT_BASELINES_PATH
    
    baselines_path = Path(baselines_path)
    
    if not baselines_path.exists():
        logger.warning(f"Pretrained baselines not found at {baselines_path}")
        return {}
    
    try:
        with open(baselines_path, 'r') as f:
            baselines = json.load(f)
        logger.info(f"Loaded pretrained baselines for {len(baselines)} metrics")
        return baselines
    except Exception as e:
        logger.error(f"Failed to load baselines: {e}")
        return {}


def compute_threshold_anomalies(
    df: pd.DataFrame,
    baselines: Dict[str, Dict],
    use_warning: bool = True
) -> pd.DataFrame:
    """
    Flag anomalies based on pretrained population thresholds.
    
    Uses the warning thresholds (1.5 IQR) by default.
    Set use_warning=False to use critical thresholds (3.0 IQR).
    """
    df = df.copy()
    
    threshold_type = 'warning' if use_warning else 'critical'
    
    for metric, baseline in baselines.items():
        if metric not in df.columns:
            continue
        
        low_key = f'{threshold_type}_low'
        high_key = f'{threshold_type}_high'
        
        if low_key not in baseline or high_key not in baseline:
            continue
        
        low_threshold = baseline[low_key]
        high_threshold = baseline[high_key]
        
        # Flag values outside thresholds
        df[f'{metric}_threshold_anomaly'] = (
            (df[metric] < low_threshold) | (df[metric] > high_threshold)
        ).astype(int)
        
        # Add which direction the anomaly is
        df[f'{metric}_threshold_direction'] = np.where(
            df[metric] < low_threshold, 'low',
            np.where(df[metric] > high_threshold, 'high', 'normal')
        )
        
        # Count anomalies
        n_anomalies = df[f'{metric}_threshold_anomaly'].sum()
        if n_anomalies > 0:
            logger.info(f"  {metric}: {n_anomalies} threshold anomalies ({n_anomalies/len(df)*100:.1f}%)")
    
    return df


def compute_population_zscores(
    df: pd.DataFrame,
    baselines: Dict[str, Dict]
) -> pd.DataFrame:
    """
    Compute z-scores using pretrained population mean/std.
    
    This compares each user's values against the population distribution,
    rather than just their own personal history.
    """
    df = df.copy()
    
    for metric, baseline in baselines.items():
        if metric not in df.columns:
            continue
        
        if 'mean' not in baseline or 'std' not in baseline:
            continue
        
        pop_mean = baseline['mean']
        pop_std = baseline['std']
        
        if pop_std == 0:
            pop_std = 1  # Avoid division by zero
        
        # Population-normalized z-score
        df[f'{metric}_pop_zscore'] = (df[metric] - pop_mean) / pop_std
    
    return df


# ============================================================================
# Data Export Functions
# ============================================================================

def fetch_routine_logs_from_api(
    api_url: str,
    token: str,
    endpoint: str = "/api/admin/routine-logs/export"
) -> pd.DataFrame:
    """
    Fetch routine logs from the backend API.
    
    Args:
        api_url: Base URL of the API
        token: JWT authentication token
        endpoint: API endpoint for export
        
    Returns:
        DataFrame with routine logs
    """
    url = f"{api_url.rstrip('/')}{endpoint}"
    logger.info(f"Fetching data from {url}")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=60)
        response.raise_for_status()
        
        # If CSV response
        if 'text/csv' in response.headers.get('Content-Type', ''):
            from io import StringIO
            df = pd.read_csv(StringIO(response.text))
            logger.info(f"Fetched {len(df)} records from API (CSV)")
            return df
        
        # If JSON response
        data = response.json()
        if 'logs' in data:
            df = pd.json_normalize(data['logs'])
        else:
            df = pd.DataFrame(data)
        
        logger.info(f"Fetched {len(df)} records from API (JSON)")
        return df
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to fetch data from API: {e}")
        raise


def load_from_csv(file_path: str) -> pd.DataFrame:
    """Load routine logs from a local CSV file."""
    logger.info(f"Loading data from {file_path}")
    df = pd.read_csv(file_path)
    logger.info(f"Loaded {len(df)} records from CSV")
    return df


# ============================================================================
# Feature Engineering Functions
# ============================================================================

def compute_health_score(row: pd.Series) -> float:
    """
    Compute a composite health score (0-100) from routine metrics.
    
    Higher is better. Components:
    - Sleep: 7-9 hours optimal (25 points)
    - Exercise: 0.5+ hours good (25 points)
    - Screen time: <6 hours good (25 points)
    - Stress: <5 good (25 points)
    """
    score = 0.0
    
    # Sleep score (7-9 hours optimal)
    sleep = row.get('sleep_hours', 7)
    if 7 <= sleep <= 9:
        score += 25
    elif 6 <= sleep < 7 or 9 < sleep <= 10:
        score += 20
    elif 5 <= sleep < 6 or 10 < sleep <= 11:
        score += 10
    else:
        score += 5
    
    # Exercise score (0.5+ hours)
    exercise = row.get('exercise_duration', 0)
    if exercise >= 1.0:
        score += 25
    elif exercise >= 0.5:
        score += 20
    elif exercise >= 0.25:
        score += 15
    elif exercise > 0:
        score += 10
    else:
        score += 5
    
    # Screen time score (<6 hours good)
    screen = row.get('screen_time', 4)
    if screen <= 2:
        score += 25
    elif screen <= 4:
        score += 20
    elif screen <= 6:
        score += 15
    elif screen <= 8:
        score += 10
    else:
        score += 5
    
    # Stress score (<5 good, scale 1-10)
    stress = row.get('stress_level', 5)
    if stress <= 2:
        score += 25
    elif stress <= 4:
        score += 20
    elif stress <= 6:
        score += 15
    elif stress <= 8:
        score += 10
    else:
        score += 5
    
    return score


def compute_zscore_anomalies(
    df: pd.DataFrame,
    metrics: List[str],
    threshold: float = ZSCORE_THRESHOLD
) -> pd.DataFrame:
    """
    Compute z-scores for each metric and flag anomalies.
    
    Z-scores are computed per-user to capture individual baselines.
    
    Returns:
        DataFrame with added z-score columns and anomaly flags
    """
    df = df.copy()
    
    for metric in metrics:
        if metric not in df.columns:
            logger.warning(f"Metric {metric} not in data, skipping")
            continue
        
        # Compute z-scores per user (if user_id exists)
        if 'user_id' in df.columns:
            df[f'{metric}_zscore'] = df.groupby('user_id')[metric].transform(
                lambda x: stats.zscore(x, nan_policy='omit') if len(x) > 1 else 0
            )
        else:
            # Global z-scores
            df[f'{metric}_zscore'] = stats.zscore(df[metric], nan_policy='omit')
        
        # Flag anomalies (z-score > threshold or < -threshold)
        df[f'{metric}_anomaly'] = (
            (df[f'{metric}_zscore'].abs() > threshold)
        ).astype(int)
    
    return df


def compute_rolling_features(
    df: pd.DataFrame,
    window: int = ROLLING_WINDOW
) -> pd.DataFrame:
    """
    Compute rolling averages and deviations per user.
    """
    df = df.copy()
    
    # Sort by user and date
    if 'log_date' in df.columns:
        df['log_date'] = pd.to_datetime(df['log_date'], errors='coerce')
        df = df.sort_values(['user_id', 'log_date'])
    
    # Compute rolling health score
    if 'health_score' not in df.columns:
        df['health_score'] = df.apply(compute_health_score, axis=1)
    
    # Rolling average per user
    if 'user_id' in df.columns:
        df['health_score_rolling_avg'] = df.groupby('user_id')['health_score'].transform(
            lambda x: x.rolling(window=window, min_periods=1).mean()
        )
    else:
        df['health_score_rolling_avg'] = df['health_score'].rolling(
            window=window, min_periods=1
        ).mean()
    
    # Compute deviation from rolling average
    df['health_score_deviation'] = (
        df['health_score'] - df['health_score_rolling_avg']
    ) / df['health_score_rolling_avg'].replace(0, 1)
    
    # Flag significant drops (>20% below rolling average)
    df['health_score_drop_anomaly'] = (
        df['health_score_deviation'] < -HEALTH_SCORE_DROP_THRESHOLD
    ).astype(int)
    
    return df


# ============================================================================
# Labeling Functions
# ============================================================================

def apply_labeling_criteria(
    df: pd.DataFrame,
    baselines: Optional[Dict[str, Dict]] = None
) -> pd.DataFrame:
    """
    Apply multi-criteria anomaly labeling per thesis plan.
    
    Anomaly = TRUE if ANY of:
      1. Value outside pretrained population thresholds (warning level)
      2. Per-user z-score > 2.0 or < -2.0
      3. Daily health score dropped >20% from 7-day rolling average
      4. AI service already flagged as anomaly (is_anomaly column)
      
    Using pretrained baselines adds an additional layer of validation
    against population norms, not just individual history.
    """
    df = df.copy()
    
    # Initialize label columns
    df['anomaly_label'] = 0
    df['anomaly_source'] = ''
    df['anomaly_confidence'] = 0.0
    
    criteria_counts = {
        'threshold': 0,
        'zscore': 0,
        'health_drop': 0,
        'ai_service': 0
    }
    
    # Criteria 1: Pretrained threshold anomalies (if baselines provided)
    if baselines:
        threshold_anomaly_cols = [c for c in df.columns if c.endswith('_threshold_anomaly')]
        if threshold_anomaly_cols:
            df['threshold_any_anomaly'] = df[threshold_anomaly_cols].max(axis=1)
            
            for idx in df[df['threshold_any_anomaly'] == 1].index:
                sources = []
                for col in threshold_anomaly_cols:
                    if df.loc[idx, col] == 1:
                        metric = col.replace('_threshold_anomaly', '')
                        direction = df.loc[idx, f'{metric}_threshold_direction']
                        sources.append(f"{metric}({direction})")
                if sources:
                    current = df.loc[idx, 'anomaly_source']
                    df.loc[idx, 'anomaly_source'] = f"{current}threshold:{','.join(sources)};"
                    df.loc[idx, 'anomaly_confidence'] += 0.25
            
            df.loc[df['threshold_any_anomaly'] == 1, 'anomaly_label'] = 1
            criteria_counts['threshold'] = df['threshold_any_anomaly'].sum()
    
    # Criteria 2: Per-user Z-score anomalies
    user_zscore_cols = [c for c in df.columns if c.endswith('_anomaly') 
                        and not c.endswith('_threshold_anomaly')
                        and 'health_score' not in c]
    if user_zscore_cols:
        df['zscore_any_anomaly'] = df[user_zscore_cols].max(axis=1)
        
        for idx in df[df['zscore_any_anomaly'] == 1].index:
            sources = []
            for col in user_zscore_cols:
                if df.loc[idx, col] == 1:
                    sources.append(col.replace('_anomaly', ''))
            if sources:
                current = df.loc[idx, 'anomaly_source']
                df.loc[idx, 'anomaly_source'] = f"{current}zscore:{','.join(sources)};"
                df.loc[idx, 'anomaly_confidence'] += 0.25
        
        df.loc[df['zscore_any_anomaly'] == 1, 'anomaly_label'] = 1
        criteria_counts['zscore'] = df['zscore_any_anomaly'].sum()
    
    # Criteria 3: Health score drop
    if 'health_score_drop_anomaly' in df.columns:
        mask = df['health_score_drop_anomaly'] == 1
        df.loc[mask, 'anomaly_label'] = 1
        df.loc[mask, 'anomaly_source'] = df.loc[mask, 'anomaly_source'] + 'health_drop;'
        df.loc[mask, 'anomaly_confidence'] += 0.25
        criteria_counts['health_drop'] = mask.sum()
    
    # Criteria 4: AI service flag
    if 'is_anomaly' in df.columns:
        # Handle string 'true'/'false' or boolean
        if df['is_anomaly'].dtype == object:
            ai_anomaly_mask = df['is_anomaly'].str.lower() == 'true'
        else:
            ai_anomaly_mask = df['is_anomaly'] == True
        
        df.loc[ai_anomaly_mask, 'anomaly_label'] = 1
        df.loc[ai_anomaly_mask, 'anomaly_source'] = df.loc[ai_anomaly_mask, 'anomaly_source'] + 'ai_service;'
        df.loc[ai_anomaly_mask, 'anomaly_confidence'] += 0.25
        criteria_counts['ai_service'] = ai_anomaly_mask.sum()
    
    # Clean up source string
    df['anomaly_source'] = df['anomaly_source'].str.strip(';')
    
    # Cap confidence at 1.0
    df['anomaly_confidence'] = df['anomaly_confidence'].clip(0, 1)
    
    # Summary statistics
    total = len(df)
    anomalies = df['anomaly_label'].sum()
    
    logger.info(f"\nLabeling Summary:")
    logger.info(f"  Total records: {total}")
    logger.info(f"  Anomalies: {anomalies} ({anomalies/total*100:.1f}%)")
    logger.info(f"  By criteria:")
    for criteria, count in criteria_counts.items():
        logger.info(f"    - {criteria}: {count} ({count/total*100:.1f}%)")
    
    # Multi-criteria agreement (higher confidence = more methods agree)
    high_confidence = (df['anomaly_confidence'] >= 0.5).sum()
    logger.info(f"  High confidence (2+ methods agree): {high_confidence}")
    
    return df


# ============================================================================
# Data Splitting
# ============================================================================

def split_data(
    df: pd.DataFrame,
    train_ratio: float = TRAIN_RATIO,
    val_ratio: float = VAL_RATIO,
    test_ratio: float = TEST_RATIO,
    stratify_col: str = 'anomaly_label',
    random_state: int = 42
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Split data into train/val/test sets with stratification.
    """
    from sklearn.model_selection import train_test_split
    
    # First split: train+val vs test
    train_val_ratio = train_ratio + val_ratio
    
    if stratify_col in df.columns and df[stratify_col].nunique() > 1:
        stratify = df[stratify_col]
    else:
        stratify = None
    
    train_val, test = train_test_split(
        df,
        test_size=test_ratio,
        stratify=stratify,
        random_state=random_state
    )
    
    # Second split: train vs val
    val_adjusted_ratio = val_ratio / train_val_ratio
    
    if stratify_col in train_val.columns and train_val[stratify_col].nunique() > 1:
        stratify = train_val[stratify_col]
    else:
        stratify = None
    
    train, val = train_test_split(
        train_val,
        test_size=val_adjusted_ratio,
        stratify=stratify,
        random_state=random_state
    )
    
    logger.info(f"Data split: train={len(train)}, val={len(val)}, test={len(test)}")
    
    return train, val, test


# ============================================================================
# Main Pipeline
# ============================================================================

def run_pipeline(
    api_url: Optional[str] = None,
    token: Optional[str] = None,
    input_csv: Optional[str] = None,
    output_dir: str = "data/",
    baselines_path: Optional[str] = None,
    save_splits: bool = True
) -> pd.DataFrame:
    """
    Run the full data export and labeling pipeline.
    
    Enhanced with pretrained population baselines for better anomaly detection.
    """
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    # Step 0: Load pretrained baselines
    logger.info("=" * 60)
    logger.info("STEP 0: Loading Pretrained Baselines")
    logger.info("=" * 60)
    
    baselines = load_pretrained_baselines(baselines_path)
    if baselines:
        logger.info(f"Loaded {len(baselines)} pretrained metric baselines")
        for metric in baselines:
            b = baselines[metric]
            logger.info(f"  {metric}: mean={b.get('mean', 'N/A'):.2f}, "
                       f"warning=[{b.get('warning_low', 'N/A'):.2f}, {b.get('warning_high', 'N/A'):.2f}]")
    else:
        logger.warning("No pretrained baselines loaded - using per-user z-scores only")
    
    # Step 1: Load data
    logger.info("=" * 60)
    logger.info("STEP 1: Loading Data")
    logger.info("=" * 60)
    
    if input_csv:
        df = load_from_csv(input_csv)
    elif api_url and token:
        df = fetch_routine_logs_from_api(api_url, token)
    else:
        raise ValueError("Must provide either input_csv or (api_url + token)")
    
    logger.info(f"Loaded {len(df)} records with columns: {list(df.columns)}")
    
    # Step 2: Compute health scores
    logger.info("=" * 60)
    logger.info("STEP 2: Computing Health Scores")
    logger.info("=" * 60)
    
    df['health_score'] = df.apply(compute_health_score, axis=1)
    logger.info(f"Health score stats: mean={df['health_score'].mean():.2f}, std={df['health_score'].std():.2f}")
    
    # Step 3: Apply pretrained threshold anomalies
    if baselines:
        logger.info("=" * 60)
        logger.info("STEP 3a: Applying Pretrained Threshold Anomalies")
        logger.info("=" * 60)
        
        df = compute_threshold_anomalies(df, baselines)
        
        logger.info("=" * 60)
        logger.info("STEP 3b: Computing Population Z-Scores")
        logger.info("=" * 60)
        
        df = compute_population_zscores(df, baselines)
    
    # Step 4: Compute per-user z-score anomalies
    logger.info("=" * 60)
    logger.info("STEP 4: Computing Per-User Z-Score Anomalies")
    logger.info("=" * 60)
    
    df = compute_zscore_anomalies(df, METRICS)
    
    # Step 5: Compute rolling features
    logger.info("=" * 60)
    logger.info("STEP 5: Computing Rolling Features")
    logger.info("=" * 60)
    
    df = compute_rolling_features(df)
    
    # Step 6: Apply labeling criteria
    logger.info("=" * 60)
    logger.info("STEP 6: Applying Multi-Criteria Labeling")
    logger.info("=" * 60)
    
    df = apply_labeling_criteria(df, baselines)
    
    # Step 7: Save labeled dataset
    logger.info("=" * 60)
    logger.info("STEP 7: Saving Labeled Dataset")
    logger.info("=" * 60)
    
    labeled_path = output_path / "labeled_dataset.csv"
    df.to_csv(labeled_path, index=False)
    logger.info(f"Saved labeled dataset to {labeled_path}")
    
    # Step 8: Split and save train/val/test
    if save_splits and len(df) >= 10:
        logger.info("=" * 60)
        logger.info("STEP 8: Creating Train/Val/Test Splits")
        logger.info("=" * 60)
        
        train, val, test = split_data(df)
        
        train.to_csv(output_path / "train.csv", index=False)
        val.to_csv(output_path / "val.csv", index=False)
        test.to_csv(output_path / "test.csv", index=False)
        
        logger.info(f"Saved splits to {output_path}")
        
        # Count criteria breakdown (convert to Python int to avoid JSON serialization issues)
        criteria_breakdown = {}
        for src in ['threshold', 'zscore', 'health_drop', 'ai_service']:
            criteria_breakdown[f'{src}_count'] = int(df['anomaly_source'].str.contains(src).sum())
        
        # Save split statistics
        stats = {
            "total_samples": len(df),
            "train_samples": len(train),
            "val_samples": len(val),
            "test_samples": len(test),
            "anomaly_rate": float(df['anomaly_label'].mean()),
            "train_anomaly_rate": float(train['anomaly_label'].mean()),
            "val_anomaly_rate": float(val['anomaly_label'].mean()),
            "test_anomaly_rate": float(test['anomaly_label'].mean()),
            "high_confidence_anomalies": int((df['anomaly_confidence'] >= 0.5).sum()),
            "criteria_breakdown": criteria_breakdown,
            "created_at": datetime.now().isoformat(),
            "metrics_used": METRICS,
            "zscore_threshold": ZSCORE_THRESHOLD,
            "health_drop_threshold": HEALTH_SCORE_DROP_THRESHOLD,
            "baselines_used": baselines_path or str(DEFAULT_BASELINES_PATH),
            "pretrained_metrics": list(baselines.keys()) if baselines else [],
        }
        
        with open(output_path / "labeling_stats.json", 'w') as f:
            json.dump(stats, f, indent=2)
        
        logger.info(f"Saved labeling statistics")
    
    logger.info("=" * 60)
    logger.info("🎉 Pipeline Complete!")
    logger.info("=" * 60)
    logger.info(f"\nOutput files in {output_path}:")
    logger.info(f"  - labeled_dataset.csv (full dataset with labels)")
    if save_splits and len(df) >= 10:
        logger.info(f"  - train.csv ({len(train)} samples)")
        logger.info(f"  - val.csv ({len(val)} samples)")
        logger.info(f"  - test.csv ({len(test)} samples)")
        logger.info(f"  - labeling_stats.json")
    
    return df


def main():
    parser = argparse.ArgumentParser(
        description="Export and label routine logs for ML training",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # From API with pretrained baselines
  python scripts/export_and_label_data.py \\
      --api-url https://lifepattern-backend.onrender.com \\
      --token YOUR_JWT_TOKEN \\
      --baselines pretrained/baselines.json \\
      --output data/

  # From local CSV (uses default pretrained baselines)
  python scripts/export_and_label_data.py \\
      --input-csv data/routine_logs_export.csv \\
      --output data/

  # Test with sample data
  python scripts/export_and_label_data.py \\
      --input-csv data/sample_health_data.csv \\
      --output data/test_labeled/
        """
    )
    parser.add_argument(
        "--api-url",
        type=str,
        default="https://lifepattern-backend.onrender.com",
        help="Backend API URL"
    )
    parser.add_argument(
        "--token",
        type=str,
        help="JWT authentication token"
    )
    parser.add_argument(
        "--input-csv",
        type=str,
        help="Path to local CSV file (alternative to API)"
    )
    parser.add_argument(
        "--baselines",
        type=str,
        default=None,
        help="Path to pretrained baselines JSON (default: pretrained/baselines.json)"
    )
    parser.add_argument(
        "--output",
        type=str,
        default="data/",
        help="Output directory for labeled data"
    )
    parser.add_argument(
        "--no-splits",
        action="store_true",
        help="Skip creating train/val/test splits"
    )
    
    args = parser.parse_args()
    
    # Validate args
    if not args.input_csv and not args.token:
        parser.error("Must provide either --input-csv or --token")
    
    run_pipeline(
        api_url=args.api_url,
        token=args.token,
        input_csv=args.input_csv,
        output_dir=args.output,
        baselines_path=args.baselines,
        save_splits=not args.no_splits
    )


if __name__ == "__main__":
    main()

