/**
 * Environment Configuration
 * 
 * To switch between development and production:
 * 1. Edit: frontend/env.config.js
 * 2. Change FORCE_ENV to 'development' or 'production'
 * 3. Restart the dev server
 */

// Try to load env.config.js (only works in development)
let envConfig: any = null;
try {
  // This will only work in development with Metro bundler
  envConfig = require('../../env.config.js');
} catch (e) {
  // Config file not found or not in Node environment
  console.log('📝 Using default environment detection (env.config.js not loaded)');
}

// Environment configuration for different deployment stages
export const ENV = {
  // Development environment
  development: {
    backendUrl: envConfig?.BACKEND_URLS?.development || 'http://localhost:8080',
    apiTimeout: envConfig?.API_TIMEOUTS?.development || 15000,
  },
  
  // Production environment
  production: {
    backendUrl: envConfig?.BACKEND_URLS?.production || 'https://lifepattern-backend.onrender.com',
    apiTimeout: envConfig?.API_TIMEOUTS?.production || 60000, // 60 seconds for cold starts
  },
  
  // Staging environment (if needed)
  staging: {
    backendUrl: envConfig?.BACKEND_URLS?.staging || 'https://lifepattern-backend-staging.onrender.com',
    apiTimeout: envConfig?.API_TIMEOUTS?.staging || 20000,
  }
};

// Determine current environment
export const getCurrentEnvironment = () => {
  // 🔥 CHECK FOR FORCED ENVIRONMENT FIRST
  const forcedEnv = envConfig?.FORCE_ENV;
  if (forcedEnv && forcedEnv !== 'auto') {
    console.log(`🔧 FORCED ENVIRONMENT: ${forcedEnv.toUpperCase()} (from env.config.js)`);
    return forcedEnv;
  }
  
  // For web, check the hostname first (most reliable for production detection)
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const hostname = window.location.hostname;

    // Production if deployed to Firebase or any non-local domain
    if (hostname !== 'localhost' &&
        hostname !== '127.0.0.1' &&
        !hostname.includes('192.168.') &&
        !hostname.includes('10.0.2.2')) {
      console.log('🌍 Detected PRODUCTION environment from hostname:', hostname);
      return 'production';
    }

    // Development for local hosts
    console.log('🌍 Detected DEVELOPMENT environment from hostname:', hostname);
    return 'development';
  }
  
  // For mobile apps, use __DEV__ flag
  if (__DEV__) {
    console.log('🌍 Detected DEVELOPMENT environment from __DEV__ flag');
    return 'development';
  }
  
  // Default to production for mobile production builds
  console.log('🌍 Detected PRODUCTION environment (default for mobile build)');
  return 'production';
};

// Get current environment config
export const getEnvironmentConfig = () => {
  const env = getCurrentEnvironment();
  const config = ENV[env as keyof typeof ENV];
  
  // Debug logging for environment detection
  if (typeof window !== 'undefined' && window.location) {
    console.log(`🌍 Environment Detection:`, {
      hostname: window.location.hostname,
      detectedEnv: env,
      backendUrl: config.backendUrl,
      isDev: __DEV__
    });
  } else {
    console.log(`🌍 Environment Detection (Mobile):`, {
      detectedEnv: env,
      backendUrl: config.backendUrl,
      isDev: __DEV__
    });
  }
  
  return config;
};

// Export current config for easy access (lazy-loaded to avoid crashes)
let _currentConfig: ReturnType<typeof getEnvironmentConfig> | null = null;
export const getCurrentConfig = () => {
  if (!_currentConfig) {
    _currentConfig = getEnvironmentConfig();
  }
  return _currentConfig;
};

// Note: Use getCurrentConfig() instead of currentConfig to avoid module-load crashes
// This getter ensures the config is only evaluated when actually accessed
Object.defineProperty(exports, 'currentConfig', {
  get: getCurrentConfig,
  enumerable: true,
  configurable: true,
}); 