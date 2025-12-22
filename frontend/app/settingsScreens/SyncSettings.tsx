/**
 * Sync Settings Screen
 * 
 * Provides user control over wearable data synchronization:
 * - Enable/disable specific data sources
 * - Configure sync frequency
 * - View sync status and history
 * - Trigger manual re-sync
 * - Manage data gaps
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
  RefreshControl,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation';

import {
  EnhancedSyncSettings,
  SyncStatus,
  DataGap,
  SyncHistoryEntry,
  loadEnhancedSyncSettings,
  saveEnhancedSyncSettings,
  getSyncStatus,
  getDataGaps,
  getSyncHistory,
  triggerManualResync,
} from '../services/enhancedHealthSync';

type SyncSettingsNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'SyncSettings'
>;

interface Props {
  navigation: SyncSettingsNavigationProp;
}

interface SyncIntervalOption {
  label: string;
  value: number;
}

const SYNC_INTERVALS: SyncIntervalOption[] = [
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '2 hours', value: 120 },
  { label: '4 hours', value: 240 },
  { label: '6 hours', value: 360 },
  { label: '12 hours', value: 720 },
  { label: '24 hours', value: 1440 },
];

export default function SyncSettings({ navigation }: Props) {
  const [settings, setSettings] = useState<EnhancedSyncSettings | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [dataGaps, setDataGaps] = useState<DataGap[]>([]);
  const [syncHistory, setSyncHistory] = useState<SyncHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showIntervalPicker, setShowIntervalPicker] = useState(false);

  // Load all data
  const loadData = useCallback(async () => {
    try {
      const [loadedSettings, status, gaps, history] = await Promise.all([
        loadEnhancedSyncSettings(),
        getSyncStatus(),
        getDataGaps(),
        getSyncHistory(),
      ]);

      setSettings(loadedSettings);
      setSyncStatus(status);
      setDataGaps(gaps.filter(g => !g.resolved));
      setSyncHistory(history.slice(0, 10));
    } catch (error) {
      console.error('Error loading sync settings:', error);
      Alert.alert('Error', 'Failed to load sync settings');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const handleToggle = async (
    key: keyof EnhancedSyncSettings | string,
    value: boolean
  ) => {
    if (!settings) return;

    setIsSaving(true);
    try {
      let updatedSettings = { ...settings };

      if (key === 'enabled') {
        updatedSettings.enabled = value;
      } else if (key.startsWith('dataSources.')) {
        const sourceKey = key.replace('dataSources.', '') as keyof EnhancedSyncSettings['dataSources'];
        updatedSettings.dataSources = {
          ...updatedSettings.dataSources,
          [sourceKey]: value,
        };
      } else if (key.startsWith('syncBehavior.')) {
        const behaviorKey = key.replace('syncBehavior.', '') as keyof EnhancedSyncSettings['syncBehavior'];
        updatedSettings.syncBehavior = {
          ...updatedSettings.syncBehavior,
          [behaviorKey]: value,
        };
      } else if (key.startsWith('powerSettings.')) {
        const powerKey = key.replace('powerSettings.', '') as keyof EnhancedSyncSettings['powerSettings'];
        updatedSettings.powerSettings = {
          ...updatedSettings.powerSettings,
          [powerKey]: value,
        };
      }

      await saveEnhancedSyncSettings(updatedSettings);
      setSettings(updatedSettings);
    } catch (error) {
      console.error('Error saving setting:', error);
      Alert.alert('Error', 'Failed to save setting');
    } finally {
      setIsSaving(false);
    }
  };

  const handleIntervalChange = async (intervalMinutes: number) => {
    if (!settings) return;

    setIsSaving(true);
    setShowIntervalPicker(false);

    try {
      const updatedSettings = { ...settings, syncInterval: intervalMinutes };
      await saveEnhancedSyncSettings(updatedSettings);
      setSettings(updatedSettings);
    } catch (error) {
      console.error('Error saving interval:', error);
      Alert.alert('Error', 'Failed to update sync interval');
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualSync = async () => {
    Alert.alert(
      'Manual Sync',
      'Trigger a manual sync of all enabled data sources?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sync Now',
          onPress: async () => {
            try {
              const result = await triggerManualResync(
                new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
                new Date(),
                Object.entries(settings?.dataSources || {})
                  .filter(([, enabled]) => enabled)
                  .map(([key]) => key)
              );

              if (result.success) {
                Alert.alert('Success', result.message);
                loadData();
              } else {
                Alert.alert('Failed', result.message);
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Sync failed');
            }
          },
        },
      ]
    );
  };

  const handleResolveGap = async (gap: DataGap) => {
    Alert.alert(
      'Fill Data Gap',
      `Attempt to retrieve missing ${gap.dataType} data from ${new Date(gap.startDate).toLocaleDateString()} to ${new Date(gap.endDate).toLocaleDateString()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Fill Gap',
          onPress: async () => {
            try {
              await triggerManualResync(
                new Date(gap.startDate),
                new Date(gap.endDate),
                [gap.dataType]
              );
              loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to fill data gap');
            }
          },
        },
      ]
    );
  };

  const formatLastSync = (timestamp: string | null): string => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return date.toLocaleDateString();
  };

  const getSyncHealthColor = (health: string): string => {
    switch (health) {
      case 'good':
        return '#34C759';
      case 'degraded':
        return '#FF9500';
      case 'offline':
        return '#FF3B30';
      default:
        return '#8E8E93';
    }
  };

  if (isLoading || !settings) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7c3aed" />
        <Text style={styles.loadingText}>Loading sync settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Sync Settings</Text>
        <Text style={styles.subtitle}>
          Configure how your health data is synchronized
        </Text>
      </View>

      {/* Sync Status Card */}
      {syncStatus && (
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusTitle}>Sync Status</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getSyncHealthColor(syncStatus.syncHealth) },
              ]}
            >
              <Text style={styles.statusBadgeText}>
                {syncStatus.syncHealth.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Last Sync</Text>
            <Text style={styles.statusValue}>
              {formatLastSync(syncStatus.lastSync)}
            </Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Pending Records</Text>
            <Text style={styles.statusValue}>{syncStatus.pendingRecords}</Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Data Gaps</Text>
            <Text
              style={[
                styles.statusValue,
                syncStatus.dataGaps > 0 && styles.statusWarning,
              ]}
            >
              {syncStatus.dataGaps}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.syncNowButton}
            onPress={handleManualSync}
            disabled={isSaving}
          >
            <Text style={styles.syncNowButtonText}>
              {isSaving ? 'Syncing...' : '🔄 Sync Now'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Master Toggle */}
      <View style={styles.section}>
        <View style={styles.settingItem}>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Enable Background Sync</Text>
            <Text style={styles.settingDescription}>
              Automatically sync health data in the background
            </Text>
          </View>
          <Switch
            value={settings.enabled}
            onValueChange={(value) => handleToggle('enabled', value)}
            trackColor={{ false: '#767577', true: '#34C759' }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* Sync Interval */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sync Frequency</Text>
        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => setShowIntervalPicker(!showIntervalPicker)}
        >
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Sync Interval</Text>
            <Text style={styles.settingDescription}>
              How often to sync data automatically
            </Text>
          </View>
          <Text style={styles.settingValue}>
            {SYNC_INTERVALS.find((i) => i.value === settings.syncInterval)
              ?.label || `${settings.syncInterval} min`}
          </Text>
        </TouchableOpacity>

        {showIntervalPicker && (
          <View style={styles.pickerContainer}>
            {SYNC_INTERVALS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.pickerOption,
                  settings.syncInterval === option.value &&
                    styles.pickerOptionSelected,
                ]}
                onPress={() => handleIntervalChange(option.value)}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    settings.syncInterval === option.value &&
                      styles.pickerOptionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Data Sources */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Sources</Text>
        <Text style={styles.sectionSubtitle}>
          Choose which data to sync from your wearable
        </Text>

        {Object.entries(settings.dataSources).map(([key, enabled]) => (
          <View key={key} style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>
                {key
                  .replace(/([A-Z])/g, ' $1')
                  .replace(/^./, (s) => s.toUpperCase())}
              </Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={(value) => handleToggle(`dataSources.${key}`, value)}
              trackColor={{ false: '#767577', true: '#34C759' }}
              thumbColor="#fff"
            />
          </View>
        ))}
      </View>

      {/* Sync Behavior */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sync Behavior</Text>

        <View style={styles.settingItem}>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Sync on App Open</Text>
            <Text style={styles.settingDescription}>
              Sync when you open the app
            </Text>
          </View>
          <Switch
            value={settings.syncBehavior.syncOnAppOpen}
            onValueChange={(value) =>
              handleToggle('syncBehavior.syncOnAppOpen', value)
            }
            trackColor={{ false: '#767577', true: '#34C759' }}
            thumbColor="#fff"
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Sync on Connectivity</Text>
            <Text style={styles.settingDescription}>
              Sync when network is restored
            </Text>
          </View>
          <Switch
            value={settings.syncBehavior.syncOnConnectivity}
            onValueChange={(value) =>
              handleToggle('syncBehavior.syncOnConnectivity', value)
            }
            trackColor={{ false: '#767577', true: '#34C759' }}
            thumbColor="#fff"
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Allow Cellular Sync</Text>
            <Text style={styles.settingDescription}>
              Sync using mobile data (not just Wi-Fi)
            </Text>
          </View>
          <Switch
            value={settings.syncBehavior.allowCellularSync}
            onValueChange={(value) =>
              handleToggle('syncBehavior.allowCellularSync', value)
            }
            trackColor={{ false: '#767577', true: '#34C759' }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* Power Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Power Management</Text>

        <View style={styles.settingItem}>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Reduce Sync on Low Battery</Text>
            <Text style={styles.settingDescription}>
              Less frequent syncs when battery is low
            </Text>
          </View>
          <Switch
            value={settings.powerSettings.reduceSyncOnLowBattery}
            onValueChange={(value) =>
              handleToggle('powerSettings.reduceSyncOnLowBattery', value)
            }
            trackColor={{ false: '#767577', true: '#34C759' }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* Data Gaps */}
      {dataGaps.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Gaps Detected</Text>
          <Text style={styles.sectionSubtitle}>
            Missing data that can be recovered
          </Text>

          {dataGaps.map((gap) => (
            <TouchableOpacity
              key={gap.id}
              style={styles.gapCard}
              onPress={() => handleResolveGap(gap)}
            >
              <View style={styles.gapInfo}>
                <Text style={styles.gapType}>
                  {gap.dataType.replace(/([A-Z])/g, ' $1')}
                </Text>
                <Text style={styles.gapDates}>
                  {new Date(gap.startDate).toLocaleDateString()} -{' '}
                  {new Date(gap.endDate).toLocaleDateString()}
                </Text>
                <Text style={styles.gapRecords}>
                  ~{gap.estimatedRecords} records missing
                </Text>
              </View>
              <Text style={styles.gapAction}>Fill →</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Sync History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Sync History</Text>

        {syncHistory.length === 0 ? (
          <Text style={styles.emptyText}>No sync history yet</Text>
        ) : (
          syncHistory.map((entry) => (
            <View key={entry.id} style={styles.historyItem}>
              <View style={styles.historyInfo}>
                <Text style={styles.historyTime}>
                  {new Date(entry.timestamp).toLocaleString()}
                </Text>
                <Text style={styles.historyDetails}>
                  {entry.syncType} • {entry.recordsSynced} synced
                  {entry.recordsFailed > 0 && ` • ${entry.recordsFailed} failed`}
                </Text>
              </View>
              <View
                style={[
                  styles.historyStatus,
                  {
                    backgroundColor:
                      entry.status === 'success'
                        ? '#34C759'
                        : entry.status === 'partial'
                        ? '#FF9500'
                        : '#FF3B30',
                  },
                ]}
              >
                <Text style={styles.historyStatusText}>
                  {entry.status.toUpperCase()}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Last settings update:{' '}
          {new Date(settings.lastModified).toLocaleString()}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#7c3aed',
    fontWeight: '600',
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
  },
  statusCard: {
    backgroundColor: '#fff',
    margin: 20,
    marginBottom: 10,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  statusWarning: {
    color: '#FF9500',
  },
  syncNowButton: {
    backgroundColor: '#7c3aed',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    alignItems: 'center',
  },
  syncNowButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 10,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },
  settingValue: {
    fontSize: 14,
    color: '#7c3aed',
    fontWeight: '600',
  },
  pickerContainer: {
    marginTop: 8,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 8,
  },
  pickerOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  pickerOptionSelected: {
    backgroundColor: '#7c3aed',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#333',
  },
  pickerOptionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  gapCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  gapInfo: {
    flex: 1,
  },
  gapType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E65100',
  },
  gapDates: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  gapRecords: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  gapAction: {
    fontSize: 16,
    color: '#E65100',
    fontWeight: '600',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  historyInfo: {
    flex: 1,
  },
  historyTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  historyDetails: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  historyStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  historyStatusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
});

