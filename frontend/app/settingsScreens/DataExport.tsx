/**
 * Data Export Screen
 * Allows users to export their health data
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  Share,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation';
import userManager from '../utils/userManager';
import { getUserRoutineLogs } from '../api/endpoint';

type DataExportNavigationProp = NativeStackNavigationProp<RootStackParamList, 'DataExport'>;

interface Props {
  navigation: DataExportNavigationProp;
}

type ExportFormat = 'json' | 'csv';
type DateRange = '7days' | '30days' | '90days' | 'all';

export default function DataExport({ navigation }: Props) {
  const [isExporting, setIsExporting] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('json');
  const [selectedRange, setSelectedRange] = useState<DateRange>('30days');

  const getRangeLimit = (range: DateRange): number => {
    switch (range) {
      case '7days':
        return 7;
      case '30days':
        return 30;
      case '90days':
        return 90;
      case 'all':
        return 9999;
    }
  };

  const formatDataAsCSV = (logs: any[]): string => {
    if (logs.length === 0) return 'No data available';

    const headers = [
      'Date',
      'Sleep Hours',
      'Exercise Duration',
      'Screen Time',
      'Water Intake',
      'Stress Level',
      'Wake Up Time',
      'Bed Time',
    ];

    const rows = logs.map(log => [
      log.log_date || '',
      log.sleep_hours || '',
      log.exercise_duration || '',
      log.screen_time || '',
      log.water_intake || '',
      log.stress_level || '',
      log.wake_up_time || '',
      log.bed_time || '',
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);

      const userId = await userManager.getUserId();
      if (!userId) {
        Alert.alert('Error', 'Please log in to export your data');
        return;
      }

      // Fetch data
      const limit = getRangeLimit(selectedRange);
      const response = await getUserRoutineLogs(userId, limit);
      const logs = response.logs || [];

      if (logs.length === 0) {
        Alert.alert('No Data', 'You don\'t have any data to export yet.');
        return;
      }

      // Format data
      let exportData: string;
      let filename: string;

      if (selectedFormat === 'json') {
        exportData = JSON.stringify(logs, null, 2);
        filename = `lifepattern_export_${new Date().toISOString().split('T')[0]}.json`;
      } else {
        exportData = formatDataAsCSV(logs);
        filename = `lifepattern_export_${new Date().toISOString().split('T')[0]}.csv`;
      }

      // Share the data
      await Share.share({
        message: exportData,
        title: `LifePattern Data Export - ${filename}`,
      });

      Alert.alert('Export Complete', `Successfully exported ${logs.length} records.`);
    } catch (error) {
      console.error('Error exporting data:', error);
      Alert.alert('Error', 'Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Export Data</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Export Your Health Data</Text>
        <Text style={styles.sectionDescription}>
          Download a copy of your health data. You can use this to back up your data or import it
          into other apps.
        </Text>

        {/* Format Selection */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Export Format</Text>
          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={[styles.optionButton, selectedFormat === 'json' && styles.optionSelected]}
              onPress={() => setSelectedFormat('json')}
            >
              <Text
                style={[
                  styles.optionText,
                  selectedFormat === 'json' && styles.optionTextSelected,
                ]}
              >
                JSON
              </Text>
              <Text style={styles.optionDescription}>Best for developers</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionButton, selectedFormat === 'csv' && styles.optionSelected]}
              onPress={() => setSelectedFormat('csv')}
            >
              <Text
                style={[
                  styles.optionText,
                  selectedFormat === 'csv' && styles.optionTextSelected,
                ]}
              >
                CSV
              </Text>
              <Text style={styles.optionDescription}>Works with Excel</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Date Range Selection */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Date Range</Text>
          <View style={styles.rangeOptions}>
            {[
              { value: '7days' as DateRange, label: 'Last 7 Days' },
              { value: '30days' as DateRange, label: 'Last 30 Days' },
              { value: '90days' as DateRange, label: 'Last 90 Days' },
              { value: 'all' as DateRange, label: 'All Time' },
            ].map(option => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.rangeButton,
                  selectedRange === option.value && styles.rangeButtonSelected,
                ]}
                onPress={() => setSelectedRange(option.value)}
              >
                <Text
                  style={[
                    styles.rangeText,
                    selectedRange === option.value && styles.rangeTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Export Button */}
        <TouchableOpacity
          style={[styles.exportButton, isExporting && styles.exportButtonDisabled]}
          onPress={handleExport}
          disabled={isExporting}
        >
          {isExporting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.exportButtonText}>📤 Export Data</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>🔒</Text>
          <Text style={styles.infoText}>
            Your exported data is only shared through the app's share menu. We never send your data
            to external servers during export.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#7c3aed',
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  placeholder: {
    width: 60,
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 15,
    color: '#64748b',
    marginBottom: 24,
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  optionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  optionSelected: {
    borderColor: '#7c3aed',
    backgroundColor: '#f5f3ff',
  },
  optionText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 4,
  },
  optionTextSelected: {
    color: '#7c3aed',
  },
  optionDescription: {
    fontSize: 12,
    color: '#94a3b8',
  },
  rangeOptions: {
    gap: 8,
  },
  rangeButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  rangeButtonSelected: {
    backgroundColor: '#7c3aed',
  },
  rangeText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#64748b',
    textAlign: 'center',
  },
  rangeTextSelected: {
    color: '#fff',
  },
  exportButton: {
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  exportButtonDisabled: {
    opacity: 0.6,
  },
  exportButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#166534',
    lineHeight: 20,
  },
});

