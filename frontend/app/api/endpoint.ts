import apiClient from './client';
import { Platform } from 'react-native';

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
  routine_log: RoutineLogPayload & { id?: number; log_id?: number };
  ai_report: {
    is_anomaly: boolean;
    confidence_score: number;
    anomaly_type: string;
    recommendations: string[];
    ai_service_response: string;
  };
}

// Authentication Types
export interface WebAuthnRegistrationStartRequest {
  device_label: string;
}

export interface WebAuthnRegistrationStartResponse {
  user_id: string;
  session_data: any;
  challenge: any;
}

export interface WebAuthnRegistrationFinishRequest {
  user_id: string;
  session_data: any;
  credential: any;
}

export interface WebAuthnLoginStartRequest {
  user_id: string;
}

export interface WebAuthnLoginStartResponse {
  session_data: any;
  challenge: any;
}

export interface WebAuthnLoginFinishRequest {
  user_id: string;
  session_data: any;
  credential: any;
}

export interface MobileChallengeRequest {
  user_id: string;
}

export interface MobileChallengeResponse {
  challenge_id: string;
  challenge: string;
  expires_at: string;
}

export interface MobileVerifyRequest {
  challenge_id: string;
  response: string;
  device_label: string;
}

export interface MobileVerifyResponse {
  session_id: string;
  access_token: string;
  refresh_token: string;
  user_id: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  access_token: string;
}

// Password Recovery Types
export interface PasswordRecoveryRequest {
  username: string;
}

export interface PasswordRecoveryResponse {
  success: boolean;
  message: string;
  new_passphrase?: string;
  temp_credentials?: {
    username: string;
    passphrase: string;
  };
}

export interface LoginRequest {
  username: string;
  passphrase: string;
  device_label?: string;
}

export interface LoginResponse {
  user_id: string;
  access_token: string;
  refresh_token: string;
  device_label: string;
  message: string;
}

export interface RegisterRequest {
  username: string;
  passphrase: string;
  device_label?: string;
}

export interface RegisterResponse {
  user_id: string;
  access_token: string;
  refresh_token: string;
  device_label: string;
  message: string;
}

// Cross-Device Linking Types
export interface GenerateLinkTokenRequest {
  device_label: string;
}

export interface GenerateLinkTokenResponse {
  link_token: string;
  qr_code: string;
  expires_at: string;
}

export interface VerifyLinkTokenRequest {
  link_token: string;
  device_label: string;
}

export interface VerifyLinkTokenResponse {
  session_id: string;
  access_token: string;
  refresh_token: string;
  user_id: string;
  linked_user_id: string;
}

export interface LinkStatusResponse {
  active_tokens: Array<{
    link_token: string;
    device_label: string;
    created_at: string;
    expires_at: string;
  }>;
}

// Device and Watch Data Types
export interface DeviceInfo {
  platform: 'ios' | 'android' | 'web';
  device_id: string;
  device_name: string;
  os_version: string;
  app_version: string;
}

export interface WatchData {
  heart_rate: number;
  steps: number;
  calories: number;
  sleep_hours: number;
  activity_level: string;
  timestamp: string;
}

export interface SyncWatchDataRequest {
  user_id: string;
  device_info: DeviceInfo;
  watch_data: WatchData[];
}

export interface SyncWatchDataResponse {
  synced_count: number;
  message: string;
}

// API Calls
export const createRoutineLog = async (payload: RoutineLogPayload) => {
  const res = await apiClient.post<CreateRoutineLogResponse>('/api/log', payload);
  return res.data;
};

export const getUserRoutineLogs = async (user_id: string, limit = 10) => {
  const res = await apiClient.get<{ logs: RoutineLogPayload[]; user_id: string }>(`/api/logs`, {
    params: { user_id, limit },
  });
  return res.data;
};

export const getInsight = async (log_id: number) => {
  const res = await apiClient.get<InsightResponse>(`/api/insights`, {
    params: { log_id },
  });
  return res.data;
};

export const getUserInsights = async (user_id: string, limit = 10) => {
  const res = await apiClient.get<{ user_id: string; insights: InsightResponse[]; count: number }>(`/api/user-insights`, {
    params: { user_id, limit },
  });
  return res.data;
};

// Authentication API Calls
export const webAuthnRegistrationStart = async (payload: WebAuthnRegistrationStartRequest) => {
  const res = await apiClient.post<WebAuthnRegistrationStartResponse>('/auth/webauthn/register/start', payload);
  return res.data;
};

export const webAuthnRegistrationFinish = async (payload: WebAuthnRegistrationFinishRequest) => {
  const res = await apiClient.post<LoginResponse>('/auth/webauthn/register/finish', payload);
  return res.data;
};

export const webAuthnLoginStart = async (payload: WebAuthnLoginStartRequest) => {
  const res = await apiClient.post<WebAuthnLoginStartResponse>('/auth/webauthn/login/start', payload);
  return res.data;
};

export const webAuthnLoginFinish = async (payload: WebAuthnLoginFinishRequest) => {
  const res = await apiClient.post<{ message: string }>('/auth/webauthn/login/finish', payload);
  return res.data;
};

export const mobileChallenge = async (payload: MobileChallengeRequest) => {
  const res = await apiClient.post<MobileChallengeResponse>('/auth/mobile/challenge', payload);
  return res.data;
};

export const mobileVerify = async (payload: MobileVerifyRequest) => {
  const res = await apiClient.post<MobileVerifyResponse>('/auth/mobile/verify', payload);
  return res.data;
};

export const refreshToken = async (payload: RefreshTokenRequest) => {
  const res = await apiClient.post<RefreshTokenResponse>('/auth/refresh', payload);
  return res.data;
};

export const login = async (payload: LoginRequest) => {
  const res = await apiClient.post<LoginResponse>('/auth/login', payload);
  return res.data;
};

export const register = async (payload: RegisterRequest) => {
  const res = await apiClient.post<RegisterResponse>('/auth/register', payload);
  return res.data;
};

// Cross-Device Linking API Calls
export const generateLinkToken = async (payload: GenerateLinkTokenRequest) => {
  const res = await apiClient.post<GenerateLinkTokenResponse>('/api/auth/link/generate', payload);
  return res.data;
};

export const verifyLinkToken = async (payload: VerifyLinkTokenRequest) => {
  const res = await apiClient.post<VerifyLinkTokenResponse>('/auth/link/verify', payload);
  return res.data;
};

export const getLinkStatus = async () => {
  const res = await apiClient.get<LinkStatusResponse>('/api/auth/link/status');
  return res.data;
};

// Device and Watch Data API Calls
export const syncWatchData = async (payload: SyncWatchDataRequest) => {
  const res = await apiClient.post<SyncWatchDataResponse>('/api/device/sync-watch', payload);
  return res.data;
};

export const getDeviceInfo = async (): Promise<DeviceInfo> => {
  const res = await apiClient.get<DeviceInfo>('/api/device/info');
  return res.data;
};

// Password Recovery API Call
export const requestPasswordRecovery = async (payload: PasswordRecoveryRequest): Promise<PasswordRecoveryResponse> => {
  const res = await apiClient.post<PasswordRecoveryResponse>('/auth/recovery', payload);
  return res.data;
};

// Logout API Call
export const logout = async (): Promise<{ message: string }> => {
  const res = await apiClient.post<{ message: string }>('/api/auth/logout');
  return res.data;
}; 