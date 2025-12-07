/**
 * Help & FAQ Screen
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

type HelpFAQNavigationProp = NativeStackNavigationProp<RootStackParamList, 'HelpFAQ'>;

interface Props {
  navigation: HelpFAQNavigationProp;
}

const faqs = [
  {
    question: 'How do I connect Apple Health?',
    answer:
      'Go to Settings > Connected Devices > Apple Health > Connect. You\'ll be asked to grant permission for LifePattern to read your health data.',
  },
  {
    question: 'Why isn\'t my data syncing?',
    answer:
      'Make sure you\'ve granted health permissions in Settings > Privacy > Health. Also check that background app refresh is enabled.',
  },
  {
    question: 'How are AI insights generated?',
    answer:
      'Our AI analyzes your sleep, activity, and routine patterns to detect anomalies and provide personalized recommendations.',
  },
  {
    question: 'Is my data secure?',
    answer:
      'Yes! Your health data is stored locally on your device and encrypted. We never share your data with third parties.',
  },
  {
    question: 'How do I export my data?',
    answer: 'Go to Settings > Data Export to download your health data in JSON or CSV format.',
  },
];

export default function HelpFAQ({ navigation }: Props) {
  const handleContactSupport = () => {
    Linking.openURL('mailto:support@lifepattern.ai?subject=LifePattern Support Request');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Help & FAQ</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>

        {faqs.map((faq, index) => (
          <View key={index} style={styles.faqCard}>
            <Text style={styles.question}>{faq.question}</Text>
            <Text style={styles.answer}>{faq.answer}</Text>
          </View>
        ))}

        <TouchableOpacity style={styles.contactButton} onPress={handleContactSupport}>
          <Text style={styles.contactButtonText}>📧 Contact Support</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
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
  backButton: { padding: 8 },
  backButtonText: { fontSize: 16, color: '#7c3aed', fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
  placeholder: { width: 60 },
  content: { padding: 20 },
  sectionTitle: { fontSize: 22, fontWeight: '700', color: '#1e293b', marginBottom: 16 },
  faqCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  question: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 8 },
  answer: { fontSize: 14, color: '#64748b', lineHeight: 20 },
  contactButton: {
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  contactButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});

