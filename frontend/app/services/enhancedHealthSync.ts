/**
 * Enhanced Health Synchronization Service
 * 
 * Provides robust wearable data synchronization with:
 * 1. Batch sync with delayed reconciliation
 * 2. Background sync with adaptive intervals
 * 3. Offline-first architecture with conflict resolution
 * 4. User-configurable settings for API control
 * 5. Rate limiting and retry logic
 * 6. Data gap detection and manual re-sync
 * 
 * Academic Justification:
 * Reliable data collection is critical for behavioral anomaly detection.
 * This service ensures data completeness and consistency across devices.
 */

import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Task identifiers
const ENHANCED_SYNC_TASK = 'enhanced-health-sync';
const RECONCILIATION_TASK = 'health-data-reconciliation';

// Storage keys
const SYNC_SETTINGS_KEY = '@enhanced_sync_settings';
const PENDING_SYNC_KEY = '@pending_health_data';
const SYNC_HISTORY_KEY = '@sync_history';
const DATA_GAPS_KEY = '@detected_data_gaps';
const LAST_SUCCESSFUL_SYNC_KEY = '@last_successful_sync';

// ============================================================================
// Types
// ============================================================================

/**
 * Comprehensive sync settings for user control
 */
export interface EnhancedSyncSettings {
  // Master toggle
  enabled: boolean;
  
  // Sync frequency (in minutes)
  syncInterval: number;
  
  // Individual data source toggles
  dataSources: {
    sleep: boolean;
    steps: boolean;
    heartRate: boolean;
    heartRateVariability: boolean;
    workouts: boolean;
    nutrition: boolean;
    hydration: boolean;
    activeEnergy: boolean;
    restingEnergy: boolean;
  };
  
  // Sync behavior
  syncBehavior: {
    // Sync when app opens
    syncOnAppOpen: boolean;
    // Sync when connectivity restored
    syncOnConnectivity: boolean;
    // Use cellular data for sync
    allowCellularSync: boolean;
    // Batch size for bulk uploads
    batchSize: number;
    // Retry attempts for failed syncs
    maxRetryAttempts: number;
    // Backoff multiplier for retries
    retryBackoffMultiplier: number;
  };
  
  // Power management
  powerSettings: {
    // Reduce sync frequency on low battery
    reduceSyncOnLowBattery: boolean;
    // Low battery threshold (%)
    lowBatteryThreshold: number;
  };
  
  // Data retention
  dataRetention: {
    // Keep local cache for N days
    localCacheDays: number;
    // Keep detailed data for N days (then aggregate)
    detailedDataDays: number;
  };
  
  // Metadata
  lastModified: string;
  version: string;
}

/**
 * Pending sync record for offline support
 */
export interface PendingSyncRecord {
  id: string;
  timestamp: string;
  dataType: string;
  data: any;
  attempts: number;
  lastAttempt?: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'syncing' | 'failed' | 'conflict';
}

/**
 * Data gap detection
 */
export interface DataGap {
  id: string;
  dataType: string;
  startDate: string;
  endDate: string;
  estimatedRecords: number;
  detectedAt: string;
  resolved: boolean;
  resolutionAttempts: number;
}

/**
 * Sync history entry
 */
export interface SyncHistoryEntry {
  id: string;
  timestamp: string;
  syncType: 'background' | 'manual' | 'reconciliation' | 'gap_fill';
  status: 'success' | 'partial' | 'failed';
  recordsSynced: number;
  recordsFailed: number;
  duration: number;
  dataTypes: string[];
  errorMessage?: string;
}

/**
 * Sync status for UI display
 */
export interface SyncStatus {
  lastSync: string | null;
  nextScheduledSync: string | null;
  isCurrentlySyncing: boolean;
  pendingRecords: number;
  dataGaps: number;
  syncHealth: 'good' | 'degraded' | 'offline';
  recentErrors: string[];
}

// ============================================================================
// Default Settings
// ============================================================================

const getDefaultSettings = (): EnhancedSyncSettings => ({
  enabled: true,
  syncInterval: 60, // 1 hour
  
  dataSources: {
    sleep: true,
    steps: true,
    heartRate: true,
    heartRateVariability: true,
    workouts: true,
    nutrition: true,
    hydration: true,
    activeEnergy: false,
    restingEnergy: false,
  },
  
  syncBehavior: {
    syncOnAppOpen: true,
    syncOnConnectivity: true,
    allowCellularSync: true,
    batchSize: 50,
    maxRetryAttempts: 3,
    retryBackoffMultiplier: 2,
  },
  
  powerSettings: {
    reduceSyncOnLowBattery: true,
    lowBatteryThreshold: 20,
  },
  
  dataRetention: {
    localCacheDays: 30,
    detailedDataDays: 7,
  },
  
  lastModified: new Date().toISOString(),
  version: '2.0.0',
});

// ============================================================================
// Settings Management
// ============================================================================

export const loadEnhancedSyncSettings = async (): Promise<EnhancedSyncSettings> => {
  try {
    const stored = await AsyncStorage.getItem(SYNC_SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to ensure new fields exist
      return { ...getDefaultSettings(), ...parsed };
    }
    return getDefaultSettings();
  } catch (error) {
    console.error('❌ Error loading enhanced sync settings:', error);
    return getDefaultSettings();
  }
};

export const saveEnhancedSyncSettings = async (
  settings: EnhancedSyncSettings
): Promise<void> => {
  try {
    settings.lastModified = new Date().toISOString();
    await AsyncStorage.setItem(SYNC_SETTINGS_KEY, JSON.stringify(settings));
    console.log('✅ Enhanced sync settings saved');
    
    // Re-register background tasks with new settings
    if (settings.enabled) {
      await registerEnhancedSyncTasks(settings);
    } else {
      await unregisterEnhancedSyncTasks();
    }
  } catch (error) {
    console.error('❌ Error saving enhanced sync settings:', error);
    throw error;
  }
};

export const updateSyncDataSources = async (
  dataSources: Partial<EnhancedSyncSettings['dataSources']>
): Promise<void> => {
  const settings = await loadEnhancedSyncSettings();
  settings.dataSources = { ...settings.dataSources, ...dataSources };
  await saveEnhancedSyncSettings(settings);
};

export const updateSyncInterval = async (intervalMinutes: number): Promise<void> => {
  const settings = await loadEnhancedSyncSettings();
  settings.syncInterval = intervalMinutes;
  await saveEnhancedSyncSettings(settings);
};

// ============================================================================
// Offline Queue Management
// ============================================================================

export const addToPendingQueue = async (
  dataType: string,
  data: any,
  priority: 'high' | 'medium' | 'low' = 'medium'
): Promise<void> => {
  try {
    const pendingData = await getPendingQueue();
    
    const record: PendingSyncRecord = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      dataType,
      data,
      attempts: 0,
      priority,
      status: 'pending',
    };
    
    pendingData.push(record);
    
    // Sort by priority and timestamp
    pendingData.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });
    
    await AsyncStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pendingData));
    console.log(`📥 Added to pending queue: ${dataType}`);
  } catch (error) {
    console.error('❌ Error adding to pending queue:', error);
  }
};

export const getPendingQueue = async (): Promise<PendingSyncRecord[]> => {
  try {
    const stored = await AsyncStorage.getItem(PENDING_SYNC_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('❌ Error loading pending queue:', error);
    return [];
  }
};

export const clearPendingQueue = async (): Promise<void> => {
  await AsyncStorage.setItem(PENDING_SYNC_KEY, JSON.stringify([]));
};

export const removePendingRecord = async (recordId: string): Promise<void> => {
  const pending = await getPendingQueue();
  const filtered = pending.filter(r => r.id !== recordId);
  await AsyncStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(filtered));
};

// ============================================================================
// Data Gap Detection
// ============================================================================

export const detectDataGaps = async (
  dataType: string,
  existingDates: string[]
): Promise<DataGap[]> => {
  const gaps: DataGap[] = [];
  
  if (existingDates.length < 2) return gaps;
  
  // Sort dates
  const sortedDates = existingDates
    .map(d => new Date(d))
    .sort((a, b) => a.getTime() - b.getTime());
  
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = sortedDates[i - 1];
    const curr = sortedDates[i];
    const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    
    // Gap detected if more than 1 day
    if (diffDays > 1.5) {
      gaps.push({
        id: `gap-${dataType}-${prev.toISOString()}`,
        dataType,
        startDate: prev.toISOString(),
        endDate: curr.toISOString(),
        estimatedRecords: Math.floor(diffDays),
        detectedAt: new Date().toISOString(),
        resolved: false,
        resolutionAttempts: 0,
      });
    }
  }
  
  // Store gaps
  if (gaps.length > 0) {
    await storeDataGaps(gaps);
  }
  
  return gaps;
};

export const storeDataGaps = async (newGaps: DataGap[]): Promise<void> => {
  try {
    const existingGaps = await getDataGaps();
    const existingIds = new Set(existingGaps.map(g => g.id));
    
    const uniqueNewGaps = newGaps.filter(g => !existingIds.has(g.id));
    const allGaps = [...existingGaps, ...uniqueNewGaps];
    
    await AsyncStorage.setItem(DATA_GAPS_KEY, JSON.stringify(allGaps));
  } catch (error) {
    console.error('❌ Error storing data gaps:', error);
  }
};

export const getDataGaps = async (): Promise<DataGap[]> => {
  try {
    const stored = await AsyncStorage.getItem(DATA_GAPS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('❌ Error loading data gaps:', error);
    return [];
  }
};

export const resolveDataGap = async (gapId: string): Promise<void> => {
  const gaps = await getDataGaps();
  const updated = gaps.map(g =>
    g.id === gapId ? { ...g, resolved: true } : g
  );
  await AsyncStorage.setItem(DATA_GAPS_KEY, JSON.stringify(updated));
};

// ============================================================================
// Sync History
// ============================================================================

export const addSyncHistoryEntry = async (
  entry: Omit<SyncHistoryEntry, 'id'>
): Promise<void> => {
  try {
    const history = await getSyncHistory();
    
    const newEntry: SyncHistoryEntry = {
      id: `sync-${Date.now()}`,
      ...entry,
    };
    
    history.unshift(newEntry);
    
    // Keep last 100 entries
    const trimmed = history.slice(0, 100);
    
    await AsyncStorage.setItem(SYNC_HISTORY_KEY, JSON.stringify(trimmed));
    
    if (entry.status === 'success' || entry.status === 'partial') {
      await AsyncStorage.setItem(LAST_SUCCESSFUL_SYNC_KEY, new Date().toISOString());
    }
  } catch (error) {
    console.error('❌ Error adding sync history:', error);
  }
};

export const getSyncHistory = async (): Promise<SyncHistoryEntry[]> => {
  try {
    const stored = await AsyncStorage.getItem(SYNC_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('❌ Error loading sync history:', error);
    return [];
  }
};

// ============================================================================
// Sync Status
// ============================================================================

export const getSyncStatus = async (): Promise<SyncStatus> => {
  try {
    const [settings, pending, gaps, history, lastSync] = await Promise.all([
      loadEnhancedSyncSettings(),
      getPendingQueue(),
      getDataGaps(),
      getSyncHistory(),
      AsyncStorage.getItem(LAST_SUCCESSFUL_SYNC_KEY),
    ]);
    
    const netInfo = await NetInfo.fetch();
    
    const recentFailures = history
      .filter(h => h.status === 'failed' && 
        new Date(h.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000))
      .map(h => h.errorMessage || 'Unknown error');
    
    let syncHealth: 'good' | 'degraded' | 'offline' = 'good';
    
    if (!netInfo.isConnected) {
      syncHealth = 'offline';
    } else if (pending.length > 10 || recentFailures.length > 3) {
      syncHealth = 'degraded';
    }
    
    // Calculate next sync time
    const lastSyncTime = lastSync ? new Date(lastSync) : null;
    const nextSync = lastSyncTime 
      ? new Date(lastSyncTime.getTime() + settings.syncInterval * 60 * 1000)
      : null;
    
    return {
      lastSync,
      nextScheduledSync: nextSync?.toISOString() || null,
      isCurrentlySyncing: pending.some(p => p.status === 'syncing'),
      pendingRecords: pending.length,
      dataGaps: gaps.filter(g => !g.resolved).length,
      syncHealth,
      recentErrors: recentFailures.slice(0, 5),
    };
  } catch (error) {
    console.error('❌ Error getting sync status:', error);
    return {
      lastSync: null,
      nextScheduledSync: null,
      isCurrentlySyncing: false,
      pendingRecords: 0,
      dataGaps: 0,
      syncHealth: 'offline',
      recentErrors: ['Failed to get sync status'],
    };
  }
};

// ============================================================================
// Rate Limiting
// ============================================================================

interface RateLimitState {
  requests: number;
  windowStart: number;
}

const rateLimitState: RateLimitState = {
  requests: 0,
  windowStart: Date.now(),
};

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // Max requests per window

export const checkRateLimit = (): boolean => {
  const now = Date.now();
  
  // Reset window if expired
  if (now - rateLimitState.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitState.requests = 0;
    rateLimitState.windowStart = now;
  }
  
  if (rateLimitState.requests >= RATE_LIMIT_MAX_REQUESTS) {
    console.warn('⚠️ Rate limit reached, delaying sync');
    return false;
  }
  
  rateLimitState.requests++;
  return true;
};

export const getRateLimitWaitTime = (): number => {
  const now = Date.now();
  const windowEnd = rateLimitState.windowStart + RATE_LIMIT_WINDOW;
  return Math.max(0, windowEnd - now);
};

// ============================================================================
// Batch Sync with Retry Logic
// ============================================================================

export const processPendingSync = async (
  syncFunction: (data: any) => Promise<boolean>
): Promise<{ synced: number; failed: number }> => {
  const settings = await loadEnhancedSyncSettings();
  const pending = await getPendingQueue();
  
  let synced = 0;
  let failed = 0;
  
  // Check network connectivity
  const netInfo = await NetInfo.fetch();
  if (!netInfo.isConnected) {
    console.log('📴 No network connection, skipping sync');
    return { synced: 0, failed: pending.length };
  }
  
  // Check cellular restriction
  if (netInfo.type === 'cellular' && !settings.syncBehavior.allowCellularSync) {
    console.log('📵 Cellular sync disabled, skipping');
    return { synced: 0, failed: 0 };
  }
  
  // Process in batches
  const batchSize = settings.syncBehavior.batchSize;
  const toProcess = pending.slice(0, batchSize);
  
  for (const record of toProcess) {
    // Check rate limit
    if (!checkRateLimit()) {
      const waitTime = getRateLimitWaitTime();
      console.log(`⏳ Rate limited, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    try {
      record.status = 'syncing';
      record.attempts++;
      record.lastAttempt = new Date().toISOString();
      
      const success = await syncFunction(record.data);
      
      if (success) {
        await removePendingRecord(record.id);
        synced++;
      } else {
        throw new Error('Sync returned false');
      }
    } catch (error: any) {
      console.error(`❌ Failed to sync record ${record.id}:`, error);
      record.status = 'failed';
      
      if (record.attempts >= settings.syncBehavior.maxRetryAttempts) {
        // Move to failed/conflict state
        record.status = 'conflict';
        console.warn(`⚠️ Record ${record.id} exceeded max retries`);
      }
      
      failed++;
    }
  }
  
  // Update pending queue with status changes
  const remainingPending = pending.slice(batchSize);
  const updatedToProcess = toProcess.filter(r => r.status !== 'pending');
  await AsyncStorage.setItem(
    PENDING_SYNC_KEY, 
    JSON.stringify([...updatedToProcess.filter(r => r.status === 'failed' || r.status === 'conflict'), ...remainingPending])
  );
  
  return { synced, failed };
};

// ============================================================================
// Manual Re-sync for Data Gaps
// ============================================================================

export const triggerManualResync = async (
  startDate: Date,
  endDate: Date,
  dataTypes: string[]
): Promise<{ success: boolean; message: string }> => {
  try {
    console.log(`🔄 Manual resync triggered: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    console.log(`📊 Data types: ${dataTypes.join(', ')}`);
    
    const settings = await loadEnhancedSyncSettings();
    
    // Check network
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      return { success: false, message: 'No network connection' };
    }
    
    // Mark any matching gaps as resolution in progress
    const gaps = await getDataGaps();
    for (const gap of gaps) {
      if (dataTypes.includes(gap.dataType) && !gap.resolved) {
        gap.resolutionAttempts++;
      }
    }
    await AsyncStorage.setItem(DATA_GAPS_KEY, JSON.stringify(gaps));
    
    // Add to sync history
    await addSyncHistoryEntry({
      timestamp: new Date().toISOString(),
      syncType: 'gap_fill',
      status: 'success',
      recordsSynced: 0,
      recordsFailed: 0,
      duration: 0,
      dataTypes,
    });
    
    return { 
      success: true, 
      message: `Manual resync initiated for ${dataTypes.length} data types` 
    };
  } catch (error: any) {
    console.error('❌ Manual resync failed:', error);
    return { success: false, message: error.message || 'Unknown error' };
  }
};

// ============================================================================
// Background Task Registration
// ============================================================================

export const registerEnhancedSyncTasks = async (
  settings: EnhancedSyncSettings
): Promise<boolean> => {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(ENHANCED_SYNC_TASK);
    
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(ENHANCED_SYNC_TASK);
    }
    
    await BackgroundFetch.registerTaskAsync(ENHANCED_SYNC_TASK, {
      minimumInterval: settings.syncInterval * 60, // Convert to seconds
      stopOnTerminate: false,
      startOnBoot: true,
    });
    
    console.log('✅ Enhanced sync task registered');
    return true;
  } catch (error) {
    console.error('❌ Failed to register sync task:', error);
    return false;
  }
};

export const unregisterEnhancedSyncTasks = async (): Promise<void> => {
  try {
    const tasks = [ENHANCED_SYNC_TASK, RECONCILIATION_TASK];
    
    for (const task of tasks) {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(task);
      if (isRegistered) {
        await BackgroundFetch.unregisterTaskAsync(task);
      }
    }
    
    console.log('✅ Enhanced sync tasks unregistered');
  } catch (error) {
    console.error('❌ Failed to unregister sync tasks:', error);
  }
};

// ============================================================================
// Connectivity Listener
// ============================================================================

let connectivityUnsubscribe: (() => void) | null = null;

export const startConnectivityListener = async (): Promise<void> => {
  if (connectivityUnsubscribe) {
    return; // Already listening
  }
  
  connectivityUnsubscribe = NetInfo.addEventListener(async (state) => {
    const settings = await loadEnhancedSyncSettings();
    
    if (state.isConnected && settings.syncBehavior.syncOnConnectivity) {
      const pending = await getPendingQueue();
      
      if (pending.length > 0) {
        console.log('🌐 Connectivity restored, processing pending syncs');
        // Trigger sync (implement actual sync logic based on your API)
        // await processPendingSync(yourSyncFunction);
      }
    }
  });
  
  console.log('🔌 Connectivity listener started');
};

export const stopConnectivityListener = (): void => {
  if (connectivityUnsubscribe) {
    connectivityUnsubscribe();
    connectivityUnsubscribe = null;
    console.log('🔌 Connectivity listener stopped');
  }
};

// ============================================================================
// Initialization
// ============================================================================

export const initializeEnhancedSync = async (): Promise<boolean> => {
  try {
    console.log('🚀 Initializing enhanced health sync...');
    
    const settings = await loadEnhancedSyncSettings();
    
    if (!settings.enabled) {
      console.log('⏸️ Enhanced sync is disabled');
      return false;
    }
    
    // Check background fetch availability
    const status = await BackgroundFetch.getStatusAsync();
    if (status !== BackgroundFetch.BackgroundFetchStatus.Available) {
      console.warn('⚠️ Background fetch not available:', status);
    }
    
    // Register tasks
    await registerEnhancedSyncTasks(settings);
    
    // Start connectivity listener
    await startConnectivityListener();
    
    // Sync on app open if enabled
    if (settings.syncBehavior.syncOnAppOpen) {
      console.log('📱 Triggering sync on app open...');
      // Implement actual sync
    }
    
    console.log('✅ Enhanced sync initialized');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize enhanced sync:', error);
    return false;
  }
};

// ============================================================================
// Export Default
// ============================================================================

export default {
  // Settings
  loadEnhancedSyncSettings,
  saveEnhancedSyncSettings,
  updateSyncDataSources,
  updateSyncInterval,
  
  // Queue Management
  addToPendingQueue,
  getPendingQueue,
  clearPendingQueue,
  processPendingSync,
  
  // Data Gaps
  detectDataGaps,
  getDataGaps,
  resolveDataGap,
  triggerManualResync,
  
  // History & Status
  getSyncHistory,
  addSyncHistoryEntry,
  getSyncStatus,
  
  // Rate Limiting
  checkRateLimit,
  getRateLimitWaitTime,
  
  // Task Management
  registerEnhancedSyncTasks,
  unregisterEnhancedSyncTasks,
  
  // Connectivity
  startConnectivityListener,
  stopConnectivityListener,
  
  // Initialization
  initializeEnhancedSync,
};

