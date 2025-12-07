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

let pollingInterval: NodeJS.Timeout | null = null;
let wakeupInterval: NodeJS.Timeout | null = null;
let statusCallbacks: StatusCallback[] = [];

// Configuration
const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes - keep service warm
const WAKEUP_RETRY_INTERVAL_MS = 5 * 1000; // 5 seconds - retry when waking up
const MAX_WAKEUP_RETRIES = 20; // Max ~100 seconds of retrying

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
      currentStatus = {
        isAvailable: false,
        isWakingUp: true,
        lastChecked: new Date(),
        retryCount: 0,
        greeting: 'AI service is waking up...',
      };
      notifyListeners();
      
      return {
        status: 'waking_up',
        timestamp: new Date().toISOString(),
        greeting: 'AI service is waking up... This may take 30-60 seconds.',
      };
    }
    
    // Service is awake, get full heartbeat
    const response = await fetchAiHeartbeat();
    
    currentStatus = {
      isAvailable: response.status === 'ok',
      isWakingUp: response.status === 'waking_up',
      lastChecked: new Date(),
      retryCount: 0,
      greeting: response.greeting,
    };
    
    notifyListeners();
    return response;
  } catch (error) {
    currentStatus = {
      ...currentStatus,
      isAvailable: false,
      lastChecked: new Date(),
    };
    notifyListeners();
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
  if (currentStatus.isWakingUp) {
    console.log('🔄 AI service wake-up already in progress...');
    return false;
  }

  console.log('🌅 Starting AI service wake-up via direct health endpoint...');
  
  currentStatus = {
    ...currentStatus,
    isWakingUp: true,
    retryCount: 0,
  };
  notifyListeners();

  return new Promise((resolve) => {
    const attemptWakeup = async () => {
      currentStatus.retryCount++;
      
      console.log(`🔄 Wake-up attempt ${currentStatus.retryCount}/${MAX_WAKEUP_RETRIES}...`);
      onProgress?.(currentStatus.retryCount, MAX_WAKEUP_RETRIES);
      notifyListeners();

      try {
        // Use direct wake-up call to AI service health endpoint
        const isAwake = await directWakeUp();
        
        if (isAwake) {
          console.log('✅ AI service is now awake!');
          
          // Now get the full heartbeat with greeting
          const response = await fetchAiHeartbeat();
          
          currentStatus = {
            isAvailable: true,
            isWakingUp: false,
            lastChecked: new Date(),
            retryCount: 0,
            greeting: response.greeting,
          };
          notifyListeners();
          
          if (wakeupInterval) {
            clearInterval(wakeupInterval);
            wakeupInterval = null;
          }
          
          resolve(true);
          return;
        }
      } catch (error) {
        console.log(`⏳ AI service not ready yet (attempt ${currentStatus.retryCount})`);
      }

      // Check if max retries reached
      if (currentStatus.retryCount >= MAX_WAKEUP_RETRIES) {
        console.log('❌ Max wake-up retries reached');
        currentStatus = {
          ...currentStatus,
          isWakingUp: false,
        };
        notifyListeners();
        
        if (wakeupInterval) {
          clearInterval(wakeupInterval);
          wakeupInterval = null;
        }
        
        resolve(false);
      }
    };

    // Start immediately
    attemptWakeup();
    
    // Then retry at intervals
    wakeupInterval = setInterval(attemptWakeup, WAKEUP_RETRY_INTERVAL_MS);
  });
};

/**
 * Start background polling to keep AI service warm
 */
export const startBackgroundPolling = (): void => {
  if (pollingInterval) {
    console.log('📡 Background polling already active');
    return;
  }

  console.log('📡 Starting background polling to keep AI service warm...');
  
  // Initial check
  checkAIService().catch(() => {
    // If initial check fails, start wake-up process
    wakeUpAIService();
  });

  // Keep polling
  pollingInterval = setInterval(async () => {
    try {
      await checkAIService();
      console.log('💓 AI service heartbeat OK');
    } catch (error) {
      console.log('💔 AI service unreachable, attempting wake-up...');
      wakeUpAIService();
    }
  }, POLL_INTERVAL_MS);
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
  
  if (wakeupInterval) {
    clearInterval(wakeupInterval);
    wakeupInterval = null;
  }
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
  callback(currentStatus);
  
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

/**
 * Notify all listeners of status change
 */
const notifyListeners = (): void => {
  statusCallbacks.forEach(callback => callback({ ...currentStatus }));
};

// ============================================================================
// Export
// ============================================================================

export default {
  checkAIService,
  wakeUpAIService,
  startBackgroundPolling,
  stopBackgroundPolling,
  subscribeToStatus,
  getAIServiceStatus,
};

