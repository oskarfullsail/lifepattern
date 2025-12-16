import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  Share,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import apiClient from './api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

type AdminDashboardScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'AdminDashboard'
>;

interface Props {
  navigation: AdminDashboardScreenNavigationProp;
}

interface Stats {
  total_screenings: number;
  qualified_testers: number;
  qualification_rate: number;
  avg_qualification_score: number;
  total_surveys: number;
  avg_sus_score: number;
  avg_rating: number;
  sus_distribution: {
    excellent: number;
    good: number;
    ok: number;
    poor: number;
  };
}

interface Screening {
  id: string;
  user_id: string;
  age: number;
  gender: string;
  occupation: string;
  is_qualified_tester: boolean;
  qualification_score: number;
  created_at: string;
}

interface Survey {
  id: string;
  user_id: string;
  sus_score: number;
  average_rating: number;
  liked_most: string;
  would_improve: string;
  created_at: string;
}

const ADMIN_PASSWORD = 'lifepattern2025'; // Change this to your secure password

export default function AdminDashboard({ navigation }: Props) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [activeTab, setActiveTab] = useState<'stats' | 'screenings' | 'surveys'>('stats');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const checkAuthStatus = async () => {
    try {
      const savedAuth = await AsyncStorage.getItem('adminAuthenticated');
      if (savedAuth === 'true') {
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Error checking admin auth:', error);
    }
  };

  const handleLogin = async () => {
    if (password === ADMIN_PASSWORD) {
      await AsyncStorage.setItem('adminAuthenticated', 'true');
      setIsAuthenticated(true);
      setPassword('');
    } else {
      Alert.alert('Access Denied', 'Incorrect admin password');
      setPassword('');
    }
  };

  const handleLogout = async () => {
    if (isLoading) return; // Prevent double triggers
    setIsLoading(true);
    try {
      await AsyncStorage.removeItem('adminAuthenticated');
      setIsAuthenticated(false);
      setStats(null);
      setScreenings([]);
      setSurveys([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load statistics
      console.log('📊 Loading questionnaire stats...');
      const statsRes = await apiClient.get('/api/admin/questionnaire-stats');
      console.log('✅ Stats loaded:', statsRes.data);
      setStats(statsRes.data);

      // Load screenings
      console.log('📋 Loading screenings...');
      const screeningsRes = await apiClient.get('/api/admin/screenings');
      console.log('✅ Screenings loaded:', screeningsRes.data?.length || 0, 'items');
      setScreenings(screeningsRes.data || []);

      // Load surveys
      console.log('📝 Loading surveys...');
      const surveysRes = await apiClient.get('/api/admin/usability-surveys');
      console.log('✅ Surveys response:', {
        status: surveysRes.status,
        dataType: typeof surveysRes.data,
        dataLength: Array.isArray(surveysRes.data) ? surveysRes.data.length : 'not an array',
        data: surveysRes.data
      });
      setSurveys(surveysRes.data || []);

      console.log('✅ Admin data loaded successfully');
      console.log('📊 Final state:', {
        stats: !!stats,
        screenings: screenings.length,
        surveys: surveys.length
      });
    } catch (error: any) {
      console.error('❌ Error loading admin data:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          baseURL: error.config?.baseURL
        }
      });
      Alert.alert('Error', `Failed to load admin data: ${error.response?.data?.detail || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate PDF Report for Surveys
  const generateSurveyPDFReport = async () => {
    try {
      if (surveys.length === 0) {
        Alert.alert('No Data', 'No survey data available to export.');
        return;
      }

      const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      // Calculate summary statistics
      const avgSUS = surveys.reduce((acc, s) => acc + s.sus_score, 0) / surveys.length;
      const avgRating = surveys.reduce((acc, s) => acc + s.average_rating, 0) / surveys.length;
      const excellent = surveys.filter(s => s.sus_score >= 80).length;
      const good = surveys.filter(s => s.sus_score >= 68 && s.sus_score < 80).length;
      const ok = surveys.filter(s => s.sus_score >= 50 && s.sus_score < 68).length;
      const poor = surveys.filter(s => s.sus_score < 50).length;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #333; }
            h1 { color: #2c3e50; border-bottom: 3px solid #4A90E2; padding-bottom: 10px; }
            h2 { color: #4A90E2; margin-top: 30px; }
            .header { text-align: center; margin-bottom: 40px; }
            .date { color: #666; font-size: 14px; }
            .summary-box { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .stat-row { display: flex; justify-content: space-around; margin: 15px 0; }
            .stat-item { text-align: center; }
            .stat-value { font-size: 32px; font-weight: bold; color: #4A90E2; }
            .stat-label { font-size: 12px; color: #666; }
            .distribution { margin: 20px 0; }
            .dist-bar { display: flex; align-items: center; margin: 8px 0; }
            .dist-label { width: 120px; font-size: 14px; }
            .dist-value { font-weight: bold; margin-left: 10px; }
            .excellent { color: #28a745; }
            .good { color: #5cb85c; }
            .ok { color: #ffc107; }
            .poor { color: #dc3545; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #4A90E2; color: white; padding: 12px; text-align: left; }
            td { border-bottom: 1px solid #ddd; padding: 12px; }
            tr:nth-child(even) { background: #f8f9fa; }
            .feedback { font-style: italic; color: #555; max-width: 300px; }
            .footer { margin-top: 40px; text-align: center; color: #999; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📊 LifePattern AI - Usability Survey Report</h1>
            <p class="date">Generated on ${currentDate}</p>
          </div>

          <div class="summary-box">
            <h2>📈 Summary Statistics</h2>
            <div class="stat-row">
              <div class="stat-item">
                <div class="stat-value">${surveys.length}</div>
                <div class="stat-label">Total Surveys</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">${avgSUS.toFixed(1)}</div>
                <div class="stat-label">Average SUS Score</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">${avgRating.toFixed(2)}/5.0</div>
                <div class="stat-label">Average Rating</div>
              </div>
            </div>
          </div>

          <div class="summary-box">
            <h2>📊 SUS Score Distribution</h2>
            <div class="distribution">
              <div class="dist-bar">
                <span class="dist-label excellent">Excellent (80+):</span>
                <span class="dist-value excellent">${excellent} (${((excellent/surveys.length)*100).toFixed(1)}%)</span>
              </div>
              <div class="dist-bar">
                <span class="dist-label good">Good (68-79):</span>
                <span class="dist-value good">${good} (${((good/surveys.length)*100).toFixed(1)}%)</span>
              </div>
              <div class="dist-bar">
                <span class="dist-label ok">OK (50-67):</span>
                <span class="dist-value ok">${ok} (${((ok/surveys.length)*100).toFixed(1)}%)</span>
              </div>
              <div class="dist-bar">
                <span class="dist-label poor">Poor (&lt;50):</span>
                <span class="dist-value poor">${poor} (${((poor/surveys.length)*100).toFixed(1)}%)</span>
              </div>
            </div>
          </div>

          <h2>📝 Individual Survey Responses</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>User ID</th>
                <th>SUS Score</th>
                <th>Rating</th>
                <th>Liked Most</th>
                <th>Would Improve</th>
              </tr>
            </thead>
            <tbody>
              ${surveys.map(s => `
                <tr>
                  <td>${new Date(s.created_at).toLocaleDateString()}</td>
                  <td>${s.user_id.substring(0, 8)}...</td>
                  <td><strong>${s.sus_score.toFixed(1)}</strong></td>
                  <td>${s.average_rating.toFixed(2)}/5</td>
                  <td class="feedback">${s.liked_most || '-'}</td>
                  <td class="feedback">${s.would_improve || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <p>LifePattern AI - Thesis Research Project</p>
            <p>Report contains ${surveys.length} survey responses</p>
          </div>
        </body>
        </html>
      `;

      console.log('📄 Generating PDF...');
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      console.log('✅ PDF generated at:', uri);

      // Share the PDF
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'LifePattern Usability Survey Report',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Success', `PDF saved to: ${uri}`);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate PDF report');
    }
  };

  // Generate PDF Report for Screenings
  const generateScreeningPDFReport = async () => {
    try {
      if (screenings.length === 0) {
        Alert.alert('No Data', 'No screening data available to export.');
        return;
      }

      const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const qualified = screenings.filter(s => s.is_qualified_tester).length;
      const avgScore = screenings.reduce((acc, s) => acc + s.qualification_score, 0) / screenings.length;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #333; }
            h1 { color: #2c3e50; border-bottom: 3px solid #4A90E2; padding-bottom: 10px; }
            h2 { color: #4A90E2; margin-top: 30px; }
            .header { text-align: center; margin-bottom: 40px; }
            .date { color: #666; font-size: 14px; }
            .summary-box { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .stat-row { display: flex; justify-content: space-around; margin: 15px 0; }
            .stat-item { text-align: center; }
            .stat-value { font-size: 32px; font-weight: bold; color: #4A90E2; }
            .stat-label { font-size: 12px; color: #666; }
            .qualified { color: #28a745; }
            .not-qualified { color: #dc3545; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #4A90E2; color: white; padding: 12px; text-align: left; }
            td { border-bottom: 1px solid #ddd; padding: 12px; }
            tr:nth-child(even) { background: #f8f9fa; }
            .footer { margin-top: 40px; text-align: center; color: #999; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📋 LifePattern AI - Screening Questionnaire Report</h1>
            <p class="date">Generated on ${currentDate}</p>
          </div>

          <div class="summary-box">
            <h2>📈 Summary Statistics</h2>
            <div class="stat-row">
              <div class="stat-item">
                <div class="stat-value">${screenings.length}</div>
                <div class="stat-label">Total Screenings</div>
              </div>
              <div class="stat-item">
                <div class="stat-value qualified">${qualified}</div>
                <div class="stat-label">Qualified Testers</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">${((qualified/screenings.length)*100).toFixed(1)}%</div>
                <div class="stat-label">Qualification Rate</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">${avgScore.toFixed(1)}/12</div>
                <div class="stat-label">Avg Score</div>
              </div>
            </div>
          </div>

          <h2>📝 Individual Screening Responses</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>User ID</th>
                <th>Age</th>
                <th>Gender</th>
                <th>Occupation</th>
                <th>Qualified</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              ${screenings.map(s => `
                <tr>
                  <td>${new Date(s.created_at).toLocaleDateString()}</td>
                  <td>${s.user_id.substring(0, 8)}...</td>
                  <td>${s.age}</td>
                  <td>${s.gender}</td>
                  <td>${s.occupation}</td>
                  <td class="${s.is_qualified_tester ? 'qualified' : 'not-qualified'}">
                    ${s.is_qualified_tester ? '✓ Yes' : '✗ No'}
                  </td>
                  <td>${s.qualification_score}/12</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <p>LifePattern AI - Thesis Research Project</p>
            <p>Report contains ${screenings.length} screening responses</p>
          </div>
        </body>
        </html>
      `;

      console.log('📄 Generating PDF...');
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      console.log('✅ PDF generated at:', uri);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'LifePattern Screening Report',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Success', `PDF saved to: ${uri}`);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate PDF report');
    }
  };

  // Export Surveys as CSV
  const handleExportSurveysCSV = async () => {
    try {
      if (surveys.length === 0) {
        Alert.alert('No Data', 'No survey data available to export.');
        return;
      }

      // Create CSV content
      const headers = ['Date', 'User ID', 'SUS Score', 'Average Rating', 'Liked Most', 'Would Improve'];
      const rows = surveys.map(s => [
        new Date(s.created_at).toISOString(),
        s.user_id,
        s.sus_score.toFixed(2),
        s.average_rating.toFixed(2),
        `"${(s.liked_most || '').replace(/"/g, '""')}"`,
        `"${(s.would_improve || '').replace(/"/g, '""')}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

      if (Platform.OS === 'web') {
        // Web: Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lifepattern_surveys_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Mobile: Save to file and share
        const fileName = `lifepattern_surveys_${new Date().toISOString().split('T')[0]}.csv`;
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, csvContent);

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/csv',
            dialogTitle: 'Export Survey Data',
          });
        } else {
          Alert.alert('Success', `CSV saved to: ${fileUri}`);
        }
      }
    } catch (error) {
      console.error('Error exporting CSV:', error);
      Alert.alert('Error', 'Failed to export CSV');
    }
  };

  // Export Screenings as CSV
  const handleExportScreeningsCSV = async () => {
    try {
      if (screenings.length === 0) {
        Alert.alert('No Data', 'No screening data available to export.');
        return;
      }

      const headers = ['Date', 'User ID', 'Age', 'Gender', 'Occupation', 'Qualified', 'Score'];
      const rows = screenings.map(s => [
        new Date(s.created_at).toISOString(),
        s.user_id,
        s.age,
        s.gender,
        `"${(s.occupation || '').replace(/"/g, '""')}"`,
        s.is_qualified_tester ? 'Yes' : 'No',
        s.qualification_score,
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

      if (Platform.OS === 'web') {
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lifepattern_screenings_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const fileName = `lifepattern_screenings_${new Date().toISOString().split('T')[0]}.csv`;
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, csvContent);

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/csv',
            dialogTitle: 'Export Screening Data',
          });
        } else {
          Alert.alert('Success', `CSV saved to: ${fileUri}`);
        }
      }
    } catch (error) {
      console.error('Error exporting CSV:', error);
      Alert.alert('Error', 'Failed to export CSV');
    }
  };

  // Copy raw data to clipboard (for quick access)
  const handleCopyRawData = async (type: 'surveys' | 'screenings') => {
    try {
      const data = type === 'surveys' ? surveys : screenings;
      const jsonString = JSON.stringify(data, null, 2);
      
      await Share.share({
        message: jsonString,
        title: `LifePattern ${type} Data`,
      });
    } catch (error) {
      console.error('Error sharing data:', error);
    }
  };

  const renderLoginScreen = () => (
    <View style={styles.loginContainer}>
      <View style={styles.loginBox}>
        <Text style={styles.loginTitle}>🔐 Admin Access</Text>
        <Text style={styles.loginSubtitle}>Enter admin password to continue</Text>

        <TextInput
          style={styles.passwordInput}
          placeholder="Admin Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={handleLogin}
        />

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStats = () => {
    if (!stats) return null;

    return (
      <ScrollView style={styles.statsContainer}>
        <View style={styles.statsHeader}>
          <Text style={styles.statsTitle}>📊 Overview</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={loadData}>
            <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
          </TouchableOpacity>
        </View>

        {/* Screening Stats */}
        <View style={styles.statCard}>
          <Text style={styles.statCardTitle}>Screening Questionnaires</Text>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.total_screenings}</Text>
              <Text style={styles.statLabel}>Total Responses</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, styles.successText]}>
                {stats.qualified_testers}
              </Text>
              <Text style={styles.statLabel}>Qualified Testers</Text>
            </View>
          </View>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {stats.qualification_rate?.toFixed(1) || 0}%
              </Text>
              <Text style={styles.statLabel}>Qualification Rate</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {stats.avg_qualification_score?.toFixed(1) || 0}/12
              </Text>
              <Text style={styles.statLabel}>Avg Score</Text>
            </View>
          </View>
        </View>

        {/* Survey Stats */}
        <View style={styles.statCard}>
          <Text style={styles.statCardTitle}>Usability Surveys</Text>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.total_surveys}</Text>
              <Text style={styles.statLabel}>Total Surveys</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, styles.primaryText]}>
                {stats.avg_sus_score?.toFixed(1) || 0}
              </Text>
              <Text style={styles.statLabel}>Avg SUS Score</Text>
            </View>
          </View>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {stats.avg_rating?.toFixed(2) || 0}/5.0
              </Text>
              <Text style={styles.statLabel}>Avg Rating</Text>
            </View>
          </View>
        </View>

        {/* SUS Distribution */}
        {stats.sus_distribution && (
          <View style={styles.statCard}>
            <Text style={styles.statCardTitle}>SUS Score Distribution</Text>
            <View style={styles.distributionContainer}>
              <View style={styles.distributionItem}>
                <View style={[styles.distributionBar, styles.excellentBar]}>
                  <Text style={styles.distributionValue}>
                    {stats.sus_distribution.excellent}
                  </Text>
                </View>
                <Text style={styles.distributionLabel}>Excellent (80+)</Text>
              </View>
              <View style={styles.distributionItem}>
                <View style={[styles.distributionBar, styles.goodBar]}>
                  <Text style={styles.distributionValue}>
                    {stats.sus_distribution.good}
                  </Text>
                </View>
                <Text style={styles.distributionLabel}>Good (68-79)</Text>
              </View>
              <View style={styles.distributionItem}>
                <View style={[styles.distributionBar, styles.okBar]}>
                  <Text style={styles.distributionValue}>
                    {stats.sus_distribution.ok}
                  </Text>
                </View>
                <Text style={styles.distributionLabel}>OK (50-67)</Text>
              </View>
              <View style={styles.distributionItem}>
                <View style={[styles.distributionBar, styles.poorBar]}>
                  <Text style={styles.distributionValue}>
                    {stats.sus_distribution.poor}
                  </Text>
                </View>
                <Text style={styles.distributionLabel}>Poor (&lt;50)</Text>
              </View>
            </View>
          </View>
        )}

        {/* Export Buttons */}
        <View style={styles.exportContainer}>
          <Text style={styles.exportSectionTitle}>📄 Survey Exports</Text>
          <TouchableOpacity
            style={[styles.exportButton, styles.pdfButton]}
            onPress={generateSurveyPDFReport}
          >
            <Text style={styles.exportButtonText}>📊 Export Survey Report (PDF)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.exportButton}
            onPress={handleExportSurveysCSV}
          >
            <Text style={styles.exportButtonText}>📥 Export Survey Data (CSV)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.exportButton, styles.shareButton]}
            onPress={() => handleCopyRawData('surveys')}
          >
            <Text style={styles.exportButtonText}>📋 Share Raw Survey Data</Text>
          </TouchableOpacity>

          <Text style={[styles.exportSectionTitle, { marginTop: 20 }]}>📋 Screening Exports</Text>
          <TouchableOpacity
            style={[styles.exportButton, styles.pdfButton]}
            onPress={generateScreeningPDFReport}
          >
            <Text style={styles.exportButtonText}>📊 Export Screening Report (PDF)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.exportButton}
            onPress={handleExportScreeningsCSV}
          >
            <Text style={styles.exportButtonText}>📥 Export Screening Data (CSV)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.exportButton, styles.shareButton]}
            onPress={() => handleCopyRawData('screenings')}
          >
            <Text style={styles.exportButtonText}>📋 Share Raw Screening Data</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  const renderScreenings = () => {
    const filteredScreenings = screenings.filter((s) =>
      s.occupation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.gender.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.user_id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <View style={styles.tableContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by occupation, gender, or user ID..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <ScrollView>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderText}>User</Text>
            <Text style={styles.tableHeaderText}>Age</Text>
            <Text style={styles.tableHeaderText}>Gender</Text>
            <Text style={styles.tableHeaderText}>Occupation</Text>
            <Text style={styles.tableHeaderText}>Qualified</Text>
            <Text style={styles.tableHeaderText}>Score</Text>
          </View>
          {filteredScreenings.map((screening) => (
            <View key={screening.id} style={styles.tableRow}>
              <Text style={styles.tableCell} numberOfLines={1}>
                {screening.user_id.substring(0, 8)}...
              </Text>
              <Text style={styles.tableCell}>{screening.age}</Text>
              <Text style={styles.tableCell}>{screening.gender}</Text>
              <Text style={styles.tableCell} numberOfLines={1}>
                {screening.occupation}
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  screening.is_qualified_tester ? styles.successText : styles.errorText,
                ]}
              >
                {screening.is_qualified_tester ? '✓' : '✗'}
              </Text>
              <Text style={styles.tableCell}>{screening.qualification_score}/12</Text>
            </View>
          ))}
          {filteredScreenings.length === 0 && (
            <Text style={styles.emptyText}>No screenings found</Text>
          )}
        </ScrollView>
      </View>
    );
  };

  const renderSurveys = () => {
    const filteredSurveys = surveys.filter((s) =>
      s.user_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.liked_most.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <View style={styles.tableContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by user ID or feedback..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <ScrollView>
          {filteredSurveys.map((survey) => (
            <View key={survey.id} style={styles.surveyCard}>
              <View style={styles.surveyHeader}>
                <Text style={styles.surveyUserId}>
                  User: {survey.user_id.substring(0, 12)}...
                </Text>
                <Text style={styles.surveyDate}>
                  {new Date(survey.created_at).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.surveyScores}>
                <View style={styles.scoreItem}>
                  <Text style={styles.scoreLabel}>SUS Score</Text>
                  <Text
                    style={[
                      styles.scoreValue,
                      survey.sus_score >= 80
                        ? styles.excellentText
                        : survey.sus_score >= 68
                        ? styles.goodText
                        : styles.okText,
                    ]}
                  >
                    {survey.sus_score.toFixed(1)}
                  </Text>
                </View>
                <View style={styles.scoreItem}>
                  <Text style={styles.scoreLabel}>Avg Rating</Text>
                  <Text style={styles.scoreValue}>
                    {survey.average_rating.toFixed(2)}/5
                  </Text>
                </View>
              </View>
              {survey.liked_most && (
                <View style={styles.feedbackSection}>
                  <Text style={styles.feedbackLabel}>Liked Most:</Text>
                  <Text style={styles.feedbackText}>{survey.liked_most}</Text>
                </View>
              )}
              {survey.would_improve && (
                <View style={styles.feedbackSection}>
                  <Text style={styles.feedbackLabel}>Would Improve:</Text>
                  <Text style={styles.feedbackText}>{survey.would_improve}</Text>
                </View>
              )}
            </View>
          ))}
          {filteredSurveys.length === 0 && (
            <Text style={styles.emptyText}>No surveys found</Text>
          )}
        </ScrollView>
      </View>
    );
  };

  if (!isAuthenticated) {
    return renderLoginScreen();
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'stats' && styles.activeTab]}
          onPress={() => setActiveTab('stats')}
        >
          <Text style={[styles.tabText, activeTab === 'stats' && styles.activeTabText]}>
            Statistics
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'screenings' && styles.activeTab]}
          onPress={() => setActiveTab('screenings')}
        >
          <Text
            style={[styles.tabText, activeTab === 'screenings' && styles.activeTabText]}
          >
            Screenings ({screenings.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'surveys' && styles.activeTab]}
          onPress={() => setActiveTab('surveys')}
        >
          <Text style={[styles.tabText, activeTab === 'surveys' && styles.activeTabText]}>
            Surveys ({surveys.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Loading data...</Text>
        </View>
      ) : (
        <>
          {activeTab === 'stats' && renderStats()}
          {activeTab === 'screenings' && renderScreenings()}
          {activeTab === 'surveys' && renderSurveys()}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  loginBox: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  loginTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  passwordInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  loginButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: '#6c757d',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#4A90E2',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#4A90E2',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  statsContainer: {
    flex: 1,
    padding: 16,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  refreshButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  successText: {
    color: '#28a745',
  },
  primaryText: {
    color: '#4A90E2',
  },
  errorText: {
    color: '#dc3545',
  },
  excellentText: {
    color: '#28a745',
  },
  goodText: {
    color: '#5cb85c',
  },
  okText: {
    color: '#ffc107',
  },
  distributionContainer: {
    gap: 12,
  },
  distributionItem: {
    gap: 4,
  },
  distributionBar: {
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  excellentBar: {
    backgroundColor: '#d4edda',
  },
  goodBar: {
    backgroundColor: '#d1ecf1',
  },
  okBar: {
    backgroundColor: '#fff3cd',
  },
  poorBar: {
    backgroundColor: '#f8d7da',
  },
  distributionValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  distributionLabel: {
    fontSize: 12,
    color: '#666',
  },
  exportContainer: {
    gap: 12,
    marginTop: 8,
    paddingBottom: 40,
  },
  exportSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 8,
    marginBottom: 4,
  },
  exportButton: {
    backgroundColor: '#28a745',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  pdfButton: {
    backgroundColor: '#dc3545',
  },
  shareButton: {
    backgroundColor: '#6c757d',
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tableContainer: {
    flex: 1,
    padding: 16,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    fontSize: 14,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#4A90E2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  tableHeaderText: {
    flex: 1,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tableCell: {
    flex: 1,
    fontSize: 12,
    color: '#2c3e50',
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    marginTop: 32,
  },
  surveyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  surveyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  surveyUserId: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2c3e50',
  },
  surveyDate: {
    fontSize: 12,
    color: '#666',
  },
  surveyScores: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  scoreItem: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  feedbackSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  feedbackLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  feedbackText: {
    fontSize: 14,
    color: '#2c3e50',
    lineHeight: 20,
  },
});
