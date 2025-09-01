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

type SimpleDataVisualizationScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SimpleDataVisualization'>;
type SimpleDataVisualizationScreenRouteProp = RouteProp<RootStackParamList, 'SimpleDataVisualization'>;

interface Props {
  navigation: SimpleDataVisualizationScreenNavigationProp;
  route: SimpleDataVisualizationScreenRouteProp;
}

const { width } = Dimensions.get('window');

export default function SimpleDataVisualization({ navigation, route }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('week');
  const [selectedMetric, setSelectedMetric] = useState<'sleep' | 'exercise' | 'stress' | 'screen_time'>('sleep');

  // Mock data for visualization
  const mockData = {
    week: {
      sleep: [7.2, 6.8, 8.1, 7.5, 7.9, 6.5, 7.8],
      exercise: [0.5, 1.2, 0.8, 1.5, 0.3, 1.8, 1.0],
      stress: [4, 6, 3, 5, 7, 2, 4],
      screen_time: [5.2, 4.8, 6.1, 3.9, 5.5, 4.2, 4.8],
      dates: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    },
    month: {
      sleep: [7.2, 6.8, 8.1, 7.5, 7.9, 6.5, 7.8, 7.3, 8.0, 6.9, 7.4, 7.7, 6.8, 7.9, 8.2, 7.1, 6.7, 7.8, 7.5, 8.1, 6.9, 7.3, 7.6, 8.0, 7.2, 6.8, 7.9, 7.4, 8.1, 7.0],
      exercise: [0.5, 1.2, 0.8, 1.5, 0.3, 1.8, 1.0, 0.7, 1.3, 0.9, 1.6, 0.4, 1.1, 0.8, 1.4, 0.6, 1.7, 0.9, 1.2, 0.5, 1.8, 0.7, 1.3, 0.8, 1.5, 0.4, 1.0, 0.9, 1.6, 0.6],
      stress: [4, 6, 3, 5, 7, 2, 4, 5, 3, 6, 4, 7, 3, 5, 2, 6, 4, 3, 5, 7, 2, 4, 6, 3, 5, 7, 4, 3, 6, 5],
      screen_time: [5.2, 4.8, 6.1, 3.9, 5.5, 4.2, 4.8, 5.1, 3.8, 6.2, 4.5, 5.8, 4.1, 3.9, 5.3, 4.7, 6.0, 4.3, 5.6, 3.7, 5.9, 4.4, 5.2, 4.8, 6.1, 3.9, 5.5, 4.2, 4.8, 5.1],
      dates: Array.from({length: 30}, (_, i) => `Day ${i + 1}`)
    }
  };

  const currentData = mockData[selectedPeriod];

  const renderBarChart = (data: number[], title: string, color: string) => {
    const maxValue = Math.max(...data);
    const minValue = Math.min(...data);
    
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>{title}</Text>
        <View style={styles.barContainer}>
          {data.map((value, index) => {
            const height = ((value - minValue) / (maxValue - minValue)) * 150 + 20;
            return (
              <View key={index} style={styles.barItem}>
                <View style={[styles.bar, { height, backgroundColor: color }]} />
                <Text style={styles.barLabel}>{currentData.dates[index]}</Text>
                <Text style={styles.barValue}>{value}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderProgressBar = (value: number, maxValue: number, title: string, color: string) => (
    <View style={styles.progressContainer}>
      <Text style={styles.progressTitle}>{title}</Text>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${(value / maxValue) * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.progressText}>{value} / {maxValue}</Text>
    </View>
  );

  const renderMetricSelector = () => (
    <View style={styles.selectorContainer}>
      <Text style={styles.selectorTitle}>Select Metric:</Text>
      <View style={styles.selectorButtons}>
        {[
          { key: 'sleep', label: 'Sleep', color: '#3b82f6' },
          { key: 'exercise', label: 'Exercise', color: '#10b981' },
          { key: 'stress', label: 'Stress', color: '#f59e0b' },
          { key: 'screen_time', label: 'Screen Time', color: '#ef4444' },
        ].map((metric) => (
          <TouchableOpacity
            key={metric.key}
            style={[
              styles.selectorButton,
              selectedMetric === metric.key && styles.selectorButtonActive,
              { borderColor: metric.color }
            ]}
            onPress={() => setSelectedMetric(metric.key as any)}
          >
            <Text style={[
              styles.selectorButtonText,
              selectedMetric === metric.key && styles.selectorButtonTextActive,
              { color: metric.color }
            ]}>
              {metric.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderPeriodSelector = () => (
    <View style={styles.periodContainer}>
      <Text style={styles.periodTitle}>Time Period:</Text>
      <View style={styles.periodButtons}>
        {[
          { key: 'week', label: 'Week' },
          { key: 'month', label: 'Month' },
        ].map((period) => (
          <TouchableOpacity
            key={period.key}
            style={[
              styles.periodButton,
              selectedPeriod === period.key && styles.periodButtonActive,
            ]}
            onPress={() => setSelectedPeriod(period.key as any)}
          >
            <Text style={[
              styles.periodButtonText,
              selectedPeriod === period.key && styles.periodButtonTextActive,
            ]}>
              {period.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderInsights = () => {
    const data = currentData[selectedMetric];
    const avg = data.reduce((a, b) => a + b, 0) / data.length;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const trend = data[data.length - 1] > data[0] ? 'increasing' : 'decreasing';

    return (
      <View style={styles.insightsContainer}>
        <Text style={styles.insightsTitle}>Insights</Text>
        <View style={styles.insightItem}>
          <Text style={styles.insightLabel}>Average:</Text>
          <Text style={styles.insightValue}>{avg.toFixed(1)}</Text>
        </View>
        <View style={styles.insightItem}>
          <Text style={styles.insightLabel}>Range:</Text>
          <Text style={styles.insightValue}>{min.toFixed(1)} - {max.toFixed(1)}</Text>
        </View>
        <View style={styles.insightItem}>
          <Text style={styles.insightLabel}>Trend:</Text>
          <Text style={[styles.insightValue, { color: trend === 'increasing' ? '#10b981' : '#ef4444' }]}>
            {trend}
          </Text>
        </View>
      </View>
    );
  };

  const renderSelectedChart = () => {
    const data = currentData[selectedMetric];
    const colors = {
      sleep: '#3b82f6',
      exercise: '#10b981',
      stress: '#f59e0b',
      screen_time: '#ef4444',
    };

    return renderBarChart(data, `${selectedMetric.replace('_', ' ').toUpperCase()} Over Time`, colors[selectedMetric]);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Simple Data Visualization</Text>
        <Text style={styles.subtitle}>Track your patterns and trends</Text>
      </View>

      {renderPeriodSelector()}
      {renderMetricSelector()}

      {isLoading ? (
        <ActivityIndicator size="large" color="#3b82f6" style={styles.loader} />
      ) : (
        <>
          {renderSelectedChart()}
          {renderInsights()}

          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Health Score Progress</Text>
            <View style={styles.progressBars}>
              {[0.7, 0.8, 0.6, 0.9, 0.7, 0.8, 0.9].map((value, index) => (
                <View key={index} style={styles.progressItem}>
                  <Text style={styles.progressLabel}>{currentData.dates[index]}</Text>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${value * 100}%`, backgroundColor: '#10b981' }]} />
                  </View>
                  <Text style={styles.progressValue}>{Math.round(value * 100)}%</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Activity Distribution</Text>
            <View style={styles.distributionContainer}>
              {[
                { name: 'Sleep', value: 33, color: '#3b82f6' },
                { name: 'Exercise', value: 8, color: '#10b981' },
                { name: 'Work', value: 33, color: '#f59e0b' },
                { name: 'Leisure', value: 26, color: '#ef4444' },
              ].map((activity, index) => (
                <View key={index} style={styles.distributionItem}>
                  <View style={[styles.distributionColor, { backgroundColor: activity.color }]} />
                  <Text style={styles.distributionName}>{activity.name}</Text>
                  <Text style={styles.distributionValue}>{activity.value}%</Text>
                </View>
              ))}
            </View>
          </View>
        </>
      )}

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.buttonText}>Back to Dashboard</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
  },
  periodContainer: {
    padding: 20,
    backgroundColor: '#ffffff',
    marginBottom: 10,
  },
  periodTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 10,
  },
  periodButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  periodButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  periodButtonText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: '#ffffff',
  },
  selectorContainer: {
    padding: 20,
    backgroundColor: '#ffffff',
    marginBottom: 10,
  },
  selectorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 10,
  },
  selectorButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  selectorButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 2,
    backgroundColor: '#ffffff',
  },
  selectorButtonActive: {
    backgroundColor: '#f1f5f9',
  },
  selectorButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectorButtonTextActive: {
    fontWeight: '600',
  },
  chartContainer: {
    margin: 20,
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 15,
    textAlign: 'center',
  },
  barContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 200,
    paddingHorizontal: 10,
  },
  barItem: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    width: 20,
    borderRadius: 4,
    marginBottom: 8,
  },
  barLabel: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'center',
  },
  barValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
  },
  progressContainer: {
    marginBottom: 15,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  progressText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  progressBars: {
    gap: 10,
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressLabel: {
    fontSize: 12,
    color: '#64748b',
    width: 40,
  },
  progressValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
    width: 30,
    textAlign: 'right',
  },
  distributionContainer: {
    gap: 10,
  },
  distributionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  distributionColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  distributionName: {
    fontSize: 14,
    color: '#1e293b',
    flex: 1,
  },
  distributionValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  insightsContainer: {
    margin: 20,
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  insightsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 15,
  },
  insightItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  insightLabel: {
    fontSize: 16,
    color: '#64748b',
  },
  insightValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  button: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    margin: 20,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  loader: {
    marginTop: 50,
  },
}); 