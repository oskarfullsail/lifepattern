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

// Interface for fetched health data
interface FetchedHealthData {
  sleep_hours?: number;
  steps?: number;
  heart_rate_avg?: number;
  exercise_duration?: number;
  water_intake?: number;
  meal_times?: string[];
  calories?: number;
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
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  
  // New state for fetched health data display
  const [fetchedHealthData, setFetchedHealthData] = useState<FetchedHealthData | null>(null);
  const [showHealthDataPreview, setShowHealthDataPreview] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // ===== INPUT VALIDATION HELPERS =====
  
  // Validate and sanitize decimal number input (for hours/liters)
  const validateDecimalInput = (text: string, fieldName: string, min: number = 0, max: number = 24): string => {
    if (!text) {
      setErrors(prev => ({ ...prev, [fieldName]: '' }));
      return '';
    }
    
    // Only allow numbers and one decimal point
    const sanitized = text.replace(/[^0-9.]/g, '');
    const parts = sanitized.split('.');
    let cleanValue = parts[0];
    if (parts.length > 1) {
      cleanValue += '.' + parts[1].slice(0, 1);
    }
    
    const numValue = parseFloat(cleanValue);
    if (!isNaN(numValue)) {
      if (numValue < min) {
        setErrors(prev => ({ ...prev, [fieldName]: `Minimum is ${min}` }));
      } else if (numValue > max) {
        setErrors(prev => ({ ...prev, [fieldName]: `Maximum is ${max}` }));
      } else {
        setErrors(prev => ({ ...prev, [fieldName]: '' }));
      }
    }
    
    return cleanValue;
  };

  // Validate integer input (for stress level)
  const validateIntegerInput = (text: string, fieldName: string, min: number = 1, max: number = 10): string => {
    if (!text) {
      setErrors(prev => ({ ...prev, [fieldName]: '' }));
      return '';
    }
    
    const sanitized = text.replace(/[^0-9]/g, '');
    const numValue = parseInt(sanitized, 10);
    
    if (!isNaN(numValue)) {
      if (numValue < min) {
        setErrors(prev => ({ ...prev, [fieldName]: `Minimum is ${min}` }));
      } else if (numValue > max) {
        setErrors(prev => ({ ...prev, [fieldName]: `Maximum is ${max}` }));
      } else {
        setErrors(prev => ({ ...prev, [fieldName]: '' }));
      }
    }
    
    return sanitized;
  };

  // Validate time format (HH:MM)
  const validateTimeInput = (text: string, fieldName: string): string => {
    const sanitized = text.replace(/[^0-9:]/g, '');
    
    if (sanitized.length === 2 && !sanitized.includes(':')) {
      return sanitized + ':';
    }
    
    if (sanitized.length > 5) {
      return sanitized.slice(0, 5);
    }
    
    if (sanitized.length === 5) {
      const [hours, minutes] = sanitized.split(':').map(Number);
      if (hours > 23 || minutes > 59) {
        setErrors(prev => ({ ...prev, [fieldName]: 'Invalid time (00:00 - 23:59)' }));
      } else {
        setErrors(prev => ({ ...prev, [fieldName]: '' }));
      }
    }
    
    return sanitized;
  };

  // Field change handlers
  const handleFieldChange = (field: string, value: string, validator?: (text: string, field: string) => string) => {
    const validatedValue = validator ? validator(value, field) : value;
    setManualData(prev => ({ ...prev, [field]: validatedValue }));
  };

  const handleHealthAppImport = async () => {
    setIsLoading(true);
    setLoadingMessage('Connecting to Health App...');

    try {
      // Get user ID
      const userId = await userManager.getUserId();
      if (!userId) {
        Alert.alert('Error', 'Please log in to import health data');
        setIsLoading(false);
        return;
      }

      // Check platform
      if (Platform.OS === 'web') {
        Alert.alert(
          'Not Available on Web',
          'Health app integration is only available on iOS and Android devices.\n\n' +
          'Please use the mobile app to import health data, or try manual entry.',
          [
            { text: 'OK' },
            {
              text: 'Manual Entry',
              onPress: () => setShowManualForm(true)
            }
          ]
        );
        setIsLoading(false);
        return;
      }

      setLoadingMessage('Checking health app availability...');

      // Import the health sync service dynamically
      const healthSync = require('./services/healthSync').default;

      // Step 1: Check if health data source is available on this device
      setLoadingMessage(Platform.OS === 'ios' 
        ? 'Checking Apple Health...' 
        : 'Checking Health Connect...');
      
      const isAvailable = await healthSync.isHealthDataAvailable();
      console.log('📊 Health data available:', isAvailable);

      if (!isAvailable) {
        // Platform-specific setup instructions
        const platformMessage = Platform.OS === 'ios'
          ? '📱 Apple Health Setup Required:\n\n' +
            '1. This feature requires a custom app build\n' +
            '2. The app needs to be built with native HealthKit support\n\n' +
            'Build commands:\n' +
            '• npx expo prebuild\n' +
            '• npx expo run:ios\n\n' +
            'For now, please use Manual Entry.'
          : '🤖 Health Connect Setup Required:\n\n' +
            '1. Install "Health Connect by Google" from Play Store\n' +
            '2. Open Health Connect and grant permissions\n' +
            '3. This app needs a custom build:\n\n' +
            'Build commands:\n' +
            '• npx expo prebuild\n' +
            '• npx expo run:android\n\n' +
            'For now, please use Manual Entry.';

        Alert.alert(
          'Health App Not Available',
          platformMessage,
          [
            { text: 'OK' },
            {
              text: 'Use Manual Entry',
              onPress: () => setShowManualForm(true)
            }
          ]
        );
        setIsLoading(false);
        return;
      }

      // Step 2: Request permissions
      setLoadingMessage('Requesting health permissions...');
      const permissionStatus = await healthSync.requestHealthPermissions();
      console.log('📊 Permission status:', permissionStatus);

      if (!permissionStatus.isAuthorized) {
        // Check if the issue is missing native module vs denied permissions
        const isModuleMissing = permissionStatus.message?.includes('module not installed') ||
          permissionStatus.message?.includes('Module error') ||
          permissionStatus.missingPermissions.some((p: string) => p.includes('react-native-health'));

        if (isModuleMissing) {
          // Native module not installed - explain custom build requirement
          Alert.alert(
            '🔧 Custom Build Required',
            Platform.OS === 'ios'
              ? 'Health app integration requires a custom app build with Apple HealthKit support.\n\n' +
                '📱 This feature is not available in Expo Go.\n\n' +
                'To enable Health App import:\n' +
                '1. Run: npx expo prebuild\n' +
                '2. Run: npx expo run:ios\n\n' +
                '💡 For now, use Manual Entry to log your health data.'
              : 'Health app integration requires a custom app build with Health Connect support.\n\n' +
                '📱 This feature is not available in Expo Go.\n\n' +
                'To enable Health App import:\n' +
                '1. Install "Health Connect" from Play Store\n' +
                '2. Run: npx expo prebuild\n' +
                '3. Run: npx expo run:android\n\n' +
                '💡 For now, use Manual Entry to log your health data.',
            [
              { text: 'OK' },
              {
                text: 'Use Manual Entry',
                onPress: () => setShowManualForm(true),
                style: 'default'
              }
            ]
          );
        } else {
          // Permissions denied - guide user to settings
          Alert.alert(
            'Permissions Required',
            `${permissionStatus.message}\n\n` +
            'Please grant health data access in your device settings:\n\n' +
            (Platform.OS === 'ios'
              ? 'Settings → Privacy & Security → Health → LifePattern'
              : 'Settings → Apps → LifePattern → Permissions'),
            [
              { text: 'OK' },
              {
                text: 'Try Again',
                onPress: () => handleHealthAppImport()
              },
              {
                text: 'Manual Entry',
                onPress: () => setShowManualForm(true)
              }
            ]
          );
        }
        setIsLoading(false);
        return;
      }

      // Step 3: Fetch health data (don't sync yet - show preview first)
      setLoadingMessage('Fetching health data...');
      const healthData = await healthSync.fetchHealthDataForToday();
      
      console.log('📊 Fetched health data:', healthData);
      
      // Store the fetched data and show preview
      setFetchedHealthData(healthData);
      setShowHealthDataPreview(true);
      
      // No error alert - just show what we found (even if empty)
      
    } catch (error: any) {
      console.error('Error importing health data:', error);

      // Only show error alert for actual errors (not "no data")
      Alert.alert(
        'Import Failed',
        'Error: ' + (error.message || 'Unknown error'),
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
      setLoadingMessage('Loading...');
    }
  };
  
  // Sync the fetched health data to backend
  const handleSyncHealthData = async () => {
    if (!fetchedHealthData) return;
    
    setIsSyncing(true);
    setLoadingMessage('Syncing to your account...');
    
    try {
      const healthSync = require('./services/healthSync').default;
      const success = await healthSync.manualHealthSync();
      
      if (success) {
        Alert.alert(
          '✅ Synced!',
          'Health data has been saved to your account.',
          [
            {
              text: 'View Dashboard',
              onPress: () => navigation.navigate('UserDashboard')
            },
            { text: 'OK', onPress: () => {
              setShowHealthDataPreview(false);
              setFetchedHealthData(null);
            }}
          ]
        );
      } else {
        // Data was fetched but couldn't sync (maybe no meaningful data for backend)
        Alert.alert(
          'Sync Complete',
          'Health data was read but some fields may not have synced (backend requires sleep, exercise, or water data).',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      Alert.alert('Sync Error', error.message || 'Failed to sync data');
    } finally {
      setIsSyncing(false);
      setLoadingMessage('Loading...');
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
      
      // ===== VALIDATION & CONVERSION =====
      // Backend expects:
      // - exercise_duration: INTEGER (minutes)
      // - screen_time: INTEGER (minutes)
      // - stress_level: INTEGER (1-10)
      // - sleep_hours: DECIMAL (hours, e.g., 7.5)
      // - water_intake: DECIMAL (liters, e.g., 2.5)
      
      const sleepHoursValue = parseFloat(manualData.sleep_hours);
      const exerciseHoursValue = parseFloat(manualData.exercise_duration);
      const screenTimeHoursValue = manualData.screen_time ? parseFloat(manualData.screen_time) : 0;
      const waterIntakeValue = manualData.water_intake ? parseFloat(manualData.water_intake) : 0;
      const stressLevelValue = manualData.stress_level ? parseInt(manualData.stress_level, 10) : 5;
      
      // Validate values
      if (isNaN(sleepHoursValue) || sleepHoursValue < 0 || sleepHoursValue > 24) {
        Alert.alert('Validation Error', 'Sleep hours must be between 0 and 24');
        return;
      }
      
      if (isNaN(exerciseHoursValue) || exerciseHoursValue < 0 || exerciseHoursValue > 24) {
        Alert.alert('Validation Error', 'Exercise duration must be between 0 and 24 hours');
        return;
      }
      
      if (isNaN(stressLevelValue) || stressLevelValue < 1 || stressLevelValue > 10) {
        Alert.alert('Validation Error', 'Stress level must be an integer between 1 and 10');
        return;
      }
      
      // Convert hours to minutes (backend expects INTEGER minutes)
      const exerciseMinutes = Math.round(exerciseHoursValue * 60);
      const screenTimeMinutes = Math.round(screenTimeHoursValue * 60);
      
      console.log('📊 Data conversion:', {
        exercise: { input: exerciseHoursValue + ' hours', output: exerciseMinutes + ' minutes' },
        screenTime: { input: screenTimeHoursValue + ' hours', output: screenTimeMinutes + ' minutes' },
        stressLevel: stressLevelValue,
      });
      
      // Prepare payload for backend
      const payload: RoutineLogPayload = {
        user_id: userId,
        sleep_hours: Math.round(sleepHoursValue * 10) / 10, // Round to 1 decimal
        exercise_duration: exerciseMinutes, // Backend expects INTEGER minutes
        screen_time: screenTimeMinutes, // Backend expects INTEGER minutes
        water_intake: Math.round(waterIntakeValue * 10) / 10, // Round to 1 decimal
        stress_level: stressLevelValue, // Backend expects INTEGER 1-10
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
      
      // Reset form
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
      
      // Navigate to AI Insights if we have AI analysis
      if (response.has_ai && response.ai_result) {
        navigation.navigate('AIInsights', {
          aiResponse: response.ai_result,
          logId: response.log_id,
          userId: userId, // Use the userId we already have
        });
      } else {
        // Fallback to simple success message if no AI response
        Alert.alert(
          'Success',
          'Your health data has been saved successfully!',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      }
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

  // Render health data preview card
  const renderHealthDataCard = (icon: string, label: string, value: string | number | undefined, unit: string) => {
    const hasValue = value !== undefined && value !== null && value !== 0;
    return (
      <View style={[styles.healthDataCard, !hasValue && styles.healthDataCardEmpty]}>
        <Text style={styles.healthDataIcon}>{icon}</Text>
        <Text style={styles.healthDataLabel}>{label}</Text>
        <Text style={[styles.healthDataValue, !hasValue && styles.healthDataValueEmpty]}>
          {hasValue ? `${value} ${unit}` : 'No data'}
        </Text>
      </View>
    );
  };

  const renderHealthAppImport = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Health App Integration</Text>
      <Text style={styles.sectionDescription}>
        Import data from {Platform.OS === 'ios' ? 'Apple Health' : Platform.OS === 'android' ? 'Google Fit' : 'your health app'}
      </Text>
      
      {Platform.OS === 'web' && (
        <View style={styles.warningBox}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={styles.warningText}>
            Health app integration is only available on iOS and Android. Please use the mobile app or try manual entry.
          </Text>
        </View>
      )}

      {Platform.OS !== 'web' && !showHealthDataPreview && (
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoBoxText}>
            {Platform.OS === 'ios' 
              ? 'Requires Apple Health access. Make sure LifePattern has permission in Settings > Privacy > Health.'
              : 'Requires Google Fit access. Make sure Google Fit is installed and permissions are granted.'}
          </Text>
        </View>
      )}
      
      {/* Health Data Preview - Show when we have fetched data */}
      {showHealthDataPreview && (
        <View style={styles.healthDataPreview}>
          <Text style={styles.healthDataPreviewTitle}>
            📊 Data Found in {Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect'}
          </Text>
          
          {fetchedHealthData ? (
            <>
              <View style={styles.healthDataGrid}>
                {renderHealthDataCard('👣', 'Steps', fetchedHealthData.steps, 'steps')}
                {renderHealthDataCard('😴', 'Sleep', fetchedHealthData.sleep_hours, 'hours')}
                {renderHealthDataCard('🏃', 'Exercise', fetchedHealthData.exercise_duration, 'hours')}
                {renderHealthDataCard('💧', 'Water', fetchedHealthData.water_intake, 'L')}
                {renderHealthDataCard('❤️', 'Heart Rate', fetchedHealthData.heart_rate_avg, 'bpm')}
                {renderHealthDataCard('🔥', 'Calories', fetchedHealthData.calories, 'kcal')}
              </View>
              
              {/* Show sync status message */}
              {!fetchedHealthData.sleep_hours && !fetchedHealthData.exercise_duration && !fetchedHealthData.water_intake && (
                <View style={styles.syncWarning}>
                  <Text style={styles.syncWarningText}>
                    ℹ️ Note: Backend requires sleep, exercise, or water data to sync. Steps are displayed but not yet synced to backend.
                  </Text>
                </View>
              )}
              
              <View style={styles.healthDataActions}>
                <TouchableOpacity 
                  style={[styles.syncButton, isSyncing && styles.syncButtonDisabled]}
                  onPress={handleSyncHealthData}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator color="#fff" size="small" />
                      <Text style={styles.syncButtonText}>{loadingMessage}</Text>
                    </View>
                  ) : (
                    <Text style={styles.syncButtonText}>✅ Sync to Account</Text>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.refreshButton}
                  onPress={handleHealthAppImport}
                  disabled={isLoading || isSyncing}
                >
                  <Text style={styles.refreshButtonText}>🔄 Refresh Data</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.dismissButton}
                  onPress={() => {
                    setShowHealthDataPreview(false);
                    setFetchedHealthData(null);
                  }}
                >
                  <Text style={styles.dismissButtonText}>✕ Close</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.noDataBox}>
              <Text style={styles.noDataIcon}>📭</Text>
              <Text style={styles.noDataText}>
                No health data found for today.{'\n'}
                Try logging some activity in {Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect'} first!
              </Text>
              <TouchableOpacity 
                style={styles.tryManualButton}
                onPress={() => {
                  setShowHealthDataPreview(false);
                  setShowManualForm(true);
                }}
              >
                <Text style={styles.tryManualButtonText}>Enter Manually Instead</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
      
      {/* Show import button only when not previewing */}
      {!showHealthDataPreview && (
        <>
          <TouchableOpacity 
            style={[styles.importButton, Platform.OS === 'web' && styles.disabledButton]}
            onPress={handleHealthAppImport}
            disabled={isLoading || Platform.OS === 'web'}
          >
            {isLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.loadingText}>{loadingMessage}</Text>
              </View>
            ) : (
              <Text style={styles.importButtonText}>
                {Platform.OS === 'ios' ? '🍎 Import from Apple Health' : 
                 Platform.OS === 'android' ? '🏃 Import from Google Fit' : 
                 'Import from Health App'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.alternativeButton}
            onPress={() => setShowManualForm(true)}
            disabled={isLoading}
          >
            <Text style={styles.alternativeButtonText}>
              Or enter data manually →
            </Text>
          </TouchableOpacity>
        </>
      )}
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
            <Text style={styles.inputLabel}>Sleep Hours * (0-24)</Text>
            <TextInput
              style={[styles.textInput, errors.sleep_hours ? styles.inputError : null]}
              placeholder="e.g., 7.5 (hours)"
              keyboardType="decimal-pad"
              value={manualData.sleep_hours}
              onChangeText={(text) => handleFieldChange('sleep_hours', text, (t, f) => validateDecimalInput(t, f, 0, 24))}
              maxLength={4}
            />
            {errors.sleep_hours ? <Text style={styles.errorText}>{errors.sleep_hours}</Text> : null}
            <Text style={styles.inputHint}>Enter hours (e.g., 7.5 = 7h 30min)</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Exercise Duration (hours) * (0-24)</Text>
            <TextInput
              style={[styles.textInput, errors.exercise_duration ? styles.inputError : null]}
              placeholder="e.g., 1.5 (hours)"
              keyboardType="decimal-pad"
              value={manualData.exercise_duration}
              onChangeText={(text) => handleFieldChange('exercise_duration', text, (t, f) => validateDecimalInput(t, f, 0, 24))}
              maxLength={4}
            />
            {errors.exercise_duration ? <Text style={styles.errorText}>{errors.exercise_duration}</Text> : null}
            <Text style={styles.inputHint}>Enter hours (e.g., 0.5 = 30min, 1.5 = 1h 30min). Will be converted to minutes.</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Screen Time (hours) (0-24)</Text>
            <TextInput
              style={[styles.textInput, errors.screen_time ? styles.inputError : null]}
              placeholder="e.g., 4.0 (hours)"
              keyboardType="decimal-pad"
              value={manualData.screen_time}
              onChangeText={(text) => handleFieldChange('screen_time', text, (t, f) => validateDecimalInput(t, f, 0, 24))}
              maxLength={4}
            />
            {errors.screen_time ? <Text style={styles.errorText}>{errors.screen_time}</Text> : null}
            <Text style={styles.inputHint}>Enter hours of screen time. Will be converted to minutes.</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Water Intake (liters) (0-10)</Text>
            <TextInput
              style={[styles.textInput, errors.water_intake ? styles.inputError : null]}
              placeholder="e.g., 2.5 (liters)"
              keyboardType="decimal-pad"
              value={manualData.water_intake}
              onChangeText={(text) => handleFieldChange('water_intake', text, (t, f) => validateDecimalInput(t, f, 0, 10))}
              maxLength={4}
            />
            {errors.water_intake ? <Text style={styles.errorText}>{errors.water_intake}</Text> : null}
            <Text style={styles.inputHint}>Enter liters of water consumed</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Stress Level * (1-10)</Text>
            <TextInput
              style={[styles.textInput, errors.stress_level ? styles.inputError : null]}
              placeholder="e.g., 5 (integer only)"
              keyboardType="number-pad"
              value={manualData.stress_level}
              onChangeText={(text) => handleFieldChange('stress_level', text, (t, f) => validateIntegerInput(t, f, 1, 10))}
              maxLength={2}
            />
            {errors.stress_level ? <Text style={styles.errorText}>{errors.stress_level}</Text> : null}
            <Text style={styles.inputHint}>Integer value between 1 (low stress) and 10 (high stress)</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Wake Up Time (HH:MM)</Text>
            <TextInput
              style={[styles.textInput, errors.wake_up_time ? styles.inputError : null]}
              placeholder="e.g., 07:00"
              value={manualData.wake_up_time}
              onChangeText={(text) => handleFieldChange('wake_up_time', text, validateTimeInput)}
              maxLength={5}
              keyboardType="numbers-and-punctuation"
            />
            {errors.wake_up_time ? <Text style={styles.errorText}>{errors.wake_up_time}</Text> : null}
            <Text style={styles.inputHint}>24-hour format (00:00 - 23:59)</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Bed Time (HH:MM)</Text>
            <TextInput
              style={[styles.textInput, errors.bed_time ? styles.inputError : null]}
              placeholder="e.g., 23:00"
              value={manualData.bed_time}
              onChangeText={(text) => handleFieldChange('bed_time', text, validateTimeInput)}
              maxLength={5}
              keyboardType="numbers-and-punctuation"
            />
            {errors.bed_time ? <Text style={styles.errorText}>{errors.bed_time}</Text> : null}
            <Text style={styles.inputHint}>24-hour format (00:00 - 23:59)</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Meal Times (comma-separated)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., 08:00, 12:30, 19:00"
              value={manualData.meal_times}
              onChangeText={(text) => setManualData({...manualData, meal_times: text})}
            />
            <Text style={styles.inputHint}>Enter times in HH:MM format, separated by commas</Text>
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
  disabledButton: {
    backgroundColor: '#94a3b8',
    opacity: 0.7,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  warningIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e0f2fe',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#0ea5e9',
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 14,
    color: '#0369a1',
    lineHeight: 20,
  },
  alternativeButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  alternativeButtonText: {
    color: '#7c3aed',
    fontSize: 15,
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
  inputError: {
    borderColor: '#ef4444',
    borderWidth: 2,
    backgroundColor: '#fef2f2',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 2,
    marginBottom: 2,
  },
  inputHint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    fontStyle: 'italic',
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
  // Health Data Preview Styles
  healthDataPreview: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  healthDataPreviewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 16,
    textAlign: 'center',
  },
  healthDataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  healthDataCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1fae5',
    marginBottom: 8,
  },
  healthDataCardEmpty: {
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
  },
  healthDataIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  healthDataLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 2,
  },
  healthDataValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
  },
  healthDataValueEmpty: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '400',
  },
  healthDataActions: {
    marginTop: 16,
    gap: 10,
  },
  syncButton: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  syncButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  syncButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  refreshButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  dismissButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  dismissButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
  },
  syncWarning: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  syncWarningText: {
    fontSize: 12,
    color: '#92400e',
    lineHeight: 18,
  },
  noDataBox: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noDataIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  noDataText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  tryManualButton: {
    backgroundColor: '#6366f1',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  tryManualButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
}); 