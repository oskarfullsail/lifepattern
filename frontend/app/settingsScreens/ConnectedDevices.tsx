/**
 * Connected Devices Screen
 * Shows connected health devices and allows managing them
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation';

type ConnectedDevicesNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ConnectedDevices'>;

interface Props {
  navigation: ConnectedDevicesNavigationProp;
}

interface Device {
  id: string;
  name: string;
  type: 'apple_health' | 'google_fit' | 'apple_watch' | 'fitbit' | 'garmin';
  status: 'connected' | 'disconnected' | 'pending';
  lastSync?: string;
  icon: string;
}

export default function ConnectedDevices({ navigation }: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [devices, setDevices] = useState<Device[]>([]);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      setIsLoading(true);
      // In a real app, this would fetch from backend or local storage
      // For now, show available integrations based on platform
      const availableDevices: Device[] = [];

      if (Platform.OS === 'ios') {
        availableDevices.push({
          id: 'apple_health',
          name: 'Apple Health',
          type: 'apple_health',
          status: 'disconnected',
          icon: '❤️',
        });
        availableDevices.push({
          id: 'apple_watch',
          name: 'Apple Watch',
          type: 'apple_watch',
          status: 'disconnected',
          icon: '⌚',
        });
      } else if (Platform.OS === 'android') {
        availableDevices.push({
          id: 'google_fit',
          name: 'Google Fit',
          type: 'google_fit',
          status: 'disconnected',
          icon: '🏃',
        });
      }

      // These are available on both platforms
      availableDevices.push({
        id: 'fitbit',
        name: 'Fitbit',
        type: 'fitbit',
        status: 'disconnected',
        icon: '📱',
      });
      availableDevices.push({
        id: 'garmin',
        name: 'Garmin',
        type: 'garmin',
        status: 'disconnected',
        icon: '🎯',
      });

      setDevices(availableDevices);
    } catch (error) {
      console.error('Error loading devices:', error);
      Alert.alert('Error', 'Failed to load connected devices');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectDevice = (device: Device) => {
    if (device.type === 'apple_health') {
      navigation.navigate('HealthPermissions');
    } else if (device.type === 'google_fit') {
      Alert.alert(
        'Connect Google Fit',
        'This will open Google Fit to authorize LifePattern to access your health data.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Connect', onPress: () => console.log('Connecting to Google Fit...') },
        ]
      );
    } else {
      Alert.alert(
        'Coming Soon',
        `${device.name} integration is coming soon! We're working on adding support for more devices.`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleDisconnectDevice = (device: Device) => {
    Alert.alert(
      'Disconnect Device',
      `Are you sure you want to disconnect ${device.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => {
            setDevices(prev =>
              prev.map(d => (d.id === device.id ? { ...d, status: 'disconnected' as const } : d))
            );
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return '#22c55e';
      case 'pending':
        return '#f59e0b';
      default:
        return '#94a3b8';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'pending':
        return 'Pending';
      default:
        return 'Not Connected';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7c3aed" />
        <Text style={styles.loadingText}>Loading devices...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Connected Devices</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Health & Fitness</Text>
        <Text style={styles.sectionDescription}>
          Connect your health devices to automatically sync data with LifePattern.
        </Text>

        {devices.map(device => (
          <View key={device.id} style={styles.deviceCard}>
            <View style={styles.deviceInfo}>
              <Text style={styles.deviceIcon}>{device.icon}</Text>
              <View style={styles.deviceDetails}>
                <Text style={styles.deviceName}>{device.name}</Text>
                <View style={styles.statusRow}>
                  <View
                    style={[styles.statusDot, { backgroundColor: getStatusColor(device.status) }]}
                  />
                  <Text style={[styles.statusText, { color: getStatusColor(device.status) }]}>
                    {getStatusText(device.status)}
                  </Text>
                </View>
                {device.lastSync && (
                  <Text style={styles.lastSync}>Last sync: {device.lastSync}</Text>
                )}
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.actionButton,
                device.status === 'connected' ? styles.disconnectButton : styles.connectButton,
              ]}
              onPress={() =>
                device.status === 'connected'
                  ? handleDisconnectDevice(device)
                  : handleConnectDevice(device)
              }
            >
              <Text
                style={[
                  styles.actionButtonText,
                  device.status === 'connected'
                    ? styles.disconnectButtonText
                    : styles.connectButtonText,
                ]}
              >
                {device.status === 'connected' ? 'Disconnect' : 'Connect'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}

        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>💡</Text>
          <Text style={styles.infoText}>
            Connecting your health devices allows LifePattern to automatically import your sleep,
            steps, and exercise data for more accurate insights.
          </Text>
        </View>
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
    marginTop: 12,
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
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#7c3aed',
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  placeholder: {
    width: 60,
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 15,
    color: '#64748b',
    marginBottom: 20,
    lineHeight: 22,
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deviceIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  deviceDetails: {
    flex: 1,
  },
  deviceName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  lastSync: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 12,
  },
  connectButton: {
    backgroundColor: '#7c3aed',
  },
  disconnectButton: {
    backgroundColor: '#fee2e2',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  connectButtonText: {
    color: '#fff',
  },
  disconnectButtonText: {
    color: '#dc2626',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
});

