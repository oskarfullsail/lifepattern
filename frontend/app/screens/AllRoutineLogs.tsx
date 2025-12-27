/**
 * AllRoutineLogs Screen
 * 
 * Displays all routine logs for the user with filtering and search capabilities.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation';
import { getUserRoutineLogs, RoutineLog } from '../api/endpoint';
import userManager from '../utils/userManager';

type AllRoutineLogsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'AllRoutineLogs'
>;

interface Props {
  navigation: AllRoutineLogsScreenNavigationProp;
}

export default function AllRoutineLogs({ navigation }: Props) {
  const [logs, setLogs] = useState<RoutineLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [filter, setFilter] = useState<'all' | 'week' | 'month'>('all');

  const loadLogs = useCallback(async () => {
    try {
      const userId = await userManager.getUserId();
      if (!userId) {
        console.log('No user ID available');
        return;
      }

      const response = await getUserRoutineLogs(userId, 100); // Fetch up to 100 logs
      // Cast logs to RoutineLog[] since they come with id from backend
      setLogs((response.logs || []) as RoutineLog[]);
      setTotalCount(response.total_count || 0);
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const onRefresh = () => {
    setRefreshing(true);
    loadLogs();
  };

  const getFilteredLogs = () => {
    const now = new Date();
    
    switch (filter) {
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return logs.filter(log => new Date(log.log_date) >= weekAgo);
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return logs.filter(log => new Date(log.log_date) >= monthAgo);
      default:
        return logs;
    }
  };

  const filteredLogs = getFilteredLogs();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getHealthIndicator = (log: RoutineLog) => {
    let score = 0;
    let count = 0;

    // Sleep score (7-9 hours is ideal)
    if (log.sleep_hours >= 7 && log.sleep_hours <= 9) score += 1;
    else if (log.sleep_hours >= 6) score += 0.5;
    count++;

    // Exercise score (30+ min is good)
    if (log.exercise_duration >= 30) score += 1;
    else if (log.exercise_duration >= 15) score += 0.5;
    count++;

    // Stress score (lower is better)
    if (log.stress_level <= 3) score += 1;
    else if (log.stress_level <= 5) score += 0.5;
    count++;

    // Water intake (2+ liters is good)
    if (log.water_intake >= 2) score += 1;
    else if (log.water_intake >= 1.5) score += 0.5;
    count++;

    const percentage = (score / count) * 100;

    if (percentage >= 75) return { color: '#10b981', icon: '🟢', label: 'Great' };
    if (percentage >= 50) return { color: '#f59e0b', icon: '🟡', label: 'Good' };
    return { color: '#ef4444', icon: '🔴', label: 'Needs Work' };
  };

  const handleLogPress = (log: RoutineLog) => {
    navigation.navigate('LogDetail', { logId: log.id });
  };

  const renderLogCard = (log: RoutineLog, index: number) => {
    const health = getHealthIndicator(log);
    
    return (
      <TouchableOpacity
        key={log.id || index}
        style={styles.logCard}
        onPress={() => handleLogPress(log)}
        activeOpacity={0.7}
      >
        <View style={styles.logHeader}>
          <View style={styles.logDateContainer}>
            <Text style={styles.logDate}>{formatDate(log.log_date)}</Text>
            <View style={[styles.healthBadge, { backgroundColor: health.color + '20' }]}>
              <Text style={styles.healthIcon}>{health.icon}</Text>
              <Text style={[styles.healthLabel, { color: health.color }]}>{health.label}</Text>
            </View>
          </View>
          <Text style={styles.chevron}>›</Text>
        </View>

        <View style={styles.logMetrics}>
          <View style={styles.metricItem}>
            <Text style={styles.metricIcon}>😴</Text>
            <Text style={styles.metricValue}>{log.sleep_hours}h</Text>
            <Text style={styles.metricLabel}>Sleep</Text>
          </View>
          
          <View style={styles.metricDivider} />
          
          <View style={styles.metricItem}>
            <Text style={styles.metricIcon}>🏃</Text>
            <Text style={styles.metricValue}>{log.exercise_duration}m</Text>
            <Text style={styles.metricLabel}>Exercise</Text>
          </View>
          
          <View style={styles.metricDivider} />
          
          <View style={styles.metricItem}>
            <Text style={styles.metricIcon}>😰</Text>
            <Text style={styles.metricValue}>{log.stress_level}/10</Text>
            <Text style={styles.metricLabel}>Stress</Text>
          </View>
          
          <View style={styles.metricDivider} />
          
          <View style={styles.metricItem}>
            <Text style={styles.metricIcon}>💧</Text>
            <Text style={styles.metricValue}>{log.water_intake}L</Text>
            <Text style={styles.metricLabel}>Water</Text>
          </View>
        </View>

        {/* Optional: Show heart rate and sugar if available */}
        {(log.heart_rate || log.sugar_intake) && (
          <View style={styles.extraMetrics}>
            {log.heart_rate && (
              <View style={styles.extraMetricItem}>
                <Text style={styles.extraMetricIcon}>❤️</Text>
                <Text style={styles.extraMetricValue}>{log.heart_rate} bpm</Text>
              </View>
            )}
            {log.sugar_intake && (
              <View style={styles.extraMetricItem}>
                <Text style={styles.extraMetricIcon}>🍬</Text>
                <Text style={styles.extraMetricValue}>{log.sugar_intake}g sugar</Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>All Activity</Text>
          <Text style={styles.headerSubtitle}>{totalCount} total logs</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {(['all', 'month', 'week'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'All Time' : f === 'month' ? 'This Month' : 'This Week'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Logs List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>Loading your activity...</Text>
          </View>
        ) : filteredLogs.length > 0 ? (
          <>
            <Text style={styles.resultsText}>
              Showing {filteredLogs.length} {filteredLogs.length === 1 ? 'log' : 'logs'}
            </Text>
            {filteredLogs.map((log, index) => renderLogCard(log, index))}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>No Logs Found</Text>
            <Text style={styles.emptyDesc}>
              {filter !== 'all' 
                ? `No activity logged in the selected time period. Try selecting "All Time".`
                : 'Start logging your daily routines to see them here.'}
            </Text>
            <TouchableOpacity
              style={styles.logButton}
              onPress={() => navigation.navigate('DataImport', {})}
            >
              <Text style={styles.logButtonText}>Log Activity</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
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
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  headerRight: {
    width: 40,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#6366f1',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  filterTextActive: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  resultsText: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
  },
  logCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  logDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logDate: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  healthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  healthIcon: {
    fontSize: 12,
  },
  healthLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 24,
    color: '#94a3b8',
  },
  logMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  metricLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e2e8f0',
  },
  extraMetrics: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 16,
  },
  extraMetricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  extraMetricIcon: {
    fontSize: 14,
  },
  extraMetricValue: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  logButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  logButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

