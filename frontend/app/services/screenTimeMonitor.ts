/**
 * Screen Time Monitoring Service
 *
 * NOTE: This tracks app usage and sends smart interventions.
 * It CANNOT block apps due to platform restrictions.
 * Instead, it uses psychology and gamification to encourage healthy habits.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Storage keys
const SCREEN_TIME_GOALS_KEY = '@screen_time_goals';
const SCREEN_TIME_DATA_KEY = '@screen_time_data';
const SCREEN_TIME_ALERTS_KEY = '@screen_time_alerts';

export interface ScreenTimeGoal {
  socialMediaDailyLimit: number; // hours
  alertThresholds: number[]; // [0.5, 0.75, 1.0] = 50%, 75%, 100% of limit
  enableInterventions: boolean;
  quietHours: { start: string; end: string }; // Don't alert during these hours
}

export interface ScreenTimeData {
  date: string;
  apps: {
    [appName: string]: {
      timeSpent: number; // minutes
      opens: number;
      category: 'social' | 'productivity' | 'entertainment' | 'other';
    };
  };
  totalSocialMediaTime: number; // minutes
  interventionsSent: number;
  interventionsAcknowledged: number;
}

export interface Intervention {
  type: 'gentle' | 'moderate' | 'urgent';
  message: string;
  action?: string;
}

/**
 * Get default goals
 */
const getDefaultGoals = (): ScreenTimeGoal => ({
  socialMediaDailyLimit: 2, // 2 hours
  alertThresholds: [0.75, 0.9, 1.0], // Alert at 75%, 90%, 100%
  enableInterventions: true,
  quietHours: { start: '22:00', end: '08:00' },
});

/**
 * Load screen time goals
 */
export const loadScreenTimeGoals = async (): Promise<ScreenTimeGoal> => {
  try {
    const stored = await AsyncStorage.getItem(SCREEN_TIME_GOALS_KEY);
    return stored ? JSON.parse(stored) : getDefaultGoals();
  } catch (error) {
    console.error('Error loading screen time goals:', error);
    return getDefaultGoals();
  }
};

/**
 * Save screen time goals
 */
export const saveScreenTimeGoals = async (goals: ScreenTimeGoal): Promise<void> => {
  try {
    await AsyncStorage.setItem(SCREEN_TIME_GOALS_KEY, JSON.stringify(goals));
  } catch (error) {
    console.error('Error saving screen time goals:', error);
  }
};

/**
 * Get intervention based on usage level
 */
const getIntervention = (percentUsed: number, timeRemaining: number): Intervention => {
  if (percentUsed >= 1.0) {
    return {
      type: 'urgent',
      message: `🚨 Daily social media limit reached!\n\nYou've used all ${Math.round(timeRemaining + (timeRemaining/percentUsed))} minutes today. Time to disconnect and recharge! 💪`,
      action: 'Log your mood'
    };
  } else if (percentUsed >= 0.9) {
    return {
      type: 'moderate',
      message: `⚠️ Almost at your limit!\n\n${Math.round(timeRemaining)} minutes of social media left today. Make them count! 🎯`,
      action: 'See alternatives'
    };
  } else {
    return {
      type: 'gentle',
      message: `ℹ️ Mindful reminder\n\nYou've used ${Math.round((percentUsed * 100))}% of your daily social media time. Stay aware! 🧘`,
      action: 'Continue mindfully'
    };
  }
};

/**
 * Send screen time intervention
 */
export const sendScreenTimeIntervention = async (
  percentUsed: number,
  minutesUsed: number,
  limitMinutes: number
): Promise<void> => {
  try {
    const goals = await loadScreenTimeGoals();

    if (!goals.enableInterventions) {
      return;
    }

    // Check quiet hours
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    if (currentTime >= goals.quietHours.start || currentTime <= goals.quietHours.end) {
      console.log('⏸️ Quiet hours - skipping intervention');
      return;
    }

    const timeRemaining = limitMinutes - minutesUsed;
    const intervention = getIntervention(percentUsed, timeRemaining);

    // Send notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: intervention.message.split('\n')[0],
        body: intervention.message.split('\n').slice(1).join('\n'),
        data: {
          type: 'screen_time_intervention',
          percentUsed,
          action: intervention.action,
        },
        sound: intervention.type === 'urgent',
        priority: intervention.type === 'urgent'
          ? Notifications.AndroidNotificationPriority.HIGH
          : Notifications.AndroidNotificationPriority.DEFAULT,
      },
      trigger: null, // Immediate
    });

    console.log(`✅ Sent ${intervention.type} intervention (${Math.round(percentUsed * 100)}% used)`);
  } catch (error) {
    console.error('Error sending intervention:', error);
  }
};

/**
 * Track screen time and send interventions if needed
 */
export const trackScreenTime = async (
  appName: string,
  category: 'social' | 'productivity' | 'entertainment' | 'other',
  minutesSpent: number
): Promise<void> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const goals = await loadScreenTimeGoals();

    // Load today's data
    const dataKey = `${SCREEN_TIME_DATA_KEY}_${today}`;
    const stored = await AsyncStorage.getItem(dataKey);
    const data: ScreenTimeData = stored ? JSON.parse(stored) : {
      date: today,
      apps: {},
      totalSocialMediaTime: 0,
      interventionsSent: 0,
      interventionsAcknowledged: 0,
    };

    // Update app data
    if (!data.apps[appName]) {
      data.apps[appName] = { timeSpent: 0, opens: 0, category };
    }
    data.apps[appName].timeSpent += minutesSpent;
    data.apps[appName].opens += 1;

    // Update total social media time
    if (category === 'social') {
      data.totalSocialMediaTime += minutesSpent;
    }

    // Save updated data
    await AsyncStorage.setItem(dataKey, JSON.stringify(data));

    // Check if intervention needed
    if (category === 'social') {
      const limitMinutes = goals.socialMediaDailyLimit * 60;
      const percentUsed = data.totalSocialMediaTime / limitMinutes;

      // Check each threshold
      for (const threshold of goals.alertThresholds) {
        if (percentUsed >= threshold) {
          const alertKey = `${SCREEN_TIME_ALERTS_KEY}_${today}_${threshold}`;
          const alreadySent = await AsyncStorage.getItem(alertKey);

          if (!alreadySent) {
            await sendScreenTimeIntervention(percentUsed, data.totalSocialMediaTime, limitMinutes);
            await AsyncStorage.setItem(alertKey, 'sent');
            data.interventionsSent += 1;
            await AsyncStorage.setItem(dataKey, JSON.stringify(data));
          }
        }
      }
    }
  } catch (error) {
    console.error('Error tracking screen time:', error);
  }
};

/**
 * Get today's screen time summary
 */
export const getTodayScreenTime = async (): Promise<ScreenTimeData | null> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const dataKey = `${SCREEN_TIME_DATA_KEY}_${today}`;
    const stored = await AsyncStorage.getItem(dataKey);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Error getting screen time:', error);
    return null;
  }
};

/**
 * Get weekly screen time report
 */
export const getWeeklyScreenTimeReport = async (): Promise<ScreenTimeData[]> => {
  try {
    const reports: ScreenTimeData[] = [];
    const now = new Date();

    for (let i = 0; i < 7; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const dataKey = `${SCREEN_TIME_DATA_KEY}_${dateStr}`;
      const stored = await AsyncStorage.getItem(dataKey);

      if (stored) {
        reports.push(JSON.parse(stored));
      }
    }

    return reports;
  } catch (error) {
    console.error('Error getting weekly report:', error);
    return [];
  }
};

/**
 * Calculate achievement/streak
 */
export const calculateScreenTimeStreak = async (): Promise<number> => {
  try {
    const goals = await loadScreenTimeGoals();
    const limitMinutes = goals.socialMediaDailyLimit * 60;
    let streak = 0;
    const now = new Date();

    for (let i = 0; i < 30; i++) { // Check last 30 days
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const dataKey = `${SCREEN_TIME_DATA_KEY}_${dateStr}`;
      const stored = await AsyncStorage.getItem(dataKey);

      if (stored) {
        const data: ScreenTimeData = JSON.parse(stored);
        if (data.totalSocialMediaTime <= limitMinutes) {
          streak++;
        } else {
          break; // Streak broken
        }
      } else {
        break; // No data for this day
      }
    }

    return streak;
  } catch (error) {
    console.error('Error calculating streak:', error);
    return 0;
  }
};

export default {
  loadScreenTimeGoals,
  saveScreenTimeGoals,
  trackScreenTime,
  sendScreenTimeIntervention,
  getTodayScreenTime,
  getWeeklyScreenTimeReport,
  calculateScreenTimeStreak,
};
