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
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { submitUsabilitySurvey, UsabilitySurveyRequest } from './api/endpoint';

type UsabilitySurveyScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'UsabilitySurvey'
>;

interface Props {
  navigation: UsabilitySurveyScreenNavigationProp;
}

interface Question {
  key: keyof UsabilitySurveyRequest;
  text: string;
}

const questions: Question[] = [
  { key: 'easy_to_use', text: 'I found the app easy to use' },
  { key: 'felt_confident', text: 'I felt confident while using the app' },
  { key: 'clear_design', text: 'The layout and visual design were clear and appealing' },
  { key: 'responsive_smooth', text: 'The app responded quickly and smoothly to my actions' },
  { key: 'feedback_understandable', text: 'The feedback and insights provided by the app were easy to understand' },
  { key: 'easy_to_find', text: 'I could easily find the information or features I needed' },
  { key: 'helped_reflect', text: 'The app helped me reflect on my daily habits or routines' },
  { key: 'would_use_regularly', text: 'I would like to use this app regularly to track my daily routine' },
  { key: 'would_recommend', text: 'I would recommend this app to a friend or colleague' },
  { key: 'overall_satisfied', text: 'Overall, I am satisfied with my experience using LifePattern AI' },
];

export default function UsabilitySurvey({ navigation }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [ratings, setRatings] = useState<{ [key: string]: number }>({});
  const [likedMost, setLikedMost] = useState('');
  const [wouldImprove, setWouldImprove] = useState('');
  const [encounteredIssues, setEncounteredIssues] = useState('');

  const handleRating = (questionKey: string, rating: number) => {
    setRatings({ ...ratings, [questionKey]: rating });
  };

  const handleSubmit = async () => {
    // Validation - check all questions are answered
    const missingAnswers = questions.filter((q) => !ratings[q.key]);
    if (missingAnswers.length > 0) {
      Alert.alert(
        'Incomplete Survey',
        `Please rate all ${questions.length} questions before submitting.`
      );
      return;
    }

    setIsLoading(true);
    try {
      const payload: UsabilitySurveyRequest = {
        easy_to_use: ratings.easy_to_use,
        felt_confident: ratings.felt_confident,
        clear_design: ratings.clear_design,
        responsive_smooth: ratings.responsive_smooth,
        feedback_understandable: ratings.feedback_understandable,
        easy_to_find: ratings.easy_to_find,
        helped_reflect: ratings.helped_reflect,
        would_use_regularly: ratings.would_use_regularly,
        would_recommend: ratings.would_recommend,
        overall_satisfied: ratings.overall_satisfied,
        liked_most: likedMost.trim(),
        would_improve: wouldImprove.trim(),
        encountered_issues: encounteredIssues.trim(),
      };

      const response = await submitUsabilitySurvey(payload);

      console.log('✅ Usability survey submitted successfully:', response);

      // Show SUS score
      const susScore = response.sus_score;
      let interpretation = '';
      if (susScore >= 80) {
        interpretation = 'Excellent! You found the app highly usable.';
      } else if (susScore >= 68) {
        interpretation = 'Good! The app meets usability standards.';
      } else if (susScore >= 50) {
        interpretation = 'OK. There\'s room for improvement.';
      } else {
        interpretation = 'Needs improvement. We appreciate your honest feedback!';
      }

      Alert.alert(
        'Thank You! 🙏',
        `Your feedback has been submitted successfully!\n\nSystem Usability Score (SUS): ${susScore.toFixed(1)}/100\n\n${interpretation}\n\nYour insights will help us improve LifePattern AI.`,
        [
          {
            text: 'Done',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      console.error('❌ Error submitting usability survey:', error);
      Alert.alert(
        'Submission Error',
        error.response?.data?.message || 'Failed to submit survey. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderStars = (questionKey: string) => {
    const currentRating = ratings[questionKey] || 0;
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => handleRating(questionKey, star)}
            style={styles.starButton}
          >
            <Text style={[styles.star, currentRating >= star && styles.starFilled]}>
              ★
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderLikertScale = (questionKey: string) => {
    const currentRating = ratings[questionKey] || 0;
    const labels = [
      'Strongly Disagree',
      'Disagree',
      'Neutral',
      'Agree',
      'Strongly Agree',
    ];

    return (
      <View style={styles.likertContainer}>
        {[1, 2, 3, 4, 5].map((value) => (
          <TouchableOpacity
            key={value}
            style={[
              styles.likertButton,
              currentRating === value && styles.likertButtonSelected,
            ]}
            onPress={() => handleRating(questionKey, value)}
          >
            <View style={styles.likertCircle}>
              {currentRating === value && <View style={styles.likertCircleInner} />}
            </View>
            <Text style={styles.likertLabel}>{labels[value - 1]}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Usability Survey</Text>
          <Text style={styles.subtitle}>
            Share your experience using LifePattern AI
          </Text>
          <Text style={styles.info}>
            This survey uses the System Usability Scale (SUS) to measure app usability.
            Your honest feedback helps us improve!
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Section 1: App Experience</Text>
          <Text style={styles.sectionSubtitle}>
            Rate your agreement with each statement (1 = Strongly Disagree, 5 = Strongly Agree)
          </Text>

          {questions.map((question, index) => (
            <View key={question.key} style={styles.questionContainer}>
              <View style={styles.questionHeader}>
                <Text style={styles.questionNumber}>{index + 1}</Text>
                <Text style={styles.questionText}>{question.text}</Text>
              </View>
              {renderStars(question.key)}
              {renderLikertScale(question.key)}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Section 2: Open Feedback</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>What did you like most about the app?</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Share what stood out to you..."
              value={likedMost}
              onChangeText={setLikedMost}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>What would you improve or add in future versions?</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Your suggestions for improvement..."
              value={wouldImprove}
              onChangeText={setWouldImprove}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Did you encounter any issues while using the app?</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe any problems or bugs you experienced..."
              value={encounteredIssues}
              onChangeText={setEncounteredIssues}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Survey</Text>
            )}
          </TouchableOpacity>
        </View>
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
    marginBottom: 12,
  },
  info: {
    fontSize: 14,
    color: '#4A90E2',
    backgroundColor: '#f0f7ff',
    padding: 12,
    borderRadius: 8,
    lineHeight: 20,
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
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  questionContainer: {
    marginBottom: 28,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  questionHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  questionNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginRight: 8,
    minWidth: 25,
  },
  questionText: {
    fontSize: 16,
    color: '#2c3e50',
    flex: 1,
    lineHeight: 22,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  starButton: {
    padding: 4,
  },
  star: {
    fontSize: 36,
    color: '#ddd',
  },
  starFilled: {
    color: '#FFD700',
  },
  likertContainer: {
    gap: 8,
  },
  likertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  likertButtonSelected: {
    borderColor: '#4A90E2',
    backgroundColor: '#f0f7ff',
  },
  likertCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#4A90E2',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  likertCircleInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4A90E2',
  },
  likertLabel: {
    fontSize: 14,
    color: '#2c3e50',
    flex: 1,
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
  submitButton: {
    backgroundColor: '#28a745',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#28a745',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#bdc3c7',
  },
});
