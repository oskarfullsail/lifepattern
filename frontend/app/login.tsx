import React, { useState, useEffect, useRef } from 'react';
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
import userManager, { UserCredentials } from './utils/userManager';
import { requestPasswordRecovery } from './api/endpoint';
import {
  checkBiometricSupport,
  loginWithBiometrics,
  isBiometricLoginEnabled,
  setBiometricLoginEnabled,
  tryBiometricAutoLogin,
  BiometricCapabilities,
} from './utils/biometricAuth';
import { startBackgroundWarmup } from './services/serviceWarmup';

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
  const [biometricCapabilities, setBiometricCapabilities] = useState<BiometricCapabilities>({
    isSupported: false,
    isEnrolled: false,
    types: [],
    typeLabel: '',
  });
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const passwordInputRef = useRef<TextInput>(null);

  useEffect(() => {
    // IMPORTANT: Check biometrics FIRST before showing login form
    // This prevents the login form from flashing before biometric prompt
    initializeBiometricsFirst();
  }, []);

  const initializeBiometricsFirst = async () => {
    try {
      setIsInitializing(true);
      
      // 1. First check biometric support
      const capabilities = await checkBiometricSupport();
      setBiometricCapabilities(capabilities);

      // 2. Check if biometric login is enabled
      const enabled = await isBiometricLoginEnabled();
      setBiometricEnabled(enabled);
      
      console.log('🔐 Biometric check:', { enabled, isSupported: capabilities.isSupported, isEnrolled: capabilities.isEnrolled });

      // 3. If biometric is enabled and supported, try auto-login BEFORE showing login form
      if (enabled && capabilities.isSupported && capabilities.isEnrolled) {
        const hasTokens = await userManager.getRefreshToken();
        console.log('🔑 Has stored tokens:', !!hasTokens);
        
        if (hasTokens) {
          console.log('🔄 Attempting biometric auto-login...');
          const autoLoginResult = await tryBiometricAutoLogin();
          
          if (autoLoginResult.success) {
            console.log('✅ Biometric auto-login successful');
            
            // Start warming up backend services in the background
            try {
              console.log('🌅 Starting background service warm-up after auto-login...');
              startBackgroundWarmup((progress) => {
                console.log(`📊 Service warm-up: ${progress.message} (${progress.progress}%)`);
              });
            } catch (error) {
              console.error('❌ Error starting background warm-up:', error);
            }
            
            navigation.replace('UserDashboard');
            return; // Don't continue to show login form
          } else {
            console.log('ℹ️ Biometric auto-login failed:', autoLoginResult.error);
            // Continue to show login form as fallback
          }
        }
      }

      // 4. If we get here, proceed with normal login initialization
      await initializeLogin();
      
    } catch (error) {
      console.error('❌ Error initializing biometrics:', error);
      // Fallback to normal login flow
      await initializeLogin();
    }
  };

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


  const handleBiometricLogin = async () => {
    try {
      setIsLoading(true);
      console.log('🔐 Attempting biometric login...');

      const result = await loginWithBiometrics();

      if (result.success) {
        console.log('✅ Biometric login successful, navigating to UserDashboard');
        
        // Start warming up backend services in the background
        try {
          console.log('🌅 Starting background service warm-up after biometric login...');
          startBackgroundWarmup((progress) => {
            console.log(`📊 Service warm-up: ${progress.message} (${progress.progress}%)`);
          });
        } catch (error) {
          console.error('❌ Error starting background warm-up:', error);
        }
        
        navigation.replace('UserDashboard');
      } else {
        if (result.needsPassword) {
          // User needs to login with password first
          Alert.alert(
            'Setup Required',
            result.error || 'Please log in with your username and password first to enable biometric authentication.',
            [
              { text: 'OK' },
              {
                text: 'Enable Biometric Login',
                onPress: async () => {
                  // After successful password login, enable biometric
                  // This will be handled in handleLogin
                },
              },
            ]
          );
        } else if (result.error === 'Authentication cancelled' || result.error?.includes('cancel')) {
          // User cancelled, do nothing
          console.log('ℹ️ User cancelled biometric authentication');
          return;
        } else {
          Alert.alert(
            'Authentication Failed',
            result.error || 'Biometric authentication was not successful. Please try again or use your password.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error: any) {
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
        console.log('✅ Login successful');
        
        // Start warming up backend services in the background
        // This ensures both services are ready when user needs them
        try {
          console.log('🌅 Starting background service warm-up...');
          startBackgroundWarmup((progress) => {
            console.log(`📊 Service warm-up: ${progress.message} (${progress.progress}%)`);
          });
        } catch (error) {
          console.error('❌ Error starting background warm-up:', error);
        }
        
        // If biometrics are available and not yet enabled, offer to enable
        if (biometricCapabilities.isSupported && biometricCapabilities.isEnrolled && !biometricEnabled) {
          Alert.alert(
            'Enable Biometric Login?',
            `Would you like to enable ${biometricCapabilities.typeLabel} for faster login next time?`,
            [
              {
                text: 'Not Now',
                style: 'cancel',
                onPress: () => {
                  navigation.replace('UserDashboard');
                },
              },
              {
                text: 'Enable',
                onPress: async () => {
                  await setBiometricLoginEnabled(true);
                  setBiometricEnabled(true);
                  console.log(`✅ ${biometricCapabilities.typeLabel} login enabled`);
                  navigation.replace('UserDashboard');
                },
              },
            ]
          );
        } else {
          navigation.replace('UserDashboard');
        }
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
            returnKeyType="next"
            onSubmitEditing={() => passwordInputRef.current?.focus()}
            blurOnSubmit={false}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            ref={passwordInputRef}
            style={styles.input}
            placeholder="Enter your password"
            value={passphrase}
            onChangeText={setPassphrase}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLoading}
            returnKeyType="go"
            onSubmitEditing={handleLogin}
          />
        </View>

        {/* Biometric Login Button - Show if supported and enrolled */}
        {biometricCapabilities.isSupported && biometricCapabilities.isEnrolled && (
          <TouchableOpacity
            style={[styles.biometricButton, isLoading && styles.disabledButton]}
            onPress={handleBiometricLogin}
            disabled={isLoading}
          >
            <Text style={styles.biometricIcon}>
              {biometricCapabilities.typeLabel.includes('Face') ? '👤' : '👆'}
            </Text>
            <Text style={styles.biometricButtonText}>
              Login with {biometricCapabilities.typeLabel}
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
              {biometricCapabilities.isSupported && biometricCapabilities.isEnrolled ? 'Sign In with Password' : 'Sign In'}
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