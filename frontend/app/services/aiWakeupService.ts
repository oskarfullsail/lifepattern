/**
 * AI Service Wake-up Service
 * 
 * Handles background polling to wake up the AI service on Render free tier.
 * The free tier spins down after 15 minutes of inactivity, taking 30-60 seconds to wake up.
 */

import { 
  fetchAiHeartbeat, 
  AiHeartbeatResponse, 
  wakeUpAiService as directWakeUp,
  isAiServiceAvailable 
} from '../api/heartbeat';

// ============================================================================
// Types
// ============================================================================

export interface AIServiceStatus {
  isAvailable: boolean;
  isWakingUp: boolean;
  lastChecked: Date | null;
  retryCount: number;
  greeting?: string;
  error?: string;
}

type StatusCallback = (status: AIServiceStatus) => void;

// ============================================================================
// Service State
// ============================================================================

let currentStatus: AIServiceStatus = {
  isAvailable: false,
  isWakingUp: false,
  lastChecked: null,
  retryCount: 0,
};

let pollingInterval: ReturnType<typeof setInterval> | null = null;
let wakeupTimeout: ReturnType<typeof setTimeout> | null = null;
let isWakeupInProgress = false; // Separate flag to prevent race conditions
let statusCallbacks: StatusCallback[] = [];

// Configuration
const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes - keep service warm
const WAKEUP_RETRY_INTERVAL_MS = 5 * 1000; // 5 seconds - retry when waking up
const MAX_WAKEUP_RETRIES = 20; // Max ~100 seconds of retrying
const WAKEUP_OVERALL_TIMEOUT_MS = 120 * 1000; // 2 minutes max for entire wakeup

// ============================================================================
// Helper Functions
// ============================================================================

const updateStatus = (updates: Partial<AIServiceStatus>): void => {
  currentStatus = { ...currentStatus, ...updates };
  notifyListeners();
};

const notifyListeners = (): void => {
  const statusCopy = { ...currentStatus };
  statusCallbacks.forEach(callback => {
    try {
      callback(statusCopy);
    } catch (error) {
      console.error('Error in status callback:', error);
    }
  });
};

const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Check if AI service is available
 * First tries a quick check, then does full heartbeat if service is awake
 */
export const checkAIService = async (): Promise<AiHeartbeatResponse> => {
  try {
    // Quick check if service is already awake (5 second timeout)
    const quickCheck = await isAiServiceAvailable();
    
    if (!quickCheck) {
      // Service is sleeping, return waking_up status
      updateStatus({
        isAvailable: false,
        isWakingUp: false, // Not actively waking up yet
        lastChecked: new Date(),
        greeting: 'AI service is currently sleeping...',
      });
      
      return {
        status: 'unreachable',
        timestamp: new Date().toISOString(),
        greeting: 'AI service is sleeping. Tap to wake it up.',
      };
    }
    
    // Service is awake, get full heartbeat
    const response = await fetchAiHeartbeat();
    
    updateStatus({
      isAvailable: response.status === 'ok',
      isWakingUp: false,
      lastChecked: new Date(),
      retryCount: 0,
      greeting: response.greeting,
      error: undefined,
    });
    
    return response;
  } catch (error: any) {
    updateStatus({
      isAvailable: false,
      lastChecked: new Date(),
      error: error?.message || 'Connection failed',
    });
    throw error;
  }
};

/**
 * Start waking up the AI service with retries
 * Uses direct health endpoint call to wake up the service
 */
export const wakeUpAIService = async (
  onProgress?: (attempt: number, maxRetries: number) => void
): Promise<boolean> => {
  // Prevent concurrent wake-up attempts
  if (isWakeupInProgress) {
    console.log('🔄 AI service wake-up already in progress...');
    return false;
  }

  isWakeupInProgress = true;
  console.log('🌅 Starting AI service wake-up via direct health endpoint...');
  
  // Initialize status - start at attempt 1
  updateStatus({
    isWakingUp: true,
    retryCount: 1,
    greeting: 'Waking up AI service... (attempt 1/' + MAX_WAKEUP_RETRIES + ')',
  });

  // Set overall timeout to prevent infinite waiting
  const overallTimeoutPromise = new Promise<boolean>((resolve) => {
    wakeupTimeout = setTimeout(() => {
      console.log('❌ Overall wake-up timeout reached');
      isWakeupInProgress = false;
      updateStatus({
        isWakingUp: false,
        error: 'Wake-up timed out. AI service may be unavailable.',
      });
      resolve(false);
    }, WAKEUP_OVERALL_TIMEOUT_MS);
  });

  const wakeupPromise = (async (): Promise<boolean> => {
    for (let attempt = 1; attempt <= MAX_WAKEUP_RETRIES; attempt++) {
      // Check if we've been cancelled
      if (!isWakeupInProgress) {
        return false;
      }

      console.log(`🔄 Wake-up attempt ${attempt}/${MAX_WAKEUP_RETRIES}...`);
      onProgress?.(attempt, MAX_WAKEUP_RETRIES);
      
      updateStatus({
        retryCount: attempt,
        greeting: `Waking up AI service... (attempt ${attempt}/${MAX_WAKEUP_RETRIES})`,
      });

      try {
        // Use direct wake-up call to AI service health endpoint
        const isAwake = await directWakeUp();
        
        if (isAwake) {
          console.log('✅ AI service is now awake!');
          
          // Now get the full heartbeat with greeting
          try {
            const response = await fetchAiHeartbeat();
            
            updateStatus({
              isAvailable: true,
              isWakingUp: false,
              lastChecked: new Date(),
              retryCount: 0,
              greeting: response.greeting,
              error: undefined,
            });
          } catch (heartbeatError) {
            // Service is awake but heartbeat failed - still consider it success
            updateStatus({
              isAvailable: true,
              isWakingUp: false,
              lastChecked: new Date(),
              retryCount: 0,
              greeting: 'AI service is ready!',
              error: undefined,
            });
          }
          
          // Clear timeout
          if (wakeupTimeout) {
            clearTimeout(wakeupTimeout);
            wakeupTimeout = null;
          }
          
          isWakeupInProgress = false;
          return true;
        }
      } catch (error: any) {
        console.log(`⏳ AI service not ready yet (attempt ${attempt}): ${error?.message || 'Unknown error'}`);
      }

      // Wait before next attempt (except for last attempt)
      if (attempt < MAX_WAKEUP_RETRIES) {
        await delay(WAKEUP_RETRY_INTERVAL_MS);
      }
    }

    // Max retries reached
    console.log('❌ Max wake-up retries reached');
    updateStatus({
      isWakingUp: false,
      error: 'Could not wake up AI service after ' + MAX_WAKEUP_RETRIES + ' attempts.',
    });
    
    // Clear timeout
    if (wakeupTimeout) {
      clearTimeout(wakeupTimeout);
      wakeupTimeout = null;
    }
    
    isWakeupInProgress = false;
    return false;
  })();

  // Race between actual wakeup and timeout
  return Promise.race([wakeupPromise, overallTimeoutPromise]);
};

/**
 * Cancel any ongoing wake-up attempt
 */
export const cancelWakeup = (): void => {
  isWakeupInProgress = false;
  
  if (wakeupTimeout) {
    clearTimeout(wakeupTimeout);
    wakeupTimeout = null;
  }
  
  updateStatus({
    isWakingUp: false,
  });
  
  console.log('🛑 Wake-up cancelled');
};

/**
 * Start background polling to keep AI service warm
 */
export const startBackgroundPolling = (): void => {
  try {
    if (pollingInterval) {
      console.log('📡 Background polling already active');
      return;
    }

    console.log('📡 Starting background polling to keep AI service warm...');
    
    // Initial check (delayed to not block app startup)
    setTimeout(async () => {
      try {
        const result = await checkAIService();
        if (result.status !== 'ok') {
          // Service is sleeping, try to wake it up
          console.log('🌅 AI service sleeping, starting wake-up...');
          wakeUpAIService().catch(() => {
            console.log('❌ Background wake-up failed');
          });
        }
      } catch (error: any) {
        console.log('❌ Initial AI service check failed:', error?.message || 'Unknown error');
        // Try wake-up process
        wakeUpAIService().catch(() => {
          console.log('❌ Initial wake-up attempt failed');
        });
      }
    }, 2000); // Delay initial check by 2 seconds

    // Keep polling every 5 minutes
    pollingInterval = setInterval(async () => {
      // Skip polling check if wake-up is in progress
      if (isWakeupInProgress) {
        console.log('⏳ Skipping poll - wake-up in progress');
        return;
      }
      
      try {
        const result = await checkAIService();
        if (result.status === 'ok') {
          console.log('💓 AI service heartbeat OK');
        } else {
          console.log('💔 AI service not ready, attempting wake-up...');
          wakeUpAIService().catch(() => {});
        }
      } catch (error: any) {
        console.log('💔 AI service unreachable:', error?.message || 'Unknown error');
        // Try to wake up
        wakeUpAIService().catch(() => {
          console.log('❌ Wake-up failed during polling');
        });
      }
    }, POLL_INTERVAL_MS);
  } catch (error) {
    console.error('❌ Error starting background polling:', error);
  }
};

/**
 * Stop background polling
 */
export const stopBackgroundPolling = (): void => {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    console.log('📡 Background polling stopped');
  }
  
  cancelWakeup();
};

// ============================================================================
// Status Subscription
// ============================================================================

/**
 * Subscribe to status updates
 */
export const subscribeToStatus = (callback: StatusCallback): (() => void) => {
  statusCallbacks.push(callback);
  
  // Immediately notify with current status
  try {
    callback({ ...currentStatus });
  } catch (error) {
    console.error('Error in initial status callback:', error);
  }
  
  // Return unsubscribe function
  return () => {
    statusCallbacks = statusCallbacks.filter(cb => cb !== callback);
  };
};

/**
 * Get current status
 */
export const getAIServiceStatus = (): AIServiceStatus => {
  return { ...currentStatus };
};

// ============================================================================
// Export
// ============================================================================

export default {
  checkAIService,
  wakeUpAIService,
  cancelWakeup,
  startBackgroundPolling,
  stopBackgroundPolling,
  subscribeToStatus,
  getAIServiceStatus,
};
