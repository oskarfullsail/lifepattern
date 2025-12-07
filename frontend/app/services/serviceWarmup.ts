/**
 * Service Warm-up Utility
 * 
 * Wakes up both backend and AI services after login.
 * Render free tier services sleep after 15 minutes of inactivity
 * and take 30-60 seconds to wake up on first request.
 * 
 * Strategy:
 * 1. Ping both services in parallel immediately after login
 * 2. Show progress to user while warming up
 * 3. Retry if initial pings fail
 * 4. Cache warm status to avoid unnecessary pings
 */

import axios from 'axios';

// ============================================================================
// Configuration
// ============================================================================

const BACKEND_HEALTH_URL = 'https://lifepattern-backend.onrender.com/health';
const AI_SERVICE_HEALTH_URL = 'https://lifepattern-ai-service.onrender.com/health';

const WARMUP_TIMEOUT = 60000; // 60 seconds for cold starts
const QUICK_CHECK_TIMEOUT = 5000; // 5 seconds for quick checks
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds between retries

// Cache warm status for 5 minutes
const WARM_CACHE_DURATION = 5 * 60 * 1000;

// ============================================================================
// Types
// ============================================================================

export interface ServiceStatus {
  backend: 'cold' | 'warming' | 'warm' | 'error';
  aiService: 'cold' | 'warming' | 'warm' | 'error';
  lastChecked: Date | null;
  backendMessage?: string;
  aiServiceMessage?: string;
}

export interface WarmupProgress {
  phase: 'starting' | 'warming_backend' | 'warming_ai' | 'complete' | 'error';
  message: string;
  progress: number; // 0-100
  backendStatus: ServiceStatus['backend'];
  aiServiceStatus: ServiceStatus['aiService'];
}

type WarmupCallback = (progress: WarmupProgress) => void;

// ============================================================================
// State
// ============================================================================

let currentStatus: ServiceStatus = {
  backend: 'cold',
  aiService: 'cold',
  lastChecked: null,
};

let isWarmingUp = false;
let lastWarmupTime: Date | null = null;

// ============================================================================
// Health Check Functions
// ============================================================================

/**
 * Check if backend is healthy
 */
const checkBackendHealth = async (timeout: number = WARMUP_TIMEOUT): Promise<boolean> => {
  try {
    console.log('🔄 Checking backend health...');
    const response = await axios.get(BACKEND_HEALTH_URL, { timeout });
    
    if (response.data?.status === 'healthy') {
      console.log('✅ Backend is healthy:', response.data);
      return true;
    }
    
    console.log('⚠️ Backend responded but not healthy:', response.data);
    return false;
  } catch (error: any) {
    console.log('❌ Backend health check failed:', error.message);
    return false;
  }
};

/**
 * Check if AI service is healthy
 */
const checkAiServiceHealth = async (timeout: number = WARMUP_TIMEOUT): Promise<boolean> => {
  try {
    console.log('🔄 Checking AI service health...');
    const response = await axios.get(AI_SERVICE_HEALTH_URL, { timeout });
    
    if (response.data?.status === 'healthy' && response.data?.model_loaded) {
      console.log('✅ AI service is healthy:', response.data);
      return true;
    }
    
    console.log('⚠️ AI service responded but not fully ready:', response.data);
    return false;
  } catch (error: any) {
    console.log('❌ AI service health check failed:', error.message);
    return false;
  }
};

// ============================================================================
// Warm-up Functions
// ============================================================================

/**
 * Quick check if services are already warm (for cached status)
 */
export const areServicesWarm = async (): Promise<boolean> => {
  // Check if we recently warmed up
  if (lastWarmupTime && Date.now() - lastWarmupTime.getTime() < WARM_CACHE_DURATION) {
    console.log('📋 Services were recently warmed up, skipping check');
    return true;
  }
  
  // Quick parallel check with short timeout
  try {
    const [backendOk, aiOk] = await Promise.all([
      checkBackendHealth(QUICK_CHECK_TIMEOUT),
      checkAiServiceHealth(QUICK_CHECK_TIMEOUT),
    ]);
    
    if (backendOk && aiOk) {
      lastWarmupTime = new Date();
      return true;
    }
  } catch {
    // Services are cold
  }
  
  return false;
};

/**
 * Wake up a single service with retries
 */
const wakeUpService = async (
  name: string,
  healthCheck: (timeout: number) => Promise<boolean>,
  onProgress?: (attempt: number) => void
): Promise<boolean> => {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`🔄 ${name} wake-up attempt ${attempt}/${MAX_RETRIES}...`);
    onProgress?.(attempt);
    
    const isHealthy = await healthCheck(WARMUP_TIMEOUT);
    
    if (isHealthy) {
      return true;
    }
    
    if (attempt < MAX_RETRIES) {
      console.log(`⏳ ${name} not ready, waiting ${RETRY_DELAY}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
  
  return false;
};

/**
 * Main warm-up function - call this after successful login
 * Warms up both services in parallel with progress updates
 */
export const warmUpServices = async (
  onProgress?: WarmupCallback
): Promise<ServiceStatus> => {
  // Don't start if already warming up
  if (isWarmingUp) {
    console.log('🔄 Warm-up already in progress...');
    return currentStatus;
  }
  
  // Check if services are already warm
  const alreadyWarm = await areServicesWarm();
  if (alreadyWarm) {
    currentStatus = {
      backend: 'warm',
      aiService: 'warm',
      lastChecked: new Date(),
    };
    
    onProgress?.({
      phase: 'complete',
      message: 'Services are ready!',
      progress: 100,
      backendStatus: 'warm',
      aiServiceStatus: 'warm',
    });
    
    return currentStatus;
  }
  
  isWarmingUp = true;
  
  console.log('🌅 Starting service warm-up...');
  
  // Update status to warming
  currentStatus = {
    backend: 'warming',
    aiService: 'warming',
    lastChecked: new Date(),
  };
  
  onProgress?.({
    phase: 'starting',
    message: 'Waking up services... (this may take 30-60 seconds)',
    progress: 10,
    backendStatus: 'warming',
    aiServiceStatus: 'warming',
  });
  
  // Warm up both services in parallel
  const [backendResult, aiResult] = await Promise.all([
    // Backend warm-up
    (async () => {
      onProgress?.({
        phase: 'warming_backend',
        message: 'Connecting to backend...',
        progress: 30,
        backendStatus: 'warming',
        aiServiceStatus: 'warming',
      });
      
      const success = await wakeUpService('Backend', checkBackendHealth);
      
      currentStatus.backend = success ? 'warm' : 'error';
      currentStatus.backendMessage = success ? 'Connected' : 'Failed to connect';
      
      return success;
    })(),
    
    // AI Service warm-up
    (async () => {
      onProgress?.({
        phase: 'warming_ai',
        message: 'Connecting to AI service...',
        progress: 50,
        backendStatus: currentStatus.backend,
        aiServiceStatus: 'warming',
      });
      
      const success = await wakeUpService('AI Service', checkAiServiceHealth);
      
      currentStatus.aiService = success ? 'warm' : 'error';
      currentStatus.aiServiceMessage = success ? 'AI ready' : 'AI unavailable';
      
      return success;
    })(),
  ]);
  
  isWarmingUp = false;
  currentStatus.lastChecked = new Date();
  
  // Update cache if successful
  if (backendResult && aiResult) {
    lastWarmupTime = new Date();
  }
  
  // Final progress update
  const allGood = backendResult && aiResult;
  
  onProgress?.({
    phase: allGood ? 'complete' : 'error',
    message: allGood 
      ? '✅ All services ready!' 
      : `⚠️ Some services unavailable (Backend: ${backendResult ? 'OK' : 'Failed'}, AI: ${aiResult ? 'OK' : 'Failed'})`,
    progress: 100,
    backendStatus: currentStatus.backend,
    aiServiceStatus: currentStatus.aiService,
  });
  
  console.log('🏁 Service warm-up complete:', currentStatus);
  
  return currentStatus;
};

/**
 * Start background warm-up (fire and forget)
 * Use this when you don't need to wait for completion
 */
export const startBackgroundWarmup = (onProgress?: WarmupCallback): void => {
  warmUpServices(onProgress).catch(error => {
    console.error('❌ Background warm-up failed:', error);
  });
};

/**
 * Get current service status
 */
export const getServiceStatus = (): ServiceStatus => {
  return { ...currentStatus };
};

/**
 * Force refresh service status (ignores cache)
 */
export const refreshServiceStatus = async (): Promise<ServiceStatus> => {
  lastWarmupTime = null; // Clear cache
  return warmUpServices();
};

// ============================================================================
// Export
// ============================================================================

export default {
  warmUpServices,
  startBackgroundWarmup,
  areServicesWarm,
  getServiceStatus,
  refreshServiceStatus,
};

