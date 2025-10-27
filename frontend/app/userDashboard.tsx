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
  getUserInsights,
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
    try {
      // Navigate to DataImport without a source to show all options
      navigation.navigate('DataImport', {});
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Error', 'Unable to navigate to Data Import. Please try again.');
    }
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
    <View style={styles.wrapper}>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <View style={styles.appIcon}>
                <Text style={styles.appIconText}>🧠</Text>
              </View>
              <Text style={styles.title}>Dashboard</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
                <Text style={styles.refreshIcon}>🔄</Text>
              </TouchableOpacity>
              <View style={styles.profilePic}>
                <Text style={styles.profilePicText}>👤</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Connection Status */}
        <View style={styles.connectionSection}>
          <View style={styles.connectionHeader}>
            <Text style={styles.sectionTitle}>Connection Status</Text>
            <View style={[styles.statusBadge, connectionStatus === 'connected' && styles.statusConnected]}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>
                {connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
              </Text>
            </View>
          </View>
          
          <View style={styles.statusCards}>
            <View style={[styles.statusCard, styles.statusCardBlue]}>
              <Text style={styles.statusCardIcon}>🔗</Text>
              <Text style={styles.statusCardLabel}>API Status</Text>
              <Text style={styles.statusCardValue}>Active</Text>
            </View>
            
            <View style={[styles.statusCard, styles.statusCardGreen]}>
              <Text style={styles.statusCardIcon}>🛡️</Text>
              <Text style={styles.statusCardLabel}>Auth Token</Text>
              <Text style={styles.statusCardValue}>Valid</Text>
            </View>
          </View>
        </View>

        {/* Linked Devices */}
        <View style={styles.devicesSection}>
          <View style={styles.devicesSectionHeader}>
            <Text style={styles.sectionTitle}>Linked Devices</Text>
            <View style={styles.devicesBadge}>
              <Text style={styles.devicesBadgeText}>
                {linkStatus?.active_tokens?.length || 3} Connected
              </Text>
            </View>
          </View>
          
          <View style={styles.deviceCard}>
            <View style={[styles.deviceIconContainer, { backgroundColor: '#dbeafe' }]}>
              <Text style={styles.deviceIcon}>⌚</Text>
            </View>
            <View style={styles.deviceInfo}>
              <Text style={styles.deviceName}>Apple Watch</Text>
              <Text style={styles.deviceSync}>Last sync: 2 min ago</Text>
            </View>
            <View style={[styles.deviceStatus, styles.deviceStatusGreen]} />
          </View>

          <View style={styles.deviceCard}>
            <View style={[styles.deviceIconContainer, { backgroundColor: '#fee2e2' }]}>
              <Text style={styles.deviceIcon}>📱</Text>
            </View>
            <View style={styles.deviceInfo}>
              <Text style={styles.deviceName}>iPhone 14</Text>
              <Text style={styles.deviceSync}>Last sync: 5 min ago</Text>
            </View>
            <View style={[styles.deviceStatus, styles.deviceStatusGreen]} />
          </View>

          <View style={styles.deviceCard}>
            <View style={[styles.deviceIconContainer, { backgroundColor: '#e9d5ff' }]}>
              <Text style={styles.deviceIcon}>🛏️</Text>
            </View>
            <View style={styles.deviceInfo}>
              <Text style={styles.deviceName}>Sleep Tracker</Text>
              <Text style={styles.deviceSync}>Last sync: 1 hour ago</Text>
            </View>
            <View style={[styles.deviceStatus, styles.deviceStatusOrange]} />
          </View>
        </View>

        {/* Platform Status */}
        <View style={styles.platformSection}>
          <View style={styles.platformHeader}>
            <View style={styles.platformIconContainer}>
              <Text style={styles.platformIcon}>🖥️</Text>
            </View>
            <View>
              <Text style={styles.platformTitle}>Platform Status</Text>
              <Text style={styles.platformVersion}>AI Engine v2.1.4</Text>
            </View>
          </View>
          
          <View style={styles.platformMetrics}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Uptime</Text>
              <Text style={styles.metricValue}>99.9%</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Response</Text>
              <Text style={styles.metricValue}>120ms</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Load</Text>
              <Text style={styles.metricValue}>Low</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity style={styles.quickActionCard} onPress={handleImportData}>
              <View style={[styles.quickActionIcon, { backgroundColor: '#dbeafe' }]}>
                <Text style={styles.quickActionIconText}>⬇️</Text>
              </View>
              <Text style={styles.quickActionTitle}>Import Data</Text>
              <Text style={styles.quickActionDesc}>Upload health data files</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionCard} onPress={handleViewData}>
              <View style={[styles.quickActionIcon, { backgroundColor: '#d1fae5' }]}>
                <Text style={styles.quickActionIconText}>📈</Text>
              </View>
              <Text style={styles.quickActionTitle}>View Charts</Text>
              <Text style={styles.quickActionDesc}>Data visualizations</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionCard} onPress={handleManageDevices}>
              <View style={[styles.quickActionIcon, { backgroundColor: '#e9d5ff' }]}>
                <Text style={styles.quickActionIconText}>⚙️</Text>
              </View>
              <Text style={styles.quickActionTitle}>Manage Devices</Text>
              <Text style={styles.quickActionDesc}>Configure connections</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionCard} onPress={handleSyncWatchData}>
              <View style={[styles.quickActionIcon, { backgroundColor: '#fed7aa' }]}>
                <Text style={styles.quickActionIconText}>🔄</Text>
              </View>
              <Text style={styles.quickActionTitle}>Sync Watch</Text>
              <Text style={styles.quickActionDesc}>Update smartwatch data</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionCard} onPress={() => navigation.navigate('AutomationSettings')}>
              <View style={[styles.quickActionIcon, { backgroundColor: '#fae8ff' }]}>
                <Text style={styles.quickActionIconText}>⚡</Text>
              </View>
              <Text style={styles.quickActionTitle}>Automation</Text>
              <Text style={styles.quickActionDesc}>Smart data collection</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionCard} onPress={async () => {
              try {
                // Fetch the latest AI insights for the user
                const userId = currentUser?.userId || await userManager.getUserId();
                if (!userId) {
                  Alert.alert('Error', 'Unable to retrieve user ID. Please log in again.');
                  return;
                }

                setIsLoading(true);
                const insights = await getUserInsights(userId, 1); // Get the latest insight
                
                if (insights.insights && insights.insights.length > 0) {
                  const latestInsight = insights.insights[0];
                  
                  // Parse the AI service response
                  let aiResponse;
                  try {
                    aiResponse = typeof latestInsight.ai_report.ai_service_response === 'string'
                      ? JSON.parse(latestInsight.ai_report.ai_service_response)
                      : latestInsight.ai_report.ai_service_response;
                  } catch (parseError) {
                    console.error('Error parsing AI response:', parseError);
                    aiResponse = {
                      is_anomaly: latestInsight.ai_report.is_anomaly,
                      confidence_score: latestInsight.ai_report.confidence_score,
                      anomaly_type: latestInsight.ai_report.anomaly_type,
                      recommendations: latestInsight.ai_report.recommendations,
                      enhanced_recommendations: [],
                      behavioral_contexts: [],
                      timestamp: new Date().toISOString(),
                      drift_analysis: {},
                      baseline_comparison: {},
                    };
                  }
                  
                  // Navigate to AI Insights screen
                  navigation.navigate('AIInsights', {
                    aiResponse,
                    logId: latestInsight.routine_log.log_id || latestInsight.routine_log.id || 0,
                    userId,
                  });
                } else {
                  // No insights available yet
                  Alert.alert(
                    'No Insights Yet',
                    'Submit health data to see AI-powered insights and drift detection. Your analysis will appear here automatically.',
                    [
                      { text: 'Submit Data', onPress: handleImportData },
                      { text: 'OK', style: 'cancel' }
                    ]
                  );
                }
              } catch (error) {
                console.error('Error fetching AI insights:', error);
                Alert.alert(
                  'No Insights Available',
                  'Submit health data to see AI-powered insights and drift detection.',
                  [
                    { text: 'Submit Data', onPress: handleImportData },
                    { text: 'OK', style: 'cancel' }
                  ]
                );
              } finally {
                setIsLoading(false);
              }
            }}>
              <View style={[styles.quickActionIcon, { backgroundColor: '#ddd6fe' }]}>
                <Text style={styles.quickActionIconText}>🤖</Text>
              </View>
              <Text style={styles.quickActionTitle}>AI Insights</Text>
              <Text style={styles.quickActionDesc}>View health analysis</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Debug Info */}
        <View style={styles.debugSection}>
          <View style={styles.debugHeader}>
            <Text style={styles.debugTitle}>Debug Info</Text>
            <TouchableOpacity onPress={handleDebugTokens}>
              <Text style={styles.debugEye}>👁️</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>Token:</Text>
            <Text style={styles.debugValueGreen}>eyJ0eXAi...valid</Text>
          </View>
          <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>Session:</Text>
            <Text style={styles.debugValueBlue}>Active (2h 34m)</Text>
          </View>
          <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>API Calls:</Text>
            <Text style={styles.debugValueYellow}>247 today</Text>
          </View>
        </View>

        {/* App Modules */}
        <View style={styles.modulesSection}>
          <Text style={styles.sectionTitle}>App Modules</Text>
          
          <TouchableOpacity style={styles.moduleCard} onPress={handleImportData}>
            <View style={styles.moduleIconContainer}>
              <Text style={styles.moduleIcon}>💾</Text>
            </View>
            <View style={styles.moduleInfo}>
              <Text style={styles.moduleName}>DataImport Module</Text>
              <Text style={styles.moduleDesc}>Import and process health data</Text>
            </View>
            <Text style={styles.moduleChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.moduleCard} onPress={handleWatchData}>
            <View style={styles.moduleIconContainer}>
              <Text style={styles.moduleIcon}>⌚</Text>
            </View>
            <View style={styles.moduleInfo}>
              <Text style={styles.moduleName}>WatchData Module</Text>
              <Text style={styles.moduleDesc}>Smartwatch data management</Text>
            </View>
            <Text style={styles.moduleChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.moduleCard} onPress={handleManageDevices}>
            <View style={styles.moduleIconContainer}>
              <Text style={styles.moduleIcon}>🔗</Text>
            </View>
            <View style={styles.moduleInfo}>
              <Text style={styles.moduleName}>CrossDevice Linking</Text>
              <Text style={styles.moduleDesc}>Multi-device synchronization</Text>
            </View>
            <Text style={styles.moduleChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.moduleCard} onPress={handleSettings}>
            <View style={styles.moduleIconContainer}>
              <Text style={styles.moduleIcon}>⚙️</Text>
            </View>
            <View style={styles.moduleInfo}>
              <Text style={styles.moduleName}>Settings</Text>
              <Text style={styles.moduleDesc}>App configuration and preferences</Text>
            </View>
            <Text style={styles.moduleChevron}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navTab} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navTab} onPress={() => navigation.navigate('UserDashboard')}>
          <Text style={[styles.navIcon, styles.navIconActive]}>📊</Text>
          <Text style={[styles.navLabel, styles.navLabelActive]}>Dashboard</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.centerNavButton} onPress={handleImportData}>
          <View style={styles.centerNavButtonInner}>
            <Text style={styles.centerNavIcon}>+</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navTab} onPress={handleWatchData}>
          <Text style={styles.navIcon}>🎯</Text>
          <Text style={styles.navLabel}>Goals</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navTab} onPress={handleSettings}>
          <Text style={styles.navIcon}>👤</Text>
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 90,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  // Header
  header: {
    backgroundColor: '#ffffff',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  appIconText: {
    fontSize: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshIcon: {
    fontSize: 20,
  },
  profilePic: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePicText: {
    fontSize: 22,
  },
  // Connection Status
  connectionSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  connectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#fee2e2',
    gap: 6,
  },
  statusConnected: {
    backgroundColor: '#d1fae5',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065f46',
  },
  statusCards: {
    flexDirection: 'row',
    gap: 12,
  },
  statusCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
  },
  statusCardBlue: {
    backgroundColor: '#eff6ff',
  },
  statusCardGreen: {
    backgroundColor: '#d1fae5',
  },
  statusCardIcon: {
    fontSize: 20,
    marginBottom: 8,
  },
  statusCardLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  statusCardValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  // Linked Devices
  devicesSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  devicesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  devicesBadge: {
    backgroundColor: '#6366f1',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  devicesBadgeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  deviceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  deviceIcon: {
    fontSize: 24,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  deviceSync: {
    fontSize: 13,
    color: '#6b7280',
  },
  deviceStatus: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  deviceStatusGreen: {
    backgroundColor: '#10b981',
  },
  deviceStatusOrange: {
    backgroundColor: '#f59e0b',
  },
  // Platform Status
  platformSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  platformHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  platformIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  platformIcon: {
    fontSize: 28,
  },
  platformTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  platformVersion: {
    fontSize: 14,
    color: '#6b7280',
  },
  platformMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  // Quick Actions
  quickActionsSection: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionIconText: {
    fontSize: 24,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  quickActionDesc: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  // Debug Section
  debugSection: {
    backgroundColor: '#1f2937',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
  },
  debugHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  debugTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  debugEye: {
    fontSize: 20,
  },
  debugRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  debugLabel: {
    fontSize: 14,
    color: '#9ca3af',
  },
  debugValueGreen: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  debugValueBlue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  debugValueYellow: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fbbf24',
  },
  // App Modules
  modulesSection: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
  },
  moduleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  moduleIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  moduleIcon: {
    fontSize: 28,
  },
  moduleInfo: {
    flex: 1,
  },
  moduleName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  moduleDesc: {
    fontSize: 13,
    color: '#6b7280',
  },
  moduleChevron: {
    fontSize: 32,
    color: '#d1d5db',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 70,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  navTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  navIcon: {
    fontSize: 24,
    marginBottom: 4,
    opacity: 0.5,
  },
  navIconActive: {
    opacity: 1,
  },
  navLabel: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  navLabelActive: {
    color: '#6366f1',
    fontWeight: '600',
  },
  centerNavButton: {
    width: 56,
    height: 56,
    marginTop: -20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerNavButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  centerNavIcon: {
    fontSize: 28,
    color: '#ffffff',
    fontWeight: 'bold',
  },
}); 