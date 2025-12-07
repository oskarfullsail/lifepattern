/**
 * Health Permissions Screen
 * Request and manage Apple Health / Google Fit permissions
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
  Linking,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation';

type HealthPermissionsNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'HealthPermissions'
>;

interface Props {
  navigation: HealthPermissionsNavigationProp;
}

interface PermissionStatus {
  sleep: 'granted' | 'denied' | 'not_determined' | 'unavailable';
  steps: 'granted' | 'denied' | 'not_determined' | 'unavailable';
  heartRate: 'granted' | 'denied' | 'not_determined' | 'unavailable';
  workout: 'granted' | 'denied' | 'not_determined' | 'unavailable';
  water: 'granted' | 'denied' | 'not_determined' | 'unavailable';
}

export default function HealthPermissions({ navigation }: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);
  const [permissions, setPermissions] = useState<PermissionStatus>({
    sleep: 'not_determined',
    steps: 'not_determined',
    heartRate: 'not_determined',
    workout: 'not_determined',
    water: 'not_determined',
  });

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      setIsLoading(true);

      if (Platform.OS === 'ios') {
        // Check HealthKit availability
        try {
          const AppleHealthKit = require('rn-apple-healthkit').default;

          // HealthKit availability check
          AppleHealthKit.isAvailable((err: any, available: boolean) => {
            if (err || !available) {
              setPermissions({
                sleep: 'unavailable',
                steps: 'unavailable',
                heartRate: 'unavailable',
                workout: 'unavailable',
                water: 'unavailable',
              });
            }
            setIsLoading(false);
          });
        } catch (error) {
          console.log('HealthKit not available:', error);
          setPermissions({
            sleep: 'unavailable',
            steps: 'unavailable',
            heartRate: 'unavailable',
            workout: 'unavailable',
            water: 'unavailable',
          });
          setIsLoading(false);
        }
      } else if (Platform.OS === 'android') {
        // Check Google Fit availability
        setIsLoading(false);
      } else {
        // Web - Health not available
        setPermissions({
          sleep: 'unavailable',
          steps: 'unavailable',
          heartRate: 'unavailable',
          workout: 'unavailable',
          water: 'unavailable',
        });
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      setIsLoading(false);
    }
  };

  const requestAllPermissions = async () => {
    try {
      setIsRequesting(true);

      if (Platform.OS === 'ios') {
        try {
          const AppleHealthKit = require('rn-apple-healthkit').default;

          const permissions = {
            permissions: {
              read: [
                AppleHealthKit.Constants.Permissions.SleepAnalysis,
                AppleHealthKit.Constants.Permissions.Steps,
                AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
                AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
                AppleHealthKit.Constants.Permissions.Water,
                AppleHealthKit.Constants.Permissions.HeartRate,
              ],
            },
          };

          AppleHealthKit.initHealthKit(permissions, (error: string) => {
            setIsRequesting(false);

            if (error) {
              console.error('HealthKit init error:', error);
              Alert.alert(
                'Permission Error',
                'Could not get Health permissions. Please enable them in Settings > Privacy > Health.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Open Settings', onPress: () => Linking.openSettings() },
                ]
              );
            } else {
              Alert.alert(
                'Success',
                'Health permissions granted! Your health data will now sync automatically.',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
              );

              // Update permission states
              setPermissions({
                sleep: 'granted',
                steps: 'granted',
                heartRate: 'granted',
                workout: 'granted',
                water: 'granted',
              });
            }
          });
        } catch (error) {
          setIsRequesting(false);
          console.error('Error requesting HealthKit permissions:', error);
          Alert.alert('Error', 'Failed to request Health permissions. Please try again.');
        }
      } else if (Platform.OS === 'android') {
        try {
          const GoogleFit = require('react-native-google-fit').default;

          const options = {
            scopes: [
              'https://www.googleapis.com/auth/fitness.activity.read',
              'https://www.googleapis.com/auth/fitness.sleep.read',
              'https://www.googleapis.com/auth/fitness.nutrition.read',
              'https://www.googleapis.com/auth/fitness.heart_rate.read',
            ],
          };

          const result = await GoogleFit.authorize(options);
          setIsRequesting(false);

          if (result.success) {
            Alert.alert(
              'Success',
              'Google Fit permissions granted! Your health data will now sync automatically.',
              [{ text: 'OK', onPress: () => navigation.goBack() }]
            );

            setPermissions({
              sleep: 'granted',
              steps: 'granted',
              heartRate: 'granted',
              workout: 'granted',
              water: 'granted',
            });
          } else {
            Alert.alert('Permission Denied', 'Could not get Google Fit permissions.');
          }
        } catch (error) {
          setIsRequesting(false);
          console.error('Error requesting Google Fit permissions:', error);
          Alert.alert('Error', 'Failed to request Google Fit permissions.');
        }
      }
    } catch (error) {
      setIsRequesting(false);
      console.error('Error requesting permissions:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'granted':
        return '#22c55e';
      case 'denied':
        return '#ef4444';
      case 'unavailable':
        return '#94a3b8';
      default:
        return '#f59e0b';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'granted':
        return 'Granted';
      case 'denied':
        return 'Denied';
      case 'unavailable':
        return 'Not Available';
      default:
        return 'Not Set';
    }
  };

  const platformName = Platform.OS === 'ios' ? 'Apple Health' : 'Google Fit';
  const platformIcon = Platform.OS === 'ios' ? '❤️' : '🏃';

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7c3aed" />
        <Text style={styles.loadingText}>Checking permissions...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Health Permissions</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {/* Header Card */}
        <View style={styles.heroCard}>
          <Text style={styles.heroIcon}>{platformIcon}</Text>
          <Text style={styles.heroTitle}>Connect {platformName}</Text>
          <Text style={styles.heroDescription}>
            Allow LifePattern to read your health data for personalized insights and
            recommendations.
          </Text>
        </View>

        {/* Permissions List */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Requested Permissions</Text>

          {[
            { key: 'sleep' as const, icon: '😴', title: 'Sleep Data', description: 'Sleep duration and quality' },
            { key: 'steps' as const, icon: '👣', title: 'Steps', description: 'Daily step count' },
            { key: 'heartRate' as const, icon: '❤️', title: 'Heart Rate', description: 'Heart rate measurements' },
            { key: 'workout' as const, icon: '🏋️', title: 'Workouts', description: 'Exercise and activity data' },
            { key: 'water' as const, icon: '💧', title: 'Hydration', description: 'Water intake tracking' },
          ].map(item => (
            <View key={item.key} style={styles.permissionRow}>
              <Text style={styles.permissionIcon}>{item.icon}</Text>
              <View style={styles.permissionInfo}>
                <Text style={styles.permissionTitle}>{item.title}</Text>
                <Text style={styles.permissionDescription}>{item.description}</Text>
              </View>
              <View style={styles.statusBadge}>
                <View
                  style={[styles.statusDot, { backgroundColor: getStatusColor(permissions[item.key]) }]}
                />
                <Text
                  style={[styles.statusText, { color: getStatusColor(permissions[item.key]) }]}
                >
                  {getStatusText(permissions[item.key])}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Request Button */}
        <TouchableOpacity
          style={[styles.requestButton, isRequesting && styles.requestButtonDisabled]}
          onPress={requestAllPermissions}
          disabled={isRequesting || permissions.sleep === 'unavailable'}
        >
          {isRequesting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.requestButtonText}>
              {permissions.sleep === 'granted' ? '✓ Permissions Granted' : `Connect ${platformName}`}
            </Text>
          )}
        </TouchableOpacity>

        {permissions.sleep === 'unavailable' && (
          <View style={styles.warningCard}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningText}>
              {Platform.OS === 'web'
                ? 'Health data is not available on web. Please use the mobile app to sync your health data.'
                : `${platformName} is not available on this device.`}
            </Text>
          </View>
        )}

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>🔒</Text>
          <Text style={styles.infoText}>
            Your health data stays on your device. We only read the data you allow and never share
            it with third parties.
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
  heroCard: {
    backgroundColor: '#7c3aed',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  heroIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  heroDescription: {
    fontSize: 15,
    color: '#e9d5ff',
    textAlign: 'center',
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  permissionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  permissionInfo: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  permissionDescription: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  statusBadge: {
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
    fontSize: 13,
    fontWeight: '500',
  },
  requestButton: {
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  requestButtonDisabled: {
    opacity: 0.6,
  },
  requestButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  warningIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#991b1b',
    lineHeight: 20,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#166534',
    lineHeight: 20,
  },
});

