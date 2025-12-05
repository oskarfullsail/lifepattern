/**
 * Biometric Authentication Utility
 * 
 * Provides secure biometric authentication (Face ID, Touch ID, Fingerprint)
 * for mobile devices. Uses expo-local-authentication and secure token storage.
 */

import * as LocalAuthentication from 'expo-local-authentication';
import { Platform, Alert } from 'react-native';
import userManager from './userManager';
import * as SecureStore from 'expo-secure-store';

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  errorCode?: string;
}

export interface BiometricCapabilities {
  isSupported: boolean;
  isEnrolled: boolean;
  types: LocalAuthentication.AuthenticationType[];
  typeLabel: string;
}

/**
 * Check if biometric authentication is available and enrolled on the device
 */
export async function checkBiometricSupport(): Promise<BiometricCapabilities> {
  try {
    // Web platform doesn't support biometrics
    if (Platform.OS === 'web') {
      return {
        isSupported: false,
        isEnrolled: false,
        types: [],
        typeLabel: 'Not Available',
      };
    }

    // Check if hardware is available
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      return {
        isSupported: false,
        isEnrolled: false,
        types: [],
        typeLabel: 'Not Available',
      };
    }

    // Check if biometrics are enrolled
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!isEnrolled) {
      return {
        isSupported: true,
        isEnrolled: false,
        types: [],
        typeLabel: 'Not Enrolled',
      };
    }

    // Get supported authentication types
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

    // Determine biometric type label
    let typeLabel = 'Biometric';
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      typeLabel = Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition';
    } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      typeLabel = Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
    } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      typeLabel = 'Iris';
    }

    return {
      isSupported: true,
      isEnrolled: true,
      types,
      typeLabel,
    };
  } catch (error) {
    console.error('❌ Error checking biometric support:', error);
    return {
      isSupported: false,
      isEnrolled: false,
      types: [],
      typeLabel: 'Error',
    };
  }
}

/**
 * Authenticate user with biometrics
 * This verifies the user's identity and then uses stored tokens for login
 */
export async function authenticateWithBiometrics(
  promptMessage: string = 'Authenticate to continue'
): Promise<BiometricAuthResult> {
  try {
    // Check if biometrics are available
    const capabilities = await checkBiometricSupport();
    if (!capabilities.isSupported || !capabilities.isEnrolled) {
      return {
        success: false,
        error: 'Biometric authentication is not available on this device',
        errorCode: 'not_available',
      };
    }

    // Perform biometric authentication
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: 'Use Password',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });

    if (result.success) {
      console.log('✅ Biometric authentication successful');
      return { success: true };
    } else {
      console.log('❌ Biometric authentication failed:', result.error);
      
      // Handle specific error cases
      if (result.error === 'user_cancel') {
        return {
          success: false,
          error: 'Authentication cancelled',
          errorCode: 'user_cancel',
        };
      } else if (result.error === 'user_fallback') {
        return {
          success: false,
          error: 'User chose to use password',
          errorCode: 'user_fallback',
        };
      } else if (result.error === 'not_available') {
        return {
          success: false,
          error: 'Biometric authentication is not available',
          errorCode: 'not_available',
        };
      } else if (result.error === 'not_enrolled') {
        return {
          success: false,
          error: 'No biometrics enrolled on this device',
          errorCode: 'not_enrolled',
        };
      }

      return {
        success: false,
        error: result.error || 'Biometric authentication failed',
        errorCode: result.error,
      };
    }
  } catch (error: any) {
    console.error('❌ Biometric authentication error:', error);
    return {
      success: false,
      error: error.message || 'Failed to authenticate with biometrics',
      errorCode: 'unknown_error',
    };
  }
}

/**
 * Login with biometrics - verifies biometric then uses stored tokens
 * This is the main function to use for biometric login
 */
export async function loginWithBiometrics(): Promise<{
  success: boolean;
  needsPassword?: boolean;
  error?: string;
}> {
  try {
    // First, verify biometric
    const biometricResult = await authenticateWithBiometrics('Login to LifePattern AI');
    
    if (!biometricResult.success) {
      return {
        success: false,
        error: biometricResult.error,
      };
    }

    // Check if user has valid tokens stored
    const accessToken = await SecureStore.getItemAsync('accessToken');
    const refreshToken = await SecureStore.getItemAsync('refreshToken');

    if (!refreshToken) {
      // No tokens stored - user needs to login with password first
      return {
        success: false,
        needsPassword: true,
        error: 'Please log in with your password first to enable biometric authentication',
      };
    }

    // Check if access token is valid
    if (accessToken && !isTokenExpired(accessToken)) {
      // Token is valid, user is authenticated
      console.log('✅ Biometric login successful - using valid access token');
      
      // Update session
      const session = await userManager.getCurrentUser();
      if (session) {
        session.isAuthenticated = true;
        session.lastLogin = new Date().toISOString();
        await SecureStore.setItemAsync('userSession', JSON.stringify(session));
      }
      
      return { success: true };
    }

    // Access token expired or missing, try to refresh
    if (refreshToken) {
      console.log('🔄 Access token expired, refreshing...');
      const refreshed = await userManager.refreshTokenIfNeeded();
      
      if (refreshed) {
        console.log('✅ Biometric login successful - token refreshed');
        return { success: true };
      }
    }

    // Refresh failed - user needs to login with password
    return {
      success: false,
      needsPassword: true,
      error: 'Session expired. Please log in with your password.',
    };
  } catch (error: any) {
    console.error('❌ Biometric login error:', error);
    return {
      success: false,
      error: error.message || 'Failed to login with biometrics',
    };
  }
}

/**
 * Check if biometric login is enabled for the user
 */
export async function isBiometricLoginEnabled(): Promise<boolean> {
  try {
    const enabled = await SecureStore.getItemAsync('biometricLoginEnabled');
    return enabled === 'true';
  } catch (error) {
    console.error('Error checking biometric login preference:', error);
    return false;
  }
}

/**
 * Enable or disable biometric login
 */
export async function setBiometricLoginEnabled(enabled: boolean): Promise<void> {
  try {
    if (enabled) {
      await SecureStore.setItemAsync('biometricLoginEnabled', 'true');
    } else {
      await SecureStore.deleteItemAsync('biometricLoginEnabled');
    }
  } catch (error) {
    console.error('Error setting biometric login preference:', error);
    throw error;
  }
}

/**
 * Auto-login with biometrics if enabled and tokens are available
 * Call this on app startup
 */
export async function tryBiometricAutoLogin(): Promise<{
  success: boolean;
  needsPassword?: boolean;
  error?: string;
}> {
  try {
    // Check if biometric login is enabled
    const isEnabled = await isBiometricLoginEnabled();
    if (!isEnabled) {
      return {
        success: false,
        error: 'Biometric login not enabled',
      };
    }

    // Check if user has tokens
    const refreshToken = await SecureStore.getItemAsync('refreshToken');
    if (!refreshToken) {
      return {
        success: false,
        needsPassword: true,
        error: 'No stored session found',
      };
    }

    // Check biometric capabilities
    const capabilities = await checkBiometricSupport();
    if (!capabilities.isSupported || !capabilities.isEnrolled) {
      return {
        success: false,
        error: 'Biometrics not available',
      };
    }

    // Attempt biometric login
    return await loginWithBiometrics();
  } catch (error: any) {
    console.error('❌ Biometric auto-login error:', error);
    return {
      success: false,
      error: error.message || 'Auto-login failed',
    };
  }
}

/**
 * Helper function to check if JWT token is expired
 */
function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;

    const payload = JSON.parse(atob(parts[1]));
    const exp = payload.exp;

    if (!exp) return false;

    const now = Math.floor(Date.now() / 1000);
    return now >= (exp - 300); // Refresh 5 minutes before expiry
  } catch (error) {
    console.error('Error parsing token:', error);
    return true;
  }
}

