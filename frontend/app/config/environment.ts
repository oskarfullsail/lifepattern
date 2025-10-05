// Environment configuration for different deployment stages
export const ENV = {
  // Development environment
  development: {
    backendUrl: 'http://localhost:8080',
    apiTimeout: 15000,
  },
  
  // Production environment
  production: {
    backendUrl: 'https://lifepattern-backend.onrender.com', // We'll update this when we deploy the backend
    apiTimeout: 30000,
  },
  
  // Staging environment (if needed)
  staging: {
    backendUrl: 'https://lifepattern-backend-staging.onrender.com',
    apiTimeout: 20000,
  }
};

// Determine current environment
export const getCurrentEnvironment = () => {
  if (__DEV__) {
    return 'development';
  }
  
  // Check if we're in production (deployed to Firebase)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // Production if not localhost and not 127.0.0.1
    if (hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.includes('192.168.')) {
      return 'production';
    }
  }
  
  return 'development';
};

// Get current environment config
export const getEnvironmentConfig = () => {
  const env = getCurrentEnvironment();
  const config = ENV[env as keyof typeof ENV];
  
  // Debug logging for environment detection
  if (typeof window !== 'undefined') {
    console.log(`🌍 Environment Detection:`, {
      hostname: window.location.hostname,
      detectedEnv: env,
      backendUrl: config.backendUrl,
      isDev: __DEV__
    });
  }
  
  return config;
};

// Export current config for easy access
export const currentConfig = getEnvironmentConfig(); 