import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { 
  getLinkStatus,
  syncWatchData,
  getDeviceInfo,
  LinkStatusResponse,
  DeviceInfo,
  WatchData
} from './api/endpoint';
import { testBackendConnection } from './api/client';
import userManager from './utils/userManager';

type UserDashboardScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'UserDashboard'>;

interface Props {
  navigation: UserDashboardScreenNavigationProp;
}

export default function UserDashboard({ navigation }: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'failed'>('unknown');
  
  // User data
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [linkStatus, setLinkStatus] = useState<LinkStatusResponse | null>(null);
  const [watchData, setWatchData] = useState<WatchData | null>(null);
  
  // Feature states
  const [watchDataEnabled, setWatchDataEnabled] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  
  // API call statuses
  const [deviceInfoStatus, setDeviceInfoStatus] = useState<'loading' | 'success' | 'error' | 'idle'>('idle');
  const [linkStatusStatus, setLinkStatusStatus] = useState<'loading' | 'success' | 'error' | 'idle'>('idle');

  useEffect(() => {
    checkAuthenticationAndInitialize();
  }, []);

  const checkAuthenticationAndInitialize = async () => {
    setIsLoading(true);
    try {
      console.log('🔍 Checking authentication status...');
      
      // Check if user is authenticated
      const isAuthenticated = await userManager.isAuthenticated();
      console.log(`🔐 Authentication status: ${isAuthenticated}`);
      
      if (!isAuthenticated) {
        console.log('❌ User not authenticated, redirecting to login');
        Alert.alert(
          'Authentication Required',
          'Please log in to access the dashboard',
          [
            {
              text: 'Go to Login',
              onPress: () => navigation.replace('Login')
            }
          ]
        );
        return;
      }
      
      // User is authenticated, proceed with dashboard initialization
      console.log('✅ User authenticated, initializing dashboard');
      await initializeDashboard();
      
    } catch (error) {
      console.error('❌ Authentication check failed:', error);
      Alert.alert(
        'Authentication Error',
        'Unable to verify authentication status. Please log in again.',
        [
          {
            text: 'Go to Login',
            onPress: () => navigation.replace('Login')
          }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const initializeDashboard = async () => {
    try {
      await testConnection();
      await loadUserData();
      await loadDeviceInfo();
      await loadLinkStatus();
    } catch (error) {
      console.error('Error initializing dashboard:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    }
  };

  const testConnection = async () => {
    try {
      console.log('🔄 Testing backend connection...');
      const result = await testBackendConnection();
      console.log('📊 Connection test result:', result);
      setConnectionStatus(result.success ? 'connected' : 'failed');
    } catch (error) {
      console.error('❌ Connection test error:', error);
      setConnectionStatus('failed');
    }
  };

  const loadUserData = async () => {
    try {
      const user = await userManager.getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadDeviceInfo = async () => {
    setDeviceInfoStatus('loading');
    try {
      console.log('📱 Loading device info...');
      const device = await getDeviceInfo();
      console.log('✅ Device info loaded:', device);
      setDeviceInfo(device);
      setDeviceInfoStatus('success');
    } catch (error: any) {
      console.error('❌ Error loading device info:', error);
      if (error.response?.status === 401) {
        console.log('🔐 Device info requires authentication - this is normal');
        setDeviceInfoStatus('error');
      } else {
        console.error('🔌 Device info connection failed:', error.message);
        setDeviceInfoStatus('error');
      }
    }
  };

  const loadLinkStatus = async () => {
    setLinkStatusStatus('loading');
    try {
      console.log('🔗 Loading link status...');
      const status = await getLinkStatus();
      console.log('✅ Link status loaded:', status);
      setLinkStatus(status);
      setLinkStatusStatus('success');
    } catch (error: any) {
      console.error('❌ Error loading link status:', error);
      if (error.response?.status === 401) {
        console.log('🔐 Link status requires authentication - this is normal for new users');
        setLinkStatusStatus('error');
      } else {
        console.error('🔌 Link status connection failed:', error.message);
        setLinkStatusStatus('error');
      }
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await initializeDashboard();
    setRefreshing(false);
  };

  const handleSyncWatchData = async () => {
    setSyncStatus('syncing');
    try {
      const response = await syncWatchData({
        user_id: currentUser?.userId || '',
        device_info: deviceInfo || {
          platform: Platform.OS as 'ios' | 'android' | 'web',
          device_id: 'unknown',
          device_name: 'Unknown Device',
          os_version: 'Unknown',
          app_version: '1.0.0'
        },
        watch_data: []
      });
      
      // Create mock watch data since the API doesn't return actual data
      const mockWatchData: WatchData = {
        heart_rate: 72,
        steps: 8500,
        calories: 450,
        sleep_hours: 7.5,
        activity_level: 'moderate',
        timestamp: new Date().toISOString()
      };
      
      setWatchData(mockWatchData);
      setWatchDataEnabled(true);
      setLastSyncTime(new Date().toLocaleString());
      setSyncStatus('success');
      Alert.alert('Success', `Watch data synced successfully! ${response.synced_count} records processed.`);
    } catch (error) {
      console.error('Error syncing watch data:', error);
      setSyncStatus('error');
      Alert.alert('Error', 'Failed to sync watch data');
    }
  };

  const handleToggleWatchData = () => {
    setWatchDataEnabled(!watchDataEnabled);
    if (!watchDataEnabled) {
      handleSyncWatchData();
    }
  };

  const handleImportData = () => {
    Alert.alert(
      'Import Data',
      'Choose data source:',
      [
        { text: 'Health App', onPress: () => navigation.navigate('DataImport', { source: 'health' }) },
        { text: 'CSV File', onPress: () => navigation.navigate('DataImport', { source: 'csv' }) },
        { text: 'Manual Entry', onPress: () => navigation.navigate('DataImport', { source: 'manual' }) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleViewData = () => {
    // navigation.navigate('DataVisualization');
    Alert.alert('Coming Soon', 'Data visualization feature is under development');
  };

  const handleManageDevices = () => {
    navigation.navigate('CrossDeviceLinking');
  };

  const handleWatchData = () => {
    navigation.navigate('WatchDataModule');
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const handleLogout = async () => {
    try {
      await userManager.logout();
      Alert.alert('Logged Out', 'You have been logged out.');
      navigation.navigate('Login'); // Navigate to login screen after logout
    } catch (error) {
      console.error('Error logging out:', error);
      Alert.alert('Error', 'Failed to log out.');
    }
  };

  const handleDebugTokens = async () => {
    try {
      console.log('🔍 Debugging tokens...');
      const tokenStatus = await userManager.validateTokens();
      
      Alert.alert(
        'Token Debug Info',
        `Access Token: ${tokenStatus.accessToken ? '✅ Found' : '❌ Missing'}\nRefresh Token: ${tokenStatus.refreshToken ? '✅ Found' : '❌ Missing'}\nPlatform: ${Platform.OS}`,
        [
          { text: 'OK' },
          { 
            text: 'Force Refresh', 
            onPress: async () => {
              const success = await userManager.forceTokenRefresh();
              Alert.alert('Force Refresh', success ? '✅ Success' : '❌ Failed');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Debug error:', error);
      Alert.alert('Debug Error', 'Failed to debug tokens');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Welcome to LifePattern</Text>
        <Text style={styles.subtitle}>
          {currentUser ? `User ID: ${currentUser.id}` : 'Getting started...'}
        </Text>
        
        {/* Connection Status */}
        <View style={styles.connectionStatus}>
          <View style={[
            styles.connectionIndicator, 
            connectionStatus === 'connected' && styles.connected,
            connectionStatus === 'failed' && styles.failed
          ]}>
            <Text style={styles.connectionText}>
              {connectionStatus === 'connected' ? '🔗 Connected' : 
               connectionStatus === 'failed' ? '❌ Disconnected' : 
               '⏳ Connecting...'}
            </Text>
          </View>
          {connectionStatus === 'failed' && (
            <TouchableOpacity style={styles.retryButton} onPress={testConnection}>
              <Text style={styles.retryButtonText}>Retry Connection</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {linkStatusStatus === 'loading' ? '⏳' : 
             linkStatusStatus === 'error' ? '❌' : 
             linkStatus?.active_tokens?.length || 0}
          </Text>
          <Text style={styles.statLabel}>
            {linkStatusStatus === 'loading' ? 'Loading...' : 
             linkStatusStatus === 'error' ? 'Auth Required' : 
             'Linked Devices'}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {watchDataEnabled ? '✓' : '✗'}
          </Text>
          <Text style={styles.statLabel}>Watch Sync</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {deviceInfoStatus === 'loading' ? '⏳' : 
             deviceInfoStatus === 'error' ? '❌' : 
             deviceInfo?.platform || 'Unknown'}
          </Text>
          <Text style={styles.statLabel}>
            {deviceInfoStatus === 'loading' ? 'Loading...' : 
             deviceInfoStatus === 'error' ? 'Auth Required' : 
             'Platform'}
          </Text>
        </View>
      </View>

      {/* Main Actions */}
      <View style={styles.actionsContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <TouchableOpacity style={styles.actionCard} onPress={handleImportData}>
          <Text style={styles.actionIcon}>📊</Text>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Import Data</Text>
            <Text style={styles.actionDescription}>
              Import health data from various sources
            </Text>
          </View>
          <Text style={styles.actionArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={handleViewData}>
          <Text style={styles.actionIcon}>📈</Text>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>View Data</Text>
            <Text style={styles.actionDescription}>
              Visualize your health patterns and insights
            </Text>
          </View>
          <Text style={styles.actionArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={handleManageDevices}>
          <Text style={styles.actionIcon}>🔗</Text>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Manage Devices</Text>
            <Text style={styles.actionDescription}>
              Link and manage your devices
            </Text>
          </View>
          <Text style={styles.actionArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={handleWatchData}>
          <Text style={styles.actionIcon}>⌚</Text>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Watch Data</Text>
            <Text style={styles.actionDescription}>
              Connect and sync smartwatch data
            </Text>
          </View>
          <Text style={styles.actionArrow}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Watch Data Section */}
      <View style={styles.watchSection}>
        <Text style={styles.sectionTitle}>Smartwatch Integration</Text>
        
        <View style={styles.watchCard}>
          <View style={styles.watchHeader}>
            <Text style={styles.watchTitle}>Apple Watch / Fitbit</Text>
            <TouchableOpacity 
              style={[styles.toggleButton, watchDataEnabled && styles.toggleActive]}
              onPress={handleToggleWatchData}
            >
              <Text style={styles.toggleText}>
                {watchDataEnabled ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.watchDescription}>
            Automatically sync health data from your smartwatch
          </Text>
          
          {watchDataEnabled && (
            <View style={styles.watchStatus}>
              <Text style={styles.watchStatusText}>
                Last sync: {lastSyncTime || 'Never'}
              </Text>
              {syncStatus === 'syncing' && (
                <ActivityIndicator size="small" color="#007AFF" />
              )}
            </View>
          )}
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.activitySection}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        
        <View style={styles.activityCard}>
          <Text style={styles.activityText}>
            {currentUser ? 
              `Account created successfully! You can now start tracking your health patterns.` :
              'Welcome! Complete your profile to get started.'
            }
          </Text>
        </View>
      </View>

      {/* Settings Section */}
      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>Settings</Text>
        
        <TouchableOpacity style={styles.settingsButton} onPress={handleSettings}>
          <Text style={styles.settingsButtonText}>⚙️ App Settings</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.settingsButton, { marginTop: 12, backgroundColor: '#ff6b6b' }]} 
          onPress={handleLogout}
        >
          <Text style={[styles.settingsButtonText, { color: '#fff' }]}>🚪 Logout</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.settingsButton, { marginTop: 12, backgroundColor: '#6c757d' }]} 
          onPress={handleDebugTokens}
        >
          <Text style={[styles.settingsButtonText, { color: '#fff' }]}>🔧 Debug Tokens</Text>
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
    marginBottom: 16,
  },
  connectionStatus: {
    alignItems: 'center',
  },
  connectionIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  connected: {
    backgroundColor: '#d4edda',
  },
  failed: {
    backgroundColor: '#f8d7da',
  },
  connectionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  actionsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  actionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: '#666',
  },
  actionArrow: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  watchSection: {
    padding: 20,
  },
  watchCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  watchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  watchTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  toggleActive: {
    backgroundColor: '#007AFF',
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  watchDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  watchStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  watchStatusText: {
    fontSize: 12,
    color: '#666',
  },
  activitySection: {
    padding: 20,
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  settingsSection: {
    padding: 20,
    paddingBottom: 40,
  },
  settingsButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  settingsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  retryButton: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
}); 