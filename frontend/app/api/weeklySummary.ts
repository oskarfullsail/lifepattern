/**
 * Weekly Summary API Types and Functions
 * 
 * This module provides TypeScript types and API functions for the weekly pattern analysis feature.
 * The analysis provides trends, insights, and micro-goals based on the last 7 days of routine data.
 */

import apiClient from './client';

// ============================================================================
// TypeScript Types
// ============================================================================

/**
 * Weekly trend information
 */
export interface WeeklyTrend {
  metric: string;
  direction: "improving" | "declining" | "stable";
  comment: string;
}

/**
 * Weekly micro-goal
 */
export interface WeeklyMicroGoal {
  title: string;
  reason: string;
  suggestedAction: string;
  timeHorizon?: string;
}

/**
 * Weekly summary statistics
 */
export interface WeeklySummaryStats {
  averageSleepHours: number;
  averageSteps: number;
  averageScreenTimeMinutes: number;
  averageMood: number;
  averageStress: number;
}

/**
 * Response from the weekly summary endpoint
 */
export interface WeeklySummaryResponse {
  weekStart: string;
  weekEnd: string;
  summary: WeeklySummaryStats;
  trends: WeeklyTrend[];
  insights: string[];
  microGoals: WeeklyMicroGoal[];
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetches weekly summary analysis for the last 7 days ending on the specified date.
 * 
 * @param endDate - End date in YYYY-MM-DD format (defaults to today)
 * @returns Promise resolving to weekly summary with trends, insights, and micro-goals
 * 
 * @example
 * ```typescript
 * // Get summary for week ending today
 * const summary = await fetchWeeklySummary();
 * 
 * // Get summary for specific week
 * const summary = await fetchWeeklySummary('2025-06-07');
 * 
 * console.log(`Week: ${summary.weekStart} to ${summary.weekEnd}`);
 * console.log(`Average Sleep: ${summary.summary.averageSleepHours} hours`);
 * console.log(`Trends: ${summary.trends.length}`);
 * console.log(`Insights: ${summary.insights.length}`);
 * console.log(`Micro-goals: ${summary.microGoals.length}`);
 * ```
 */
export const fetchWeeklySummary = async (endDate?: string): Promise<WeeklySummaryResponse> => {
  // Default to today if not provided
  const date = endDate || new Date().toISOString().split('T')[0];
  
  const res = await apiClient.get<WeeklySummaryResponse>('/api/v1/routines/week-summary', {
    params: { endDate: date },
  });
  return res.data;
};

// ============================================================================
// Usage Example (for React Native component)
// ============================================================================

/**
 * Example function showing how to use fetchWeeklySummary in a React Native component.
 * This is a reference implementation - adapt to your component structure.
 * 
 * @example
 * ```typescript
 * import { useState, useEffect } from 'react';
 * import { fetchWeeklySummary, WeeklySummaryResponse } from './api/weeklySummary';
 * 
 * function WeeklySummaryScreen() {
 *   const [summary, setSummary] = useState<WeeklySummaryResponse | null>(null);
 *   const [loading, setLoading] = useState(false);
 *   const [error, setError] = useState<string | null>(null);
 * 
 *   useEffect(() => {
 *     loadWeeklySummary();
 *   }, []);
 * 
 *   const loadWeeklySummary = async () => {
 *     setLoading(true);
 *     setError(null);
 *     
 *     try {
 *       const result = await fetchWeeklySummary();
 *       setSummary(result);
 *     } catch (err: any) {
 *       console.error('Failed to load weekly summary:', err);
 *       setError(err.message || 'Failed to load weekly summary');
 *     } finally {
 *       setLoading(false);
 *     }
 *   };
 * 
 *   if (loading) {
 *     return <ActivityIndicator />;
 *   }
 * 
 *   if (error) {
 *     return <Text>Error: {error}</Text>;
 *   }
 * 
 *   if (!summary) {
 *     return <Text>No data available</Text>;
 *   }
 * 
 *   return (
 *     <ScrollView>
 *       <Text>Week: {summary.weekStart} to {summary.weekEnd}</Text>
 *       
 *       <Text>Summary</Text>
 *       <Text>Sleep: {summary.summary.averageSleepHours} hours</Text>
 *       <Text>Steps: {summary.summary.averageSteps}</Text>
 *       
 *       <Text>Trends</Text>
 *       {summary.trends.map((trend, i) => (
 *         <View key={i}>
 *           <Text>{trend.metric}: {trend.direction}</Text>
 *           <Text>{trend.comment}</Text>
 *         </View>
 *       ))}
 *       
 *       <Text>Insights</Text>
 *       {summary.insights.map((insight, i) => (
 *         <Text key={i}>{insight}</Text>
 *       ))}
 *       
 *       <Text>Micro-Goals</Text>
 *       {summary.microGoals.map((goal, i) => (
 *         <View key={i}>
 *           <Text>{goal.title}</Text>
 *           <Text>{goal.reason}</Text>
 *           <Text>{goal.suggestedAction}</Text>
 *         </View>
 *       ))}
 *     </ScrollView>
 *   );
 * }
 * ```
 */
export const exampleUsage = `
// In your React Native component:

import { useState, useEffect } from 'react';
import { fetchWeeklySummary, WeeklySummaryResponse } from './api/weeklySummary';

function WeeklySummaryScreen() {
  const [summary, setSummary] = useState<WeeklySummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWeeklySummary();
  }, []);

  const loadWeeklySummary = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get summary for current week (ending today)
      const result = await fetchWeeklySummary();
      setSummary(result);
    } catch (err: any) {
      console.error('Failed to load weekly summary:', err);
      setError(err.message || 'Failed to load weekly summary');
    } finally {
      setLoading(false);
    }
  };

  return (
    // Your component JSX
  );
}
`;

