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
  passphrase: string;
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
    return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
};

// Simple hash function
const hashString = async (str: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substr(0, 16);
};

// Generate unique user ID
const generateUserId = (deviceId: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
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
  return Math.random().toString(36).substr(2, 16);
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
  async initializeUser(): Promise<UserSession> {
    try {
      // Check for existing session
      const existingSession = await secureStorage.getItemAsync('userSession');
      if (existingSession) {
        const session: UserSession = JSON.parse(existingSession);
        this.currentSession = session;
        
        // Update last login
        session.lastLogin = new Date().toISOString();
        await secureStorage.setItemAsync('userSession', JSON.stringify(session));
        
        return session;
      }

      // Create new user session
      const deviceId = await generateDeviceId();
      const userId = generateUserId(deviceId);
      const username = generateUsername();
      const passphrase = generatePassphrase();
      
      const newSession: UserSession = {
        userId,
        deviceId,
        username,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        isFirstLogin: true,
        isAuthenticated: false,
      };

      // Store session securely
      await secureStorage.setItemAsync('userSession', JSON.stringify(newSession));
      
      // Store credentials securely
      const salt = generateSalt();
      const hashedPassphrase = await hashPassphrase(passphrase, salt);
      await secureStorage.setItemAsync('userCredentials', JSON.stringify({
        username,
        hashedPassphrase,
        salt,
        passphrase, // Store original for retrieval
      }));
      
      this.currentSession = newSession;

      return newSession;
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

  // Get user credentials
  async getUserCredentials(): Promise<UserCredentials | null> {
    try {
      const credentialsData = await secureStorage.getItemAsync('userCredentials');
      if (credentialsData) {
        const credentials = JSON.parse(credentialsData);
        return {
          username: credentials.username,
          passphrase: credentials.passphrase, // This should be the original passphrase
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
      const credentialsData = await secureStorage.getItemAsync('userCredentials');
      if (!credentialsData) {
        return false;
      }

      const credentials = JSON.parse(credentialsData);
      const hashedInput = await hashPassphrase(passphrase, credentials.salt);
      
      if (credentials.username === username && credentials.hashedPassphrase === hashedInput) {
        // Update session to authenticated
        if (this.currentSession) {
          this.currentSession.isAuthenticated = true;
          this.currentSession.lastLogin = new Date().toISOString();
          await secureStorage.setItemAsync('userSession', JSON.stringify(this.currentSession));
        }
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error authenticating user:', error);
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
  async updatePassphrase(newPassphrase: string): Promise<void> {
    try {
      const salt = generateSalt();
      const hashedPassphrase = await hashPassphrase(newPassphrase, salt);
      
      const credentialsData = await secureStorage.getItemAsync('userCredentials');
      if (credentialsData) {
        const credentials = JSON.parse(credentialsData);
        credentials.hashedPassphrase = hashedPassphrase;
        credentials.salt = salt;
        credentials.passphrase = newPassphrase; // Store original
        await secureStorage.setItemAsync('userCredentials', JSON.stringify(credentials));
      }
    } catch (error) {
      console.error('Error updating passphrase:', error);
      throw error;
    }
  }

  // Clear user session (logout)
  async clearSession(): Promise<void> {
    this.currentSession = null;
    await secureStorage.deleteItemAsync('userSession');
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
    const user = await this.getCurrentUser();
    return user?.isAuthenticated || false;
  }

  // Get device ID
  async getDeviceId(): Promise<string> {
    return await generateDeviceId();
  }
}

export default UserManager.getInstance(); 