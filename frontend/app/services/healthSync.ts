/**
 * Background Health App Sync Service
 * Automatically syncs health data from Apple Health / Google Fit every 4-6 hours
 * Expected impact: 1000x more data for AI training
 */

import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createRoutineLog, RoutineLogPayload } from '../api/endpoint';
import userManager from '../utils/userManager';

// Task identifiers
const HEALTH_SYNC_TASK = 'health-sync-background';
const HEALTH_SYNC_SETTINGS_KEY = '@health_sync_settings';
const LAST_SYNC_KEY = '@last_health_sync';

export interface HealthSyncSettings {
  enabled: boolean;
  syncInterval: number; // in seconds (default: 4 hours)
  syncSleep: boolean;
  syncSteps: boolean;
  syncHeartRate: boolean;
  syncWorkouts: boolean;
  syncNutrition: boolean;
  lastSyncTime?: string;
  totalSyncs: number;
}

export interface HealthData {
  sleep_hours?: number;
  steps?: number;
  heart_rate_avg?: number;
  exercise_duration?: number;
  water_intake?: number;
  meal_times?: string[];
  calories?: number;
}

/**
 * Get default health sync settings
 */
const getDefaultSettings = (): HealthSyncSettings => ({
  enabled: true,
  syncInterval: 60 * 60 * 4, // 4 hours in seconds
  syncSleep: true,
  syncSteps: true,
  syncHeartRate: false, // Requires additional permissions
  syncWorkouts: true,
  syncNutrition: false, // Requires additional permissions
  totalSyncs: 0,
});

/**
 * Load health sync settings
 */
export const loadHealthSyncSettings = async (): Promise<HealthSyncSettings> => {
  try {
    const stored = await AsyncStorage.getItem(HEALTH_SYNC_SETTINGS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return getDefaultSettings();
  } catch (error) {
    console.error('❌ Error loading health sync settings:', error);
    return getDefaultSettings();
  }
};

/**
 * Save health sync settings
 */
export const saveHealthSyncSettings = async (settings: HealthSyncSettings): Promise<void> => {
  try {
    await AsyncStorage.setItem(HEALTH_SYNC_SETTINGS_KEY, JSON.stringify(settings));
    console.log('✅ Health sync settings saved');
  } catch (error) {
    console.error('❌ Error saving health sync settings:', error);
  }
};

/**
 * Fetch health data from device
 * Note: This is a placeholder. Actual implementation requires platform-specific packages:
 * - iOS: expo-apple-health-kit or react-native-health
 * - Android: expo-health-connect or react-native-google-fit
 */
const fetchHealthDataFromDevice = async (settings: HealthSyncSettings): Promise<HealthData | null> => {
  try {
    console.log('📊 Fetching health data from device...');

    // Placeholder - In production, this would use:
    // - Apple HealthKit on iOS
    // - Google Health Connect on Android
    
    // For now, simulate some data for demonstration
    if (Platform.OS === 'ios') {
      // TODO: Integrate with Apple HealthKit
      // const AppleHealthKit = require('react-native-health');
      // const sleepData = await AppleHealthKit.getSleepSamples(...);
      console.log('📱 iOS: Would fetch from Apple HealthKit');
    } else if (Platform.OS === 'android') {
      // TODO: Integrate with Google Health Connect
      // const GoogleFit = require('react-native-google-fit');
      // const sleepData = await GoogleFit.getSleepData(...);
      console.log('🤖 Android: Would fetch from Google Health Connect');
    }

    // Return null for now - indicates no real data available yet
    // Once health APIs are integrated, this will return actual data:
    /*
    return {
      sleep_hours: sleepData.totalSleepHours,
      steps: stepData.totalSteps,
      exercise_duration: workoutData.totalMinutes / 60,
      water_intake: nutritionData.waterIntake,
      meal_times: nutritionData.mealTimes,
    };
    */

    return null;
  } catch (error) {
    console.error('❌ Error fetching health data:', error);
    return null;
  }
};

/**
 * Process and send health data to backend
 */
const processAndSyncHealthData = async (healthData: HealthData): Promise<boolean> => {
  try {
    const userId = await userManager.getUserId();
    if (!userId) {
      console.error('❌ No user ID - cannot sync health data');
      return false;
    }

    // Convert health data to routine log format
    const today = new Date();
    const payload: RoutineLogPayload = {
      user_id: userId,
      sleep_hours: healthData.sleep_hours || 0,
      exercise_duration: healthData.exercise_duration || 0,
      screen_time: 0, // Can be added from passive tracking
      water_intake: healthData.water_intake || 0,
      stress_level: 5, // Default - can be estimated from heart rate variability
      wake_up_time: '07:00', // Can be extracted from sleep data
      bed_time: '23:00', // Can be extracted from sleep data
      meal_times: healthData.meal_times || [],
      log_date: today.toISOString().split('T')[0],
    };

    // Only sync if we have meaningful data
    const hasData = payload.sleep_hours > 0 || payload.exercise_duration > 0 || payload.water_intake > 0;
    if (!hasData) {
      console.log('⏭️ No meaningful health data to sync');
      return false;
    }

    // Send to backend
    console.log('📤 Syncing health data to backend...');
    const response = await createRoutineLog(payload);

    console.log('✅ Health data synced successfully:', response);
    return true;
  } catch (error) {
    console.error('❌ Error syncing health data:', error);
    return false;
  }
};

/**
 * Main background sync function
 */
const performBackgroundSync = async (): Promise<BackgroundFetch.BackgroundFetchResult> => {
  try {
    console.log('🔄 Background health sync started...');

    // Load settings
    const settings = await loadHealthSyncSettings();

    if (!settings.enabled) {
      console.log('⏸️ Health sync is disabled');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Fetch health data from device
    const healthData = await fetchHealthDataFromDevice(settings);

    if (!healthData) {
      console.log('📭 No health data available');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Process and sync to backend
    const success = await processAndSyncHealthData(healthData);

    if (success) {
      // Update settings
      settings.lastSyncTime = new Date().toISOString();
      settings.totalSyncs++;
      await saveHealthSyncSettings(settings);

      // Store last sync time
      await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());

      console.log('✅ Background health sync completed');
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } else {
      console.log('⚠️ Health sync completed with no new data');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
  } catch (error) {
    console.error('❌ Background health sync failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
};

/**
 * Define background task
 */
TaskManager.defineTask(HEALTH_SYNC_TASK, performBackgroundSync);

/**
 * Register background health sync task
 */
export const registerHealthSyncTask = async (): Promise<boolean> => {
  try {
    console.log('📝 Registering background health sync task...');

    const settings = await loadHealthSyncSettings();

    // Check if task is already registered
    const isRegistered = await TaskManager.isTaskRegisteredAsync(HEALTH_SYNC_TASK);
    if (isRegistered) {
      console.log('ℹ️ Health sync task already registered');
      return true;
    }

    // Register the background fetch task
    await BackgroundFetch.registerTaskAsync(HEALTH_SYNC_TASK, {
      minimumInterval: settings.syncInterval, // seconds
      stopOnTerminate: false, // Continue after app closes
      startOnBoot: true, // Start after device reboot
    });

    console.log('✅ Background health sync task registered');
    console.log(`⏱️ Sync interval: ${settings.syncInterval / 3600} hours`);
    return true;
  } catch (error) {
    console.error('❌ Error registering health sync task:', error);
    return false;
  }
};

/**
 * Unregister background health sync task
 */
export const unregisterHealthSyncTask = async (): Promise<void> => {
  try {
    console.log('🗑️ Unregistering background health sync task...');

    const isRegistered = await TaskManager.isTaskRegisteredAsync(HEALTH_SYNC_TASK);
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(HEALTH_SYNC_TASK);
      console.log('✅ Background health sync task unregistered');
    } else {
      console.log('ℹ️ Health sync task was not registered');
    }
  } catch (error) {
    console.error('❌ Error unregistering health sync task:', error);
  }
};

/**
 * Check background fetch status
 */
export const getBackgroundFetchStatus = async (): Promise<string> => {
  try {
    const status = await BackgroundFetch.getStatusAsync();

    const statusMap: { [key: number]: string } = {
      [BackgroundFetch.BackgroundFetchStatus.Restricted]: 'Restricted',
      [BackgroundFetch.BackgroundFetchStatus.Denied]: 'Denied',
      [BackgroundFetch.BackgroundFetchStatus.Available]: 'Available',
    };

    return statusMap[status] || 'Unknown';
  } catch (error) {
    console.error('❌ Error getting background fetch status:', error);
    return 'Error';
  }
};

/**
 * Manually trigger a health sync (for testing or user request)
 */
export const manualHealthSync = async (): Promise<boolean> => {
  try {
    console.log('🔄 Manual health sync triggered...');
    const result = await performBackgroundSync();
    return result === BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('❌ Manual health sync failed:', error);
    return false;
  }
};

/**
 * Get last sync time
 */
export const getLastSyncTime = async (): Promise<string | null> => {
  try {
    const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
    return lastSync;
  } catch (error) {
    console.error('❌ Error getting last sync time:', error);
    return null;
  }
};

/**
 * Initialize health sync system
 * Call this on app startup
 */
export const initializeHealthSync = async (): Promise<boolean> => {
  try {
    console.log('🏥 Initializing health sync system...');

    // Check if background fetch is available
    const status = await getBackgroundFetchStatus();
    if (status !== 'Available') {
      console.warn(`⚠️ Background fetch is ${status} - health sync may not work properly`);
      return false;
    }

    // Load settings
    const settings = await loadHealthSyncSettings();

    // Register background task if enabled
    if (settings.enabled) {
      await registerHealthSyncTask();
    }

    console.log('✅ Health sync system initialized');
    return true;
  } catch (error) {
    console.error('❌ Error initializing health sync:', error);
    return false;
  }
};

/**
 * Toggle health sync on/off
 */
export const toggleHealthSync = async (enabled: boolean): Promise<void> => {
  try {
    const settings = await loadHealthSyncSettings();
    settings.enabled = enabled;
    await saveHealthSyncSettings(settings);

    if (enabled) {
      await registerHealthSyncTask();
    } else {
      await unregisterHealthSyncTask();
    }

    console.log(`✅ Health sync ${enabled ? 'enabled' : 'disabled'}`);
  } catch (error) {
    console.error('❌ Error toggling health sync:', error);
  }
};

/**
 * Update sync interval
 */
export const updateSyncInterval = async (hours: number): Promise<void> => {
  try {
    const settings = await loadHealthSyncSettings();
    settings.syncInterval = hours * 60 * 60; // Convert hours to seconds
    await saveHealthSyncSettings(settings);

    // Re-register with new interval
    if (settings.enabled) {
      await unregisterHealthSyncTask();
      await registerHealthSyncTask();
    }

    console.log(`✅ Sync interval updated to ${hours} hours`);
  } catch (error) {
    console.error('❌ Error updating sync interval:', error);
  }
};

export default {
  initializeHealthSync,
  registerHealthSyncTask,
  unregisterHealthSyncTask,
  manualHealthSync,
  toggleHealthSync,
  updateSyncInterval,
  loadHealthSyncSettings,
  saveHealthSyncSettings,
  getBackgroundFetchStatus,
  getLastSyncTime,
};
