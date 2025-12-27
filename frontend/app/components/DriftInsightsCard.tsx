/**
 * DriftInsightsCard Component
 * 
 * Displays behavioral drift detection insights to the user.
 * Shows drift severity, top drifting features, and recommendations.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { fetchDriftInsights, DriftInsightsResponse, DriftFeature } from '../api/endpoint';

interface Props {
  userId: string;
  onRefresh?: () => void;
  autoRefresh?: boolean;
}

const DriftInsightsCard: React.FC<Props> = ({ userId, onRefresh, autoRefresh = true }) => {
  const [loading, setLoading] = useState(true);
  const [driftData, setDriftData] = useState<DriftInsightsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const loadDriftInsights = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchDriftInsights(userId);
      setDriftData(data);
      
      if (data.error) {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load drift insights');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadDriftInsights();
  }, [loadDriftInsights]);

  const handleRefresh = () => {
    loadDriftInsights();
    onRefresh?.();
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'high': return '#ef4444';
      case 'moderate': return '#f59e0b';
      case 'low': return '#3b82f6';
      default: return '#10b981';
    }
  };

  const getSeverityIcon = (severity: string): string => {
    switch (severity) {
      case 'high': return '⚠️';
      case 'moderate': return '📊';
      case 'low': return 'ℹ️';
      default: return '✅';
    }
  };

  const getDeviationIcon = (deviation: string): string => {
    switch (deviation) {
      case 'significant': return '🔴';
      case 'moderate': return '🟡';
      default: return '🟢';
    }
  };

  const getFeatureDisplayName = (name: string): string => {
    const nameMap: { [key: string]: string } = {
      'sleep_hours': 'Sleep',
      'screen_time': 'Screen Time',
      'exercise_duration': 'Exercise',
      'water_intake': 'Hydration',
      'stress_level': 'Stress',
      'health_score': 'Health Score',
      'wake_up_hour': 'Wake Up Time',
      'bed_time_hour': 'Bedtime',
      'meal_count': 'Meal Regularity',
    };
    return nameMap[name] || name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getFeatureUnit = (name: string): string => {
    const unitMap: { [key: string]: string } = {
      'sleep_hours': 'hrs',
      'screen_time': 'hrs',
      'exercise_duration': 'hrs',
      'water_intake': 'L',
      'stress_level': '/10',
      'health_score': '%',
      'wake_up_hour': '',
      'bed_time_hour': '',
      'meal_count': 'meals',
    };
    return unitMap[name] || '';
  };

  const renderFeatureRow = (feature: DriftFeature, index: number) => (
    <View key={index} style={styles.featureRow}>
      <View style={styles.featureLeft}>
        <Text style={styles.featureIcon}>{getDeviationIcon(feature.deviation)}</Text>
        <Text style={styles.featureName}>{getFeatureDisplayName(feature.name)}</Text>
      </View>
      <View style={styles.featureRight}>
        <Text style={styles.featureChange}>
          {feature.percent_change > 0 ? '+' : ''}{feature.percent_change.toFixed(0)}%
        </Text>
        <Text style={styles.featureValue}>
          {feature.current_value.toFixed(1)} {getFeatureUnit(feature.name)}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>🔍 Behavioral Drift Analysis</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Analyzing your patterns...</Text>
        </View>
      </View>
    );
  }

  if (error && !driftData) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>🔍 Behavioral Drift Analysis</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!driftData) {
    return null;
  }

  // Check if the response is actually an error fallback
  const isErrorFallback = driftData.error || driftData.drift_type === 'fetch_error';
  
  if (isErrorFallback) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>🔍 Behavioral Drift Analysis</Text>
            <Text style={styles.dataPoints}>
              Based on {driftData.baseline_data_points || 0} days of data
            </Text>
          </View>
          <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
            <Text style={styles.refreshIcon}>🔄</Text>
          </TouchableOpacity>
        </View>
        
        {/* Show stable indicator with error message */}
        <View style={[styles.severityBadge, { backgroundColor: '#10b98120', borderColor: '#10b981' }]}>
          <Text style={styles.severityIcon}>✅</Text>
          <View style={styles.severityContent}>
            <Text style={[styles.severityTitle, { color: '#10b981' }]}>
              Patterns Stable
            </Text>
            <Text style={styles.severityScore}>
              Drift Score: 0%
            </Text>
          </View>
        </View>
        
        <View style={styles.noDataBox}>
          <Text style={styles.noDataIcon}>⚠️</Text>
          <Text style={styles.noDataText}>
            Unable to analyze drift patterns at this time. Please try again later.
          </Text>
        </View>
      </View>
    );
  }

  const severityColor = getSeverityColor(driftData.severity);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>🔍 Behavioral Drift Analysis</Text>
          <Text style={styles.dataPoints}>
            Based on {driftData.baseline_data_points} days of data
          </Text>
        </View>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
          <Text style={styles.refreshIcon}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Severity Badge */}
      <View style={[styles.severityBadge, { backgroundColor: severityColor + '20', borderColor: severityColor }]}>
        <Text style={styles.severityIcon}>{getSeverityIcon(driftData.severity)}</Text>
        <View style={styles.severityContent}>
          <Text style={[styles.severityTitle, { color: severityColor }]}>
            {driftData.drift_detected 
              ? `${driftData.severity.charAt(0).toUpperCase() + driftData.severity.slice(1)} Drift Detected`
              : 'Patterns Stable'}
          </Text>
          <Text style={styles.severityScore}>
            Drift Score: {(driftData.drift_score * 100).toFixed(0)}%
          </Text>
        </View>
      </View>

      {/* Recommendation */}
      <View style={styles.recommendationBox}>
        <Text style={styles.recommendationText}>{driftData.recommendation}</Text>
      </View>

      {/* Top Features (Expandable) */}
      {driftData.top_features && driftData.top_features.length > 0 && (
        <>
          <TouchableOpacity 
            style={styles.expandHeader} 
            onPress={() => setExpanded(!expanded)}
          >
            <Text style={styles.expandTitle}>
              📈 Top Drifting Features ({driftData.top_features.length})
            </Text>
            <Text style={styles.expandIcon}>{expanded ? '▼' : '▶'}</Text>
          </TouchableOpacity>

          {expanded && (
            <View style={styles.featuresContainer}>
              {driftData.top_features.map((feature, index) => renderFeatureRow(feature, index))}
            </View>
          )}
        </>
      )}

      {/* No Data Message - show only when below minimum threshold (3 days) */}
      {driftData.baseline_data_points < 3 && (
        <View style={styles.noDataBox}>
          <Text style={styles.noDataIcon}>📊</Text>
          <Text style={styles.noDataText}>
            Keep logging your daily routines! We need at least 3 days of data to analyze behavioral patterns.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 2,
  },
  dataPoints: {
    fontSize: 12,
    color: '#6b7280',
  },
  refreshButton: {
    padding: 8,
  },
  refreshIcon: {
    fontSize: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  errorIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  severityIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  severityContent: {
    flex: 1,
  },
  severityTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  severityScore: {
    fontSize: 12,
    color: '#6b7280',
  },
  recommendationBox: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  recommendationText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  expandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  expandTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
  },
  expandIcon: {
    fontSize: 12,
    color: '#9ca3af',
  },
  featuresContainer: {
    marginTop: 8,
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  featureLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  featureIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  featureName: {
    fontSize: 14,
    color: '#4b5563',
  },
  featureRight: {
    alignItems: 'flex-end',
  },
  featureChange: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
  },
  featureValue: {
    fontSize: 12,
    color: '#9ca3af',
  },
  noDataBox: {
    backgroundColor: '#fef3c7',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  noDataIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  noDataText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
    lineHeight: 18,
  },
});

export default DriftInsightsCard;

