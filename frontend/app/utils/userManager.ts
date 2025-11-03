import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Conditional import for expo-device (may not work on web)
let Device: any = null;
try {
  Device = require('expo-device');
} catch (error) {
  console.log('expo-device not available, using fallback device info');
}

// Storage helper for cross-platform compatibility
const secureStorage = {
  async getItemAsync(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return await AsyncStorage.getItem(key);
      } else {
        return await SecureStore.getItemAsync(key);
      }
    } catch (error) {
      console.log('SecureStore failed, falling back to AsyncStorage:', error);
      return await AsyncStorage.getItem(key);
    }
  },

  async setItemAsync(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.setItem(key, value);
      } else {
        await SecureStore.setItemAsync(key, value);
      }
    } catch (error) {
      console.log('SecureStore failed, falling back to AsyncStorage:', error);
      await AsyncStorage.setItem(key, value);
    }
  },

  async deleteItemAsync(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.removeItem(key);
      } else {
        await SecureStore.deleteItemAsync(key);
      }
    } catch (error) {
      console.log('SecureStore failed, falling back to AsyncStorage:', error);
      await AsyncStorage.removeItem(key);
    }
  }
};

// User session management with secure authentication
export interface UserSession {
  userId: string;
  deviceId: string;
  username: string;
  createdAt: string;
  lastLogin: string;
  isFirstLogin: boolean;
  isAuthenticated: boolean;
}

export interface UserCredentials {
  username: string;
  // Security: Passphrase is never stored, only username is persisted
}

// Generate human-friendly username
const generateUsername = (): string => {
  const adjectives = ['Swift', 'Bright', 'Calm', 'Eager', 'Gentle', 'Happy', 'Kind', 'Lively', 'Peaceful', 'Quick', 'Wise', 'Bold', 'Clear', 'Deep', 'Fair', 'Good', 'High', 'Just', 'Light', 'Mild', 'Nice', 'Open', 'Pure', 'Rich', 'Safe', 'True', 'Warm', 'Young', 'Zesty', 'Active', 'Brave'];
  const nouns = ['Runner', 'Walker', 'Dreamer', 'Thinker', 'Creator', 'Explorer', 'Learner', 'Builder', 'Helper', 'Friend', 'Artist', 'Writer', 'Singer', 'Dancer', 'Player', 'Worker', 'Teacher', 'Student', 'Leader', 'Follower', 'Hunter', 'Gatherer', 'Farmer', 'Fisher', 'Craft', 'Smith', 'Wright', 'Maker', 'Doer', 'Seeker', 'Finder'];
  
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 999) + 1;
  
  return `${adjective}-${noun}-${number}`;
};

// Generate secure passphrase
const generatePassphrase = (): string => {
  const words = ['stream', 'hill', 'river', 'mountain', 'forest', 'ocean', 'valley', 'meadow', 'cliff', 'beach', 'canyon', 'island', 'lake', 'spring', 'autumn', 'winter', 'summer', 'dawn', 'dusk', 'night', 'day', 'star', 'moon', 'sun', 'cloud', 'rain', 'snow', 'wind', 'storm', 'calm'];
  
  const word1 = words[Math.floor(Math.random() * words.length)];
  const word2 = words[Math.floor(Math.random() * words.length)];
  const number = Math.floor(Math.random() * 99) + 1;
  
  return `${word1}-${word2}-${number}`;
};

// Generate device identifier
const generateDeviceId = async (): Promise<string> => {
  try {
    // Try to get existing device ID
    const existingId = await secureStorage.getItemAsync('deviceId');
    if (existingId) {
      return existingId;
    }

    // Generate new device ID based on available device info
    let deviceInfo: any = {
      platform: Platform.OS,
      version: Platform.Version,
    };

    // Add device-specific info if available
    if (Device) {
      try {
        deviceInfo = {
          ...deviceInfo,
          brand: Device.brand || 'unknown',
          manufacturer: Device.manufacturer || 'unknown',
          modelName: Device.modelName || 'unknown',
          osName: Device.osName || 'unknown',
          osVersion: Device.osVersion || 'unknown',
          platformApiLevel: Device.platformApiLevel || 'unknown',
          deviceName: Device.deviceName || 'unknown',
        };
      } catch (error) {
        console.log('Error getting device info:', error);
      }
    }

    // Add web-specific info
    if (Platform.OS === 'web') {
      deviceInfo = {
        ...deviceInfo,
        userAgent: navigator.userAgent,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    }

    // Create hash from device info
    const deviceString = JSON.stringify(deviceInfo);
    const deviceHash = await hashString(deviceString);
    
    // Store device ID securely
    await secureStorage.setItemAsync('deviceId', deviceHash);
    return deviceHash;
  } catch (error) {
    console.error('Error generating device ID:', error);
    // Fallback to timestamp-based ID
    return `device_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
};

// Simple hash function
const hashString = async (str: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
};

// Generate unique user ID
const generateUserId = (deviceId: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  return `user_${deviceId}_${timestamp}_${random}`;
};

// Hash passphrase for secure storage
const hashPassphrase = async (passphrase: string, salt: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(passphrase + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Generate salt
const generateSalt = (): string => {
  return Math.random().toString(36).substring(2, 18);
};

// User session management
export class UserManager {
  private static instance: UserManager;
  private currentSession: UserSession | null = null;

  static getInstance(): UserManager {
    if (!UserManager.instance) {
      UserManager.instance = new UserManager();
    }
    return UserManager.instance;
  }

  // Initialize or load user session
  // Returns session for existing users, or session + credentials for new users
  async initializeUser(): Promise<{ session: UserSession; credentials?: { username: string; passphrase: string } }> {
    try {
      // Check for existing session
      const existingSession = await secureStorage.getItemAsync('userSession');
      if (existingSession) {
        const session: UserSession = JSON.parse(existingSession);
        this.currentSession = session;

        // Update last login
        session.lastLogin = new Date().toISOString();
        await secureStorage.setItemAsync('userSession', JSON.stringify(session));

        // Existing user - no credentials to return
        return { session };
      }

      // Create new user session
      const deviceId = await generateDeviceId();
      const username = generateUsername();
      const passphrase = generatePassphrase();

      // Import the register API function
      const { register } = await import('../api/endpoint');

      // Register with backend
      const response = await register({
        username,
        passphrase,
        device_label: `${Platform.OS} Device`
      });

      const newSession: UserSession = {
        userId: response.user_id,
        deviceId,
        username,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        isFirstLogin: true,
        isAuthenticated: true,
      };

      // Store session securely
      await secureStorage.setItemAsync('userSession', JSON.stringify(newSession));

      // Store credentials securely (username only - never store passphrase)
      await secureStorage.setItemAsync('userCredentials', JSON.stringify({
        username,
        // Security: Passphrase is never stored locally
        // Backend validates credentials and issues tokens
      }));

      // Store tokens
      await secureStorage.setItemAsync('accessToken', response.access_token);
      await secureStorage.setItemAsync('refreshToken', response.refresh_token);

      this.currentSession = newSession;

      // Return session AND credentials for one-time display
      // Credentials are returned ONLY for new users to show them once
      // They are NEVER stored locally
      return {
        session: newSession,
        credentials: { username, passphrase }
      };
    } catch (error) {
      console.error('Error initializing user:', error);
      throw error;
    }
  }

  // Get current user session
  async getCurrentUser(): Promise<UserSession | null> {
    if (this.currentSession) {
      return this.currentSession;
    }

    try {
      const sessionData = await secureStorage.getItemAsync('userSession');
      if (sessionData) {
        this.currentSession = JSON.parse(sessionData);
        return this.currentSession;
      }
      return null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  // Get user credentials (username only - passphrase is never stored)
  async getUserCredentials(): Promise<UserCredentials | null> {
    try {
      const credentialsData = await secureStorage.getItemAsync('userCredentials');
      if (credentialsData) {
        const credentials = JSON.parse(credentialsData);
        return {
          username: credentials.username,
          // Security: Passphrase is never stored or returned
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting user credentials:', error);
      return null;
    }
  }

  // Authenticate user with credentials
  async authenticateUser(username: string, passphrase: string): Promise<boolean> {
    try {
      console.log('🔐 Authenticating user:', username);
      
      // Import the login API function
      const { login } = await import('../api/endpoint');
      
      // Call the backend login API
      const response = await login({
        username,
        passphrase,
        device_label: `${Platform.OS} Device`
      });
      
      console.log('✅ Login response received:', response);
      
      // Store the tokens
      await secureStorage.setItemAsync('accessToken', response.access_token);
      await secureStorage.setItemAsync('refreshToken', response.refresh_token);
      
      // Get or create session
      let session = await this.getCurrentUser();
      if (!session) {
        // Create new session if none exists
        const deviceId = await generateDeviceId();
        session = {
          userId: response.user_id,
          deviceId,
          username,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          isFirstLogin: false,
          isAuthenticated: true,
        };
      } else {
        // Update existing session
        session.isAuthenticated = true;
        session.lastLogin = new Date().toISOString();
        session.userId = response.user_id;
        session.username = username;
      }
      
      // Store updated session
      await secureStorage.setItemAsync('userSession', JSON.stringify(session));
      this.currentSession = session;
      
      console.log('✅ Authentication successful, session updated');
      return true;
    } catch (error) {
      console.error('❌ Error authenticating user:', error);
      return false;
    }
  }

  // Update username
  async updateUsername(newUsername: string): Promise<void> {
    if (!this.currentSession) {
      throw new Error('No active user session');
    }

    this.currentSession.username = newUsername;
    this.currentSession.isFirstLogin = false;
    
    await secureStorage.setItemAsync('userSession', JSON.stringify(this.currentSession));
    
    // Update credentials
    const credentialsData = await secureStorage.getItemAsync('userCredentials');
    if (credentialsData) {
      const credentials = JSON.parse(credentialsData);
      credentials.username = newUsername;
      await secureStorage.setItemAsync('userCredentials', JSON.stringify(credentials));
    }
  }

  // Update passphrase
  // Note: This only updates the passphrase on the backend
  // Passphrase is NEVER stored locally for security reasons
  async updatePassphrase(newPassphrase: string): Promise<void> {
    try {
      // TODO: Implement backend API call to update passphrase
      // The backend should handle passphrase hashing and storage
      console.log('⚠️ updatePassphrase: Backend API call not yet implemented');
      console.log('📝 Passphrase is never stored locally - only sent to backend for validation');

      // No local storage of passphrase for security
      // When implemented, this should call:
      // await apiClient.post('/api/auth/update-passphrase', { newPassphrase });

      throw new Error('Passphrase update not implemented - requires backend API');
    } catch (error) {
      console.error('Error updating passphrase:', error);
      throw error;
    }
  }

  // Clear user session (logout)
  async clearSession(): Promise<void> {
    try {
      console.log('🚪 Logging out user...');
      
      // Call backend logout endpoint to revoke session
      try {
        const { default: apiClient } = await import('../api/client');
        await apiClient.post('/api/auth/logout');
        console.log('✅ Backend session revoked');
      } catch (error) {
        console.warn('⚠️ Failed to revoke backend session:', error);
        // Continue with local cleanup even if backend fails
      }
      
      // Clear local session data
      this.currentSession = null;
      await secureStorage.deleteItemAsync('userSession');
      await secureStorage.deleteItemAsync('accessToken');
      await secureStorage.deleteItemAsync('refreshToken');
      await secureStorage.deleteItemAsync('userCredentials');
      
      console.log('✅ Logout successful - all data cleared');
    } catch (error) {
      console.error('❌ Error during logout:', error);
    }
  }

  // Get user ID for API calls
  async getUserId(): Promise<string> {
    const user = await this.getCurrentUser();
    if (!user) {
      throw new Error('No active user session');
    }
    return user.userId;
  }

  // Check if user is first time login
  async isFirstLogin(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user?.isFirstLogin || false;
  }

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    try {
      // Check if we have a current session
      const user = await this.getCurrentUser();
      if (!user) {
        console.log('❌ No user session found');
        return false;
      }
      
      // Check if we have access token
      const accessToken = await secureStorage.getItemAsync('accessToken');
      if (!accessToken) {
        console.log('❌ No access token found');
        return false;
      }
      
      // Check if session is marked as authenticated
      if (!user.isAuthenticated) {
        console.log('❌ Session not marked as authenticated');
        return false;
      }
      
      // Validate token is not expired (basic check)
      if (this.isTokenExpired(accessToken)) {
        console.log('⚠️ Access token expired, attempting refresh...');
        const refreshed = await this.refreshTokenIfNeeded();
        return refreshed;
      }
      
      console.log('✅ User is authenticated');
      return true;
    } catch (error) {
      console.error('❌ Error checking authentication:', error);
      return false;
    }
  }

  // Check if JWT token is expired
  private isTokenExpired(token: string): boolean {
    try {
      // Parse JWT payload (simple base64 decode)
      const parts = token.split('.');
      if (parts.length !== 3) return true;
      
      const payload = JSON.parse(atob(parts[1]));
      const exp = payload.exp;
      
      if (!exp) return false; // No expiration set
      
      // Check if expired (with 5 minute buffer)
      const now = Math.floor(Date.now() / 1000);
      return now >= (exp - 300); // Refresh 5 minutes before expiry
    } catch (error) {
      console.error('Error parsing token:', error);
      return true; // Treat parse errors as expired
    }
  }

  // Refresh token if needed
  async refreshTokenIfNeeded(): Promise<boolean> {
    try {
      const refreshToken = await this.getRefreshToken();
      if (!refreshToken) {
        console.log('❌ No refresh token available');
        return false;
      }
      
      console.log('🔄 Refreshing access token...');
      
      const { refreshToken: refreshTokenFunction } = await import('../api/endpoint');
      const response = await refreshTokenFunction({
        refresh_token: refreshToken
      });
      
      // Store new access token (keep same refresh token)
      await this.storeTokens(response.access_token, refreshToken);
      
      console.log('✅ Access token refreshed successfully');
      return true;
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      return false;
    }
  }

  // Get device ID
  async getDeviceId(): Promise<string> {
    return await generateDeviceId();
  }

  // Store tokens from backend
  async storeTokens(accessToken: string, refreshToken: string): Promise<void> {
    await secureStorage.setItemAsync('accessToken', accessToken);
    await secureStorage.setItemAsync('refreshToken', refreshToken);
  }

  // Logout user
  async logout(): Promise<void> {
    await this.clearSession();
  }

  // Get access token for API calls
  async getAccessToken(): Promise<string | null> {
    try {
      return await secureStorage.getItemAsync('accessToken');
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  // Get refresh token for API calls
  async getRefreshToken(): Promise<string | null> {
    try {
      return await secureStorage.getItemAsync('refreshToken');
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  }

  // iOS-specific token validation
  async validateTokens(): Promise<{ accessToken: boolean; refreshToken: boolean }> {
    try {
      const accessToken = await this.getAccessToken();
      const refreshToken = await this.getRefreshToken();
      
      const result = {
        accessToken: !!accessToken,
        refreshToken: !!refreshToken
      };
      
      if (Platform.OS === 'ios') {
        console.log('🍎 iOS Token Validation:');
        console.log(`   Access Token: ${result.accessToken ? '✅ Found' : '❌ Missing'}`);
        console.log(`   Refresh Token: ${result.refreshToken ? '✅ Found' : '❌ Missing'}`);
        
        if (accessToken) {
          console.log(`   Access Token Preview: ${accessToken.substring(0, 20)}...`);
        }
        if (refreshToken) {
          console.log(`   Refresh Token Preview: ${refreshToken.substring(0, 20)}...`);
        }
      }
      
      return result;
    } catch (error) {
      console.error('❌ Token validation failed:', error);
      return { accessToken: false, refreshToken: false };
    }
  }

  // Force token refresh (for debugging)
  async forceTokenRefresh(): Promise<boolean> {
    try {
      console.log('🔄 Force refreshing tokens...');
      
      const refreshToken = await this.getRefreshToken();
      if (!refreshToken) {
        console.log('❌ No refresh token available for force refresh');
        return false;
      }
      
      // Import refresh token function
      const { refreshToken: refreshTokenFunction } = await import('../api/endpoint');
      
      const response = await refreshTokenFunction({
        refresh_token: refreshToken
      });
      
      // Store new tokens
      await this.storeTokens(response.access_token, refreshToken);
      
      console.log('✅ Force token refresh successful');
      return true;
    } catch (error) {
      console.error('❌ Force token refresh failed:', error);
      return false;
    }
  }

  // Initialize and validate session on app load
  async initializeSession(): Promise<{
    isValid: boolean;
    needsLogin: boolean;
    wasRefreshed: boolean;
  }> {
    try {
      console.log('🔄 Initializing session...');
      
      // Check if user has any session
      const user = await this.getCurrentUser();
      if (!user) {
        console.log('❌ No session found - needs login');
        return { isValid: false, needsLogin: true, wasRefreshed: false };
      }
      
      // Check tokens
      const accessToken = await this.getAccessToken();
      const refreshToken = await this.getRefreshToken();
      
      if (!refreshToken) {
        console.log('❌ No refresh token - needs login');
        await this.clearSession();
        return { isValid: false, needsLogin: true, wasRefreshed: false };
      }
      
      // If no access token or expired, try to refresh
      if (!accessToken || this.isTokenExpired(accessToken)) {
        console.log('⚠️ Access token missing or expired - attempting refresh...');
        const refreshed = await this.refreshTokenIfNeeded();
        
        if (!refreshed) {
          console.log('❌ Token refresh failed - needs login');
          await this.clearSession();
          return { isValid: false, needsLogin: true, wasRefreshed: false };
        }
        
        console.log('✅ Session refreshed successfully');
        return { isValid: true, needsLogin: false, wasRefreshed: true };
      }
      
      console.log('✅ Session is valid');
      return { isValid: true, needsLogin: false, wasRefreshed: false };
      
    } catch (error) {
      console.error('❌ Session initialization failed:', error);
      await this.clearSession();
      return { isValid: false, needsLogin: true, wasRefreshed: false };
    }
  }

  // Logout with backend notification
  async logoutCompletely(): Promise<void> {
    try {
      console.log('🚪 Performing complete logout...');
      
      // Call backend to revoke session
      try {
        const { logout } = await import('../api/endpoint');
        await logout();
        console.log('✅ Backend session revoked');
      } catch (error) {
        console.warn('⚠️ Failed to notify backend of logout:', error);
        // Continue with local cleanup
      }
      
      // Clear all local data
      await this.clearSession();
      
      console.log('✅ Logout complete');
    } catch (error) {
      console.error('❌ Logout error:', error);
      throw error;
    }
  }
}

export default UserManager.getInstance(); 