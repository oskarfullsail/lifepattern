/**
 * Privacy Settings Screen
 * Manage data sharing and privacy preferences
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation';
import AsyncStorage from '@react-native-async-storage/async-storage';

type PrivacySettingsNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PrivacySettings'>;

interface Props {
  navigation: PrivacySettingsNavigationProp;
}

interface PrivacyPreferences {
  analyticsEnabled: boolean;
  crashReportingEnabled: boolean;
  personalizedInsightsEnabled: boolean;
  locationTrackingEnabled: boolean;
}

const PRIVACY_SETTINGS_KEY = '@privacy_settings';

export default function PrivacySettings({ navigation }: Props) {
  const [preferences, setPreferences] = useState<PrivacyPreferences>({
    analyticsEnabled: false,
    crashReportingEnabled: true,
    personalizedInsightsEnabled: true,
    locationTrackingEnabled: false,
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const stored = await AsyncStorage.getItem(PRIVACY_SETTINGS_KEY);
      if (stored) {
        setPreferences(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading privacy preferences:', error);
    }
  };

  const savePreferences = async (newPrefs: PrivacyPreferences) => {
    try {
      await AsyncStorage.setItem(PRIVACY_SETTINGS_KEY, JSON.stringify(newPrefs));
      setPreferences(newPrefs);
    } catch (error) {
      console.error('Error saving privacy preferences:', error);
      Alert.alert('Error', 'Failed to save preferences');
    }
  };

  const togglePreference = (key: keyof PrivacyPreferences) => {
    const newPrefs = { ...preferences, [key]: !preferences[key] };
    savePreferences(newPrefs);
  };

  const openPrivacyPolicy = () => {
    Linking.openURL('https://lifepattern-ai.web.app/privacy-policy.html');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Privacy Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Data & Privacy</Text>
        <Text style={styles.sectionDescription}>
          Control how your data is used within the app. Your privacy is our priority.
        </Text>

        {/* Data Collection Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Data Collection</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Anonymous Analytics</Text>
              <Text style={styles.settingDescription}>
                Help improve the app by sharing anonymous usage statistics
              </Text>
            </View>
            <Switch
              value={preferences.analyticsEnabled}
              onValueChange={() => togglePreference('analyticsEnabled')}
              trackColor={{ false: '#e2e8f0', true: '#7c3aed' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Crash Reporting</Text>
              <Text style={styles.settingDescription}>
                Automatically send crash reports to help fix bugs
              </Text>
            </View>
            <Switch
              value={preferences.crashReportingEnabled}
              onValueChange={() => togglePreference('crashReportingEnabled')}
              trackColor={{ false: '#e2e8f0', true: '#7c3aed' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* AI & Personalization Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>AI & Personalization</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Personalized Insights</Text>
              <Text style={styles.settingDescription}>
                Use your data to provide tailored health recommendations
              </Text>
            </View>
            <Switch
              value={preferences.personalizedInsightsEnabled}
              onValueChange={() => togglePreference('personalizedInsightsEnabled')}
              trackColor={{ false: '#e2e8f0', true: '#7c3aed' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Location Context</Text>
              <Text style={styles.settingDescription}>
                Use location for context-aware recommendations
              </Text>
            </View>
            <Switch
              value={preferences.locationTrackingEnabled}
              onValueChange={() => togglePreference('locationTrackingEnabled')}
              trackColor={{ false: '#e2e8f0', true: '#7c3aed' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Your Data Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Data</Text>

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => navigation.navigate('DataExport')}
          >
            <Text style={styles.linkIcon}>📥</Text>
            <View style={styles.linkInfo}>
              <Text style={styles.linkTitle}>Export Your Data</Text>
              <Text style={styles.linkDescription}>Download a copy of all your health data</Text>
            </View>
            <Text style={styles.linkArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => navigation.navigate('DeleteData')}
          >
            <Text style={styles.linkIcon}>🗑️</Text>
            <View style={styles.linkInfo}>
              <Text style={[styles.linkTitle, styles.dangerText]}>Delete Your Data</Text>
              <Text style={styles.linkDescription}>Remove specific data entries</Text>
            </View>
            <Text style={styles.linkArrow}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Privacy Policy Link */}
        <TouchableOpacity style={styles.policyButton} onPress={openPrivacyPolicy}>
          <Text style={styles.policyButtonText}>📄 Read Privacy Policy</Text>
        </TouchableOpacity>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>🔒</Text>
          <Text style={styles.infoText}>
            Your health data is stored locally on your device and never sold to third parties. We
            only collect data that you explicitly choose to share.
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
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  linkIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  linkInfo: {
    flex: 1,
  },
  linkTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  linkDescription: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  linkArrow: {
    fontSize: 18,
    color: '#7c3aed',
    fontWeight: '600',
  },
  dangerText: {
    color: '#dc2626',
  },
  policyButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  policyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7c3aed',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
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

