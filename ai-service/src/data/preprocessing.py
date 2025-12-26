#!/usr/bin/env python3
"""
Data Preprocessing Module for LifePattern AI

Processes Kaggle datasets into a unified schema for model training.
This replaces hardcoded LITERATURE_BASELINES with data-driven thresholds.

Datasets Supported:
1. Sleep Health & Lifestyle - Has Sleep Disorder labels (anomaly)
2. Lifestyle & Wellbeing - Has Wellness Score (derive anomaly)
3. FitBit Fitness Tracker - Real wearable data
4. SWELL HRV - Stress condition labels

Usage:
    python -m src.data.preprocessing
"""

import os
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Optional, Dict, List
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DataPreprocessor:
    """Preprocess Kaggle datasets into unified schema."""
    
    # Target schema for LifePattern AI
    UNIFIED_COLUMNS = [
        'sleep_hours',
        'stress_level',        # 1-10 scale
        'exercise_minutes',
        'screen_time',
        'water_intake',
        'heart_rate',
        'steps',
        'gender',              # male/female
        'age',
        'is_anomaly',          # Target label
        'source'               # Dataset source
    ]
    
    def __init__(self, raw_data_dir: str = 'data/raw'):
        self.raw_data_dir = Path(raw_data_dir)
        self.processed_dfs: List[pd.DataFrame] = []
        
    def process_sleep_health(self, filepath: Optional[str] = None) -> Optional[pd.DataFrame]:
        """
        Process Sleep Health & Lifestyle dataset.
        
        This is the PRIMARY dataset because it has actual anomaly labels
        (Sleep Disorder != 'None')
        
        Expected columns:
        - Sleep Duration, Stress Level, Physical Activity Level
        - Heart Rate, Daily Steps, Gender, Age
        - Sleep Disorder (None, Insomnia, Sleep Apnea)
        """
        if filepath is None:
            filepath = self.raw_data_dir / 'Sleep_health_and_lifestyle_dataset.csv'
        
        if not Path(filepath).exists():
            logger.warning(f"Sleep Health dataset not found at {filepath}")
            return None
            
        logger.info(f"Processing Sleep Health dataset from {filepath}")
        df = pd.read_csv(filepath)
        
        # Print available columns for debugging
        logger.info(f"Available columns: {list(df.columns)}")
        
        processed = pd.DataFrame()
        
        # Map columns (handle different column name formats)
        if 'Sleep Duration' in df.columns:
            processed['sleep_hours'] = df['Sleep Duration']
        elif 'sleep_duration' in df.columns:
            processed['sleep_hours'] = df['sleep_duration']
            
        if 'Stress Level' in df.columns:
            processed['stress_level'] = df['Stress Level']
        elif 'stress_level' in df.columns:
            processed['stress_level'] = df['stress_level']
            
        if 'Physical Activity Level' in df.columns:
            processed['exercise_minutes'] = df['Physical Activity Level']
        elif 'physical_activity_level' in df.columns:
            processed['exercise_minutes'] = df['physical_activity_level']
            
        if 'Heart Rate' in df.columns:
            processed['heart_rate'] = df['Heart Rate']
        elif 'heart_rate' in df.columns:
            processed['heart_rate'] = df['heart_rate']
            
        if 'Daily Steps' in df.columns:
            processed['steps'] = df['Daily Steps']
        elif 'daily_steps' in df.columns:
            processed['steps'] = df['daily_steps']
            
        if 'Gender' in df.columns:
            processed['gender'] = df['Gender'].str.lower()
        elif 'gender' in df.columns:
            processed['gender'] = df['gender'].str.lower()
            
        if 'Age' in df.columns:
            processed['age'] = df['Age']
        elif 'age' in df.columns:
            processed['age'] = df['age']
            
        # KEY: Use Sleep Disorder as anomaly label!
        if 'Sleep Disorder' in df.columns:
            processed['is_anomaly'] = (df['Sleep Disorder'] != 'None').astype(int)
        elif 'sleep_disorder' in df.columns:
            processed['is_anomaly'] = (df['sleep_disorder'] != 'None').astype(int)
        else:
            processed['is_anomaly'] = 0
        
        # Add missing columns with NaN
        processed['screen_time'] = np.nan
        processed['water_intake'] = np.nan
        processed['source'] = 'sleep_health'
        
        logger.info(f"Processed {len(processed)} rows from Sleep Health dataset")
        logger.info(f"Anomaly rate: {processed['is_anomaly'].mean():.2%}")
        
        return processed
    
    def process_lifestyle(self, filepath: Optional[str] = None) -> Optional[pd.DataFrame]:
        """
        Process Lifestyle & Wellbeing dataset.
        
        Large dataset (12,757 rows) with wellness scores.
        Derive anomaly from low WORK_LIFE_BALANCE_SCORE.
        
        Expected columns:
        - SLEEP_HOURS, DAILY_STRESS, DAILY_STEPS
        - GENDER, AGE, WORK_LIFE_BALANCE_SCORE
        """
        if filepath is None:
            filepath = self.raw_data_dir / 'Wellbeing_and_lifestyle_data_Kaggle.csv'
            
        if not Path(filepath).exists():
            logger.warning(f"Lifestyle dataset not found at {filepath}")
            return None
            
        logger.info(f"Processing Lifestyle dataset from {filepath}")
        df = pd.read_csv(filepath)
        
        logger.info(f"Available columns: {list(df.columns)}")
        
        processed = pd.DataFrame()
        
        # Map columns
        if 'SLEEP_HOURS' in df.columns:
            processed['sleep_hours'] = df['SLEEP_HOURS']
        
        if 'DAILY_STRESS' in df.columns:
            processed['stress_level'] = df['DAILY_STRESS']
        
        if 'DAILY_STEPS' in df.columns:
            processed['steps'] = df['DAILY_STEPS']
        
        if 'GENDER' in df.columns:
            processed['gender'] = df['GENDER'].map({1: 'female', 0: 'male'})
        
        if 'AGE' in df.columns:
            processed['age'] = df['AGE']
        
        # Derive anomaly from low wellness score (< 500 out of 1000)
        if 'WORK_LIFE_BALANCE_SCORE' in df.columns:
            processed['is_anomaly'] = (df['WORK_LIFE_BALANCE_SCORE'] < 500).astype(int)
        else:
            processed['is_anomaly'] = 0
        
        # Add missing columns
        processed['exercise_minutes'] = np.nan
        processed['screen_time'] = np.nan
        processed['water_intake'] = np.nan
        processed['heart_rate'] = np.nan
        processed['source'] = 'lifestyle'
        
        logger.info(f"Processed {len(processed)} rows from Lifestyle dataset")
        logger.info(f"Anomaly rate: {processed['is_anomaly'].mean():.2%}")
        
        return processed
    
    def process_fitbit(self, directory: Optional[str] = None) -> Optional[pd.DataFrame]:
        """
        Process FitBit Fitness Tracker dataset.
        
        Real wearable device data from 30 users.
        
        Expected files:
        - dailyActivity_merged.csv (steps, calories, active minutes)
        - sleepDay_merged.csv (sleep duration)
        """
        if directory is None:
            # Try multiple possible paths for FitBit data
            possible_paths = [
                self.raw_data_dir / 'fitbit',
                self.raw_data_dir / 'mturkfitbit_export_4.12.16-5.12.16' / 'Fitabase Data 4.12.16-5.12.16',
                self.raw_data_dir / 'mturkfitbit_export_3.12.16-4.11.16' / 'Fitabase Data 3.12.16-4.11.16',
            ]
            
            for path in possible_paths:
                if (path / 'dailyActivity_merged.csv').exists():
                    directory = path
                    break
            else:
                directory = self.raw_data_dir / 'fitbit'  # Default fallback
        
        directory = Path(directory)
        activity_path = directory / 'dailyActivity_merged.csv'
        sleep_path = directory / 'sleepDay_merged.csv'
        
        if not activity_path.exists():
            logger.warning(f"FitBit activity data not found at {activity_path}")
            return None
            
        logger.info(f"Processing FitBit dataset from {directory}")
        activity = pd.read_csv(activity_path)
        
        logger.info(f"Activity columns: {list(activity.columns)}")
        
        # Try to merge with sleep data
        try:
            if sleep_path.exists():
                sleep = pd.read_csv(sleep_path)
                logger.info(f"Sleep columns: {list(sleep.columns)}")
                
                # Convert dates
                activity['ActivityDate'] = pd.to_datetime(activity['ActivityDate'])
                sleep['SleepDay'] = pd.to_datetime(sleep['SleepDay'].str.split().str[0])
                
                # Merge on Id and date
                df = activity.merge(
                    sleep, 
                    left_on=['Id', 'ActivityDate'], 
                    right_on=['Id', 'SleepDay'], 
                    how='left'
                )
            else:
                df = activity
                df['TotalMinutesAsleep'] = np.nan
        except Exception as e:
            logger.warning(f"Error merging sleep data: {e}")
            df = activity
            df['TotalMinutesAsleep'] = np.nan
        
        processed = pd.DataFrame()
        
        # Map columns
        if 'TotalMinutesAsleep' in df.columns:
            processed['sleep_hours'] = df['TotalMinutesAsleep'] / 60
        
        if 'VeryActiveMinutes' in df.columns and 'FairlyActiveMinutes' in df.columns:
            processed['exercise_minutes'] = df['VeryActiveMinutes'] + df['FairlyActiveMinutes']
        
        if 'TotalSteps' in df.columns:
            processed['steps'] = df['TotalSteps']
        
        # Derive anomaly from very low activity or sleep
        processed['is_anomaly'] = 0
        if 'TotalSteps' in df.columns:
            processed.loc[df['TotalSteps'] < 3000, 'is_anomaly'] = 1
        if 'TotalMinutesAsleep' in df.columns:
            processed.loc[df['TotalMinutesAsleep'] < 300, 'is_anomaly'] = 1
        
        # Add missing columns
        processed['stress_level'] = np.nan
        processed['screen_time'] = np.nan
        processed['water_intake'] = np.nan
        processed['heart_rate'] = np.nan
        processed['gender'] = np.nan
        processed['age'] = np.nan
        processed['source'] = 'fitbit'
        
        logger.info(f"Processed {len(processed)} rows from FitBit dataset")
        logger.info(f"Anomaly rate: {processed['is_anomaly'].mean():.2%}")
        
        return processed
    
    def process_mental_health(self, filepath: Optional[str] = None) -> Optional[pd.DataFrame]:
        """
        Process Mental Health and Technology Usage dataset.
        
        Contains stress, anxiety, and technology usage data.
        """
        if filepath is None:
            filepath = self.raw_data_dir / 'mental_health_and_technology_usage_2024.csv'
        
        if not Path(filepath).exists():
            logger.warning(f"Mental Health dataset not found at {filepath}")
            return None
        
        logger.info(f"Processing Mental Health dataset from {filepath}")
        df = pd.read_csv(filepath)
        
        logger.info(f"Available columns: {list(df.columns)}")
        
        processed = pd.DataFrame()
        
        # Map columns (check actual column names)
        col_map = {}
        for col in df.columns:
            col_lower = col.lower()
            if 'stress' in col_lower:
                col_map['stress_level'] = col
            elif 'sleep' in col_lower:
                col_map['sleep_hours'] = col
            elif 'screen' in col_lower or 'usage' in col_lower:
                col_map['screen_time'] = col
            elif 'exercise' in col_lower or 'physical' in col_lower:
                col_map['exercise_minutes'] = col
            elif 'gender' in col_lower:
                col_map['gender'] = col
            elif 'age' in col_lower:
                col_map['age'] = col
        
        for target, source in col_map.items():
            if target == 'gender':
                processed[target] = df[source].astype(str).str.lower()
            else:
                processed[target] = pd.to_numeric(df[source], errors='coerce')
        
        # Derive anomaly from high stress or low sleep
        processed['is_anomaly'] = 0
        if 'stress_level' in processed.columns:
            # Normalize stress if needed
            max_stress = processed['stress_level'].max()
            if max_stress > 10:
                processed['stress_level'] = processed['stress_level'] / max_stress * 10
            processed.loc[processed['stress_level'] > 7, 'is_anomaly'] = 1
        if 'sleep_hours' in processed.columns:
            processed.loc[processed['sleep_hours'] < 5, 'is_anomaly'] = 1
        
        # Add missing columns
        for col in ['heart_rate', 'steps', 'water_intake']:
            if col not in processed.columns:
                processed[col] = np.nan
        
        processed['source'] = 'mental_health'
        
        logger.info(f"Processed {len(processed)} rows from Mental Health dataset")
        logger.info(f"Anomaly rate: {processed['is_anomaly'].mean():.2%}")
        
        return processed
    
    def process_hrv(self, filepath: Optional[str] = None) -> Optional[pd.DataFrame]:
        """
        Process SWELL HRV dataset.
        
        Heart rate variability with stress condition labels.
        
        Expected columns:
        - condition (no stress, time pressure, interruption)
        - HR (heart rate)
        - HRV metrics
        """
        if filepath is None:
            # Try multiple paths
            possible_paths = [
                self.raw_data_dir / 'swell_hrv.csv',
                self.raw_data_dir / 'hrv dataset' / 'hrv dataset' / 'data' / 'final' / 'train.csv',
            ]
            
            for path in possible_paths:
                if path.exists():
                    filepath = path
                    break
            else:
                filepath = self.raw_data_dir / 'swell_hrv.csv'
            
        if not Path(filepath).exists():
            logger.warning(f"SWELL HRV dataset not found at {filepath}")
            return None
            
        logger.info(f"Processing SWELL HRV dataset from {filepath}")
        df = pd.read_csv(filepath)
        
        logger.info(f"Available columns: {list(df.columns)}")
        
        processed = pd.DataFrame()
        
        # Map stress condition to level (1-10)
        stress_map = {
            'no stress': 2,
            'time pressure': 7,
            'interruption': 8,
            'baseline': 2,
            'stress': 8
        }
        
        if 'condition' in df.columns:
            processed['stress_level'] = df['condition'].map(stress_map).fillna(5)
            processed['is_anomaly'] = (df['condition'] != 'no stress').astype(int)
        else:
            processed['stress_level'] = 5
            processed['is_anomaly'] = 0
        
        if 'HR' in df.columns:
            processed['heart_rate'] = df['HR']
        elif 'heart_rate' in df.columns:
            processed['heart_rate'] = df['heart_rate']
        
        # Add missing columns
        processed['sleep_hours'] = np.nan
        processed['exercise_minutes'] = np.nan
        processed['screen_time'] = np.nan
        processed['water_intake'] = np.nan
        processed['steps'] = np.nan
        processed['gender'] = np.nan
        processed['age'] = np.nan
        processed['source'] = 'hrv'
        
        logger.info(f"Processed {len(processed)} rows from HRV dataset")
        logger.info(f"Anomaly rate: {processed['is_anomaly'].mean():.2%}")
        
        return processed
    
    def process_student_lifestyle(self, filepath: Optional[str] = None) -> Optional[pd.DataFrame]:
        """
        Process Student Lifestyle dataset.
        
        Additional behavioral data from students.
        """
        if filepath is None:
            filepath = self.raw_data_dir / 'student_lifestyle.csv'
            
        if not Path(filepath).exists():
            logger.warning(f"Student Lifestyle dataset not found at {filepath}")
            return None
            
        logger.info(f"Processing Student Lifestyle dataset from {filepath}")
        df = pd.read_csv(filepath)
        
        logger.info(f"Available columns: {list(df.columns)}")
        
        processed = pd.DataFrame()
        
        # Map columns (column names may vary)
        for col in df.columns:
            col_lower = col.lower()
            if 'sleep' in col_lower and 'hour' in col_lower:
                processed['sleep_hours'] = pd.to_numeric(df[col], errors='coerce')
            elif 'stress' in col_lower:
                processed['stress_level'] = pd.to_numeric(df[col], errors='coerce')
            elif 'exercise' in col_lower or 'physical' in col_lower:
                processed['exercise_minutes'] = pd.to_numeric(df[col], errors='coerce')
        
        # Derive anomaly from high stress or low sleep
        processed['is_anomaly'] = 0
        if 'sleep_hours' in processed.columns:
            processed.loc[processed['sleep_hours'] < 5, 'is_anomaly'] = 1
        if 'stress_level' in processed.columns:
            processed.loc[processed['stress_level'] > 7, 'is_anomaly'] = 1
        
        # Add missing columns
        for col in ['screen_time', 'water_intake', 'heart_rate', 'steps', 'gender', 'age']:
            if col not in processed.columns:
                processed[col] = np.nan
        
        processed['source'] = 'student_lifestyle'
        
        logger.info(f"Processed {len(processed)} rows from Student Lifestyle dataset")
        
        return processed
    
    def process_sample_data(self, filepath: Optional[str] = None) -> Optional[pd.DataFrame]:
        """
        Process sample health data (synthetic or from training scripts).
        
        This is a fallback when Kaggle datasets are not available.
        """
        if filepath is None:
            filepath = self.raw_data_dir.parent / 'sample_health_data.csv'
        
        if not Path(filepath).exists():
            logger.warning(f"Sample data not found at {filepath}")
            return None
        
        logger.info(f"Processing sample health data from {filepath}")
        df = pd.read_csv(filepath)
        
        logger.info(f"Available columns: {list(df.columns)}")
        
        processed = pd.DataFrame()
        
        # Map columns directly (sample data matches our schema)
        for col in ['sleep_hours', 'steps', 'heart_rate', 'exercise_duration', 
                    'stress_level', 'water_intake', 'sleep_quality']:
            if col in df.columns:
                processed[col] = df[col]
        
        # Rename exercise_duration to exercise_minutes
        if 'exercise_duration' in processed.columns:
            processed['exercise_minutes'] = processed['exercise_duration'] * 60
        
        # Create anomaly labels based on deviations
        processed['is_anomaly'] = 0
        
        # Flag low sleep
        if 'sleep_hours' in processed.columns:
            processed.loc[processed['sleep_hours'] < 5.5, 'is_anomaly'] = 1
        
        # Flag high stress  
        if 'stress_level' in processed.columns:
            processed.loc[processed['stress_level'] > 7, 'is_anomaly'] = 1
        
        # Flag low steps
        if 'steps' in processed.columns:
            processed.loc[processed['steps'] < 3000, 'is_anomaly'] = 1
        
        # Add missing columns
        for col in ['screen_time', 'gender', 'age']:
            if col not in processed.columns:
                processed[col] = np.nan
        
        processed['source'] = 'sample_data'
        
        logger.info(f"Processed {len(processed)} rows from sample data")
        logger.info(f"Anomaly rate: {processed['is_anomaly'].mean():.2%}")
        
        return processed
    
    def create_unified_dataset(self, output_path: str = 'data/processed/unified_dataset.csv', use_sample_fallback: bool = True) -> pd.DataFrame:
        """
        Combine all datasets into unified schema.
        
        Args:
            output_path: Where to save the unified dataset
            use_sample_fallback: If True and no Kaggle data found, use sample data
        
        Returns:
            Combined DataFrame with all available data
        """
        logger.info("=" * 60)
        logger.info("Creating Unified Dataset from Kaggle Sources")
        logger.info("=" * 60)
        
        dfs = []
        
        # Process each dataset
        sleep_health = self.process_sleep_health()
        if sleep_health is not None:
            dfs.append(sleep_health)
        
        lifestyle = self.process_lifestyle()
        if lifestyle is not None:
            dfs.append(lifestyle)
        
        fitbit = self.process_fitbit()
        if fitbit is not None:
            dfs.append(fitbit)
        
        hrv = self.process_hrv()
        if hrv is not None:
            dfs.append(hrv)
        
        student = self.process_student_lifestyle()
        if student is not None:
            dfs.append(student)
        
        mental_health = self.process_mental_health()
        if mental_health is not None:
            dfs.append(mental_health)
        
        if not dfs and use_sample_fallback:
            logger.warning("No Kaggle datasets found. Falling back to sample data.")
            sample_data = self.process_sample_data()
            if sample_data is not None:
                dfs.append(sample_data)
        
        if not dfs:
            logger.error("No datasets found! Please download Kaggle datasets first.")
            logger.info("Run: kaggle datasets download -d uom190346a/sleep-health-and-lifestyle-dataset -p data/raw/ --unzip")
            # Return empty DataFrame with correct columns
            return pd.DataFrame(columns=self.UNIFIED_COLUMNS)
        
        # Combine all
        unified = pd.concat(dfs, ignore_index=True)
        
        # Ensure all columns exist
        for col in self.UNIFIED_COLUMNS:
            if col not in unified.columns:
                unified[col] = np.nan
        
        # Reorder columns
        unified = unified[self.UNIFIED_COLUMNS]
        
        # Save
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        unified.to_csv(output_path, index=False)
        
        logger.info("=" * 60)
        logger.info("UNIFIED DATASET CREATED")
        logger.info("=" * 60)
        logger.info(f"Total rows: {len(unified)}")
        logger.info(f"Anomaly rate: {unified['is_anomaly'].mean():.2%}")
        logger.info(f"Sources: {unified['source'].value_counts().to_dict()}")
        logger.info(f"Saved to: {output_path}")
        
        return unified


def download_kaggle_datasets():
    """Download all required Kaggle datasets."""
    import subprocess
    
    datasets = [
        'uom190346a/sleep-health-and-lifestyle-dataset',
        'ydalat/lifestyle-and-wellbeing-data',
        'arashnic/fitbit',
        # 'qiriro/swell-heart-rate-variability-hrv',  # May need manual download
    ]
    
    for dataset in datasets:
        print(f"Downloading {dataset}...")
        cmd = f"kaggle datasets download -d {dataset} -p data/raw/ --unzip"
        try:
            subprocess.run(cmd.split(), check=True)
            print(f"✓ Downloaded {dataset}")
        except Exception as e:
            print(f"✗ Failed to download {dataset}: {e}")


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == '--download':
        download_kaggle_datasets()
    else:
        preprocessor = DataPreprocessor()
        df = preprocessor.create_unified_dataset()
        
        if len(df) == 0:
            print("\n⚠️  No data found! Download datasets first:")
            print("   python -m src.data.preprocessing --download")

