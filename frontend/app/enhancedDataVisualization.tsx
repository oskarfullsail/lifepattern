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
import { LineChart, BarChart, PieChart, ProgressChart } from 'react-native-chart-kit';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation';

type EnhancedDataVisualizationScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'EnhancedDataVisualization'>;
type EnhancedDataVisualizationScreenRouteProp = RouteProp<RootStackParamList, 'EnhancedDataVisualization'>;

interface Props {
  navigation: EnhancedDataVisualizationScreenNavigationProp;
  route: EnhancedDataVisualizationScreenRouteProp;
}

const { width } = Dimensions.get('window');

export default function EnhancedDataVisualization({ navigation, route }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('week');
  const [selectedMetric, setSelectedMetric] = useState<'sleep' | 'exercise' | 'stress' | 'screen_time'>('sleep');

  // Enhanced mock data with historical trends
  const mockHistoricalData = {
    week: {
      sleep: [7.2, 6.8, 8.1, 7.5, 7.9, 6.5, 7.8],
      exercise: [0.5, 1.2, 0.8, 1.5, 0.3, 1.8, 1.0],
      stress: [4, 6, 3, 5, 7, 2, 4],
      screen_time: [5.2, 4.8, 6.1, 3.9, 5.5, 4.2, 4.8],
      water_intake: [2.1, 2.5, 1.8, 2.8, 2.2, 2.6, 2.3],
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

  const currentData = mockHistoricalData[selectedPeriod];

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#3b82f6',
    },
  };

  const renderLineChart = (data: number[], title: string, color: string) => (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{title}</Text>
      <LineChart
        data={{
          labels: currentData.dates.slice(0, data.length),
          datasets: [
            {
              data: data,
              color: (opacity = 1) => color,
              strokeWidth: 2,
            },
          ],
        }}
        width={width - 40}
        height={220}
        chartConfig={{
          ...chartConfig,
          color: (opacity = 1) => color,
        }}
        bezier
        style={styles.chart}
      />
    </View>
  );

  const renderBarChart = (data: number[], title: string, color: string) => (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{title}</Text>
      <BarChart
        data={{
          labels: currentData.dates.slice(0, data.length),
          datasets: [
            {
              data: data,
            },
          ],
        }}
        width={width - 40}
        height={220}
        chartConfig={{
          ...chartConfig,
          color: (opacity = 1) => color,
        }}
        style={styles.chart}
        fromZero
      />
    </View>
  );

  const renderProgressChart = (data: number[], title: string, labels: string[]) => (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{title}</Text>
      <ProgressChart
        data={{
          data: data,
          labels: labels,
        }}
        width={width - 40}
        height={220}
        chartConfig={{
          ...chartConfig,
          color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
        }}
        style={styles.chart}
        strokeWidth={16}
        radius={32}
      />
    </View>
  );

  const renderPieChart = (data: number[], title: string, labels: string[]) => (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{title}</Text>
      <PieChart
        data={data.map((value, index) => ({
          name: labels[index],
          population: value,
          color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5],
          legendFontColor: '#7F7F7F',
          legendFontSize: 12,
        }))}
        width={width - 40}
        height={220}
        chartConfig={chartConfig}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="15"
        absolute
      />
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

    switch (selectedMetric) {
      case 'sleep':
        return renderLineChart(data, 'Sleep Hours Over Time', colors.sleep);
      case 'exercise':
        return renderBarChart(data, 'Exercise Duration (Hours)', colors.exercise);
      case 'stress':
        return renderLineChart(data, 'Stress Level (1-10)', colors.stress);
      case 'screen_time':
        return renderBarChart(data, 'Screen Time (Hours)', colors.screen_time);
      default:
        return null;
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Enhanced Data Visualization</Text>
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
            <ProgressChart
              data={{
                data: [0.7, 0.8, 0.6, 0.9, 0.7, 0.8, 0.9],
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
              }}
              width={width - 40}
              height={220}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
              }}
              style={styles.chart}
              strokeWidth={16}
              radius={32}
            />
          </View>

          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Activity Distribution</Text>
            <PieChart
              data={[
                {
                  name: 'Sleep',
                  population: 33,
                  color: '#3b82f6',
                  legendFontColor: '#7F7F7F',
                  legendFontSize: 12,
                },
                {
                  name: 'Exercise',
                  population: 8,
                  color: '#10b981',
                  legendFontColor: '#7F7F7F',
                  legendFontSize: 12,
                },
                {
                  name: 'Work',
                  population: 33,
                  color: '#f59e0b',
                  legendFontColor: '#7F7F7F',
                  legendFontSize: 12,
                },
                {
                  name: 'Leisure',
                  population: 26,
                  color: '#ef4444',
                  legendFontColor: '#7F7F7F',
                  legendFontSize: 12,
                },
              ]}
              width={width - 40}
              height={220}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
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
  chart: {
    marginVertical: 8,
    borderRadius: 16,
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