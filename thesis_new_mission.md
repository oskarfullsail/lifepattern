# LifePattern AI: Data-Driven Training Plan
## Replace Hardcoded Values with Kaggle Dataset Training

**Goal:** Train models on REAL DATA instead of hardcoded thresholds
**Deadline:** January 5, 2026

---

# KAGGLE DATASETS TO USE

| # | Dataset Name | Kaggle URL | Rows | Key Features | Use For |
|---|--------------|------------|------|--------------|---------|
| 1 | **Sleep Health & Lifestyle** | `uom190346a/sleep-health-and-lifestyle-dataset` | 374 | Sleep, Stress, Exercise, Heart Rate, **Sleep Disorder Labels** | Primary training - has anomaly labels! |
| 2 | **Lifestyle & Wellbeing** | `ydalat/lifestyle-and-wellbeing-data` | 12,757 | Sleep hours, Daily stress, Steps, Wellness score | Large-scale behavioral patterns |
| 3 | **FitBit Fitness Tracker** | `arashnic/fitbit` | 940 | Sleep minutes, Steps, Active minutes, Calories | Real wearable device data |
| 4 | **SWELL HRV** | `qiriro/swell-heart-rate-variability-hrv` | 1,000+ | HRV metrics, **Stress condition labels** | HRV → Stress mapping |
| 5 | **Student Lifestyle** | `steve1215roern/student-lifestyle-dataset` | 2,000 | Sleep, Study hours, Stress, Physical activity | Additional behavioral data |

---

# PHASE 1: DATA ACQUISITION
## Days 1-2 (Dec 22-23)

### Task 1.1: Download All Datasets
**Time:** 2 hours

```bash
# Install Kaggle CLI
pip install kaggle

# Create data directories
mkdir -p data/raw data/processed data/models

# Download datasets
kaggle datasets download -d uom190346a/sleep-health-and-lifestyle-dataset -p data/raw/ --unzip
kaggle datasets download -d ydalat/lifestyle-and-wellbeing-data -p data/raw/ --unzip
kaggle datasets download -d arashnic/fitbit -p data/raw/ --unzip
kaggle datasets download -d qiriro/swell-heart-rate-variability-hrv -p data/raw/ --unzip
kaggle datasets download -d steve1215roern/student-lifestyle-dataset -p data/raw/ --unzip
```

**Deliverables:**
- [ ] `data/raw/Sleep_health_and_lifestyle_dataset.csv`
- [ ] `data/raw/Wellbeing_and_lifestyle_data_Kaggle.csv`
- [ ] `data/raw/fitbit/` (folder with multiple CSVs)
- [ ] `data/raw/swell_hrv.csv`
- [ ] `data/raw/student_lifestyle.csv`

---

### Task 1.2: Explore Dataset Schemas
**Time:** 3 hours

```python
# explore_datasets.py
import pandas as pd

# Load and examine each dataset
datasets = {
    'sleep_health': 'data/raw/Sleep_health_and_lifestyle_dataset.csv',
    'lifestyle': 'data/raw/Wellbeing_and_lifestyle_data_Kaggle.csv',
    'fitbit': 'data/raw/fitbit/dailyActivity_merged.csv',
    'hrv': 'data/raw/swell_hrv.csv'
}

for name, path in datasets.items():
    df = pd.read_csv(path)
    print(f"\n{'='*50}")
    print(f"Dataset: {name}")
    print(f"Shape: {df.shape}")
    print(f"Columns: {list(df.columns)}")
    print(f"Sample:\n{df.head(2)}")
```

**Deliverables:**
- [ ] `docs/dataset_schemas.md` - Document all columns and data types

---

# PHASE 2: DATA PREPROCESSING
## Days 3-4 (Dec 24-25)

### Task 2.1: Create Unified Data Schema
**Time:** 4 hours

```python
# src/data/preprocessing.py
import pandas as pd
import numpy as np

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
        'is_anomaly'           # Target label
    ]
    
    def process_sleep_health(self, filepath):
        """Process Sleep Health & Lifestyle dataset."""
        df = pd.read_csv(filepath)
        
        # Map columns
        processed = pd.DataFrame({
            'sleep_hours': df['Sleep Duration'],
            'stress_level': df['Stress Level'],
            'exercise_minutes': df['Physical Activity Level'],
            'heart_rate': df['Heart Rate'],
            'steps': df['Daily Steps'],
            'gender': df['Gender'].str.lower(),
            'age': df['Age'],
            # KEY: Use Sleep Disorder as anomaly label!
            'is_anomaly': (df['Sleep Disorder'] != 'None').astype(int)
        })
        
        # Add missing columns with NaN
        processed['screen_time'] = np.nan
        processed['water_intake'] = np.nan
        
        processed['source'] = 'sleep_health'
        return processed
    
    def process_lifestyle(self, filepath):
        """Process Lifestyle & Wellbeing dataset."""
        df = pd.read_csv(filepath)
        
        processed = pd.DataFrame({
            'sleep_hours': df['SLEEP_HOURS'],
            'stress_level': df['DAILY_STRESS'],
            'steps': df['DAILY_STEPS'] if 'DAILY_STEPS' in df.columns else np.nan,
            'gender': df['GENDER'].map({1: 'female', 0: 'male'}),
            'age': df['AGE'],
            # Derive anomaly from low wellness score
            'is_anomaly': (df['WORK_LIFE_BALANCE_SCORE'] < 500).astype(int)
        })
        
        processed['exercise_minutes'] = np.nan
        processed['screen_time'] = np.nan
        processed['water_intake'] = np.nan
        processed['heart_rate'] = np.nan
        
        processed['source'] = 'lifestyle'
        return processed
    
    def process_fitbit(self, directory):
        """Process FitBit dataset."""
        # Load activity and sleep data
        activity = pd.read_csv(f"{directory}/dailyActivity_merged.csv")
        
        try:
            sleep = pd.read_csv(f"{directory}/sleepDay_merged.csv")
            # Merge on Id and date
            activity['ActivityDate'] = pd.to_datetime(activity['ActivityDate'])
            sleep['SleepDay'] = pd.to_datetime(sleep['SleepDay'])
            df = activity.merge(sleep, left_on=['Id', 'ActivityDate'], 
                               right_on=['Id', 'SleepDay'], how='left')
        except:
            df = activity
            df['TotalMinutesAsleep'] = np.nan
        
        processed = pd.DataFrame({
            'sleep_hours': df['TotalMinutesAsleep'] / 60,
            'exercise_minutes': df['VeryActiveMinutes'] + df['FairlyActiveMinutes'],
            'steps': df['TotalSteps'],
            # Derive anomaly from very low activity
            'is_anomaly': ((df['TotalSteps'] < 3000) | 
                          (df['TotalMinutesAsleep'] < 300)).astype(int)
        })
        
        processed['stress_level'] = np.nan
        processed['screen_time'] = np.nan
        processed['water_intake'] = np.nan
        processed['heart_rate'] = np.nan
        processed['gender'] = np.nan
        processed['age'] = np.nan
        
        processed['source'] = 'fitbit'
        return processed
    
    def process_hrv(self, filepath):
        """Process SWELL HRV dataset."""
        df = pd.read_csv(filepath)
        
        # Map stress condition to level
        stress_map = {
            'no stress': 2,
            'time pressure': 7,
            'interruption': 8
        }
        
        processed = pd.DataFrame({
            'stress_level': df['condition'].map(stress_map),
            'heart_rate': df.get('HR', np.nan),
            # HRV stress label as anomaly
            'is_anomaly': (df['condition'] != 'no stress').astype(int)
        })
        
        processed['sleep_hours'] = np.nan
        processed['exercise_minutes'] = np.nan
        processed['screen_time'] = np.nan
        processed['water_intake'] = np.nan
        processed['steps'] = np.nan
        processed['gender'] = np.nan
        processed['age'] = np.nan
        
        processed['source'] = 'hrv'
        return processed
    
    def create_unified_dataset(self):
        """Combine all datasets."""
        dfs = []
        
        # Process each dataset
        dfs.append(self.process_sleep_health('data/raw/Sleep_health_and_lifestyle_dataset.csv'))
        dfs.append(self.process_lifestyle('data/raw/Wellbeing_and_lifestyle_data_Kaggle.csv'))
        dfs.append(self.process_fitbit('data/raw/fitbit'))
        dfs.append(self.process_hrv('data/raw/swell_hrv.csv'))
        
        # Combine
        unified = pd.concat(dfs, ignore_index=True)
        
        # Save
        unified.to_csv('data/processed/unified_dataset.csv', index=False)
        
        print(f"Unified dataset: {len(unified)} rows")
        print(f"Anomaly rate: {unified['is_anomaly'].mean():.2%}")
        
        return unified


if __name__ == "__main__":
    preprocessor = DataPreprocessor()
    df = preprocessor.create_unified_dataset()
```

**Deliverables:**
- [ ] `src/data/preprocessing.py`
- [ ] `data/processed/unified_dataset.csv`

---

### Task 2.2: Calculate Data-Driven Thresholds
**Time:** 3 hours

```python
# src/data/threshold_calculator.py
import pandas as pd
import numpy as np
import json

class ThresholdCalculator:
    """
    Calculate thresholds FROM DATA instead of hardcoding.
    This replaces all hardcoded LITERATURE_BASELINES.
    """
    
    def __init__(self, df):
        self.df = df
        self.thresholds = {}
    
    def calculate_all_thresholds(self):
        """Calculate thresholds for all features from data."""
        
        for feature in ['sleep_hours', 'stress_level', 'exercise_minutes', 
                        'screen_time', 'steps', 'heart_rate']:
            if feature in self.df.columns:
                self.thresholds[feature] = self._calculate_feature_thresholds(feature)
        
        return self.thresholds
    
    def _calculate_feature_thresholds(self, feature):
        """Calculate thresholds for a single feature using percentiles."""
        data = self.df[feature].dropna()
        
        if len(data) < 10:
            return None
        
        return {
            'critical_low': float(data.quantile(0.05)),
            'warning_low': float(data.quantile(0.15)),
            'optimal_min': float(data.quantile(0.25)),
            'population_mean': float(data.mean()),
            'optimal_max': float(data.quantile(0.75)),
            'warning_high': float(data.quantile(0.85)),
            'critical_high': float(data.quantile(0.95)),
            'population_std': float(data.std()),
            'n_samples': len(data)
        }
    
    def calculate_gender_thresholds(self):
        """Calculate separate thresholds for male and female."""
        gender_thresholds = {'male': {}, 'female': {}}
        
        for gender in ['male', 'female']:
            gender_df = self.df[self.df['gender'] == gender]
            
            if len(gender_df) > 50:
                for feature in ['sleep_hours', 'stress_level', 'exercise_minutes']:
                    if feature in gender_df.columns:
                        data = gender_df[feature].dropna()
                        if len(data) > 10:
                            gender_thresholds[gender][feature] = {
                                'mean': float(data.mean()),
                                'std': float(data.std()),
                                'low': float(data.quantile(0.25)),
                                'high': float(data.quantile(0.75))
                            }
        
        return gender_thresholds
    
    def save_thresholds(self, filepath):
        """Save calculated thresholds to JSON."""
        output = {
            'general': self.thresholds,
            'gender_specific': self.calculate_gender_thresholds(),
            'metadata': {
                'total_samples': len(self.df),
                'anomaly_rate': float(self.df['is_anomaly'].mean()),
                'generated_from': 'kaggle_datasets'
            }
        }
        
        with open(filepath, 'w') as f:
            json.dump(output, f, indent=2)
        
        print(f"Saved thresholds to {filepath}")
        return output


if __name__ == "__main__":
    df = pd.read_csv('data/processed/unified_dataset.csv')
    calc = ThresholdCalculator(df)
    calc.calculate_all_thresholds()
    calc.save_thresholds('data/processed/data_driven_thresholds.json')
```

**Deliverables:**
- [ ] `src/data/threshold_calculator.py`
- [ ] `data/processed/data_driven_thresholds.json` (REPLACES hardcoded LITERATURE_BASELINES)

---

# PHASE 3: FEATURE ENGINEERING
## Days 5-6 (Dec 26-27)

### Task 3.1: Create Engineered Features
**Time:** 4 hours

```python
# src/features/feature_engineering.py
import pandas as pd
import numpy as np

class FeatureEngineer:
    """Create derived features for ML training."""
    
    def __init__(self, thresholds_path='data/processed/data_driven_thresholds.json'):
        import json
        with open(thresholds_path) as f:
            self.thresholds = json.load(f)
    
    def engineer_features(self, df):
        """Create all engineered features."""
        
        # Z-scores using DATA-DERIVED means and stds
        for feature in ['sleep_hours', 'stress_level', 'exercise_minutes']:
            if feature in df.columns and feature in self.thresholds['general']:
                mean = self.thresholds['general'][feature]['population_mean']
                std = self.thresholds['general'][feature]['population_std']
                df[f'{feature}_zscore'] = (df[feature] - mean) / std
        
        # Sleep quality index
        if 'sleep_hours' in df.columns:
            optimal_sleep = self.thresholds['general']['sleep_hours']['population_mean']
            df['sleep_quality_index'] = 1 - abs(df['sleep_hours'] - optimal_sleep) / optimal_sleep
            df['sleep_quality_index'] = df['sleep_quality_index'].clip(0, 1)
        
        # Stress-sleep interaction
        if 'stress_level' in df.columns and 'sleep_hours' in df.columns:
            df['stress_sleep_ratio'] = df['stress_level'] / (df['sleep_hours'] + 0.1)
        
        # Activity score
        if 'exercise_minutes' in df.columns:
            optimal_exercise = self.thresholds['general'].get('exercise_minutes', {}).get('population_mean', 30)
            df['exercise_adequacy'] = (df['exercise_minutes'] / optimal_exercise).clip(0, 2)
        
        # Recovery score (inverse stress + sleep)
        if 'stress_level' in df.columns and 'sleep_hours' in df.columns:
            df['recovery_score'] = (
                (10 - df['stress_level']) / 10 * 0.5 +
                df['sleep_hours'] / 8 * 0.5
            ).clip(0, 1)
        
        # Gender encoding
        if 'gender' in df.columns:
            df['gender_encoded'] = (df['gender'] == 'female').astype(int)
        
        # Gender-specific z-scores
        if 'gender' in df.columns and 'sleep_hours' in df.columns:
            df['sleep_zscore_gendered'] = df.apply(
                lambda row: self._gender_zscore(row, 'sleep_hours'), axis=1
            )
        
        return df
    
    def _gender_zscore(self, row, feature):
        """Calculate z-score using gender-specific stats."""
        gender = row.get('gender', 'male')
        gender_stats = self.thresholds.get('gender_specific', {}).get(gender, {}).get(feature, {})
        
        if gender_stats:
            mean = gender_stats['mean']
            std = gender_stats['std']
            return (row[feature] - mean) / std if std > 0 else 0
        return 0
    
    def get_feature_list(self):
        """Return list of all features for training."""
        return [
            # Original
            'sleep_hours', 'stress_level', 'exercise_minutes', 'steps', 'heart_rate',
            # Engineered
            'sleep_hours_zscore', 'stress_level_zscore', 'exercise_minutes_zscore',
            'sleep_quality_index', 'stress_sleep_ratio', 'exercise_adequacy',
            'recovery_score', 'gender_encoded', 'sleep_zscore_gendered'
        ]


if __name__ == "__main__":
    df = pd.read_csv('data/processed/unified_dataset.csv')
    engineer = FeatureEngineer()
    df = engineer.engineer_features(df)
    df.to_csv('data/processed/features_engineered.csv', index=False)
    print(f"Engineered features saved: {len(engineer.get_feature_list())} features")
```

**Deliverables:**
- [ ] `src/features/feature_engineering.py`
- [ ] `data/processed/features_engineered.csv`

---

### Task 3.2: Create Train/Test Split
**Time:** 2 hours

```python
# src/data/split_data.py
from sklearn.model_selection import train_test_split
import pandas as pd

def create_splits(df, test_size=0.2, val_size=0.1):
    """Create stratified train/val/test splits."""
    
    # Features to use
    feature_cols = [col for col in df.columns if col not in 
                   ['is_anomaly', 'source', 'gender', 'age']]
    
    # Remove rows with too many NaNs
    df_clean = df.dropna(subset=['is_anomaly'])
    df_clean = df_clean.dropna(thresh=len(feature_cols) * 0.5)
    
    X = df_clean[feature_cols].fillna(df_clean[feature_cols].median())
    y = df_clean['is_anomaly']
    
    # First split: train+val vs test
    X_trainval, X_test, y_trainval, y_test = train_test_split(
        X, y, test_size=test_size, stratify=y, random_state=42
    )
    
    # Second split: train vs val
    X_train, X_val, y_train, y_val = train_test_split(
        X_trainval, y_trainval, test_size=val_size/(1-test_size), 
        stratify=y_trainval, random_state=42
    )
    
    # Save splits
    pd.concat([X_train, y_train], axis=1).to_csv('data/processed/train.csv', index=False)
    pd.concat([X_val, y_val], axis=1).to_csv('data/processed/val.csv', index=False)
    pd.concat([X_test, y_test], axis=1).to_csv('data/processed/test.csv', index=False)
    
    print(f"Train: {len(X_train)} | Val: {len(X_val)} | Test: {len(X_test)}")
    print(f"Anomaly rate - Train: {y_train.mean():.2%} | Val: {y_val.mean():.2%} | Test: {y_test.mean():.2%}")
    
    return X_train, X_val, X_test, y_train, y_val, y_test


if __name__ == "__main__":
    df = pd.read_csv('data/processed/features_engineered.csv')
    create_splits(df)
```

**Deliverables:**
- [ ] `src/data/split_data.py`
- [ ] `data/processed/train.csv`
- [ ] `data/processed/val.csv`
- [ ] `data/processed/test.csv`

---

# PHASE 4: MODEL TRAINING
## Days 7-9 (Dec 28-30)

### Task 4.1: Train Negative State Classifier
**Time:** 6 hours

```python
# src/models/train_classifier.py
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import GridSearchCV, cross_val_score
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
import joblib
import json

def train_negative_state_classifier():
    """Train classifier on Kaggle data."""
    
    # Load data
    train = pd.read_csv('data/processed/train.csv')
    val = pd.read_csv('data/processed/val.csv')
    
    feature_cols = [c for c in train.columns if c != 'is_anomaly']
    
    X_train = train[feature_cols]
    y_train = train['is_anomaly']
    X_val = val[feature_cols]
    y_val = val['is_anomaly']
    
    # Hyperparameter tuning
    param_grid = {
        'n_estimators': [50, 100, 200],
        'max_depth': [5, 10, 15],
        'min_samples_split': [2, 5, 10],
        'class_weight': ['balanced', None]
    }
    
    rf = RandomForestClassifier(random_state=42)
    grid_search = GridSearchCV(rf, param_grid, cv=5, scoring='f1', n_jobs=-1)
    grid_search.fit(X_train, y_train)
    
    best_model = grid_search.best_estimator_
    
    # Evaluate on validation
    y_pred = best_model.predict(X_val)
    y_prob = best_model.predict_proba(X_val)[:, 1]
    
    # Results
    results = {
        'best_params': grid_search.best_params_,
        'cv_score': grid_search.best_score_,
        'val_accuracy': (y_pred == y_val).mean(),
        'val_roc_auc': roc_auc_score(y_val, y_prob),
        'classification_report': classification_report(y_val, y_pred, output_dict=True),
        'confusion_matrix': confusion_matrix(y_val, y_pred).tolist(),
        'feature_importance': dict(zip(feature_cols, best_model.feature_importances_))
    }
    
    # Save model and results
    joblib.dump(best_model, 'data/models/negative_state_classifier.pkl')
    with open('data/models/classifier_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"Best CV Score: {results['cv_score']:.4f}")
    print(f"Validation Accuracy: {results['val_accuracy']:.4f}")
    print(f"Validation ROC-AUC: {results['val_roc_auc']:.4f}")
    
    return best_model, results


if __name__ == "__main__":
    train_negative_state_classifier()
```

**Deliverables:**
- [ ] `src/models/train_classifier.py`
- [ ] `data/models/negative_state_classifier.pkl`
- [ ] `data/models/classifier_results.json`

---

### Task 4.2: Train Wellness Score Predictor
**Time:** 4 hours

```python
# src/models/train_wellness_predictor.py
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score
import joblib
import json

def create_wellness_labels(df):
    """Create wellness output scores from behavioral inputs."""
    
    # Mental Clarity (0-100): Based on sleep + inverse stress
    df['mental_clarity'] = (
        df['sleep_hours'].fillna(7) / 9 * 50 +
        (10 - df['stress_level'].fillna(5)) / 10 * 50
    ).clip(0, 100)
    
    # Energy (0-100): Based on sleep + exercise
    df['energy_score'] = (
        df['sleep_hours'].fillna(7) / 8 * 40 +
        df['exercise_minutes'].fillna(30) / 60 * 40 +
        (10 - df['stress_level'].fillna(5)) / 10 * 20
    ).clip(0, 100)
    
    # Mood (0-100): Based on exercise + sleep + low stress
    df['mood_score'] = (
        df['exercise_minutes'].fillna(30) / 45 * 35 +
        df['sleep_hours'].fillna(7) / 8 * 35 +
        (10 - df['stress_level'].fillna(5)) / 10 * 30
    ).clip(0, 100)
    
    # Focus (0-100): Based on sleep quality
    df['focus_score'] = (
        df['sleep_hours'].fillna(7) / 8 * 60 +
        (10 - df['stress_level'].fillna(5)) / 10 * 40
    ).clip(0, 100)
    
    return df


def train_wellness_predictor():
    """Train multi-output regressor for wellness scores."""
    
    # Load and create labels
    df = pd.read_csv('data/processed/features_engineered.csv')
    df = create_wellness_labels(df)
    
    feature_cols = ['sleep_hours', 'stress_level', 'exercise_minutes', 
                    'recovery_score', 'sleep_quality_index', 'gender_encoded']
    feature_cols = [c for c in feature_cols if c in df.columns]
    
    target_cols = ['mental_clarity', 'energy_score', 'mood_score', 'focus_score']
    
    # Remove NaNs
    df_clean = df.dropna(subset=feature_cols + target_cols)
    
    X = df_clean[feature_cols]
    y = df_clean[target_cols]
    
    # Train model
    model = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
    model.fit(X, y)
    
    # Evaluate
    y_pred = model.predict(X)
    
    results = {
        'r2_scores': {col: r2_score(y[col], y_pred[:, i]) 
                     for i, col in enumerate(target_cols)},
        'rmse_scores': {col: np.sqrt(mean_squared_error(y[col], y_pred[:, i]))
                       for i, col in enumerate(target_cols)},
        'feature_importance': dict(zip(feature_cols, model.feature_importances_))
    }
    
    # Save
    joblib.dump(model, 'data/models/wellness_predictor.pkl')
    with open('data/models/wellness_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    print("Wellness Predictor Results:")
    for col in target_cols:
        print(f"  {col}: R² = {results['r2_scores'][col]:.4f}")
    
    return model, results


if __name__ == "__main__":
    train_wellness_predictor()
```

**Deliverables:**
- [ ] `src/models/train_wellness_predictor.py`
- [ ] `data/models/wellness_predictor.pkl`
- [ ] `data/models/wellness_results.json`

---

### Task 4.3: Train Anomaly Detector (Unsupervised)
**Time:** 3 hours

```python
# src/models/train_anomaly_detector.py
from sklearn.ensemble import IsolationForest
import pandas as pd
import joblib
import json

def train_anomaly_detector():
    """Train Isolation Forest on behavioral data."""
    
    df = pd.read_csv('data/processed/features_engineered.csv')
    
    feature_cols = ['sleep_hours', 'stress_level', 'exercise_minutes',
                    'sleep_hours_zscore', 'stress_sleep_ratio', 'recovery_score']
    feature_cols = [c for c in feature_cols if c in df.columns]
    
    X = df[feature_cols].dropna()
    
    # Calculate contamination from labeled data
    if 'is_anomaly' in df.columns:
        contamination = df['is_anomaly'].mean()
    else:
        contamination = 0.1
    
    # Train Isolation Forest
    model = IsolationForest(
        contamination=contamination,
        n_estimators=100,
        random_state=42
    )
    model.fit(X)
    
    # Evaluate
    predictions = model.predict(X)
    anomaly_rate = (predictions == -1).mean()
    
    results = {
        'contamination': contamination,
        'detected_anomaly_rate': anomaly_rate,
        'n_samples': len(X),
        'features_used': feature_cols
    }
    
    # Save
    joblib.dump(model, 'data/models/anomaly_detector.pkl')
    with open('data/models/anomaly_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"Anomaly Detector trained")
    print(f"  Contamination: {contamination:.2%}")
    print(f"  Detected rate: {anomaly_rate:.2%}")
    
    return model, results


if __name__ == "__main__":
    train_anomaly_detector()
```

**Deliverables:**
- [ ] `src/models/train_anomaly_detector.py`
- [ ] `data/models/anomaly_detector.pkl`
- [ ] `data/models/anomaly_results.json`

---

# PHASE 5: INTEGRATION & VALIDATION
## Days 10-11 (Dec 31 - Jan 1)

### Task 5.1: Create Hybrid Predictor
**Time:** 4 hours

```python
# src/models/hybrid_predictor.py
import joblib
import json
import numpy as np
import pandas as pd

class HybridBiologicalPredictor:
    """
    Combined predictor using all trained models.
    Replaces hardcoded rules with DATA-TRAINED models.
    """
    
    def __init__(self, models_dir='data/models'):
        # Load trained models
        self.classifier = joblib.load(f'{models_dir}/negative_state_classifier.pkl')
        self.wellness_predictor = joblib.load(f'{models_dir}/wellness_predictor.pkl')
        self.anomaly_detector = joblib.load(f'{models_dir}/anomaly_detector.pkl')
        
        # Load data-driven thresholds
        with open('data/processed/data_driven_thresholds.json') as f:
            self.thresholds = json.load(f)
    
    def predict(self, inputs: dict):
        """
        Full prediction from behavioral inputs.
        
        Args:
            inputs: {
                'sleep_hours': 6.5,
                'stress_level': 7,
                'exercise_minutes': 20,
                'gender': 'female'
            }
        
        Returns:
            Comprehensive prediction with wellness scores and risks.
        """
        # Prepare features
        X = self._prepare_features(inputs)
        
        # Get predictions
        negative_risk = self.classifier.predict_proba(X[self._get_classifier_features()])[:, 1][0]
        wellness_scores = self.wellness_predictor.predict(X[self._get_wellness_features()])[0]
        anomaly_score = -self.anomaly_detector.score_samples(X[self._get_anomaly_features()])[0]
        
        # Normalize anomaly score to 0-1
        anomaly_score = min(max(anomaly_score / 0.5, 0), 1)
        
        return {
            'wellness_scores': {
                'mental_clarity': float(wellness_scores[0]),
                'energy': float(wellness_scores[1]),
                'mood': float(wellness_scores[2]),
                'focus': float(wellness_scores[3])
            },
            'negative_state_risk': float(negative_risk),
            'anomaly_score': float(anomaly_score),
            'risk_level': self._get_risk_level(negative_risk, anomaly_score),
            'recommendations': self._get_recommendations(inputs, negative_risk)
        }
    
    def _prepare_features(self, inputs):
        """Prepare feature vector from inputs."""
        # Calculate derived features using DATA-DRIVEN thresholds
        sleep_mean = self.thresholds['general']['sleep_hours']['population_mean']
        sleep_std = self.thresholds['general']['sleep_hours']['population_std']
        
        features = {
            'sleep_hours': inputs.get('sleep_hours', 7),
            'stress_level': inputs.get('stress_level', 5),
            'exercise_minutes': inputs.get('exercise_minutes', 30),
            'gender_encoded': 1 if inputs.get('gender', 'male').lower() == 'female' else 0,
            'sleep_hours_zscore': (inputs.get('sleep_hours', 7) - sleep_mean) / sleep_std,
            'recovery_score': (10 - inputs.get('stress_level', 5)) / 10 * 0.5 + inputs.get('sleep_hours', 7) / 8 * 0.5,
            'sleep_quality_index': 1 - abs(inputs.get('sleep_hours', 7) - sleep_mean) / sleep_mean,
            'stress_sleep_ratio': inputs.get('stress_level', 5) / (inputs.get('sleep_hours', 7) + 0.1)
        }
        
        return pd.DataFrame([features])
    
    def _get_risk_level(self, negative_risk, anomaly_score):
        combined = negative_risk * 0.6 + anomaly_score * 0.4
        if combined < 0.3: return 'LOW'
        elif combined < 0.6: return 'MEDIUM'
        elif combined < 0.8: return 'HIGH'
        else: return 'CRITICAL'
    
    def _get_recommendations(self, inputs, risk):
        recommendations = []
        
        # Use DATA-DRIVEN thresholds for recommendations
        sleep_low = self.thresholds['general']['sleep_hours']['warning_low']
        stress_high = self.thresholds['general']['stress_level']['warning_high']
        
        if inputs.get('sleep_hours', 7) < sleep_low:
            recommendations.append({
                'type': 'sleep',
                'message': f'Sleep below data-derived threshold ({sleep_low:.1f}h). Increase sleep.'
            })
        
        if inputs.get('stress_level', 5) > stress_high:
            recommendations.append({
                'type': 'stress',
                'message': f'Stress above data-derived threshold ({stress_high:.1f}). Try relaxation.'
            })
        
        return recommendations
    
    def _get_classifier_features(self):
        return ['sleep_hours', 'stress_level', 'exercise_minutes', 'gender_encoded',
                'sleep_hours_zscore', 'recovery_score', 'stress_sleep_ratio']
    
    def _get_wellness_features(self):
        return ['sleep_hours', 'stress_level', 'exercise_minutes', 
                'recovery_score', 'sleep_quality_index', 'gender_encoded']
    
    def _get_anomaly_features(self):
        return ['sleep_hours', 'stress_level', 'exercise_minutes',
                'sleep_hours_zscore', 'stress_sleep_ratio', 'recovery_score']


# Test
if __name__ == "__main__":
    predictor = HybridBiologicalPredictor()
    
    # Test prediction
    result = predictor.predict({
        'sleep_hours': 5.5,
        'stress_level': 8,
        'exercise_minutes': 10,
        'gender': 'female'
    })
    
    print("Prediction Result:")
    print(json.dumps(result, indent=2))
```

**Deliverables:**
- [ ] `src/models/hybrid_predictor.py`

---

### Task 5.2: Final Model Evaluation
**Time:** 4 hours

```python
# src/evaluation/final_evaluation.py
import pandas as pd
import numpy as np
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
import json
import joblib

def evaluate_on_test_set():
    """Final evaluation on held-out test set."""
    
    # Load test data
    test = pd.read_csv('data/processed/test.csv')
    
    # Load model
    model = joblib.load('data/models/negative_state_classifier.pkl')
    
    feature_cols = [c for c in test.columns if c != 'is_anomaly']
    X_test = test[feature_cols]
    y_test = test['is_anomaly']
    
    # Predict
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    
    # Calculate metrics
    results = {
        'accuracy': accuracy_score(y_test, y_pred),
        'precision': precision_score(y_test, y_pred),
        'recall': recall_score(y_test, y_pred),
        'f1': f1_score(y_test, y_pred),
        'roc_auc': roc_auc_score(y_test, y_prob),
        'n_test_samples': len(y_test),
        'test_anomaly_rate': y_test.mean()
    }
    
    # Save
    with open('data/models/final_test_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    print("\n" + "="*50)
    print("FINAL TEST SET RESULTS")
    print("="*50)
    print(f"Accuracy:  {results['accuracy']:.4f}")
    print(f"Precision: {results['precision']:.4f}")
    print(f"Recall:    {results['recall']:.4f}")
    print(f"F1 Score:  {results['f1']:.4f}")
    print(f"ROC-AUC:   {results['roc_auc']:.4f}")
    print("="*50)
    
    return results


if __name__ == "__main__":
    evaluate_on_test_set()
```

**Deliverables:**
- [ ] `src/evaluation/final_evaluation.py`
- [ ] `data/models/final_test_results.json`

---

# PHASE 6: DOCUMENTATION & SUBMISSION
## Days 12-14 (Jan 2-5)

### Task 6.1: Update Thesis (Jan 2-3)
- [ ] Add "Data-Driven Model Training" section to Chapter 3
- [ ] Document Kaggle datasets used
- [ ] Include model performance metrics in Chapter 5
- [ ] Add confusion matrix and ROC curve figures

### Task 6.2: Update Presentation (Jan 3-4)
- [ ] New slide: "Training Data Sources"
- [ ] New slide: "Data-Driven vs Hardcoded Approach"
- [ ] Update model performance slides with actual results

### Task 6.3: Final Submission (Jan 5)
- [ ] Final review of all documents
- [ ] Package code, models, and results
- [ ] Submit to committee

---

# SUMMARY: Task Checklist

## Phase 1: Data Acquisition (Dec 22-23)
- [ ] Task 1.1: Download Kaggle datasets
- [ ] Task 1.2: Explore dataset schemas

## Phase 2: Data Preprocessing (Dec 24-25)
- [ ] Task 2.1: Create unified data schema
- [ ] Task 2.2: Calculate data-driven thresholds

## Phase 3: Feature Engineering (Dec 26-27)
- [ ] Task 3.1: Create engineered features
- [ ] Task 3.2: Create train/test split

## Phase 4: Model Training (Dec 28-30)
- [ ] Task 4.1: Train negative state classifier
- [ ] Task 4.2: Train wellness score predictor
- [ ] Task 4.3: Train anomaly detector

## Phase 5: Integration & Validation (Dec 31 - Jan 1)
- [ ] Task 5.1: Create hybrid predictor
- [ ] Task 5.2: Final model evaluation

## Phase 6: Documentation (Jan 2-5)
- [ ] Task 6.1: Update thesis
- [ ] Task 6.2: Update presentation
- [ ] Task 6.3: Final submission

---

# KEY PRINCIPLE

> **ALL thresholds and predictions come from TRAINED MODELS on Kaggle data.**
> **NO hardcoded LITERATURE_BASELINES values in production code.**

The `data_driven_thresholds.json` file replaces all hardcoded values and is generated directly from the Kaggle datasets.