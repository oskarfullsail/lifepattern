import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Switch,
  Platform,
  Dimensions,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { syncWatchData, DeviceInfo, WatchData } from './api/endpoint';
import userManager from './utils/userManager';
import * as Device from 'expo-device';

type DeviceManagementScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'DeviceManagement'>;

interface Props {
  navigation: DeviceManagementScreenNavigationProp;
}

const { width } = Dimensions.get('window');

export default function DeviceManagement({ navigation }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [watchDataEnabled, setWatchDataEnabled] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [currentUserId, setCurrentUserId] = useState<string>('');

  useEffect(() => {
    initializeDevice();
  }, []);

  const initializeDevice = async () => {
    try {
      const user = await userManager.getCurrentUser();
      if (user) {
        setCurrentUserId(user.userId);
      }

      // Get device information
      const deviceData: DeviceInfo = {
        platform: Platform.OS as 'ios' | 'android' | 'web',
        device_id: await userManager.getDeviceId(),
        device_name: Device.deviceName || 'Unknown Device',
        os_version: Device.osVersion || 'Unknown',
        app_version: '1.0.0', // You can get this from app.json or package.json
      };
      setDeviceInfo(deviceData);
    } catch (error) {
      console.error('Error initializing device:', error);
    }
  };

  const handleSyncWatchData = async () => {
    if (!deviceInfo || !currentUserId) {
      Alert.alert('Error', 'Device information not available');
      return;
    }

    setIsLoading(true);
    setSyncStatus('syncing');

    try {
      // Simulate watch data - in a real app, this would come from the actual watch
      const mockWatchData: WatchData[] = [
        {
          heart_rate: Math.floor(Math.random() * 40) + 60, // 60-100 bpm
          steps: Math.floor(Math.random() * 5000) + 2000, // 2000-7000 steps
          calories: Math.floor(Math.random() * 300) + 100, // 100-400 calories
          sleep_hours: Math.floor(Math.random() * 4) + 6, // 6-10 hours
          activity_level: ['low', 'moderate', 'high'][Math.floor(Math.random() * 3)],
          timestamp: new Date().toISOString(),
        },
        {
          heart_rate: Math.floor(Math.random() * 40) + 60,
          steps: Math.floor(Math.random() * 5000) + 2000,
          calories: Math.floor(Math.random() * 300) + 100,
          sleep_hours: Math.floor(Math.random() * 4) + 6,
          activity_level: ['low', 'moderate', 'high'][Math.floor(Math.random() * 3)],
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
        },
      ];

      const response = await syncWatchData({
        user_id: currentUserId,
        device_info: deviceInfo,
        watch_data: mockWatchData,
      });

      setLastSyncTime(new Date().toLocaleString());
      setSyncStatus('success');
      Alert.alert('Success', `Synced ${response.synced_count} watch data points!`);
    } catch (error) {
      console.error('Error syncing watch data:', error);
      setSyncStatus('error');
      Alert.alert('Error', 'Failed to sync watch data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleWatchDataSync = (value: boolean) => {
    setWatchDataEnabled(value);
    if (value) {
      Alert.alert(
        'Watch Data Sync Enabled',
        'Your watch data will now be automatically synced with your health profile.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Watch Data Sync Disabled',
        'Automatic watch data sync has been turned off.',
        [{ text: 'OK' }]
      );
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'ios':
        return '📱';
      case 'android':
        return '🤖';
      case 'web':
        return '🌐';
      default:
        return '📱';
    }
  };

  const getSyncStatusColor = () => {
    switch (syncStatus) {
      case 'syncing':
        return '#ffc107';
      case 'success':
        return '#28a745';
      case 'error':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  const getSyncStatusText = () => {
    switch (syncStatus) {
      case 'syncing':
        return 'Syncing...';
      case 'success':
        return 'Last sync successful';
      case 'error':
        return 'Sync failed';
      default:
        return 'Not synced';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Device Management</Text>
        <Text style={styles.subtitle}>
          Manage your devices and health data synchronization
        </Text>
      </View>

      {deviceInfo && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Device Information</Text>
          <View style={styles.deviceCard}>
            <Text style={styles.deviceIcon}>
              {getPlatformIcon(deviceInfo.platform)}
            </Text>
            <View style={styles.deviceDetails}>
              <Text style={styles.deviceName}>{deviceInfo.device_name}</Text>
              <Text style={styles.devicePlatform}>
                {deviceInfo.platform.toUpperCase()} • {deviceInfo.os_version}
              </Text>
              <Text style={styles.deviceId}>ID: {deviceInfo.device_id}</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Watch Data Integration</Text>
        <Text style={styles.description}>
          Connect your smartwatch to automatically sync health data
        </Text>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Auto-sync Watch Data</Text>
            <Text style={styles.settingDescription}>
              Automatically sync heart rate, steps, and sleep data
            </Text>
          </View>
          <Switch
            value={watchDataEnabled}
            onValueChange={toggleWatchDataSync}
            trackColor={{ false: '#767577', true: '#4A90E2' }}
            thumbColor={watchDataEnabled ? '#fff' : '#f4f3f4'}
          />
        </View>

        <View style={styles.syncStatus}>
          <Text style={styles.syncStatusLabel}>Sync Status:</Text>
          <Text style={[styles.syncStatusText, { color: getSyncStatusColor() }]}>
            {getSyncStatusText()}
          </Text>
          {lastSyncTime && (
            <Text style={styles.lastSyncTime}>Last sync: {lastSyncTime}</Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleSyncWatchData}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sync Watch Data Now</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Supported Devices</Text>
        
        <View style={styles.deviceList}>
          <View style={styles.deviceItem}>
            <Text style={styles.deviceItemIcon}>🍎</Text>
            <View style={styles.deviceItemInfo}>
              <Text style={styles.deviceItemTitle}>Apple Watch</Text>
              <Text style={styles.deviceItemDesc}>
                Heart rate, steps, sleep, activity rings
              </Text>
            </View>
          </View>

          <View style={styles.deviceItem}>
            <Text style={styles.deviceItemIcon}>⌚</Text>
            <View style={styles.deviceItemInfo}>
              <Text style={styles.deviceItemTitle}>Wear OS (Google)</Text>
              <Text style={styles.deviceItemDesc}>
                Heart rate, steps, sleep, fitness tracking
              </Text>
            </View>
          </View>

          <View style={styles.deviceItem}>
            <Text style={styles.deviceItemIcon}>📱</Text>
            <View style={styles.deviceItemInfo}>
              <Text style={styles.deviceItemTitle}>Phone Sensors</Text>
              <Text style={styles.deviceItemDesc}>
                Steps, location, basic health metrics
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Privacy</Text>
        <Text style={styles.description}>
          Your health data is encrypted and stored securely. We never share your personal information with third parties.
        </Text>
        
        <View style={styles.privacyFeatures}>
          <Text style={styles.privacyFeature}>🔒 End-to-end encryption</Text>
          <Text style={styles.privacyFeature}>🛡️ HIPAA compliant storage</Text>
          <Text style={styles.privacyFeature}>👤 Your data, your control</Text>
          <Text style={styles.privacyFeature}>🚫 No third-party sharing</Text>
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Back to Dashboard</Text>
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
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  section: {
    margin: 20,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
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
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  deviceIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  deviceDetails: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  devicePlatform: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  deviceId: {
    fontSize: 12,
    color: '#888',
    fontFamily: 'monospace',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },
  syncStatus: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
  },
  syncStatusLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  syncStatusText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  lastSyncTime: {
    fontSize: 12,
    color: '#888',
  },
  button: {
    backgroundColor: '#4A90E2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deviceList: {
    marginTop: 8,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  deviceItemIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  deviceItemInfo: {
    flex: 1,
  },
  deviceItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  deviceItemDesc: {
    fontSize: 14,
    color: '#666',
  },
  privacyFeatures: {
    marginTop: 12,
  },
  privacyFeature: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  backButton: {
    backgroundColor: '#6c757d',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 