/**
 * Daily Analysis API Types and Functions
 * 
 * This module provides TypeScript types and API functions for the daily routine analysis feature.
 * The analysis computes a daily score, detects anomalies, and generates actionable recommendations.
 */

import apiClient from './client';

// ============================================================================
// TypeScript Types
// ============================================================================

/**
 * Response from the daily analysis endpoint
 */
export interface DailyAnalysisResponse {
  date: string;
  dailyScore: number;
  anomalies: {
    code: string;
    description: string;
    severity: "low" | "medium" | "high";
  }[];
  recommendations: {
    title: string;
    reason: string;
    suggestedAction: string;
    timeHorizon?: string;
  }[];
}

/**
 * Request payload for daily analysis
 */
export interface DailyAnalysisRequest {
  date: string; // YYYY-MM-DD format
  sleepHours: number;
  bedtime: string; // HH:MM format
  wakeTime: string; // HH:MM format
  steps: number;
  workoutMinutes: number;
  screenTimeMinutes: number;
  meals: {
    breakfast: boolean;
    lunch: boolean;
    dinner: boolean;
  };
  mood: number; // 1-5 scale (higher is better)
  stressLevel: number; // 1-10 scale (lower is better)
  goalContext: {
    sleepTargetHours: number;
    dailyStepTarget: number;
    maxScreenTimeMinutes: number;
  };
  historyWindowDays?: number; // Optional, defaults to 14
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Analyzes a single day's routine data and returns score, anomalies, and recommendations.
 * 
 * @param data - Daily routine data to analyze
 * @returns Promise resolving to analysis results
 * 
 * @example
 * ```typescript
 * const analysis = await analyzeDay({
 *   date: "2025-06-01",
 *   sleepHours: 6.5,
 *   bedtime: "23:45",
 *   wakeTime: "06:30",
 *   steps: 7200,
 *   workoutMinutes: 30,
 *   screenTimeMinutes: 260,
 *   meals: {
 *     breakfast: true,
 *     lunch: true,
 *     dinner: true
 *   },
 *   mood: 3,
 *   stressLevel: 4,
 *   goalContext: {
 *     sleepTargetHours: 7.5,
 *     dailyStepTarget: 8000,
 *     maxScreenTimeMinutes: 180
 *   }
 * });
 * 
 * console.log(`Daily Score: ${analysis.dailyScore}`);
 * console.log(`Anomalies: ${analysis.anomalies.length}`);
 * console.log(`Recommendations: ${analysis.recommendations.length}`);
 * ```
 */
export const analyzeDay = async (data: DailyAnalysisRequest): Promise<DailyAnalysisResponse> => {
  const res = await apiClient.post<DailyAnalysisResponse>('/api/v1/routines/analyze-day', data);
  return res.data;
};

// ============================================================================
// Usage Example (for React Native component)
// ============================================================================

/**
 * Example function showing how to use analyzeDay in a React Native component.
 * This is a reference implementation - adapt to your component structure.
 * 
 * @example
 * ```typescript
 * import { useState } from 'react';
 * import { analyzeDay, DailyAnalysisResponse } from './api/dailyAnalysis';
 * 
 * function DailyLogScreen() {
 *   const [analysis, setAnalysis] = useState<DailyAnalysisResponse | null>(null);
 *   const [loading, setLoading] = useState(false);
 * 
 *   const handleSubmitDailyLog = async (formData: DailyAnalysisRequest) => {
 *     setLoading(true);
 *     try {
 *       const result = await analyzeDay(formData);
 *       setAnalysis(result);
 *       // Display results to user
 *     } catch (error) {
 *       console.error('Failed to analyze day:', error);
 *       // Show error to user
 *     } finally {
 *       setLoading(false);
 *     }
 *   };
 * 
 *   return (
 *     // Your component JSX
 *   );
 * }
 * ```
 */
export const exampleUsage = `
// In your React Native component:

import { useState } from 'react';
import { analyzeDay, DailyAnalysisResponse, DailyAnalysisRequest } from './api/dailyAnalysis';

function DailyLogScreen() {
  const [analysis, setAnalysis] = useState<DailyAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmitDailyLog = async (formData: DailyAnalysisRequest) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await analyzeDay(formData);
      setAnalysis(result);
      
      // Store result in state or AsyncStorage for later use
      // You can also navigate to a results screen
    } catch (err: any) {
      console.error('Failed to analyze day:', err);
      setError(err.message || 'Failed to analyze daily routine');
    } finally {
      setLoading(false);
    }
  };

  // Example form data structure:
  const exampleFormData: DailyAnalysisRequest = {
    date: new Date().toISOString().split('T')[0], // Today's date
    sleepHours: 7.5,
    bedtime: "22:30",
    wakeTime: "06:00",
    steps: 8500,
    workoutMinutes: 45,
    screenTimeMinutes: 150,
    meals: {
      breakfast: true,
      lunch: true,
      dinner: true
    },
    mood: 4,
    stressLevel: 3,
    goalContext: {
      sleepTargetHours: 7.5,
      dailyStepTarget: 8000,
      maxScreenTimeMinutes: 180
    }
  };

  return (
    // Your component implementation
  );
}
`;

