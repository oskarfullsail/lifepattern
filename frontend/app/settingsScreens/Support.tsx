/**
 * LifePattern AI Support Screen
 * Comprehensive support information and contact options
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation';

type SupportNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Support'>;

interface Props {
  navigation: SupportNavigationProp;
}

const SUPPORT_URL = 'https://oskarfullsail.github.io/lifepattern/support/';

export default function Support({ navigation }: Props) {
  const handleEmailSupport = () => {
    Linking.openURL('mailto:support@lifepattern.ai?subject=LifePattern AI Support Request');
  };

  const handleOpenWebSupport = () => {
    Linking.openURL(SUPPORT_URL);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Support</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {/* Hero Section */}
        <View style={styles.heroCard}>
          <Text style={styles.heroIcon}>🧠</Text>
          <Text style={styles.heroTitle}>LifePattern AI Support</Text>
          <Text style={styles.heroDescription}>
            LifePattern AI helps users detect routine anomalies and improve daily habits 
            using AI-driven insights.
          </Text>
        </View>

        {/* Contact Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <Text style={styles.sectionDescription}>
            If you have questions, encounter issues, or need help using the app, 
            please contact us:
          </Text>

          <TouchableOpacity style={styles.contactCard} onPress={handleEmailSupport}>
            <View style={styles.contactIconContainer}>
              <Text style={styles.contactIcon}>📧</Text>
            </View>
            <View style={styles.contactDetails}>
              <Text style={styles.contactLabel}>Email</Text>
              <Text style={styles.contactValue}>support@lifepattern.ai</Text>
            </View>
            <Text style={styles.contactArrow}>→</Text>
          </TouchableOpacity>

          <View style={styles.responseTimeCard}>
            <Text style={styles.responseIcon}>⏱️</Text>
            <View style={styles.responseDetails}>
              <Text style={styles.responseLabel}>Typical Response Time</Text>
              <Text style={styles.responseValue}>24–48 hours</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.webLinkCard} onPress={handleOpenWebSupport}>
            <View style={styles.contactIconContainer}>
              <Text style={styles.contactIcon}>🌐</Text>
            </View>
            <View style={styles.contactDetails}>
              <Text style={styles.contactLabel}>Support Website</Text>
              <Text style={styles.webLinkValue}>oskarfullsail.github.io/lifepattern/support</Text>
            </View>
            <Text style={styles.contactArrow}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Help Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Help</Text>
          
          <TouchableOpacity 
            style={styles.helpItem}
            onPress={() => navigation.navigate('HelpFAQ')}
          >
            <Text style={styles.helpIcon}>❓</Text>
            <View style={styles.helpContent}>
              <Text style={styles.helpTitle}>FAQ</Text>
              <Text style={styles.helpDescription}>Browse frequently asked questions</Text>
            </View>
            <Text style={styles.helpArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.helpItem}
            onPress={() => navigation.navigate('ConnectedDevices')}
          >
            <Text style={styles.helpIcon}>⌚</Text>
            <View style={styles.helpContent}>
              <Text style={styles.helpTitle}>Device Setup</Text>
              <Text style={styles.helpDescription}>Connect your wearable devices</Text>
            </View>
            <Text style={styles.helpArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.helpItem}
            onPress={() => navigation.navigate('PrivacySettings')}
          >
            <Text style={styles.helpIcon}>🔒</Text>
            <View style={styles.helpContent}>
              <Text style={styles.helpTitle}>Privacy Settings</Text>
              <Text style={styles.helpDescription}>Manage your data preferences</Text>
            </View>
            <Text style={styles.helpArrow}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Privacy Notice */}
        <View style={styles.privacyCard}>
          <Text style={styles.privacyIcon}>🛡️</Text>
          <Text style={styles.privacyTitle}>Your Privacy Matters</Text>
          <Text style={styles.privacyText}>
            We respect your data and do not sell personal information. 
            Your health data is encrypted and stored securely.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerLogo}>🧠 LifePattern AI</Text>
          <Text style={styles.footerCopyright}>© 2025 LifePattern AI</Text>
          <Text style={styles.footerSubtext}>All rights reserved</Text>
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
  heroCard: {
    backgroundColor: '#7c3aed',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
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
    textAlign: 'center',
  },
  heroDescription: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 15,
    color: '#64748b',
    marginBottom: 16,
    lineHeight: 22,
  },
  contactCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#7c3aed',
  },
  contactIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f3e8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contactIcon: {
    fontSize: 24,
  },
  contactDetails: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7c3aed',
  },
  contactArrow: {
    fontSize: 20,
    color: '#7c3aed',
    fontWeight: 'bold',
  },
  responseTimeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  responseIcon: {
    fontSize: 28,
    marginRight: 16,
  },
  responseDetails: {
    flex: 1,
  },
  responseLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 2,
  },
  responseValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  webLinkCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  webLinkValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  helpItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  helpIcon: {
    fontSize: 24,
    marginRight: 14,
  },
  helpContent: {
    flex: 1,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  helpDescription: {
    fontSize: 13,
    color: '#64748b',
  },
  helpArrow: {
    fontSize: 18,
    color: '#94a3b8',
    fontWeight: 'bold',
  },
  privacyCard: {
    backgroundColor: '#ecfdf5',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  privacyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  privacyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#065f46',
    marginBottom: 8,
  },
  privacyText: {
    fontSize: 14,
    color: '#047857',
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 20,
  },
  footerLogo: {
    fontSize: 18,
    fontWeight: '700',
    color: '#7c3aed',
    marginBottom: 8,
  },
  footerCopyright: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
});

