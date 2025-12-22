"""
Metrics Framework for Thesis Experimentation

This module provides a comprehensive metrics collection and analysis framework
for the LifePattern AI thesis project. It enables:

1. Quantitative metric collection for anomaly detection performance
2. Hypothesis testing support with statistical analysis
3. Comparison against baseline/prior results
4. Academic-grade documentation of experimental outcomes

Academic Context:
This framework supports the experimental methodology section of the thesis
by providing measurable, reproducible metrics that can be compared against
prior work and null hypotheses.
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from scipy import stats
from sklearn.metrics import (
    precision_score, recall_score, f1_score, accuracy_score,
    confusion_matrix, roc_auc_score, precision_recall_curve,
    average_precision_score
)
import logging
import json
from enum import Enum

logger = logging.getLogger(__name__)


# ============================================================================
# Metric Definitions
# ============================================================================

class MetricCategory(Enum):
    """Categories of metrics for organized reporting."""
    DETECTION_ACCURACY = "detection_accuracy"
    TEMPORAL_PERFORMANCE = "temporal_performance"
    USER_ENGAGEMENT = "user_engagement"
    INTERVENTION_EFFECTIVENESS = "intervention_effectiveness"
    SYSTEM_PERFORMANCE = "system_performance"
    BEHAVIORAL_STABILITY = "behavioral_stability"


@dataclass
class AnomalyDetectionMetrics:
    """
    Core metrics for evaluating anomaly detection performance.
    
    These metrics enable direct comparison with prior work and
    establish the validity of the hybrid ML approach.
    """
    
    # Classification metrics
    true_positives: int = 0
    true_negatives: int = 0
    false_positives: int = 0
    false_negatives: int = 0
    
    # Derived metrics (computed from confusion matrix)
    precision: float = 0.0
    recall: float = 0.0
    f1_score: float = 0.0
    accuracy: float = 0.0
    specificity: float = 0.0
    
    # Probabilistic metrics
    auc_roc: float = 0.0
    average_precision: float = 0.0
    
    # Threshold analysis
    optimal_threshold: float = 0.5
    threshold_analysis: Dict[float, Dict[str, float]] = field(default_factory=dict)
    
    # Per-class metrics (for multi-class anomalies)
    per_class_precision: Dict[str, float] = field(default_factory=dict)
    per_class_recall: Dict[str, float] = field(default_factory=dict)
    
    def compute_derived_metrics(self) -> None:
        """Compute derived metrics from confusion matrix."""
        total = self.true_positives + self.true_negatives + self.false_positives + self.false_negatives
        
        if total == 0:
            return
        
        # Precision
        if self.true_positives + self.false_positives > 0:
            self.precision = self.true_positives / (self.true_positives + self.false_positives)
        
        # Recall (Sensitivity)
        if self.true_positives + self.false_negatives > 0:
            self.recall = self.true_positives / (self.true_positives + self.false_negatives)
        
        # Specificity
        if self.true_negatives + self.false_positives > 0:
            self.specificity = self.true_negatives / (self.true_negatives + self.false_positives)
        
        # F1 Score
        if self.precision + self.recall > 0:
            self.f1_score = 2 * (self.precision * self.recall) / (self.precision + self.recall)
        
        # Accuracy
        self.accuracy = (self.true_positives + self.true_negatives) / total
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            'confusion_matrix': {
                'true_positives': self.true_positives,
                'true_negatives': self.true_negatives,
                'false_positives': self.false_positives,
                'false_negatives': self.false_negatives
            },
            'precision': round(self.precision, 4),
            'recall': round(self.recall, 4),
            'f1_score': round(self.f1_score, 4),
            'accuracy': round(self.accuracy, 4),
            'specificity': round(self.specificity, 4),
            'auc_roc': round(self.auc_roc, 4),
            'average_precision': round(self.average_precision, 4),
            'optimal_threshold': round(self.optimal_threshold, 4)
        }


@dataclass
class TemporalMetrics:
    """
    Metrics for evaluating time-sensitive aspects of detection.
    
    Critical for real-world applicability where early detection matters.
    """
    
    # Detection latency
    mean_time_to_detection_hours: float = 0.0
    median_time_to_detection_hours: float = 0.0
    time_to_detection_std: float = 0.0
    
    # Early detection rate
    detected_within_1h_rate: float = 0.0
    detected_within_4h_rate: float = 0.0
    detected_within_24h_rate: float = 0.0
    
    # Trend detection
    trend_change_detection_accuracy: float = 0.0
    false_trend_alarm_rate: float = 0.0
    
    # Prediction horizon
    prediction_horizon_hours: int = 0  # How far ahead anomalies are predicted
    prediction_accuracy_by_horizon: Dict[int, float] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'mean_time_to_detection_hours': round(self.mean_time_to_detection_hours, 2),
            'median_time_to_detection_hours': round(self.median_time_to_detection_hours, 2),
            'detected_within_1h_rate': round(self.detected_within_1h_rate, 4),
            'detected_within_4h_rate': round(self.detected_within_4h_rate, 4),
            'detected_within_24h_rate': round(self.detected_within_24h_rate, 4),
            'trend_change_detection_accuracy': round(self.trend_change_detection_accuracy, 4)
        }


@dataclass
class BehavioralStabilityMetrics:
    """
    Metrics for measuring behavioral pattern stability.
    
    Unique contribution: Quantifies the stability of user routines
    and the effectiveness of interventions in stabilizing behavior.
    """
    
    # Stability indices (0-1, higher = more stable)
    sleep_consistency_index: float = 0.0
    activity_consistency_index: float = 0.0
    circadian_alignment_index: float = 0.0
    overall_stability_index: float = 0.0
    
    # Variability measures
    intra_week_variability: float = 0.0  # Within-week variation
    inter_week_variability: float = 0.0  # Between-week variation
    weekend_weekday_divergence: float = 0.0
    
    # Trend metrics
    stability_trend_direction: str = "stable"  # improving, declining, stable
    stability_change_rate: float = 0.0  # Rate of change per week
    
    # Recovery metrics
    post_disruption_recovery_days: float = 0.0
    recovery_rate: float = 0.0
    
    def compute_overall_stability(self) -> None:
        """Compute overall stability index from components."""
        components = [
            self.sleep_consistency_index,
            self.activity_consistency_index,
            self.circadian_alignment_index
        ]
        valid_components = [c for c in components if c > 0]
        if valid_components:
            self.overall_stability_index = np.mean(valid_components)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'sleep_consistency_index': round(self.sleep_consistency_index, 4),
            'activity_consistency_index': round(self.activity_consistency_index, 4),
            'circadian_alignment_index': round(self.circadian_alignment_index, 4),
            'overall_stability_index': round(self.overall_stability_index, 4),
            'intra_week_variability': round(self.intra_week_variability, 4),
            'inter_week_variability': round(self.inter_week_variability, 4),
            'stability_trend': self.stability_trend_direction,
            'post_disruption_recovery_days': round(self.post_disruption_recovery_days, 1)
        }


@dataclass
class InterventionEffectivenessMetrics:
    """
    Metrics for evaluating the effectiveness of AI-generated recommendations.
    
    Critical for demonstrating real-world impact of the system.
    """
    
    # Recommendation engagement
    recommendation_view_rate: float = 0.0
    recommendation_action_rate: float = 0.0
    recommendation_completion_rate: float = 0.0
    
    # Outcome metrics
    behavior_change_after_intervention: float = 0.0
    sustained_change_7_day: float = 0.0
    sustained_change_30_day: float = 0.0
    
    # Per-recommendation type effectiveness
    recommendation_type_effectiveness: Dict[str, float] = field(default_factory=dict)
    
    # User feedback
    user_satisfaction_score: float = 0.0  # 0-5 scale
    perceived_helpfulness_score: float = 0.0
    
    # Comparative effectiveness
    improvement_vs_no_intervention: float = 0.0  # Effect size
    statistical_significance_p_value: float = 1.0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'recommendation_view_rate': round(self.recommendation_view_rate, 4),
            'recommendation_action_rate': round(self.recommendation_action_rate, 4),
            'behavior_change_after_intervention': round(self.behavior_change_after_intervention, 4),
            'sustained_change_7_day': round(self.sustained_change_7_day, 4),
            'sustained_change_30_day': round(self.sustained_change_30_day, 4),
            'improvement_vs_no_intervention': round(self.improvement_vs_no_intervention, 4),
            'statistical_significance': self.statistical_significance_p_value < 0.05
        }


@dataclass
class UserEngagementMetrics:
    """
    Metrics for measuring user engagement with the system.
    
    Important for system adoption and real-world viability.
    """
    
    # Usage metrics
    daily_active_users: int = 0
    weekly_active_users: int = 0
    monthly_active_users: int = 0
    
    # Session metrics
    average_session_duration_seconds: float = 0.0
    sessions_per_user_per_day: float = 0.0
    
    # Feature usage
    log_completion_rate: float = 0.0
    insight_view_rate: float = 0.0
    recommendation_engagement_rate: float = 0.0
    
    # Retention
    day_1_retention: float = 0.0
    day_7_retention: float = 0.0
    day_30_retention: float = 0.0
    
    # Data quality
    data_completeness_rate: float = 0.0
    wearable_sync_rate: float = 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'daily_active_users': self.daily_active_users,
            'weekly_active_users': self.weekly_active_users,
            'average_session_duration_seconds': round(self.average_session_duration_seconds, 1),
            'log_completion_rate': round(self.log_completion_rate, 4),
            'day_7_retention': round(self.day_7_retention, 4),
            'day_30_retention': round(self.day_30_retention, 4),
            'data_completeness_rate': round(self.data_completeness_rate, 4)
        }


# ============================================================================
# Metric Collectors
# ============================================================================

class MetricsCollector:
    """
    Collects and aggregates metrics during system operation.
    """
    
    def __init__(self):
        self.detection_events: List[Dict] = []
        self.intervention_events: List[Dict] = []
        self.user_sessions: List[Dict] = []
        self.behavioral_snapshots: List[Dict] = []
        
    def record_detection(
        self,
        user_id: str,
        timestamp: datetime,
        predicted_anomaly: bool,
        actual_anomaly: Optional[bool],
        confidence: float,
        anomaly_type: str,
        detection_latency_hours: Optional[float] = None
    ) -> None:
        """Record an anomaly detection event."""
        self.detection_events.append({
            'user_id': user_id,
            'timestamp': timestamp.isoformat(),
            'predicted': predicted_anomaly,
            'actual': actual_anomaly,
            'confidence': confidence,
            'anomaly_type': anomaly_type,
            'latency_hours': detection_latency_hours
        })
    
    def record_intervention(
        self,
        user_id: str,
        timestamp: datetime,
        recommendation_type: str,
        viewed: bool,
        action_taken: bool,
        behavior_change: Optional[float] = None
    ) -> None:
        """Record an intervention/recommendation event."""
        self.intervention_events.append({
            'user_id': user_id,
            'timestamp': timestamp.isoformat(),
            'type': recommendation_type,
            'viewed': viewed,
            'action_taken': action_taken,
            'behavior_change': behavior_change
        })
    
    def record_behavioral_snapshot(
        self,
        user_id: str,
        date: str,
        metrics: Dict[str, float]
    ) -> None:
        """Record a daily behavioral snapshot for stability analysis."""
        self.behavioral_snapshots.append({
            'user_id': user_id,
            'date': date,
            **metrics
        })
    
    def compute_detection_metrics(
        self,
        include_unlabeled: bool = False
    ) -> AnomalyDetectionMetrics:
        """Compute detection metrics from collected events."""
        metrics = AnomalyDetectionMetrics()
        
        # Filter to labeled examples
        labeled = [e for e in self.detection_events if e['actual'] is not None]
        
        if not labeled:
            return metrics
        
        for event in labeled:
            if event['predicted'] and event['actual']:
                metrics.true_positives += 1
            elif not event['predicted'] and not event['actual']:
                metrics.true_negatives += 1
            elif event['predicted'] and not event['actual']:
                metrics.false_positives += 1
            else:
                metrics.false_negatives += 1
        
        metrics.compute_derived_metrics()
        
        # Compute AUC-ROC if we have probabilities
        try:
            y_true = [1 if e['actual'] else 0 for e in labeled]
            y_scores = [e['confidence'] for e in labeled]
            metrics.auc_roc = roc_auc_score(y_true, y_scores)
            metrics.average_precision = average_precision_score(y_true, y_scores)
        except Exception as e:
            logger.warning(f"Could not compute AUC metrics: {e}")
        
        return metrics
    
    def compute_temporal_metrics(self) -> TemporalMetrics:
        """Compute temporal performance metrics."""
        metrics = TemporalMetrics()
        
        latencies = [e['latency_hours'] for e in self.detection_events 
                     if e['latency_hours'] is not None]
        
        if latencies:
            metrics.mean_time_to_detection_hours = float(np.mean(latencies))
            metrics.median_time_to_detection_hours = float(np.median(latencies))
            metrics.time_to_detection_std = float(np.std(latencies))
            
            metrics.detected_within_1h_rate = sum(1 for l in latencies if l <= 1) / len(latencies)
            metrics.detected_within_4h_rate = sum(1 for l in latencies if l <= 4) / len(latencies)
            metrics.detected_within_24h_rate = sum(1 for l in latencies if l <= 24) / len(latencies)
        
        return metrics
    
    def compute_intervention_metrics(self) -> InterventionEffectivenessMetrics:
        """Compute intervention effectiveness metrics."""
        metrics = InterventionEffectivenessMetrics()
        
        if not self.intervention_events:
            return metrics
        
        total = len(self.intervention_events)
        viewed = sum(1 for e in self.intervention_events if e['viewed'])
        actioned = sum(1 for e in self.intervention_events if e['action_taken'])
        
        metrics.recommendation_view_rate = viewed / total
        metrics.recommendation_action_rate = actioned / total
        
        # Compute behavior change for those with recorded changes
        changes = [e['behavior_change'] for e in self.intervention_events 
                   if e['behavior_change'] is not None]
        
        if changes:
            metrics.behavior_change_after_intervention = float(np.mean(changes))
        
        # Per-type effectiveness
        by_type: Dict[str, List[float]] = {}
        for event in self.intervention_events:
            if event['behavior_change'] is not None:
                rec_type = event['type']
                if rec_type not in by_type:
                    by_type[rec_type] = []
                by_type[rec_type].append(event['behavior_change'])
        
        for rec_type, changes in by_type.items():
            metrics.recommendation_type_effectiveness[rec_type] = float(np.mean(changes))
        
        return metrics
    
    def compute_stability_metrics(self, user_id: Optional[str] = None) -> BehavioralStabilityMetrics:
        """Compute behavioral stability metrics."""
        metrics = BehavioralStabilityMetrics()
        
        snapshots = self.behavioral_snapshots
        if user_id:
            snapshots = [s for s in snapshots if s['user_id'] == user_id]
        
        if len(snapshots) < 7:
            return metrics
        
        df = pd.DataFrame(snapshots)
        
        # Sleep consistency
        if 'sleep_hours' in df.columns:
            sleep_std = df['sleep_hours'].std()
            metrics.sleep_consistency_index = max(0, 1 - (sleep_std / 3))  # Normalize
        
        # Activity consistency
        if 'exercise_duration' in df.columns:
            exercise_std = df['exercise_duration'].std()
            metrics.activity_consistency_index = max(0, 1 - (exercise_std / 2))
        
        # Circadian alignment (based on bed/wake time variability)
        if 'bed_time_hour' in df.columns and 'wake_up_hour' in df.columns:
            bed_std = df['bed_time_hour'].std()
            wake_std = df['wake_up_hour'].std()
            metrics.circadian_alignment_index = max(0, 1 - ((bed_std + wake_std) / 4))
        
        metrics.compute_overall_stability()
        
        # Variability analysis
        if len(df) >= 14:
            week1 = df.iloc[:7]
            week2 = df.iloc[7:14]
            
            if 'sleep_hours' in df.columns:
                metrics.intra_week_variability = float(week1['sleep_hours'].std())
                metrics.inter_week_variability = abs(
                    week1['sleep_hours'].mean() - week2['sleep_hours'].mean()
                )
        
        return metrics
    
    def export_metrics_report(self) -> Dict[str, Any]:
        """Export a comprehensive metrics report."""
        return {
            'timestamp': datetime.now().isoformat(),
            'detection_metrics': self.compute_detection_metrics().to_dict(),
            'temporal_metrics': self.compute_temporal_metrics().to_dict(),
            'intervention_metrics': self.compute_intervention_metrics().to_dict(),
            'stability_metrics': self.compute_stability_metrics().to_dict(),
            'sample_sizes': {
                'detection_events': len(self.detection_events),
                'intervention_events': len(self.intervention_events),
                'behavioral_snapshots': len(self.behavioral_snapshots)
            }
        }


# ============================================================================
# Hypothesis Testing Framework
# ============================================================================

@dataclass
class Hypothesis:
    """
    Represents a testable research hypothesis.
    """
    id: str
    statement: str
    null_hypothesis: str
    alternative_hypothesis: str
    variables: Dict[str, str]  # {'independent': ..., 'dependent': ...}
    test_type: str  # 't-test', 'chi-square', 'wilcoxon', etc.
    alpha: float = 0.05
    
    # Results (filled after testing)
    test_statistic: Optional[float] = None
    p_value: Optional[float] = None
    effect_size: Optional[float] = None
    confidence_interval: Optional[Tuple[float, float]] = None
    conclusion: Optional[str] = None


class HypothesisTestingFramework:
    """
    Framework for defining and testing research hypotheses.
    
    Provides statistical testing methods suitable for thesis experiments.
    """
    
    def __init__(self):
        self.hypotheses: Dict[str, Hypothesis] = {}
        self.test_results: List[Dict] = []
        
    def register_hypothesis(self, hypothesis: Hypothesis) -> None:
        """Register a hypothesis for testing."""
        self.hypotheses[hypothesis.id] = hypothesis
    
    def test_hypothesis(
        self,
        hypothesis_id: str,
        group_a: List[float],
        group_b: List[float]
    ) -> Dict[str, Any]:
        """
        Test a registered hypothesis with provided data.
        """
        if hypothesis_id not in self.hypotheses:
            raise ValueError(f"Hypothesis {hypothesis_id} not registered")
        
        hypothesis = self.hypotheses[hypothesis_id]
        
        if hypothesis.test_type == 't-test':
            result = self._perform_t_test(group_a, group_b, hypothesis)
        elif hypothesis.test_type == 'paired-t-test':
            result = self._perform_paired_t_test(group_a, group_b, hypothesis)
        elif hypothesis.test_type == 'wilcoxon':
            result = self._perform_wilcoxon_test(group_a, group_b, hypothesis)
        elif hypothesis.test_type == 'mann-whitney':
            result = self._perform_mann_whitney_test(group_a, group_b, hypothesis)
        else:
            raise ValueError(f"Unsupported test type: {hypothesis.test_type}")
        
        self.test_results.append({
            'hypothesis_id': hypothesis_id,
            'timestamp': datetime.now().isoformat(),
            **result
        })
        
        return result
    
    def _perform_t_test(
        self,
        group_a: List[float],
        group_b: List[float],
        hypothesis: Hypothesis
    ) -> Dict[str, Any]:
        """Perform independent samples t-test."""
        t_stat, p_value = stats.ttest_ind(group_a, group_b)
        
        # Cohen's d effect size
        pooled_std = np.sqrt(
            ((len(group_a) - 1) * np.std(group_a, ddof=1)**2 +
             (len(group_b) - 1) * np.std(group_b, ddof=1)**2) /
            (len(group_a) + len(group_b) - 2)
        )
        effect_size = (np.mean(group_a) - np.mean(group_b)) / pooled_std if pooled_std > 0 else 0
        
        # Confidence interval for difference
        mean_diff = np.mean(group_a) - np.mean(group_b)
        se_diff = pooled_std * np.sqrt(1/len(group_a) + 1/len(group_b))
        ci = (
            mean_diff - 1.96 * se_diff,
            mean_diff + 1.96 * se_diff
        )
        
        # Update hypothesis
        hypothesis.test_statistic = t_stat
        hypothesis.p_value = p_value
        hypothesis.effect_size = effect_size
        hypothesis.confidence_interval = ci
        hypothesis.conclusion = "reject" if p_value < hypothesis.alpha else "fail_to_reject"
        
        return {
            'test': 't-test',
            'test_statistic': float(t_stat),
            'p_value': float(p_value),
            'effect_size': float(effect_size),
            'confidence_interval': (float(ci[0]), float(ci[1])),
            'significant': p_value < hypothesis.alpha,
            'conclusion': hypothesis.conclusion,
            'sample_sizes': {'group_a': len(group_a), 'group_b': len(group_b)},
            'means': {'group_a': float(np.mean(group_a)), 'group_b': float(np.mean(group_b))}
        }
    
    def _perform_paired_t_test(
        self,
        pre: List[float],
        post: List[float],
        hypothesis: Hypothesis
    ) -> Dict[str, Any]:
        """Perform paired samples t-test."""
        t_stat, p_value = stats.ttest_rel(pre, post)
        
        # Effect size (Cohen's d for paired samples)
        diff = np.array(post) - np.array(pre)
        effect_size = np.mean(diff) / np.std(diff, ddof=1) if np.std(diff) > 0 else 0
        
        hypothesis.test_statistic = t_stat
        hypothesis.p_value = p_value
        hypothesis.effect_size = effect_size
        hypothesis.conclusion = "reject" if p_value < hypothesis.alpha else "fail_to_reject"
        
        return {
            'test': 'paired-t-test',
            'test_statistic': float(t_stat),
            'p_value': float(p_value),
            'effect_size': float(effect_size),
            'significant': p_value < hypothesis.alpha,
            'conclusion': hypothesis.conclusion,
            'sample_size': len(pre),
            'means': {'pre': float(np.mean(pre)), 'post': float(np.mean(post))}
        }
    
    def _perform_wilcoxon_test(
        self,
        pre: List[float],
        post: List[float],
        hypothesis: Hypothesis
    ) -> Dict[str, Any]:
        """Perform Wilcoxon signed-rank test (non-parametric paired test)."""
        stat, p_value = stats.wilcoxon(pre, post)
        
        # Effect size (r = Z / sqrt(N))
        n = len(pre)
        z = stats.norm.ppf(1 - p_value / 2)
        effect_size = z / np.sqrt(n)
        
        hypothesis.test_statistic = stat
        hypothesis.p_value = p_value
        hypothesis.effect_size = effect_size
        hypothesis.conclusion = "reject" if p_value < hypothesis.alpha else "fail_to_reject"
        
        return {
            'test': 'wilcoxon',
            'test_statistic': float(stat),
            'p_value': float(p_value),
            'effect_size': float(effect_size),
            'significant': p_value < hypothesis.alpha,
            'conclusion': hypothesis.conclusion
        }
    
    def _perform_mann_whitney_test(
        self,
        group_a: List[float],
        group_b: List[float],
        hypothesis: Hypothesis
    ) -> Dict[str, Any]:
        """Perform Mann-Whitney U test (non-parametric independent test)."""
        stat, p_value = stats.mannwhitneyu(group_a, group_b, alternative='two-sided')
        
        # Effect size (rank-biserial correlation)
        n1, n2 = len(group_a), len(group_b)
        effect_size = 1 - (2 * stat) / (n1 * n2)
        
        hypothesis.test_statistic = stat
        hypothesis.p_value = p_value
        hypothesis.effect_size = effect_size
        hypothesis.conclusion = "reject" if p_value < hypothesis.alpha else "fail_to_reject"
        
        return {
            'test': 'mann-whitney',
            'test_statistic': float(stat),
            'p_value': float(p_value),
            'effect_size': float(effect_size),
            'significant': p_value < hypothesis.alpha,
            'conclusion': hypothesis.conclusion
        }
    
    def get_predefined_hypotheses(self) -> List[Hypothesis]:
        """
        Returns predefined hypotheses for the LifePattern thesis.
        
        These hypotheses are designed to:
        1. Be testable with collected metrics
        2. Compare against prior results
        3. Strengthen the academic contribution
        """
        return [
            Hypothesis(
                id="H2",
                statement="Data-driven adaptive thresholds improve anomaly detection precision compared to fixed thresholds",
                null_hypothesis="H0: There is no significant difference in precision between adaptive and fixed threshold approaches",
                alternative_hypothesis="H1: Adaptive thresholds yield significantly higher precision (p < 0.05)",
                variables={
                    'independent': 'threshold_method',
                    'dependent': 'precision'
                },
                test_type='paired-t-test',
                alpha=0.05
            ),
            
            Hypothesis(
                id="H3",
                statement="Hybrid ML approach (Random Forest + Isolation Forest) achieves higher F1-score than rule-based detection alone",
                null_hypothesis="H0: There is no significant difference in F1-score between hybrid ML and rule-based approaches",
                alternative_hypothesis="H1: Hybrid ML achieves significantly higher F1-score (p < 0.05) with effect size d > 0.5",
                variables={
                    'independent': 'detection_method',
                    'dependent': 'f1_score'
                },
                test_type='t-test',
                alpha=0.05
            ),
            
            Hypothesis(
                id="H4",
                statement="Heart rate and HRV features significantly improve early anomaly detection (time-to-detection)",
                null_hypothesis="H0: Adding physiological features does not significantly reduce time-to-detection",
                alternative_hypothesis="H1: Time-to-detection is significantly reduced (> 25%) with physiological features",
                variables={
                    'independent': 'feature_set',
                    'dependent': 'time_to_detection_hours'
                },
                test_type='mann-whitney',
                alpha=0.05
            ),
            
            Hypothesis(
                id="H5",
                statement="AI-generated recommendations lead to measurable behavioral improvement",
                null_hypothesis="H0: There is no significant improvement in behavioral stability after receiving recommendations",
                alternative_hypothesis="H1: Users show significant improvement in behavioral stability index (p < 0.05) within 7 days",
                variables={
                    'independent': 'received_recommendation',
                    'dependent': 'stability_index_change'
                },
                test_type='paired-t-test',
                alpha=0.05
            ),
            
            Hypothesis(
                id="H6",
                statement="Personalized baselines improve anomaly detection accuracy after 14 days of data collection",
                null_hypothesis="H0: Personalization does not improve detection accuracy beyond population baselines",
                alternative_hypothesis="H1: Personalized baselines achieve significantly higher accuracy (p < 0.05)",
                variables={
                    'independent': 'personalization_level',
                    'dependent': 'accuracy'
                },
                test_type='paired-t-test',
                alpha=0.05
            ),
        ]
    
    def export_hypothesis_report(self) -> Dict[str, Any]:
        """Export comprehensive hypothesis testing report."""
        report = {
            'timestamp': datetime.now().isoformat(),
            'hypotheses': {},
            'summary': {
                'total_hypotheses': len(self.hypotheses),
                'tested': 0,
                'supported': 0,
                'not_supported': 0
            }
        }
        
        for h_id, hypothesis in self.hypotheses.items():
            report['hypotheses'][h_id] = {
                'statement': hypothesis.statement,
                'null_hypothesis': hypothesis.null_hypothesis,
                'alternative_hypothesis': hypothesis.alternative_hypothesis,
                'test_type': hypothesis.test_type,
                'alpha': hypothesis.alpha,
                'results': {
                    'test_statistic': hypothesis.test_statistic,
                    'p_value': hypothesis.p_value,
                    'effect_size': hypothesis.effect_size,
                    'confidence_interval': hypothesis.confidence_interval,
                    'conclusion': hypothesis.conclusion
                } if hypothesis.conclusion else None
            }
            
            if hypothesis.conclusion:
                report['summary']['tested'] += 1
                if hypothesis.conclusion == 'reject':
                    report['summary']['supported'] += 1
                else:
                    report['summary']['not_supported'] += 1
        
        return report


# ============================================================================
# Singleton Instances
# ============================================================================

metrics_collector = MetricsCollector()
hypothesis_framework = HypothesisTestingFramework()

# Register predefined hypotheses
for h in hypothesis_framework.get_predefined_hypotheses():
    hypothesis_framework.register_hypothesis(h)


def get_metrics_collector() -> MetricsCollector:
    """Get the singleton metrics collector."""
    return metrics_collector


def get_hypothesis_framework() -> HypothesisTestingFramework:
    """Get the singleton hypothesis testing framework."""
    return hypothesis_framework

