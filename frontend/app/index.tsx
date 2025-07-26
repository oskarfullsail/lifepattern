import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import userManager from './utils/userManager';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    checkAuthStatus();
  }, [navigation]);

  const checkAuthStatus = async () => {
    try {
      const isAuthenticated = await userManager.isAuthenticated();
      if (isAuthenticated) {
        // User is authenticated, navigate to dashboard
        navigation.replace('Dashboard');
      } else {
        // User is not authenticated, show onboarding
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsLoading(false);
    }
  };

  const onboardingSteps = [
    {
      title: "Welcome to LifePattern AI",
      subtitle: "Your Personal Health & Wellness Companion",
      description: "Track your daily routines and get AI-powered insights to improve your lifestyle habits.",
      icon: "🧠",
      color: "#4A90E2"
    },
    {
      title: "Smart Routine Analysis",
      subtitle: "AI-Powered Insights",
      description: "Our advanced AI analyzes your sleep, meals, exercise, and screen time to identify patterns and suggest improvements.",
      icon: "🤖",
      color: "#7ED321"
    },
    {
      title: "Privacy First",
      subtitle: "Your Data, Your Control",
      description: "We respect your privacy. Your data is encrypted, secure, and you have full control over how it's used. No personal information is collected.",
      icon: "🔒",
      color: "#F5A623"
    },
    {
      title: "Secure Authentication",
      subtitle: "Device-Bound & Private",
      description: "Your credentials are stored securely on your device. No email or personal information required - just a username and passphrase.",
      icon: "🔐",
      color: "#D0021B"
    }
  ];

  const handleGetStarted = () => {
    navigation.navigate('Login');
  };

  const handleSkip = () => {
    navigation.navigate('Login');
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>🧠 LifePattern AI</Text>
          <Text style={styles.tagline}>Your Health, Your Patterns</Text>
        </View>

        {/* Onboarding Steps */}
        <View style={styles.onboardingContainer}>
          {onboardingSteps.map((step, index) => (
            <View 
              key={index} 
              style={[
                styles.stepCard,
                { borderLeftColor: step.color },
                index === currentStep && styles.activeStep
              ]}
            >
              <View style={styles.stepHeader}>
                <Text style={styles.stepIcon}>{step.icon}</Text>
                <View style={styles.stepInfo}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepSubtitle}>{step.subtitle}</Text>
                </View>
              </View>
              <Text style={styles.stepDescription}>{step.description}</Text>
            </View>
          ))}
        </View>

        {/* Step Indicators */}
        <View style={styles.indicators}>
          {onboardingSteps.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                index === currentStep && styles.activeIndicator
              ]}
            />
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.primaryButton} 
            onPress={handleGetStarted}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.secondaryButton} 
            onPress={handleSkip}
          >
            <Text style={styles.secondaryButtonText}>Skip Introduction</Text>
          </TouchableOpacity>
        </View>

        {/* Privacy Notice */}
        <View style={styles.privacyNotice}>
          <Text style={styles.privacyText}>
            By continuing, you agree to our{' '}
            <Text style={styles.link}>Terms of Service</Text> and{' '}
            <Text style={styles.link}>Privacy Policy</Text>
          </Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  onboardingContainer: {
    flex: 1,
    marginBottom: 30,
  },
  stepCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  activeStep: {
    borderLeftWidth: 6,
    transform: [{ scale: 1.02 }],
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  stepInfo: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  stepDescription: {
    fontSize: 16,
    color: '#34495e',
    lineHeight: 24,
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ddd',
    marginHorizontal: 4,
  },
  activeIndicator: {
    backgroundColor: '#4A90E2',
    width: 24,
  },
  buttonContainer: {
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#4A90E2',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 16,
  },
  privacyNotice: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  privacyText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
  link: {
    color: '#4A90E2',
    textDecorationLine: 'underline',
  },
}); 