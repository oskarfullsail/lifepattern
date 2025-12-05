/**
 * AI Heartbeat API Types and Functions
 * 
 * This module provides TypeScript types and API functions for the AI service heartbeat feature.
 * The heartbeat provides service status and a positive greeting for the user.
 */

import apiClient from './client';

// ============================================================================
// TypeScript Types
// ============================================================================

/**
 * Response from the AI heartbeat endpoint
 */
export interface AiHeartbeatResponse {
  status: "ok" | "unreachable" | "degraded";
  timestamp: string;
  greeting: string;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetches AI service heartbeat and greeting.
 * 
 * This function:
 * - Checks if AI service is available
 * - Returns a positive greeting message
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
 *       {/* Rest of your home screen content */}
 *     </View>
 *   );
 * }
 * ```
 */
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

