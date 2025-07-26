import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
} from "react-native";
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { 
  createRoutineLog, 
  getUserRoutineLogs, 
  getInsight, 
  getUserInsights,
  type RoutineLogPayload,
  type CreateRoutineLogResponse,
  type InsightResponse
} from './api/endpoint';
import userManager, { UserSession } from './utils/userManager';

type DashboardScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;

interface Props {
  navigation: DashboardScreenNavigationProp;
}

export default function Dashboard({ navigation }: Props) {
  // Form state
  const [sleepHours, setSleepHours] = useState("");
  const [mealCount, setMealCount] = useState("3");
  const [screenTime, setScreenTime] = useState("");
  const [exerciseMinutes, setExerciseMinutes] = useState("");
  const [wakeUpTime, setWakeUpTime] = useState("");
  const [bedTime, setBedTime] = useState("");
  const [waterIntake, setWaterIntake] = useState("");
  const [stressLevel, setStressLevel] = useState("5");
  const [moodTag, setMoodTag] = useState("");

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  // Data state
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [latestInsight, setLatestInsight] = useState<CreateRoutineLogResponse['ai_result'] | null>(null);
  const [recentLogs, setRecentLogs] = useState<RoutineLogPayload[]>([]);

  const moodTags = [
    { label: "😊 Productive", value: "productive" },
    { label: "😰 Stressed", value: "stressed" },
    { label: "😌 Relaxed", value: "relaxed" },
    { label: "😴 Tired", value: "tired" },
    { label: "💪 Energetic", value: "energetic" },
  ];

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setIsLoading(true);
      
      // Initialize user session
      const session = await userManager.initializeUser();
      setUserSession(session);
      
      // User is already authenticated from login screen
      
      // Load recent logs
      await loadRecentLogs(session.userId);
      
    } catch (error) {
      console.error('Error initializing app:', error);
      Alert.alert('Error', 'Failed to initialize app. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecentLogs = async (userId: string) => {
    try {
      const data = await getUserRoutineLogs(userId, 5);
      setRecentLogs(data.logs);
    } catch (error) {
      console.error('Error loading recent logs:', error);
      // Don't show error to user, just log it
    }
  };

  const validateForm = () => {
    if (!sleepHours || !screenTime || !exerciseMinutes || !wakeUpTime || !bedTime || !waterIntake) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return false;
    }

    const sleep = parseFloat(sleepHours);
    const screen = parseFloat(screenTime);
    const exercise = parseFloat(exerciseMinutes);
    const water = parseFloat(waterIntake);
    const stress = parseInt(stressLevel);

    if (sleep < 0 || sleep > 24) {
      Alert.alert('Invalid Input', 'Sleep hours must be between 0 and 24.');
      return false;
    }

    if (screen < 0 || screen > 24) {
      Alert.alert('Invalid Input', 'Screen time must be between 0 and 24 hours.');
      return false;
    }

    if (exercise < 0 || exercise > 120) {
      Alert.alert('Invalid Input', 'Exercise minutes must be between 0 and 120.');
      return false;
    }

    if (water < 0 || water > 10) {
      Alert.alert('Invalid Input', 'Water intake must be between 0 and 10 liters.');
      return false;
    }

    if (stress < 1 || stress > 10) {
      Alert.alert('Invalid Input', 'Stress level must be between 1 and 10.');
      return false;
    }

    return true;
  };

  const generateMealTimes = (count: number) => {
    const times = [];
    const baseTime = 7; // 7 AM
    const interval = 5; // 5 hours between meals
    
    for (let i = 0; i < count; i++) {
      const hour = (baseTime + i * interval) % 24;
      const timeString = `${hour.toString().padStart(2, '0')}:${i === 0 ? '00' : '30'}`;
      times.push(timeString);
    }
    
    return times;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !userSession) return;

    setIsSubmitting(true);

    const routineLog: RoutineLogPayload = {
      user_id: userSession.userId,
      sleep_hours: parseFloat(sleepHours),
      meal_times: generateMealTimes(parseInt(mealCount)),
      screen_time: parseFloat(screenTime),
      exercise_duration: parseFloat(exerciseMinutes) / 60, // Convert to hours
      wake_up_time: wakeUpTime,
      bed_time: bedTime,
      water_intake: parseFloat(waterIntake),
      stress_level: parseInt(stressLevel),
      log_date: new Date().toISOString().split('T')[0],
    };

    try {
      const result = await createRoutineLog(routineLog);
      
      if (result.has_ai && result.ai_result) {
        setLatestInsight(result.ai_result);
        setShowInsights(true);
      }

      Alert.alert("✅ Success!", "Your routine has been logged and analyzed!");
      
      // Reset form
      setSleepHours("");
      setMealCount("3");
      setScreenTime("");
      setExerciseMinutes("");
      setWakeUpTime("");
      setBedTime("");
      setWaterIntake("");
      setStressLevel("5");
      setMoodTag("");

      // Reload recent logs
      await loadRecentLogs(userSession.userId);
    } catch (error) {
      console.error("Error submitting routine:", error);
      
      // Save locally if offline
      const existing = await AsyncStorage.getItem("routineQueue");
      const queue = existing ? JSON.parse(existing) : [];
      queue.push(routineLog);
      await AsyncStorage.setItem("routineQueue", JSON.stringify(queue));
      
      Alert.alert("📦 Saved Locally", "Your routine has been saved locally and will sync when online.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await userManager.clearSession();
      navigation.replace('Home');
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout');
    }
  };



  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}!</Text>
          <Text style={styles.username}>{userSession?.username || 'User'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{recentLogs.length}</Text>
          <Text style={styles.statLabel}>Days Tracked</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {recentLogs.filter(log => log.sleep_hours >= 7).length}
          </Text>
          <Text style={styles.statLabel}>Good Sleep Days</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {recentLogs.filter(log => log.exercise_duration > 0).length}
          </Text>
          <Text style={styles.statLabel}>Active Days</Text>
        </View>
      </View>

      {/* Routine Logging Form */}
      <View style={styles.formContainer}>
        <Text style={styles.sectionTitle}>📋 Today's Routine Check-In</Text>
        
        {/* Sleep Hours */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>😴 Sleep Hours (4.5-10)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 7.5"
            value={sleepHours}
            onChangeText={setSleepHours}
            keyboardType="numeric"
            editable={!isSubmitting}
          />
        </View>

        {/* Meal Count */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>🍽️ Number of Meals (0-5)</Text>
          <View style={styles.stepperContainer}>
            <TouchableOpacity 
              style={styles.stepperButton}
              onPress={() => setMealCount(Math.max(0, parseInt(mealCount) - 1).toString())}
              disabled={isSubmitting}
            >
              <Text style={styles.stepperText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{mealCount}</Text>
            <TouchableOpacity 
              style={styles.stepperButton}
              onPress={() => setMealCount(Math.min(5, parseInt(mealCount) + 1).toString())}
              disabled={isSubmitting}
            >
              <Text style={styles.stepperText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Screen Time */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>📱 Screen Time Hours (0-12)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 4.5"
            value={screenTime}
            onChangeText={setScreenTime}
            keyboardType="numeric"
            editable={!isSubmitting}
          />
        </View>

        {/* Exercise */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>💪 Exercise Minutes (0-120)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 30"
            value={exerciseMinutes}
            onChangeText={setExerciseMinutes}
            keyboardType="numeric"
            editable={!isSubmitting}
          />
        </View>

        {/* Wake Up Time */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>🌅 Wake Up Time</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 07:00"
            value={wakeUpTime}
            onChangeText={setWakeUpTime}
            editable={!isSubmitting}
          />
        </View>

        {/* Bed Time */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>🌙 Bed Time</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 23:00"
            value={bedTime}
            onChangeText={setBedTime}
            editable={!isSubmitting}
          />
        </View>

        {/* Water Intake */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>💧 Water Intake (Liters)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 2.5"
            value={waterIntake}
            onChangeText={setWaterIntake}
            keyboardType="numeric"
            editable={!isSubmitting}
          />
        </View>

        {/* Stress Level */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>😰 Stress Level (1-10)</Text>
          <View style={styles.stressSlider}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.stressButton,
                  parseInt(stressLevel) === level && styles.stressButtonActive
                ]}
                onPress={() => setStressLevel(level.toString())}
                disabled={isSubmitting}
              >
                <Text style={[
                  styles.stressButtonText,
                  parseInt(stressLevel) === level && styles.stressButtonTextActive
                ]}>
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Mood Tags */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>😊 Mood Today (Optional)</Text>
          <View style={styles.moodContainer}>
            {moodTags.map((tag) => (
              <TouchableOpacity
                key={tag.value}
                style={[
                  styles.moodButton,
                  moodTag === tag.value && styles.moodButtonActive
                ]}
                onPress={() => setMoodTag(moodTag === tag.value ? "" : tag.value)}
                disabled={isSubmitting}
              >
                <Text style={[
                  styles.moodButtonText,
                  moodTag === tag.value && styles.moodButtonTextActive
                ]}>
                  {tag.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Routine</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Action Cards */}
      <View style={styles.actionCards}>
        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => setShowInsights(true)}
        >
          <Text style={styles.actionCardTitle}>📊 View Insights</Text>
          <Text style={styles.actionCardText}>See your AI-powered analysis and trends</Text>
        </TouchableOpacity>
      </View>

      {/* AI Insights Modal */}
      <Modal
        visible={showInsights}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowInsights(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🤖 AI Analysis</Text>
              <TouchableOpacity onPress={() => setShowInsights(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {latestInsight ? (
              <View style={styles.insightContent}>
                <View style={styles.insightCard}>
                  <Text style={styles.insightTitle}>
                    {latestInsight.is_anomaly ? '⚠️ Anomaly Detected' : '✅ Normal Routine'}
                  </Text>
                  <Text style={styles.insightText}>
                    Confidence: {(latestInsight.confidence_score * 100).toFixed(1)}%
                  </Text>
                  <Text style={styles.insightText}>
                    Type: {latestInsight.anomaly_type.replace(/_/g, ' ')}
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={styles.noInsightText}>No insights available</Text>
            )}
          </View>
        </View>
      </Modal>


    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  greeting: {
    fontSize: 18,
    color: '#666',
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    color: '#e74c3c',
    fontSize: 16,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  formContainer: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#2c3e50',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  stepperButton: {
    padding: 16,
    backgroundColor: '#4A90E2',
  },
  stepperText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  stepperValue: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  stressSlider: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stressButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stressButtonActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  stressButtonText: {
    fontSize: 14,
    color: '#666',
  },
  stressButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  moodContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  moodButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  moodButtonActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  moodButtonText: {
    fontSize: 14,
    color: '#666',
  },
  moodButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  disabledButton: {
    backgroundColor: '#bdc3c7',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  csvButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  csvButtonText: {
    color: '#666',
    fontSize: 16,
  },
  actionCards: {
    padding: 20,
    gap: 12,
  },
  actionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  actionCardText: {
    fontSize: 14,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  closeButton: {
    fontSize: 24,
    color: '#666',
    padding: 4,
  },
  insightContent: {
    padding: 20,
  },
  insightCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  insightTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#2c3e50',
  },
  insightText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  anomalyCard: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeaa7',
  },
  normalCard: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
  },
  insightStatus: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  confidenceText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  anomalyType: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  recommendationsContainer: {
    marginTop: 16,
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 20,
  },
  noInsightText: {
    padding: 20,
    textAlign: 'center',
    color: '#666',
  },
  settingsContent: {
    padding: 20,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },
  settingValue: {
    fontSize: 16,
    color: '#666',
  },

}); 