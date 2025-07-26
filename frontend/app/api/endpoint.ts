import apiClient from './client';

// Types
export interface RoutineLogPayload {
  user_id: string; // Changed from number to string
  sleep_hours: number;
  meal_times: string[];
  screen_time: number;
  exercise_duration: number;
  wake_up_time: string;
  bed_time: string;
  water_intake: number;
  stress_level: number;
  log_date: string;
}

export interface CreateRoutineLogResponse {
  log_id: number;
  message: string;
  has_ai: boolean;
  ai_result?: {
    is_anomaly: boolean;
    confidence_score: number;
    anomaly_type: string;
  };
}

export interface InsightResponse {
  routine_log: RoutineLogPayload;
  ai_report: {
    is_anomaly: boolean;
    confidence_score: number;
    anomaly_type: string;
    recommendations: string[];
    ai_service_response: string;
  };
}

// API Calls
export const createRoutineLog = async (payload: RoutineLogPayload) => {
  const res = await apiClient.post<CreateRoutineLogResponse>('/log', payload);
  return res.data;
};

export const getUserRoutineLogs = async (user_id: string, limit = 10) => {
  const res = await apiClient.get<{ logs: RoutineLogPayload[]; user_id: string }>(`/logs`, {
    params: { user_id, limit },
  });
  return res.data;
};

export const getInsight = async (log_id: number) => {
  const res = await apiClient.get<InsightResponse>(`/insights`, {
    params: { log_id },
  });
  return res.data;
};

export const getUserInsights = async (user_id: string, limit = 10) => {
  const res = await apiClient.get<{ user_id: string; insights: InsightResponse[]; count: number }>(`/user-insights`, {
    params: { user_id, limit },
  });
  return res.data;
}; 