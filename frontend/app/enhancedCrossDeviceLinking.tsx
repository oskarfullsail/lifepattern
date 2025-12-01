import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Image,
  Dimensions,
  Platform,
  Linking,
  Share,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { generateLinkToken, verifyLinkToken, getLinkStatus, GenerateLinkTokenResponse, LinkStatusResponse } from './api/endpoint';
import userManager from './utils/userManager';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

type EnhancedCrossDeviceLinkingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'EnhancedCrossDeviceLinking'>;

interface Props {
  navigation: EnhancedCrossDeviceLinkingScreenNavigationProp;
}

const { width } = Dimensions.get('window');

interface DeviceInfo {
  id: string;
  label: string;
  platform: string;
  lastSync: string;
  status: 'online' | 'offline' | 'syncing';
  syncProgress?: number;
}

export default function EnhancedCrossDeviceLinking({ navigation }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [linkToken, setLinkToken] = useState<GenerateLinkTokenResponse | null>(null);
  const [linkStatus, setLinkStatus] = useState<LinkStatusResponse | null>(null);
  const [inputToken, setInputToken] = useState('');
  const [deviceLabel, setDeviceLabel] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [linkedDevices, setLinkedDevices] = useState<DeviceInfo[]>([]);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initializeScreen();
    setupNotifications();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const initializeScreen = async () => {
    try {
      const user = await userManager.getCurrentUser();
      if (user) {
        setCurrentUserId(user.userId);
        const deviceName = await getDeviceName();
        setDeviceLabel(deviceName);
        loadLinkedDevices();
      }
    } catch (error) {
      console.error('Error initializing screen:', error);
    }
  };

  const getDeviceName = async (): Promise<string> => {
    const deviceName = Device.deviceName || 'Unknown Device';
    const platform = Platform.OS;
    const user = await userManager.getCurrentUser();
    return `${user?.username || 'User'}'s ${platform === 'ios' ? 'iPhone' : platform === 'android' ? 'Android' : 'Web'} Device`;
  };

  const setupNotifications = async () => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      Alert.alert('Permission Required', 'Please enable notifications to receive sync updates.');
      return;
    }
  };

  const loadLinkedDevices = async () => {
    try {
      // Mock data for demonstration - replace with actual API call
      const mockDevices: DeviceInfo[] = [
        {
          id: 'device-1',
          label: 'iPhone 15 Pro',
          platform: 'iOS',
          lastSync: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
          status: 'online',
        },
        {
          id: 'device-2',
          label: 'Samsung Galaxy S24',
          platform: 'Android',
          lastSync: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
          status: 'offline',
        },
        {
          id: 'device-3',
          label: 'MacBook Pro',
          platform: 'Web',
          lastSync: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago
          status: 'syncing',
          syncProgress: 75,
        },
      ];
      setLinkedDevices(mockDevices);
    } catch (error) {
      console.error('Error loading linked devices:', error);
    }
  };

  const handleGenerateLinkToken = async () => {
    if (!deviceLabel.trim()) {
      Alert.alert('Error', 'Please enter a device label');
      return;
    }

    setIsLoading(true);
    try {
      const response = await generateLinkToken({
        device_label: deviceLabel.trim(),
      });
      setLinkToken(response);
      
      // Generate QR code data
      const qrData = `lifepattern://link?token=${response.link_token}&device=${encodeURIComponent(deviceLabel)}`;
      setQrCodeData(qrData);
      
      Alert.alert(
        'Link Token Generated! 🎉',
        'Share the QR code or link token with another device to establish a connection.',
        [
          {
            text: 'Share Token',
            onPress: () => shareLinkToken(response.link_token),
          },
          {
            text: 'OK',
          },
        ]
      );
    } catch (error) {
      console.error('Error generating link token:', error);
      Alert.alert('Error', 'Failed to generate link token. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const shareLinkToken = async (token: string) => {
    try {
      const shareData = {
        message: `Join my LifePattern account! Use this link token: ${token}\n\nOr scan the QR code in the app.`,
        title: 'LifePattern Device Linking',
      };
      await Share.share(shareData);
    } catch (error) {
      console.error('Error sharing token:', error);
    }
  };

  const handleVerifyLinkToken = async () => {
    if (!inputToken.trim() || !deviceLabel.trim()) {
      Alert.alert('Error', 'Please enter both link token and device label');
      return;
    }

    setIsLoading(true);
    try {
      const response = await verifyLinkToken({
        link_token: inputToken.trim(),
        device_label: deviceLabel.trim(),
      });
      
      // Start monitoring sync status
      startSyncMonitoring();
      
      Alert.alert(
        'Device Linked Successfully! 🎉',
        `Your device is now connected to the LifePattern network.\n\nLinked User ID: ${response.linked_user_id}\nYour User ID: ${response.user_id}`,
        [
          {
            text: 'Start Syncing',
            onPress: () => startDataSync(),
          },
          {
            text: 'OK',
            onPress: () => navigation.navigate('UserDashboard'),
          },
        ]
      );
    } catch (error) {
      console.error('Error verifying link token:', error);
      Alert.alert('Error', 'Failed to verify link token. Please check the token and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const startSyncMonitoring = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    intervalRef.current = setInterval(async () => {
      try {
        const status = await getLinkStatus();
        setLinkStatus(status);
        
        // Update device status
        setLinkedDevices(prev => prev.map(device => ({
          ...device,
          lastSync: new Date().toISOString(),
          status: Math.random() > 0.3 ? 'online' : 'syncing',
          syncProgress: Math.random() > 0.3 ? undefined : Math.floor(Math.random() * 100),
        })));
      } catch (error) {
        console.error('Error monitoring sync status:', error);
      }
    }, 5000); // Check every 5 seconds
  };

  const startDataSync = async () => {
    setSyncInProgress(true);
    try {
      // Simulate sync process
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Send notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Sync Complete! 📱',
          body: 'Your data has been synchronized across all devices.',
        },
        trigger: null,
      });
      
      Alert.alert('Sync Complete!', 'Your data has been synchronized across all linked devices.');
    } catch (error) {
      console.error('Error during sync:', error);
      Alert.alert('Sync Error', 'Failed to sync data. Please try again.');
    } finally {
      setSyncInProgress(false);
    }
  };

  const removeDevice = (deviceId: string) => {
    Alert.alert(
      'Remove Device',
      'Are you sure you want to remove this device from your account?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setLinkedDevices(prev => prev.filter(device => device.id !== deviceId));
            Alert.alert('Device Removed', 'The device has been removed from your account.');
          },
        },
      ]
    );
  };

  const renderQRCode = () => {
    if (!qrCodeData) return null;
    
    return (
      <View style={styles.qrContainer}>
        <Text style={styles.qrTitle}>Scan QR Code</Text>
        <View style={styles.qrCode}>
          <Text style={styles.qrPlaceholder}>📱 QR Code</Text>
          <Text style={styles.qrInstructions}>
            Scan this QR code with another device to link accounts
          </Text>
        </View>
        <TouchableOpacity
          style={styles.copyButton}
          onPress={() => {
            // In a real app, you'd copy the QR data to clipboard
            Alert.alert('Copied!', 'QR code data copied to clipboard');
          }}
        >
          <Text style={styles.copyButtonText}>Copy QR Data</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderLinkedDevices = () => (
    <View style={styles.devicesContainer}>
      <Text style={styles.sectionTitle}>Linked Devices</Text>
      {linkedDevices.map((device) => (
        <View key={device.id} style={styles.deviceItem}>
          <View style={styles.deviceInfo}>
            <Text style={styles.deviceLabel}>{device.label}</Text>
            <Text style={styles.devicePlatform}>{device.platform}</Text>
            <Text style={styles.deviceLastSync}>
              Last sync: {new Date(device.lastSync).toLocaleTimeString()}
            </Text>
          </View>
          <View style={styles.deviceStatus}>
            <View style={[styles.statusIndicator, styles[`status${device.status}`]]} />
            <Text style={styles.statusText}>{device.status}</Text>
            {device.syncProgress !== undefined && (
              <Text style={styles.syncProgress}>{device.syncProgress}%</Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => removeDevice(device.id)}
          >
            <Text style={styles.removeButtonText}>Remove</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );

  const renderSyncControls = () => (
    <View style={styles.syncContainer}>
      <Text style={styles.sectionTitle}>Data Synchronization</Text>
      <TouchableOpacity
        style={[styles.syncButton, syncInProgress && styles.syncButtonDisabled]}
        onPress={startDataSync}
        disabled={syncInProgress}
      >
        {syncInProgress ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Text style={styles.syncButtonText}>Sync All Devices</Text>
        )}
      </TouchableOpacity>
      <Text style={styles.syncInfo}>
        Sync your health data, settings, and preferences across all linked devices
      </Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Enhanced Cross-Device Linking</Text>
        <Text style={styles.subtitle}>Connect and sync across all your devices</Text>
      </View>

      {/* Device Label Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Device Label</Text>
        <TextInput
          style={styles.input}
          value={deviceLabel}
          onChangeText={setDeviceLabel}
          placeholder="Enter a name for this device"
          placeholderTextColor="#9ca3af"
        />
      </View>

      {/* Generate Link Token */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Generate Link Token</Text>
        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleGenerateLinkToken}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Generate Link Token</Text>
          )}
        </TouchableOpacity>
        {linkToken && (
          <View style={styles.tokenContainer}>
            <Text style={styles.tokenLabel}>Link Token:</Text>
            <Text style={styles.tokenText}>{linkToken.link_token}</Text>
          </View>
        )}
      </View>

      {/* QR Code */}
      {renderQRCode()}

      {/* Verify Link Token */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Link Another Device</Text>
        <TextInput
          style={styles.input}
          value={inputToken}
          onChangeText={setInputToken}
          placeholder="Enter link token from another device"
          placeholderTextColor="#9ca3af"
        />
        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleVerifyLinkToken}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Link Device</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Linked Devices */}
      {renderLinkedDevices()}

      {/* Sync Controls */}
      {renderSyncControls()}

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>Back to Dashboard</Text>
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
  inputContainer: {
    padding: 20,
    backgroundColor: '#ffffff',
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  section: {
    padding: 20,
    backgroundColor: '#ffffff',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  tokenContainer: {
    backgroundColor: '#f1f5f9',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  tokenLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 5,
  },
  tokenText: {
    fontSize: 16,
    fontFamily: 'monospace',
    color: '#1e293b',
  },
  qrContainer: {
    padding: 20,
    backgroundColor: '#ffffff',
    marginBottom: 10,
    alignItems: 'center',
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 15,
  },
  qrCode: {
    width: 200,
    height: 200,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  qrPlaceholder: {
    fontSize: 48,
    marginBottom: 10,
  },
  qrInstructions: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  copyButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  copyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  devicesContainer: {
    padding: 20,
    backgroundColor: '#ffffff',
    marginBottom: 10,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  devicePlatform: {
    fontSize: 14,
    color: '#64748b',
  },
  deviceLastSync: {
    fontSize: 12,
    color: '#9ca3af',
  },
  deviceStatus: {
    alignItems: 'center',
    marginRight: 15,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  statusonline: {
    backgroundColor: '#10b981',
  },
  statusoffline: {
    backgroundColor: '#ef4444',
  },
  statussyncing: {
    backgroundColor: '#f59e0b',
  },
  statusText: {
    fontSize: 12,
    color: '#64748b',
    textTransform: 'capitalize',
  },
  syncProgress: {
    fontSize: 10,
    color: '#f59e0b',
    fontWeight: '600',
  },
  removeButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  removeButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  syncContainer: {
    padding: 20,
    backgroundColor: '#ffffff',
    marginBottom: 10,
  },
  syncButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  syncButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  syncButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  syncInfo: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#64748b',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    margin: 20,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
}); 