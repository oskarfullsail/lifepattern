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
  syncHeartRate: true,
  syncWorkouts: true,
  syncNutrition: true, // Water intake
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
 * Fetch health data from iOS HealthKit
 */
const fetchIOSHealthData = async (settings: HealthSyncSettings): Promise<HealthData | null> => {
  try {
    const AppleHealthKit = require('rn-apple-healthkit').default;

    // Define permissions
    const permissions = {
      permissions: {
        read: [
          AppleHealthKit.Constants.Permissions.SleepAnalysis,
          AppleHealthKit.Constants.Permissions.Steps,
          AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
          AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
          AppleHealthKit.Constants.Permissions.Water,
          AppleHealthKit.Constants.Permissions.HeartRate,
        ],
      },
    };

    // Initialize HealthKit
    await new Promise((resolve, reject) => {
      AppleHealthKit.initHealthKit(permissions, (error: string) => {
        if (error) {
          console.error('❌ HealthKit init error:', error);
          reject(new Error(error));
        } else {
          console.log('✅ HealthKit initialized');
          resolve(true);
        }
      });
    });

    const healthData: HealthData = {};
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Fetch sleep data
    if (settings.syncSleep) {
      const sleepOptions = {
        startDate: yesterday.toISOString(),
        endDate: now.toISOString(),
      };

      const sleepSamples: any = await new Promise((resolve, reject) => {
        AppleHealthKit.getSleepSamples(sleepOptions, (err: any, results: any) => {
          if (err) reject(err);
          else resolve(results);
        });
      });

      if (sleepSamples && sleepSamples.length > 0) {
        // Calculate total sleep hours
        const totalMinutes = sleepSamples.reduce((sum: number, sample: any) => {
          const start = new Date(sample.startDate).getTime();
          const end = new Date(sample.endDate).getTime();
          return sum + (end - start) / (1000 * 60);
        }, 0);
        healthData.sleep_hours = totalMinutes / 60;
        console.log(`✅ Sleep data: ${healthData.sleep_hours.toFixed(2)} hours`);
      }
    }

    // Fetch steps
    if (settings.syncSteps) {
      const stepsOptions = {
        startDate: yesterday.toISOString(),
        endDate: now.toISOString(),
      };

      const steps: any = await new Promise((resolve, reject) => {
        AppleHealthKit.getStepCount(stepsOptions, (err: any, results: any) => {
          if (err) reject(err);
          else resolve(results);
        });
      });

      if (steps && steps.value) {
        healthData.steps = steps.value;
        console.log(`✅ Steps: ${healthData.steps}`);
      }
    }

    // Fetch workouts/exercise
    if (settings.syncWorkouts) {
      const workoutOptions = {
        startDate: yesterday.toISOString(),
        endDate: now.toISOString(),
      };

      const workouts: any = await new Promise((resolve, reject) => {
        AppleHealthKit.getSamples(workoutOptions, (err: any, results: any) => {
          if (err) reject(err);
          else resolve(results);
        });
      });

      if (workouts && workouts.length > 0) {
        // Calculate total exercise duration in hours
        const totalMinutes = workouts.reduce((sum: number, workout: any) => {
          return sum + (workout.duration || 0);
        }, 0);
        healthData.exercise_duration = totalMinutes / 60;
        console.log(`✅ Exercise: ${healthData.exercise_duration.toFixed(2)} hours`);
      }
    }

    // Fetch water intake
    if (settings.syncNutrition) {
      const waterOptions = {
        startDate: yesterday.toISOString(),
        endDate: now.toISOString(),
      };

      const water: any = await new Promise((resolve, reject) => {
        AppleHealthKit.getWater(waterOptions, (err: any, results: any) => {
          if (err) reject(err);
          else resolve(results);
        });
      });

      if (water && water.value) {
        // Convert from ml to liters
        healthData.water_intake = water.value / 1000;
        console.log(`✅ Water intake: ${healthData.water_intake.toFixed(2)}L`);
      }
    }

    // Fetch heart rate
    if (settings.syncHeartRate) {
      const heartRateOptions = {
        startDate: yesterday.toISOString(),
        endDate: now.toISOString(),
      };

      const heartRate: any = await new Promise((resolve, reject) => {
        AppleHealthKit.getHeartRateSamples(heartRateOptions, (err: any, results: any) => {
          if (err) reject(err);
          else resolve(results);
        });
      });

      if (heartRate && heartRate.length > 0) {
        // Calculate average heart rate
        const avgHeartRate = heartRate.reduce((sum: number, sample: any) => {
          return sum + sample.value;
        }, 0) / heartRate.length;
        healthData.heart_rate_avg = Math.round(avgHeartRate);
        console.log(`✅ Average heart rate: ${healthData.heart_rate_avg} bpm`);
      }
    }

    return Object.keys(healthData).length > 0 ? healthData : null;
  } catch (error) {
    console.error('❌ Error fetching iOS health data:', error);
    return null;
  }
};

/**
 * Fetch health data from Android Google Fit
 */
const fetchAndroidHealthData = async (settings: HealthSyncSettings): Promise<HealthData | null> => {
  try {
    const GoogleFit = require('react-native-google-fit');

    // Define scopes
    const options = {
      scopes: [
        'https://www.googleapis.com/auth/fitness.activity.read',
        'https://www.googleapis.com/auth/fitness.sleep.read',
        'https://www.googleapis.com/auth/fitness.nutrition.read',
        'https://www.googleapis.com/auth/fitness.heart_rate.read',
      ],
    };

    // Authorize
    const authResult = await GoogleFit.authorize(options);
    if (!authResult.success) {
      console.error('❌ Google Fit authorization failed');
      return null;
    }
    console.log('✅ Google Fit authorized');

    const healthData: HealthData = {};
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Fetch sleep data
    if (settings.syncSleep) {
      try {
        const sleepData = await GoogleFit.getSleepData({
          startDate: yesterday.toISOString(),
          endDate: now.toISOString(),
        });

        if (sleepData && sleepData.length > 0) {
          const totalHours = sleepData.reduce((sum: number, session: any) => {
            const start = new Date(session.startDate).getTime();
            const end = new Date(session.endDate).getTime();
            return sum + (end - start) / (1000 * 60 * 60);
          }, 0);
          healthData.sleep_hours = totalHours;
          console.log(`✅ Sleep data: ${healthData.sleep_hours.toFixed(2)} hours`);
        }
      } catch (err) {
        console.warn('⚠️ Could not fetch sleep data:', err);
      }
    }

    // Fetch steps
    if (settings.syncSteps) {
      try {
        const stepsData = await GoogleFit.getDailyStepCountSamples({
          startDate: yesterday.toISOString(),
          endDate: now.toISOString(),
        });

        if (stepsData && stepsData.length > 0) {
          const totalSteps = stepsData.reduce((sum: number, day: any) => {
            return sum + (day.steps || 0);
          }, 0);
          healthData.steps = totalSteps;
          console.log(`✅ Steps: ${healthData.steps}`);
        }
      } catch (err) {
        console.warn('⚠️ Could not fetch steps data:', err);
      }
    }

    // Fetch workouts/activities
    if (settings.syncWorkouts) {
      try {
        const activities = await GoogleFit.getActivitySamples({
          startDate: yesterday.toISOString(),
          endDate: now.toISOString(),
        });

        if (activities && activities.length > 0) {
          const totalMinutes = activities.reduce((sum: number, activity: any) => {
            return sum + ((activity.end - activity.start) / (1000 * 60));
          }, 0);
          healthData.exercise_duration = totalMinutes / 60;
          console.log(`✅ Exercise: ${healthData.exercise_duration.toFixed(2)} hours`);
        }
      } catch (err) {
        console.warn('⚠️ Could not fetch activity data:', err);
      }
    }

    // Fetch hydration
    if (settings.syncNutrition) {
      try {
        const hydration = await GoogleFit.getHydrationSamples({
          startDate: yesterday.toISOString(),
          endDate: now.toISOString(),
        });

        if (hydration && hydration.length > 0) {
          const totalML = hydration.reduce((sum: number, entry: any) => {
            return sum + (entry.waterConsumed || 0);
          }, 0);
          healthData.water_intake = totalML / 1000; // Convert to liters
          console.log(`✅ Water intake: ${healthData.water_intake.toFixed(2)}L`);
        }
      } catch (err) {
        console.warn('⚠️ Could not fetch hydration data:', err);
      }
    }

    // Fetch heart rate
    if (settings.syncHeartRate) {
      try {
        const heartRateSamples = await GoogleFit.getHeartRateSamples({
          startDate: yesterday.toISOString(),
          endDate: now.toISOString(),
        });

        if (heartRateSamples && heartRateSamples.length > 0) {
          const avgHeartRate = heartRateSamples.reduce((sum: number, sample: any) => {
            return sum + (sample.value || 0);
          }, 0) / heartRateSamples.length;
          healthData.heart_rate_avg = Math.round(avgHeartRate);
          console.log(`✅ Average heart rate: ${healthData.heart_rate_avg} bpm`);
        }
      } catch (err) {
        console.warn('⚠️ Could not fetch heart rate data:', err);
      }
    }

    return Object.keys(healthData).length > 0 ? healthData : null;
  } catch (error) {
    console.error('❌ Error fetching Android health data:', error);
    return null;
  }
};

/**
 * Fetch health data from device
 * Now with real implementations for iOS and Android
 */
const fetchHealthDataFromDevice = async (settings: HealthSyncSettings): Promise<HealthData | null> => {
  try {
    console.log('📊 Fetching health data from device...');

    if (Platform.OS === 'ios') {
      console.log('📱 iOS: Fetching from Apple HealthKit');
      return await fetchIOSHealthData(settings);
    } else if (Platform.OS === 'android') {
      console.log('🤖 Android: Fetching from Google Fit');
      return await fetchAndroidHealthData(settings);
    } else {
      console.log('⚠️ Web platform - health data not available');
      return null;
    }
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
 * Wrapped in try-catch to prevent crashes if TaskManager is not available
 */
try {
  TaskManager.defineTask(HEALTH_SYNC_TASK, performBackgroundSync);
} catch (error) {
  console.error('❌ Error defining background task:', error);
  console.warn('⚠️ Background health sync task could not be defined. This feature may not work.');
}

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

    if (status === null || status === undefined) {
      return 'Unknown';
    }

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

/**
 * Fetch today's health data without syncing to backend
 * Used for pre-filling manual entry forms
 */
export const fetchHealthDataForToday = async (): Promise<HealthData | null> => {
  try {
    const settings = await loadHealthSyncSettings();

    if (!settings.enabled) {
      console.log('⏸️ Health sync is disabled');
      return null;
    }

    let healthData: HealthData | null = null;

    if (Platform.OS === 'ios') {
      healthData = await fetchIOSHealthData(settings);
    } else if (Platform.OS === 'android') {
      healthData = await fetchAndroidHealthData(settings);
    }

    return healthData;
  } catch (error) {
    console.error('❌ Error fetching health data for today:', error);
    return null;
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
  fetchHealthDataForToday,
};
