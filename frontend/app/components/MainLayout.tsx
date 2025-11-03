import React, { ReactNode } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import BottomNavigation from './BottomNavigation';

interface MainLayoutProps {
  children: ReactNode;
  showBottomNav?: boolean;
}

export default function MainLayout({ children, showBottomNav = true }: MainLayoutProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.content, showBottomNav && styles.contentWithNav]}>
        {children}
      </View>
      {showBottomNav && <BottomNavigation />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
  },
  contentWithNav: {
    paddingBottom: Platform.OS === 'ios' ? 80 : 70,
  },
});

