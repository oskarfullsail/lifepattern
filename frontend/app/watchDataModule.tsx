import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  PermissionsAndroid,
} from 'react-native';
// Note: Some Expo packages are not available, using mock data for demonstration
import * as Location from 'expo-location';
// import * as Sensors from 'expo-sensors'; // Not available
// import * as TaskManager from 'expo-task-manager'; // Not available
// import * as BackgroundFetch from 'expo-background-fetch'; // Not available
// import * as Notifications from 'expo-notifications'; // Not available
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';

type WatchDataModuleScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'WatchDataModule'>;

interface Props {
  navigation: WatchDataModuleScreenNavigationProp;
}

interface HealthData {
  type: string;
  value: number;
  unit: string;
  timestamp: string;
  source: string;
}

interface WatchDevice {
  id: string;
  name: string;
  type: 'apple-watch' | 'samsung-watch' | 'fitbit' | 'garmin' | 'other';
  connected: boolean;
  batteryLevel?: number;
  lastSync?: string;
}

const BACKGROUND_HEALTH_TASK = 'background-health-task';

// Mock background task for health data collection (since TaskManager is not available)
// In a real app, you would use TaskManager.defineTask here
const mockBackgroundTask = async () => {
  try {
    // This would be called by the background task system
    console.log('Background health task would run here');
    return 'new_data';
  } catch (error) {
    console.error('Background health task failed:', error);
    return 'failed';
  }
};

export default function WatchDataModule({ navigation }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [healthPermission, setHealthPermission] = useState<boolean>(false);
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const [connectedWatches, setConnectedWatches] = useState<WatchDevice[]>([]);
  const [healthData, setHealthData] = useState<HealthData[]>([]);
  const [isCollecting, setIsCollecting] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initializeModule();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const initializeModule = async () => {
    await requestPermissions();
    await scanForWatches();
    await setupBackgroundTasks();
  };

  const requestPermissions = async () => {
    try {
      // Request location permissions
      const locationPermission = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(locationPermission.status === 'granted');

      // Request notification permissions (mock since Notifications is not available)
      // const notificationPermission = await Notifications.requestPermissionsAsync();
      
      // For health data, we'll use mock data since expo-health is not available
      setHealthPermission(true); // Mock permission granted
      
      if (locationPermission.status !== 'granted') {
        Alert.alert(
          'Permissions Required',
          'Please grant location permissions to collect watch data.',
          [
            {
              text: 'Open Settings',
              onPress: () => {
                // In a real app, you'd open device settings
                console.log('Open settings');
              },
            },
            {
              text: 'Cancel',
              style: 'cancel',
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
    }
  };

  const scanForWatches = async () => {
    setIsLoading(true);
    try {
      // Mock watch discovery - in a real app, you'd use platform-specific APIs
      const mockWatches: WatchDevice[] = [
        {
          id: 'watch-1',
          name: 'Apple Watch Series 9',
          type: 'apple-watch',
          connected: true,
          batteryLevel: 85,
          lastSync: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
        },
        {
          id: 'watch-2',
          name: 'Samsung Galaxy Watch 6',
          type: 'samsung-watch',
          connected: false,
          batteryLevel: 45,
          lastSync: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
        },
        {
          id: 'watch-3',
          name: 'Fitbit Sense',
          type: 'fitbit',
          connected: true,
          batteryLevel: 92,
          lastSync: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
        },
      ];
      setConnectedWatches(mockWatches);
    } catch (error) {
      console.error('Error scanning for watches:', error);
      Alert.alert('Error', 'Failed to scan for watches. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const setupBackgroundTasks = async () => {
    try {
      // Mock background fetch setup (since BackgroundFetch is not available)
      // In a real app, you would use:
      // await BackgroundFetch.registerTaskAsync(BACKGROUND_HEALTH_TASK, {
      //   minimumInterval: 15 * 60, // 15 minutes
      //   stopOnTerminate: false,
      //   startOnBoot: true,
      // });
      // BackgroundFetch.setMinimumIntervalAsync(15 * 60);
      
      console.log('Background tasks would be set up here');
    } catch (error) {
      console.error('Error setting up background tasks:', error);
    }
  };

  const connectToWatch = async (watchId: string) => {
    setIsLoading(true);
    try {
      // Simulate connection process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setConnectedWatches(prev => prev.map(watch => 
        watch.id === watchId 
          ? { ...watch, connected: true, lastSync: new Date().toISOString() }
          : watch
      ));
      
      Alert.alert('Success', 'Watch connected successfully!');
    } catch (error) {
      console.error('Error connecting to watch:', error);
      Alert.alert('Error', 'Failed to connect to watch. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWatch = async (watchId: string) => {
    Alert.alert(
      'Disconnect Watch',
      'Are you sure you want to disconnect this watch?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            setConnectedWatches(prev => prev.map(watch => 
              watch.id === watchId 
                ? { ...watch, connected: false }
                : watch
            ));
            Alert.alert('Disconnected', 'Watch has been disconnected.');
          },
        },
      ]
    );
  };

  const collectHealthData = async (): Promise<HealthData[]> => {
    const data: HealthData[] = [];
    
    try {
      // Collect step count (mock data since expo-health is not available)
      const stepCount = Math.floor(Math.random() * 10000) + 5000; // 5000-15000 steps
      data.push({
        type: 'steps',
        value: stepCount,
        unit: 'steps',
        timestamp: new Date().toISOString(),
        source: 'apple-watch',
      });

      // Collect heart rate
      const heartRate = await getHeartRate();
      if (heartRate) {
        data.push({
          type: 'heart_rate',
          value: heartRate,
          unit: 'bpm',
          timestamp: new Date().toISOString(),
          source: 'watch',
        });
      }

      // Collect sleep data
      const sleepData = await getSleepData();
      if (sleepData) {
        data.push({
          type: 'sleep',
          value: sleepData,
          unit: 'hours',
          timestamp: new Date().toISOString(),
          source: 'watch',
        });
      }

      // Collect activity data
      const activityData = await getActivityData();
      if (activityData) {
        data.push({
          type: 'activity',
          value: activityData,
          unit: 'minutes',
          timestamp: new Date().toISOString(),
          source: 'watch',
        });
      }

      // Collect location data
      const location = await Location.getCurrentPositionAsync({});
      if (location) {
        data.push({
          type: 'location',
          value: location.coords.latitude,
          unit: 'latitude',
          timestamp: new Date().toISOString(),
          source: 'gps',
        });
        data.push({
          type: 'location',
          value: location.coords.longitude,
          unit: 'longitude',
          timestamp: new Date().toISOString(),
          source: 'gps',
        });
      }

    } catch (error) {
      console.error('Error collecting health data:', error);
    }

    return data;
  };

  const getHeartRate = async (): Promise<number | null> => {
    try {
      // Mock heart rate data - in a real app, you'd get this from the watch
      return Math.floor(Math.random() * 40) + 60; // 60-100 bpm
    } catch (error) {
      console.error('Error getting heart rate:', error);
      return null;
    }
  };

  const getSleepData = async (): Promise<number | null> => {
    try {
      // Mock sleep data - in a real app, you'd get this from the watch
      return Math.random() * 4 + 4; // 4-8 hours
    } catch (error) {
      console.error('Error getting sleep data:', error);
      return null;
    }
  };

  const getActivityData = async (): Promise<number | null> => {
    try {
      // Mock activity data - in a real app, you'd get this from the watch
      return Math.floor(Math.random() * 120) + 30; // 30-150 minutes
    } catch (error) {
      console.error('Error getting activity data:', error);
      return null;
    }
  };

  const sendHealthDataToBackend = async (data: HealthData[]) => {
    try {
      // In a real app, you'd send this to your backend API
      console.log('Sending health data to backend:', data);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return true;
    } catch (error) {
      console.error('Error sending health data to backend:', error);
      return false;
    }
  };

  const startDataCollection = async () => {
    setIsCollecting(true);
    setSyncProgress(0);
    
    try {
      // Start continuous data collection
      intervalRef.current = setInterval(async () => {
        const data = await collectHealthData();
        setHealthData(prev => [...prev, ...data]);
        
        const success = await sendHealthDataToBackend(data);
        if (success) {
          setSyncProgress(prev => Math.min(prev + 10, 100));
        }
      }, 5000); // Collect every 5 seconds
      
      Alert.alert('Data Collection Started', 'Health data is now being collected from your watches.');
    } catch (error) {
      console.error('Error starting data collection:', error);
      Alert.alert('Error', 'Failed to start data collection.');
    }
  };

  const stopDataCollection = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsCollecting(false);
    setSyncProgress(0);
    Alert.alert('Data Collection Stopped', 'Health data collection has been stopped.');
  };

  const renderWatchList = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Connected Watches</Text>
      {connectedWatches.map((watch) => (
        <View key={watch.id} style={styles.watchItem}>
          <View style={styles.watchInfo}>
            <Text style={styles.watchName}>{watch.name}</Text>
            <Text style={styles.watchType}>{watch.type.replace('-', ' ').toUpperCase()}</Text>
            <Text style={styles.watchLastSync}>
              Last sync: {new Date(watch.lastSync || Date.now()).toLocaleTimeString()}
            </Text>
          </View>
          <View style={styles.watchStatus}>
            <View style={[styles.statusIndicator, watch.connected ? styles.statusConnected : styles.statusDisconnected]} />
            <Text style={styles.statusText}>{watch.connected ? 'Connected' : 'Disconnected'}</Text>
            {watch.batteryLevel && (
              <Text style={styles.batteryLevel}>{watch.batteryLevel}%</Text>
            )}
          </View>
          <View style={styles.watchActions}>
            {watch.connected ? (
              <TouchableOpacity
                style={styles.disconnectButton}
                onPress={() => disconnectWatch(watch.id)}
              >
                <Text style={styles.disconnectButtonText}>Disconnect</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.connectButton}
                onPress={() => connectToWatch(watch.id)}
                disabled={isLoading}
              >
                <Text style={styles.connectButtonText}>Connect</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}
    </View>
  );

  const renderDataCollection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Data Collection</Text>
      <View style={styles.collectionControls}>
        {!isCollecting ? (
          <TouchableOpacity
            style={styles.startButton}
            onPress={startDataCollection}
          >
            <Text style={styles.startButtonText}>Start Data Collection</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.stopButton}
            onPress={stopDataCollection}
          >
            <Text style={styles.stopButtonText}>Stop Data Collection</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {isCollecting && (
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>Sync Progress: {syncProgress}%</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${syncProgress}%` }]} />
          </View>
        </View>
      )}
      
      <Text style={styles.collectionInfo}>
        Collects health data from connected watches including heart rate, steps, sleep, and activity levels.
      </Text>
    </View>
  );

  const renderHealthData = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Recent Health Data</Text>
      <ScrollView style={styles.dataContainer} showsVerticalScrollIndicator={false}>
        {healthData.slice(-10).reverse().map((data, index) => (
          <View key={index} style={styles.dataItem}>
            <Text style={styles.dataType}>{data.type.replace('_', ' ').toUpperCase()}</Text>
            <Text style={styles.dataValue}>{data.value} {data.unit}</Text>
            <Text style={styles.dataSource}>{data.source}</Text>
            <Text style={styles.dataTime}>
              {new Date(data.timestamp).toLocaleTimeString()}
            </Text>
          </View>
        ))}
        {healthData.length === 0 && (
          <Text style={styles.noDataText}>No health data collected yet.</Text>
        )}
      </ScrollView>
    </View>
  );

  const renderPermissions = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Permissions</Text>
      <View style={styles.permissionItem}>
        <Text style={styles.permissionLabel}>Health Data</Text>
        <View style={[styles.permissionStatus, healthPermission ? styles.permissionGranted : styles.permissionDenied]} />
      </View>
      <View style={styles.permissionItem}>
        <Text style={styles.permissionLabel}>Location</Text>
        <View style={[styles.permissionStatus, locationPermission ? styles.permissionGranted : styles.permissionDenied]} />
      </View>
      <TouchableOpacity
        style={styles.permissionButton}
        onPress={requestPermissions}
      >
        <Text style={styles.permissionButtonText}>Request Permissions</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Watch Data Module</Text>
        <Text style={styles.subtitle}>Connect and collect data from smartwatches</Text>
      </View>

      {renderPermissions()}
      {renderWatchList()}
      {renderDataCollection()}
      {renderHealthData()}

      <TouchableOpacity
        style={styles.scanButton}
        onPress={scanForWatches}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Text style={styles.scanButtonText}>Scan for Watches</Text>
        )}
      </TouchableOpacity>

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
  watchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  watchInfo: {
    flex: 1,
  },
  watchName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  watchType: {
    fontSize: 14,
    color: '#64748b',
    textTransform: 'uppercase',
  },
  watchLastSync: {
    fontSize: 12,
    color: '#9ca3af',
  },
  watchStatus: {
    alignItems: 'center',
    marginRight: 15,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  statusConnected: {
    backgroundColor: '#10b981',
  },
  statusDisconnected: {
    backgroundColor: '#ef4444',
  },
  statusText: {
    fontSize: 12,
    color: '#64748b',
  },
  batteryLevel: {
    fontSize: 10,
    color: '#f59e0b',
    fontWeight: '600',
  },
  watchActions: {
    marginLeft: 10,
  },
  connectButton: {
    backgroundColor: '#10b981',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  connectButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  disconnectButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  disconnectButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  collectionControls: {
    marginBottom: 15,
  },
  startButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  stopButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  stopButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  progressContainer: {
    marginBottom: 15,
  },
  progressText: {
    fontSize: 14,
    color: '#64748b',
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
    backgroundColor: '#10b981',
  },
  collectionInfo: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  dataContainer: {
    maxHeight: 300,
  },
  dataItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dataType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  dataValue: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
    flex: 1,
  },
  dataSource: {
    fontSize: 12,
    color: '#64748b',
    flex: 1,
  },
  dataTime: {
    fontSize: 12,
    color: '#9ca3af',
    flex: 1,
  },
  noDataText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  permissionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  permissionLabel: {
    fontSize: 16,
    color: '#1e293b',
  },
  permissionStatus: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  permissionGranted: {
    backgroundColor: '#10b981',
  },
  permissionDenied: {
    backgroundColor: '#ef4444',
  },
  permissionButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 15,
    alignItems: 'center',
  },
  permissionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  scanButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    margin: 20,
    alignItems: 'center',
  },
  scanButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
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