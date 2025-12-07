import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer, CommonActions } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, Alert, Platform } from 'react-native';
import authEvents from './app/utils/authEvents';

// Import screens
import HomeScreen from './app/index';
import LoginScreen from './app/login';
import RegisterScreen from './app/register';
import CrossDeviceLinkingScreen from './app/crossDeviceLinking';
import DeviceManagementScreen from './app/deviceManagement';
import EnhancedRegisterScreen from './app/enhancedRegister';
import UserDashboardScreen from './app/userDashboard';
import DataImportScreen from './app/dataImport';
import DataVisualizationScreen from './app/dataVisualization';
import WatchDataModuleScreen from './app/watchDataModule';
import SettingsScreen from './app/settings';
import AutomationSettingsScreen from './app/automationSettings';
import AIInsightsScreen from './app/aiInsights';
import AIProductivityInsightsScreen from './app/aiProductivityInsights';
import QuickLogScreen from './app/quickLog';
import ScreeningQuestionnaireScreen from './app/screeningQuestionnaire';
import UsabilitySurveyScreen from './app/usabilitySurvey';
import AdminDashboardScreen from './app/adminDashboard';

// Import settings sub-screens
import {
  ProfileScreen,
  ConnectedDevicesScreen,
  DataExportScreen,
  PrivacySettingsScreen,
  DeleteDataScreen,
  NotificationsScreen,
  HealthPermissionsScreen,
  HelpFAQScreen,
} from './app/settingsScreens';

export type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Register: undefined;
  EnhancedRegister: undefined;
  CrossDeviceLinking: undefined;
  DeviceManagement: undefined;
  UserDashboard: undefined;
  DataImport: { source?: string };
  DataVisualization: { data?: any };
  WatchDataModule: undefined;
  Settings: undefined;
  AutomationSettings: undefined;
  AIInsights: { aiResponse: any; logId: number; userId: string };
  AIProductivityInsights: undefined;
  QuickLog: undefined;
  ScreeningQuestionnaire: undefined;
  UsabilitySurvey: undefined;
  AdminDashboard: undefined;
  // New Settings sub-screens
  Profile: undefined;
  ConnectedDevices: undefined;
  DataExport: undefined;
  PrivacySettings: undefined;
  DeleteData: undefined;
  Notifications: undefined;
  HelpFAQ: undefined;
  HealthPermissions: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Navigation ref for programmatic navigation from outside components
export const navigationRef = React.createRef<any>();

// Helper function to navigate from anywhere in the app
export function navigateToLogin() {
  if (navigationRef.current) {
    navigationRef.current.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      })
    );
  }
}

export default function Navigation() {
  const [navigationError, setNavigationError] = useState(false);

  // Subscribe to auth events for session expiry handling
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    
    try {
      unsubscribe = authEvents.subscribe((event, message) => {
        try {
          console.log(`🔐 Auth event received in Navigation: ${event}`);
          
          if (event === 'sessionExpired' || event === 'loginRequired') {
            // Show alert and navigate to login
            if (Platform.OS === 'web') {
              window.alert(message || 'Your session has expired. Please log in again.');
            } else {
              Alert.alert(
                'Session Expired',
                message || 'Your session has expired. Please log in again.',
                [{ text: 'OK' }]
              );
            }
            
            // Navigate to login screen
            if (navigationRef.current) {
              navigationRef.current.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                })
              );
            }
          }
        } catch (error) {
          console.error('Error handling auth event:', error);
        }
      });
    } catch (error) {
      console.error('Error subscribing to auth events:', error);
    }

    return () => {
      if (unsubscribe) {
        try {
          unsubscribe();
        } catch (error) {
          console.error('Error unsubscribing from auth events:', error);
        }
      }
    };
  }, []);

  const handleNavigationError = (error: Error) => {
    console.error('Navigation error:', error);
    setNavigationError(true);
  };

  if (navigationError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 18, marginBottom: 20, textAlign: 'center' }}>
          Navigation Error
        </Text>
        <Text style={{ fontSize: 14, color: '#666', textAlign: 'center' }}>
          Unable to load navigation. Please restart the app.
        </Text>
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      onStateChange={(state) => {
        // Track navigation state changes
        console.log('Navigation state changed:', state);
      }}
      fallback={
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      }
    >
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#fff',
          },
          headerTintColor: '#4A90E2',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{ 
            title: 'LifePattern AI',
            headerShown: false 
          }} 
        />
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ 
            title: 'Sign In',
            headerBackTitle: 'Back'
          }} 
        />
        <Stack.Screen 
          name="Register" 
          component={RegisterScreen} 
          options={{ 
            title: 'Create Account',
            headerBackTitle: 'Back'
          }} 
        />
        <Stack.Screen
          name="EnhancedRegister"
          component={EnhancedRegisterScreen}
          options={{
            title: 'Enhanced Registration',
            headerBackTitle: 'Back'
          }}
        />
        <Stack.Screen
          name="CrossDeviceLinking"
          component={CrossDeviceLinkingScreen}
          options={{
            title: 'Cross-Device Linking',
            headerBackTitle: 'Back'
          }}
        />
        <Stack.Screen 
          name="DeviceManagement" 
          component={DeviceManagementScreen} 
          options={{ 
            title: 'Device Management',
            headerBackTitle: 'Back'
          }} 
        />
        <Stack.Screen 
          name="UserDashboard" 
          component={UserDashboardScreen} 
          options={{ 
            title: 'Dashboard',
            headerShown: false
          }} 
        />
        <Stack.Screen 
          name="DataImport" 
          component={DataImportScreen} 
          options={{ 
            title: 'Import Data',
            headerBackTitle: 'Back'
          }} 
        />
        <Stack.Screen 
          name="DataVisualization" 
          component={DataVisualizationScreen} 
          options={{ 
            title: 'Health Data',
            headerBackTitle: 'Back'
          }} 
        />
        <Stack.Screen 
          name="WatchDataModule" 
          component={WatchDataModuleScreen} 
          options={{ 
            title: 'Watch Data',
            headerBackTitle: 'Back'
          }} 
        />
        <Stack.Screen 
          name="Settings" 
          component={SettingsScreen} 
          options={{ 
            title: 'Settings',
            headerShown: false
          }} 
        />
        <Stack.Screen 
          name="AutomationSettings" 
          component={AutomationSettingsScreen} 
          options={{ 
            title: 'Automation Settings',
            headerShown: false
          }} 
        />
        <Stack.Screen
          name="AIInsights"
          component={AIInsightsScreen}
          options={{
            title: 'AI Insights',
            headerShown: false
          }}
        />
        <Stack.Screen
          name="AIProductivityInsights"
          component={AIProductivityInsightsScreen}
          options={{
            title: 'AI Productivity',
            headerShown: false
          }}
        />
        <Stack.Screen
          name="QuickLog"
          component={QuickLogScreen}
          options={{
            title: 'Quick Log',
            headerShown: false
          }}
        />
        <Stack.Screen
          name="ScreeningQuestionnaire"
          component={ScreeningQuestionnaireScreen}
          options={{
            title: 'Screening Questionnaire',
            headerBackTitle: 'Back'
          }}
        />
        <Stack.Screen
          name="UsabilitySurvey"
          component={UsabilitySurveyScreen}
          options={{
            title: 'Usability Survey',
            headerBackTitle: 'Back'
          }}
        />
        <Stack.Screen
          name="AdminDashboard"
          component={AdminDashboardScreen}
          options={{
            title: 'Admin Dashboard',
            headerShown: false
          }}
        />
        
        {/* Settings Sub-screens */}
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ title: 'Profile', headerShown: false }}
        />
        <Stack.Screen
          name="ConnectedDevices"
          component={ConnectedDevicesScreen}
          options={{ title: 'Connected Devices', headerShown: false }}
        />
        <Stack.Screen
          name="DataExport"
          component={DataExportScreen}
          options={{ title: 'Export Data', headerShown: false }}
        />
        <Stack.Screen
          name="PrivacySettings"
          component={PrivacySettingsScreen}
          options={{ title: 'Privacy Settings', headerShown: false }}
        />
        <Stack.Screen
          name="DeleteData"
          component={DeleteDataScreen}
          options={{ title: 'Delete Data', headerShown: false }}
        />
        <Stack.Screen
          name="Notifications"
          component={NotificationsScreen}
          options={{ title: 'Notifications', headerShown: false }}
        />
        <Stack.Screen
          name="HealthPermissions"
          component={HealthPermissionsScreen}
          options={{ title: 'Health Permissions', headerShown: false }}
        />
        <Stack.Screen
          name="HelpFAQ"
          component={HelpFAQScreen}
          options={{ title: 'Help & FAQ', headerShown: false }}
        />
      </Stack.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
} 