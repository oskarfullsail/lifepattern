import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { register, submitScreening } from './api/endpoint';
import userManager from './utils/userManager';
import {
  getPendingScreeningData,
  clearPendingScreeningData,
  getScreeningResult,
} from './utils/screeningStorage';

type RegisterScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Register'>;

interface Props {
  navigation: RegisterScreenNavigationProp;
}

export default function Register({ navigation }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deviceLabel, setDeviceLabel] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [hasPendingScreening, setHasPendingScreening] = useState(false);

  useEffect(() => {
    initializeDeviceLabel();
    checkAuthStatus();
    checkPendingScreening();
  }, []);

  const checkPendingScreening = async () => {
    const pendingData = await getPendingScreeningData();
    setHasPendingScreening(!!pendingData);
    if (pendingData) {
      console.log('✅ Found pending screening data from questionnaire');
    }
  };

  const checkAuthStatus = async () => {
    const isAuthenticated = await userManager.isAuthenticated();
    if (isAuthenticated) {
      navigation.replace('UserDashboard');
    }
  };

  const initializeDeviceLabel = () => {
    const platform = Platform.OS === 'ios' ? 'iPhone' :
                     Platform.OS === 'android' ? 'Android' : 'Web';
    setDeviceLabel(`My ${platform} Device`);
  };

  const validateUsername = (username: string): string | null => {
    if (username.length < 3) {
      return 'Username must be at least 3 characters';
    }
    if (username.length > 30) {
      return 'Username must be less than 30 characters';
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return 'Username can only contain letters, numbers, underscores, and hyphens';
    }
    return null;
  };

  const validatePassword = (password: string): string | null => {
    if (password.length < 6) {
      return 'Password must be at least 6 characters';
    }
    if (password.length > 100) {
      return 'Password must be less than 100 characters';
    }
    return null;
  };

  const handleRegister = async () => {
    // Validation
    const usernameError = validateUsername(username.trim());
    if (usernameError) {
      Alert.alert('Invalid Username', usernameError);
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      Alert.alert('Invalid Password', passwordError);
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (!deviceLabel.trim()) {
      Alert.alert('Error', 'Please provide a device label');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔐 Attempting registration with username:', username.trim());

      // Register with backend
      const response = await register({
        username: username.trim(),
        passphrase: password,
        device_label: deviceLabel.trim(),
      });

      console.log('✅ Registration successful');

      // Store tokens
      await userManager.storeTokens(response.access_token, response.refresh_token);

      // Check for pending screening data
      const pendingScreening = await getPendingScreeningData();
      const screeningResult = await getScreeningResult();

      if (pendingScreening) {
        console.log('📋 Submitting pending screening data to backend...');
        try {
          // Submit the screening data to the backend now that user is registered
          const backendScreeningResult = await submitScreening(pendingScreening);
          console.log('✅ Screening data submitted successfully');

          // Clear pending data after successful submission
          await clearPendingScreeningData();

          // Show success message with backend qualification status
          if (backendScreeningResult.is_qualified_tester) {
            Alert.alert(
              'Welcome to LifePattern AI! 🎉',
              `Your account has been created successfully!\n\nBased on your screening questionnaire, you're a great fit for our platform.\n\nQualification Score: ${backendScreeningResult.qualification_score}/12`,
              [
                {
                  text: 'Get Started',
                  onPress: () => navigation.replace('UserDashboard'),
                },
              ]
            );
          } else {
            Alert.alert(
              'Account Created! ✅',
              `Welcome to LifePattern AI!\n\nYour account has been created successfully. You can now start tracking your daily routines and getting AI insights.\n\nQualification Score: ${backendScreeningResult.qualification_score}/12`,
              [
                {
                  text: 'Get Started',
                  onPress: () => navigation.replace('UserDashboard'),
                },
              ]
            );
          }
        } catch (screeningError) {
          console.error('⚠️ Failed to submit screening data:', screeningError);
          // Still let user proceed even if screening submission fails
          Alert.alert(
            'Account Created!',
            'Your account has been created successfully. You can now start using LifePattern AI!',
            [
              {
                text: 'Get Started',
                onPress: () => navigation.replace('UserDashboard'),
              },
            ]
          );
        }
      } else {
        // No pending screening data, ask user to complete questionnaire
        Alert.alert(
          'Account Created!',
          'Your account has been created successfully. Please complete a quick screening questionnaire to help us tailor your experience.',
          [
            {
              text: 'Continue',
              onPress: () => navigation.replace('ScreeningQuestionnaire'),
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('❌ Registration failed:', error);

      // Handle username already exists
      if (error.response?.status === 409) {
        Alert.alert(
          'Username Taken',
          'This username is already in use. Please choose a different username.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Registration Failed',
          error.response?.data || error.message || 'Failed to create account. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Choose a username and password to get started
          </Text>
        </View>

        <View style={styles.formContainer}>
          {/* Screening Completed Banner */}
          {hasPendingScreening && (
            <View style={styles.screeningBanner}>
              <Text style={styles.screeningBannerIcon}>✅</Text>
              <Text style={styles.screeningBannerText}>
                Screening questionnaire completed! Your responses will be saved when you create your account.
              </Text>
            </View>
          )}

          {/* Username */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="Choose a username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              editable={!isLoading}
            />
            <Text style={styles.hint}>
              3-30 characters, letters, numbers, _ and - only
            </Text>
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Choose a password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password-new"
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.hint}>At least 6 characters</Text>
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password-new"
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Text style={styles.eyeIcon}>{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Device Label */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Device Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., John's iPhone"
              value={deviceLabel}
              onChangeText={setDeviceLabel}
              autoCapitalize="words"
              editable={!isLoading}
            />
            <Text style={styles.hint}>
              This helps you identify this device when managing your account
            </Text>
          </View>

          {/* Register Button */}
          <TouchableOpacity
            style={[styles.registerButton, isLoading && styles.disabledButton]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.registerButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.navigate('Login')}
            disabled={isLoading}
          >
            <Text style={styles.loginLinkText}>
              Already have an account? <Text style={styles.loginLinkBold}>Log in</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Info Section */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>🔐 Privacy & Security</Text>
          <Text style={styles.infoText}>
            • Your password is encrypted and never stored in plain text{'\n'}
            • Use the same username to sync across all your devices{'\n'}
            • We don't collect any personal information{'\n'}
            • Your data stays private and secure
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navTab} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navTab}>
          <Text style={styles.navIcon}>📊</Text>
          <Text style={styles.navLabel}>Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.centerNavButton}>
          <View style={styles.centerNavButtonInner}>
            <Text style={styles.centerNavIcon}>+</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navTab}>
          <Text style={styles.navIcon}>🎯</Text>
          <Text style={styles.navLabel}>Goals</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navTab}>
          <Text style={styles.navIcon}>👤</Text>
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    paddingBottom: 90,
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
    lineHeight: 22,
  },
  formContainer: {
    margin: 20,
    padding: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  screeningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  screeningBannerIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  screeningBannerText: {
    flex: 1,
    fontSize: 14,
    color: '#065f46',
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#2c3e50',
  },
  eyeButton: {
    padding: 16,
  },
  eyeIcon: {
    fontSize: 20,
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    marginLeft: 4,
  },
  registerButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  disabledButton: {
    backgroundColor: '#bdc3c7',
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 16,
  },
  loginLinkText: {
    fontSize: 14,
    color: '#666',
  },
  loginLinkBold: {
    color: '#4A90E2',
    fontWeight: '600',
  },
  infoContainer: {
    margin: 20,
    marginTop: 0,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 70,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  navTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  navIcon: {
    fontSize: 24,
    marginBottom: 4,
    opacity: 0.5,
  },
  navLabel: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  centerNavButton: {
    width: 56,
    height: 56,
    marginTop: -20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerNavButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  centerNavIcon: {
    fontSize: 28,
    color: '#ffffff',
    fontWeight: 'bold',
  },
});
