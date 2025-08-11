import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation';

type DataVisualizationScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'DataVisualization'>;
type DataVisualizationScreenRouteProp = RouteProp<RootStackParamList, 'DataVisualization'>;

interface Props {
  navigation: DataVisualizationScreenNavigationProp;
  route: DataVisualizationScreenRouteProp;
}

const { width } = Dimensions.get('window');

export default function DataVisualization({ navigation, route }: Props) {
  const { data } = route.params || {};
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('week');

  // Mock data for visualization
  const mockData = {
    sleep_hours: 7.5,
    meal_times: ['08:00', '12:30', '19:00'],
    screen_time: 4.2,
    exercise_duration: 1.5,
    wake_up_time: '07:00',
    bed_time: '23:00',
    water_intake: 2.5,
    stress_level: 3,
    log_date: new Date().toISOString().split('T')[0]
  };

  const currentData = data || mockData;

  const renderSleepChart = () => (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Sleep Pattern</Text>
      <View style={styles.sleepBar}>
        <View style={[styles.sleepFill, { width: `${(currentData.sleep_hours / 8) * 100}%` }]} />
      </View>
      <Text style={styles.chartValue}>{currentData.sleep_hours}h / 8h recommended</Text>
    </View>
  );

  const renderExerciseChart = () => (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Exercise Duration</Text>
      <View style={styles.exerciseBar}>
        <View style={[styles.exerciseFill, { width: `${(currentData.exercise_duration / 2) * 100}%` }]} />
      </View>
      <Text style={styles.chartValue}>{currentData.exercise_duration}h / 2h recommended</Text>
    </View>
  );

  const renderWaterIntakeChart = () => (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Water Intake</Text>
      <View style={styles.waterBar}>
        <View style={[styles.waterFill, { width: `${(currentData.water_intake / 3) * 100}%` }]} />
      </View>
      <Text style={styles.chartValue}>{currentData.water_intake}L / 3L recommended</Text>
    </View>
  );

  const renderStressLevelChart = () => (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Stress Level</Text>
      <View style={styles.stressBar}>
        <View style={[styles.stressFill, { width: `${(currentData.stress_level / 10) * 100}%` }]} />
      </View>
      <Text style={styles.chartValue}>{currentData.stress_level}/10 (Lower is better)</Text>
    </View>
  );

  const renderScreenTimeChart = () => (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Screen Time</Text>
      <View style={styles.screenBar}>
        <View style={[styles.screenFill, { width: `${(currentData.screen_time / 6) * 100}%` }]} />
      </View>
      <Text style={styles.chartValue}>{currentData.screen_time}h / 6h limit</Text>
    </View>
  );

  const renderMealTimes = () => (
    <View style={styles.mealContainer}>
      <Text style={styles.mealTitle}>Meal Schedule</Text>
      <View style={styles.mealTimes}>
        <View style={styles.mealItem}>
          <Text style={styles.mealLabel}>Breakfast</Text>
          <Text style={styles.mealTime}>{currentData.meal_times[0]}</Text>
        </View>
        <View style={styles.mealItem}>
          <Text style={styles.mealLabel}>Lunch</Text>
          <Text style={styles.mealTime}>{currentData.meal_times[1]}</Text>
        </View>
        <View style={styles.mealItem}>
          <Text style={styles.mealLabel}>Dinner</Text>
          <Text style={styles.mealTime}>{currentData.meal_times[2]}</Text>
        </View>
      </View>
    </View>
  );

  const renderSleepSchedule = () => (
    <View style={styles.sleepScheduleContainer}>
      <Text style={styles.sleepScheduleTitle}>Sleep Schedule</Text>
      <View style={styles.sleepSchedule}>
        <View style={styles.sleepItem}>
          <Text style={styles.sleepLabel}>Wake Up</Text>
          <Text style={styles.sleepTime}>{currentData.wake_up_time}</Text>
        </View>
        <View style={styles.sleepItem}>
          <Text style={styles.sleepLabel}>Bed Time</Text>
          <Text style={styles.sleepTime}>{currentData.bed_time}</Text>
        </View>
      </View>
    </View>
  );

  const renderInsights = () => (
    <View style={styles.insightsContainer}>
      <Text style={styles.insightsTitle}>AI Insights</Text>
      
      <View style={styles.insightCard}>
        <Text style={styles.insightIcon}>💡</Text>
        <Text style={styles.insightText}>
          Your sleep pattern is good! You're getting close to the recommended 8 hours.
        </Text>
      </View>
      
      <View style={styles.insightCard}>
        <Text style={styles.insightIcon}>🏃‍♂️</Text>
        <Text style={styles.insightText}>
          Try to increase exercise duration to 2 hours for better health outcomes.
        </Text>
      </View>
      
      <View style={styles.insightCard}>
        <Text style={styles.insightIcon}>💧</Text>
        <Text style={styles.insightText}>
          You're drinking enough water. Keep up the good hydration!
        </Text>
      </View>
      
      <View style={styles.insightCard}>
        <Text style={styles.insightIcon}>📱</Text>
        <Text style={styles.insightText}>
          Screen time is within healthy limits. Consider taking more breaks.
        </Text>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Health Data</Text>
        <Text style={styles.subtitle}>
          Your health patterns and insights
        </Text>
        
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          <TouchableOpacity 
            style={[styles.periodButton, selectedPeriod === 'week' && styles.periodActive]}
            onPress={() => setSelectedPeriod('week')}
          >
            <Text style={[styles.periodText, selectedPeriod === 'week' && styles.periodTextActive]}>
              Week
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.periodButton, selectedPeriod === 'month' && styles.periodActive]}
            onPress={() => setSelectedPeriod('month')}
          >
            <Text style={[styles.periodText, selectedPeriod === 'month' && styles.periodTextActive]}>
              Month
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.periodButton, selectedPeriod === 'year' && styles.periodActive]}
            onPress={() => setSelectedPeriod('year')}
          >
            <Text style={[styles.periodText, selectedPeriod === 'year' && styles.periodTextActive]}>
              Year
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Charts */}
      <View style={styles.chartsContainer}>
        {renderSleepChart()}
        {renderExerciseChart()}
        {renderWaterIntakeChart()}
        {renderStressLevelChart()}
        {renderScreenTimeChart()}
      </View>

      {/* Meal Times */}
      {renderMealTimes()}

      {/* Sleep Schedule */}
      {renderSleepSchedule()}

      {/* AI Insights */}
      {renderInsights()}

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('DataImport', { source: 'manual' })}
        >
          <Text style={styles.actionButtonText}>Add New Data</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.actionButtonText}>← Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  periodActive: {
    backgroundColor: '#007AFF',
  },
  periodText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  periodTextActive: {
    color: '#fff',
  },
  chartsContainer: {
    padding: 20,
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  sleepBar: {
    height: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 8,
  },
  sleepFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 10,
  },
  exerciseBar: {
    height: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 8,
  },
  exerciseFill: {
    height: '100%',
    backgroundColor: '#2196F3',
    borderRadius: 10,
  },
  waterBar: {
    height: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 8,
  },
  waterFill: {
    height: '100%',
    backgroundColor: '#00BCD4',
    borderRadius: 10,
  },
  stressBar: {
    height: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 8,
  },
  stressFill: {
    height: '100%',
    backgroundColor: '#FF9800',
    borderRadius: 10,
  },
  screenBar: {
    height: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 8,
  },
  screenFill: {
    height: '100%',
    backgroundColor: '#9C27B0',
    borderRadius: 10,
  },
  chartValue: {
    fontSize: 14,
    color: '#666',
  },
  mealContainer: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mealTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  mealTimes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mealItem: {
    alignItems: 'center',
    flex: 1,
  },
  mealLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  mealTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  sleepScheduleContainer: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sleepScheduleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  sleepSchedule: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sleepItem: {
    alignItems: 'center',
    flex: 1,
  },
  sleepLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  sleepTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  insightsContainer: {
    padding: 20,
  },
  insightsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  insightCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  insightIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  actionsContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  actionButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 