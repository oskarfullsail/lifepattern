import React, { useState } from 'react';
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
  WatchData
} from './api/endpoint';

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
    Alert.alert(
      'CSV Import',
      'Please select a CSV file with your health data',
      [
        { text: 'Select File', onPress: () => {
          // In a real app, this would open file picker
          Alert.alert('Info', 'File picker would open here');
        }},
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleManualEntry = () => {
    navigation.navigate('ManualDataEntry');
  };

  const handleWatchSync = async () => {
    setIsLoading(true);
    try {
      const data = await syncWatchData({
        enable_sync: true,
        sync_frequency: 'daily',
        data_types: ['health', 'activity', 'sleep']
      });
      
      Alert.alert(
        'Success', 
        'Watch data synced successfully!',
        [{ text: 'OK', onPress: () => navigation.navigate('DataVisualization', { data }) }]
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
      
      <TouchableOpacity 
        style={styles.importButton}
        onPress={handleCSVImport}
      >
        <Text style={styles.importButtonText}>Select CSV File</Text>
      </TouchableOpacity>
      
      <View style={styles.csvFormat}>
        <Text style={styles.csvFormatTitle}>Expected CSV Format:</Text>
        <Text style={styles.csvFormatText}>
          date,sleep_hours,meal_times,screen_time,exercise_duration,wake_up_time,bed_time,water_intake,stress_level
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
      
      <TouchableOpacity 
        style={styles.importButton}
        onPress={handleManualEntry}
      >
        <Text style={styles.importButtonText}>Enter Data Manually</Text>
      </TouchableOpacity>
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
            
            <TouchableOpacity 
              style={styles.importButton}
              onPress={() => navigation.navigate('DataImport', { source: 'health' })}
            >
              <Text style={styles.importButtonText}>Health App</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.importButton}
              onPress={() => navigation.navigate('DataImport', { source: 'csv' })}
            >
              <Text style={styles.importButtonText}>CSV File</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.importButton}
              onPress={() => navigation.navigate('DataImport', { source: 'manual' })}
            >
              <Text style={styles.importButtonText}>Manual Entry</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.importButton}
              onPress={() => navigation.navigate('DataImport', { source: 'watch' })}
            >
              <Text style={styles.importButtonText}>Smartwatch</Text>
            </TouchableOpacity>
          </View>
        );
    }
  };

  return (
    <ScrollView style={styles.container}>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
}); 