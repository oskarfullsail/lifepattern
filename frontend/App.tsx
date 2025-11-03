import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import Navigation from './navigation';
import { initializeAutomation } from './app/utils/automationInit';

export default function App() {
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Initialize automation services on app startup
    const initialize = async () => {
      try {
        console.log('🚀 App starting - initializing automation...');
        await initializeAutomation();
        console.log('✅ App initialization complete');
      } catch (error) {
        console.error('❌ App initialization error:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initialize();
  }, []);

  // Show loading screen while initializing
  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  return <Navigation />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F0F23',
  },
});
