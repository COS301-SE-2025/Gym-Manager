import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { GamificationStats } from '../../types/gamification';
import { gamificationService } from '../../services/gamificationService';
import { StreakCard } from './StreakCard';

interface GamificationWidgetProps {
  onPress?: () => void;
}

export const GamificationWidget: React.FC<GamificationWidgetProps> = ({ onPress }) => {
  const navigation = useNavigation();
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    try {
      const gamificationStats = await gamificationService.getGamificationStats();
      setStats(gamificationStats);
    } catch (error) {
      console.error('Error loading gamification stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      navigation.navigate('MemberTabs', { screen: 'Progress' });
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#ff6b35" />
        <Text style={styles.loadingText}>Loading progress...</Text>
      </View>
    );
  }

  if (!stats) {
    return null;
  }

  const { userStreak, recentBadges, weeklyStats } = stats;
  const streakEmoji = gamificationService.getStreakEmoji(userStreak.currentStreak);

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.7}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Progress</Text>
        <Text style={styles.viewAllText}>View All →</Text>
      </View>

      <View style={styles.content}>
        {/* Streak Display */}
        <View style={styles.streakContainer}>
          <Text style={styles.streakEmoji}>{streakEmoji}</Text>
          <View style={styles.streakInfo}>
            <Text style={styles.streakNumber}>{userStreak.currentStreak}</Text>
            <Text style={styles.streakLabel}>day streak</Text>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{weeklyStats.workoutsThisWeek}</Text>
            <Text style={styles.statLabel}>This Week</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{userStreak.level}</Text>
            <Text style={styles.statLabel}>Level</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{recentBadges.length}</Text>
            <Text style={styles.statLabel}>Recent Badges</Text>
          </View>
        </View>

        {/* Recent Badge Preview */}
        {recentBadges.length > 0 && (
          <View style={styles.badgePreview}>
            <Text style={styles.badgeIcon}>
              {gamificationService.getBadgeIcon(recentBadges[0].badge?.badgeType || 'achievement')}
            </Text>
            <Text style={styles.badgeText} numberOfLines={1}>
              Latest: {recentBadges[0].badge?.name || 'Badge'}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  loadingContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginVertical: 8,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    fontSize: 14,
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  viewAllText: {
    fontSize: 14,
    color: '#D8FF3E',
    fontWeight: '600',
  },
  content: {
    gap: 12,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 12,
  },
  streakEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  streakInfo: {
    flex: 1,
  },
  streakNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  streakLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#D8FF3E',
  },
  statLabel: {
    fontSize: 10,
    color: '#888',
    marginTop: 2,
    textAlign: 'center',
  },
  badgePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 8,
  },
  badgeIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 12,
    color: '#ccc',
    flex: 1,
  },
});
