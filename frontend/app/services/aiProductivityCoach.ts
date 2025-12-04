/**
 * AI-Powered Productivity Coach
 *
 * Integrates screen time monitoring with AI service to provide
 * personalized, intelligent interventions that boost productivity
 * and engagement with the AI service.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import apiClient from '../api/client';
import userManager from '../utils/userManager';
import screenTimeMonitor from './screenTimeMonitor';

// Storage keys
const AI_COACH_SETTINGS_KEY = '@ai_coach_settings';
const AI_INSIGHTS_CACHE_KEY = '@ai_insights_cache';
const LAST_AI_CHECK_KEY = '@last_ai_check';

export interface AICoachSettings {
  enabled: boolean;
  checkInterval: number; // hours - how often to ask AI for insights
  minDataPoints: number; // minimum routine logs needed before AI analysis
  interventionStyle: 'supportive' | 'direct' | 'motivational';
  focusAreas: ('productivity' | 'health' | 'balance' | 'focus')[];
}

export interface AIProductivityInsight {
  id: string;
  type: 'suggestion' | 'warning' | 'achievement' | 'challenge';
  priority: number; // 1-5, 5 being most urgent
  title: string;
  description: string;
  action: string;
  estimatedImpact: 'high' | 'medium' | 'low';
  timeSensitive: boolean;
  category: 'screen_time' | 'sleep' | 'exercise' | 'stress' | 'overall';
  createdAt: string;
  acknowledged: boolean;
}

export interface ProductivityAnalysisRequest {
  user_id: string;
  current_screen_time: number; // minutes today
  daily_limit: number; // minutes
  recent_logs: Array<{
    sleep_hours: number;
    screen_time: number;
    exercise_duration: number;
    water_intake: number;
    stress_level: number;
    wake_up_time: string;
    bed_time: string;
    log_date: string;
  }>;
  current_time: string;
  day_of_week: string;
}

/**
 * Get default AI coach settings
 */
const getDefaultSettings = (): AICoachSettings => ({
  enabled: true,
  checkInterval: 2, // Check every 2 hours
  minDataPoints: 3, // Need at least 3 days of data
  interventionStyle: 'supportive',
  focusAreas: ['productivity', 'balance', 'focus'],
});

/**
 * Load AI coach settings
 */
export const loadAICoachSettings = async (): Promise<AICoachSettings> => {
  try {
    const stored = await AsyncStorage.getItem(AI_COACH_SETTINGS_KEY);
    return stored ? JSON.parse(stored) : getDefaultSettings();
  } catch (error) {
    console.error('Error loading AI coach settings:', error);
    return getDefaultSettings();
  }
};

/**
 * Save AI coach settings
 */
export const saveAICoachSettings = async (settings: AICoachSettings): Promise<void> => {
  try {
    await AsyncStorage.setItem(AI_COACH_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving AI coach settings:', error);
  }
};

/**
 * Get AI-powered productivity insights
 * Calls the AI service with recent routine data + current screen time
 */
export const getAIProductivityInsights = async (): Promise<AIProductivityInsight[]> => {
  try {
    console.log('🤖 Requesting AI productivity insights...');

    const settings = await loadAICoachSettings();

    if (!settings.enabled) {
      console.log('⏸️ AI coach is disabled');
      return [];
    }

    // Get user ID
    const userId = await userManager.getUserId();
    if (!userId) {
      console.log('❌ No user ID - skipping AI insights');
      return [];
    }

    // Get current screen time data
    const todayScreenTime = await screenTimeMonitor.getTodayScreenTime();
    const screenTimeGoals = await screenTimeMonitor.loadScreenTimeGoals();

    // Get recent routine logs from backend
    const response = await apiClient.get(`/api/logs`, {
      params: { user_id: userId, limit: 7 }
    });

    const recentLogs = response.data.logs || [];

    if (recentLogs.length < settings.minDataPoints) {
      console.log(`⏭️ Not enough data points (${recentLogs.length}/${settings.minDataPoints})`);
      return [];
    }

    // Prepare request for AI service
    const now = new Date();
    const analysisRequest: ProductivityAnalysisRequest = {
      user_id: userId,
      current_screen_time: todayScreenTime?.totalSocialMediaTime || 0,
      daily_limit: screenTimeGoals.socialMediaDailyLimit * 60,
      recent_logs: recentLogs.map((log: any) => ({
        sleep_hours: log.sleep_hours || 0,
        screen_time: log.screen_time || 0,
        exercise_duration: log.exercise_duration || 0,
        water_intake: log.water_intake || 0,
        stress_level: log.stress_level || 5,
        wake_up_time: log.wake_up_time || '07:00',
        bed_time: log.bed_time || '23:00',
        log_date: log.log_date || new Date().toISOString().split('T')[0],
      })),
      current_time: now.toISOString(),
      day_of_week: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()],
    };

    // Get AI insights from existing user insights endpoint
    // This retrieves previously generated AI analysis instead of creating new logs
    const aiInsightsResponse = await apiClient.get('/api/user-insights', {
      params: { user_id: userId, limit: 5 }
    });

    // Transform backend AI insights into productivity insights
    const insights: AIProductivityInsight[] = [];

    // Process AI insights from backend
    if (aiInsightsResponse.data.insights && Array.isArray(aiInsightsResponse.data.insights)) {
      aiInsightsResponse.data.insights.forEach((insight: any, index: number) => {
        const aiReport = insight.ai_report;

        if (aiReport && aiReport.recommendations) {
          // Create insights from AI recommendations
          aiReport.recommendations.forEach((rec: string, recIndex: number) => {
            insights.push({
              id: `ai_insight_${insight.routine_log?.id || index}_${recIndex}`,
              type: aiReport.is_anomaly ? 'warning' : 'suggestion',
              priority: aiReport.is_anomaly ? 4 : 3,
              title: aiReport.is_anomaly ? '⚠️ Routine Anomaly Detected' : '💡 AI Recommendation',
              description: rec,
              action: 'View Details',
              estimatedImpact: aiReport.confidence_score > 0.8 ? 'high' : 'medium',
              timeSensitive: aiReport.is_anomaly,
              category: detectCategoryFromAnomaly(aiReport.anomaly_type),
              createdAt: insight.routine_log?.log_date || new Date().toISOString(),
              acknowledged: false,
            });
          });
        }
      });
    }

    // Add screen time specific insights if relevant and no AI insights available
    if (insights.length === 0 && todayScreenTime && todayScreenTime.totalSocialMediaTime > 0) {
      const percentUsed = todayScreenTime.totalSocialMediaTime / (screenTimeGoals.socialMediaDailyLimit * 60);

      if (percentUsed > 0.9) {
        insights.push({
          id: `screen_time_${Date.now()}`,
          type: 'warning',
          priority: 4,
          title: '📱 High Screen Time Alert',
          description: `You've used ${Math.round(percentUsed * 100)}% of your daily social media limit. Consider taking a break to maintain productivity.`,
          action: 'View screen time stats',
          estimatedImpact: 'high',
          timeSensitive: true,
          category: 'screen_time',
          createdAt: new Date().toISOString(),
          acknowledged: false,
        });
      }
    }

    // Cache insights
    await AsyncStorage.setItem(AI_INSIGHTS_CACHE_KEY, JSON.stringify(insights));
    await AsyncStorage.setItem(LAST_AI_CHECK_KEY, new Date().toISOString());

    console.log(`✅ Generated ${insights.length} AI insights`);
    return insights;

  } catch (error: any) {
    console.error('❌ Error getting AI insights:', error);

    // Try to return cached insights if available
    try {
      const cached = await AsyncStorage.getItem(AI_INSIGHTS_CACHE_KEY);
      if (cached) {
        console.log('📦 Returning cached insights');
        return JSON.parse(cached);
      }
    } catch (cacheError) {
      console.error('❌ Error loading cached insights:', cacheError);
    }

    return [];
  }
};

/**
 * Detect category from anomaly type
 */
const detectCategoryFromAnomaly = (anomalyType: string): AIProductivityInsight['category'] => {
  if (!anomalyType) return 'overall';
  const type = anomalyType.toLowerCase();
  if (type.includes('sleep') || type.includes('rest')) return 'sleep';
  if (type.includes('exercise') || type.includes('activity')) return 'exercise';
  if (type.includes('screen') || type.includes('social')) return 'screen_time';
  if (type.includes('stress') || type.includes('anxiety')) return 'stress';
  return 'overall';
};

/**
 * Send AI-powered intervention notification
 */
export const sendAIIntervention = async (insight: AIProductivityInsight): Promise<void> => {
  try {
    const settings = await loadAICoachSettings();

    // Adjust message based on intervention style
    let title = insight.title;
    let body = insight.description;

    if (settings.interventionStyle === 'motivational') {
      title = `💪 ${insight.title}`;
      body = `${insight.description}\n\nYou got this! 🚀`;
    } else if (settings.interventionStyle === 'direct') {
      title = `⚡ ${insight.title}`;
      body = `${insight.description}\n\nAction: ${insight.action}`;
    }

    // Send notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: {
          type: 'ai_intervention',
          insightId: insight.id,
          category: insight.category,
          action: insight.action,
        },
        sound: insight.priority >= 4,
        priority: insight.priority >= 4
          ? Notifications.AndroidNotificationPriority.HIGH
          : Notifications.AndroidNotificationPriority.DEFAULT,
      },
      trigger: null, // Immediate
    });

    console.log(`✅ Sent AI intervention: ${insight.title}`);
  } catch (error) {
    console.error('Error sending AI intervention:', error);
  }
};

/**
 * Check if it's time for AI analysis
 */
export const shouldCheckAI = async (): Promise<boolean> => {
  try {
    const settings = await loadAICoachSettings();

    if (!settings.enabled) {
      return false;
    }

    const lastCheck = await AsyncStorage.getItem(LAST_AI_CHECK_KEY);

    if (!lastCheck) {
      return true; // Never checked before
    }

    const lastCheckTime = new Date(lastCheck).getTime();
    const now = new Date().getTime();
    const hoursSinceLastCheck = (now - lastCheckTime) / (1000 * 60 * 60);

    return hoursSinceLastCheck >= settings.checkInterval;
  } catch (error) {
    console.error('Error checking AI schedule:', error);
    return false;
  }
};

/**
 * Run periodic AI productivity check
 * Call this from background task or on app open
 */
export const runAIProductivityCheck = async (): Promise<void> => {
  try {
    const shouldCheck = await shouldCheckAI();

    if (!shouldCheck) {
      console.log('⏭️ Not time for AI check yet');
      return;
    }

    console.log('🤖 Running AI productivity check...');

    const insights = await getAIProductivityInsights();

    // Send notifications for high-priority, time-sensitive insights
    const urgentInsights = insights.filter(
      insight => !insight.acknowledged && (insight.priority >= 4 || insight.timeSensitive)
    );

    for (const insight of urgentInsights.slice(0, 2)) { // Max 2 notifications
      await sendAIIntervention(insight);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Space out notifications
    }

    console.log(`✅ AI check complete: ${insights.length} insights, ${urgentInsights.length} sent`);
  } catch (error) {
    console.error('❌ Error in AI productivity check:', error);
  }
};

/**
 * Get all cached insights
 */
export const getCachedInsights = async (): Promise<AIProductivityInsight[]> => {
  try {
    const cached = await AsyncStorage.getItem(AI_INSIGHTS_CACHE_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch (error) {
    console.error('Error getting cached insights:', error);
    return [];
  }
};

/**
 * Mark insight as acknowledged
 */
export const acknowledgeInsight = async (insightId: string): Promise<void> => {
  try {
    const insights = await getCachedInsights();
    const updated = insights.map(insight =>
      insight.id === insightId ? { ...insight, acknowledged: true } : insight
    );
    await AsyncStorage.setItem(AI_INSIGHTS_CACHE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error acknowledging insight:', error);
  }
};

export default {
  loadAICoachSettings,
  saveAICoachSettings,
  getAIProductivityInsights,
  sendAIIntervention,
  shouldCheckAI,
  runAIProductivityCheck,
  getCachedInsights,
  acknowledgeInsight,
};
