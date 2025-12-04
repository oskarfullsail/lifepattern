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
import * as LocalAuthentication from 'expo-local-authentication';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import userManager, { UserCredentials } from './utils/userManager';
import { requestPasswordRecovery } from './api/endpoint';

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

export default function Login({ navigation }: Props) {
  const [username, setUsername] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [userCredentials, setUserCredentials] = useState<UserCredentials | null>(null);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('');

  useEffect(() => {
    initializeLogin();
    checkBiometricSupport();
  }, []);

  const initializeLogin = async () => {
    try {
      setIsInitializing(true);

      console.log('🔄 Initializing login screen...');

      // Check if user already has credentials
      const credentials = await userManager.getUserCredentials();
      if (credentials) {
        console.log('📝 Found stored credentials for:', credentials.username);
        setUserCredentials(credentials);
        setUsername(credentials.username);
      }

      // Check if user is already authenticated
      const isAuthenticated = await userManager.isAuthenticated();
      console.log('🔐 Authentication status:', isAuthenticated);

      if (isAuthenticated) {
        console.log('✅ User already authenticated, redirecting to dashboard');
        navigation.replace('UserDashboard');
        return;
      }

      console.log('ℹ️ User not authenticated, showing login form');

    } catch (error) {
      console.error('❌ Error initializing login:', error);
    } finally {
      setIsInitializing(false);
    }
  };

  const checkBiometricSupport = async () => {
    try {
      // Only check on mobile platforms
      if (Platform.OS === 'web') {
        setIsBiometricSupported(false);
        return;
      }

      const compatible = await LocalAuthentication.hasHardwareAsync();
      console.log('🔐 Biometric hardware available:', compatible);

      if (!compatible) {
        setIsBiometricSupported(false);
        return;
      }

      const enrolled = await LocalAuthentication.isEnrolledAsync();
      console.log('🔐 Biometric enrolled:', enrolled);

      if (!enrolled) {
        setIsBiometricSupported(false);
        return;
      }

      // Get supported authentication types
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      console.log('🔐 Supported auth types:', types);

      // Determine biometric type
      let typeLabel = 'Biometric';
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        typeLabel = Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition';
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        typeLabel = 'Fingerprint';
      } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        typeLabel = 'Iris';
      }

      setBiometricType(typeLabel);
      setIsBiometricSupported(true);
      console.log(`✅ Biometric authentication available: ${typeLabel}`);

    } catch (error) {
      console.error('❌ Error checking biometric support:', error);
      setIsBiometricSupported(false);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      // Must have stored credentials to use biometric login
      if (!userCredentials) {
        Alert.alert(
          'Setup Required',
          'Please log in with your username and password first to enable biometric authentication.',
          [{ text: 'OK' }]
        );
        return;
      }

      setIsLoading(true);
      console.log('🔐 Attempting biometric authentication...');

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Login to LifePattern AI`,
        fallbackLabel: 'Use Password',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        console.log('✅ Biometric authentication successful');

        // Use stored credentials to authenticate
        const success = await userManager.authenticateUser(
          userCredentials.username,
          userCredentials.passphrase
        );

        if (success) {
          console.log('✅ Login successful with biometrics, navigating to UserDashboard');
          navigation.replace('UserDashboard');
        } else {
          console.log('❌ Authentication failed - credentials may have changed');
          Alert.alert(
            'Authentication Failed',
            'Your stored credentials are no longer valid. Please log in with your password.',
            [{ text: 'OK' }]
          );
        }
      } else {
        console.log('❌ Biometric authentication failed:', result.error);
        if (result.error === 'user_cancel') {
          // User cancelled, do nothing
          return;
        }
        Alert.alert(
          'Authentication Failed',
          'Biometric authentication was not successful. Please try again or use your password.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('❌ Biometric login error:', error);
      Alert.alert(
        'Error',
        'Failed to authenticate with biometrics. Please use your password.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!username.trim() || !passphrase.trim()) {
      Alert.alert('Error', 'Please enter both username and passphrase');
      return;
    }

    setIsLoading(true);

    try {
      console.log('🔐 Attempting login with username:', username);
      
      const success = await userManager.authenticateUser(username.trim(), passphrase.trim());
      
      if (success) {
        console.log('✅ Login successful, navigating to UserDashboard');
        // Navigate directly without showing alert
        navigation.replace('UserDashboard');
      } else {
        console.log('❌ Login failed - invalid credentials');
        Alert.alert('Error', 'Invalid username or passphrase. Please try again.');
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      Alert.alert('Error', 'Failed to login. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAccount = () => {
    navigation.navigate('Register');
  };

  const handleForgotCredentials = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter your username first to recover your passphrase.');
      return;
    }

    Alert.alert(
      'Recover Passphrase',
      `Do you want to generate a new passphrase for user "${username.trim()}"? This will invalidate your current passphrase.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Recover Passphrase', 
          onPress: async () => {
            try {
              setIsLoading(true);
              console.log('🔄 Requesting password recovery for:', username.trim());
              
              const response = await requestPasswordRecovery({ username: username.trim() });
              
              if (response.success && response.temp_credentials) {
                console.log('✅ Password recovery successful');
                
                Alert.alert(
                  'Passphrase Recovery Successful',
                  `Your new passphrase is: ${response.temp_credentials.passphrase}\n\n⚠️ Please save this passphrase securely and change it after login.`,
                  [
                    {
                      text: 'Copy to Clipboard',
                      onPress: () => {
                        // In a real app, you'd copy to clipboard here
                        console.log('Passphrase copied to clipboard');
                      }
                    },
                    {
                      text: 'OK',
                      onPress: () => {
                        // Auto-fill the passphrase field
                        setPassphrase(response.temp_credentials!.passphrase);
                      }
                    }
                  ]
                );
              } else {
                console.log('❌ Password recovery failed:', response.message);
                Alert.alert('Recovery Failed', response.message || 'Failed to recover passphrase. Please try again.');
              }
            } catch (error) {
              console.error('❌ Password recovery error:', error);
              Alert.alert('Error', 'Failed to recover passphrase. Please check your connection and try again.');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to your LifePattern account</Text>
        </View>

      <View style={styles.formContainer}>
        {userCredentials ? (
          <View style={styles.welcomeBack}>
            <Text style={styles.welcomeText}>Welcome back!</Text>
            <Text style={styles.usernameText}>{userCredentials.username}</Text>
          </View>
        ) : (
          <Text style={styles.formTitle}>Returning User Sign In</Text>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLoading}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            value={passphrase}
            onChangeText={setPassphrase}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLoading}
          />
        </View>

        {/* Biometric Login Button - Only show if supported and user has credentials */}
        {isBiometricSupported && userCredentials && (
          <TouchableOpacity
            style={[styles.biometricButton, isLoading && styles.disabledButton]}
            onPress={handleBiometricLogin}
            disabled={isLoading}
          >
            <Text style={styles.biometricIcon}>
              {biometricType.includes('Face') ? '👤' : '👆'}
            </Text>
            <Text style={styles.biometricButtonText}>
              Login with {biometricType}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.loginButton, isLoading && styles.disabledButton]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginButtonText}>
              {isBiometricSupported && userCredentials ? 'Sign In with Password' : 'Sign In'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.createAccountButton}
          onPress={handleCreateAccount}
          disabled={isLoading}
        >
          <Text style={styles.createAccountText}>Create New Account</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.forgotButton}
          onPress={handleForgotCredentials}
          disabled={isLoading}
        >
          <Text style={styles.forgotText}>Forgot credentials?</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>🔐 Secure & Private</Text>
        <Text style={styles.infoText}>
          • No personal information collected{'\n'}
          • Credentials stored securely on device{'\n'}
          • Device-bound authentication{'\n'}
          • Your data stays private
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
  contentContainer: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 90,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
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
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  welcomeBack: {
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  usernameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 24,
    textAlign: 'center',
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
  biometricButton: {
    backgroundColor: '#34C759',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  biometricIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  biometricButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginButton: {
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
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  createAccountButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  createAccountText: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: '600',
  },
  forgotButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  forgotText: {
    color: '#666',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  infoContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
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
  navIconActive: {
    opacity: 1,
  },
  navLabel: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  navLabelActive: {
    color: '#6366f1',
    fontWeight: '600',
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