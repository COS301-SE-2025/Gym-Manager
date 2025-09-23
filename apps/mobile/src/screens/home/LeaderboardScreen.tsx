// apps/mobile/src/screens/home/LeaderboardScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Modal,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { getToken } from '../../utils/authStorage';
import config from '../../config';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth } = Dimensions.get('window');

interface DailyLeaderboardEntry {
  userId: number;
  firstName: string;
  lastName: string;
  totalScore: number;
  classCount: number;
  bestScore: number;
  bestWorkoutName: string;
}

interface DailyLeaderboardResponse {
  success: boolean;
  date: string;
  leaderboard: DailyLeaderboardEntry[];
  total: number;
  message: string;
}

type ScalingType = 'all' | 'rx' | 'sc';

const scalingOptions = [
  { value: 'all', label: 'All Members', icon: 'people-outline', color: '#D8FF3E' },
  { value: 'rx', label: 'RX', icon: 'trophy-outline', color: '#FFD700' },
  { value: 'sc', label: 'Scaled', icon: 'star-outline', color: '#87CEEB' },
];

const LeaderboardScreen = () => {
  const [leaderboard, setLeaderboard] = useState<DailyLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [selectedScaling, setSelectedScaling] = useState<ScalingType>('all');
  const [showScalingDropdown, setShowScalingDropdown] = useState(false); // Changed from modal to dropdown

  const fetchDailyLeaderboard = async (date: string, scaling: ScalingType = 'all') => {
    try {
      setLoading(true);
      setError('');
      
      const token = await getToken();
      if (!token) {
        setError('Not authenticated');
        return;
      }

      // Build query parameters
      const params = new URLSearchParams({ date });
      if (scaling !== 'all') {
        params.append('scaling', scaling);
      }

      const response = await axios.get(`${config.BASE_URL}/daily-leaderboard?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        setLeaderboard(response.data.leaderboard);
      } else {
        setError('Failed to fetch leaderboard');
      }
    } catch (error: any) {
      console.error('Error fetching daily leaderboard:', error);
      setError(error.response?.data?.error || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyLeaderboard(selectedDate, selectedScaling);
  }, [selectedDate, selectedScaling]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDailyLeaderboard(selectedDate, selectedScaling);
  }, [selectedDate, selectedScaling]);

  const navigateDate = useCallback((direction: 'prev' | 'next') => {
    const currentDate = new Date(selectedDate);
    const newDate = new Date(currentDate);
    
    if (direction === 'prev') {
      newDate.setDate(currentDate.getDate() - 1);
    } else {
      newDate.setDate(currentDate.getDate() + 1);
    }
    
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (newDate > today) return;
    
    const newDateString = newDate.toISOString().slice(0, 10);
    setSelectedDate(newDateString);
    fetchDailyLeaderboard(newDateString, selectedScaling);
  }, [selectedDate, selectedScaling, fetchDailyLeaderboard]);

  const handleScalingSelect = (scaling: ScalingType) => {
    setSelectedScaling(scaling);
    setShowScalingDropdown(false);
    // The useEffect will automatically trigger the API call
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toISOString().slice(0, 10);

    if (dateString === today) return 'Today';
    if (dateString === yesterdayString) return 'Yesterday';
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  const canGoNext = () => {
    const today = new Date().toISOString().slice(0, 10);
    return selectedDate < today;
  };

  const getCurrentScalingOption = () => {
    return scalingOptions.find(option => option.value === selectedScaling) || scalingOptions[0];
  };

  const renderMedalIcon = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return null;
  };

  const ScalingDropdown = () => (
    <View style={styles.scalingDropdownContainer}>
      <Pressable 
        style={[
          styles.scalingDropdown,
          showScalingDropdown && styles.scalingDropdownActive
        ]} 
        onPress={() => setShowScalingDropdown(!showScalingDropdown)}
      >
        <View style={styles.scalingDropdownContent}>
          <Ionicons 
            name={getCurrentScalingOption().icon as any} 
            size={18} 
            color={getCurrentScalingOption().color} 
          />
          <Text style={styles.scalingDropdownText}>{getCurrentScalingOption().label}</Text>
          <Ionicons 
            name={showScalingDropdown ? "chevron-up" : "chevron-down"} 
            size={16} 
            color="#888" 
          />
        </View>
      </Pressable>
      
      {/* Dropdown Options - Animated expansion */}
      {showScalingDropdown && (
        <View style={styles.dropdownOptions}>
          {scalingOptions.map((option, index) => (
            <Pressable
              key={option.value}
              style={[
                styles.dropdownOption,
                selectedScaling === option.value && styles.dropdownOptionSelected,
                index === scalingOptions.length - 1 && styles.dropdownOptionLast
              ]}
              onPress={() => handleScalingSelect(option.value as ScalingType)}
            >
              <Ionicons name={option.icon as any} size={18} color={option.color} />
              <Text style={[
                styles.dropdownOptionText,
                selectedScaling === option.value && styles.dropdownOptionTextSelected
              ]}>
                {option.label}
              </Text>
              {selectedScaling === option.value && (
                <Ionicons name="checkmark" size={18} color="#D8FF3E" />
              )}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      {/* Compact Premium Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Daily Leaderboard</Text>
      </View>

      {/* Date Navigation */}
      <View style={styles.dateSection}>
        <View style={styles.dateNavigation}>
          <Pressable 
            style={styles.dateButton} 
            onPress={() => navigateDate('prev')}
          >
            <Ionicons name="chevron-back" size={18} color="#D8FF3E" />
          </Pressable>
          
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
            <Text style={styles.dateSubtext}>{new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' })}</Text>
          </View>
          
          <Pressable 
            style={[styles.dateButton, !canGoNext() && styles.dateButtonDisabled]} 
            onPress={() => navigateDate('next')}
            disabled={!canGoNext()}
          >
            <Ionicons 
              name="chevron-forward" 
              size={18} 
              color={canGoNext() ? "#D8FF3E" : "#555"} 
            />
          </Pressable>
        </View>

        {/* Scaling Filter Dropdown */}
        <ScalingDropdown />
      </View>

      {/* Stats Summary */}
      {!loading && !error && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{leaderboard.length}</Text>
            <Text style={styles.statLabel}>Athletes</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {leaderboard.reduce((sum, entry) => sum + entry.classCount, 0)}
            </Text>
            <Text style={styles.statLabel}>Total Classes</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {leaderboard.length > 0 ? Math.max(...leaderboard.map(e => e.totalScore)) : 0}
            </Text>
            <Text style={styles.statLabel}>Top Score</Text>
          </View>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#D8FF3E" size="large" />
          <Text style={styles.loadingText}>Loading leaderboard...</Text>
        </View>
      ) : error ? (
        <View style={styles.emptyStateContainer}>
          <Ionicons name="trophy-outline" size={64} color="#444" />
          <Text style={styles.emptyStateTitle}>No Scores Found</Text>
          <Text style={styles.emptyStateDescription}>{error}</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D8FF3E" />
          }
          showsVerticalScrollIndicator={false}
        >
          {leaderboard.map((user, idx) => (
            <View key={user.userId} style={styles.leaderboardCard}>
              {/* Ranking Section */}
              <View style={styles.rankSection}>
                <View style={[
                  styles.rankBadge,
                  idx === 0 && styles.goldBadge,
                  idx === 1 && styles.silverBadge,
                  idx === 2 && styles.bronzeBadge,
                ]}>
                  <Text style={[
                    styles.rankText,
                    idx <= 2 && styles.podiumRankText
                  ]}>
                    {idx + 1}
                  </Text>
                </View>
                {renderMedalIcon(idx) && (
                  <Text style={styles.medalIcon}>{renderMedalIcon(idx)}</Text>
                )}
              </View>

              {/* User Info */}
              <View style={styles.userInfo}>
                <Text style={styles.userName}>
                  {user.firstName} {user.lastName}
                </Text>
                <View style={styles.userStats}>
                  <View style={styles.userStatItem}>
                    <Ionicons name="trophy" size={14} color="#D8FF3E" />
                    <Text style={styles.userStatText}>{user.totalScore} pts</Text>
                  </View>
                  <View style={styles.userStatItem}>
                    <Ionicons name="fitness" size={14} color="#888" />
                    <Text style={styles.userStatText}>
                      {user.classCount} class{user.classCount !== 1 ? 'es' : ''}
                    </Text>
                  </View>
                </View>
                <Text style={styles.bestScore}>
                  Best: {user.bestScore} pts • {user.bestWorkoutName}
                </Text>
              </View>

              {/* Score Display */}
              <View style={styles.scoreSection}>
                <Text style={styles.scoreValue}>{user.totalScore}</Text>
                <Text style={styles.scoreLabel}>points</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a', // Darker, more premium background
  },
  
  // Compact Premium Header
  header: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: 20,
    // Removed background color for seamless look
  },
  title: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  // Removed subtitle completely for cleaner look

  // Refined Date Section
  dateSection: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 8,
  },
  dateNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dateButton: {
    backgroundColor: 'rgba(216, 255, 62, 0.1)', // Subtle neon background
    borderRadius: 10,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(216, 255, 62, 0.2)',
  },
  dateButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  dateContainer: {
    alignItems: 'center',
  },
  dateText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  dateSubtext: {
    color: '#888',
    fontSize: 11,
    marginTop: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Premium Scaling Dropdown
  scalingDropdownContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  scalingDropdown: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  scalingDropdownActive: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomColor: 'transparent',
    // Keep the border radius changes but dropdown will overlay
  },
  scalingDropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  scalingDropdownText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 10,
    marginRight: 8,
    flex: 1,
  },

  // Dropdown Options - Now with absolute positioning
  dropdownOptions: {
    position: 'absolute', // KEY CHANGE: Make it absolute
    top: '100%', // Position right below the dropdown button
    left: 0,
    right: 0,
    backgroundColor: 'rgba(26, 26, 26, 0.95)', // Slightly more opaque for better visibility
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    overflow: 'hidden',
    marginTop: -1,
    zIndex: 1001, // Ensure it appears above other content
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10, // For Android shadow
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14, // Slightly more padding for better touch targets
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(26, 26, 26, 0.95)',
  },
  dropdownOptionLast: {
    borderBottomWidth: 0,
  },
  dropdownOptionSelected: {
    backgroundColor: 'rgba(216, 255, 62, 0.15)',
  },
  dropdownOptionText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 10,
    flex: 1,
  },
  dropdownOptionTextSelected: {
    color: '#D8FF3E',
    fontWeight: '600',
  },

  // Refined Stats Container
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  statNumber: {
    color: '#D8FF3E',
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    color: '#888',
    fontSize: 11,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Premium Loading States
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#888',
    marginTop: 16,
    fontSize: 15,
    fontWeight: '500',
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateDescription: {
    color: '#888',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
    paddingTop: 0,
  },

  // Premium Leaderboard Cards
  leaderboardCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },

  // Enhanced Rank Section
  rankSection: {
    alignItems: 'center',
    marginRight: 16,
  },
  rankBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  goldBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderColor: '#FFD700',
  },
  silverBadge: {
    backgroundColor: 'rgba(192, 192, 192, 0.2)',
    borderColor: '#C0C0C0',
  },
  bronzeBadge: {
    backgroundColor: 'rgba(205, 127, 50, 0.2)',
    borderColor: '#CD7F32',
  },
  rankText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },
  podiumRankText: {
    color: '#fff',
    fontWeight: '800',
  },
  medalIcon: {
    fontSize: 14,
    marginTop: 3,
  },

  // Refined User Info
  userInfo: {
    flex: 1,
    marginRight: 16,
  },
  userName: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 6,
  },
  userStats: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  userStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  userStatText: {
    color: '#aaa',
    fontSize: 13,
    marginLeft: 4,
    fontWeight: '500',
  },
  bestScore: {
    color: '#777',
    fontSize: 11,
    fontStyle: 'italic',
  },

  // Clean Score Section
  scoreSection: {
    alignItems: 'center',
  },
  scoreValue: {
    color: '#D8FF3E',
    fontSize: 22,
    fontWeight: '700',
  },
  scoreLabel: {
    color: '#888',
    fontSize: 11,
    marginTop: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default LeaderboardScreen;