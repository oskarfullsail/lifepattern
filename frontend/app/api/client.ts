import axios from 'axios';
import { Platform } from 'react-native';
import { currentConfig } from '../config/environment';
import userManager from '../utils/userManager';
import { refreshToken } from './endpoint';

// Determine the correct backend URL based on the environment and platform
const getBackendUrl = () => {
  // Use environment configuration (which already handles dev vs prod)
  const config = currentConfig;
  
  // For development mode only, use platform-specific local URLs
  if (__DEV__) {
    if (Platform.OS === 'web') {
      console.log('🔧 DEV MODE (Web): Using', config.backendUrl);
      return config.backendUrl;
    }

    if (Platform.OS === 'ios') {
      console.log('🔧 DEV MODE (iOS): Using localhost:8080');
      return 'http://localhost:8080';
    }

    if (Platform.OS === 'android') {
      console.log('🔧 DEV MODE (Android): Using 10.0.2.2:8080');
      return 'http://10.0.2.2:8080';
    }
  }
  
  // For production builds, ALWAYS use the environment config
  // This ensures Firebase deployment uses Render backend
  console.log(`🚀 PRODUCTION MODE (${Platform.OS}): Using ${config.backendUrl}`);
  return config.backendUrl;
};

const BASE_URL = getBackendUrl();

console.log(`🔗 API Client configured for ${Platform.OS} with URL: ${BASE_URL}`);

// Flag to prevent multiple simultaneous token refresh attempts
let isRefreshingToken = false;

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
    console.log(`📍 Base URL: ${BASE_URL}`);
    console.log(`📦 Request Data:`, config.data);
    
    // Define public endpoints that don't need authentication
    const publicEndpoints = ['/health', '/auth/login', '/auth/register', '/auth/recovery'];
    const isPublicEndpoint = publicEndpoints.some(endpoint => config.url?.includes(endpoint));
    
    // Add access token to requests if available and not a public endpoint
    if (!isPublicEndpoint) {
      try {
        const accessToken = await userManager.getAccessToken();
        if (accessToken) {
          config.headers.Authorization = `Bearer ${accessToken}`;
          console.log(`🔐 Token added: ${accessToken.substring(0, 20)}...`);
        } else {
          console.warn('⚠️ No access token found for protected endpoint!');
        }
      } catch (error) {
        console.error('❌ Error getting access token:', error);
      }
    } else {
      console.log('🔓 Public endpoint - skipping authentication');
    }
    
    console.log(`🌐 Full URL: ${config.baseURL}${config.url}`);
    console.log(`⏱️ Timeout: ${config.timeout}ms`);
    
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
  async (error) => {
    console.error('❌ API Response Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });
    
    // Handle 401 Unauthorized errors (token expired)
    if (error.response?.status === 401 && error.config && !error.config._retry) {
      console.log('🔄 Token expired, attempting to refresh...');
      console.log(`📱 Platform: ${Platform.OS}`);

      // Prevent multiple simultaneous refresh attempts
      if (isRefreshingToken) {
        console.log('⏳ Token refresh already in progress, skipping');
        throw error;
      }
      
      try {
        // Mark this request as retried to prevent infinite loops
        error.config._retry = true;
        isRefreshingToken = true;
        
        // Get refresh token with iOS-specific handling
        const refreshTokenValue = await userManager.getRefreshToken();
        if (!refreshTokenValue) {
          console.log('❌ No refresh token available');
          if (Platform.OS === 'ios') {
            console.log('🍎 iOS: Refresh token not found in storage');
          }
          throw error;
        }
        
        console.log(`🔐 Refresh token found: ${refreshTokenValue.substring(0, 10)}...`);
        
        // Attempt to refresh the token
        const refreshResponse = await refreshToken({
          refresh_token: refreshTokenValue
        });
        
        console.log('✅ Token refresh API call successful');
        
        // Store new access token (refresh token remains the same)
        await userManager.storeTokens(refreshResponse.access_token, refreshTokenValue);
        
        // Update the original request with new token
        error.config.headers.Authorization = `Bearer ${refreshResponse.access_token}`;
        
        console.log('✅ Token refreshed successfully, retrying original request');
        
        // Retry the original request with new token
        return apiClient(error.config);
        
      } catch (refreshError: any) {
        console.error('❌ Token refresh failed:', refreshError);
        
        if (Platform.OS === 'ios') {
          console.log('🍎 iOS: Token refresh failed, possible causes:');
          console.log('   - Network connectivity issues');
          console.log('   - App background state');
          console.log('   - Keychain access problems');
          console.log('   - Refresh token expired');
        }
        
        // If refresh fails, redirect to login
        console.log('🔐 Redirecting to login due to authentication failure');
        
        // Clear stored tokens on refresh failure
        try {
          await userManager.clearSession();
        } catch (clearError) {
          console.error('❌ Failed to clear session:', clearError);
        }
        
        throw error;
      } finally {
        isRefreshingToken = false;
      }
    }
    
    // Provide more helpful error messages
    if (error.code === 'ECONNREFUSED') {
      console.error('🔌 Connection refused. Make sure the backend is running in Docker:');
      console.error('   docker-compose up -d');
    }
    
    if (error.code === 'ENOTFOUND') {
      console.error('🌐 Host not found. Check your backend URL configuration.');
    }
    
    if (error.message === 'Network Error') {
      console.error('🌐 Network Error - Possible causes:');
      console.error('   1. Backend not running: docker-compose up -d');
      console.error('   2. Wrong URL for platform:', Platform.OS);
      console.error('   3. CORS issues (for web development)');
      console.error('   4. Firewall blocking connection');
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