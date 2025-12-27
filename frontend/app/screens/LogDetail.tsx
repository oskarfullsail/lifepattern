/**
 * LogDetail Screen
 * 
 * Displays detailed information for a specific routine log,
 * including AI analysis and recommendations.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation';
import { getInsight, InsightResponse } from '../api/endpoint';

type LogDetailScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'LogDetail'
>;

type LogDetailScreenRouteProp = RouteProp<RootStackParamList, 'LogDetail'>;

interface Props {
  navigation: LogDetailScreenNavigationProp;
  route: LogDetailScreenRouteProp;
}

export default function LogDetail({ navigation, route }: Props) {
  const { logId } = route.params;
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState<InsightResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInsight();
  }, [logId]);

  const loadInsight = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getInsight(logId);
      setInsight(data);
    } catch (err: any) {
      console.error('Error loading insight:', err);
      setError(err.message || 'Failed to load log details');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return 'N/A';
    try {
      // Handle different time formats
      if (timeStr.includes('T')) {
        const date = new Date(timeStr);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      }
      return timeStr;
    } catch {
      return timeStr;
    }
  };

  const getAnomalyColor = (isAnomaly: boolean, type: string) => {
    if (!isAnomaly) return '#10b981';
    if (type.includes('high') || type.includes('critical')) return '#ef4444';
    if (type.includes('combined')) return '#f97316';
    return '#f59e0b';
  };

  const getAnomalyIcon = (isAnomaly: boolean, type: string) => {
    if (!isAnomaly) return '✅';
    if (type.includes('high') || type.includes('critical')) return '⚠️';
    if (type.includes('combined')) return '🔶';
    return '📊';
  };

  const renderMetricCard = (icon: string, label: string, value: string, sublabel?: string) => (
    <View style={styles.metricCard}>
      <Text style={styles.metricCardIcon}>{icon}</Text>
      <Text style={styles.metricCardValue}>{value}</Text>
      <Text style={styles.metricCardLabel}>{label}</Text>
      {sublabel && <Text style={styles.metricCardSublabel}>{sublabel}</Text>}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Log Details</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading details...</Text>
        </View>
      </View>
    );
  }

  if (error || !insight) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Log Details</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>😕</Text>
          <Text style={styles.errorTitle}>Unable to Load</Text>
          <Text style={styles.errorText}>{error || 'Log not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadInsight}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const log = insight.routine_log;
  const aiReport = insight.ai_report;
  const anomalyColor = aiReport ? getAnomalyColor(aiReport.is_anomaly, aiReport.anomaly_type) : '#10b981';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Log Details</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Date Header */}
        <View style={styles.dateHeader}>
          <Text style={styles.dateText}>{formatDate(log.log_date)}</Text>
          <Text style={styles.logIdText}>Log #{log.id}</Text>
        </View>

        {/* Main Metrics Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Daily Metrics</Text>
          <View style={styles.metricsGrid}>
            {renderMetricCard('😴', 'Sleep', `${log.sleep_hours}h`, 
              log.sleep_hours >= 7 ? 'Good' : 'Low')}
            {renderMetricCard('🏃', 'Exercise', `${log.exercise_duration}m`,
              log.exercise_duration >= 30 ? 'Active' : 'Low')}
            {renderMetricCard('📱', 'Screen', `${log.screen_time}m`,
              log.screen_time <= 180 ? 'Good' : 'High')}
            {renderMetricCard('💧', 'Water', `${log.water_intake}L`,
              log.water_intake >= 2 ? 'Hydrated' : 'Low')}
            {renderMetricCard('😰', 'Stress', `${log.stress_level}/10`,
              log.stress_level <= 5 ? 'Calm' : 'Elevated')}
            {renderMetricCard('🍽️', 'Meals', `${log.meal_times?.length || 0}`,
              log.meal_times?.length >= 3 ? 'Regular' : 'Irregular')}
          </View>
        </View>

        {/* Schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏰ Schedule</Text>
          <View style={styles.scheduleRow}>
            <View style={styles.scheduleItem}>
              <Text style={styles.scheduleIcon}>🌅</Text>
              <Text style={styles.scheduleLabel}>Wake Up</Text>
              <Text style={styles.scheduleValue}>{formatTime(log.wake_up_time)}</Text>
            </View>
            <View style={styles.scheduleDivider} />
            <View style={styles.scheduleItem}>
              <Text style={styles.scheduleIcon}>🌙</Text>
              <Text style={styles.scheduleLabel}>Bed Time</Text>
              <Text style={styles.scheduleValue}>{formatTime(log.bed_time)}</Text>
            </View>
          </View>
          
          {log.meal_times && log.meal_times.length > 0 && (
            <View style={styles.mealsContainer}>
              <Text style={styles.mealsLabel}>Meal Times:</Text>
              <View style={styles.mealTags}>
                {log.meal_times.map((time: string, index: number) => (
                  <View key={index} style={styles.mealTag}>
                    <Text style={styles.mealTagText}>{time}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Health Metrics (if available) */}
        {(log.heart_rate || log.sugar_intake) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>❤️ Health Metrics</Text>
            <View style={styles.healthMetricsRow}>
              {log.heart_rate && (
                <View style={styles.healthMetricCard}>
                  <Text style={styles.healthMetricIcon}>💓</Text>
                  <Text style={styles.healthMetricValue}>{log.heart_rate}</Text>
                  <Text style={styles.healthMetricUnit}>bpm</Text>
                  <Text style={styles.healthMetricLabel}>Heart Rate</Text>
                </View>
              )}
              {log.sugar_intake && (
                <View style={styles.healthMetricCard}>
                  <Text style={styles.healthMetricIcon}>🍬</Text>
                  <Text style={styles.healthMetricValue}>{log.sugar_intake}</Text>
                  <Text style={styles.healthMetricUnit}>grams</Text>
                  <Text style={styles.healthMetricLabel}>Sugar Intake</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* AI Analysis */}
        {aiReport && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🤖 AI Analysis</Text>
            
            {/* Status Badge */}
            <View style={[styles.aiStatusBadge, { backgroundColor: anomalyColor + '15', borderColor: anomalyColor }]}>
              <Text style={styles.aiStatusIcon}>
                {getAnomalyIcon(aiReport.is_anomaly, aiReport.anomaly_type)}
              </Text>
              <View style={styles.aiStatusContent}>
                <Text style={[styles.aiStatusTitle, { color: anomalyColor }]}>
                  {aiReport.is_anomaly ? 'Anomaly Detected' : 'Normal Pattern'}
                </Text>
                <Text style={styles.aiStatusType}>
                  {aiReport.anomaly_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Normal'}
                </Text>
              </View>
              <View style={[styles.confidenceBadge, { backgroundColor: anomalyColor }]}>
                <Text style={styles.confidenceText}>
                  {(aiReport.confidence_score * 100).toFixed(0)}%
                </Text>
              </View>
            </View>

            {/* Recommendations */}
            {aiReport.recommendations && aiReport.recommendations.length > 0 && (
              <View style={styles.recommendationsContainer}>
                <Text style={styles.recommendationsTitle}>💡 Recommendations</Text>
                {aiReport.recommendations.map((rec: string, index: number) => (
                  <View key={index} style={styles.recommendationItem}>
                    <View style={styles.recommendationBullet}>
                      <Text style={styles.recommendationNumber}>{index + 1}</Text>
                    </View>
                    <Text style={styles.recommendationText}>{rec}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Enhanced Recommendations */}
            {aiReport.enhanced_recommendations && aiReport.enhanced_recommendations.length > 0 && (
              <View style={styles.enhancedContainer}>
                <Text style={styles.enhancedTitle}>🎯 Action Plan</Text>
                {aiReport.enhanced_recommendations.slice(0, 3).map((rec: any, index: number) => (
                  <View key={index} style={styles.enhancedItem}>
                    <View style={styles.enhancedHeader}>
                      <Text style={styles.enhancedCategory}>
                        {rec.category?.toUpperCase() || 'GENERAL'}
                      </Text>
                      <Text style={styles.enhancedPriority}>{rec.priority || 'medium'}</Text>
                    </View>
                    <Text style={styles.enhancedItemTitle}>{rec.title}</Text>
                    <Text style={styles.enhancedItemDesc}>{rec.description}</Text>
                    {rec.actions && rec.actions.length > 0 && (
                      <View style={styles.actionsContainer}>
                        {rec.actions.slice(0, 2).map((action: string, i: number) => (
                          <Text key={i} style={styles.actionText}>• {action}</Text>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* No AI Report */}
        {!aiReport && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🤖 AI Analysis</Text>
            <View style={styles.noAiContainer}>
              <Text style={styles.noAiIcon}>📊</Text>
              <Text style={styles.noAiText}>
                No AI analysis available for this log yet.
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#64748b',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dateHeader: {
    backgroundColor: '#6366f1',
    padding: 20,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  logIdText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 0,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    width: '30%',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  metricCardIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  metricCardValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  metricCardLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
  },
  metricCardSublabel: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  scheduleRow: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
  },
  scheduleItem: {
    flex: 1,
    alignItems: 'center',
  },
  scheduleDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 16,
  },
  scheduleIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  scheduleLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  scheduleValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  mealsContainer: {
    marginTop: 16,
  },
  mealsLabel: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 8,
  },
  mealTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mealTag: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  mealTagText: {
    fontSize: 13,
    color: '#4338ca',
    fontWeight: '500',
  },
  healthMetricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  healthMetricCard: {
    flex: 1,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  healthMetricIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  healthMetricValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#dc2626',
  },
  healthMetricUnit: {
    fontSize: 12,
    color: '#64748b',
  },
  healthMetricLabel: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  aiStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  aiStatusIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  aiStatusContent: {
    flex: 1,
  },
  aiStatusTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  aiStatusType: {
    fontSize: 13,
    color: '#64748b',
  },
  confidenceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  confidenceText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  recommendationsContainer: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 12,
  },
  recommendationItem: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  recommendationBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  recommendationNumber: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: '#166534',
    lineHeight: 20,
  },
  enhancedContainer: {
    backgroundColor: '#f5f3ff',
    borderRadius: 12,
    padding: 16,
  },
  enhancedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5b21b6',
    marginBottom: 12,
  },
  enhancedItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  enhancedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  enhancedCategory: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7c3aed',
    backgroundColor: '#ede9fe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  enhancedPriority: {
    fontSize: 10,
    color: '#64748b',
    textTransform: 'capitalize',
  },
  enhancedItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  enhancedItemDesc: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  actionsContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  actionText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 4,
  },
  noAiContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  noAiIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  noAiText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
});

