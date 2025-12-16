import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  Platform,
  Linking,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CommonActions } from '@react-navigation/native';
import { RootStackParamList } from '../navigation';
import userManager from './utils/userManager';
import {
  checkBiometricSupport,
  isBiometricLoginEnabled,
  setBiometricLoginEnabled,
  BiometricCapabilities,
} from './utils/biometricAuth';

type SettingsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

interface Props {
  navigation: SettingsScreenNavigationProp;
}

export default function Settings({ navigation }: Props) {
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [biometricCapabilities, setBiometricCapabilities] = useState<BiometricCapabilities>({
    isSupported: false,
    isEnrolled: false,
    types: [],
    typeLabel: '',
  });
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    loadBiometricSettings();
  }, []);

  const loadBiometricSettings = async () => {
    try {
      const capabilities = await checkBiometricSupport();
      setBiometricCapabilities(capabilities);

      if (capabilities.isSupported && capabilities.isEnrolled) {
        const enabled = await isBiometricLoginEnabled();
        setBiometricEnabledState(enabled);
      }
    } catch (error) {
      console.error('Error loading biometric settings:', error);
    }
  };

  const handleBiometricToggle = async (value: boolean) => {
    try {
      if (value) {
        // Enable biometric login
        await setBiometricLoginEnabled(true);
        setBiometricEnabledState(true);
        Alert.alert(
          'Biometric Login Enabled',
          `You can now use ${biometricCapabilities.typeLabel} to log in quickly.`,
          [{ text: 'OK' }]
        );
      } else {
        // Disable biometric login
        await setBiometricLoginEnabled(false);
        setBiometricEnabledState(false);
        Alert.alert(
          'Biometric Login Disabled',
          'You will need to use your password to log in.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error toggling biometric login:', error);
      Alert.alert('Error', 'Failed to update biometric login setting.');
    }
  };

  const performLogout = async () => {
    // Prevent double logout
    if (isLoggingOut) {
      console.log('⚠️ Logout already in progress, skipping');
      return;
    }
    
    setIsLoggingOut(true);
    
    try {
      console.log('🚪 Starting logout...');

      // Clear session completely
      await userManager.logout();

      console.log('✅ Logout complete, navigating to Home');

      // Use CommonActions to reset the navigation state
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        })
      );
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Still try to navigate even on error
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        })
      );
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleLogout = () => {
    // Prevent triggering if already logging out
    if (isLoggingOut) {
      return;
    }
    
    if (Platform.OS === 'web') {
      // Use browser confirm for web
      if (window.confirm('Are you sure you want to logout?')) {
        performLogout();
      }
    } else {
      // Use native Alert for iOS/Android
      Alert.alert(
        'Logout',
        'Are you sure you want to logout?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Logout',
            style: 'destructive',
            onPress: performLogout
          }
        ]
      );
    }
  };

  const performDeleteAccount = async () => {
    try {
      // TODO: Call backend to delete account
      await userManager.logout();
      
      if (Platform.OS === 'web') {
        window.alert('Your account has been deleted.');
      } else {
        Alert.alert('Account Deleted', 'Your account has been deleted.');
      }
      
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        })
      );
    } catch (error) {
      console.error('❌ Delete account error:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to delete account. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to delete account. Please try again.');
      }
    }
  };

  const handleDeleteAccount = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('This action cannot be undone. Are you sure you want to delete your account?')) {
        performDeleteAccount();
      }
    } else {
      Alert.alert(
        'Delete Account',
        'This action cannot be undone. Are you sure you want to delete your account?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Delete', 
            style: 'destructive',
            onPress: performDeleteAccount
          }
        ]
      );
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>
          Manage your account and preferences
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security</Text>
        
        {biometricCapabilities.isSupported && biometricCapabilities.isEnrolled && (
          <View style={styles.settingItem}>
            <Text style={styles.settingIcon}>
              {biometricCapabilities.typeLabel.includes('Face') ? '👤' : '👆'}
            </Text>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>
                {biometricCapabilities.typeLabel} Login
              </Text>
              <Text style={styles.settingDescription}>
                Use {biometricCapabilities.typeLabel} for quick and secure login
              </Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={handleBiometricToggle}
              trackColor={{ false: '#767577', true: '#34C759' }}
              thumbColor={biometricEnabled ? '#fff' : '#f4f3f4'}
            />
          </View>
        )}

        {Platform.OS === 'web' && (
          <View style={styles.settingItem}>
            <Text style={styles.settingIcon}>🔐</Text>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Biometric Login</Text>
              <Text style={styles.settingDescription}>
                Not available on web platform
              </Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        
        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.settingIcon}>👤</Text>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Profile</Text>
            <Text style={styles.settingDescription}>Manage your profile information</Text>
          </View>
          <Text style={styles.settingArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => navigation.navigate('ConnectedDevices')}
        >
          <Text style={styles.settingIcon}>🔗</Text>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Connected Devices</Text>
            <Text style={styles.settingDescription}>Manage your linked devices</Text>
          </View>
          <Text style={styles.settingArrow}>→</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data & Privacy</Text>
        
        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => navigation.navigate('DataExport')}
        >
          <Text style={styles.settingIcon}>📊</Text>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Data Export</Text>
            <Text style={styles.settingDescription}>Download your health data</Text>
          </View>
          <Text style={styles.settingArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => navigation.navigate('PrivacySettings')}
        >
          <Text style={styles.settingIcon}>🔒</Text>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Privacy Settings</Text>
            <Text style={styles.settingDescription}>Manage data sharing preferences</Text>
          </View>
          <Text style={styles.settingArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => navigation.navigate('DeleteData')}
        >
          <Text style={styles.settingIcon}>🗑️</Text>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Delete Data</Text>
            <Text style={styles.settingDescription}>Remove specific data entries</Text>
          </View>
          <Text style={styles.settingArrow}>→</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Settings</Text>
        
        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Text style={styles.settingIcon}>🔔</Text>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Notifications</Text>
            <Text style={styles.settingDescription}>Manage notification preferences</Text>
          </View>
          <Text style={styles.settingArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => Alert.alert('Coming Soon', 'Dark mode is coming in a future update!')}
        >
          <Text style={styles.settingIcon}>🌙</Text>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Dark Mode</Text>
            <Text style={styles.settingDescription}>Toggle dark/light theme</Text>
          </View>
          <Text style={styles.settingArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => Alert.alert('Coming Soon', 'Language settings coming soon!')}
        >
          <Text style={styles.settingIcon}>🌍</Text>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Language</Text>
            <Text style={styles.settingDescription}>Change app language</Text>
          </View>
          <Text style={styles.settingArrow}>→</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        
        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => navigation.navigate('HelpFAQ')}
        >
          <Text style={styles.settingIcon}>❓</Text>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Help & FAQ</Text>
            <Text style={styles.settingDescription}>Get help and find answers</Text>
          </View>
          <Text style={styles.settingArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => {
            Linking.openURL('mailto:support@lifepattern.ai?subject=LifePattern Support Request');
          }}
        >
          <Text style={styles.settingIcon}>📧</Text>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Contact Support</Text>
            <Text style={styles.settingDescription}>Get in touch with our team</Text>
          </View>
          <Text style={styles.settingArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => {
            const url = Platform.OS === 'ios' 
              ? 'https://apps.apple.com/app/id6754825838?action=write-review'
              : 'https://play.google.com/store/apps/details?id=com.oskarsanchez.lifepatternai';
            Linking.openURL(url);
          }}
        >
          <Text style={styles.settingIcon}>⭐</Text>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Rate App</Text>
            <Text style={styles.settingDescription}>Rate us on the app store</Text>
          </View>
          <Text style={styles.settingArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => navigation.navigate('UsabilitySurvey')}
        >
          <Text style={styles.settingIcon}>💬</Text>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Provide Feedback</Text>
            <Text style={styles.settingDescription}>Share your experience with us</Text>
          </View>
          <Text style={styles.settingArrow}>→</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Admin</Text>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => navigation.navigate('AdminDashboard')}
        >
          <Text style={styles.settingIcon}>🔑</Text>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Admin Dashboard</Text>
            <Text style={styles.settingDescription}>Owner access to questionnaire data</Text>
          </View>
          <Text style={styles.settingArrow}>→</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dangerSection}>
        <Text style={styles.sectionTitle}>Danger Zone</Text>
        
        <TouchableOpacity style={styles.dangerItem} onPress={handleLogout}>
          <Text style={styles.dangerIcon}>🚪</Text>
          <View style={styles.settingContent}>
            <Text style={styles.dangerTitle}>Logout</Text>
            <Text style={styles.dangerDescription}>Sign out of your account</Text>
          </View>
          <Text style={styles.settingArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.dangerItem} onPress={handleDeleteAccount}>
          <Text style={styles.dangerIcon}>💥</Text>
          <View style={styles.settingContent}>
            <Text style={styles.dangerTitle}>Delete Account</Text>
            <Text style={styles.dangerDescription}>Permanently delete your account</Text>
          </View>
          <Text style={styles.settingArrow}>→</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.versionText}>LifePattern v1.0.0</Text>
        <Text style={styles.copyrightText}>© 2025 LifePattern AI. All rights reserved.</Text>
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
  section: {
    backgroundColor: '#fff',
    margin: 20,
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
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingIcon: {
    fontSize: 20,
    marginRight: 16,
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
  settingArrow: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  dangerSection: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dangerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dangerIcon: {
    fontSize: 20,
    marginRight: 16,
  },
  dangerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#d32f2f',
    marginBottom: 2,
  },
  dangerDescription: {
    fontSize: 14,
    color: '#666',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    paddingBottom: 40,
  },
  versionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  copyrightText: {
    fontSize: 12,
    color: '#999',
  },
}); 