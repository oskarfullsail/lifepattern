# LifePattern AI Thesis Revision Plan
## Submission Deadline: January 5, 2026

---

## Executive Summary

The committee has conditionally passed the defense with required revisions in 4 key areas:
1. **Model Training Methodology** - Document AI training process, not just rules/thresholds
2. **Use of Collected User Data** - Leverage 856 logs to retrain/fine-tune models
3. **Analysis Aligned with Hypothesis** - Stronger analytical validation beyond usability
4. **Documentation Updates** - Revise thesis and presentation

**Timeline: 14 days (December 22, 2024 → January 5, 2025)**

---

## Phase 1: Data Preparation & Model Retraining (Dec 22-26)
### 5 Days

### Task 1.1: Data Labeling (Dec 22-23)
**Objective:** Create ground truth labels from collected user data

| Action Item | Details | Deliverable |
|-------------|---------|-------------|
| Export all 856 daily logs from PostgreSQL | Include all behavioral metrics | `user_logs_export.csv` |
| Create labeling criteria | Define what constitutes an "anomaly" based on user feedback and z-scores | `labeling_criteria.md` |
| Label anomalies using multiple methods | 1) User self-reported events, 2) Z-score threshold (|z| > 2), 3) Week-over-week deviation | `labeled_dataset.csv` |
| Split data | 70% training, 15% validation, 15% test | Train/val/test sets |

**Labeling Strategy:**
```
Anomaly = TRUE if ANY of:
  - User reported "unusual day" in feedback
  - Any metric z-score > 2.0 or < -2.0
  - Daily health score dropped >20% from 7-day rolling average
  - User confirmed drift alert was accurate
```

### Task 1.2: Model Training Documentation (Dec 23-24)
**Objective:** Clearly document the AI training methodology

| Component | Current State | Required Revision |
|-----------|---------------|-------------------|
| Random Forest | Pre-configured parameters | Document training on labeled user data |
| Isolation Forest | Fixed contamination=0.1 | Tune contamination based on actual anomaly rate |
| Feature Engineering | 11 features defined | Document feature importance analysis |
| Baseline Calculation | 7-day rolling average | Document personalization algorithm |

**New Documentation Sections:**
1. **Training Pipeline Architecture**
   - Data preprocessing steps
   - Feature scaling methodology
   - Cross-validation strategy (k=5)
   - Hyperparameter tuning process

2. **Model Selection Justification**
   - Why Random Forest + Isolation Forest hybrid
   - Comparison with alternative approaches (tested)
   - Performance metrics on validation set

3. **Personalization Mechanism**
   - How individual baselines are calculated
   - Adaptation rate for new users (cold start → personalized)
   - Continuous learning approach

### Task 1.3: Model Retraining & Fine-tuning (Dec 24-26)
**Objective:** Retrain models using labeled user data

| Model | Training Approach | Expected Improvement |
|-------|-------------------|---------------------|
| Random Forest | Train on labeled anomalies from 856 logs | Improve from 61% → target 70%+ |
| Isolation Forest | Tune contamination parameter based on actual anomaly rate | Reduce false positives |
| Ensemble | Optimize voting/weighting between models | Combined accuracy 87% → 90%+ |

**Code Tasks:**
```python
# 1. Load and preprocess labeled data
# 2. Feature engineering with importance analysis
# 3. Hyperparameter tuning with GridSearchCV
# 4. Cross-validation (5-fold)
# 5. Train final models on full training set
# 6. Evaluate on held-out test set
# 7. Document all metrics and confusion matrices
```

**Deliverables:**
- `model_training_notebook.ipynb` - Full training pipeline
- `hyperparameter_tuning_results.csv` - All tested configurations
- `model_performance_report.md` - Accuracy, precision, recall, F1
- Trained model files (`.pkl`)

---

## Phase 2: Enhanced Analysis (Dec 27-30)
### 4 Days

### Task 2.1: Statistical Analysis Beyond Usability (Dec 27-28)
**Objective:** Provide analytical validation of hypotheses

| Hypothesis | Current Evidence | Required Enhancement |
|------------|------------------|---------------------|
| H1a: 85% accuracy | 87.3% reported | Confusion matrix, precision/recall, ROC-AUC curve |
| H1b: NASA-TLX < 50 | 42.6 average | Statistical significance test (t-test vs threshold) |
| H1c: 70% awareness | 73% reported | Chi-square test, confidence intervals |

**New Analyses to Add:**

1. **Model Performance Analysis**
   - Confusion matrix with TP, TN, FP, FN
   - Precision, Recall, F1-score for each model
   - ROC curve and AUC score
   - Precision-Recall curve (better for imbalanced data)

2. **Comparative Analysis**
   - Before/after personalization accuracy
   - Fixed threshold vs personalized baseline comparison
   - Statistical significance (paired t-test)

3. **User Behavior Analysis**
   - Correlation between engagement and detection accuracy
   - Time-series analysis of behavioral patterns
   - Clustering of user types

4. **Hypothesis Testing**
   ```
   H1a: One-sample t-test (accuracy vs 0.85)
   H1b: One-sample t-test (NASA-TLX vs 50)
   H1c: One-proportion z-test (awareness vs 0.70)
   
   Report: t-statistic, p-value, confidence interval, effect size (Cohen's d)
   ```

### Task 2.2: Personalization Impact Analysis (Dec 28-29)
**Objective:** Demonstrate how user data improves model performance

| Analysis | Method | Expected Finding |
|----------|--------|------------------|
| Cold start vs personalized | Compare accuracy days 1-3 vs days 15-21 | Accuracy improves with more data |
| Individual variation | Show z-score distributions per user | Users have different "normal" ranges |
| Adaptation effectiveness | Track baseline evolution over time | Baselines converge to true patterns |

**Visualizations to Create:**
1. Learning curve: Accuracy vs number of user logs
2. Per-user baseline evolution over 3 weeks
3. Feature importance ranking from Random Forest
4. t-SNE/UMAP clustering of user behavioral patterns

### Task 2.3: Results Validation (Dec 29-30)
**Objective:** Validate results with rigorous methodology

| Validation Type | Approach |
|-----------------|----------|
| Cross-validation | 5-fold CV with stratified sampling |
| Leave-one-user-out | Train on 29 users, test on 1 (repeat for all) |
| Temporal validation | Train on weeks 1-2, test on week 3 |
| Bootstrap confidence intervals | 1000 iterations for accuracy estimates |

---

## Phase 3: Thesis Document Revision (Dec 31 - Jan 2)
### 3 Days

### Task 3.1: Chapter Revisions

| Chapter | Required Changes |
|---------|------------------|
| **Chapter 3: Methodology** | Add detailed ML training methodology section |
| **Chapter 4: Implementation** | Document model training pipeline, hyperparameters |
| **Chapter 5: Results** | Add statistical analysis, confusion matrices, significance tests |
| **Chapter 6: Discussion** | Address how user data improved personalization |

### Task 3.2: New Sections to Add

**3.X Model Training Methodology (NEW)**
```
3.X.1 Data Preparation and Labeling
3.X.2 Feature Engineering and Selection
3.X.3 Model Architecture and Hyperparameters
3.X.4 Training Pipeline
3.X.5 Validation Strategy
3.X.6 Personalization Mechanism
```

**5.X Enhanced Results Analysis (NEW)**
```
5.X.1 Model Performance Metrics
  - Confusion Matrix
  - Precision, Recall, F1-Score
  - ROC-AUC Analysis
5.X.2 Statistical Hypothesis Testing
  - H1a: Accuracy significance test
  - H1b: Workload significance test  
  - H1c: Awareness significance test
5.X.3 Personalization Impact
  - Before/after comparison
  - Learning curve analysis
5.X.4 Comparative Analysis
  - vs Fixed threshold baseline
  - vs Industry benchmarks
```

### Task 3.3: Figures and Tables to Add

| Figure/Table | Description |
|--------------|-------------|
| Fig X.1 | Model training pipeline flowchart |
| Fig X.2 | Confusion matrix heatmap |
| Fig X.3 | ROC curve comparison |
| Fig X.4 | Feature importance bar chart |
| Fig X.5 | Learning curve (accuracy vs data points) |
| Fig X.6 | Per-user baseline evolution |
| Table X.1 | Hyperparameter configurations tested |
| Table X.2 | Cross-validation results |
| Table X.3 | Statistical test results (t, p, CI, d) |

---

## Phase 4: Presentation Update (Jan 2-3)
### 2 Days

### Task 4.1: Slides to Revise

| Slide | Current Content | Revision |
|-------|-----------------|----------|
| **Slide 16: DriftDetector** | Basic ML description | Add training methodology, labeled data usage |
| **Slide 7: Results** | Summary metrics only | Add statistical significance, confidence intervals |
| **NEW Slide: Model Training** | N/A | Training pipeline, hyperparameters, validation |
| **NEW Slide: Data-Driven Personalization** | N/A | How user data improves model |
| **NEW Slide: Statistical Analysis** | N/A | Confusion matrix, ROC, hypothesis tests |

### Task 4.2: New Slides to Create

**Slide: Model Training Pipeline**
- Data labeling methodology
- Training/validation/test split
- Cross-validation approach
- Hyperparameter tuning results

**Slide: Personalization Through User Data**
- Cold start → personalized transition
- Learning curve showing improvement
- Individual baseline examples

**Slide: Statistical Validation**
- Confusion matrix visual
- ROC-AUC curve
- Hypothesis test results with p-values
- Confidence intervals

---

## Phase 5: Final Review & Submission (Jan 3-5)
### 2 Days

### Task 5.1: Quality Checklist

| Item | Check |
|------|-------|
| All committee feedback items addressed | ☐ |
| Model training methodology clearly documented | ☐ |
| User data leveraged for model improvement | ☐ |
| Statistical analysis validates all hypotheses | ☐ |
| Thesis document updated with new sections | ☐ |
| Presentation reflects all changes | ☐ |
| All figures/tables properly labeled | ☐ |
| References updated for new citations | ☐ |
| Proofread for grammar/spelling | ☐ |

### Task 5.2: Submission Package

| Deliverable | Format | Status |
|-------------|--------|--------|
| Revised Thesis Document | PDF + DOCX | ☐ |
| Updated Defense Presentation | PPTX | ☐ |
| Supplementary Materials | ZIP | ☐ |
| - Model training notebook | .ipynb | ☐ |
| - Labeled dataset (anonymized) | .csv | ☐ |
| - Statistical analysis scripts | .py | ☐ |

---

## Daily Schedule

| Date | Day | Focus Area | Key Deliverables |
|------|-----|------------|------------------|
| Dec 22 | Sun | Data export & labeling | labeled_dataset.csv |
| Dec 23 | Mon | Labeling + Training docs | labeling_criteria.md |
| Dec 24 | Tue | Model retraining | Training notebook started |
| Dec 25 | Wed | Model retraining | Hyperparameter tuning |
| Dec 26 | Thu | Model evaluation | model_performance_report.md |
| Dec 27 | Fri | Statistical analysis | Confusion matrices, ROC |
| Dec 28 | Sat | Statistical analysis | Hypothesis tests |
| Dec 29 | Sun | Personalization analysis | Learning curves, visualizations |
| Dec 30 | Mon | Results validation | Cross-validation complete |
| Dec 31 | Tue | Thesis revision | Chapter 3 & 4 updates |
| Jan 1 | Wed | Thesis revision | Chapter 5 & 6 updates |
| Jan 2 | Thu | Thesis + Presentation | New thesis sections, slides |
| Jan 3 | Fri | Presentation finalization | All slides complete |
| Jan 4 | Sat | Final review | Quality checklist |
| Jan 5 | Sun | **SUBMISSION** | All deliverables submitted |

---

## Optional Enhancement: HRV Integration

If time permits (after core requirements met):

| Task | Effort | Benefit |
|------|--------|---------|
| Research HRV-stress correlation | 2 hours | Literature support |
| Design HRV data collection | 2 hours | Apple Watch/Fitbit integration |
| Implement stress mapping algorithm | 4 hours | HRV → stress level conversion |
| Add to anomaly detection | 4 hours | Additional feature for ML |
| Document in thesis | 2 hours | Enhanced contribution |

**Note:** This is NOT required for full pass. Only pursue if core requirements are completed by Jan 2.

---

## Risk Mitigation

| Risk | Mitigation Strategy |
|------|---------------------|
| Insufficient labeled data | Use semi-supervised labeling with z-score thresholds |
| Model accuracy doesn't improve | Document the attempt and analysis; focus on methodology clarity |
| Time constraints | Prioritize required items over optional HRV |
| Technical issues | Have backup of all data and code daily |

---

## Success Criteria

The revision will be considered complete when:

1. ✓ Model training methodology is documented with:
   - Training pipeline diagram
   - Hyperparameter choices justified
   - Validation strategy explained

2. ✓ User data is demonstrably used to:
   - Label anomalies
   - Train/fine-tune models
   - Show personalization improvement

3. ✓ Statistical analysis includes:
   - Confusion matrix with precision/recall/F1
   - ROC-AUC analysis
   - Significance tests for all 3 hypotheses
   - Confidence intervals

4. ✓ Documentation updated:
   - Thesis has new methodology and analysis sections
   - Presentation includes training and statistical slides

---

## Contact & Support

- **Advisor:** Dr. Darren Harmon
- **Committee:** Dr. Sandra Blanke, Dr. Faruk Yildiz
- **Questions:** Reach out immediately if blocked on any item

**Remember:** The committee praised your technical skills and system development. These revisions are about documentation and validation clarity, not rebuilding the system.

---

*Plan created: December 22, 2024*
*Target submission: January 5, 2026*


┌────────────────────────────────────────────────────────────────────────────┐
│                         TRAINING PHASE (Offline)                          │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  1. PUBLIC DATASETS (FitBit, PPG-DaLiA)                                   │
│     └── train_from_datasets.py                                            │
│         └── OUTPUT: pretrained/baselines.json (population statistics)     │
│         └── OUTPUT: pretrained/isolation_forest.pkl (pretrained model)    │
│                                                                            │
│  2. USER DATA (856 logs from PostgreSQL)                                  │
│     └── export_and_label_data.py                                          │
│         └── Uses pretrained baselines to detect anomalies                 │
│         └── Labels using 4 criteria (threshold, zscore, health_drop, AI)  │
│         └── OUTPUT: labeled_dataset.csv, train/val/test splits            │
│                                                                            │
│  3. MODEL TRAINING                                                        │
│     └── train_models_from_labeled_data.py                                 │
│         └── Trains RandomForestClassifier on labeled data                 │
│         └── Trains IsolationForest for unsupervised backup                │
│         └── OUTPUT: models/anomaly_model.joblib                           │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                       RUNTIME (When User Logs Data)                        │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  User submits daily routine log                                            │
│              │                                                             │
│              ▼                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │                         main.py /predict                           │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│              │                                                             │
│              ▼                                                             │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌──────────────────┐   │
│  │   RandomForest      │  │  Adaptive           │  │  Isolation       │   │
│  │   (Supervised)      │  │  Thresholds         │  │  Forest          │   │
│  ├─────────────────────┤  ├─────────────────────┤  ├──────────────────┤   │
│  │ • Trained on        │  │ • Population        │  │ • Unsupervised   │   │
│  │   labeled user data │  │   baselines (lit.)  │  │ • Learns user's  │   │
│  │ • Predicts 0/1      │  │ • Pretrained data   │  │   normal pattern │   │
│  │ • Returns proba     │  │ • Per-user learned  │  │ • Flags outliers │   │
│  │                     │  │ • Z-score calc      │  │                  │   │
│  └─────────────────────┘  └─────────────────────┘  └──────────────────┘   │
│              │                     │                      │               │
│              └─────────────────────┼──────────────────────┘               │
│                                    ▼                                       │
│                          ENSEMBLE VOTING                                   │
│                                    │                                       │
│                                    ▼                                       │
│                       is_anomaly = True/False                              │
│                       confidence = 0.0 - 1.0                               │
│                       anomaly_type = "insufficient_sleep", etc.            │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘