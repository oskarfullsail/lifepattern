import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

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
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function Navigation() {
  return (
    <NavigationContainer>
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
            headerBackTitle: 'Back'
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
      </Stack.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
} 