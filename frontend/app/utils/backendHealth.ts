/**
 * Backend Health Check Utility
 * 
 * Handles Render.com free tier sleeping issues by:
 * 1. Checking if backend is awake
 * 2. Waking up backend before critical requests
 * 3. Showing user-friendly loading states
 */

import apiClient from '../api/client';

interface HealthCheckResult {
  isAwake: boolean;
  responseTime: number;
  error?: string;
}

/**
 * Check if backend is awake and responsive
 * 
 * Note: Render free tier takes 30-60 seconds to cold start.
 * For quick checks, use shortTimeout=true (5s).
 * For production/cold start scenarios, use shortTimeout=false (65s).
 */
export const checkBackendHealth = async (shortTimeout: boolean = false): Promise<HealthCheckResult> => {
  const startTime = Date.now();
  
  // Use longer timeout for production cold starts (Render free tier takes 30-60s)
  const timeout = shortTimeout ? 5000 : 65000;
  
  try {
    console.log(`🏥 Checking backend health (timeout: ${timeout/1000}s)...`);
    
    // Try to ping the health endpoint
    const response = await apiClient.get('/health', {
      timeout,
    });
    
    const responseTime = Date.now() - startTime;
    
    console.log(`✅ Backend is awake (${responseTime}ms)`);
    
    return {
      isAwake: true,
      responseTime,
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    console.error('❌ Backend health check failed:', error.message);
    
    return {
      isAwake: false,
      responseTime,
      error: error.message,
    };
  }
};

/**
 * Wake up backend with retries (for Render free tier)
 * 
 * Strategy:
 * 1. First attempt with long timeout (65s) - handles cold start
 * 2. Subsequent attempts with short timeout (5s) - backend should be awake
 */
export const wakeUpBackend = async (
  maxRetries: number = 2,
  onProgress?: (attempt: number, maxRetries: number) => void
): Promise<boolean> => {
  console.log('⏰ Waking up backend (Render cold start may take 30-60s)...');
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    if (onProgress) {
      onProgress(attempt, maxRetries);
    }
    
    console.log(`🔄 Wake-up attempt ${attempt}/${maxRetries}...`);
    
    // First attempt uses long timeout for cold start, subsequent use short timeout
    const useShortTimeout = attempt > 1;
    const result = await checkBackendHealth(useShortTimeout);
    
    if (result.isAwake) {
      console.log(`✅ Backend awake after ${attempt} attempt(s) (${result.responseTime}ms)`);
      return true;
    }
    
    // Wait before retry (only if not last attempt)
    if (attempt < maxRetries) {
      const waitTime = 5000;
      console.log(`⏳ Waiting ${waitTime}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  console.error('❌ Failed to wake up backend after all retries');
  return false;
};

/**
 * Make a request with automatic backend wake-up
 */
export const makeRequestWithWakeUp = async <T>(
  requestFn: () => Promise<T>,
  onWakingUp?: () => void,
  onProgress?: (attempt: number, maxRetries: number) => void
): Promise<T> => {
  try {
    // Try the request first
    return await requestFn();
  } catch (error: any) {
    // If it fails, check if backend might be sleeping
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout') || error.message.includes('Network Error')) {
      console.log('🛌 Backend might be sleeping, attempting to wake it up...');
      
      if (onWakingUp) {
        onWakingUp();
      }
      
      // Try to wake up backend
      const isAwake = await wakeUpBackend(3, onProgress);
      
      if (!isAwake) {
        throw new Error('Backend is not responding. Please try again in a minute.');
      }
      
      // Retry the original request
      console.log('🔄 Retrying original request...');
      return await requestFn();
    }
    
    // If it's a different error, just rethrow it
    throw error;
  }
};

/**
 * Get backend status with user-friendly message
 */
export const getBackendStatus = async (): Promise<{
  status: 'online' | 'waking' | 'offline';
  message: string;
  responseTime?: number;
}> => {
  const result = await checkBackendHealth();
  
  if (result.isAwake) {
    if (result.responseTime < 1000) {
      return {
        status: 'online',
        message: '✅ Backend is online and fast',
        responseTime: result.responseTime,
      };
    } else {
      return {
        status: 'online',
        message: '⚠️ Backend is online but slow',
        responseTime: result.responseTime,
      };
    }
  } else {
    if (result.error?.includes('timeout')) {
      return {
        status: 'waking',
        message: '💤 Backend is waking up (this may take 30-60 seconds)',
      };
    } else {
      return {
        status: 'offline',
        message: '❌ Backend is offline or unreachable',
      };
    }
  }
};

/**
 * Pre-warm backend (call this when app starts)
 */
export const preWarmBackend = async (): Promise<void> => {
  console.log('🔥 Pre-warming backend...');
  
  try {
    await checkBackendHealth();
  } catch (error) {
    console.log('⚠️ Backend not immediately available (this is normal for Render free tier)');
  }
};

export default {
  checkBackendHealth,
  wakeUpBackend,
  makeRequestWithWakeUp,
  getBackendStatus,
  preWarmBackend,
};

