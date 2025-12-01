import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScreeningRequest } from '../api/endpoint';

const SCREENING_DATA_KEY = 'pendingScreeningData';
const SCREENING_RESULT_KEY = 'screeningResult';

export interface PendingScreeningData extends ScreeningRequest {
  sessionId: string;
  timestamp: string;
}

// Calculate qualification score based on screening responses
// Note: This is an approximation. The actual score is calculated by the backend.
// We use this for immediate user feedback, but the backend score is authoritative.
export const calculateQualificationScore = (data: ScreeningRequest): { score: number; isQualified: boolean } => {
  let score = 0;

  // Age: 18-45 is ideal (+1 point)
  if (data.age >= 18 && data.age <= 45) score += 1;

  // Smartphone usage: daily users (+1 point)
  if (data.smartphone_usage === 'daily') score += 1;

  // Device type: iPhone or Android (+1 point)
  if (data.device_type === 'iphone' || data.device_type === 'android') score += 1;

  // Habit tracking: active trackers (+1 point)
  if (data.habit_tracking === 'often' || data.habit_tracking === 'always') score += 1;

  // Routine structure: structured users (+1 point)
  if (data.routine_structure === 'very_structured' || data.routine_structure === 'somewhat_structured') score += 1;

  // Tech comfort: comfortable users (+1 point)
  if (data.tech_comfort === 'comfortable' || data.tech_comfort === 'very_comfortable') score += 1;

  // AI feedback openness: open users (+1 point)
  if (data.ai_feedback_openness === 'open' || data.ai_feedback_openness === 'very_open') score += 1;

  // Note: Backend may use different criteria or weights
  // This is a simplified client-side approximation for immediate feedback
  // The backend score (when submitted) is the authoritative score

  // Qualified if score >= 5 (conservative threshold)
  // Backend uses >= 7 but may calculate differently
  const isQualified = score >= 5;

  return { score, isQualified };
};

export interface ScreeningResult {
  isQualified: boolean;
  qualificationScore: number;
  timestamp: string;
}

// Save screening responses before user registers
export const savePendingScreeningData = async (data: ScreeningRequest): Promise<void> => {
  try {
    const sessionId = `screening_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const pendingData: PendingScreeningData = {
      ...data,
      sessionId,
      timestamp: new Date().toISOString(),
    };
    await AsyncStorage.setItem(SCREENING_DATA_KEY, JSON.stringify(pendingData));
    console.log('✅ Screening data saved to storage:', sessionId);
  } catch (error) {
    console.error('❌ Error saving screening data:', error);
    throw error;
  }
};

// Get pending screening data
export const getPendingScreeningData = async (): Promise<PendingScreeningData | null> => {
  try {
    const data = await AsyncStorage.getItem(SCREENING_DATA_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error('❌ Error getting screening data:', error);
    return null;
  }
};

// Save screening result (qualification status)
export const saveScreeningResult = async (result: ScreeningResult): Promise<void> => {
  try {
    await AsyncStorage.setItem(SCREENING_RESULT_KEY, JSON.stringify(result));
    console.log('✅ Screening result saved:', result);
  } catch (error) {
    console.error('❌ Error saving screening result:', error);
    throw error;
  }
};

// Get screening result
export const getScreeningResult = async (): Promise<ScreeningResult | null> => {
  try {
    const data = await AsyncStorage.getItem(SCREENING_RESULT_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error('❌ Error getting screening result:', error);
    return null;
  }
};

// Clear pending screening data (after successful registration)
export const clearPendingScreeningData = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(SCREENING_DATA_KEY);
    await AsyncStorage.removeItem(SCREENING_RESULT_KEY);
    console.log('✅ Pending screening data cleared');
  } catch (error) {
    console.error('❌ Error clearing screening data:', error);
  }
};

// Check if there's pending screening data
export const hasPendingScreeningData = async (): Promise<boolean> => {
  try {
    const data = await getPendingScreeningData();
    return data !== null;
  } catch (error) {
    console.error('❌ Error checking for pending screening data:', error);
    return false;
  }
};
