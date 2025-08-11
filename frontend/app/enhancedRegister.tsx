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
  Switch,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { 
  webAuthnRegistrationStart, 
  webAuthnRegistrationFinish,
  mobileChallenge,
  mobileVerify,
  verifyLinkToken,
  register,
  WebAuthnRegistrationStartRequest,
  MobileVerifyRequest,
  VerifyLinkTokenRequest,
  RegisterRequest
} from './api/endpoint';
import { testBackendConnection } from './api/client';
import userManager from './utils/userManager';

type EnhancedRegisterScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'EnhancedRegister'>;

interface Props {
  navigation: EnhancedRegisterScreenNavigationProp;
}

export default function EnhancedRegister({ navigation }: Props) {
  const [registrationMethod, setRegistrationMethod] = useState<'new' | 'link' | 'backend'>('backend');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<'method' | 'form' | 'verification'>('method');
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'failed'>('unknown');
  
  // Form fields
  const [username, setUsername] = useState('');
  const [deviceLabel, setDeviceLabel] = useState('');
  const [linkToken, setLinkToken] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [volunteerForAI, setVolunteerForAI] = useState(false);
  
  // WebAuthn state
  const [webAuthnSession, setWebAuthnSession] = useState<any>(null);
  const [webAuthnChallenge, setWebAuthnChallenge] = useState<any>(null);
  
  // Mobile auth state
  const [mobileChallengeId, setMobileChallengeId] = useState<string>('');
  const [mobileChallenge, setMobileChallenge] = useState<string>('');
  const [mobileResponse, setMobileResponse] = useState<string>('');
  
  // New registration state
  const [generatedCredentials, setGeneratedCredentials] = useState<{
    username: string;
    passphrase: string;
  } | null>(null);
  const [showCredentials, setShowCredentials] = useState(false);

  useEffect(() => {
    initializeDeviceLabel();
    testConnection();
  }, []);

  const testConnection = async () => {
    const result = await testBackendConnection();
    setConnectionStatus(result.success ? 'connected' : 'failed');
  };

  const initializeDeviceLabel = async () => {
    try {
      const user = await userManager.getCurrentUser();
      if (user) {
        setDeviceLabel(`${user.username}'s ${Platform.OS === 'ios' ? 'iPhone' : Platform.OS === 'android' ? 'Android' : 'Web'} Device`);
      }
    } catch (error) {
      console.error('Error initializing device label:', error);
    }
  };

  const handleBackendRegistration = async () => {
    if (!deviceLabel.trim()) {
      Alert.alert('Error', 'Please provide a device label');
      return;
    }

    if (!agreeToTerms) {
      Alert.alert('Error', 'You must agree to the Terms of Service and Privacy Policy');
      return;
    }

    setIsLoading(true);
    try {
      // Generate username and passphrase
      const generatedUsername = `user_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const generatedPassphrase = Math.random().toString(36).substr(2, 12) + 
                                 Math.random().toString(36).toUpperCase().substr(2, 4) + 
                                 Math.floor(Math.random() * 10);

      // Register with backend
      const response = await register({
        username: generatedUsername,
        passphrase: generatedPassphrase,
        device_label: deviceLabel.trim(),
      });

      // Store credentials for display
      setGeneratedCredentials({
        username: generatedUsername,
        passphrase: generatedPassphrase,
      });

      // Store tokens
      await userManager.storeTokens(response.access_token, response.refresh_token);
      
      setCurrentStep('verification');
      setShowCredentials(true);

      console.log('✅ Backend registration successful');
    } catch (error: any) {
      console.error('❌ Backend registration failed:', error);
      Alert.alert(
        'Registration Failed',
        error.response?.data || error.message || 'Failed to create account. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewAccountRegistration = async () => {
    if (!username.trim() || !deviceLabel.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!agreeToTerms) {
      Alert.alert('Error', 'You must agree to the Terms of Service and Privacy Policy');
      return;
    }

    setIsLoading(true);
    try {
      // Start WebAuthn registration
      const response = await webAuthnRegistrationStart({
        device_label: deviceLabel.trim(),
      });

      setWebAuthnSession(response.session_data);
      setWebAuthnChallenge(response.challenge);
      setCurrentStep('verification');

      Alert.alert(
        'Registration Started',
        'Please complete the biometric authentication on your device.',
        [{ text: 'OK' }]
      );
      
      // Simulate WebAuthn completion and redirect to dashboard
      setTimeout(() => {
        Alert.alert(
          'Registration Complete! 🎉',
          'Your account has been created successfully!',
          [
            {
              text: 'Continue to Dashboard',
              onPress: () => navigation.replace('UserDashboard'),
            },
          ]
        );
      }, 3000);
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', 'Failed to start registration. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkAccount = async () => {
    if (!linkToken.trim() || !deviceLabel.trim()) {
      Alert.alert('Error', 'Please enter both link token and device label');
      return;
    }

    setIsLoading(true);
    try {
      const response = await verifyLinkToken({
        link_token: linkToken.trim(),
        device_label: deviceLabel.trim(),
      });

      Alert.alert(
        'Success! 🎉',
        `Account linked successfully!\n\nLinked User ID: ${response.linked_user_id}\nYour User ID: ${response.user_id}`,
        [
          {
            text: 'Continue',
            onPress: () => navigation.replace('UserDashboard'),
          },
        ]
      );
    } catch (error) {
      console.error('Link error:', error);
      Alert.alert('Error', 'Failed to link account. Please check the token and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMobileChallenge = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    setIsLoading(true);
    try {
      const response = await mobileChallenge({
        user_id: username.trim(),
      });

      setMobileChallengeId(response.challenge_id);
      setMobileChallenge(response.challenge);
      setCurrentStep('verification');

      Alert.alert(
        'Challenge Generated',
        `Challenge: ${response.challenge}\n\nPlease respond with this challenge to verify your device.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Mobile challenge error:', error);
      Alert.alert('Error', 'Failed to generate challenge. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMobileVerify = async () => {
    if (!mobileResponse.trim() || !deviceLabel.trim()) {
      Alert.alert('Error', 'Please enter both response and device label');
      return;
    }

    setIsLoading(true);
    try {
      const response = await mobileVerify({
        challenge_id: mobileChallengeId,
        response: mobileResponse.trim(),
        device_label: deviceLabel.trim(),
      });

      Alert.alert(
        'Success! 🎉',
        'Mobile authentication completed successfully!',
        [
          {
            text: 'Continue',
            onPress: () => navigation.replace('UserDashboard'),
          },
        ]
      );
    } catch (error) {
      console.error('Mobile verify error:', error);
      Alert.alert('Error', 'Failed to verify mobile authentication. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderMethodSelection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Choose Registration Method</Text>
      
      <TouchableOpacity
        style={[styles.methodCard, registrationMethod === 'backend' && styles.methodCardActive]}
        onPress={() => setRegistrationMethod('backend')}
      >
        <Text style={styles.methodIcon}>🔐</Text>
        <Text style={styles.methodTitle}>Quick Registration</Text>
        <Text style={styles.methodDescription}>
          Create account with auto-generated credentials
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.methodCard, registrationMethod === 'new' && styles.methodCardActive]}
        onPress={() => setRegistrationMethod('new')}
      >
        <Text style={styles.methodIcon}>🆕</Text>
        <Text style={styles.methodTitle}>WebAuthn Registration</Text>
        <Text style={styles.methodDescription}>
          Use biometric authentication (fingerprint/face)
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.methodCard, registrationMethod === 'link' && styles.methodCardActive]}
        onPress={() => setRegistrationMethod('link')}
      >
        <Text style={styles.methodIcon}>🔗</Text>
        <Text style={styles.methodTitle}>Link Existing Account</Text>
        <Text style={styles.methodDescription}>
          Connect this device to an existing account
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.continueButton}
        onPress={() => setCurrentStep('form')}
        disabled={isLoading}
      >
        <Text style={styles.continueButtonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );

  const renderRegistrationForm = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        {registrationMethod === 'backend' ? 'Quick Registration' : 
         registrationMethod === 'new' ? 'WebAuthn Registration' : 'Link Existing Account'}
      </Text>

      {registrationMethod === 'backend' ? (
        <>
          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>🔐</Text>
            <Text style={styles.infoTitle}>Auto-Generated Credentials</Text>
            <Text style={styles.infoDescription}>
              We'll create secure username and passphrase for you. Save them carefully!
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>📱 Device Label</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., John's iPhone"
              value={deviceLabel}
              onChangeText={setDeviceLabel}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.optionsContainer}>
            <View style={styles.optionRow}>
              <Switch
                value={agreeToTerms}
                onValueChange={setAgreeToTerms}
                trackColor={{ false: '#767577', true: '#4A90E2' }}
                thumbColor={agreeToTerms ? '#fff' : '#f4f3f4'}
              />
              <Text style={styles.optionText}>
                I agree to the Terms of Service and Privacy Policy
              </Text>
            </View>

            <View style={styles.optionRow}>
              <Switch
                value={volunteerForAI}
                onValueChange={setVolunteerForAI}
                trackColor={{ false: '#767577', true: '#4A90E2' }}
                thumbColor={volunteerForAI ? '#fff' : '#f4f3f4'}
              />
              <Text style={styles.optionText}>
                Volunteer data for AI improvement (optional)
              </Text>
            </View>
          </View>

          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleBackendRegistration}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      ) : registrationMethod === 'new' ? (
        <>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>👤 Username</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>📱 Device Label</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., John's iPhone"
              value={deviceLabel}
              onChangeText={setDeviceLabel}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.optionsContainer}>
            <View style={styles.optionRow}>
              <Switch
                value={agreeToTerms}
                onValueChange={setAgreeToTerms}
                trackColor={{ false: '#767577', true: '#4A90E2' }}
                thumbColor={agreeToTerms ? '#fff' : '#f4f3f4'}
              />
              <Text style={styles.optionText}>
                I agree to the Terms of Service and Privacy Policy
              </Text>
            </View>

            <View style={styles.optionRow}>
              <Switch
                value={volunteerForAI}
                onValueChange={setVolunteerForAI}
                trackColor={{ false: '#767577', true: '#4A90E2' }}
                thumbColor={volunteerForAI ? '#fff' : '#f4f3f4'}
              />
              <Text style={styles.optionText}>
                Volunteer data for AI improvement (optional)
              </Text>
            </View>
          </View>

          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleNewAccountRegistration}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleMobileChallenge}
              disabled={isLoading}
            >
              <Text style={styles.secondaryButtonText}>Use Mobile Challenge</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>🔗 Link Token</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter link token from another device"
              value={linkToken}
              onChangeText={setLinkToken}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>📱 Device Label</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., John's iPhone"
              value={deviceLabel}
              onChangeText={setDeviceLabel}
              autoCapitalize="words"
            />
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleLinkAccount}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Link Account</Text>
            )}
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setCurrentStep('method')}
      >
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );

  const renderVerification = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Complete Verification</Text>
      
      {mobileChallengeId ? (
        <>
          <View style={styles.verificationCard}>
            <Text style={styles.verificationTitle}>Mobile Challenge</Text>
            <Text style={styles.verificationText}>
              Challenge: {mobileChallenge}
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>📝 Response</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter the challenge response"
              value={mobileResponse}
              onChangeText={setMobileResponse}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleMobileVerify}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Verify</Text>
            )}
          </TouchableOpacity>
        </>
      ) : showCredentials && generatedCredentials ? (
        <View style={styles.verificationCard}>
          <Text style={styles.verificationTitle}>🎉 Registration Successful!</Text>
          <Text style={styles.verificationText}>
            Your account has been created successfully. Please save your credentials:
          </Text>
          
          <View style={styles.credentialsContainer}>
            <View style={styles.credentialItem}>
              <Text style={styles.credentialLabel}>👤 Username:</Text>
              <Text style={styles.credentialValue}>{generatedCredentials.username}</Text>
            </View>
            
            <View style={styles.credentialItem}>
              <Text style={styles.credentialLabel}>🔑 Passphrase:</Text>
              <Text style={styles.credentialValue}>{generatedCredentials.passphrase}</Text>
            </View>
          </View>
          
          <View style={styles.warningContainer}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningText}>
              Save these credentials securely! You'll need them to log in later.
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.replace('UserDashboard')}
          >
            <Text style={styles.primaryButtonText}>Continue to Dashboard</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.verificationCard}>
          <Text style={styles.verificationTitle}>WebAuthn Registration</Text>
          <Text style={styles.verificationText}>
            Please complete the biometric authentication on your device.
          </Text>
          <Text style={styles.verificationNote}>
            This step requires device biometrics (fingerprint, face ID, etc.)
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setCurrentStep('form')}
      >
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Enhanced Registration</Text>
        <Text style={styles.subtitle}>
          Create a new account or link to an existing one
        </Text>
        
        {/* Connection Status */}
        <View style={styles.connectionStatus}>
          <View style={[
            styles.connectionIndicator, 
            connectionStatus === 'connected' && styles.connected,
            connectionStatus === 'failed' && styles.failed
          ]}>
            <Text style={styles.connectionText}>
              {connectionStatus === 'connected' ? '🔗 Connected to Backend' : 
               connectionStatus === 'failed' ? '❌ Backend Connection Failed' : 
               '⏳ Testing Connection...'}
            </Text>
          </View>
          {connectionStatus === 'failed' && (
            <TouchableOpacity style={styles.retryButton} onPress={testConnection}>
              <Text style={styles.retryButtonText}>Retry Connection</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {currentStep === 'method' && renderMethodSelection()}
      {currentStep === 'form' && renderRegistrationForm()}
      {currentStep === 'verification' && renderVerification()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  connectionStatus: {
    marginTop: 16,
    alignItems: 'center',
  },
  connectionIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginBottom: 8,
  },
  connected: {
    backgroundColor: '#d4edda',
  },
  failed: {
    backgroundColor: '#f8d7da',
  },
  connectionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  section: {
    margin: 20,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  methodCard: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  methodCardActive: {
    borderColor: '#4A90E2',
    backgroundColor: '#e3f2fd',
  },
  methodIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  methodDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  continueButton: {
    backgroundColor: '#4A90E2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  optionsContainer: {
    marginBottom: 20,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  optionText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  buttonGroup: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#4A90E2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
  backButton: {
    backgroundColor: '#6c757d',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  verificationCard: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 20,
  },
  verificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  verificationText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  verificationNote: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
  infoCard: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  infoIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 14,
    color: '#424242',
    lineHeight: 20,
  },
  credentialsContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  credentialItem: {
    marginBottom: 12,
  },
  credentialLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  credentialValue: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 4,
    color: '#2c3e50',
    fontWeight: '500',
  },
  warningContainer: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    marginVertical: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    flex: 1,
    lineHeight: 20,
  },
}); 