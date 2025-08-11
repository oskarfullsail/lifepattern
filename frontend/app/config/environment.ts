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
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return 'production';
  }
  
  return 'development';
};

// Get current environment config
export const getEnvironmentConfig = () => {
  const env = getCurrentEnvironment();
  return ENV[env as keyof typeof ENV];
};

// Export current config for easy access
export const currentConfig = getEnvironmentConfig(); 