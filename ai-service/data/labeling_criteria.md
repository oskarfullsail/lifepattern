# LifePattern AI - Anomaly Labeling Criteria

## Document Purpose

This document defines the ground truth labeling criteria used to classify daily routine logs as "anomalous" or "normal" for training the LifePattern AI anomaly detection models.

**Created:** December 24, 2024  
**Author:** Oskar Sanchez-Chagollan  
**Thesis:** LifePattern AI - Behavioral Anomaly Detection System

---

## Overview

The labeling strategy uses a **multi-criteria approach** where a routine log is labeled as an anomaly if **ANY** of the following conditions are met:

1. **Z-Score Threshold Violation** - Any behavioral metric deviates significantly from the user's baseline
2. **Health Score Drop** - Overall daily wellness score drops significantly from the 7-day rolling average
3. **AI Service Confirmation** - The original AI service flagged the log as anomalous during real-time analysis

This approach balances:
- **Statistical rigor** (z-scores, rolling averages)
- **Personalization** (per-user baselines)
- **Historical validation** (using AI service predictions as soft labels)

---

## Labeling Criteria Details

### Criterion 1: Z-Score Anomalies

**Threshold:** |z-score| > 2.0

**Metrics Analyzed:**
| Metric | Description | Normal Range (typical) |
|--------|-------------|----------------------|
| `sleep_hours` | Total hours of sleep | 6-9 hours |
| `screen_time` | Hours spent on screens | 2-8 hours |
| `exercise_duration` | Hours of physical activity | 0-2 hours |
| `water_intake` | Liters of water consumed | 1.5-3.5 liters |
| `stress_level` | Self-reported stress (1-10) | 2-6 |

**Calculation Method:**
- Z-scores are computed **per-user** to establish individual baselines
- For users with <7 data points, global population z-scores are used as fallback
- Formula: `z = (x - μ_user) / σ_user`

**Rationale:**
- A z-score of 2.0 corresponds to approximately the 97.5th percentile
- This captures days that are statistically unusual for that specific user
- Per-user calculation respects individual differences (e.g., some people naturally sleep less)

---

### Criterion 2: Health Score Drop

**Threshold:** >20% drop from 7-day rolling average

**Health Score Calculation (0-100):**

```python
def compute_health_score(row):
    score = 0
    
    # Sleep component (25 points max)
    # 7-9 hours = 25, 6-7 or 9-10 = 20, 5-6 or 10-11 = 10, else = 5
    
    # Exercise component (25 points max)
    # 1+ hours = 25, 0.5-1 = 20, 0.25-0.5 = 15, 0-0.25 = 10, 0 = 5
    
    # Screen time component (25 points max)
    # <2 hours = 25, 2-4 = 20, 4-6 = 15, 6-8 = 10, 8+ = 5
    
    # Stress component (25 points max)
    # 1-2 = 25, 3-4 = 20, 5-6 = 15, 7-8 = 10, 9-10 = 5
    
    return score
```

**Calculation Method:**
- 7-day rolling average is computed per-user
- Deviation = `(today_score - rolling_avg) / rolling_avg`
- Anomaly if deviation < -0.20 (i.e., 20% drop)

**Rationale:**
- Captures overall wellness deterioration that may not show in individual metrics
- 7-day window provides stable baseline while being responsive to recent patterns
- 20% threshold is clinically meaningful (substantial quality-of-life change)

---

### Criterion 3: AI Service Flag

**Threshold:** `is_anomaly == true` from original AI analysis

**Source:** Real-time analysis performed when user submitted the routine log

**Components:**
- Random Forest classifier prediction
- Isolation Forest unsupervised detection
- Rule-based behavioral checks

**Rationale:**
- Provides continuity with existing system predictions
- Acts as "soft labels" from domain-specific model
- Captures complex patterns not in simple z-score analysis

---

## Label Distribution Expectations

Based on the labeling criteria, we expect:

| Metric | Expected Range |
|--------|---------------|
| Overall anomaly rate | 10-20% |
| Z-score anomalies | 5-10% |
| Health drop anomalies | 3-8% |
| AI service anomalies | 5-15% |

**Note:** Categories overlap - a single log may trigger multiple criteria.

---

## Data Quality Considerations

### Handling Missing Data

| Scenario | Handling |
|----------|----------|
| Missing metric value | Skip that metric's z-score, use available metrics |
| Missing >50% of metrics | Exclude log from training data |
| New user (<7 logs) | Use global baselines, flag as "cold start" |

### Outlier Treatment

- Extreme outliers (z > 5) are capped at 5 to prevent training instability
- Data entry errors (e.g., sleep_hours > 24) are corrected or excluded

### User Consent

- All data used for training was collected with user consent
- User IDs are anonymized (UUIDs) with no personally identifiable information
- Users can request data deletion at any time

---

## Validation Against Literature

The thresholds are validated against established health guidelines:

| Metric | Literature Source | Recommended Range |
|--------|-------------------|-------------------|
| Sleep | CDC, National Sleep Foundation | 7-9 hours adults |
| Exercise | WHO, AHA | 150+ min/week moderate |
| Screen time | AAP (adapted for adults) | <2 hours leisure |
| Stress | Cohen Perceived Stress Scale | <13 low stress |
| Hydration | EFSA, IOM | 2.0-2.5 L/day |

---

## Implementation

The labeling is implemented in `scripts/export_and_label_data.py`:

```bash
# Export from API and label
python scripts/export_and_label_data.py \
    --api-url https://lifepattern-backend.onrender.com \
    --token YOUR_JWT_TOKEN \
    --output data/

# Or from local CSV
python scripts/export_and_label_data.py \
    --input-csv data/routine_logs_export.csv \
    --output data/
```

**Output Files:**
- `labeled_dataset.csv` - Full labeled dataset
- `train.csv` - Training set (70%)
- `val.csv` - Validation set (15%)
- `test.csv` - Test set (15%)
- `labeling_stats.json` - Statistics and metadata

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-12-24 | Initial labeling criteria |

---

## References

1. CDC. "How Much Sleep Do I Need?" https://www.cdc.gov/sleep/about_sleep/how_much_sleep.html
2. WHO. "Physical Activity Guidelines" https://www.who.int/news-room/fact-sheets/detail/physical-activity
3. Cohen, S. (1988). Perceived Stress Scale.
4. EFSA. "Scientific Opinion on Dietary Reference Values for water" (2010).

