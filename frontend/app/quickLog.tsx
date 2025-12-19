import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation';
import { createRoutineLog, RoutineLogPayload, fetchFeatureFlags } from './api/endpoint';
import userManager from './utils/userManager';
import { makeRequestWithWakeUp } from './utils/backendHealth';

type QuickLogScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'QuickLog'>;
type QuickLogScreenRouteProp = RouteProp<RootStackParamList, 'QuickLog'>;

interface Props {
  navigation: QuickLogScreenNavigationProp;
  route: QuickLogScreenRouteProp;
}

interface AutoFilledData {
  sleep_hours?: number;
  exercise_duration?: number;
  screen_time?: number;
  water_intake?: number;
  wake_up_time?: string;
  bed_time?: string;
  heart_rate?: number;
  steps?: number;
}

export default function QuickLog({ navigation }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading...');
  const [autoFilled, setAutoFilled] = useState<AutoFilledData>({});
  const [isAutoFilling, setIsAutoFilling] = useState(true);

  // Form state
  const [sleepHours, setSleepHours] = useState<string>('');
  const [exerciseDuration, setExerciseDuration] = useState<string>('');
  const [screenTime, setScreenTime] = useState<string>('');
  const [waterIntake, setWaterIntake] = useState<string>('');
  const [stressLevel, setStressLevel] = useState<number>(5);
  const [wakeUpTime, setWakeUpTime] = useState<string>('');
  const [bedTime, setBedTime] = useState<string>('');
  
  // Validation error states
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // ===== INPUT VALIDATION HELPERS =====
  
  // Validate and sanitize decimal number input (for hours/liters)
  const validateDecimalInput = (text: string, fieldName: string, min: number = 0, max: number = 24): string => {
    // Allow empty input
    if (!text) {
      setErrors(prev => ({ ...prev, [fieldName]: '' }));
      return '';
    }
    
    // Only allow numbers and one decimal point
    const sanitized = text.replace(/[^0-9.]/g, '');
    
    // Prevent multiple decimal points
    const parts = sanitized.split('.');
    let cleanValue = parts[0];
    if (parts.length > 1) {
      cleanValue += '.' + parts[1].slice(0, 1); // Only 1 decimal place
    }
    
    // Validate range
    const numValue = parseFloat(cleanValue);
    if (!isNaN(numValue)) {
      if (numValue < min) {
        setErrors(prev => ({ ...prev, [fieldName]: `Minimum is ${min}` }));
      } else if (numValue > max) {
        setErrors(prev => ({ ...prev, [fieldName]: `Maximum is ${max}` }));
      } else {
        setErrors(prev => ({ ...prev, [fieldName]: '' }));
      }
    }
    
    return cleanValue;
  };

  // Validate time format (HH:MM)
  const validateTimeInput = (text: string, fieldName: string): string => {
    // Allow partial input while typing
    const sanitized = text.replace(/[^0-9:]/g, '');
    
    // Auto-add colon after 2 digits
    if (sanitized.length === 2 && !sanitized.includes(':')) {
      return sanitized + ':';
    }
    
    // Limit to HH:MM format
    if (sanitized.length > 5) {
      return sanitized.slice(0, 5);
    }
    
    // Validate complete time
    if (sanitized.length === 5) {
      const [hours, minutes] = sanitized.split(':').map(Number);
      if (hours > 23 || minutes > 59) {
        setErrors(prev => ({ ...prev, [fieldName]: 'Invalid time (use 00:00 - 23:59)' }));
      } else {
        setErrors(prev => ({ ...prev, [fieldName]: '' }));
      }
    }
    
    return sanitized;
  };

  // Wrapper functions for each field
  const handleSleepHoursChange = (text: string) => {
    setSleepHours(validateDecimalInput(text, 'sleepHours', 0, 24));
  };

  const handleExerciseDurationChange = (text: string) => {
    setExerciseDuration(validateDecimalInput(text, 'exerciseDuration', 0, 24));
  };

  const handleScreenTimeChange = (text: string) => {
    setScreenTime(validateDecimalInput(text, 'screenTime', 0, 24));
  };

  const handleWaterIntakeChange = (text: string) => {
    setWaterIntake(validateDecimalInput(text, 'waterIntake', 0, 10));
  };

  const handleWakeUpTimeChange = (text: string) => {
    setWakeUpTime(validateTimeInput(text, 'wakeUpTime'));
  };

  const handleBedTimeChange = (text: string) => {
    setBedTime(validateTimeInput(text, 'bedTime'));
  };

  useEffect(() => {
    autoFillFromHealthData();
  }, []);

  const autoFillFromHealthData = async () => {
    setIsAutoFilling(true);
    try {
      // Try to get health data from device
      const healthSync = require('./services/healthSync').default;
      const screenTimeMonitor = require('./services/screenTimeMonitor').default;

      // Fetch health data
      const healthData = await healthSync.fetchHealthDataForToday();

      // Fetch screen time
      const todayScreenTime = await screenTimeMonitor.getTodayScreenTime();

      const autoData: AutoFilledData = {};

      if (healthData) {
        if (healthData.sleep_hours) {
          autoData.sleep_hours = healthData.sleep_hours;
          setSleepHours(healthData.sleep_hours.toString());
        }
        if (healthData.exercise_duration) {
          autoData.exercise_duration = healthData.exercise_duration;
          setExerciseDuration(healthData.exercise_duration.toString());
        }
        if (healthData.water_intake) {
          autoData.water_intake = healthData.water_intake;
          setWaterIntake(healthData.water_intake.toString());
        }
        if (healthData.wake_up_time) {
          autoData.wake_up_time = healthData.wake_up_time;
          setWakeUpTime(healthData.wake_up_time);
        }
        if (healthData.bed_time) {
          autoData.bed_time = healthData.bed_time;
          setBedTime(healthData.bed_time);
        }
      }

      // Auto-fill screen time
      if (todayScreenTime && todayScreenTime.totalSocialMediaTime > 0) {
        const screenTimeHours = (todayScreenTime.totalSocialMediaTime / 60).toFixed(1);
        autoData.screen_time = parseFloat(screenTimeHours);
        setScreenTime(screenTimeHours);
      }

      setAutoFilled(autoData);

      if (Object.keys(autoData).length > 0) {
        Alert.alert(
          '✨ Auto-Filled',
          `We've pre-filled ${Object.keys(autoData).length} fields from your device health data. Please review and adjust as needed.`,
          [{ text: 'Got it!' }]
        );
      }
    } catch (error) {
      console.log('Could not auto-fill health data:', error);
      // Silent fail - user can still enter manually
    } finally {
      setIsAutoFilling(false);
    }
  };

  const handleSleepPreset = (hours: number) => {
    setSleepHours(hours.toString());
  };

  const handleExercisePreset = (duration: number) => {
    setExerciseDuration(duration.toString());
  };

  const handleStressLevel = (level: number) => {
    setStressLevel(level);
  };

  const handleTimeRange = (sleepStart: string, sleepEnd: string) => {
    setBedTime(sleepStart);
    setWakeUpTime(sleepEnd);

    // Calculate sleep hours
    const [startHour, startMin] = sleepStart.split(':').map(Number);
    const [endHour, endMin] = sleepEnd.split(':').map(Number);

    let sleepMinutes = 0;
    const startMinutes = startHour * 60 + startMin;
    let endMinutes = endHour * 60 + endMin;

    // Handle overnight sleep
    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60; // Add 24 hours
    }

    sleepMinutes = endMinutes - startMinutes;
    const hours = (sleepMinutes / 60).toFixed(1);
    setSleepHours(hours);
  };

  const handleQuickSubmit = async () => {
    // Validate minimum required fields
    if (!sleepHours || !exerciseDuration) {
      Alert.alert(
        'Missing Information',
        'Please provide at least Sleep Hours and Exercise Duration to continue.',
        [{ text: 'OK' }]
      );
      return;
    }

    // ===== VALIDATION =====
    const sleepHoursNum = parseFloat(sleepHours);
    const exerciseDurationNum = parseFloat(exerciseDuration);
    const screenTimeNum = screenTime ? parseFloat(screenTime) : 0;
    const waterIntakeNum = waterIntake ? parseFloat(waterIntake) : 0;
    
    if (isNaN(sleepHoursNum) || sleepHoursNum < 0 || sleepHoursNum > 24) {
      Alert.alert('Validation Error', 'Sleep hours must be between 0 and 24');
      return;
    }
    
    if (isNaN(exerciseDurationNum) || exerciseDurationNum < 0 || exerciseDurationNum > 24) {
      Alert.alert('Validation Error', 'Exercise duration must be between 0 and 24 hours');
      return;
    }
    
    if (stressLevel < 1 || stressLevel > 10) {
      Alert.alert('Validation Error', 'Stress level must be between 1 and 10');
      return;
    }

    setIsLoading(true);
    setLoadingMessage('Submitting data...');

    try {
      const userId = await userManager.getUserId();

      // ===== DATA CONVERSION =====
      // Backend expects:
      // - exercise_duration: INTEGER (minutes)
      // - screen_time: INTEGER (minutes)  
      // - stress_level: INTEGER (1-10)
      // - sleep_hours: DECIMAL (hours)
      // - water_intake: DECIMAL (liters)
      
      const exerciseMinutes = Math.round(exerciseDurationNum * 60);
      const screenTimeMinutes = Math.round(screenTimeNum * 60);
      const sleepHoursValue = Math.round(sleepHoursNum * 10) / 10; // Round to 1 decimal
      const waterIntakeValue = Math.round(waterIntakeNum * 10) / 10; // Round to 1 decimal

      const payload: RoutineLogPayload = {
        user_id: userId,
        sleep_hours: sleepHoursValue,
        exercise_duration: exerciseMinutes, // Backend expects minutes as integer
        screen_time: screenTimeMinutes, // Backend expects minutes as integer
        water_intake: waterIntakeValue,
        stress_level: Math.round(stressLevel), // Ensure integer
        wake_up_time: wakeUpTime || '07:00',
        bed_time: bedTime || '23:00',
        meal_times: ['08:00', '12:00', '18:00'],
        log_date: new Date().toISOString().split('T')[0],
      };

      console.log('📤 Quick log submission:', {
        ...payload,
        _debug: {
          original_exercise_hours: exerciseDurationNum,
          converted_exercise_minutes: exerciseMinutes,
          original_screen_time_hours: screenTimeNum,
          converted_screen_time_minutes: screenTimeMinutes,
        }
      });

      const response = await makeRequestWithWakeUp(
        () => createRoutineLog(payload),
        () => setLoadingMessage('⏰ Waking up backend (30-60 sec)...'),
        (attempt, maxRetries) => setLoadingMessage(`🔄 Connecting (attempt ${attempt}/${maxRetries})...`)
      );

      console.log('✅ Log created:', response);

      // Check if survey prompt is enabled
      const featureFlags = await fetchFeatureFlags();
      const showSurveyPrompt = featureFlags.enable_survey_prompt;

      // Helper function to show survey prompt
      const promptForSurvey = (onDecline: () => void) => {
        if (showSurveyPrompt) {
          Alert.alert(
            'Help Us Improve! 💬',
            'Would you like to take a quick survey to share your feedback?',
            [
              {
                text: 'Not Now',
                style: 'cancel',
                onPress: onDecline,
              },
              {
                text: 'Take Survey',
                onPress: () => navigation.navigate('UsabilitySurvey'),
              },
            ]
          );
        } else {
          onDecline();
        }
      };

      // Navigate to AI Insights if we have AI analysis
      if (response.has_ai && response.ai_result) {
          navigation.navigate('AIInsights', {
            aiResponse: response.ai_result,
            logId: response.log_id,
            userId: userId, // Use the userId we already have
          });
          // Survey prompt will be shown after viewing AI insights (handled in AIInsights screen)
      } else {
        Alert.alert('Success', 'Your health data has been logged!', [
          {
            text: 'View Data',
            onPress: () => {
              promptForSurvey(() => navigation.navigate('DataVisualization', {}));
            },
          },
          { 
            text: 'OK', 
            onPress: () => {
              promptForSurvey(() => navigation.goBack());
            },
          },
        ]);
      }
    } catch (error: any) {
      console.error('❌ Error submitting quick log:', error);
      Alert.alert('Error', 'Failed to save data. Please try again.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('Loading...');
    }
  };

  const renderAutoFillBadge = (field: keyof AutoFilledData) => {
    if (autoFilled[field] !== undefined) {
      return (
        <View style={styles.autoFillBadge}>
          <Text style={styles.autoFillBadgeText}>✨ Auto</Text>
        </View>
      );
    }
    return null;
  };

  if (isAutoFilling) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7c3aed" />
        <Text style={styles.loadingText}>Auto-filling from health data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quick Log</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>⚡</Text>
          <Text style={styles.infoText}>
            Quick log your daily routine! Fields marked with ✨ were auto-filled from your device.
          </Text>
        </View>

        {/* Sleep Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>😴 Sleep</Text>
            {renderAutoFillBadge('sleep_hours')}
          </View>

          <Text style={styles.label}>How many hours did you sleep?</Text>
          <View style={styles.presetButtonRow}>
            {[6, 7, 8, 9].map((hours) => (
              <TouchableOpacity
                key={hours}
                style={[styles.presetButton, sleepHours === hours.toString() && styles.presetButtonActive]}
                onPress={() => handleSleepPreset(hours)}
              >
                <Text
                  style={[
                    styles.presetButtonText,
                    sleepHours === hours.toString() && styles.presetButtonTextActive,
                  ]}
                >
                  {hours}h
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Or enter custom:</Text>
          <TextInput
            style={[styles.input, errors.sleepHours ? styles.inputError : null]}
            placeholder="e.g., 7.5 (0-24 hours)"
            keyboardType="decimal-pad"
            value={sleepHours}
            onChangeText={handleSleepHoursChange}
            maxLength={4}
          />
          {errors.sleepHours ? <Text style={styles.errorText}>{errors.sleepHours}</Text> : null}
          <Text style={styles.inputHint}>Enter hours (e.g., 7.5 = 7h 30min)</Text>

          <Text style={styles.label}>Sleep Time (optional):</Text>
          <View style={styles.timeRangeRow}>
            <View style={styles.timeInput}>
              <Text style={styles.timeLabel}>Bedtime</Text>
              <TextInput
                style={[styles.timeTextInput, errors.bedTime ? styles.inputError : null]}
                placeholder="23:00"
                value={bedTime}
                onChangeText={handleBedTimeChange}
                maxLength={5}
                keyboardType="numbers-and-punctuation"
              />
              {errors.bedTime ? <Text style={styles.errorTextSmall}>{errors.bedTime}</Text> : null}
            </View>
            <Text style={styles.timeArrow}>→</Text>
            <View style={styles.timeInput}>
              <Text style={styles.timeLabel}>Wake up</Text>
              <TextInput
                style={[styles.timeTextInput, errors.wakeUpTime ? styles.inputError : null]}
                placeholder="07:00"
                value={wakeUpTime}
                onChangeText={handleWakeUpTimeChange}
                maxLength={5}
                keyboardType="numbers-and-punctuation"
              />
              {errors.wakeUpTime ? <Text style={styles.errorTextSmall}>{errors.wakeUpTime}</Text> : null}
            </View>
          </View>

          <View style={styles.quickTimesRow}>
            <TouchableOpacity
              style={styles.quickTimeButton}
              onPress={() => handleTimeRange('22:00', '06:00')}
            >
              <Text style={styles.quickTimeButtonText}>Early Bird (22:00-06:00)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickTimeButton}
              onPress={() => handleTimeRange('23:00', '07:00')}
            >
              <Text style={styles.quickTimeButtonText}>Normal (23:00-07:00)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickTimeButton}
              onPress={() => handleTimeRange('00:00', '08:00')}
            >
              <Text style={styles.quickTimeButtonText}>Night Owl (00:00-08:00)</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Exercise Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🏃 Exercise</Text>
            {renderAutoFillBadge('exercise_duration')}
          </View>

          <Text style={styles.label}>How long did you exercise?</Text>
          <View style={styles.presetButtonRow}>
            {[0.25, 0.5, 0.75, 1, 1.5].map((duration) => (
              <TouchableOpacity
                key={duration}
                style={[
                  styles.presetButton,
                  exerciseDuration === duration.toString() && styles.presetButtonActive,
                ]}
                onPress={() => handleExercisePreset(duration)}
              >
                <Text
                  style={[
                    styles.presetButtonText,
                    exerciseDuration === duration.toString() && styles.presetButtonTextActive,
                  ]}
                >
                  {duration >= 1 ? `${duration}h` : `${duration * 60}min`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Or enter custom (hours):</Text>
          <TextInput
            style={[styles.input, errors.exerciseDuration ? styles.inputError : null]}
            placeholder="e.g., 1.5 (0-24 hours)"
            keyboardType="decimal-pad"
            value={exerciseDuration}
            onChangeText={handleExerciseDurationChange}
            maxLength={4}
          />
          {errors.exerciseDuration ? <Text style={styles.errorText}>{errors.exerciseDuration}</Text> : null}
          <Text style={styles.inputHint}>Enter hours (e.g., 0.5 = 30min, 1.5 = 1h 30min)</Text>
        </View>

        {/* Screen Time Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📱 Screen Time</Text>
            {renderAutoFillBadge('screen_time')}
          </View>

          {autoFilled.screen_time !== undefined ? (
            <View style={styles.autoFilledField}>
              <Text style={styles.autoFilledIcon}>✨</Text>
              <Text style={styles.autoFilledText}>
                Auto-detected: <Text style={styles.autoFilledValue}>{screenTime} hours</Text>
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.label}>Screen time (hours):</Text>
              <TextInput
                style={[styles.input, errors.screenTime ? styles.inputError : null]}
                placeholder="e.g., 4.0 (0-24 hours)"
                keyboardType="decimal-pad"
                value={screenTime}
                onChangeText={handleScreenTimeChange}
                maxLength={4}
              />
              {errors.screenTime ? <Text style={styles.errorText}>{errors.screenTime}</Text> : null}
              <Text style={styles.inputHint}>Enter hours of screen time today</Text>
            </>
          )}
        </View>

        {/* Water Intake Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>💧 Water Intake</Text>
            {renderAutoFillBadge('water_intake')}
          </View>

          <Text style={styles.label}>How much water did you drink (liters)?</Text>
          <View style={styles.presetButtonRow}>
            {[1, 1.5, 2, 2.5, 3].map((liters) => (
              <TouchableOpacity
                key={liters}
                style={[
                  styles.presetButton,
                  waterIntake === liters.toString() && styles.presetButtonActive,
                ]}
                onPress={() => setWaterIntake(liters.toString())}
              >
                <Text
                  style={[
                    styles.presetButtonText,
                    waterIntake === liters.toString() && styles.presetButtonTextActive,
                  ]}
                >
                  {liters}L
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Or enter custom:</Text>
          <TextInput
            style={[styles.input, errors.waterIntake ? styles.inputError : null]}
            placeholder="e.g., 2.5 (0-10 liters)"
            keyboardType="decimal-pad"
            value={waterIntake}
            onChangeText={handleWaterIntakeChange}
            maxLength={4}
          />
          {errors.waterIntake ? <Text style={styles.errorText}>{errors.waterIntake}</Text> : null}
          <Text style={styles.inputHint}>Enter liters of water consumed</Text>
        </View>

        {/* Stress Level Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>😰 Stress Level</Text>
          </View>

          <Text style={styles.label}>How stressed do you feel? (1 = Low, 10 = High)</Text>
          <View style={styles.stressLevelRow}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
              <TouchableOpacity
                key={level}
                style={[styles.stressButton, stressLevel === level && styles.stressButtonActive]}
                onPress={() => handleStressLevel(level)}
              >
                <Text
                  style={[styles.stressButtonText, stressLevel === level && styles.stressButtonTextActive]}
                >
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.stressLabelRow}>
            <Text style={styles.stressLabelText}>😌 Low</Text>
            <Text style={styles.stressLabelText}>😰 High</Text>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleQuickSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.submitButtonText}>{loadingMessage}</Text>
            </View>
          ) : (
            <Text style={styles.submitButtonText}>Submit & Get AI Insights</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#64748b',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  placeholder: {
    width: 40,
  },
  content: {
    padding: 20,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  autoFillBadge: {
    backgroundColor: '#f3e8ff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  autoFillBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7c3aed',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 12,
  },
  presetButtonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  presetButton: {
    flex: 1,
    minWidth: 60,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  presetButtonActive: {
    backgroundColor: '#7c3aed',
  },
  presetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  presetButtonTextActive: {
    color: '#fff',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
    marginBottom: 4,
  },
  inputError: {
    borderColor: '#ef4444',
    borderWidth: 2,
    backgroundColor: '#fef2f2',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginBottom: 4,
    marginTop: 2,
  },
  errorTextSmall: {
    fontSize: 10,
    color: '#ef4444',
    marginTop: 2,
  },
  inputHint: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  timeRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  timeInput: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  timeTextInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
    textAlign: 'center',
  },
  timeArrow: {
    fontSize: 20,
    color: '#94a3b8',
  },
  quickTimesRow: {
    gap: 8,
  },
  quickTimeButton: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  quickTimeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78350f',
    textAlign: 'center',
  },
  autoFilledField: {
    flexDirection: 'row',
    backgroundColor: '#f3e8ff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  autoFilledIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  autoFilledText: {
    fontSize: 14,
    color: '#6b21a8',
  },
  autoFilledValue: {
    fontWeight: '700',
    color: '#7c3aed',
  },
  stressLevelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 4,
  },
  stressButton: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 30,
  },
  stressButtonActive: {
    backgroundColor: '#7c3aed',
  },
  stressButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  stressButtonTextActive: {
    color: '#fff',
  },
  stressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stressLabelText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  submitButton: {
    backgroundColor: '#7c3aed',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  cancelButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
});
