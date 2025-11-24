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

    // Call AI service with the most recent routine log + context
    const latestLog = recentLogs[0];
    const aiResponse = await apiClient.post('/api/ai/analyze-enhanced', {
      sleep_hours: latestLog.sleep_hours || 7,
      meal_times: latestLog.meal_times || [],
      screen_time: (todayScreenTime?.totalSocialMediaTime || 0) / 60, // Convert to hours
      exercise_duration: latestLog.exercise_duration || 0,
      wake_up_time: latestLog.wake_up_time || '07:00',
      bed_time: latestLog.bed_time || '23:00',
      water_intake: latestLog.water_intake || 2,
      stress_level: latestLog.stress_level || 5,
      // Add productivity context
      productivity_context: {
        screen_time_progress: todayScreenTime?.totalSocialMediaTime / (screenTimeGoals.socialMediaDailyLimit * 60),
        day_of_week: analysisRequest.day_of_week,
        time_of_day: now.getHours() < 12 ? 'morning' : now.getHours() < 18 ? 'afternoon' : 'evening',
      }
    });

    // Transform AI service response into productivity insights
    const insights: AIProductivityInsight[] = [];

    // Add enhanced recommendations from AI
    if (aiResponse.data.enhanced_recommendations) {
      aiResponse.data.enhanced_recommendations.forEach((rec: any, index: number) => {
        insights.push({
          id: `ai_rec_${Date.now()}_${index}`,
          type: rec.priority >= 4 ? 'warning' : 'suggestion',
          priority: rec.priority || 3,
          title: rec.title,
          description: rec.description,
          action: rec.action_url || 'View details',
          estimatedImpact: rec.estimated_impact?.toLowerCase() || 'medium',
          timeSensitive: rec.time_sensitive || false,
          category: detectCategory(rec.type),
          createdAt: new Date().toISOString(),
          acknowledged: false,
        });
      });
    }

    // Add screen time specific insights if relevant
    if (todayScreenTime && todayScreenTime.totalSocialMediaTime > 0) {
      const percentUsed = todayScreenTime.totalSocialMediaTime / (screenTimeGoals.socialMediaDailyLimit * 60);

      if (percentUsed > 0.9 && aiResponse.data.behavioral_contexts?.includes('high_stress')) {
        insights.push({
          id: `ai_stress_${Date.now()}`,
          type: 'warning',
          priority: 5,
          title: '🧠 AI Detected: Stress + Screen Time Pattern',
          description: 'Your elevated stress levels combined with high social media use may indicate escapism. Consider a mindful break or brief exercise instead.',
          action: 'Try 5-min meditation',
          estimatedImpact: 'high',
          timeSensitive: true,
          category: 'overall',
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
 * Detect category from recommendation type
 */
const detectCategory = (type: string): AIProductivityInsight['category'] => {
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
