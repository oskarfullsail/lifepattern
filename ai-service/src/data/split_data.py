#!/usr/bin/env python3
"""
Train/Validation/Test Data Splitter

Creates stratified splits ensuring:
- Class balance is maintained across splits
- No data leakage between sets
- Reproducible results

Usage:
    python -m src.data.split_data
"""

import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.model_selection import train_test_split
from typing import Tuple, List
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_splits(
    df: pd.DataFrame,
    test_size: float = 0.2,
    val_size: float = 0.1,
    random_state: int = 42,
    output_dir: str = 'data/processed'
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Create stratified train/val/test splits.
    
    Args:
        df: DataFrame with features and 'is_anomaly' label
        test_size: Proportion for test set
        val_size: Proportion for validation set
        random_state: Random seed for reproducibility
        output_dir: Directory to save split files
        
    Returns:
        Tuple of (train_df, val_df, test_df)
    """
    logger.info("=" * 60)
    logger.info("Creating Train/Validation/Test Splits")
    logger.info("=" * 60)
    
    # Identify feature columns (exclude metadata)
    exclude_cols = ['is_anomaly', 'source', 'gender', 'age']
    feature_cols = [col for col in df.columns if col not in exclude_cols]
    
    # Remove rows with missing labels
    df_clean = df.dropna(subset=['is_anomaly']).copy()
    logger.info(f"Rows with labels: {len(df_clean)}")
    
    # Remove rows with too many missing features
    min_features = len(feature_cols) * 0.3  # At least 30% of features
    df_clean = df_clean.dropna(thresh=int(min_features + len(exclude_cols)))
    logger.info(f"Rows after removing sparse entries: {len(df_clean)}")
    
    if len(df_clean) < 100:
        logger.warning("Very small dataset! Results may not be reliable.")
    
    # Prepare features and labels
    X = df_clean.drop(columns=['is_anomaly'])
    y = df_clean['is_anomaly'].astype(int)
    
    # Fill missing values with median (for train, will use train median for val/test)
    numeric_cols = X.select_dtypes(include=[np.number]).columns
    
    # First split: train+val vs test
    X_trainval, X_test, y_trainval, y_test = train_test_split(
        X, y, 
        test_size=test_size, 
        stratify=y, 
        random_state=random_state
    )
    
    # Second split: train vs val
    val_proportion = val_size / (1 - test_size)
    X_train, X_val, y_train, y_val = train_test_split(
        X_trainval, y_trainval, 
        test_size=val_proportion, 
        stratify=y_trainval, 
        random_state=random_state
    )
    
    # Fill missing values using train statistics
    train_medians = X_train[numeric_cols].median()
    X_train[numeric_cols] = X_train[numeric_cols].fillna(train_medians)
    X_val[numeric_cols] = X_val[numeric_cols].fillna(train_medians)
    X_test[numeric_cols] = X_test[numeric_cols].fillna(train_medians)
    
    # Combine X and y for saving
    train_df = pd.concat([X_train, y_train], axis=1)
    val_df = pd.concat([X_val, y_val], axis=1)
    test_df = pd.concat([X_test, y_test], axis=1)
    
    # Save splits
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    train_df.to_csv(output_path / 'train.csv', index=False)
    val_df.to_csv(output_path / 'val.csv', index=False)
    test_df.to_csv(output_path / 'test.csv', index=False)
    
    # Log statistics
    logger.info(f"\nSplit Results:")
    logger.info(f"  Train: {len(train_df)} samples ({len(train_df)/len(df_clean)*100:.1f}%)")
    logger.info(f"  Val:   {len(val_df)} samples ({len(val_df)/len(df_clean)*100:.1f}%)")
    logger.info(f"  Test:  {len(test_df)} samples ({len(test_df)/len(df_clean)*100:.1f}%)")
    
    logger.info(f"\nAnomaly Rates:")
    logger.info(f"  Train: {y_train.mean():.2%}")
    logger.info(f"  Val:   {y_val.mean():.2%}")
    logger.info(f"  Test:  {y_test.mean():.2%}")
    
    logger.info(f"\nSaved to {output_path}")
    
    return train_df, val_df, test_df


def get_feature_columns(df: pd.DataFrame) -> List[str]:
    """Get list of feature columns (excluding label and metadata)."""
    exclude = ['is_anomaly', 'source', 'gender', 'age']
    return [col for col in df.columns if col not in exclude]


if __name__ == "__main__":
    # Load engineered features if available, else unified dataset
    features_path = Path('data/processed/features_engineered.csv')
    unified_path = Path('data/processed/unified_dataset.csv')
    
    if features_path.exists():
        logger.info(f"Loading engineered features from {features_path}")
        df = pd.read_csv(features_path)
    elif unified_path.exists():
        logger.info(f"Loading unified dataset from {unified_path}")
        df = pd.read_csv(unified_path)
    else:
        print("No processed data found. Run preprocessing first:")
        print("  python -m src.data.preprocessing")
        exit(1)
    
    train_df, val_df, test_df = create_splits(df)

