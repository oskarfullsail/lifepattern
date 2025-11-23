import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation';
import { getUserRoutineLogs, getUserInsights, InsightResponse } from './api/endpoint';
import userManager from './utils/userManager';

type DataVisualizationScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'DataVisualization'>;
type DataVisualizationScreenRouteProp = RouteProp<RootStackParamList, 'DataVisualization'>;

interface Props {
  navigation: DataVisualizationScreenNavigationProp;
  route: DataVisualizationScreenRouteProp;
}

const { width } = Dimensions.get('window');

export default function DataVisualization({ navigation, route }: Props) {
  const { data } = route.params || {};
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('week');
  const [routineLogs, setRoutineLogs] = useState<any[]>([]);
  const [insights, setInsights] = useState<InsightResponse[]>([]);
  const [currentData, setCurrentData] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [selectedPeriod]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const userId = await userManager.getUserId();

      if (!userId) {
        Alert.alert('Error', 'Please log in to view your data');
        navigation.navigate('Home');
        return;
      }

      // Calculate limit based on selected period
      const limitMap = { week: 7, month: 30, year: 365 };
      const limit = limitMap[selectedPeriod];

      // Fetch routine logs and insights
      const [logsResponse, insightsResponse] = await Promise.all([
        getUserRoutineLogs(userId, limit),
        getUserInsights(userId, limit),
      ]);

      setRoutineLogs(logsResponse.logs || []);
      setInsights(insightsResponse.insights || []);

      // Use the most recent log as current data, or the data passed via route params
      if (data) {
        setCurrentData(data);
      } else if (logsResponse.logs && logsResponse.logs.length > 0) {
        setCurrentData(logsResponse.logs[0]);
      } else {
        // No data available
        setCurrentData(null);
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      Alert.alert(
        'Error',
        'Failed to load data. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

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

  const renderInsights = () => {
    if (insights.length === 0) {
      return (
        <View style={styles.insightsContainer}>
          <Text style={styles.insightsTitle}>AI Insights</Text>
          <View style={styles.insightCard}>
            <Text style={styles.insightIcon}>ℹ️</Text>
            <Text style={styles.insightText}>
              No AI insights available yet. Add more data to get personalized recommendations!
            </Text>
          </View>
        </View>
      );
    }

    // Get the most recent insight
    const latestInsight = insights[0];
    const recommendations = latestInsight.ai_report?.recommendations || [];

    return (
      <View style={styles.insightsContainer}>
        <Text style={styles.insightsTitle}>AI Insights</Text>

        {/* Anomaly Detection */}
        {latestInsight.ai_report?.is_anomaly && (
          <View style={[styles.insightCard, styles.anomalyCard]}>
            <Text style={styles.insightIcon}>⚠️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.anomalyTitle}>
                {latestInsight.ai_report.anomaly_type || 'Unusual Pattern Detected'}
              </Text>
              <Text style={styles.insightText}>
                Confidence: {(latestInsight.ai_report.confidence_score * 100).toFixed(0)}%
              </Text>
            </View>
          </View>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 ? (
          recommendations.map((rec: string, index: number) => (
            <View key={index} style={styles.insightCard}>
              <Text style={styles.insightIcon}>💡</Text>
              <Text style={styles.insightText}>{rec}</Text>
            </View>
          ))
        ) : (
          <View style={styles.insightCard}>
            <Text style={styles.insightIcon}>✅</Text>
            <Text style={styles.insightText}>
              Your routine looks healthy! Keep up the good work.
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading your health data...</Text>
      </View>
    );
  }

  if (!currentData) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.noDataTitle}>No Data Available</Text>
        <Text style={styles.noDataText}>
          Start tracking your health by adding your first routine log!
        </Text>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('DataImport', { source: 'manual' })}
        >
          <Text style={styles.actionButtonText}>Add Data Now</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>← Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  noDataTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  secondaryButton: {
    backgroundColor: '#f0f0f0',
    marginTop: 12,
  },
  secondaryButtonText: {
    color: '#333',
  },
  anomalyCard: {
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  anomalyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E65100',
    marginBottom: 4,
  },
}); 