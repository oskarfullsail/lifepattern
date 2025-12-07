/**
 * AI Heartbeat API Types and Functions
 * 
 * This module provides TypeScript types and API functions for the AI service heartbeat feature.
 * The heartbeat provides service status and a positive greeting for the user.
 */

import axios from 'axios';
import apiClient from './client';

// Direct AI Service URL for wake-up calls (bypasses backend)
const AI_SERVICE_HEALTH_URL = 'https://lifepattern-ai-service.onrender.com/health';

// ============================================================================
// TypeScript Types
// ============================================================================

/**
 * Response from the AI heartbeat endpoint
 */
export interface AiHeartbeatResponse {
  status: "ok" | "unreachable" | "degraded" | "waking_up";
  timestamp: string;
  greeting: string;
}

/**
 * Response from direct AI service health check
 */
interface AiServiceHealthResponse {
  status: string;
  model_loaded: boolean;
  model_accuracy: number;
  timestamp: string;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Wakes up the AI service by calling its health endpoint directly.
 * Render free-tier services go to sleep after inactivity.
 * 
 * @returns Promise resolving to true if AI service is healthy, false otherwise
 */
export const wakeUpAiService = async (): Promise<boolean> => {
  try {
    console.log('🔄 Waking up AI service...');
    const response = await axios.get<AiServiceHealthResponse>(AI_SERVICE_HEALTH_URL, {
      timeout: 60000, // 60 second timeout for cold starts
    });
    
    if (response.data.status === 'healthy' && response.data.model_loaded) {
      console.log('✅ AI service is awake and healthy:', response.data);
      return true;
    }
    
    console.log('⚠️ AI service responded but not fully healthy:', response.data);
    return false;
  } catch (error: any) {
    console.error('❌ Failed to wake up AI service:', error.message);
    return false;
  }
};

/**
 * Fetches AI service heartbeat and greeting.
 * 
 * This function:
 * 1. First wakes up the AI service by calling its health endpoint directly
 * 2. Then calls the backend heartbeat endpoint for the greeting
 * - Handles errors gracefully with fallback greeting
 * 
 * @returns Promise resolving to heartbeat response with status and greeting
 * 
 * @example
 * ```typescript
 * const heartbeat = await fetchAiHeartbeat();
 * 
 * if (heartbeat.status === 'ok') {
 *   console.log('AI is ready:', heartbeat.greeting);
 * } else {
 *   console.log('AI unavailable, using fallback:', heartbeat.greeting);
 * }
 * ```
 */
export const fetchAiHeartbeat = async (): Promise<AiHeartbeatResponse> => {
  try {
    // Step 1: Wake up the AI service directly
    const isAwake = await wakeUpAiService();
    
    if (!isAwake) {
      // AI service is still waking up or unreachable
      return {
        status: "waking_up",
        timestamp: new Date().toISOString(),
        greeting: "AI service is waking up... This may take 30-60 seconds on first load.",
      };
    }
    
    // Step 2: Call backend heartbeat for personalized greeting
    const res = await apiClient.get<AiHeartbeatResponse>('/api/v1/ai/heartbeat');
    return res.data;
  } catch (error: any) {
    // Fallback if network fails completely
    console.error('Heartbeat request failed:', error);
    return {
      status: "unreachable",
      timestamp: new Date().toISOString(),
      greeting: "Welcome back! We're having trouble reaching the AI right now, but you can still track your habits.",
    };
  }
};

/**
 * Quick check if AI service is available without waking it up.
 * Useful for checking status without waiting for cold start.
 * 
 * @returns Promise resolving to true if AI service responds quickly
 */
export const isAiServiceAvailable = async (): Promise<boolean> => {
  try {
    const response = await axios.get<AiServiceHealthResponse>(AI_SERVICE_HEALTH_URL, {
      timeout: 5000, // Short timeout - only succeeds if already awake
    });
    return response.data.status === 'healthy' && response.data.model_loaded;
  } catch {
    return false;
  }
};

// ============================================================================
// Usage Example (for React Native component)
// ============================================================================

/**
 * Example function showing how to use fetchAiHeartbeat in a React Native component.
 * This is a reference implementation - adapt to your component structure.
 * 
 * @example
 * ```typescript
 * import { useState, useEffect } from 'react';
 * import { fetchAiHeartbeat, AiHeartbeatResponse } from './api/heartbeat';
 * 
 * function HomeScreen() {
 *   const [heartbeat, setHeartbeat] = useState<AiHeartbeatResponse | null>(null);
 * 
 *   useEffect(() => {
 *     // Fetch heartbeat on component mount
 *     fetchAiHeartbeat()
 *       .then(setHeartbeat)
 *       .catch(() => {
 *         // Set fallback on error
 *         setHeartbeat({
 *           status: "unreachable",
 *           timestamp: new Date().toISOString(),
 *           greeting: "Welcome back! We're having trouble reaching the AI right now, but you can still track your habits.",
 *         });
 *       });
 *   }, []);
 * 
 *   return (
 *     <View>
 *       {heartbeat && (
 *         <View style={{ 
 *           padding: 12, 
 *           borderRadius: 12, 
 *           backgroundColor: heartbeat.status === 'ok' ? '#e8f5e9' : '#fff3e0',
 *           marginBottom: 16
 *         }}>
 *           <Text style={{ 
 *             fontSize: 16, 
 *             color: heartbeat.status === 'ok' ? '#2e7d32' : '#e65100'
 *           }}>
 *             {heartbeat.greeting}
 *           </Text>
 *           {heartbeat.status !== 'ok' && (
 *             <Text style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
 *               AI service status: {heartbeat.status}
 *             </Text>
 *           )}
 *         </View>
 *       )}
 *       // ... Rest of your home screen content
 *     </View>
 *   );
 * }
 * ```
 */

// Example usage as string (for documentation purposes)
export const exampleUsage = `
// In your React Native component (e.g., HomeScreen or App root):

import { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fetchAiHeartbeat, AiHeartbeatResponse } from './api/heartbeat';

function HomeScreen() {
  const [heartbeat, setHeartbeat] = useState<AiHeartbeatResponse | null>(null);

  useEffect(() => {
    // Fetch heartbeat on component mount
    fetchAiHeartbeat()
      .then(setHeartbeat)
      .catch(() => {
        // Set fallback on error
        setHeartbeat({
          status: "unreachable",
          timestamp: new Date().toISOString(),
          greeting: "Welcome back! We're having trouble reaching the AI right now, but you can still track your habits.",
        });
      });
  }, []);

  return (
    <View style={styles.container}>
      {/* Greeting Card */}
      {heartbeat && (
        <View style={[
          styles.greetingCard,
          heartbeat.status === 'ok' ? styles.greetingCardOk : styles.greetingCardUnreachable
        ]}>
          <Text style={styles.greetingText}>
            {heartbeat.greeting}
          </Text>
          {heartbeat.status !== 'ok' && (
            <Text style={styles.statusText}>
              AI service status: {heartbeat.status}
            </Text>
          )}
        </View>
      )}
      
      {/* Rest of your home screen content */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  greetingCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  greetingCardOk: {
    backgroundColor: '#e8f5e9',
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  greetingCardUnreachable: {
    backgroundColor: '#fff3e0',
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  greetingText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
});
`;

