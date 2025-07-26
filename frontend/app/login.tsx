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
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import userManager, { UserCredentials } from './utils/userManager';

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

  useEffect(() => {
    initializeLogin();
  }, []);

  const initializeLogin = async () => {
    try {
      setIsInitializing(true);
      
      // Check if user already has credentials
      const credentials = await userManager.getUserCredentials();
      if (credentials) {
        setUserCredentials(credentials);
        setUsername(credentials.username);
      }
      
      // Check if user is already authenticated
      const isAuthenticated = await userManager.isAuthenticated();
      if (isAuthenticated) {
        navigation.replace('Dashboard');
        return;
      }
      
    } catch (error) {
      console.error('Error initializing login:', error);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleLogin = async () => {
    if (!username.trim() || !passphrase.trim()) {
      Alert.alert('Error', 'Please enter both username and passphrase');
      return;
    }

    setIsLoading(true);

    try {
      const success = await userManager.authenticateUser(username.trim(), passphrase.trim());
      
      if (success) {
        Alert.alert('Success', 'Welcome back!', [
          { text: 'OK', onPress: () => navigation.replace('Dashboard') }
        ]);
      } else {
        Alert.alert('Error', 'Invalid username or passphrase. Please try again.');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'Failed to login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    console.log('Create account button clicked');
    try {
      setIsLoading(true);
      console.log('Initializing new user...');
      
      // Initialize new user
      const session = await userManager.initializeUser();
      console.log('User session created:', session);
      
      const credentials = await userManager.getUserCredentials();
      console.log('User credentials retrieved:', credentials);
      
      if (credentials) {
        console.log('Showing credentials alert');
        Alert.alert(
          'Account Created! 🎉',
          `Your credentials:\n\nUsername: ${credentials.username}\nPassphrase: ${credentials.passphrase}\n\nPlease save these credentials safely!`,
          [
            {
              text: 'I Saved Them',
              onPress: () => {
                console.log('User confirmed credentials, proceeding to login');
                setUsername(credentials.username);
                setPassphrase(credentials.passphrase);
                handleLogin();
              }
            }
          ]
        );
      } else {
        console.error('No credentials returned from userManager');
        Alert.alert('Error', 'Failed to generate credentials. Please try again.');
      }
    } catch (error) {
      console.error('Error creating account:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error', `Failed to create account: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotCredentials = () => {
    Alert.alert(
      'Forgot Credentials?',
      'Since we don\'t store personal information, you\'ll need to create a new account. Your data will be preserved on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Create New Account', onPress: handleCreateAccount }
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
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome to LifePattern</Text>
        <Text style={styles.subtitle}>Your AI-powered lifestyle companion</Text>
      </View>

      <View style={styles.formContainer}>
        {userCredentials ? (
          <View style={styles.welcomeBack}>
            <Text style={styles.welcomeText}>Welcome back!</Text>
            <Text style={styles.usernameText}>{userCredentials.username}</Text>
          </View>
        ) : (
          <Text style={styles.formTitle}>Sign In</Text>
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
          <Text style={styles.label}>Passphrase</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your passphrase"
            value={passphrase}
            onChangeText={setPassphrase}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLoading}
          />
        </View>

        <TouchableOpacity
          style={[styles.loginButton, isLoading && styles.disabledButton]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginButtonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        {!userCredentials && (
          <TouchableOpacity
            style={styles.createAccountButton}
            onPress={handleCreateAccount}
            disabled={isLoading}
          >
            <Text style={styles.createAccountText}>Create New Account</Text>
          </TouchableOpacity>
        )}

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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    flexGrow: 1,
    padding: 20,
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
}); 