"""
Dataset Loader Module for Training Population Baselines

Supports loading and normalizing data from recommended public health datasets:
- FitBit Fitness Tracker Data (Kaggle)
- PPG-DaLiA (Stress/Activity)
- Sleep-EDF Database
- WESAD (Wearable Stress and Affect Detection)
- Custom CSV formats

Each dataset is mapped to a unified schema for training population baselines.

Usage:
    loader = DatasetLoader()
    df = loader.load_dataset("path/to/fitbit.csv", dataset_type="fitbit")
    unified_df = loader.to_unified_schema(df, dataset_type="fitbit")
"""

import os
import logging
from typing import Dict, List, Any, Optional, Union, Literal
from dataclasses import dataclass, field
from pathlib import Path
import pandas as pd
import numpy as np
from datetime import datetime

logger = logging.getLogger(__name__)

# Supported dataset types
DatasetType = Literal[
    "fitbit",
    "fitbit_sleep",
    "fitbit_heart",
    "ppg_dalia",
    "sleep_edf",
    "wesad",
    "pamap2",
    "custom"
]


@dataclass
class DatasetColumnMapping:
    """
    Column mapping configuration for a dataset type.
    Maps source columns to unified schema columns.
    """
    # Source column names -> unified column names
    column_map: Dict[str, str]
    
    # Transformations to apply (column -> transformation function name)
    transformations: Dict[str, str] = field(default_factory=dict)
    
    # Required columns (at least one must be present)
    required_columns: List[str] = field(default_factory=list)
    
    # Optional metadata
    description: str = ""
    source_url: str = ""


# Unified schema that all datasets map to
UNIFIED_SCHEMA = [
    'sleep_hours',
    'sleep_quality',
    'steps',
    'heart_rate',
    'heart_rate_resting',
    'heart_rate_variability',
    'exercise_duration',
    'active_energy',
    'stress_level',
    'activity_level',
    'water_intake',
    'date',
    'user_id',
    'source_dataset'
]


# Pre-configured mappings for known datasets
DATASET_MAPPINGS: Dict[str, DatasetColumnMapping] = {
    "fitbit": DatasetColumnMapping(
        column_map={
            'TotalSteps': 'steps',
            'TotalDistance': 'distance',
            'VeryActiveMinutes': 'very_active_minutes',
            'FairlyActiveMinutes': 'fairly_active_minutes',
            'LightlyActiveMinutes': 'lightly_active_minutes',
            'SedentaryMinutes': 'sedentary_minutes',
            'Calories': 'active_energy',
            'ActivityDate': 'date',
            'Id': 'user_id',
        },
        transformations={
            'exercise_duration': 'compute_exercise_duration',
        },
        required_columns=['TotalSteps'],
        description="FitBit Fitness Tracker Data from Kaggle",
        source_url="https://www.kaggle.com/datasets/arashnic/fitbit"
    ),
    
    "fitbit_sleep": DatasetColumnMapping(
        column_map={
            'TotalMinutesAsleep': 'sleep_minutes',
            'TotalTimeInBed': 'time_in_bed_minutes',
            'SleepDay': 'date',
            'Id': 'user_id',
        },
        transformations={
            'sleep_hours': 'minutes_to_hours',
            'sleep_quality': 'compute_sleep_efficiency',
        },
        required_columns=['TotalMinutesAsleep'],
        description="FitBit Sleep Data from Kaggle",
        source_url="https://www.kaggle.com/datasets/arashnic/fitbit"
    ),
    
    "fitbit_heart": DatasetColumnMapping(
        column_map={
            'Value': 'heart_rate',
            'Time': 'timestamp',
            'Id': 'user_id',
        },
        transformations={},
        required_columns=['Value'],
        description="FitBit Heart Rate Data (seconds-level)",
        source_url="https://www.kaggle.com/datasets/arashnic/fitbit"
    ),
    
    "ppg_dalia": DatasetColumnMapping(
        column_map={
            'HR': 'heart_rate',
            'activity': 'activity_level',
            'stress': 'stress_level',
            'ACC_x': 'accel_x',
            'ACC_y': 'accel_y',
            'ACC_z': 'accel_z',
            'subject': 'user_id',
        },
        transformations={
            'exercise_duration': 'compute_activity_duration',
        },
        required_columns=['HR'],
        description="PPG-DaLiA Dataset for physiological signal analysis",
        source_url="https://archive.ics.uci.edu/ml/datasets/PPG-DaLiA"
    ),
    
    "sleep_edf": DatasetColumnMapping(
        column_map={
            'sleep_duration': 'sleep_hours',
            'sleep_stage': 'sleep_stages',
            'time_in_bed': 'time_in_bed_hours',
            'subject_id': 'user_id',
        },
        transformations={
            'sleep_quality': 'compute_sleep_stage_quality',
        },
        required_columns=['sleep_duration'],
        description="Sleep-EDF Database - Polysomnography recordings",
        source_url="https://physionet.org/content/sleep-edfx/1.0.0/"
    ),
    
    "wesad": DatasetColumnMapping(
        column_map={
            'BVP': 'blood_volume_pulse',
            'EDA': 'skin_conductance',
            'TEMP': 'skin_temperature',
            'HR': 'heart_rate',
            'label': 'stress_level',
            'subject': 'user_id',
        },
        transformations={
            'heart_rate_variability': 'compute_hrv_from_bvp',
        },
        required_columns=['HR', 'label'],
        description="WESAD - Wearable Stress and Affect Detection",
        source_url="https://archive.ics.uci.edu/ml/datasets/WESAD"
    ),
    
    "pamap2": DatasetColumnMapping(
        column_map={
            'heart_rate': 'heart_rate',
            'activity_id': 'activity_type',
            'subject_id': 'user_id',
            'timestamp': 'timestamp',
        },
        transformations={
            'exercise_duration': 'compute_activity_duration_pamap',
        },
        required_columns=['heart_rate'],
        description="PAMAP2 Physical Activity Monitoring Dataset",
        source_url="https://archive.ics.uci.edu/ml/datasets/PAMAP2"
    ),
    
    "custom": DatasetColumnMapping(
        column_map={},
        transformations={},
        required_columns=[],
        description="Custom dataset - provide column mapping"
    ),
}


class DatasetLoader:
    """
    Loads and normalizes health/behavioral datasets to a unified schema.
    """
    
    def __init__(self, data_dir: Optional[str] = None):
        """
        Initialize the dataset loader.
        
        Args:
            data_dir: Base directory for dataset files. Defaults to ai-service/data/
        """
        if data_dir is None:
            self.data_dir = Path(__file__).parent.parent / "data"
        else:
            self.data_dir = Path(data_dir)
        
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.loaded_datasets: Dict[str, pd.DataFrame] = {}
        
    def list_available_datasets(self) -> List[Dict[str, str]]:
        """List all available dataset types with their descriptions."""
        return [
            {
                "type": dtype,
                "description": mapping.description,
                "source_url": mapping.source_url,
                "required_columns": mapping.required_columns
            }
            for dtype, mapping in DATASET_MAPPINGS.items()
        ]
    
    def load_dataset(
        self,
        file_path: Union[str, Path],
        dataset_type: DatasetType = "custom",
        custom_mapping: Optional[Dict[str, str]] = None,
        **read_kwargs
    ) -> pd.DataFrame:
        """
        Load a dataset from file.
        
        Args:
            file_path: Path to the dataset file (CSV, Parquet, or Excel)
            dataset_type: Type of dataset for automatic column mapping
            custom_mapping: Custom column mapping (for "custom" type)
            **read_kwargs: Additional arguments passed to pandas read function
            
        Returns:
            Loaded DataFrame
        """
        file_path = Path(file_path)
        
        if not file_path.exists():
            # Try relative to data_dir
            file_path = self.data_dir / file_path
            
        if not file_path.exists():
            raise FileNotFoundError(f"Dataset file not found: {file_path}")
        
        logger.info(f"Loading dataset from {file_path}")
        
        # Determine file format and load
        suffix = file_path.suffix.lower()
        
        if suffix == '.csv':
            df = pd.read_csv(file_path, **read_kwargs)
        elif suffix == '.parquet':
            df = pd.read_parquet(file_path, **read_kwargs)
        elif suffix in ['.xlsx', '.xls']:
            df = pd.read_excel(file_path, **read_kwargs)
        elif suffix == '.json':
            df = pd.read_json(file_path, **read_kwargs)
        else:
            # Try CSV as default
            df = pd.read_csv(file_path, **read_kwargs)
        
        logger.info(f"Loaded {len(df)} rows, {len(df.columns)} columns")
        
        # Store original column names for reference
        df.attrs['original_columns'] = list(df.columns)
        df.attrs['dataset_type'] = dataset_type
        df.attrs['source_file'] = str(file_path)
        
        return df
    
    def to_unified_schema(
        self,
        df: pd.DataFrame,
        dataset_type: DatasetType = "custom",
        custom_mapping: Optional[Dict[str, str]] = None,
        fill_missing: bool = True
    ) -> pd.DataFrame:
        """
        Convert a dataset to the unified schema.
        
        Args:
            df: Source DataFrame
            dataset_type: Type of dataset for automatic mapping
            custom_mapping: Override or extend default mapping
            fill_missing: Fill missing unified columns with NaN
            
        Returns:
            DataFrame with unified column names
        """
        # Get base mapping
        if dataset_type in DATASET_MAPPINGS:
            mapping_config = DATASET_MAPPINGS[dataset_type]
            column_map = mapping_config.column_map.copy()
        else:
            column_map = {}
        
        # Apply custom mapping overrides
        if custom_mapping:
            column_map.update(custom_mapping)
        
        # Rename columns
        rename_map = {}
        for src_col, unified_col in column_map.items():
            if src_col in df.columns:
                rename_map[src_col] = unified_col
        
        unified_df = df.rename(columns=rename_map)
        
        # Apply transformations
        if dataset_type in DATASET_MAPPINGS:
            unified_df = self._apply_transformations(
                unified_df, 
                DATASET_MAPPINGS[dataset_type],
                original_df=df
            )
        
        # Add source dataset marker
        unified_df['source_dataset'] = dataset_type
        
        # Fill missing unified columns
        if fill_missing:
            for col in UNIFIED_SCHEMA:
                if col not in unified_df.columns:
                    unified_df[col] = np.nan
        
        # Reorder to unified schema
        existing_cols = [c for c in UNIFIED_SCHEMA if c in unified_df.columns]
        extra_cols = [c for c in unified_df.columns if c not in UNIFIED_SCHEMA]
        unified_df = unified_df[existing_cols + extra_cols]
        
        logger.info(f"Converted to unified schema: {len(existing_cols)} unified columns")
        
        return unified_df
    
    def _apply_transformations(
        self,
        df: pd.DataFrame,
        mapping_config: DatasetColumnMapping,
        original_df: pd.DataFrame
    ) -> pd.DataFrame:
        """Apply configured transformations to compute derived columns."""
        
        for target_col, transform_name in mapping_config.transformations.items():
            try:
                if transform_name == 'compute_exercise_duration':
                    # Sum active minutes and convert to hours
                    active_cols = ['very_active_minutes', 'fairly_active_minutes']
                    available = [c for c in active_cols if c in df.columns]
                    if available:
                        df[target_col] = df[available].sum(axis=1) / 60.0
                    
                elif transform_name == 'minutes_to_hours':
                    if 'sleep_minutes' in df.columns:
                        df[target_col] = df['sleep_minutes'] / 60.0
                    
                elif transform_name == 'compute_sleep_efficiency':
                    if 'sleep_minutes' in df.columns and 'time_in_bed_minutes' in df.columns:
                        df[target_col] = (df['sleep_minutes'] / df['time_in_bed_minutes'] * 100).clip(0, 100)
                    
                elif transform_name == 'compute_activity_duration':
                    if 'activity_level' in df.columns:
                        # Estimate active time based on activity level
                        df[target_col] = df['activity_level'].apply(
                            lambda x: 0.5 if x > 0.5 else 0.2 if x > 0.2 else 0
                        )
                        
                elif transform_name == 'compute_sleep_stage_quality':
                    if 'sleep_stages' in df.columns:
                        # Quality based on deep sleep percentage
                        df[target_col] = df['sleep_stages'].apply(
                            lambda x: 80 if 'deep' in str(x).lower() else 60
                        )
                        
                elif transform_name == 'compute_hrv_from_bvp':
                    # Simplified HRV estimation (real HRV requires RR intervals)
                    if 'blood_volume_pulse' in df.columns:
                        df[target_col] = df['blood_volume_pulse'].rolling(window=30).std()
                        
                elif transform_name == 'compute_activity_duration_pamap':
                    if 'activity_type' in df.columns:
                        # PAMAP activity types: 1=lying, 2=sitting, ..., higher=more active
                        df[target_col] = df['activity_type'].apply(
                            lambda x: 0.5 if x >= 4 else 0.25 if x >= 2 else 0
                        )
                        
            except Exception as e:
                logger.warning(f"Failed to apply transformation {transform_name}: {e}")
        
        return df
    
    def load_multiple_datasets(
        self,
        dataset_specs: List[Dict[str, Any]]
    ) -> pd.DataFrame:
        """
        Load and combine multiple datasets into a single unified DataFrame.
        
        Args:
            dataset_specs: List of dicts with keys:
                - file_path: Path to dataset
                - dataset_type: Type of dataset
                - custom_mapping: Optional custom column mapping
                
        Returns:
            Combined unified DataFrame
        """
        combined_dfs = []
        
        for spec in dataset_specs:
            try:
                file_path = spec.get('file_path')
                dataset_type = spec.get('dataset_type', 'custom')
                custom_mapping = spec.get('custom_mapping')
                
                df = self.load_dataset(file_path, dataset_type)
                unified_df = self.to_unified_schema(df, dataset_type, custom_mapping)
                
                combined_dfs.append(unified_df)
                logger.info(f"Added {len(unified_df)} rows from {file_path}")
                
            except Exception as e:
                logger.error(f"Failed to load dataset {spec}: {e}")
        
        if not combined_dfs:
            return pd.DataFrame(columns=UNIFIED_SCHEMA)
        
        combined = pd.concat(combined_dfs, ignore_index=True)
        logger.info(f"Combined dataset: {len(combined)} total rows")
        
        return combined
    
    def validate_dataset(
        self,
        df: pd.DataFrame,
        dataset_type: DatasetType
    ) -> Dict[str, Any]:
        """
        Validate a loaded dataset against expected schema.
        
        Returns validation report with warnings and statistics.
        """
        report = {
            'valid': True,
            'warnings': [],
            'statistics': {},
            'coverage': {}
        }
        
        # Check required columns
        if dataset_type in DATASET_MAPPINGS:
            required = DATASET_MAPPINGS[dataset_type].required_columns
            missing = [c for c in required if c not in df.columns]
            if missing:
                report['warnings'].append(f"Missing required columns: {missing}")
                report['valid'] = False
        
        # Check unified schema coverage
        unified_cols = [c for c in UNIFIED_SCHEMA if c in df.columns and df[c].notna().any()]
        report['coverage'] = {
            'unified_columns': unified_cols,
            'coverage_ratio': len(unified_cols) / len(UNIFIED_SCHEMA)
        }
        
        # Basic statistics for numeric columns
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        for col in numeric_cols[:10]:  # Limit to first 10
            if df[col].notna().any():
                report['statistics'][col] = {
                    'mean': float(df[col].mean()),
                    'std': float(df[col].std()),
                    'min': float(df[col].min()),
                    'max': float(df[col].max()),
                    'null_ratio': float(df[col].isna().mean())
                }
        
        return report
    
    def aggregate_to_daily(
        self,
        df: pd.DataFrame,
        date_column: str = 'date',
        user_column: str = 'user_id'
    ) -> pd.DataFrame:
        """
        Aggregate high-frequency data (e.g., heart rate samples) to daily summaries.
        
        Useful for datasets with per-second or per-minute measurements.
        """
        if date_column not in df.columns:
            logger.warning(f"Date column '{date_column}' not found, skipping aggregation")
            return df
        
        # Parse dates
        df[date_column] = pd.to_datetime(df[date_column], errors='coerce')
        df['_date_only'] = df[date_column].dt.date
        
        # Define aggregations
        agg_funcs = {}
        
        if 'heart_rate' in df.columns:
            agg_funcs['heart_rate'] = ['mean', 'min', 'max', 'std']
        if 'steps' in df.columns:
            agg_funcs['steps'] = 'sum'
        if 'active_energy' in df.columns:
            agg_funcs['active_energy'] = 'sum'
        if 'sleep_hours' in df.columns:
            agg_funcs['sleep_hours'] = 'sum'
        if 'stress_level' in df.columns:
            agg_funcs['stress_level'] = 'mean'
        if 'exercise_duration' in df.columns:
            agg_funcs['exercise_duration'] = 'sum'
        
        if not agg_funcs:
            logger.warning("No columns to aggregate")
            return df
        
        # Group and aggregate
        group_cols = ['_date_only']
        if user_column in df.columns:
            group_cols.append(user_column)
        
        daily_df = df.groupby(group_cols).agg(agg_funcs).reset_index()
        
        # Flatten multi-level columns
        daily_df.columns = [
            '_'.join(col).strip('_') if isinstance(col, tuple) else col 
            for col in daily_df.columns
        ]
        
        # Rename date column back
        daily_df = daily_df.rename(columns={'_date_only': 'date'})
        
        # Compute resting heart rate (use minimum as proxy)
        if 'heart_rate_min' in daily_df.columns:
            daily_df['heart_rate_resting'] = daily_df['heart_rate_min']
            daily_df['heart_rate'] = daily_df['heart_rate_mean']
        
        logger.info(f"Aggregated to {len(daily_df)} daily records")
        
        return daily_df


def get_dataset_loader(data_dir: Optional[str] = None) -> DatasetLoader:
    """Get a DatasetLoader instance."""
    return DatasetLoader(data_dir)

