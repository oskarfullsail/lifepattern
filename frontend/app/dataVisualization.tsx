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
import Svg, { Circle, Path, G, Text as SvgText, Line, Polyline } from 'react-native-svg';
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

  // Circular Progress Ring Component
  const CircularProgress = ({
    value,
    maxValue,
    color,
    label,
    unit,
    size = 100
  }: {
    value: number;
    maxValue: number;
    color: string;
    label: string;
    unit: string;
    size?: number;
  }) => {
    const percentage = Math.min((value / maxValue) * 100, 100);
    const radius = 35;
    const strokeWidth = 8;
    const center = size / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <View style={styles.circularProgressContainer}>
        <Svg width={size} height={size}>
          {/* Background Circle */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="#f0f0f0"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress Circle */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${center}, ${center}`}
          />
          {/* Center Text */}
          <SvgText
            x={center}
            y={center - 5}
            textAnchor="middle"
            fontSize="18"
            fontWeight="bold"
            fill="#333"
          >
            {value}
          </SvgText>
          <SvgText
            x={center}
            y={center + 12}
            textAnchor="middle"
            fontSize="12"
            fill="#666"
          >
            {unit}
          </SvgText>
        </Svg>
        <Text style={styles.circularLabel}>{label}</Text>
        <Text style={styles.circularTarget}>
          Target: {maxValue}{unit}
        </Text>
      </View>
    );
  };

  // Line Chart Component for Trends
  const TrendLineChart = ({
    data,
    label,
    color,
    unit
  }: {
    data: number[];
    label: string;
    color: string;
    unit: string;
  }) => {
    if (data.length === 0) return null;

    const chartWidth = width - 80;
    const chartHeight = 120;
    const maxValue = Math.max(...data, 1);
    const minValue = Math.min(...data, 0);
    const range = maxValue - minValue || 1;

    // Generate points for the line
    const points = data.map((value, index) => {
      const x = 40 + (index / (data.length - 1 || 1)) * chartWidth;
      const y = chartHeight - 20 - ((value - minValue) / range) * (chartHeight - 40);
      return `${x},${y}`;
    }).join(' ');

    return (
      <View style={styles.trendChartContainer}>
        <Text style={styles.trendChartTitle}>{label}</Text>
        <Svg width={width - 40} height={chartHeight + 20}>
          {/* Grid lines */}
          <Line x1="40" y1="20" x2={chartWidth + 40} y2="20" stroke="#e0e0e0" strokeWidth="1" />
          <Line x1="40" y1={chartHeight / 2} x2={chartWidth + 40} y2={chartHeight / 2} stroke="#e0e0e0" strokeWidth="1" />
          <Line x1="40" y1={chartHeight} x2={chartWidth + 40} y2={chartHeight} stroke="#e0e0e0" strokeWidth="1" />

          {/* Y-axis labels */}
          <SvgText x="5" y="25" fontSize="10" fill="#999">{maxValue.toFixed(1)}</SvgText>
          <SvgText x="5" y={chartHeight / 2 + 5} fontSize="10" fill="#999">{((maxValue + minValue) / 2).toFixed(1)}</SvgText>
          <SvgText x="5" y={chartHeight + 5} fontSize="10" fill="#999">{minValue.toFixed(1)}</SvgText>

          {/* Line */}
          <Polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {data.map((value, index) => {
            const x = 40 + (index / (data.length - 1 || 1)) * chartWidth;
            const y = chartHeight - 20 - ((value - minValue) / range) * (chartHeight - 40);
            return (
              <Circle
                key={index}
                cx={x}
                cy={y}
                r="4"
                fill={color}
              />
            );
          })}
        </Svg>
        <Text style={styles.trendChartUnit}>Average: {(data.reduce((a, b) => a + b, 0) / data.length).toFixed(1)} {unit}</Text>
      </View>
    );
  };

  const renderSleepChart = () => (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Sleep Pattern</Text>
      <View style={styles.metricsRow}>
        <CircularProgress
          value={currentData.sleep_hours}
          maxValue={8}
          color="#4CAF50"
          label="Sleep"
          unit="h"
        />
        {routineLogs.length > 1 && (
          <View style={{ flex: 1, marginLeft: 20 }}>
            <TrendLineChart
              data={routineLogs.slice(0, selectedPeriod === 'week' ? 7 : selectedPeriod === 'month' ? 30 : 365).map((log: any) => log.sleep_hours || 0).reverse()}
              label="7-Day Trend"
              color="#4CAF50"
              unit="h"
            />
          </View>
        )}
      </View>
    </View>
  );

  const renderExerciseChart = () => (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Exercise Duration</Text>
      <View style={styles.metricsRow}>
        <CircularProgress
          value={currentData.exercise_duration}
          maxValue={120}
          color="#2196F3"
          label="Exercise"
          unit="min"
        />
        {routineLogs.length > 1 && (
          <View style={{ flex: 1, marginLeft: 20 }}>
            <TrendLineChart
              data={routineLogs.slice(0, selectedPeriod === 'week' ? 7 : selectedPeriod === 'month' ? 30 : 365).map((log: any) => log.exercise_duration || 0).reverse()}
              label="Activity Trend"
              color="#2196F3"
              unit="min"
            />
          </View>
        )}
      </View>
    </View>
  );

  const renderWaterIntakeChart = () => (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Water Intake</Text>
      <View style={styles.metricsRow}>
        <CircularProgress
          value={currentData.water_intake}
          maxValue={3}
          color="#00BCD4"
          label="Hydration"
          unit="L"
        />
        {routineLogs.length > 1 && (
          <View style={{ flex: 1, marginLeft: 20 }}>
            <TrendLineChart
              data={routineLogs.slice(0, selectedPeriod === 'week' ? 7 : selectedPeriod === 'month' ? 30 : 365).map((log: any) => log.water_intake || 0).reverse()}
              label="Hydration Trend"
              color="#00BCD4"
              unit="L"
            />
          </View>
        )}
      </View>
    </View>
  );

  const renderStressLevelChart = () => (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Stress Level</Text>
      <View style={styles.metricsRow}>
        <CircularProgress
          value={currentData.stress_level}
          maxValue={10}
          color="#FF9800"
          label="Stress"
          unit="/10"
        />
        {routineLogs.length > 1 && (
          <View style={{ flex: 1, marginLeft: 20 }}>
            <TrendLineChart
              data={routineLogs.slice(0, selectedPeriod === 'week' ? 7 : selectedPeriod === 'month' ? 30 : 365).map((log: any) => log.stress_level || 0).reverse()}
              label="Stress Trend"
              color="#FF9800"
              unit="/10"
            />
          </View>
        )}
      </View>
      <Text style={styles.chartNote}>Lower is better</Text>
    </View>
  );

  const renderScreenTimeChart = () => (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Screen Time</Text>
      <View style={styles.metricsRow}>
        <CircularProgress
          value={currentData.screen_time}
          maxValue={6}
          color="#9C27B0"
          label="Screen"
          unit="h"
        />
        {routineLogs.length > 1 && (
          <View style={{ flex: 1, marginLeft: 20 }}>
            <TrendLineChart
              data={routineLogs.slice(0, selectedPeriod === 'week' ? 7 : selectedPeriod === 'month' ? 30 : 365).map((log: any) => log.screen_time || 0).reverse()}
              label="Usage Trend"
              color="#9C27B0"
              unit="h"
            />
          </View>
        )}
      </View>
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
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  circularProgressContainer: {
    alignItems: 'center',
    minWidth: 120,
  },
  circularLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
  },
  circularTarget: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  trendChartContainer: {
    flex: 1,
  },
  trendChartTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  trendChartUnit: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  chartNote: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
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