import { useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, Platform } from 'react-native';
import Navigation from './navigation';
import { initializeAutomationNonBlocking } from './app/utils/automationInit';
import { setupGlobalErrorHandlers } from './app/utils/errorHandlers';
import ErrorBoundary from './components/ErrorBoundary';

// Setup global error handlers immediately
setupGlobalErrorHandlers();

// Maximum time to show splash screen (Apple requires responsive UI)
const MAX_SPLASH_TIME_MS = 2500;

// Startup logging for TestFlight debugging
const logStartup = (message: string) => {
  const timestamp = new Date().toISOString();
  console.log(`[STARTUP ${timestamp}] ${message}`);
};

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [initStatus, setInitStatus] = useState<'loading' | 'ready' | 'timeout'>('loading');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    logStartup('🚀 App.tsx mounted');
    logStartup(`Platform: ${Platform.OS} ${Platform.Version}`);

    // CRITICAL: Set a timeout to ensure app always becomes responsive
    // This prevents freezing if automation/backend is slow or unreachable
    timeoutRef.current = setTimeout(() => {
      if (!hasNavigatedRef.current) {
        logStartup('⚠️ Startup timeout reached - proceeding anyway');
        setInitStatus('timeout');
        setIsReady(true);
        hasNavigatedRef.current = true;
      }
    }, MAX_SPLASH_TIME_MS);

    // Initialize automation in background (non-blocking)
    const initialize = async () => {
      try {
        logStartup('📦 Starting non-blocking initialization...');
        
        // This now runs in background and doesn't block
        initializeAutomationNonBlocking();
        
        logStartup('✅ App ready to render');
        
        if (!hasNavigatedRef.current) {
          setInitStatus('ready');
          setIsReady(true);
          hasNavigatedRef.current = true;
        }
      } catch (error) {
        logStartup(`❌ Initialization error: ${error}`);
        // NEVER block app startup - always proceed
        if (!hasNavigatedRef.current) {
          setInitStatus('ready');
          setIsReady(true);
          hasNavigatedRef.current = true;
        }
      }
    };

    // Start initialization immediately
    initialize();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Show branded splash screen briefly (never blocks indefinitely)
  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.logoEmoji}>🧠</Text>
        <Text style={styles.logoText}>LifePattern AI</Text>
        <ActivityIndicator size="large" color="#7C3AED" style={styles.spinner} />
        <Text style={styles.loadingText}>Starting...</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <Navigation />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F0F23',
  },
  logoEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 32,
  },
  spinner: {
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});
