import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation';

type AIInsightsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AIInsights'>;
type AIInsightsScreenRouteProp = RouteProp<RootStackParamList, 'AIInsights'>;

interface Props {
  navigation: AIInsightsScreenNavigationProp;
  route: AIInsightsScreenRouteProp;
}

interface EnhancedRecommendation {
  type: string;
  title: string;
  description: string;
  priority: number;
  context: string;
  estimated_impact: string;
  time_sensitive: boolean;
  action_url?: string | null;
}

interface DriftScore {
  z_score: number;
  p_value: number | null;
  drift_score: number;
  baseline_mean: number;
  recent_mean: number;
}

interface BaselineComparison {
  current: number;
  baseline_mean: number;
  baseline_std: number;
}

interface AIResponse {
  is_anomaly: boolean;
  confidence_score: number;
  anomaly_type: string;
  recommendations: string[];
  enhanced_recommendations: EnhancedRecommendation[];
  behavioral_contexts: string[];
  timestamp: string;
  drift_analysis: {
    drift_detected: boolean;
    confidence: number | null;
    drift_type: string;
    drift_scores: Record<string, DriftScore>;
    avg_drift_score: number | null;
    baseline_comparison: Record<string, BaselineComparison>;
  };
  baseline_comparison: Record<string, BaselineComparison>;
}

const { width } = Dimensions.get('window');

export default function AIInsights({ navigation, route }: Props) {
  const { aiResponse, logId, userId } = route.params as { aiResponse: AIResponse; logId: number; userId: string };

  const getPriorityColor = (priority: number) => {
    if (priority >= 5) return '#ef4444'; // Red - Critical
    if (priority >= 4) return '#f97316'; // Orange - High
    if (priority >= 3) return '#eab308'; // Yellow - Medium
    return '#22c55e'; // Green - Low
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 5) return 'Critical';
    if (priority >= 4) return 'High';
    if (priority >= 3) return 'Medium';
    return 'Low';
  };

  const getImpactEmoji = (impact: string) => {
    switch (impact.toLowerCase()) {
      case 'high': return '🔥';
      case 'medium': return '⚡';
      case 'low': return '💡';
      default: return '📊';
    }
  };

  const formatBehavioralContext = (context: string) => {
    return context
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getMetricEmoji = (metric: string) => {
    const emojiMap: Record<string, string> = {
      sleep_hours: '😴',
      screen_time: '📱',
      exercise_duration: '🏃',
      water_intake: '💧',
      stress_level: '😰',
      health_score: '❤️',
    };
    return emojiMap[metric] || '📊';
  };

  const formatMetricName = (metric: string) => {
    return metric
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const renderAnomalyHeader = () => (
    <View style={[styles.card, aiResponse.is_anomaly ? styles.anomalyCard : styles.healthyCard]}>
      <View style={styles.anomalyHeader}>
        <Text style={styles.anomalyIcon}>{aiResponse.is_anomaly ? '⚠️' : '✅'}</Text>
        <View style={styles.anomalyTextContainer}>
          <Text style={styles.anomalyTitle}>
            {aiResponse.is_anomaly ? 'Anomaly Detected' : 'Healthy Pattern'}
          </Text>
          <Text style={styles.anomalyType}>
            Type: {formatBehavioralContext(aiResponse.anomaly_type)}
          </Text>
        </View>
      </View>
      
      <View style={styles.confidenceContainer}>
        <Text style={styles.confidenceLabel}>Confidence</Text>
        <View style={styles.confidenceBarContainer}>
          <View 
            style={[
              styles.confidenceBar, 
              { width: `${aiResponse.confidence_score * 100}%` }
            ]} 
          />
        </View>
        <Text style={styles.confidenceValue}>
          {(aiResponse.confidence_score * 100).toFixed(1)}%
        </Text>
      </View>

      <Text style={styles.timestamp}>
        Analyzed: {new Date(aiResponse.timestamp).toLocaleString()}
      </Text>
    </View>
  );

  const renderRecommendations = () => (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>📋 Recommendations</Text>
      <Text style={styles.sectionDescription}>
        AI-generated insights based on your health patterns
      </Text>
      
      {aiResponse.recommendations.map((recommendation, index) => (
        <View key={index} style={styles.recommendationItem}>
          <Text style={styles.recommendationBullet}>•</Text>
          <Text style={styles.recommendationText}>{recommendation}</Text>
        </View>
      ))}
    </View>
  );

  const renderEnhancedRecommendations = () => {
    if (!aiResponse.enhanced_recommendations || aiResponse.enhanced_recommendations.length === 0) {
      return null;
    }

    // Sort by priority (highest first)
    const sortedRecommendations = [...aiResponse.enhanced_recommendations].sort(
      (a, b) => b.priority - a.priority
    );

    return (
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>⚡ Priority Actions</Text>
        <Text style={styles.sectionDescription}>
          Actionable steps ranked by impact and urgency
        </Text>
        
        {sortedRecommendations.map((rec, index) => (
          <View 
            key={index} 
            style={[
              styles.enhancedRecommendationCard,
              { borderLeftColor: getPriorityColor(rec.priority) }
            ]}
          >
            <View style={styles.enhancedHeader}>
              <View style={styles.enhancedTitleRow}>
                <Text style={styles.enhancedIcon}>
                  {getImpactEmoji(rec.estimated_impact)}
                </Text>
                <Text style={styles.enhancedTitle}>{rec.title}</Text>
              </View>
              <View style={styles.badgeContainer}>
                <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(rec.priority) }]}>
                  <Text style={styles.priorityBadgeText}>
                    {getPriorityLabel(rec.priority)}
                  </Text>
                </View>
                {rec.time_sensitive && (
                  <View style={styles.timeSensitiveBadge}>
                    <Text style={styles.timeSensitiveBadgeText}>⏰ Urgent</Text>
                  </View>
                )}
              </View>
            </View>
            
            <Text style={styles.enhancedDescription}>{rec.description}</Text>
            
            <View style={styles.enhancedFooter}>
              <Text style={styles.enhancedContext}>💡 {rec.context}</Text>
              <Text style={styles.enhancedImpact}>
                Impact: <Text style={styles.enhancedImpactValue}>{rec.estimated_impact}</Text>
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderBehavioralContexts = () => {
    if (!aiResponse.behavioral_contexts || aiResponse.behavioral_contexts.length === 0) {
      return null;
    }

    return (
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>🏷️ Behavioral Patterns</Text>
        <Text style={styles.sectionDescription}>
          Detected patterns in your routine
        </Text>
        
        <View style={styles.tagsContainer}>
          {aiResponse.behavioral_contexts.map((context, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{formatBehavioralContext(context)}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderDriftAnalysis = () => {
    const drift = aiResponse.drift_analysis;
    if (!drift) return null;

    const driftScores = Object.entries(drift.drift_scores || {});
    const hasSignificantDrift = driftScores.some(([_, score]) => 
      score.drift_score && score.drift_score > 0.3
    );

    return (
      <View style={styles.card}>
        <View style={styles.driftHeader}>
          <Text style={styles.sectionTitle}>📊 Drift Detection</Text>
          <View style={[
            styles.driftStatusBadge, 
            drift.drift_detected ? styles.driftDetectedBadge : styles.noDriftBadge
          ]}>
            <Text style={styles.driftStatusText}>
              {drift.drift_detected ? '⚠️ Drift Detected' : '✅ No Drift'}
            </Text>
          </View>
        </View>
        
        <Text style={styles.sectionDescription}>
          Drift detection analyzes changes in your patterns over time. More data = better accuracy.
        </Text>

        {drift.drift_type !== 'no_drift' && (
          <View style={styles.driftTypeContainer}>
            <Text style={styles.driftTypeLabel}>Drift Type:</Text>
            <Text style={styles.driftTypeValue}>{formatBehavioralContext(drift.drift_type)}</Text>
          </View>
        )}

        {driftScores.length > 0 && (
          <View style={styles.metricsContainer}>
            <Text style={styles.metricsTitle}>Metric Analysis</Text>
            {driftScores.map(([metric, score]) => {
              const isDrifting = score.drift_score && score.drift_score > 0.3;
              const change = score.recent_mean - score.baseline_mean;
              const changePercent = score.baseline_mean !== 0 
                ? ((change / score.baseline_mean) * 100).toFixed(1)
                : '0.0';

              return (
                <View key={metric} style={styles.metricItem}>
                  <View style={styles.metricHeader}>
                    <Text style={styles.metricIcon}>{getMetricEmoji(metric)}</Text>
                    <Text style={styles.metricName}>{formatMetricName(metric)}</Text>
                    {isDrifting && (
                      <View style={styles.driftingBadge}>
                        <Text style={styles.driftingBadgeText}>Drifting</Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.metricDetails}>
                    <View style={styles.metricRow}>
                      <Text style={styles.metricLabel}>Baseline:</Text>
                      <Text style={styles.metricValue}>{score.baseline_mean.toFixed(2)}</Text>
                    </View>
                    <View style={styles.metricRow}>
                      <Text style={styles.metricLabel}>Recent:</Text>
                      <Text style={[
                        styles.metricValue,
                        change > 0 ? styles.metricIncrease : styles.metricDecrease
                      ]}>
                        {score.recent_mean.toFixed(2)} ({change > 0 ? '+' : ''}{changePercent}%)
                      </Text>
                    </View>
                    {score.drift_score !== null && (
                      <View style={styles.metricRow}>
                        <Text style={styles.metricLabel}>Drift Score:</Text>
                        <View style={styles.driftScoreBar}>
                          <View 
                            style={[
                              styles.driftScoreFill,
                              { 
                                width: `${Math.min(score.drift_score * 100, 100)}%`,
                                backgroundColor: score.drift_score > 0.3 ? '#ef4444' : '#22c55e'
                              }
                            ]} 
                          />
                        </View>
                        <Text style={styles.metricValue}>{score.drift_score.toFixed(2)}</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.driftInfoBox}>
          <Text style={styles.driftInfoIcon}>💡</Text>
          <Text style={styles.driftInfoText}>
            Drift detection becomes more accurate as you log more data. With {driftScores.length} metrics tracked, 
            the AI learns your patterns and can detect subtle changes in your routine that might affect your health.
          </Text>
        </View>
      </View>
    );
  };

  const renderBaselineComparison = () => {
    const baseline = aiResponse.baseline_comparison;
    if (!baseline || Object.keys(baseline).length === 0) return null;

    return (
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>📈 Baseline Comparison</Text>
        <Text style={styles.sectionDescription}>
          How your current routine compares to your historical average
        </Text>

        {Object.entries(baseline).map(([metric, comparison]) => {
          const change = comparison.current - comparison.baseline_mean;
          const changePercent = comparison.baseline_mean !== 0
            ? ((change / comparison.baseline_mean) * 100).toFixed(1)
            : '0.0';
          const isPositiveChange = change > 0;

          return (
            <View key={metric} style={styles.baselineItem}>
              <View style={styles.baselineHeader}>
                <Text style={styles.metricIcon}>{getMetricEmoji(metric)}</Text>
                <Text style={styles.baselineName}>{formatMetricName(metric)}</Text>
              </View>
              
              <View style={styles.baselineComparison}>
                <View style={styles.baselineBar}>
                  <View 
                    style={[
                      styles.baselineFill,
                      { width: `${(comparison.current / (comparison.baseline_mean * 2)) * 100}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.baselineValue}>
                  {comparison.current.toFixed(2)}
                </Text>
              </View>
              
              <View style={styles.baselineStats}>
                <Text style={styles.baselineStat}>
                  Avg: {comparison.baseline_mean.toFixed(2)}
                </Text>
                <Text style={[
                  styles.baselineChange,
                  isPositiveChange ? styles.positiveChange : styles.negativeChange
                ]}>
                  {isPositiveChange ? '▲' : '▼'} {Math.abs(parseFloat(changePercent))}%
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AI Insights</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          {renderAnomalyHeader()}
          {renderRecommendations()}
          {renderEnhancedRecommendations()}
          {renderBehavioralContexts()}
          {renderDriftAnalysis()}
          {renderBaselineComparison()}

          <View style={styles.card}>
            <Text style={styles.infoTitle}>🤖 About AI Analysis</Text>
            <Text style={styles.infoText}>
              Our AI continuously learns from your health data to provide personalized insights. 
              As you log more data, the drift detection becomes more accurate at identifying 
              subtle changes in your routine that might impact your wellbeing.
            </Text>
            <Text style={styles.infoText}>
              {'\n'}The more consistent you are with logging, the better the AI can help you 
              maintain healthy habits and catch potential issues early.
            </Text>
          </View>
        </View>

        {/* Bottom Navigation Spacer */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navTab} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navTab} onPress={() => navigation.navigate('UserDashboard')}>
          <Text style={styles.navIcon}>📊</Text>
          <Text style={styles.navLabel}>Dashboard</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.centerNavButton} onPress={() => navigation.navigate('DataImport', {})}>
          <View style={styles.centerNavButtonInner}>
            <Text style={styles.centerNavIcon}>+</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navTab} onPress={() => navigation.navigate('DataVisualization', {})}>
          <Text style={styles.navIcon}>📈</Text>
          <Text style={styles.navLabel}>Data</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navTab} onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.navIcon}>⚙️</Text>
          <Text style={styles.navLabel}>Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
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
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  placeholder: {
    width: 40,
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  anomalyCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  healthyCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#22c55e',
  },
  anomalyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  anomalyIcon: {
    fontSize: 48,
    marginRight: 16,
  },
  anomalyTextContainer: {
    flex: 1,
  },
  anomalyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  anomalyType: {
    fontSize: 14,
    color: '#64748b',
  },
  confidenceContainer: {
    marginTop: 12,
  },
  confidenceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  confidenceBarContainer: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  confidenceBar: {
    height: '100%',
    backgroundColor: '#7c3aed',
    borderRadius: 4,
  },
  confidenceValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#7c3aed',
    textAlign: 'right',
  },
  timestamp: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 12,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
    lineHeight: 20,
  },
  recommendationItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  recommendationBullet: {
    fontSize: 16,
    color: '#7c3aed',
    marginRight: 8,
    fontWeight: '700',
  },
  recommendationText: {
    flex: 1,
    fontSize: 15,
    color: '#334155',
    lineHeight: 22,
  },
  enhancedRecommendationCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  enhancedHeader: {
    marginBottom: 12,
  },
  enhancedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  enhancedIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  enhancedTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  timeSensitiveBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#fbbf24',
  },
  timeSensitiveBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  enhancedDescription: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 12,
  },
  enhancedFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  enhancedContext: {
    fontSize: 12,
    color: '#64748b',
    flex: 1,
  },
  enhancedImpact: {
    fontSize: 12,
    color: '#64748b',
  },
  enhancedImpactValue: {
    fontWeight: '600',
    color: '#1e293b',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 14,
    color: '#7c3aed',
    fontWeight: '600',
  },
  driftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  driftStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  driftDetectedBadge: {
    backgroundColor: '#fee2e2',
  },
  noDriftBadge: {
    backgroundColor: '#dcfce7',
  },
  driftStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  driftTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
  },
  driftTypeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#78350f',
    marginRight: 8,
  },
  driftTypeValue: {
    fontSize: 14,
    color: '#78350f',
  },
  metricsContainer: {
    marginTop: 16,
  },
  metricsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  metricItem: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  metricName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  driftingBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  driftingBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#dc2626',
  },
  metricDetails: {
    marginLeft: 28,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  metricLabel: {
    fontSize: 12,
    color: '#64748b',
    width: 80,
  },
  metricValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  metricIncrease: {
    color: '#16a34a',
  },
  metricDecrease: {
    color: '#dc2626',
  },
  driftScoreBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    overflow: 'hidden',
    marginRight: 8,
  },
  driftScoreFill: {
    height: '100%',
    borderRadius: 2,
  },
  driftInfoBox: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  driftInfoIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  driftInfoText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
  baselineItem: {
    marginBottom: 16,
  },
  baselineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  baselineName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  baselineComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  baselineBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 8,
  },
  baselineFill: {
    height: '100%',
    backgroundColor: '#7c3aed',
    borderRadius: 4,
  },
  baselineValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7c3aed',
    width: 60,
    textAlign: 'right',
  },
  baselineStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginLeft: 28,
  },
  baselineStat: {
    fontSize: 12,
    color: '#64748b',
  },
  baselineChange: {
    fontSize: 12,
    fontWeight: '600',
  },
  positiveChange: {
    color: '#16a34a',
  },
  negativeChange: {
    color: '#dc2626',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  navTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  navIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  navLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  centerNavButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
  centerNavButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  centerNavIcon: {
    fontSize: 28,
  },
});

