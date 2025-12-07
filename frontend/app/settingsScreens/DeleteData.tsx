/**
 * Delete Data Screen
 * Allows users to delete specific data entries or all data
 */
import React, { useState } from 'react';
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
import { CommonActions } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import userManager from '../utils/userManager';
import { setBiometricLoginEnabled } from '../utils/biometricAuth';

type DeleteDataNavigationProp = NativeStackNavigationProp<RootStackParamList, 'DeleteData'>;

interface Props {
  navigation: DeleteDataNavigationProp;
}

type DataType = 'routine_logs' | 'settings' | 'all_local' | 'account';

export default function DeleteData({ navigation }: Props) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingType, setDeletingType] = useState<DataType | null>(null);

  const handleDeleteData = async (type: DataType) => {
    const messages: Record<DataType, { title: string; message: string }> = {
      routine_logs: {
        title: 'Delete Routine Logs',
        message:
          'This will delete all your health and routine logs from this device. This action cannot be undone.',
      },
      settings: {
        title: 'Reset Settings',
        message:
          'This will reset all app settings to default values, including notification preferences and sync settings.',
      },
      all_local: {
        title: 'Delete All Local Data',
        message:
          'This will delete all your data stored on this device, including logs, settings, and cached data. Your account will remain active.',
      },
      account: {
        title: 'Delete Account',
        message:
          'This will permanently delete your account and all associated data from our servers. This action cannot be undone.',
      },
    };

    const { title, message } = messages[type];

    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => confirmDelete(type),
      },
    ]);
  };

  const confirmDelete = async (type: DataType) => {
    try {
      setIsDeleting(true);
      setDeletingType(type);

      switch (type) {
        case 'routine_logs':
          // Clear routine logs from AsyncStorage
          await AsyncStorage.removeItem('@routine_logs');
          await AsyncStorage.removeItem('@cached_insights');
          Alert.alert('Success', 'Routine logs have been deleted.');
          break;

        case 'settings':
          // Clear settings
          await AsyncStorage.removeItem('@health_sync_settings');
          await AsyncStorage.removeItem('@notification_settings');
          await AsyncStorage.removeItem('@privacy_settings');
          await AsyncStorage.removeItem('@screen_time_goals');
          await AsyncStorage.removeItem('@ai_coach_settings');
          Alert.alert('Success', 'Settings have been reset to defaults.');
          break;

        case 'all_local':
          // Clear all local data except credentials
          const keys = await AsyncStorage.getAllKeys();
          const keysToDelete = keys.filter(
            key =>
              !key.includes('userSession') &&
              !key.includes('userCredentials') &&
              !key.includes('accessToken') &&
              !key.includes('refreshToken')
          );
          await AsyncStorage.multiRemove(keysToDelete);
          Alert.alert('Success', 'All local data has been deleted.');
          break;

        case 'account':
          // Delete account from backend and clear all local data
          try {
            // TODO: Call backend API to delete account
            // await apiClient.delete('/api/auth/account');

            // Clear biometric settings
            await setBiometricLoginEnabled(false);

            // Clear all local data
            await userManager.clearSession();

            Alert.alert('Account Deleted', 'Your account and all data have been deleted.', [
              {
                text: 'OK',
                onPress: () => {
                  navigation.dispatch(
                    CommonActions.reset({
                      index: 0,
                      routes: [{ name: 'Home' }],
                    })
                  );
                },
              },
            ]);
          } catch (error) {
            console.error('Error deleting account:', error);
            Alert.alert('Error', 'Failed to delete account. Please try again.');
          }
          break;
      }
    } catch (error) {
      console.error('Error deleting data:', error);
      Alert.alert('Error', 'Failed to delete data. Please try again.');
    } finally {
      setIsDeleting(false);
      setDeletingType(null);
    }
  };

  const DeleteOption = ({
    type,
    icon,
    title,
    description,
    danger = false,
  }: {
    type: DataType;
    icon: string;
    title: string;
    description: string;
    danger?: boolean;
  }) => (
    <TouchableOpacity
      style={[styles.optionCard, danger && styles.dangerCard]}
      onPress={() => handleDeleteData(type)}
      disabled={isDeleting}
    >
      <View style={styles.optionContent}>
        <Text style={styles.optionIcon}>{icon}</Text>
        <View style={styles.optionInfo}>
          <Text style={[styles.optionTitle, danger && styles.dangerText]}>{title}</Text>
          <Text style={styles.optionDescription}>{description}</Text>
        </View>
      </View>
      {isDeleting && deletingType === type ? (
        <ActivityIndicator color="#7c3aed" />
      ) : (
        <Text style={[styles.optionArrow, danger && styles.dangerText]}>→</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Delete Data</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Manage Your Data</Text>
        <Text style={styles.sectionDescription}>
          Choose what data you want to delete. Some actions cannot be undone.
        </Text>

        <View style={styles.section}>
          <Text style={styles.cardTitle}>Local Data</Text>

          <DeleteOption
            type="routine_logs"
            icon="📊"
            title="Delete Routine Logs"
            description="Remove all health and routine data from this device"
          />

          <DeleteOption
            type="settings"
            icon="⚙️"
            title="Reset App Settings"
            description="Reset all preferences to default values"
          />

          <DeleteOption
            type="all_local"
            icon="📱"
            title="Delete All Local Data"
            description="Clear all cached data and logs from this device"
            danger
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.cardTitle}>Account</Text>

          <DeleteOption
            type="account"
            icon="💥"
            title="Delete My Account"
            description="Permanently delete your account and all data"
            danger
          />
        </View>

        <View style={styles.warningCard}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={styles.warningText}>
            Deleting your account is permanent and cannot be reversed. All your health data,
            insights, and preferences will be lost forever.
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
    marginBottom: 24,
    lineHeight: 22,
  },
  section: {
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  dangerCard: {
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fff',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  optionArrow: {
    fontSize: 18,
    color: '#7c3aed',
    fontWeight: '600',
    marginLeft: 12,
  },
  dangerText: {
    color: '#dc2626',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
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
});

