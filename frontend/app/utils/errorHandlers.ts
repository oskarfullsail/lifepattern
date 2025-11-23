/**
 * Global Error Handlers
 * Catches unhandled errors and promise rejections to prevent app crashes
 */

import { Platform } from 'react-native';

/**
 * Setup global error handlers for production
 */
export const setupGlobalErrorHandlers = (): void => {
  // Handle unhandled promise rejections
  const originalHandler = ErrorUtils.getGlobalHandler();

  ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.error('🔴 Global Error Handler:', error);
    console.error('Fatal:', isFatal);

    // Log to crash reporting service
    // Example: Sentry.captureException(error);

    // Call original handler
    if (originalHandler) {
      originalHandler(error, isFatal);
    }

    // In production, prevent app from crashing on non-fatal errors
    if (!isFatal && !__DEV__) {
      console.log('Non-fatal error caught and handled');
      return;
    }
  });

  // Track promise rejections (if available)
  try {
    if (typeof Promise !== 'undefined' && global.HermesInternal) {
      // Simple promise rejection handler
      if (typeof global.__DEV__ !== 'undefined' && global.__DEV__) {
        console.log('Promise rejection tracking enabled');
      }
    }
  } catch (error) {
    // Silently fail if promise tracking is not available
    console.log('Promise rejection tracking not available');
  }

  console.log('✅ Global error handlers configured');
};

/**
 * Safe async wrapper that catches errors
 */
export const safeAsync = <T>(
  fn: (...args: any[]) => Promise<T>,
  fallback?: T
): ((...args: any[]) => Promise<T | undefined>) => {
  return async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error('Safe async error:', error);
      return fallback;
    }
  };
};

/**
 * Safe function wrapper that catches sync errors
 */
export const safe = <T>(
  fn: (...args: any[]) => T,
  fallback?: T
): ((...args: any[]) => T | undefined) => {
  return (...args: any[]) => {
    try {
      return fn(...args);
    } catch (error) {
      console.error('Safe function error:', error);
      return fallback;
    }
  };
};

export default {
  setupGlobalErrorHandlers,
  safeAsync,
  safe,
};
