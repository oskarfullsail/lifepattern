# Dataset Directory for Training Population Baselines

This directory holds health/behavioral datasets used to train data-driven anomaly detection thresholds for LifePattern AI.

## Purpose

Instead of using hardcoded thresholds from literature alone, we can train population baselines from real-world health data. This provides:

1. **Empirically-derived thresholds** based on actual wearable device data
2. **Better distribution modeling** (percentiles, IQR) vs. simple mean/std
3. **Pre-trained Isolation Forest** for multivariate anomaly detection
4. **Academic defensibility** - thresholds derived from published datasets

## Recommended Datasets

### 1. FitBit Fitness Tracker Data (Primary)

**Source**: [Kaggle - FitBit Fitness Tracker Data](https://www.kaggle.com/datasets/arashnic/fitbit)

**Contains**:
- Daily activity (steps, distance, calories)
- Sleep duration and quality
- Heart rate (second-level)
- 30 users over 2 months

**Download**:
```bash
# Using Kaggle API
kaggle datasets download -d arashnic/fitbit
unzip fitbit.zip -d data/fitbit/
```

**Expected files**:
- `dailyActivity_merged.csv` → Use with `--types fitbit`
- `sleepDay_merged.csv` → Use with `--types fitbit_sleep`
- `heartrate_seconds_merged.csv` → Use with `--types fitbit_heart`

### 2. PPG-DaLiA (Stress & Activity)

**Source**: [UCI ML Repository - PPG-DaLiA](https://archive.ics.uci.edu/ml/datasets/PPG-DaLiA)

**Contains**:
- Heart rate from PPG sensors
- Activity levels
- Stress indicators
- 15 subjects in daily life scenarios

**Download**: Manual from UCI, requires registration

**Use with**: `--types ppg_dalia`

### 3. Sleep-EDF Database

**Source**: [PhysioNet - Sleep-EDF](https://physionet.org/content/sleep-edfx/1.0.0/)

**Contains**:
- Polysomnography recordings
- Sleep stage annotations
- 78 subjects (healthy + mild sleep issues)

**Use with**: `--types sleep_edf`

### 4. WESAD (Stress Detection)

**Source**: [UCI ML Repository - WESAD](https://archive.ics.uci.edu/ml/datasets/WESAD)

**Contains**:
- Heart rate and HRV
- Skin conductance (stress indicator)
- Labeled stress/calm states
- 15 subjects

**Use with**: `--types wesad`

## Training Pipeline

### Quick Start (Synthetic Data)

Generate sample data and train baselines without external datasets:

```bash
cd ai-service
python scripts/train_from_datasets.py --generate-sample --output pretrained/
```

### Training from Real Datasets

1. Download datasets (see above)
2. Place in `data/` directory
3. Run training:

```bash
# Single dataset
python scripts/train_from_datasets.py \
    --datasets data/fitbit/dailyActivity_merged.csv \
    --types fitbit \
    --output pretrained/ \
    --validate

# Multiple datasets
python scripts/train_from_datasets.py \
    --datasets data/fitbit/dailyActivity_merged.csv \
               data/fitbit/sleepDay_merged.csv \
    --types fitbit fitbit_sleep \
    --output pretrained/ \
    --compare-report pretrained/comparison.json
```

### Training Options

| Option | Description |
|--------|-------------|
| `--threshold-method` | `iqr` (default), `percentile`, or `zscore` |
| `--contamination` | Isolation Forest anomaly rate (default: 0.1) |
| `--n-estimators` | Number of trees (default: 100) |
| `--validate` | Compare against literature baselines |

## Output Files

After training, the `pretrained/` directory will contain:

| File | Description |
|------|-------------|
| `baselines.json` | Population statistics per metric |
| `isolation_forest.pkl` | Trained Isolation Forest model |
| `training_report.json` | Training metadata and validation |

## Configuration

Set the threshold mode in `config.py` or via environment variables:

```bash
# Use pretrained baselines
export THRESHOLD_MODE=pretrained

# Or hybrid mode (pretrained + literature fallback)
export THRESHOLD_MODE=hybrid

# Custom paths
export PRETRAINED_BASELINES_PATH=pretrained/baselines.json
export PRETRAINED_MODEL_PATH=pretrained/isolation_forest.pkl
```

## Expected Column Mappings

### FitBit Daily Activity
```
TotalSteps → steps
Calories → active_energy
VeryActiveMinutes + FairlyActiveMinutes → exercise_duration (hours)
```

### FitBit Sleep
```
TotalMinutesAsleep → sleep_hours (converted)
TotalTimeInBed → sleep_quality (efficiency %)
```

### Custom Datasets

Use the unified schema directly or provide a custom mapping:

```python
from utils.dataset_loader import DatasetLoader

loader = DatasetLoader()
df = loader.load_dataset("my_data.csv", dataset_type="custom")
df_unified = loader.to_unified_schema(df, custom_mapping={
    'my_sleep_column': 'sleep_hours',
    'my_steps_column': 'steps',
    # ... etc
})
```

## Unified Schema

All datasets are converted to this common schema:

| Column | Type | Description |
|--------|------|-------------|
| `sleep_hours` | float | Total sleep duration |
| `sleep_quality` | float | Sleep efficiency (0-100) |
| `steps` | int | Daily step count |
| `heart_rate` | float | Average heart rate |
| `heart_rate_resting` | float | Resting heart rate |
| `heart_rate_variability` | float | HRV (RMSSD in ms) |
| `exercise_duration` | float | Active time (hours) |
| `active_energy` | float | Calories burned |
| `stress_level` | float | Stress indicator (1-10) |
| `water_intake` | float | Water consumed (liters) |
| `date` | date | Date of record |
| `user_id` | str | User identifier |
| `source_dataset` | str | Source dataset name |

## Thesis Implications

This training pipeline enables hypothesis testing for the thesis:

**H2**: Data-driven adaptive thresholds achieve higher anomaly detection precision than fixed literature-based thresholds.

Compare results:
1. Train baselines from FitBit data
2. Run detection on holdout test set
3. Compare precision/recall vs. literature-only mode
4. Document improvement in detection accuracy

## Notes

- Large datasets (>100MB) are gitignored
- Heart rate data may need aggregation to daily level
- Some datasets require preprocessing (see training script)
- For thesis, document which datasets were used and why

