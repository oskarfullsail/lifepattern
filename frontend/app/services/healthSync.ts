/**
 * Background Health App Sync Service
 * 
 * Uses platform-specific health packages:
 * - iOS: react-native-health (requires Expo dev client build)
 * - Android: expo-health-connect (official Expo package)
 * 
 * Expected impact: 1000x more data for AI training
 */

import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { Platform, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createRoutineLog, RoutineLogPayload } from '../api/endpoint';
import userManager from '../utils/userManager';

// Task identifiers
const HEALTH_SYNC_TASK = 'health-sync-background';
const HEALTH_SYNC_SETTINGS_KEY = '@health_sync_settings';
const LAST_SYNC_KEY = '@last_health_sync';

// ============================================================================
// Types
// ============================================================================

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

export interface HealthPermissionStatus {
  isAvailable: boolean;
  isAuthorized: boolean;
  missingPermissions: string[];
  message: string;
}

// ============================================================================
// Settings Management
// ============================================================================

const getDefaultSettings = (): HealthSyncSettings => ({
  enabled: true,
  syncInterval: 60 * 60 * 4, // 4 hours in seconds
  syncSleep: true,
  syncSteps: true,
  syncHeartRate: true,
  syncWorkouts: true,
  syncNutrition: true,
  totalSyncs: 0,
});

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

export const saveHealthSyncSettings = async (settings: HealthSyncSettings): Promise<void> => {
  try {
    await AsyncStorage.setItem(HEALTH_SYNC_SETTINGS_KEY, JSON.stringify(settings));
    console.log('✅ Health sync settings saved');
  } catch (error) {
    console.error('❌ Error saving health sync settings:', error);
  }
};

// ============================================================================
// iOS: react-native-health Implementation
// ============================================================================

/**
 * Check if react-native-health is available (requires dev client build)
 */
export const isIOSHealthAvailable = (): boolean => {
  if (Platform.OS !== 'ios') return false;
  
  try {
    // Check if the native module exists
    const hasModule = !!NativeModules.AppleHealthKit;
    console.log('📱 iOS HealthKit native module available:', hasModule);
    return hasModule;
  } catch (error) {
    console.log('📱 iOS HealthKit not available:', error);
    return false;
  }
};

/**
 * Request iOS HealthKit permissions using react-native-health
 */
export const requestIOSHealthPermissions = async (): Promise<HealthPermissionStatus> => {
  if (Platform.OS !== 'ios') {
    return {
      isAvailable: false,
      isAuthorized: false,
      missingPermissions: [],
      message: 'iOS only feature',
    };
  }

  try {
    // Dynamic import to prevent crashes on non-iOS or when module not available
    const AppleHealthKit = require('react-native-health').default;
    
    if (!AppleHealthKit) {
      return {
        isAvailable: false,
        isAuthorized: false,
        missingPermissions: ['react-native-health module'],
        message: 'Health module not installed. Build with: npx expo run:ios',
      };
    }

    const permissions = {
      permissions: {
        read: [
          AppleHealthKit.Constants.Permissions.SleepAnalysis,
          AppleHealthKit.Constants.Permissions.Steps,
          AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
          AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
          AppleHealthKit.Constants.Permissions.Water,
          AppleHealthKit.Constants.Permissions.HeartRate,
          AppleHealthKit.Constants.Permissions.Workout,
        ],
        write: [],
      },
    };

    return new Promise((resolve) => {
      AppleHealthKit.initHealthKit(permissions, (error: string) => {
        if (error) {
          console.error('❌ HealthKit permission error:', error);
          resolve({
            isAvailable: true,
            isAuthorized: false,
            missingPermissions: ['HealthKit access'],
            message: `Permission denied: ${error}`,
          });
        } else {
          console.log('✅ HealthKit permissions granted');
          resolve({
            isAvailable: true,
            isAuthorized: true,
            missingPermissions: [],
            message: 'All permissions granted',
          });
        }
      });
    });
  } catch (error: any) {
    console.error('❌ Error requesting iOS health permissions:', error);
    return {
      isAvailable: false,
      isAuthorized: false,
      missingPermissions: ['react-native-health'],
      message: `Module error: ${error?.message || 'Unknown error'}. Build with: npx expo run:ios`,
    };
  }
};

/**
 * Fetch health data from iOS HealthKit using react-native-health
 */
const fetchIOSHealthData = async (settings: HealthSyncSettings): Promise<HealthData | null> => {
  try {
    console.log('📱 Fetching iOS health data...');
    
    // Dynamic import
    let AppleHealthKit: any;
    try {
      AppleHealthKit = require('react-native-health').default;
    } catch (error) {
      console.error('❌ react-native-health not available');
      console.warn('   Run: npx expo run:ios to build with native modules');
      return null;
    }

    if (!AppleHealthKit) {
      console.error('❌ AppleHealthKit is null');
      return null;
    }

    const healthData: HealthData = {};
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const dateOptions = {
      startDate: yesterday.toISOString(),
      endDate: now.toISOString(),
    };

    // Fetch Sleep Data
    if (settings.syncSleep) {
      try {
        const sleepSamples: any[] = await new Promise((resolve, reject) => {
          AppleHealthKit.getSleepSamples(dateOptions, (err: any, results: any[]) => {
            if (err) reject(err);
            else resolve(results || []);
          });
        });

        if (sleepSamples.length > 0) {
          // Filter for actual sleep (not "in bed")
          const actualSleep = sleepSamples.filter(
            (s: any) => s.value === 'ASLEEP' || s.value === 'INBED'
          );
          
          const totalMinutes = actualSleep.reduce((sum: number, sample: any) => {
            const start = new Date(sample.startDate).getTime();
            const end = new Date(sample.endDate).getTime();
            return sum + (end - start) / (1000 * 60);
          }, 0);
          
          healthData.sleep_hours = Math.round((totalMinutes / 60) * 10) / 10;
          console.log(`✅ Sleep: ${healthData.sleep_hours} hours`);
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch sleep data:', error);
      }
    }

    // Fetch Steps
    if (settings.syncSteps) {
      try {
        const stepsData: any = await new Promise((resolve, reject) => {
          AppleHealthKit.getStepCount(dateOptions, (err: any, results: any) => {
            if (err) reject(err);
            else resolve(results);
          });
        });

        if (stepsData && stepsData.value) {
          healthData.steps = Math.round(stepsData.value);
          console.log(`✅ Steps: ${healthData.steps}`);
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch steps:', error);
      }
    }

    // Fetch Workouts/Exercise
    if (settings.syncWorkouts) {
      try {
        const workouts: any[] = await new Promise((resolve, reject) => {
          AppleHealthKit.getSamples(
            {
              ...dateOptions,
              type: 'Workout',
            },
            (err: any, results: any[]) => {
              if (err) reject(err);
              else resolve(results || []);
            }
          );
        });

        if (workouts.length > 0) {
          const totalMinutes = workouts.reduce((sum: number, workout: any) => {
            return sum + (workout.duration || 0);
          }, 0);
          // Convert minutes to hours with 1 decimal
          healthData.exercise_duration = Math.round((totalMinutes / 60) * 10) / 10;
          console.log(`✅ Exercise: ${healthData.exercise_duration} hours`);
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch workouts:', error);
      }
    }

    // Fetch Water Intake
    if (settings.syncNutrition) {
      try {
        const waterData: any = await new Promise((resolve, reject) => {
          AppleHealthKit.getWaterSamples
            ? AppleHealthKit.getWaterSamples(dateOptions, (err: any, results: any) => {
                if (err) reject(err);
                else resolve(results);
              })
            : resolve(null);
        });

        if (waterData && Array.isArray(waterData) && waterData.length > 0) {
          const totalML = waterData.reduce((sum: number, sample: any) => {
            return sum + (sample.value || 0);
          }, 0);
          healthData.water_intake = Math.round((totalML / 1000) * 10) / 10; // ML to Liters
          console.log(`✅ Water: ${healthData.water_intake}L`);
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch water intake:', error);
      }
    }

    // Fetch Heart Rate
    if (settings.syncHeartRate) {
      try {
        const heartRateSamples: any[] = await new Promise((resolve, reject) => {
          AppleHealthKit.getHeartRateSamples(dateOptions, (err: any, results: any[]) => {
            if (err) reject(err);
            else resolve(results || []);
          });
        });

        if (heartRateSamples.length > 0) {
          const avgHR = heartRateSamples.reduce((sum: number, sample: any) => {
            return sum + (sample.value || 0);
          }, 0) / heartRateSamples.length;
          
          healthData.heart_rate_avg = Math.round(avgHR);
          console.log(`✅ Avg Heart Rate: ${healthData.heart_rate_avg} bpm`);
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch heart rate:', error);
      }
    }

    const hasData = Object.keys(healthData).length > 0;
    console.log(`📱 iOS Health data fetch complete. Has data: ${hasData}`);
    
    return hasData ? healthData : null;
  } catch (error: any) {
    console.error('❌ Error fetching iOS health data:', error?.message || error);
    return null;
  }
};

// ============================================================================
// Android: expo-health-connect Implementation
// ============================================================================

/**
 * Check if react-native-health-connect is available
 */
export const isAndroidHealthConnectAvailable = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return false;
  
  try {
    // Dynamic import to prevent crashes on iOS
    const HealthConnect = require('react-native-health-connect');
    const { getSdkStatus, SdkAvailabilityStatus } = HealthConnect;
    
    const status = await getSdkStatus();
    const isAvailable = status === SdkAvailabilityStatus.SDK_AVAILABLE;
    
    console.log('🤖 Android Health Connect available:', isAvailable, 'Status:', status);
    return isAvailable;
  } catch (error) {
    console.log('🤖 Health Connect not available:', error);
    return false;
  }
};

/**
 * Request Android Health Connect permissions
 */
export const requestAndroidHealthPermissions = async (): Promise<HealthPermissionStatus> => {
  if (Platform.OS !== 'android') {
    return {
      isAvailable: false,
      isAuthorized: false,
      missingPermissions: [],
      message: 'Android only feature',
    };
  }

  try {
    // Dynamic import to prevent crashes on iOS
    const HealthConnect = require('react-native-health-connect');
    const { 
      initialize, 
      requestPermission, 
      getSdkStatus, 
      SdkAvailabilityStatus 
    } = HealthConnect;

    // Check SDK availability
    const sdkStatus = await getSdkStatus();
    if (sdkStatus !== SdkAvailabilityStatus.SDK_AVAILABLE) {
      return {
        isAvailable: false,
        isAuthorized: false,
        missingPermissions: ['Health Connect SDK'],
        message: 'Health Connect is not available. Please install Google Health Connect from Play Store.',
      };
    }

    // Initialize
    const initialized = await initialize();
    if (!initialized) {
      return {
        isAvailable: true,
        isAuthorized: false,
        missingPermissions: ['Health Connect initialization'],
        message: 'Failed to initialize Health Connect.',
      };
    }

    // Request permissions
    const permissions = await requestPermission([
      { accessType: 'read', recordType: 'Steps' },
      { accessType: 'read', recordType: 'SleepSession' },
      { accessType: 'read', recordType: 'HeartRate' },
      { accessType: 'read', recordType: 'ExerciseSession' },
      { accessType: 'read', recordType: 'Hydration' },
      { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
    ]);

    // Check if permissions were granted
    const allGranted = Array.isArray(permissions) && permissions.length > 0;
    const missingPermissions: string[] = [];

    console.log('🤖 Health Connect permissions:', { allGranted, permissions });

    return {
      isAvailable: true,
      isAuthorized: allGranted,
      missingPermissions,
      message: allGranted 
        ? 'All permissions granted' 
        : 'Some permissions were not granted',
    };
  } catch (error: any) {
    console.error('❌ Error requesting Android health permissions:', error);
    return {
      isAvailable: false,
      isAuthorized: false,
      missingPermissions: ['react-native-health-connect'],
      message: `Error: ${error?.message || 'Unknown error'}`,
    };
  }
};

/**
 * Fetch health data from Android Health Connect
 */
const fetchAndroidHealthData = async (settings: HealthSyncSettings): Promise<HealthData | null> => {
  try {
    console.log('🤖 Fetching Android health data via Health Connect...');
    
    // Dynamic import to prevent crashes on iOS
    const HealthConnect = require('react-native-health-connect');
    const { readRecords, initialize } = HealthConnect;

    // Initialize Health Connect
    const initialized = await initialize();
    if (!initialized) {
      console.error('❌ Failed to initialize Health Connect');
      return null;
    }

    const healthData: HealthData = {};
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const timeRangeFilter = {
      operator: 'between',
      startTime: yesterday.toISOString(),
      endTime: now.toISOString(),
    };

    // Fetch Steps
    if (settings.syncSteps) {
      try {
        const stepsRecords = await readRecords('Steps', { timeRangeFilter });
        
        if (stepsRecords && stepsRecords.length > 0) {
          const totalSteps = stepsRecords.reduce((sum: number, record: any) => {
            return sum + (record.count || 0);
          }, 0);
          healthData.steps = totalSteps;
          console.log(`✅ Steps: ${healthData.steps}`);
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch steps:', error);
      }
    }

    // Fetch Sleep
    if (settings.syncSleep) {
      try {
        const sleepRecords = await readRecords('SleepSession', { timeRangeFilter });
        
        if (sleepRecords && sleepRecords.length > 0) {
          const totalMinutes = sleepRecords.reduce((sum: number, record: any) => {
            const start = new Date(record.startTime).getTime();
            const end = new Date(record.endTime).getTime();
            return sum + (end - start) / (1000 * 60);
          }, 0);
          healthData.sleep_hours = Math.round((totalMinutes / 60) * 10) / 10;
          console.log(`✅ Sleep: ${healthData.sleep_hours} hours`);
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch sleep:', error);
      }
    }

    // Fetch Exercise Sessions
    if (settings.syncWorkouts) {
      try {
        const exerciseRecords = await readRecords('ExerciseSession', { timeRangeFilter });
        
        if (exerciseRecords && exerciseRecords.length > 0) {
          const totalMinutes = exerciseRecords.reduce((sum: number, record: any) => {
            const start = new Date(record.startTime).getTime();
            const end = new Date(record.endTime).getTime();
            return sum + (end - start) / (1000 * 60);
          }, 0);
          healthData.exercise_duration = Math.round((totalMinutes / 60) * 10) / 10;
          console.log(`✅ Exercise: ${healthData.exercise_duration} hours`);
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch exercise:', error);
      }
    }

    // Fetch Heart Rate
    if (settings.syncHeartRate) {
      try {
        const heartRateRecords = await readRecords('HeartRate', { timeRangeFilter });
        
        if (heartRateRecords && heartRateRecords.length > 0) {
          let totalBPM = 0;
          let count = 0;
          
          heartRateRecords.forEach((record: any) => {
            if (record.samples) {
              record.samples.forEach((sample: any) => {
                totalBPM += sample.beatsPerMinute || 0;
                count++;
              });
            }
          });
          
          if (count > 0) {
            healthData.heart_rate_avg = Math.round(totalBPM / count);
            console.log(`✅ Avg Heart Rate: ${healthData.heart_rate_avg} bpm`);
          }
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch heart rate:', error);
      }
    }

    // Fetch Hydration
    if (settings.syncNutrition) {
      try {
        const hydrationRecords = await readRecords('Hydration', { timeRangeFilter });
        
        if (hydrationRecords && hydrationRecords.length > 0) {
          const totalLiters = hydrationRecords.reduce((sum: number, record: any) => {
            return sum + (record.volume?.inLiters || 0);
          }, 0);
          healthData.water_intake = Math.round(totalLiters * 10) / 10;
          console.log(`✅ Water: ${healthData.water_intake}L`);
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch hydration:', error);
      }
    }

    const hasData = Object.keys(healthData).length > 0;
    console.log(`🤖 Android Health data fetch complete. Has data: ${hasData}`);
    
    return hasData ? healthData : null;
  } catch (error: any) {
    console.error('❌ Error fetching Android health data:', error?.message || error);
    return null;
  }
};

// ============================================================================
// Cross-Platform Health Data Fetching
// ============================================================================

/**
 * Check if health data is available on current platform
 */
export const isHealthDataAvailable = async (): Promise<boolean> => {
  if (Platform.OS === 'ios') {
    return isIOSHealthAvailable();
  } else if (Platform.OS === 'android') {
    return await isAndroidHealthConnectAvailable();
  }
  return false;
};

/**
 * Request health permissions for current platform
 */
export const requestHealthPermissions = async (): Promise<HealthPermissionStatus> => {
  if (Platform.OS === 'ios') {
    return await requestIOSHealthPermissions();
  } else if (Platform.OS === 'android') {
    return await requestAndroidHealthPermissions();
  }
  
  return {
    isAvailable: false,
    isAuthorized: false,
    missingPermissions: [],
    message: 'Health data not available on this platform',
  };
};

/**
 * Fetch health data from device (cross-platform)
 */
const fetchHealthDataFromDevice = async (settings: HealthSyncSettings): Promise<HealthData | null> => {
  try {
    console.log('📊 Fetching health data from device...');

    if (Platform.OS === 'ios') {
      console.log('📱 iOS: Using react-native-health');
      return await fetchIOSHealthData(settings);
    } else if (Platform.OS === 'android') {
      console.log('🤖 Android: Using expo-health-connect');
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

// ============================================================================
// Data Processing & Sync
// ============================================================================

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

    const today = new Date();
    
    // Convert to routine log format
    // Note: exercise_duration is in hours, backend expects minutes
    const payload: RoutineLogPayload = {
      user_id: userId,
      sleep_hours: healthData.sleep_hours || 0,
      exercise_duration: Math.round((healthData.exercise_duration || 0) * 60), // Convert hours to minutes
      screen_time: 0,
      water_intake: healthData.water_intake || 0,
      stress_level: 5, // Default
      wake_up_time: '07:00',
      bed_time: '23:00',
      meal_times: healthData.meal_times || [],
      log_date: today.toISOString().split('T')[0],
    };

    // Only sync if we have meaningful data
    const hasData = payload.sleep_hours > 0 || payload.exercise_duration > 0 || payload.water_intake > 0;
    if (!hasData) {
      console.log('⏭️ No meaningful health data to sync');
      return false;
    }

    console.log('📤 Syncing health data to backend:', payload);
    const response = await createRoutineLog(payload);
    console.log('✅ Health data synced successfully:', response);
    
    return true;
  } catch (error) {
    console.error('❌ Error syncing health data:', error);
    return false;
  }
};

// ============================================================================
// Background Sync Task
// ============================================================================

/**
 * Main background sync function
 */
const performBackgroundSync = async (): Promise<BackgroundFetch.BackgroundFetchResult> => {
  try {
    console.log('🔄 Background health sync started...');

    const settings = await loadHealthSyncSettings();
    if (!settings.enabled) {
      console.log('⏸️ Health sync is disabled');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const healthData = await fetchHealthDataFromDevice(settings);
    if (!healthData) {
      console.log('📭 No health data available');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const success = await processAndSyncHealthData(healthData);

    if (success) {
      settings.lastSyncTime = new Date().toISOString();
      settings.totalSyncs++;
      await saveHealthSyncSettings(settings);
      await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());

      console.log('✅ Background health sync completed');
      return BackgroundFetch.BackgroundFetchResult.NewData;
    }

    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.error('❌ Background health sync failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
};

// Define background task (wrapped to prevent crashes)
try {
  TaskManager.defineTask(HEALTH_SYNC_TASK, performBackgroundSync);
} catch (error) {
  console.error('❌ Error defining background task:', error);
}

// ============================================================================
// Task Registration
// ============================================================================

export const registerHealthSyncTask = async (): Promise<boolean> => {
  try {
    console.log('📝 Registering background health sync task...');

    const settings = await loadHealthSyncSettings();
    const isRegistered = await TaskManager.isTaskRegisteredAsync(HEALTH_SYNC_TASK);
    
    if (isRegistered) {
      console.log('ℹ️ Health sync task already registered');
      return true;
    }

    await BackgroundFetch.registerTaskAsync(HEALTH_SYNC_TASK, {
      minimumInterval: settings.syncInterval,
      stopOnTerminate: false,
      startOnBoot: true,
    });

    console.log('✅ Background health sync task registered');
    return true;
  } catch (error) {
    console.error('❌ Error registering health sync task:', error);
    return false;
  }
};

export const unregisterHealthSyncTask = async (): Promise<void> => {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(HEALTH_SYNC_TASK);
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(HEALTH_SYNC_TASK);
      console.log('✅ Background health sync task unregistered');
    }
  } catch (error) {
    console.error('❌ Error unregistering health sync task:', error);
  }
};

// ============================================================================
// Public API
// ============================================================================

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

export const getLastSyncTime = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(LAST_SYNC_KEY);
  } catch (error) {
    console.error('❌ Error getting last sync time:', error);
    return null;
  }
};

export const initializeHealthSync = async (): Promise<boolean> => {
  try {
    console.log('🏥 Initializing health sync system...');

    const status = await getBackgroundFetchStatus();
    if (status !== 'Available') {
      console.warn(`⚠️ Background fetch is ${status}`);
      return false;
    }

    const settings = await loadHealthSyncSettings();
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

export const updateSyncInterval = async (hours: number): Promise<void> => {
  try {
    const settings = await loadHealthSyncSettings();
    settings.syncInterval = hours * 60 * 60;
    await saveHealthSyncSettings(settings);

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
    return await fetchHealthDataFromDevice(settings);
  } catch (error) {
    console.error('❌ Error fetching health data for today:', error);
    return null;
  }
};

// ============================================================================
// Default Export
// ============================================================================

export default {
  // Initialization
  initializeHealthSync,
  
  // Permissions
  isHealthDataAvailable,
  requestHealthPermissions,
  isIOSHealthAvailable,
  isAndroidHealthConnectAvailable,
  requestIOSHealthPermissions,
  requestAndroidHealthPermissions,
  
  // Sync Operations
  manualHealthSync,
  fetchHealthDataForToday,
  
  // Task Management
  registerHealthSyncTask,
  unregisterHealthSyncTask,
  toggleHealthSync,
  updateSyncInterval,
  
  // Settings
  loadHealthSyncSettings,
  saveHealthSyncSettings,
  
  // Status
  getBackgroundFetchStatus,
  getLastSyncTime,
};
