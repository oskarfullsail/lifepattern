# LifePattern AI Service Integration Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React Native)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐  │
│  │ HealthSync  │  │  Dashboard  │  │  AI Productivity Coach      │  │
│  │  Service    │  │  Screen     │  │  (recommendations display)  │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────────┬─────────────┘  │
│         │                │                         │                 │
└─────────┴────────────────┴─────────────────────────┴─────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         BACKEND (Go)                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │
│  │  Log Handler    │  │  Insight Handler│  │  Drift Handler      │  │
│  │  POST /logs     │  │  GET /insights  │  │  POST /drift/analyze│  │
│  └────────┬────────┘  └────────┬────────┘  └──────────┬──────────┘  │
│           │                    │                      │              │
│           └────────────────────┼──────────────────────┘              │
│                                ▼                                     │
│                    ┌─────────────────────┐                          │
│                    │   AI Service Client │                          │
│                    │   (ai_service.go)   │                          │
│                    └──────────┬──────────┘                          │
│                               │                                      │
└───────────────────────────────┼──────────────────────────────────────┘
                                │ HTTP POST /predict
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    AI SERVICE (Python/FastAPI)                       │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    /predict (main endpoint)                     │ │
│  │  ┌────────────────┐    ┌────────────────────────────────────┐  │ │
│  │  │  Trained Model │    │  Legacy Anomaly Detector           │  │ │
│  │  │  Service       │ OR │  (fallback if models not loaded)   │  │ │
│  │  │  (Kaggle data) │    │                                    │  │ │
│  │  └───────┬────────┘    └────────────────────────────────────┘  │ │
│  └──────────┼─────────────────────────────────────────────────────┘ │
│             │                                                        │
│  ┌──────────▼──────────────────────────────────────────────────────┐│
│  │              TRAINED MODEL SERVICE (NEW)                         ││
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐ ││
│  │  │ Negative State   │  │ Wellness Score   │  │ Anomaly        │ ││
│  │  │ Classifier       │  │ Predictor        │  │ Detector       │ ││
│  │  │ (RandomForest)   │  │ (RF Regressor)   │  │ (IsoForest)    │ ││
│  │  └──────────────────┘  └──────────────────┘  └────────────────┘ ││
│  │                                                                  ││
│  │  ┌──────────────────────────────────────────────────────────┐   ││
│  │  │ Data-Driven Thresholds (from 396,578 Kaggle samples)     │   ││
│  │  └──────────────────────────────────────────────────────────┘   ││
│  │                                                                  ││
│  │  ┌──────────────────────────────────────────────────────────┐   ││
│  │  │ Intervention Engine (14 evidence-based recommendations)   │   ││
│  │  └──────────────────────────────────────────────────────────┘   ││
│  └──────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────────┐│
│  │              DRIFT DETECTOR (drift_detector_alt.py)              ││
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐ ││
│  │  │ Statistical Drift│  │ Isolation Forest │  │ Baseline       │ ││
│  │  │ (t-test, z-score)│  │ Anomalies        │  │ Comparison     │ ││
│  │  └──────────────────┘  └──────────────────┘  └────────────────┘ ││
│  └──────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────┘
```

## Integration Status

### ✅ AI Service (READY)

| Component | Status | Description |
|-----------|--------|-------------|
| `main.py` | ✅ Updated | Uses trained models when available |
| `TrainedModelService` | ✅ Ready | Loads Kaggle-trained models |
| `InterventionEngine` | ✅ Ready | 14 evidence-based recommendations |
| `DriftDetectorAlt` | ✅ Works | Statistical + Isolation Forest drift detection |
| `/predict` endpoint | ✅ Updated | Auto-uses trained models if available |
| `/predict/data-driven` | ✅ New | Dedicated data-driven endpoint |
| `/models/status` | ✅ New | Check model loading status |

### ✅ Backend (NO CHANGES NEEDED)

The backend calls `/predict` endpoint which now automatically uses trained models:

```go
// ai_service.go - calls /predict
resp, body, err := s.makeRequestWithRetry(ctx, s.baseURL+"/predict", requestJSON, 3)
```

**Response format unchanged** - The trained models return the same JSON structure:
```json
{
  "is_anomaly": true,
  "confidence_score": 0.96,
  "anomaly_type": "combined_risk",
  "recommendations": ["..."],
  "enhanced_recommendations": [...],
  "drift_analysis": {...},
  "baseline_comparison": {...}
}
```

### ✅ Frontend (NO CHANGES NEEDED)

The frontend receives the same response structure:

```typescript
// endpoint.ts
export interface InsightResponse {
  ai_report: {
    is_anomaly: boolean;
    confidence_score: number;
    anomaly_type: string;
    recommendations: string[];
  };
}
```

## How It Works Now

### Flow for New Prediction

1. **User logs routine** → Frontend sends to Backend
2. **Backend** calls `ai_service.AnalyzeRoutine(routineLog)`
3. **Backend** POSTs to AI Service `/predict`
4. **AI Service** checks if `trained_model_service.is_ready()`
5. **If YES** (trained models loaded):
   - Uses Kaggle-trained classifier
   - Calculates wellness scores
   - Gets data-driven thresholds
   - Generates evidence-based recommendations
6. **If NO** (fallback):
   - Uses legacy `AnomalyDetector`
   - Uses rule-based recommendations
7. **Response** sent back with same JSON structure
8. **Frontend** displays anomaly status & recommendations

## How `drift_detector_alt.py` Fits In

The `DriftDetectorAlt` provides **complementary analysis**:

```python
# In main.py /predict endpoint
drift_analysis = drift_detector.detect_drift_statistical(...)  # Statistical
anomaly_analysis = drift_detector.detect_anomalies_isolation_forest(...)  # ML-based
```

| Method | Purpose | When Used |
|--------|---------|-----------|
| `calculate_baseline()` | Build user's normal patterns | First 30 days of data |
| `detect_drift_statistical()` | Find gradual behavior changes | Every prediction |
| `detect_anomalies_isolation_forest()` | Find multivariate outliers | Every prediction |
| `analyze_routine_drift()` | Combined analysis | Drift endpoint |

**Relationship to Trained Models:**
- Trained models: **Classification** (is this an anomaly?)
- Drift detector: **Trend Analysis** (is the user's pattern changing?)
- Both are used together in `/predict` response

## Files Summary

```
ai-service/
├── main.py                     # ✅ Updated - uses trained models
├── src/
│   ├── models/
│   │   └── trained_model_service.py  # ✅ NEW - Kaggle model integration
│   └── recommendations/
│       └── intervention_engine.py    # ✅ NEW - Evidence-based recommendations
├── models/
│   ├── anomaly_detector.py     # Legacy (fallback)
│   └── drift_detector_alt.py   # Statistical + IF drift detection
└── data/
    ├── models/                 # Trained model files (.pkl)
    └── processed/
        └── data_driven_thresholds.json  # Kaggle-derived thresholds
```

## Testing the Integration

```bash
# Start AI service
cd ai-service
source .venv311/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000

# Test prediction
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "sleep_hours": 5,
    "stress_level": 8,
    "exercise_duration": 0,
    "screen_time": 10,
    "water_intake": 1,
    "wake_up_time": "05:00",
    "bed_time": "01:00",
    "meal_times": ["12:00"]
  }'

# Check model status
curl http://localhost:8000/models/status
```

## What Changed vs. Before

| Before | After |
|--------|-------|
| Hardcoded thresholds | Data-driven from 396,578 samples |
| Rule-based anomaly detection | ML classifier (95.9% confidence) |
| Generic recommendations | 14 evidence-based interventions |
| No wellness scoring | Predicts energy, mood, focus |
| Single model | Hybrid: Classifier + IF + Wellness |

## Thesis Implications

This integration addresses the professor's feedback:
1. ✅ **Replaces hardcoded thresholds** with Kaggle-trained baselines
2. ✅ **Data-driven anomaly detection** using real health datasets
3. ✅ **Evidence-based recommendations** from research sources
4. ✅ **Backward compatible** - no backend/frontend changes needed

