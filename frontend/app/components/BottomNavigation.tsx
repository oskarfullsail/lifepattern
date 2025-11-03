import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function BottomNavigation() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();

  const tabs = [
    { name: 'Home', icon: '🏠', route: 'UserDashboard' as keyof RootStackParamList },
    { name: 'Analytics', icon: '📊', route: 'DataVisualization' as keyof RootStackParamList },
    { name: 'Add', icon: '+', route: 'DataImport' as keyof RootStackParamList, isCenter: true },
    { name: 'Goals', icon: '🎯', route: 'WatchDataModule' as keyof RootStackParamList },
    { name: 'Profile', icon: '👤', route: 'Settings' as keyof RootStackParamList },
  ];

  const handleTabPress = (tabRoute: keyof RootStackParamList) => {
    if (tabRoute === 'DataImport') {
      navigation.navigate('DataImport', { source: 'manual' });
    } else {
      navigation.navigate(tabRoute);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {tabs.map((tab, index) => {
          const isActive = route.name === tab.route;
          
          if (tab.isCenter) {
            return (
              <TouchableOpacity
                key={index}
                style={styles.centerButton}
                onPress={() => handleTabPress(tab.route)}
              >
                <View style={styles.centerButtonInner}>
                  <Text style={styles.centerButtonIcon}>{tab.icon}</Text>
                </View>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={index}
              style={styles.tab}
              onPress={() => handleTabPress(tab.route)}
            >
              <Text style={[styles.icon, isActive && styles.iconActive]}>
                {tab.icon}
              </Text>
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {tab.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 60,
    paddingHorizontal: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  icon: {
    fontSize: 24,
    marginBottom: 4,
    opacity: 0.5,
  },
  iconActive: {
    opacity: 1,
  },
  label: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  labelActive: {
    color: '#6366f1',
    fontWeight: '600',
  },
  centerButton: {
    width: 56,
    height: 56,
    marginTop: -20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerButtonInner: {
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
  centerButtonIcon: {
    fontSize: 28,
    color: '#ffffff',
    fontWeight: 'bold',
  },
});

