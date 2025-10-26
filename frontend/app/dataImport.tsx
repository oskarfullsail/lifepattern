import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation';
import { 
  syncWatchData,
  WatchData,
  createRoutineLog,
  RoutineLogPayload
} from './api/endpoint';
import userManager from './utils/userManager';
import { makeRequestWithWakeUp } from './utils/backendHealth';

type DataImportScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'DataImport'>;
type DataImportScreenRouteProp = RouteProp<RootStackParamList, 'DataImport'>;

interface Props {
  navigation: DataImportScreenNavigationProp;
  route: DataImportScreenRouteProp;
}

export default function DataImport({ navigation, route }: Props) {
  const { source } = route.params;
  const [isLoading, setIsLoading] = useState(false);
  const [importData, setImportData] = useState<any>({});
  const [showManualForm, setShowManualForm] = useState(false);
  const [csvFileName, setCsvFileName] = useState<string>('');
  const [csvData, setCsvData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [manualData, setManualData] = useState({
    sleep_hours: '',
    exercise_duration: '',
    screen_time: '',
    water_intake: '',
    stress_level: '',
    wake_up_time: '',
    bed_time: '',
    meal_times: '',
  });
  const [loadingMessage, setLoadingMessage] = useState<string>('Loading...');

  const handleHealthAppImport = async () => {
    setIsLoading(true);
    try {
      // Simulate health app data import
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockData = {
        sleep_hours: 7.5,
        meal_times: ['08:00', '12:30', '19:00'],
        screen_time: 4.2,
        exercise_duration: 1.5,
        wake_up_time: '07:00',
        bed_time: '23:00',
        water_intake: 2.5,
        stress_level: 3,
        log_date: new Date().toISOString().split('T')[0]
      };

      setImportData(mockData);
      Alert.alert(
        'Success', 
        'Health data imported successfully!',
        [{ text: 'OK', onPress: () => navigation.navigate('DataVisualization', { data: mockData }) }]
      );
    } catch (error) {
      console.error('Error importing health data:', error);
      Alert.alert('Error', 'Failed to import health data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCSVImport = () => {
    if (Platform.OS === 'web') {
      // Trigger file input click on web
      fileInputRef.current?.click();
    } else {
      // On mobile, show alert with file picker option
      Alert.alert(
        'CSV Import',
        'Please select a CSV file with your health data',
        [
          { text: 'Select File', onPress: () => {
            // In a real mobile app, this would use DocumentPicker
            Alert.alert('Info', 'File picker integration coming soon for mobile');
          }},
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }
  };

  const handleFileSelect = (event: any) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      Alert.alert('Error', 'Please select a CSV file');
      return;
    }

    setCsvFileName(file.name);
    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const rows = text.split('\n').filter(row => row.trim());
        
        if (rows.length < 2) {
          Alert.alert('Error', 'CSV file is empty or invalid');
          setIsLoading(false);
          return;
        }

        // Parse CSV
        const headers = rows[0].split(',').map(h => h.trim());
        const data = rows.slice(1).map(row => {
          const values = row.split(',').map(v => v.trim());
          const obj: any = {};
          headers.forEach((header, index) => {
            obj[header] = values[index];
          });
          return obj;
        });

        setCsvData(data);
        setIsLoading(false);
        
        Alert.alert(
          'Success',
          `CSV file "${file.name}" loaded successfully!\nFound ${data.length} records.`,
          [
            {
              text: 'Import',
              onPress: () => handleCSVDataImport(data)
            },
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {
                setCsvData([]);
                setCsvFileName('');
              }
            }
          ]
        );
      } catch (error) {
        console.error('Error parsing CSV:', error);
        Alert.alert('Error', 'Failed to parse CSV file. Please check the format.');
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      Alert.alert('Error', 'Failed to read file');
      setIsLoading(false);
    };

    reader.readAsText(file);
  };

  const handleCSVDataImport = async (data: any[]) => {
    setIsLoading(true);
    try {
      // Simulate API call to save CSV data
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      Alert.alert(
        'Success',
        `${data.length} records imported successfully!`,
        [
          {
            text: 'OK',
            onPress: () => {
              setCsvData([]);
              setCsvFileName('');
              navigation.goBack();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error importing CSV data:', error);
      Alert.alert('Error', 'Failed to import data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualEntry = () => {
    setShowManualForm(true);
  };

  const handleManualDataSubmit = async () => {
    // Validate form
    if (!manualData.sleep_hours || !manualData.exercise_duration) {
      Alert.alert('Error', 'Please fill in at least Sleep Hours and Exercise Duration');
      return;
    }

    setIsLoading(true);
    setLoadingMessage('Submitting data...');
    
    try {
      // Get current user ID
      const userId = await userManager.getUserId();
      
      // Parse meal times (comma-separated string to array)
      const mealTimesArray = manualData.meal_times
        ? manualData.meal_times.split(',').map(t => t.trim()).filter(t => t)
        : [];
      
      // Prepare payload for backend
      const payload: RoutineLogPayload = {
        user_id: userId,
        sleep_hours: parseFloat(manualData.sleep_hours),
        exercise_duration: parseFloat(manualData.exercise_duration),
        screen_time: manualData.screen_time ? parseFloat(manualData.screen_time) : 0,
        water_intake: manualData.water_intake ? parseFloat(manualData.water_intake) : 0,
        stress_level: manualData.stress_level ? Math.round(parseFloat(manualData.stress_level)) : 5,
        wake_up_time: manualData.wake_up_time || '07:00',
        bed_time: manualData.bed_time || '23:00',
        meal_times: mealTimesArray.length > 0 ? mealTimesArray : ['08:00', '12:00', '18:00'],
        log_date: new Date().toISOString().split('T')[0], // Today's date
      };
      
      console.log('📤 Submitting manual data to backend:', payload);
      
      // Call backend API with automatic wake-up handling
      const response = await makeRequestWithWakeUp(
        () => createRoutineLog(payload),
        () => setLoadingMessage('⏰ Waking up backend (30-60 sec)...'),
        (attempt, maxRetries) => setLoadingMessage(`🔄 Connecting (attempt ${attempt}/${maxRetries})...`)
      );
      
      console.log('✅ Backend response:', response);
      
      // Show success message with AI analysis if available
      let successMessage = 'Your health data has been saved successfully!';
      
      if (response.has_ai && response.ai_result) {
        const { is_anomaly, confidence_score, anomaly_type } = response.ai_result;
        
        if (is_anomaly) {
          successMessage += `\n\n🔍 AI Analysis:\nAn ${anomaly_type} pattern was detected with ${(confidence_score * 100).toFixed(0)}% confidence.`;
        } else {
          successMessage += `\n\n✅ AI Analysis:\nYour routine looks healthy! Keep it up!`;
        }
      }
      
      Alert.alert(
        'Success',
        successMessage,
        [
          {
            text: 'View Insights',
            onPress: () => {
              setShowManualForm(false);
              setManualData({
                sleep_hours: '',
                exercise_duration: '',
                screen_time: '',
                water_intake: '',
                stress_level: '',
                wake_up_time: '',
                bed_time: '',
                meal_times: '',
              });
              navigation.navigate('DataVisualization', {});
            }
          },
          {
            text: 'OK',
            onPress: () => {
              setShowManualForm(false);
              setManualData({
                sleep_hours: '',
                exercise_duration: '',
                screen_time: '',
                water_intake: '',
                stress_level: '',
                wake_up_time: '',
                bed_time: '',
                meal_times: '',
              });
              navigation.goBack();
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('❌ Error saving manual data:', error);
      
      // Detailed error logging
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          baseURL: error.config?.baseURL,
        }
      });
      
      // User-friendly error message
      let errorMessage = 'Failed to save data. ';
      
      if (error.response?.status === 401) {
        errorMessage += 'Authentication failed. Please log in again.';
      } else if (error.response?.status === 400) {
        errorMessage += 'Invalid data format. Please check your entries.';
      } else if (error.message?.includes('timeout')) {
        errorMessage += 'Request timed out. Backend might be waking up. Please try again.';
      } else if (error.message?.includes('Network Error')) {
        errorMessage += 'Network error. Please check your connection.';
      } else if (error.response?.data?.message) {
        errorMessage += error.response.data.message;
      } else {
        errorMessage += error.message || 'Unknown error occurred.';
      }
      
      Alert.alert(
        'Error', 
        errorMessage,
        [
          { text: 'View Details', onPress: () => console.log('Full error:', error) },
          { text: 'OK' }
        ]
      );
    } finally {
      setIsLoading(false);
      setLoadingMessage('Loading...');
    }
  };

  const handleWatchSync = async () => {
    setIsLoading(true);
    try {
      const mockWatchData: WatchData[] = [{
        heart_rate: 72,
        steps: 8500,
        calories: 450,
        sleep_hours: 7.5,
        activity_level: 'moderate',
        timestamp: new Date().toISOString()
      }];

      const data = await syncWatchData({
        user_id: 'current-user',
        device_info: {
          platform: Platform.OS as 'ios' | 'android' | 'web',
          device_id: 'device-id',
          device_name: `${Platform.OS} Device`,
          os_version: Platform.Version?.toString() || 'unknown',
          app_version: '1.0.0'
        },
        watch_data: mockWatchData
      });
      
      Alert.alert(
        'Success', 
        `Watch data synced successfully! ${data.synced_count} records synced.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error syncing watch data:', error);
      Alert.alert('Error', 'Failed to sync watch data');
    } finally {
      setIsLoading(false);
    }
  };

  const renderHealthAppImport = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Health App Integration</Text>
      <Text style={styles.sectionDescription}>
        Import data from Apple Health, Google Fit, or other health apps
      </Text>
      
      <TouchableOpacity 
        style={styles.importButton}
        onPress={handleHealthAppImport}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.importButtonText}>Import from Health App</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderCSVImport = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>CSV File Import</Text>
      <Text style={styles.sectionDescription}>
        Upload a CSV file with your health data
      </Text>
      
      {csvFileName && (
        <View style={styles.fileInfo}>
          <Text style={styles.fileInfoLabel}>Selected file:</Text>
          <Text style={styles.fileInfoName}>{csvFileName}</Text>
          <Text style={styles.fileInfoRecords}>
            {csvData.length > 0 ? `${csvData.length} records ready to import` : 'Processing...'}
          </Text>
        </View>
      )}
      
      <TouchableOpacity 
        style={styles.importButton}
        onPress={handleCSVImport}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.importButtonText}>
            {csvFileName ? 'Select Different File' : 'Select CSV File'}
          </Text>
        )}
      </TouchableOpacity>
      
      <View style={styles.csvFormat}>
        <Text style={styles.csvFormatTitle}>Expected CSV Format:</Text>
        <Text style={styles.csvFormatText}>
          date,sleep_hours,meal_times,screen_time,exercise_duration,wake_up_time,bed_time,water_intake,stress_level
        </Text>
        <Text style={styles.csvFormatExample}>
          Example:{'\n'}
          2025-10-26,7.5,"08:00,12:30,19:00",4.2,1.5,07:00,23:00,2.5,3
        </Text>
      </View>
    </View>
  );

  const renderManualEntry = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Manual Data Entry</Text>
      <Text style={styles.sectionDescription}>
        Enter your health data manually
      </Text>
      
      {!showManualForm ? (
        <TouchableOpacity 
          style={styles.importButton}
          onPress={handleManualEntry}
        >
          <Text style={styles.importButtonText}>Start Manual Entry</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Sleep Hours *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., 7.5"
              keyboardType="decimal-pad"
              value={manualData.sleep_hours}
              onChangeText={(text) => setManualData({...manualData, sleep_hours: text})}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Exercise Duration (hours) *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., 1.5"
              keyboardType="decimal-pad"
              value={manualData.exercise_duration}
              onChangeText={(text) => setManualData({...manualData, exercise_duration: text})}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Screen Time (hours)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., 4.0"
              keyboardType="decimal-pad"
              value={manualData.screen_time}
              onChangeText={(text) => setManualData({...manualData, screen_time: text})}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Water Intake (liters)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., 2.5"
              keyboardType="decimal-pad"
              value={manualData.water_intake}
              onChangeText={(text) => setManualData({...manualData, water_intake: text})}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Stress Level (1-10) *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., 5"
              keyboardType="number-pad"
              value={manualData.stress_level}
              onChangeText={(text) => {
                // Only allow integers 1-10
                const numValue = parseInt(text);
                if (text === '' || (!isNaN(numValue) && numValue >= 1 && numValue <= 10)) {
                  setManualData({...manualData, stress_level: text});
                }
              }}
            />
            <Text style={styles.inputHint}>Integer value between 1 and 10</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Wake Up Time</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., 07:00"
              value={manualData.wake_up_time}
              onChangeText={(text) => setManualData({...manualData, wake_up_time: text})}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Bed Time</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., 23:00"
              value={manualData.bed_time}
              onChangeText={(text) => setManualData({...manualData, bed_time: text})}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Meal Times (comma-separated)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., 08:00, 12:30, 19:00"
              value={manualData.meal_times}
              onChangeText={(text) => setManualData({...manualData, meal_times: text})}
            />
          </View>

          <TouchableOpacity 
            style={[styles.importButton, isLoading && styles.importButtonDisabled]}
            onPress={handleManualDataSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.importButtonText}>{loadingMessage}</Text>
              </View>
            ) : (
              <Text style={styles.importButtonText}>Submit Data</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => setShowManualForm(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderWatchSync = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Smartwatch Sync</Text>
      <Text style={styles.sectionDescription}>
        Sync data from your Apple Watch, Fitbit, or other smartwatch
      </Text>
      
      <TouchableOpacity 
        style={styles.importButton}
        onPress={handleWatchSync}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.importButtonText}>Sync Watch Data</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderSourceSpecificContent = () => {
    switch (source) {
      case 'health':
        return renderHealthAppImport();
      case 'csv':
        return renderCSVImport();
      case 'manual':
        return renderManualEntry();
      case 'watch':
        return renderWatchSync();
      default:
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Choose Import Method</Text>
            <Text style={styles.sectionDescription}>
              Select how you'd like to import your health data
            </Text>
            
            <View style={styles.importOptionsGrid}>
              <TouchableOpacity 
                style={styles.importOptionCard}
                onPress={() => navigation.navigate('DataImport', { source: 'manual' })}
              >
                <Text style={styles.importOptionIcon}>✍️</Text>
                <Text style={styles.importOptionTitle}>Manual Entry</Text>
                <Text style={styles.importOptionDesc}>Enter data manually</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.importOptionCard}
                onPress={() => navigation.navigate('DataImport', { source: 'csv' })}
              >
                <Text style={styles.importOptionIcon}>📄</Text>
                <Text style={styles.importOptionTitle}>CSV File</Text>
                <Text style={styles.importOptionDesc}>Upload CSV file</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.importOptionCard}
                onPress={() => navigation.navigate('DataImport', { source: 'health' })}
              >
                <Text style={styles.importOptionIcon}>🏥</Text>
                <Text style={styles.importOptionTitle}>Health App</Text>
                <Text style={styles.importOptionDesc}>Import from Apple Health</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.importOptionCard}
                onPress={() => navigation.navigate('DataImport', { source: 'watch' })}
              >
                <Text style={styles.importOptionIcon}>⌚</Text>
                <Text style={styles.importOptionTitle}>Smartwatch</Text>
                <Text style={styles.importOptionDesc}>Sync from wearables</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
    }
  };

  return (
    <View style={styles.wrapper}>
      {/* Hidden file input for web */}
      {Platform.OS === 'web' && (
        <input
          ref={fileInputRef as any}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      )}
      
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Import Data</Text>
          <Text style={styles.subtitle}>
            {source === 'health' && 'Import from Health Apps'}
            {source === 'csv' && 'Import from CSV File'}
            {source === 'manual' && 'Manual Data Entry'}
            {source === 'watch' && 'Smartwatch Sync'}
            {!source && 'Choose Import Method'}
          </Text>
        </View>

        {renderSourceSpecificContent()}

        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navTab} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navTab} onPress={() => navigation.navigate('UserDashboard')}>
          <Text style={styles.navIcon}>📊</Text>
          <Text style={styles.navLabel}>Dashboard</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.centerNavButton}>
          <View style={[styles.centerNavButtonInner, styles.centerNavButtonActive]}>
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
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    paddingBottom: 90,
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  importButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  importButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  csvFormat: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  csvFormatTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  csvFormatText: {
    fontSize: 12,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  csvFormatExample: {
    fontSize: 11,
    color: '#888',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  fileInfo: {
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  fileInfoLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  fileInfoName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  fileInfoRecords: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '500',
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
  },
  backButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  formContainer: {
    marginTop: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  importButtonDisabled: {
    backgroundColor: '#ccc',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  importOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 20,
  },
  importOptionCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  importOptionIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  importOptionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
    textAlign: 'center',
  },
  importOptionDesc: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
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
  centerNavButtonActive: {
    backgroundColor: '#8b5cf6',
  },
  centerNavIcon: {
    fontSize: 28,
    color: '#ffffff',
    fontWeight: 'bold',
  },
}); 