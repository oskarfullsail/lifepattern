/**
 * Automation Initialization Module
 * Sets up all automation services on app startup
 * 
 * CRITICAL: All initialization is NON-BLOCKING to prevent app freeze
 * Apple App Store requires responsive UI within 3 seconds of launch
 */

import smartReminders from '../services/smartReminders';
import healthSync from '../services/healthSync';
import passiveTracking from '../services/passiveTracking';
import aiProductivityCoach from '../services/aiProductivityCoach';

// Timeout for each individual service initialization (ms)
const SERVICE_INIT_TIMEOUT = 5000;

// Helper to add timeout to any promise
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => 
      setTimeout(() => {
        console.warn(`⏱️ Service initialization timed out after ${timeoutMs}ms`);
        resolve(fallback);
      }, timeoutMs)
    )
  ]);
};

export interface AutomationStatus {
  reminders: {
    initialized: boolean;
    enabled: boolean;
    error?: string;
  };
  healthSync: {
    initialized: boolean;
    enabled: boolean;
    status: string;
    error?: string;
  };
  passiveTracking: {
    initialized: boolean;
    enabled: boolean;
    error?: string;
  };
  aiProductivityCoach: {
    initialized: boolean;
    enabled: boolean;
    error?: string;
  };
}

/**
 * Initialize all automation services
 * Call this in App.tsx on startup
 */
export const initializeAutomation = async (): Promise<AutomationStatus> => {
  console.log('🚀 Initializing automation services...');

  const status: AutomationStatus = {
    reminders: {
      initialized: false,
      enabled: false,
    },
    healthSync: {
      initialized: false,
      enabled: false,
      status: 'Unknown',
    },
    passiveTracking: {
      initialized: false,
      enabled: false,
    },
    aiProductivityCoach: {
      initialized: false,
      enabled: false,
    },
  };

  try {
    // Initialize Smart Reminders
    try {
      console.log('🔔 Initializing Smart Reminders...');
      const remindersSuccess = await smartReminders.initializeReminderSystem();
      status.reminders.initialized = remindersSuccess;

      const reminderSettings = await smartReminders.loadReminderSettings();
      status.reminders.enabled = reminderSettings.enabled;

      console.log(
        `✅ Smart Reminders ${remindersSuccess ? 'initialized' : 'failed'}` +
          ` (${reminderSettings.enabled ? 'enabled' : 'disabled'})`
      );
    } catch (error) {
      console.error('❌ Failed to initialize Smart Reminders:', error);
      status.reminders.error = String(error);
    }

    // Initialize Health Sync
    try {
      console.log('🏥 Initializing Health Sync...');
      const healthSyncSuccess = await healthSync.initializeHealthSync();
      status.healthSync.initialized = healthSyncSuccess;

      const healthSyncSettings = await healthSync.loadHealthSyncSettings();
      status.healthSync.enabled = healthSyncSettings.enabled;

      const backgroundStatus = await healthSync.getBackgroundFetchStatus();
      status.healthSync.status = backgroundStatus;

      console.log(
        `✅ Health Sync ${healthSyncSuccess ? 'initialized' : 'failed'}` +
          ` (${healthSyncSettings.enabled ? 'enabled' : 'disabled'}, status: ${backgroundStatus})`
      );
    } catch (error) {
      console.error('❌ Failed to initialize Health Sync:', error);
      status.healthSync.error = String(error);
    }

    // Initialize Passive Tracking
    try {
      console.log('📡 Initializing Passive Tracking...');
      const passiveTrackingSuccess = await passiveTracking.initializePassiveTracking();
      status.passiveTracking.initialized = passiveTrackingSuccess;

      const passiveTrackingSettings = await passiveTracking.loadPassiveTrackingSettings();
      status.passiveTracking.enabled = passiveTrackingSettings.enabled;

      console.log(
        `✅ Passive Tracking ${passiveTrackingSuccess ? 'initialized' : 'failed'}` +
          ` (${passiveTrackingSettings.enabled ? 'enabled' : 'disabled'})`
      );
    } catch (error) {
      console.error('❌ Failed to initialize Passive Tracking:', error);
      status.passiveTracking.error = String(error);
    }

    // Initialize AI Productivity Coach
    try {
      console.log('🤖 Initializing AI Productivity Coach...');
      const aiCoachSettings = await aiProductivityCoach.loadAICoachSettings();
      status.aiProductivityCoach.initialized = true;
      status.aiProductivityCoach.enabled = aiCoachSettings.enabled;

      // Run initial AI check if enabled
      if (aiCoachSettings.enabled) {
        console.log('🧠 Running initial AI productivity check...');
        await aiProductivityCoach.runAIProductivityCheck();
      }

      console.log(
        `✅ AI Productivity Coach initialized` +
          ` (${aiCoachSettings.enabled ? 'enabled' : 'disabled'})`
      );
    } catch (error) {
      console.error('❌ Failed to initialize AI Productivity Coach:', error);
      status.aiProductivityCoach.error = String(error);
    }

    console.log('✅ Automation initialization complete');
    console.log('📊 Status:', status);

    return status;
  } catch (error) {
    console.error('❌ Fatal error during automation initialization:', error);
    return status;
  }
};

/**
 * Shutdown all automation services
 * Call this when app is closing or user logs out
 */
export const shutdownAutomation = async (): Promise<void> => {
  console.log('🛑 Shutting down automation services...');

  try {
    // Stop reminders
    await smartReminders.cancelAllReminders();

    // Unregister health sync
    await healthSync.unregisterHealthSyncTask();

    // Stop passive tracking
    passiveTracking.stopPassiveTracking();

    console.log('✅ Automation services shutdown complete');
  } catch (error) {
    console.error('❌ Error during automation shutdown:', error);
  }
};

/**
 * Get current automation status
 */
export const getAutomationStatus = async (): Promise<AutomationStatus> => {
  const status: AutomationStatus = {
    reminders: {
      initialized: false,
      enabled: false,
    },
    healthSync: {
      initialized: false,
      enabled: false,
      status: 'Unknown',
    },
    passiveTracking: {
      initialized: false,
      enabled: false,
    },
    aiProductivityCoach: {
      initialized: false,
      enabled: false,
    },
  };

  try {
    // Check reminders
    const reminderSettings = await smartReminders.loadReminderSettings();
    const scheduled = await smartReminders.getScheduledReminders();
    status.reminders.initialized = scheduled.length > 0;
    status.reminders.enabled = reminderSettings.enabled;

    // Check health sync
    const healthSyncSettings = await healthSync.loadHealthSyncSettings();
    status.healthSync.enabled = healthSyncSettings.enabled;
    status.healthSync.status = await healthSync.getBackgroundFetchStatus();

    // Check passive tracking
    const trackingStats = await passiveTracking.getTrackingStats();
    status.passiveTracking.initialized = trackingStats.isActive;
    status.passiveTracking.enabled = trackingStats.isActive;

    return status;
  } catch (error) {
    console.error('❌ Error getting automation status:', error);
    return status;
  }
};

/**
 * Reset all automation services to default settings
 */
export const resetAutomation = async (): Promise<void> => {
  console.log('🔄 Resetting automation services...');

  try {
    // Stop everything first
    await shutdownAutomation();

    // Reset settings (by removing stored settings, defaults will be used next time)
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.removeItem('@reminder_settings');
    await AsyncStorage.removeItem('@reminder_stats');
    await AsyncStorage.removeItem('@health_sync_settings');
    await AsyncStorage.removeItem('@last_health_sync');
    await AsyncStorage.removeItem('@passive_tracking_settings');
    await AsyncStorage.removeItem('@passive_data_cache');

    console.log('✅ Automation services reset complete');
  } catch (error) {
    console.error('❌ Error resetting automation:', error);
  }
};

/**
 * NON-BLOCKING initialization for app startup
 * This function returns immediately and runs initialization in background
 * 
 * CRITICAL: This is what App.tsx should call to prevent freeze
 */
export const initializeAutomationNonBlocking = (): void => {
  console.log('🚀 Starting non-blocking automation initialization...');
  
  // Run initialization in background - don't await!
  // This ensures the app UI renders immediately
  (async () => {
    try {
      // Initialize each service with individual timeouts
      // Services that fail or timeout are skipped gracefully
      
      // Smart Reminders (with timeout)
      try {
        console.log('🔔 [BG] Initializing Smart Reminders...');
        await withTimeout(
          smartReminders.initializeReminderSystem(),
          SERVICE_INIT_TIMEOUT,
          false
        );
        console.log('✅ [BG] Smart Reminders ready');
      } catch (error) {
        console.warn('⚠️ [BG] Smart Reminders failed:', error);
      }

      // Health Sync (with timeout)
      try {
        console.log('🏥 [BG] Initializing Health Sync...');
        await withTimeout(
          healthSync.initializeHealthSync(),
          SERVICE_INIT_TIMEOUT,
          false
        );
        console.log('✅ [BG] Health Sync ready');
      } catch (error) {
        console.warn('⚠️ [BG] Health Sync failed:', error);
      }

      // Passive Tracking (with timeout)
      try {
        console.log('📡 [BG] Initializing Passive Tracking...');
        await withTimeout(
          passiveTracking.initializePassiveTracking(),
          SERVICE_INIT_TIMEOUT,
          false
        );
        console.log('✅ [BG] Passive Tracking ready');
      } catch (error) {
        console.warn('⚠️ [BG] Passive Tracking failed:', error);
      }

      // AI Productivity Coach - SKIP initial check on startup
      // This was likely causing the freeze due to network call
      try {
        console.log('🤖 [BG] Loading AI Coach settings...');
        await withTimeout(
          aiProductivityCoach.loadAICoachSettings(),
          SERVICE_INIT_TIMEOUT,
          { enabled: false, checkInterval: 2, minDataPoints: 3, interventionStyle: 'supportive' as const, focusAreas: [] }
        );
        console.log('✅ [BG] AI Coach settings loaded');
        // NOTE: We do NOT run runAIProductivityCheck() on startup
        // This prevents network blocking on cold start
      } catch (error) {
        console.warn('⚠️ [BG] AI Coach failed:', error);
      }

      console.log('✅ [BG] Background initialization complete');
    } catch (error) {
      console.error('❌ [BG] Background initialization error:', error);
      // Never throw - background initialization should never crash the app
    }
  })();
  
  // Return immediately - don't wait for background work
  console.log('↩️ initializeAutomationNonBlocking returned (background work continues)');
};

export default {
  initializeAutomation,
  initializeAutomationNonBlocking,
  shutdownAutomation,
  getAutomationStatus,
  resetAutomation,
};

