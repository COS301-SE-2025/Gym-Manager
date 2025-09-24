import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { GamificationStats } from '../../types/gamification';
import { gamificationService } from '../../services/gamificationService';
import { StreakCard } from '../../components/gamification/StreakCard';
import { BadgeCard } from '../../components/gamification/BadgeCard';
import { WeeklyStatsCard } from '../../components/gamification/WeeklyStatsCard';

export default function GamificationScreen() {
  const navigation = useNavigation();
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = async () => {
    try {
      const gamificationStats = await gamificationService.getGamificationStats();
      setStats(gamificationStats);
    } catch (error) {
      console.error('Error loading gamification stats:', error);
      Alert.alert('Error', 'Failed to load gamification data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  const handleStreakPress = () => {
    // Navigate to detailed streak screen
    navigation.navigate('GamificationScreen');
  };

  const handleBadgePress = (badge: any) => {
    // Navigate to badge details
    navigation.navigate('BadgesScreen');
  };

  const handleViewAllBadges = () => {
    navigation.navigate('BadgesScreen');
  };

  const handleViewLeaderboard = () => {
    navigation.navigate('LeaderboardScreen');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading your progress...</Text>
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load gamification data</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadStats}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh}
          tintColor="#D8FF3E"
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Your Progress</Text>
        <Text style={styles.subtitle}>Keep the momentum going!</Text>
      </View>

      {/* Streak Card */}
      <StreakCard streak={stats.userStreak} onPress={handleStreakPress} />

      {/* Weekly Stats */}
      <WeeklyStatsCard weeklyStats={stats.weeklyStats} />

      {/* Recent Badges */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Badges</Text>
          <TouchableOpacity onPress={handleViewAllBadges}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        
        {stats.recentBadges.length > 0 ? (
          stats.recentBadges.map((badge) => (
            <BadgeCard
              key={badge.userBadgeId}
              badge={badge}
              onPress={() => handleBadgePress(badge)}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No badges earned yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Complete workouts to start earning badges!
            </Text>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <TouchableOpacity style={styles.actionButton} onPress={handleViewLeaderboard}>
          <Text style={styles.actionButtonText}>View Leaderboard</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={handleViewAllBadges}>
          <Text style={styles.actionButtonText}>All Badges</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#ff6b35',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  header: {
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  viewAllText: {
    fontSize: 14,
    color: '#D8FF3E',
    fontWeight: '600',
  },
  emptyState: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  actionButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  actionButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 40,
  },
});
