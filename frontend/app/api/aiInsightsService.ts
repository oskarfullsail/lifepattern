/**
 * AI Insights Service
 * 
 * Provides functions to fetch AI-powered insights, recommendations,
 * and coaching suggestions from the backend AI service.
 */

import apiClient from './client';
import { fetchWeeklySummary, WeeklySummaryResponse } from './weeklySummary';
import { fetchAiHeartbeat, AiHeartbeatResponse } from './heartbeat';

// ============================================================================
// Types
// ============================================================================

/**
 * Daily analysis request
 */
export interface DailyAnalysisRequest {
  date: string;
  sleepHours: number;
  bedtime: string;
  wakeTime: string;
  steps: number;
  workoutMinutes: number;
  screenTimeMinutes: number;
  meals: {
    breakfast: boolean;
    lunch: boolean;
    dinner: boolean;
  };
  mood: number; // 1-5 scale
  stressLevel: number; // 1-10 scale
  goalContext?: {
    sleepTargetHours?: number;
    dailyStepTarget?: number;
    maxScreenTimeMinutes?: number;
  };
}

/**
 * Anomaly detected by AI
 */
export interface Anomaly {
  code: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

/**
 * AI-generated recommendation
 */
export interface Recommendation {
  title: string;
  reason: string;
  suggestedAction: string;
  timeHorizon?: string;
}

/**
 * Daily analysis response from AI
 */
export interface DailyAnalysisResponse {
  date: string;
  dailyScore: number;
  anomalies: Anomaly[];
  recommendations: Recommendation[];
}

/**
 * AI Coach tip
 */
export interface AICoachTip {
  id: string;
  title: string;
  message: string;
  category: 'sleep' | 'exercise' | 'stress' | 'nutrition' | 'screen_time' | 'general';
  priority: 'low' | 'medium' | 'high';
  actionable: boolean;
  suggestedAction?: string;
  createdAt: string;
}

/**
 * AI Coach response
 */
export interface AICoachResponse {
  tips: AICoachTip[];
  greeting: string;
  overallScore: number;
  trend: 'improving' | 'declining' | 'stable';
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get AI Coach tips and personalized recommendations
 * 
 * @param timeframe - 'day' | 'week' | 'month'
 * @returns AI Coach response with tips and overall assessment
 */
export const getAICoachTips = async (
  timeframe: 'day' | 'week' | 'month' = 'week'
): Promise<AICoachResponse> => {
  try {
    // First, check if AI service is available
    const heartbeat = await fetchAiHeartbeat();
    
    // Then fetch weekly summary for context
    const endDate = new Date().toISOString().split('T')[0];
    let weeklySummary: WeeklySummaryResponse | null = null;
    
    try {
      weeklySummary = await fetchWeeklySummary(endDate);
    } catch (error) {
      console.log('Could not fetch weekly summary for AI Coach:', error);
    }

    // Generate tips based on weekly summary
    const tips: AICoachTip[] = [];
    let overallScore = 75; // Default score
    let trend: 'improving' | 'declining' | 'stable' = 'stable';

    if (weeklySummary) {
      // Generate tips based on insights
      weeklySummary.insights.forEach((insight, index) => {
        tips.push({
          id: `insight-${index}`,
          title: 'AI Insight',
          message: insight,
          category: 'general',
          priority: 'medium',
          actionable: true,
          createdAt: new Date().toISOString(),
        });
      });

      // Convert micro-goals to tips
      weeklySummary.microGoals.forEach((goal, index) => {
        tips.push({
          id: `goal-${index}`,
          title: goal.title,
          message: goal.reason,
          category: 'general',
          priority: 'high',
          actionable: true,
          suggestedAction: goal.suggestedAction,
          createdAt: new Date().toISOString(),
        });
      });

      // Determine trend from weekly trends
      const improvingCount = weeklySummary.trends.filter(t => t.direction === 'improving').length;
      const decliningCount = weeklySummary.trends.filter(t => t.direction === 'declining').length;
      
      if (improvingCount > decliningCount) {
        trend = 'improving';
        overallScore = Math.min(95, overallScore + improvingCount * 5);
      } else if (decliningCount > improvingCount) {
        trend = 'declining';
        overallScore = Math.max(50, overallScore - decliningCount * 5);
      }
    }

    // Add default tips if none generated
    if (tips.length === 0) {
      tips.push({
        id: 'default-1',
        title: 'Keep Tracking',
        message: 'Continue logging your daily routine to get personalized AI insights.',
        category: 'general',
        priority: 'medium',
        actionable: true,
        suggestedAction: 'Log your sleep, exercise, and mood data daily.',
        createdAt: new Date().toISOString(),
      });
    }

    return {
      tips,
      greeting: heartbeat.greeting,
      overallScore,
      trend,
    };
  } catch (error) {
    console.error('Error fetching AI Coach tips:', error);
    
    // Return fallback response
    return {
      tips: [{
        id: 'fallback-1',
        title: 'Stay Consistent',
        message: 'Consistency is key to building healthy habits. Keep up your routine!',
        category: 'general',
        priority: 'medium',
        actionable: false,
        createdAt: new Date().toISOString(),
      }],
      greeting: 'Welcome back! Keep building those healthy habits.',
      overallScore: 70,
      trend: 'stable',
    };
  }
};

/**
 * Analyze a single day's routine data
 * 
 * @param data - Daily routine data
 * @returns Analysis with score, anomalies, and recommendations
 */
export const analyzeDailyRoutine = async (
  data: DailyAnalysisRequest
): Promise<DailyAnalysisResponse> => {
  try {
    const response = await apiClient.post<DailyAnalysisResponse>(
      '/api/v1/routines/analyze-day',
      {
        date: data.date,
        sleep_hours: data.sleepHours,
        bedtime: data.bedtime,
        wake_time: data.wakeTime,
        steps: data.steps,
        workout_minutes: data.workoutMinutes,
        screen_time_minutes: data.screenTimeMinutes,
        meals: data.meals,
        mood: data.mood,
        stress_level: data.stressLevel,
        goal_context: data.goalContext ? {
          sleep_target_hours: data.goalContext.sleepTargetHours,
          daily_step_target: data.goalContext.dailyStepTarget,
          max_screen_time_minutes: data.goalContext.maxScreenTimeMinutes,
        } : undefined,
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error analyzing daily routine:', error);
    throw error;
  }
};

/**
 * Get AI insights for a specific timeframe
 * 
 * @param timeframe - 'day' | 'week' | 'month'
 * @returns Insights with trends and recommendations
 */
export const getAIInsights = async (
  timeframe: 'day' | 'week' | 'month' = 'week'
): Promise<{
  summary: WeeklySummaryResponse | null;
  tips: AICoachTip[];
  status: 'ok' | 'unreachable';
}> => {
  try {
    // Check AI service status
    const heartbeat = await fetchAiHeartbeat();
    
    // Get weekly summary
    const endDate = new Date().toISOString().split('T')[0];
    let summary: WeeklySummaryResponse | null = null;
    
    if (heartbeat.status === 'ok') {
      try {
        summary = await fetchWeeklySummary(endDate);
      } catch (error) {
        console.log('Could not fetch weekly summary:', error);
      }
    }

    // Get AI Coach tips
    const coachResponse = await getAICoachTips(timeframe);

    return {
      summary,
      tips: coachResponse.tips,
      status: heartbeat.status === 'ok' ? 'ok' : 'unreachable',
    };
  } catch (error) {
    console.error('Error fetching AI insights:', error);
    return {
      summary: null,
      tips: [],
      status: 'unreachable',
    };
  }
};

// ============================================================================
// Hooks for React Components
// ============================================================================

/**
 * Hook usage example for AI Coach tips
 * 
 * @example
 * ```tsx
 * import { useState, useEffect } from 'react';
 * import { getAICoachTips, AICoachResponse } from './api/aiInsightsService';
 * 
 * function AICoachScreen() {
 *   const [coachData, setCoachData] = useState<AICoachResponse | null>(null);
 *   const [loading, setLoading] = useState(true);
 *   const [error, setError] = useState<string | null>(null);
 * 
 *   useEffect(() => {
 *     const loadCoachData = async () => {
 *       try {
 *         setLoading(true);
 *         const data = await getAICoachTips('week');
 *         setCoachData(data);
 *       } catch (err) {
 *         setError('Failed to load AI Coach data');
 *       } finally {
 *         setLoading(false);
 *       }
 *     };
 *     
 *     loadCoachData();
 *   }, []);
 * 
 *   // Render component
 * }
 * ```
 */
export const HOOK_USAGE_EXAMPLE = 'See code comments for hook usage example';

export default {
  getAICoachTips,
  getAIInsights,
  analyzeDailyRoutine,
  fetchWeeklySummary,
  fetchAiHeartbeat,
};

