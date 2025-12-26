# LifePattern AI: Task Tracker
## Data-Driven Training Implementation

**Start Date:** December 22, 2024
**Deadline:** January 5, 2026

---

## KAGGLE DATASETS TO DOWNLOAD

| Dataset | Download Command | Rows | Has Labels? |
|---------|------------------|------|-------------|
| Sleep Health & Lifestyle | `kaggle datasets download -d uom190346a/sleep-health-and-lifestyle-dataset` | 374 | ✅ Sleep Disorder |
| Lifestyle & Wellbeing | `kaggle datasets download -d ydalat/lifestyle-and-wellbeing-data` | 12,757 | ✅ Wellness Score |
| FitBit Fitness | `kaggle datasets download -d arashnic/fitbit` | 940 | ❌ Derive from activity |
| SWELL HRV | `kaggle datasets download -d qiriro/swell-heart-rate-variability-hrv` | 1,000+ | ✅ Stress Condition |

---

## TASK TRACKER

### PHASE 1: DATA ACQUISITION
| # | Task | Date | Time | Status | Output File |
|---|------|------|------|--------|-------------|
| 1.1 | Download all Kaggle datasets | Dec 22 | 2h | ⬜ | `data/raw/*.csv` |
| 1.2 | Explore and document schemas | Dec 23 | 3h | ⬜ | `docs/dataset_schemas.md` |

### PHASE 2: DATA PREPROCESSING  
| # | Task | Date | Time | Status | Output File |
|---|------|------|------|--------|-------------|
| 2.1 | Create unified dataset | Dec 24 | 4h | ⬜ | `data/processed/unified_dataset.csv` |
| 2.2 | Calculate data-driven thresholds | Dec 25 | 3h | ⬜ | `data/processed/data_driven_thresholds.json` |

### PHASE 3: FEATURE ENGINEERING
| # | Task | Date | Time | Status | Output File |
|---|------|------|------|--------|-------------|
| 3.1 | Engineer features | Dec 26 | 4h | ⬜ | `data/processed/features_engineered.csv` |
| 3.2 | Create train/val/test splits | Dec 27 | 2h | ⬜ | `data/processed/train.csv`, `val.csv`, `test.csv` |

### PHASE 4: MODEL TRAINING
| # | Task | Date | Time | Status | Output File |
|---|------|------|------|--------|-------------|
| 4.1 | Train negative state classifier | Dec 28-29 | 6h | ⬜ | `data/models/negative_state_classifier.pkl` |
| 4.2 | Train wellness predictor | Dec 29-30 | 4h | ⬜ | `data/models/wellness_predictor.pkl` |
| 4.3 | Train anomaly detector | Dec 30 | 3h | ⬜ | `data/models/anomaly_detector.pkl` |

### PHASE 5: INTEGRATION & VALIDATION
| # | Task | Date | Time | Status | Output File |
|---|------|------|------|--------|-------------|
| 5.1 | Create hybrid predictor | Dec 31 | 4h | ⬜ | `src/models/hybrid_predictor.py` |
| 5.2 | Final evaluation on test set | Jan 1 | 4h | ⬜ | `data/models/final_test_results.json` |

### PHASE 6: DOCUMENTATION
| # | Task | Date | Time | Status | Output File |
|---|------|------|------|--------|-------------|
| 6.1 | Update thesis Chapter 3 & 5 | Jan 2-3 | 8h | ⬜ | `thesis_revised.docx` |
| 6.2 | Update presentation slides | Jan 3-4 | 6h | ⬜ | `presentation_revised.pptx` |
| 6.3 | Final review & submission | Jan 5 | 4h | ⬜ | All deliverables |

---

## FILES TO CREATE

### Source Code
```
src/
├── data/
│   ├── preprocessing.py          # Task 2.1
│   ├── threshold_calculator.py   # Task 2.2
│   └── split_data.py            # Task 3.2
├── features/
│   └── feature_engineering.py    # Task 3.1
├── models/
│   ├── train_classifier.py       # Task 4.1
│   ├── train_wellness_predictor.py # Task 4.2
│   ├── train_anomaly_detector.py # Task 4.3
│   └── hybrid_predictor.py       # Task 5.1
└── evaluation/
    └── final_evaluation.py       # Task 5.2
```

### Data Files
```
data/
├── raw/                          # Kaggle downloads
│   ├── Sleep_health_and_lifestyle_dataset.csv
│   ├── Wellbeing_and_lifestyle_data_Kaggle.csv
│   ├── fitbit/
│   └── swell_hrv.csv
├── processed/
│   ├── unified_dataset.csv       # Combined data
│   ├── data_driven_thresholds.json # REPLACES hardcoded values!
│   ├── features_engineered.csv
│   ├── train.csv
│   ├── val.csv
│   └── test.csv
└── models/
    ├── negative_state_classifier.pkl
    ├── wellness_predictor.pkl
    ├── anomaly_detector.pkl
    └── final_test_results.json
```

---

## KEY CHANGES FROM CURRENT CODE

### BEFORE (Hardcoded):
```python
LITERATURE_BASELINES = {
    'sleep_hours': {
        'optimal_min': 7.0,      # Hardcoded!
        'optimal_max': 9.0,      # Hardcoded!
        'population_mean': 7.5,  # Hardcoded!
        'population_std': 1.2    # Hardcoded!
    },
    ...
}
```

### AFTER (Data-Driven):
```python
# Load from trained data
with open('data/processed/data_driven_thresholds.json') as f:
    THRESHOLDS = json.load(f)

# Values come FROM Kaggle data:
# sleep_hours.optimal_min = data.quantile(0.25)
# sleep_hours.population_mean = data.mean()
# etc.
```

---

## COMMITTEE REQUIREMENTS MAPPING

| Committee Requirement | How This Plan Addresses It |
|-----------------------|---------------------------|
| "Document how ML model was trained" | Tasks 4.1-4.3: Full training pipeline with Kaggle data |
| "Move beyond threshold-based approach" | Task 2.2: Thresholds calculated FROM data, not hardcoded |
| "Leverage collected user data" | Task 2.1: Combine multiple datasets including real user data |
| "Analysis aligned with hypothesis" | Task 5.2: Statistical validation on test set |

---

## DAILY SCHEDULE

| Date | Day | Focus | Tasks |
|------|-----|-------|-------|
| Dec 22 | Sun | Data Download | 1.1 |
| Dec 23 | Mon | Data Exploration | 1.2 |
| Dec 24 | Tue | Preprocessing | 2.1 |
| Dec 25 | Wed | Thresholds | 2.2 |
| Dec 26 | Thu | Features | 3.1 |
| Dec 27 | Fri | Data Split | 3.2 |
| Dec 28 | Sat | Training | 4.1 (part 1) |
| Dec 29 | Sun | Training | 4.1 (part 2), 4.2 |
| Dec 30 | Mon | Training | 4.3 |
| Dec 31 | Tue | Integration | 5.1 |
| Jan 1 | Wed | Validation | 5.2 |
| Jan 2 | Thu | Thesis | 6.1 |
| Jan 3 | Fri | Thesis + Slides | 6.1, 6.2 |
| Jan 4 | Sat | Slides | 6.2 |
| Jan 5 | Sun | **SUBMIT** | 6.3 |

---

## SUCCESS CRITERIA

✅ All thresholds loaded from `data_driven_thresholds.json` (not hardcoded)
✅ Models trained on 10,000+ data points from Kaggle
✅ Test set accuracy ≥ 80%
✅ Gender-specific analysis included
✅ Thesis documents training methodology
✅ Presentation shows data sources and results