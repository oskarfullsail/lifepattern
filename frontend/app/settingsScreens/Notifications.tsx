/**
 * Notifications Screen
 * Manage notification preferences
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
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation';
import AsyncStorage from '@react-native-async-storage/async-storage';

type NotificationsNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Notifications'>;

interface Props {
  navigation: NotificationsNavigationProp;
}

interface NotificationPreferences {
  dailyReminder: boolean;
  weeklyReport: boolean;
  aiInsights: boolean;
  sleepReminder: boolean;
  exerciseReminder: boolean;
  hydrationReminder: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

const NOTIFICATION_SETTINGS_KEY = '@notification_settings';

export default function Notifications({ navigation }: Props) {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    dailyReminder: true,
    weeklyReport: true,
    aiInsights: true,
    sleepReminder: false,
    exerciseReminder: false,
    hydrationReminder: false,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      if (stored) {
        setPreferences(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    }
  };

  const savePreferences = async (newPrefs: NotificationPreferences) => {
    try {
      await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(newPrefs));
      setPreferences(newPrefs);
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      Alert.alert('Error', 'Failed to save preferences');
    }
  };

  const togglePreference = (key: keyof NotificationPreferences) => {
    const newPrefs = { ...preferences, [key]: !preferences[key] };
    savePreferences(newPrefs);
  };

  const NotificationToggle = ({
    icon,
    title,
    description,
    preferenceKey,
  }: {
    icon: string;
    title: string;
    description: string;
    preferenceKey: keyof NotificationPreferences;
  }) => (
    <View style={styles.settingRow}>
      <Text style={styles.settingIcon}>{icon}</Text>
      <View style={styles.settingInfo}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch
        value={preferences[preferenceKey] as boolean}
        onValueChange={() => togglePreference(preferenceKey)}
        trackColor={{ false: '#e2e8f0', true: '#7c3aed' }}
        thumbColor="#fff"
      />
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Stay on Track</Text>
        <Text style={styles.sectionDescription}>
          Get reminders and insights to help you build healthy habits.
        </Text>

        {/* Reports & Insights */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Reports & Insights</Text>

          <NotificationToggle
            icon="📊"
            title="Daily Reminder"
            description="Reminder to log your daily routine"
            preferenceKey="dailyReminder"
          />

          <NotificationToggle
            icon="📈"
            title="Weekly Report"
            description="Weekly summary of your health trends"
            preferenceKey="weeklyReport"
          />

          <NotificationToggle
            icon="🤖"
            title="AI Insights"
            description="Personalized recommendations from AI coach"
            preferenceKey="aiInsights"
          />
        </View>

        {/* Health Reminders */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Health Reminders</Text>

          <NotificationToggle
            icon="😴"
            title="Sleep Reminder"
            description="Reminder to prepare for bed"
            preferenceKey="sleepReminder"
          />

          <NotificationToggle
            icon="🏃"
            title="Exercise Reminder"
            description="Daily exercise encouragement"
            preferenceKey="exerciseReminder"
          />

          <NotificationToggle
            icon="💧"
            title="Hydration Reminder"
            description="Remind me to drink water"
            preferenceKey="hydrationReminder"
          />
        </View>

        {/* Quiet Hours */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quiet Hours</Text>

          <View style={styles.settingRow}>
            <Text style={styles.settingIcon}>🌙</Text>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Enable Quiet Hours</Text>
              <Text style={styles.settingDescription}>
                No notifications during {preferences.quietHoursStart} - {preferences.quietHoursEnd}
              </Text>
            </View>
            <Switch
              value={preferences.quietHoursEnabled}
              onValueChange={() => togglePreference('quietHoursEnabled')}
              trackColor={{ false: '#e2e8f0', true: '#7c3aed' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>💡</Text>
          <Text style={styles.infoText}>
            Notifications help you stay consistent with your health habits. You can always adjust
            these settings based on what works best for you.
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
  settingIcon: {
    fontSize: 24,
    marginRight: 12,
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
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
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

