import axios from 'axios';
import { Platform } from 'react-native';
import { currentConfig } from '../config/environment';
import userManager from '../utils/userManager';

// Determine the correct backend URL based on the environment and platform
const getBackendUrl = () => {
  // Use environment configuration
  const config = currentConfig;
  
  // For web, always use the environment config
  if (Platform.OS === 'web') {
    return config.backendUrl;
  }
  
  // For mobile development, use environment config but fallback to localhost for dev
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    // In development, use platform-specific URLs
    if (__DEV__) {
      if (Platform.OS === 'ios') {
        return 'http://localhost:8080';
      }
      if (Platform.OS === 'android') {
        return 'http://10.0.2.2:8080';
      }
    }
    
    // In production, use the environment config
    return config.backendUrl;
  }
  
  // Fallback
  return config.backendUrl;
};

const BASE_URL = getBackendUrl();

console.log(`🔗 API Client configured for ${Platform.OS} with URL: ${BASE_URL}`);

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: currentConfig.apiTimeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Enhanced error handling and logging
apiClient.interceptors.request.use(
  async (config) => {
    console.log(`📤 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    
    // Add access token to requests if available
    try {
      const accessToken = await userManager.getAccessToken();
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
    } catch (error) {
      console.log('No access token available for request');
    }
    
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    console.log(`📥 API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });
    
    // Provide more helpful error messages
    if (error.code === 'ECONNREFUSED') {
      console.error('🔌 Connection refused. Make sure the backend is running in Docker:');
      console.error('   docker-compose up -d');
    }
    
    if (error.code === 'ENOTFOUND') {
      console.error('🌐 Host not found. Check your backend URL configuration.');
    }
    
    return Promise.reject(error);
  }
);

// Test function to verify backend connectivity
export const testBackendConnection = async () => {
  try {
    console.log('🧪 Testing backend connection...');
    const response = await apiClient.get('/health');
    console.log('✅ Backend connection successful:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('❌ Backend connection failed:', error);
    return { success: false, error };
  }
};

export default apiClient; 