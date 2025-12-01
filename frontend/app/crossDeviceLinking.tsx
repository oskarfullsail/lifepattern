import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { generateLinkToken, verifyLinkToken, getLinkStatus, GenerateLinkTokenResponse, LinkStatusResponse } from './api/endpoint';
import userManager from './utils/userManager';

type CrossDeviceLinkingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CrossDeviceLinking'>;

interface Props {
  navigation: CrossDeviceLinkingScreenNavigationProp;
}

const { width } = Dimensions.get('window');

export default function CrossDeviceLinking({ navigation }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [linkToken, setLinkToken] = useState<GenerateLinkTokenResponse | null>(null);
  const [linkStatus, setLinkStatus] = useState<LinkStatusResponse | null>(null);
  const [inputToken, setInputToken] = useState('');
  const [deviceLabel, setDeviceLabel] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string>('');

  useEffect(() => {
    initializeScreen();
  }, []);

  const initializeScreen = async () => {
    try {
      const user = await userManager.getCurrentUser();
      if (user) {
        setCurrentUserId(user.userId);
        setDeviceLabel(`${user.username}'s ${Platform.OS === 'ios' ? 'iPhone' : Platform.OS === 'android' ? 'Android' : 'Web'} Device`);
      }
    } catch (error) {
      console.error('Error initializing screen:', error);
    }
  };

  const handleGenerateLinkToken = async () => {
    if (!deviceLabel.trim()) {
      Alert.alert('Error', 'Please enter a device label');
      return;
    }

    setIsLoading(true);
    try {
      const response = await generateLinkToken({
        device_label: deviceLabel.trim(),
      });
      setLinkToken(response);
      Alert.alert('Success', 'Link token generated! Share the QR code with another device.');
    } catch (error) {
      console.error('Error generating link token:', error);
      Alert.alert('Error', 'Failed to generate link token. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyLinkToken = async () => {
    if (!inputToken.trim() || !deviceLabel.trim()) {
      Alert.alert('Error', 'Please enter both link token and device label');
      return;
    }

    setIsLoading(true);
    try {
      const response = await verifyLinkToken({
        link_token: inputToken.trim(),
        device_label: deviceLabel.trim(),
      });
      
      Alert.alert(
        'Success! 🎉',
        `Device linked successfully!\n\nLinked User ID: ${response.linked_user_id}\nYour User ID: ${response.user_id}`,
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('UserDashboard'),
          },
        ]
      );
    } catch (error) {
      console.error('Error verifying link token:', error);
      Alert.alert('Error', 'Failed to verify link token. Please check the token and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetLinkStatus = async () => {
    setIsLoading(true);
    try {
      const response = await getLinkStatus();
      setLinkStatus(response);
    } catch (error) {
      console.error('Error getting link status:', error);
      Alert.alert('Error', 'Failed to get link status.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    // For web, we can use navigator.clipboard
    if (Platform.OS === 'web' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      Alert.alert('Copied!', 'Link token copied to clipboard');
    } else {
      Alert.alert('Link Token', text);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Cross-Device Linking</Text>
        <Text style={styles.subtitle}>
          Link your account across multiple devices to access your data anywhere
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Device Information</Text>
        <TextInput
          style={styles.input}
          placeholder="Device Label (e.g., John's iPhone)"
          value={deviceLabel}
          onChangeText={setDeviceLabel}
          autoCapitalize="words"
        />
        <Text style={styles.deviceInfo}>
          Current User ID: {currentUserId || 'Loading...'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Generate Link Token</Text>
        <Text style={styles.description}>
          Generate a QR code to link another device to your account
        </Text>
        
        <TouchableOpacity
          style={styles.button}
          onPress={handleGenerateLinkToken}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Generate QR Code</Text>
          )}
        </TouchableOpacity>

        {linkToken && (
          <View style={styles.qrContainer}>
            <Text style={styles.qrTitle}>QR Code Generated!</Text>
            <View style={styles.qrCode}>
              <Text style={styles.qrText}>[QR Code Image]</Text>
              <Text style={styles.qrNote}>
                In a real implementation, this would display the actual QR code
              </Text>
            </View>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={() => copyToClipboard(linkToken.link_token)}
            >
              <Text style={styles.copyButtonText}>Copy Link Token</Text>
            </TouchableOpacity>
            <Text style={styles.tokenInfo}>
              Token: {linkToken.link_token}
            </Text>
            <Text style={styles.expiryInfo}>
              Expires: {new Date(linkToken.expires_at).toLocaleString()}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Link Another Device</Text>
        <Text style={styles.description}>
          Enter a link token from another device to link accounts
        </Text>
        
        <TextInput
          style={styles.input}
          placeholder="Enter link token"
          value={inputToken}
          onChangeText={setInputToken}
          autoCapitalize="none"
          autoCorrect={false}
        />
        
        <TouchableOpacity
          style={styles.button}
          onPress={handleVerifyLinkToken}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Link Device</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active Link Tokens</Text>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleGetLinkStatus}
          disabled={isLoading}
        >
          <Text style={styles.secondaryButtonText}>Refresh Status</Text>
        </TouchableOpacity>

        {linkStatus && (
          <View style={styles.statusContainer}>
            {linkStatus.active_tokens.length === 0 ? (
              <Text style={styles.noTokens}>No active link tokens</Text>
            ) : (
              linkStatus.active_tokens.map((token, index) => (
                <View key={index} style={styles.tokenItem}>
                  <Text style={styles.tokenLabel}>Device: {token.device_label}</Text>
                  <Text style={styles.tokenValue}>Token: {token.link_token}</Text>
                  <Text style={styles.tokenExpiry}>
                    Expires: {new Date(token.expires_at).toLocaleString()}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
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
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  deviceInfo: {
    fontSize: 12,
    color: '#888',
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: '#4A90E2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
  },
  qrContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginTop: 16,
  },
  qrTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  qrCode: {
    width: 200,
    height: 200,
    backgroundColor: '#fff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  qrText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  qrNote: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  copyButton: {
    backgroundColor: '#28a745',
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
  },
  copyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  tokenInfo: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  expiryInfo: {
    fontSize: 12,
    color: '#888',
  },
  statusContainer: {
    marginTop: 16,
  },
  noTokens: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
  },
  tokenItem: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    marginBottom: 8,
  },
  tokenLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  tokenValue: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  tokenExpiry: {
    fontSize: 12,
    color: '#888',
  },
  backButton: {
    backgroundColor: '#6c757d',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 