import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { ScreeningRequest } from './api/endpoint';
import {
  savePendingScreeningData,
  saveScreeningResult,
  calculateQualificationScore
} from './utils/screeningStorage';

type ScreeningQuestionnaireScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ScreeningQuestionnaire'
>;

interface Props {
  navigation: ScreeningQuestionnaireScreenNavigationProp;
}

export default function ScreeningQuestionnaire({ navigation }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentSection, setCurrentSection] = useState(1);

  // Section 1: Basic Information
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [occupation, setOccupation] = useState('');
  const [smartphoneUsage, setSmartphoneUsage] = useState('');
  const [deviceType, setDeviceType] = useState('');

  // Section 2: Routine & Lifestyle Patterns
  const [sleepHours, setSleepHours] = useState('');
  const [habitTracking, setHabitTracking] = useState('');
  const [routineStructure, setRoutineStructure] = useState('');
  const [productivityFluctuation, setProductivityFluctuation] = useState('');

  // Section 3: Tech Comfort & Interest
  const [techComfort, setTechComfort] = useState('');
  const [wellnessAppsUsed, setWellnessAppsUsed] = useState<boolean | null>(null);
  const [aiFeedbackOpenness, setAiFeedbackOpenness] = useState('');
  const [interestReason, setInterestReason] = useState('');

  const handleSubmit = async () => {
    // Validation
    if (!age || parseInt(age) < 13 || parseInt(age) > 120) {
      Alert.alert('Validation Error', 'Please enter a valid age (13-120)');
      return;
    }

    if (!gender || !occupation || !smartphoneUsage || !deviceType ||
        !sleepHours || !habitTracking || !routineStructure || !productivityFluctuation ||
        !techComfort || wellnessAppsUsed === null || !aiFeedbackOpenness || !interestReason.trim()) {
      Alert.alert('Incomplete Form', 'Please answer all questions before submitting');
      return;
    }

    setIsLoading(true);
    try {
      const payload: ScreeningRequest = {
        age: parseInt(age),
        gender,
        occupation,
        smartphone_usage: smartphoneUsage,
        device_type: deviceType,
        sleep_hours: sleepHours,
        habit_tracking: habitTracking,
        routine_structure: routineStructure,
        productivity_fluctuation: productivityFluctuation,
        tech_comfort: techComfort,
        wellness_apps_used: wellnessAppsUsed,
        ai_feedback_openness: aiFeedbackOpenness,
        interest_reason: interestReason,
      };

      // Calculate qualification score client-side
      const { score, isQualified } = calculateQualificationScore(payload);

      // Save screening data and result to local storage
      await savePendingScreeningData(payload);
      await saveScreeningResult({
        isQualified,
        qualificationScore: score,
        timestamp: new Date().toISOString(),
      });

      console.log('✅ Screening data saved locally:', { score, isQualified });

      // Show qualification result and suggest registration
      if (isQualified) {
        Alert.alert(
          'Great Match! 🎉',
          `Thank you for completing the screening questionnaire!\n\nYou're a great fit for LifePattern AI! Your profile matches our ideal user persona.\n\nPlease create an account to get started.`,
          [
            {
              text: 'Create Account',
              onPress: () => navigation.replace('Register'),
            },
          ]
        );
      } else {
        Alert.alert(
          'Thank You! ✅',
          `Thank you for your interest in LifePattern AI!\n\nYou're still welcome to use the app and benefit from its features.\n\nPlease create an account to continue.`,
          [
            {
              text: 'Create Account',
              onPress: () => navigation.replace('Register'),
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('❌ Error saving screening data:', error);
      Alert.alert(
        'Error',
        'Failed to save your responses. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Questionnaire?',
      'This helps us understand how we can improve the app for users like you. Are you sure you want to skip?',
      [
        { text: 'Go Back', style: 'cancel' },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: () => navigation.replace('Register'),
        },
      ]
    );
  };

  const renderSection1 = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Section 1: Basic Information</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Age</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your age"
          value={age}
          onChangeText={setAge}
          keyboardType="number-pad"
          maxLength={3}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Gender</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Male, Female, Non-binary, Prefer not to say"
          value={gender}
          onChangeText={setGender}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Occupation / Field of Study</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Software Engineer, Student, etc."
          value={occupation}
          onChangeText={setOccupation}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>How often do you use a smartphone?</Text>
        {['rarely', 'occasionally', 'daily'].map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.optionButton,
              smartphoneUsage === option && styles.optionButtonSelected,
            ]}
            onPress={() => setSmartphoneUsage(option)}
          >
            <View style={styles.radioOuter}>
              {smartphoneUsage === option && <View style={styles.radioInner} />}
            </View>
            <Text
              style={[
                styles.optionText,
                smartphoneUsage === option && styles.optionTextSelected,
              ]}
            >
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>What type of mobile device do you primarily use?</Text>
        {['android', 'iphone', 'other'].map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.optionButton,
              deviceType === option && styles.optionButtonSelected,
            ]}
            onPress={() => setDeviceType(option)}
          >
            <View style={styles.radioOuter}>
              {deviceType === option && <View style={styles.radioInner} />}
            </View>
            <Text
              style={[
                styles.optionText,
                deviceType === option && styles.optionTextSelected,
              ]}
            >
              {option === 'iphone' ? 'iPhone' : option.charAt(0).toUpperCase() + option.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.nextButton, { marginLeft: 0 }]}
        onPress={() => setCurrentSection(2)}
      >
        <Text style={styles.nextButtonText}>Next Section</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSection2 = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Section 2: Routine & Lifestyle Patterns</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>On average, how many hours do you sleep per night?</Text>
        {['<5', '5-6', '7-8', '>8'].map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.optionButton,
              sleepHours === option && styles.optionButtonSelected,
            ]}
            onPress={() => setSleepHours(option)}
          >
            <View style={styles.radioOuter}>
              {sleepHours === option && <View style={styles.radioInner} />}
            </View>
            <Text
              style={[
                styles.optionText,
                sleepHours === option && styles.optionTextSelected,
              ]}
            >
              {option === '<5' ? 'Less than 5' : option === '>8' ? 'More than 8' : option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          Do you actively track your habits or daily activities?
        </Text>
        {['never', 'sometimes', 'often', 'always'].map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.optionButton,
              habitTracking === option && styles.optionButtonSelected,
            ]}
            onPress={() => setHabitTracking(option)}
          >
            <View style={styles.radioOuter}>
              {habitTracking === option && <View style={styles.radioInner} />}
            </View>
            <Text
              style={[
                styles.optionText,
                habitTracking === option && styles.optionTextSelected,
              ]}
            >
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>How would you describe your daily routine?</Text>
        {[
          { value: 'very_structured', label: 'Very structured' },
          { value: 'somewhat_structured', label: 'Somewhat structured' },
          { value: 'unstructured', label: 'Unstructured' },
        ].map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionButton,
              routineStructure === option.value && styles.optionButtonSelected,
            ]}
            onPress={() => setRoutineStructure(option.value)}
          >
            <View style={styles.radioOuter}>
              {routineStructure === option.value && <View style={styles.radioInner} />}
            </View>
            <Text
              style={[
                styles.optionText,
                routineStructure === option.value && styles.optionTextSelected,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          Do you feel that your productivity or motivation fluctuates during the day/week?
        </Text>
        {['never', 'occasionally', 'frequently', 'always'].map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.optionButton,
              productivityFluctuation === option && styles.optionButtonSelected,
            ]}
            onPress={() => setProductivityFluctuation(option)}
          >
            <View style={styles.radioOuter}>
              {productivityFluctuation === option && <View style={styles.radioInner} />}
            </View>
            <Text
              style={[
                styles.optionText,
                productivityFluctuation === option && styles.optionTextSelected,
              ]}
            >
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setCurrentSection(1)}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={() => setCurrentSection(3)}
        >
          <Text style={styles.nextButtonText}>Next Section</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSection3 = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Section 3: Tech Comfort & Interest</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>How comfortable are you with using mobile applications?</Text>
        {[
          { value: 'not_comfortable', label: 'Not comfortable' },
          { value: 'somewhat_comfortable', label: 'Somewhat comfortable' },
          { value: 'comfortable', label: 'Comfortable' },
          { value: 'very_comfortable', label: 'Very comfortable' },
        ].map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionButton,
              techComfort === option.value && styles.optionButtonSelected,
            ]}
            onPress={() => setTechComfort(option.value)}
          >
            <View style={styles.radioOuter}>
              {techComfort === option.value && <View style={styles.radioInner} />}
            </View>
            <Text
              style={[
                styles.optionText,
                techComfort === option.value && styles.optionTextSelected,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          Have you used apps for wellness, focus, or productivity improvement before?
        </Text>
        {[
          { value: true, label: 'Yes' },
          { value: false, label: 'No' },
        ].map((option) => (
          <TouchableOpacity
            key={option.label}
            style={[
              styles.optionButton,
              wellnessAppsUsed === option.value && styles.optionButtonSelected,
            ]}
            onPress={() => setWellnessAppsUsed(option.value)}
          >
            <View style={styles.radioOuter}>
              {wellnessAppsUsed === option.value && <View style={styles.radioInner} />}
            </View>
            <Text
              style={[
                styles.optionText,
                wellnessAppsUsed === option.value && styles.optionTextSelected,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          How open are you to using AI-driven feedback to improve your lifestyle?
        </Text>
        {[
          { value: 'not_open', label: 'Not open' },
          { value: 'slightly_open', label: 'Slightly open' },
          { value: 'open', label: 'Open' },
          { value: 'very_open', label: 'Very open' },
        ].map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionButton,
              aiFeedbackOpenness === option.value && styles.optionButtonSelected,
            ]}
            onPress={() => setAiFeedbackOpenness(option.value)}
          >
            <View style={styles.radioOuter}>
              {aiFeedbackOpenness === option.value && <View style={styles.radioInner} />}
            </View>
            <Text
              style={[
                styles.optionText,
                aiFeedbackOpenness === option.value && styles.optionTextSelected,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Why would you be interested in using LifePattern AI?</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Share your thoughts..."
          value={interestReason}
          onChangeText={setInterestReason}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setCurrentSection(2)}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Candidate Screening</Text>
          <Text style={styles.subtitle}>
            Help us understand if LifePattern AI is right for you
          </Text>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(currentSection / 3) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>Section {currentSection} of 3</Text>
          </View>
        </View>

        {currentSection === 1 && renderSection1()}
        {currentSection === 2 && renderSection2()}
        {currentSection === 3 && renderSection3()}

        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>Skip for now</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4A90E2',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
    textAlign: 'center',
  },
  section: {
    margin: 20,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#2c3e50',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  optionButtonSelected: {
    borderColor: '#4A90E2',
    backgroundColor: '#f0f7ff',
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4A90E2',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4A90E2',
  },
  optionText: {
    fontSize: 16,
    color: '#2c3e50',
    flex: 1,
  },
  optionTextSelected: {
    color: '#4A90E2',
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  backButton: {
    flex: 1,
    backgroundColor: '#6c757d',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginRight: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 1,
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginLeft: 8,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#28a745',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginLeft: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#bdc3c7',
  },
  skipButton: {
    alignItems: 'center',
    padding: 16,
    marginTop: 10,
  },
  skipButtonText: {
    fontSize: 14,
    color: '#666',
    textDecorationLine: 'underline',
  },
});
