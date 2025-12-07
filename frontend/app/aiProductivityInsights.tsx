import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import aiProductivityCoach from './services/aiProductivityCoach';
import screenTimeMonitor from './services/screenTimeMonitor';
import type { AIProductivityInsight, AICoachSettings } from './services/aiProductivityCoach';
import { getAICoachTips, AICoachTip, AICoachResponse } from './api/aiInsightsService';
import { fetchAiHeartbeat, AiHeartbeatResponse } from './api/heartbeat';
import aiWakeupService, { AIServiceStatus } from './services/aiWakeupService';

type AIProductivityInsightsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'AIProductivityInsights'
>;

interface Props {
  navigation: AIProductivityInsightsScreenNavigationProp;
}

export default function AIProductivityInsights({ navigation }: Props) {
  const [insights, setInsights] = useState<AIProductivityInsight[]>([]);
  const [settings, setSettings] = useState<AICoachSettings | null>(null);
  const [screenTimeProgress, setScreenTimeProgress] = useState<{
    used: number;
    limit: number;
    percent: number;
  } | null>(null);
  const [streak, setStreak] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Backend AI data states
  const [heartbeat, setHeartbeat] = useState<AiHeartbeatResponse | null>(null);
  const [aiCoachData, setAiCoachData] = useState<AICoachResponse | null>(null);
  const [backendTips, setBackendTips] = useState<AICoachTip[]>([]);
  
  // AI Service wake-up state
  const [aiServiceStatus, setAiServiceStatus] = useState<AIServiceStatus>({
    isAvailable: false,
    isWakingUp: false,
    lastChecked: null,
    retryCount: 0,
  });

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let isMounted = true;
    
    try {
      // Subscribe to AI service status updates
      unsubscribe = aiWakeupService.subscribeToStatus((status) => {
        if (!isMounted) return;
        
        try {
          setAiServiceStatus(status);
          
          // If service just became available, update heartbeat
          if (status.isAvailable && status.greeting) {
            setHeartbeat({
              status: 'ok',
              timestamp: new Date().toISOString(),
              greeting: status.greeting,
            });
          }
        } catch (error) {
          console.error('Error handling AI service status update:', error);
        }
      });

      // Load data first, then start background polling
      loadData().finally(() => {
        if (isMounted) {
          try {
            aiWakeupService.startBackgroundPolling();
          } catch (error) {
            console.error('Error starting background polling:', error);
          }
        }
      });
    } catch (error) {
      console.error('Error initializing AI productivity insights:', error);
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
      if (unsubscribe) {
        try {
          unsubscribe();
        } catch (error) {
          console.error('Error unsubscribing from AI service status:', error);
        }
      }
      // Don't stop polling on unmount - keep service warm
    };
  }, []);

  const loadData = async () => {
    try {
      // Load AI heartbeat first (shows greeting)
      try {
        const heartbeatData = await fetchAiHeartbeat();
        setHeartbeat(heartbeatData);
        console.log('✅ AI Heartbeat:', heartbeatData.status, heartbeatData.greeting);
        
        // If AI service is not available, trigger wake-up
        if (heartbeatData.status !== 'ok') {
          console.log('🌅 AI service not ready, triggering wake-up...');
          try {
            aiWakeupService.wakeUpAIService().catch(() => {});
          } catch (e) {
            console.log('Wake-up call failed');
          }
        }
      } catch (error) {
        console.log('⚠️ Could not fetch AI heartbeat, triggering wake-up:', error);
        try {
          aiWakeupService.wakeUpAIService().catch(() => {});
        } catch (e) {
          console.log('Wake-up call failed');
        }
      }

      // Load AI coach tips from backend
      try {
        const coachData = await getAICoachTips('week');
        setAiCoachData(coachData);
        setBackendTips(coachData.tips);
        console.log('✅ AI Coach tips loaded:', coachData.tips.length);
      } catch (error) {
        console.log('⚠️ Could not fetch AI Coach tips:', error);
      }

      // Load local AI coach settings
      const coachSettings = await aiProductivityCoach.loadAICoachSettings();
      setSettings(coachSettings);

      // Load cached local insights
      const cachedInsights = await aiProductivityCoach.getCachedInsights();
      setInsights(cachedInsights);

      // Load screen time data
      const todayScreenTime = await screenTimeMonitor.getTodayScreenTime();
      const screenTimeGoals = await screenTimeMonitor.loadScreenTimeGoals();

      if (todayScreenTime) {
        const limitMinutes = screenTimeGoals.socialMediaDailyLimit * 60;
        setScreenTimeProgress({
          used: todayScreenTime.totalSocialMediaTime,
          limit: limitMinutes,
          percent: todayScreenTime.totalSocialMediaTime / limitMinutes,
        });
      }

      // Load streak
      const currentStreak = await screenTimeMonitor.calculateScreenTimeStreak();
      setStreak(currentStreak);
    } catch (error) {
      console.error('Error loading AI productivity data:', error);
      Alert.alert('Error', 'Failed to load productivity insights');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Trigger new AI check
      await aiProductivityCoach.runAIProductivityCheck();
      await loadData();
    } catch (error) {
      console.error('Error refreshing insights:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleAcknowledgeInsight = async (insightId: string) => {
    try {
      await aiProductivityCoach.acknowledgeInsight(insightId);
      await loadData(); // Refresh to show updated state
    } catch (error) {
      console.error('Error acknowledging insight:', error);
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 5) return '#ef4444';
    if (priority >= 4) return '#f97316';
    if (priority >= 3) return '#eab308';
    return '#22c55e';
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 5) return 'Critical';
    if (priority >= 4) return 'High';
    if (priority >= 3) return 'Medium';
    return 'Low';
  };

  const getCategoryIcon = (category: AIProductivityInsight['category']) => {
    const icons = {
      screen_time: '📱',
      sleep: '😴',
      exercise: '🏃',
      stress: '😰',
      overall: '🎯',
    };
    return icons[category] || '💡';
  };

  const getImpactColor = (impact: string) => {
    switch (impact.toLowerCase()) {
      case 'high': return '#dc2626';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const renderScreenTimeProgress = () => {
    if (!screenTimeProgress) return null;

    const { used, limit, percent } = screenTimeProgress;
    const usedHours = Math.floor(used / 60);
    const usedMinutes = Math.round(used % 60);
    const limitHours = Math.floor(limit / 60);

    return (
      <View style={styles.card}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>📱 Today's Screen Time</Text>
          {streak > 0 && (
            <View style={styles.streakBadge}>
              <Text style={styles.streakText}>🔥 {streak} day streak</Text>
            </View>
          )}
        </View>

        <View style={styles.timeDisplay}>
          <Text style={styles.timeUsed}>
            {usedHours}h {usedMinutes}m
          </Text>
          <Text style={styles.timeLimit}>of {limitHours}h limit</Text>
        </View>

        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${Math.min(percent * 100, 100)}%`,
                backgroundColor:
                  percent >= 1 ? '#ef4444' : percent >= 0.9 ? '#f97316' : percent >= 0.75 ? '#eab308' : '#22c55e',
              },
            ]}
          />
        </View>

        <Text style={styles.progressPercent}>
          {Math.round(percent * 100)}% used
        </Text>
      </View>
    );
  };

  const renderInsightCard = (insight: AIProductivityInsight) => {
    const isNew = !insight.acknowledged;

    return (
      <View
        key={insight.id}
        style={[
          styles.insightCard,
          { borderLeftColor: getPriorityColor(insight.priority) },
          isNew && styles.newInsightCard,
        ]}
      >
        <View style={styles.insightHeader}>
          <View style={styles.insightTitleRow}>
            <Text style={styles.categoryIcon}>{getCategoryIcon(insight.category)}</Text>
            <Text style={styles.insightTitle}>{insight.title}</Text>
          </View>
          <View style={styles.insightBadges}>
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(insight.priority) }]}>
              <Text style={styles.priorityBadgeText}>{getPriorityLabel(insight.priority)}</Text>
            </View>
            {insight.timeSensitive && (
              <View style={styles.urgentBadge}>
                <Text style={styles.urgentBadgeText}>⏰</Text>
              </View>
            )}
            {isNew && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NEW</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={styles.insightDescription}>{insight.description}</Text>

        <View style={styles.insightFooter}>
          <View style={styles.insightMetadata}>
            <View style={[styles.impactBadge, { backgroundColor: getImpactColor(insight.estimatedImpact) + '20' }]}>
              <Text style={[styles.impactText, { color: getImpactColor(insight.estimatedImpact) }]}>
                {insight.estimatedImpact.toUpperCase()} IMPACT
              </Text>
            </View>
            <Text style={styles.insightTime}>
              {new Date(insight.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>

          {insight.action && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleAcknowledgeInsight(insight.id)}
              disabled={insight.acknowledged}
            >
              <Text style={styles.actionButtonText}>
                {insight.acknowledged ? '✓ Done' : insight.action}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🤖</Text>
      <Text style={styles.emptyTitle}>No Insights Yet</Text>
      <Text style={styles.emptyDescription}>
        The AI Productivity Coach needs a few days of data to start generating personalized insights.
      </Text>
      <Text style={styles.emptyDescription}>
        Keep logging your routine and the AI will analyze your patterns to provide helpful recommendations!
      </Text>
      <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
        <Text style={styles.refreshButtonText}>Check for Insights</Text>
      </TouchableOpacity>
    </View>
  );

  const unacknowledgedCount = insights.filter((i) => !i.acknowledged).length;
  const sortedInsights = [...insights].sort((a, b) => {
    if (a.acknowledged !== b.acknowledged) return a.acknowledged ? 1 : -1;
    return b.priority - a.priority;
  });

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>AI Productivity Coach</Text>
            {unacknowledgedCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{unacknowledgedCount}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.settingsButtonText}>⚙️</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* AI Service Status Card */}
          {aiServiceStatus.isWakingUp && aiServiceStatus.retryCount > 0 ? (
            // Show waking up indicator - only when actually waking up with retries
            <View style={[styles.greetingCard, styles.greetingCardWakingUp]}>
              <ActivityIndicator size="small" color="#7c3aed" style={styles.wakingUpSpinner} />
              <View style={styles.greetingContent}>
                <Text style={styles.greetingText}>
                  🌅 Waking up AI service... (attempt {aiServiceStatus.retryCount}/20)
                </Text>
                <Text style={styles.wakingUpSubtext}>
                  Free tier servers take 30-60 seconds to start. Please wait...
                </Text>
                <View style={styles.wakeupProgressContainer}>
                  <View 
                    style={[
                      styles.wakeupProgressBar, 
                      { width: `${Math.min(aiServiceStatus.retryCount * 5, 100)}%` }
                    ]} 
                  />
                </View>
              </View>
            </View>
          ) : heartbeat ? (
            // Show normal greeting card
            <View style={[
              styles.greetingCard,
              heartbeat.status === 'ok' ? styles.greetingCardOk : styles.greetingCardUnreachable
            ]}>
              <Text style={styles.greetingIcon}>
                {heartbeat.status === 'ok' ? '🤖' : '⚠️'}
              </Text>
              <View style={styles.greetingContent}>
                <Text style={styles.greetingText}>{heartbeat.greeting}</Text>
                {aiCoachData && (
                  <View style={styles.scoreRow}>
                    <Text style={styles.scoreLabel}>Wellness Score:</Text>
                    <Text style={[
                      styles.scoreValue,
                      aiCoachData.overallScore >= 80 ? styles.scoreGood :
                      aiCoachData.overallScore >= 60 ? styles.scoreOk : styles.scoreLow
                    ]}>
                      {aiCoachData.overallScore}%
                    </Text>
                    <Text style={styles.trendBadge}>
                      {aiCoachData.trend === 'improving' ? '📈' : 
                       aiCoachData.trend === 'declining' ? '📉' : '➡️'}
                    </Text>
                  </View>
                )}
                {heartbeat.status === 'ok' && (
                  <Text style={styles.aiStatusOk}>✓ AI service connected</Text>
                )}
              </View>
            </View>
          ) : null}
          
          {renderScreenTimeProgress()}

          {!settings?.enabled && (
            <View style={styles.disabledCard}>
              <Text style={styles.disabledIcon}>⏸️</Text>
              <Text style={styles.disabledTitle}>AI Coach Disabled</Text>
              <Text style={styles.disabledDescription}>
                Enable the AI Productivity Coach in settings to receive personalized productivity insights.
              </Text>
              <TouchableOpacity
                style={styles.enableButton}
                onPress={() => navigation.navigate('Settings')}
              >
                <Text style={styles.enableButtonText}>Go to Settings</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Backend AI Tips Section */}
          {backendTips.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🎯 AI Coach Recommendations</Text>
                <Text style={styles.sectionSubtitle}>
                  Personalized tips based on your weekly patterns
                </Text>
              </View>

              {backendTips.map((tip, index) => (
                <View key={tip.id || index} style={styles.backendTipCard}>
                  <View style={styles.tipHeader}>
                    <Text style={styles.tipIcon}>
                      {tip.category === 'sleep' ? '😴' :
                       tip.category === 'exercise' ? '🏃' :
                       tip.category === 'stress' ? '😰' :
                       tip.category === 'nutrition' ? '🍎' :
                       tip.category === 'screen_time' ? '📱' : '💡'}
                    </Text>
                    <Text style={styles.tipTitle}>{tip.title}</Text>
                    <View style={[
                      styles.tipPriorityBadge,
                      tip.priority === 'high' ? styles.priorityHigh :
                      tip.priority === 'medium' ? styles.priorityMedium : styles.priorityLow
                    ]}>
                      <Text style={styles.tipPriorityText}>
                        {tip.priority.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.tipMessage}>{tip.message}</Text>
                  {tip.suggestedAction && (
                    <View style={styles.tipActionContainer}>
                      <Text style={styles.tipActionLabel}>Suggested Action:</Text>
                      <Text style={styles.tipActionText}>{tip.suggestedAction}</Text>
                    </View>
                  )}
                </View>
              ))}
            </>
          )}

          {settings?.enabled && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {unacknowledgedCount > 0 ? '🔔 New Insights' : '📋 Recent Insights'}
                </Text>
                <Text style={styles.sectionSubtitle}>
                  AI analyzes your patterns every {settings.checkInterval} hours
                </Text>
              </View>

              {insights.length === 0 ? renderEmptyState() : sortedInsights.map(renderInsightCard)}
            </>
          )}

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>💡 How It Works</Text>
            <Text style={styles.infoText}>
              The AI Productivity Coach monitors your screen time and routine data to provide timely,
              personalized interventions. It learns your patterns and sends recommendations when they can have
              the most impact.
            </Text>
            <Text style={styles.infoText}>
              {'\n'}Insights are generated automatically every {settings?.checkInterval || 2} hours based on your:
            </Text>
            <Text style={styles.infoText}>• Screen time usage{'\n'}• Sleep patterns{'\n'}• Exercise levels{'\n'}• Stress levels{'\n'}• Personal goals</Text>
          </View>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

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
  headerTextContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  notificationBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsButtonText: {
    fontSize: 20,
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
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  streakBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78350f',
  },
  timeDisplay: {
    alignItems: 'center',
    marginBottom: 16,
  },
  timeUsed: {
    fontSize: 36,
    fontWeight: '700',
    color: '#1e293b',
  },
  timeLimit: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: '#e2e8f0',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 6,
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  insightCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  newInsightCard: {
    shadowColor: '#7c3aed',
    shadowOpacity: 0.15,
    elevation: 3,
  },
  insightHeader: {
    marginBottom: 12,
  },
  insightTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  insightTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  insightBadges: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  priorityBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  urgentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#fbbf24',
  },
  urgentBadgeText: {
    fontSize: 11,
  },
  newBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#7c3aed',
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  insightDescription: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 12,
  },
  insightFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  insightMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  impactBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  impactText: {
    fontSize: 10,
    fontWeight: '700',
  },
  insightTime: {
    fontSize: 12,
    color: '#94a3b8',
  },
  actionButton: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  refreshButton: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  disabledIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  disabledTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  disabledDescription: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  enableButton: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  enableButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
  // AI Greeting Card Styles
  greetingCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  greetingCardOk: {
    backgroundColor: '#f0fdf4',
    borderLeftWidth: 4,
    borderLeftColor: '#22c55e',
  },
  greetingCardUnreachable: {
    backgroundColor: '#fff7ed',
    borderLeftWidth: 4,
    borderLeftColor: '#f97316',
  },
  greetingCardWakingUp: {
    backgroundColor: '#faf5ff',
    borderLeftWidth: 4,
    borderLeftColor: '#7c3aed',
  },
  wakingUpSpinner: {
    marginRight: 12,
    marginTop: 4,
  },
  wakingUpSubtext: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  wakeupProgressContainer: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  wakeupProgressBar: {
    height: '100%',
    backgroundColor: '#7c3aed',
    borderRadius: 3,
  },
  aiStatusOk: {
    fontSize: 12,
    color: '#22c55e',
    marginTop: 4,
    fontWeight: '500',
  },
  greetingIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  greetingContent: {
    flex: 1,
  },
  greetingText: {
    fontSize: 16,
    color: '#1e293b',
    lineHeight: 22,
    marginBottom: 8,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  scoreLabel: {
    fontSize: 14,
    color: '#64748b',
    marginRight: 8,
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: '700',
    marginRight: 8,
  },
  scoreGood: {
    color: '#22c55e',
  },
  scoreOk: {
    color: '#f59e0b',
  },
  scoreLow: {
    color: '#ef4444',
  },
  trendBadge: {
    fontSize: 16,
  },
  // Backend Tip Card Styles
  backendTipCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#7c3aed',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  tipIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  tipTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  tipPriorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityHigh: {
    backgroundColor: '#fee2e2',
  },
  priorityMedium: {
    backgroundColor: '#fef3c7',
  },
  priorityLow: {
    backgroundColor: '#d1fae5',
  },
  tipPriorityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  tipMessage: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 8,
  },
  tipActionContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  tipActionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7c3aed',
    marginBottom: 4,
  },
  tipActionText: {
    fontSize: 14,
    color: '#1e293b',
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
    color: '#fff',
  },
});
