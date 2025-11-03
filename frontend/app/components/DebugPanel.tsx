/**
 * Debug Panel Component
 * 
 * Add this to any screen to debug backend connectivity issues
 * 
 * Usage:
 * import DebugPanel from './components/DebugPanel';
 * 
 * <DebugPanel />
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { checkBackendHealth, getBackendStatus } from '../utils/backendHealth';
import { createRoutineLog } from '../api/endpoint';
import userManager from '../utils/userManager';
import apiClient from '../api/client';

export default function DebugPanel() {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    console.log(message);
  };

  const testBackendHealth = async () => {
    setIsLoading(true);
    addLog('🏥 Testing backend health...');
    
    try {
      const result = await checkBackendHealth();
      if (result.isAwake) {
        addLog(`✅ Backend is awake! Response time: ${result.responseTime}ms`);
      } else {
        addLog(`❌ Backend health check failed: ${result.error}`);
      }
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testAuthentication = async () => {
    setIsLoading(true);
    addLog('🔐 Testing authentication...');
    
    try {
      const isAuthenticated = await userManager.isAuthenticated();
      const accessToken = await userManager.getAccessToken();
      const userId = await userManager.getUserId();
      
      addLog(`User ID: ${userId}`);
      addLog(`Has token: ${accessToken ? 'YES' : 'NO'}`);
      addLog(`Is authenticated: ${isAuthenticated ? 'YES' : 'NO'}`);
      
      if (accessToken) {
        addLog(`Token preview: ${accessToken.substring(0, 30)}...`);
      }
    } catch (error: any) {
      addLog(`❌ Auth error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testDataSubmission = async () => {
    setIsLoading(true);
    addLog('📤 Testing data submission...');
    
    try {
      const userId = await userManager.getUserId();
      addLog(`Using user ID: ${userId}`);
      
      const payload = {
        user_id: userId,
        sleep_hours: 7,
        exercise_duration: 1,
        screen_time: 4,
        water_intake: 2,
        stress_level: 5,
        wake_up_time: '07:00',
        bed_time: '23:00',
        meal_times: ['08:00', '12:00', '19:00'],
        log_date: new Date().toISOString().split('T')[0],
      };
      
      addLog('📦 Payload prepared');
      addLog(JSON.stringify(payload, null, 2));
      
      const response = await createRoutineLog(payload);
      
      addLog('✅ Data submitted successfully!');
      addLog(`Response: ${JSON.stringify(response, null, 2)}`);
      
      if (response.has_ai) {
        addLog('🤖 AI analysis received!');
      }
    } catch (error: any) {
      addLog(`❌ Submission error: ${error.message}`);
      if (error.response) {
        addLog(`Status: ${error.response.status}`);
        addLog(`Response: ${JSON.stringify(error.response.data)}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const testRawRequest = async () => {
    setIsLoading(true);
    addLog('🧪 Testing raw API request...');
    
    try {
      const response = await apiClient.get('/health');
      addLog(`✅ Raw request successful!`);
      addLog(`Response: ${JSON.stringify(response.data)}`);
    } catch (error: any) {
      addLog(`❌ Raw request failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const runFullDiagnostic = async () => {
    setLogs([]);
    addLog('🚀 Starting full diagnostic...');
    addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    await testBackendHealth();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testAuthentication();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testRawRequest();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testDataSubmission();
    
    addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━');
    addLog('✅ Diagnostic complete!');
  };

  const clearLogs = () => {
    setLogs([]);
  };

  if (!isVisible) {
    return (
      <TouchableOpacity 
        style={styles.toggleButton}
        onPress={() => setIsVisible(true)}
      >
        <Text style={styles.toggleButtonText}>🔧 Debug</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔧 Debug Panel</Text>
        <TouchableOpacity onPress={() => setIsVisible(false)}>
          <Text style={styles.closeButton}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity 
          style={styles.button}
          onPress={runFullDiagnostic}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Run All Tests</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]}
          onPress={clearLogs}
        >
          <Text style={styles.buttonText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity 
          style={[styles.button, styles.smallButton]}
          onPress={testBackendHealth}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Health</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.smallButton]}
          onPress={testAuthentication}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Auth</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.smallButton]}
          onPress={testDataSubmission}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Submit</Text>
        </TouchableOpacity>
      </View>

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.loadingText}>Running test...</Text>
        </View>
      )}

      <ScrollView style={styles.logsContainer}>
        {logs.length === 0 ? (
          <Text style={styles.placeholderText}>
            No logs yet. Click "Run All Tests" to start.
          </Text>
        ) : (
          logs.map((log, index) => (
            <Text key={index} style={styles.logText}>
              {log}
            </Text>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  toggleButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  toggleButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  container: {
    position: 'absolute',
    top: 60,
    left: 10,
    right: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    maxHeight: '80%',
    zIndex: 1000,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    fontSize: 24,
    color: '#666',
    paddingHorizontal: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  button: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#666',
  },
  smallButton: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#007AFF',
  },
  logsContainer: {
    maxHeight: 400,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
  },
  placeholderText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  },
  logText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#333',
    marginBottom: 4,
  },
});

