import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import userManager from './utils/userManager';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }: Props) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    checkAuthStatus();
  }, [navigation]);

  const checkAuthStatus = async () => {
    try {
      const isAuthenticated = await userManager.isAuthenticated();
      if (isAuthenticated) {
        // User is authenticated, navigate to dashboard
        navigation.replace('UserDashboard');
      } else {
        // User is not authenticated, show landing page
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsLoading(false);
    }
  };

  const handleStartTracking = () => {
    navigation.navigate('Register');
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        {/* Hero Section with Gradient */}
        <LinearGradient
          colors={['#6366f1', '#8b5cf6', '#a855f7']}
          style={styles.heroSection}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.logoIcon}>
                <Text style={styles.logoIconText}>🧠</Text>
              </View>
              <Text style={styles.logoText}>Lifepattern AI</Text>
            </View>
            <View style={styles.profileIcon}>
              <Text style={styles.profileIconText}>👤</Text>
            </View>
          </View>

          {/* Hero Content */}
          <View style={styles.heroContent}>
            <View style={styles.chartIconContainer}>
              <Text style={styles.chartIcon}>📈</Text>
            </View>
            <Text style={styles.heroTitle}>Track Your Daily Routines</Text>
            <Text style={styles.heroSubtitle}>
              Get AI-powered insights to improve your lifestyle habits and build better patterns
            </Text>
            <TouchableOpacity style={styles.ctaButton} onPress={handleStartTracking}>
              <Text style={styles.ctaButtonText}>Start Tracking Today</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Sample Data Cards */}
        <View style={styles.sampleDataContainer}>
          <View style={styles.dataCard}>
            <View style={[styles.dataIconContainer, { backgroundColor: '#dbeafe' }]}>
              <Text style={styles.dataIcon}>🛏️</Text>
            </View>
            <View style={styles.dataInfo}>
              <Text style={styles.dataLabel}>Sleep</Text>
              <Text style={styles.dataValue}>7.5h</Text>
            </View>
          </View>

          <View style={styles.dataCard}>
            <View style={[styles.dataIconContainer, { backgroundColor: '#dcfce7' }]}>
              <Text style={styles.dataIcon}>💪</Text>
            </View>
            <View style={styles.dataInfo}>
              <Text style={styles.dataLabel}>Exercise</Text>
              <Text style={styles.dataValue}>45min</Text>
            </View>
          </View>
        </View>

        {/* What We Track Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What We Track</Text>

          <TouchableOpacity style={styles.featureCard}>
            <View style={[styles.featureIconContainer, { backgroundColor: '#e9d5ff' }]}>
              <Text style={styles.featureIcon}>🌙</Text>
            </View>
            <View style={styles.featureInfo}>
              <Text style={styles.featureTitle}>Sleep Patterns</Text>
              <Text style={styles.featureDescription}>
                Monitor sleep quality and duration for better rest
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.featureCard}>
            <View style={[styles.featureIconContainer, { backgroundColor: '#fed7aa' }]}>
              <Text style={styles.featureIcon}>🍽️</Text>
            </View>
            <View style={styles.featureInfo}>
              <Text style={styles.featureTitle}>Meal Tracking</Text>
              <Text style={styles.featureDescription}>
                Log your meals and nutrition habits
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.featureCard}>
            <View style={[styles.featureIconContainer, { backgroundColor: '#d1fae5' }]}>
              <Text style={styles.featureIcon}>🏃</Text>
            </View>
            <View style={styles.featureInfo}>
              <Text style={styles.featureTitle}>Exercise Routine</Text>
              <Text style={styles.featureDescription}>
                Track workouts and physical activity levels
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.featureCard}>
            <View style={[styles.featureIconContainer, { backgroundColor: '#fecaca' }]}>
              <Text style={styles.featureIcon}>📱</Text>
            </View>
            <View style={styles.featureInfo}>
              <Text style={styles.featureTitle}>Screen Time</Text>
              <Text style={styles.featureDescription}>
                Monitor device usage and digital wellness
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* AI Insights Section */}
        <View style={styles.insightsSection}>
          <View style={styles.insightHeader}>
            <View style={styles.insightIconContainer}>
              <Text style={styles.insightHeaderIcon}>🔮</Text>
            </View>
            <Text style={styles.insightHeaderTitle}>AI Insights</Text>
          </View>

          <View style={styles.insightCard}>
            <Text style={styles.insightText}>
              💡 Your sleep quality improves by 23% when you exercise in the morning
            </Text>
          </View>

          <View style={[styles.insightCard, styles.insightCardGreen]}>
            <Text style={styles.insightTextGreen}>
              🎯 Try reducing screen time by 30 minutes before bed for better sleep
            </Text>
          </View>

          <TouchableOpacity style={styles.viewAllButton}>
            <Text style={styles.viewAllButtonText}>View All Insights</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Action Section */}
        <View style={styles.bottomSection}>
          <Text style={styles.bottomTitle}>Ready to Start Your Journey?</Text>
          <TouchableOpacity style={styles.getStartedButton} onPress={handleStartTracking}>
            <Text style={styles.getStartedButtonText}>Get Started Now</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLink}>Already have an account? Log in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navTab}>
          <Text style={[styles.navIcon, styles.navIconActive]}>🏠</Text>
          <Text style={[styles.navLabel, styles.navLabelActive]}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navTab} onPress={handleStartTracking}>
          <Text style={styles.navIcon}>📊</Text>
          <Text style={styles.navLabel}>Dashboard</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.centerNavButton}>
          <View style={styles.centerNavButtonInner}>
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
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 80,
  },
  scrollView: {
    flex: 1,
  },
  heroSection: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoIconText: {
    fontSize: 24,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIconText: {
    fontSize: 20,
  },
  heroContent: {
    alignItems: 'center',
  },
  chartIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  chartIcon: {
    fontSize: 60,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  ctaButton: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 40,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6366f1',
  },
  sampleDataContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: -20,
    marginBottom: 30,
  },
  dataCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dataIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dataIcon: {
    fontSize: 28,
  },
  dataInfo: {
    flex: 1,
  },
  dataLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  dataValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 20,
  },
  featureCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  featureIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureIcon: {
    fontSize: 24,
  },
  featureInfo: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  chevron: {
    fontSize: 28,
    color: '#d1d5db',
    marginLeft: 8,
  },
  insightsSection: {
    backgroundColor: '#ede9fe',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    marginBottom: 30,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  insightIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  insightHeaderIcon: {
    fontSize: 24,
  },
  insightHeaderTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2937',
  },
  insightCard: {
    backgroundColor: '#ddd6fe',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  insightCardGreen: {
    backgroundColor: '#d1fae5',
  },
  insightText: {
    fontSize: 15,
    color: '#5b21b6',
    lineHeight: 22,
  },
  insightTextGreen: {
    fontSize: 15,
    color: '#065f46',
    lineHeight: 22,
  },
  viewAllButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  viewAllButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  bottomTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 24,
  },
  getStartedButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 60,
    marginBottom: 16,
    shadowColor: '#8b5cf6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  getStartedButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  loginLink: {
    fontSize: 16,
    color: '#6366f1',
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
  centerNavIcon: {
    fontSize: 28,
    color: '#ffffff',
    fontWeight: 'bold',
  },
}); 