import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  FlatList,
} from 'react-native';
import { LeaderboardEntry } from '../../types/gamification';
import { gamificationService } from '../../services/gamificationService';
import { LeaderboardCard } from '../../components/gamification/LeaderboardCard';

export default function LeaderboardScreen() {
  const [streakLeaderboard, setStreakLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [pointsLeaderboard, setPointsLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'streak' | 'points'>('streak');

  const loadLeaderboards = async (isInitialLoad = false) => {
    try {
      const [streakData, pointsData] = await Promise.all([
        gamificationService.getStreakLeaderboard(20),
        gamificationService.getPointsLeaderboard(20),
      ]);
      setStreakLeaderboard(streakData);
      setPointsLeaderboard(pointsData);
    } catch (error) {
      console.error('Error loading leaderboards:', error);
      Alert.alert('Error', 'Failed to load leaderboard data');
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadLeaderboards(true);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadLeaderboards(false);
    } finally {
      setRefreshing(false);
    }
  };

  const getCurrentLeaderboard = () => {
    return activeTab === 'streak' ? streakLeaderboard : pointsLeaderboard;
  };

  const renderLeaderboardItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => (
    <LeaderboardCard
      entry={item}
      rank={index + 1}
      type={activeTab}
      onPress={() => {
        // Handle user profile press
      }}
    />
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading leaderboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Leaderboard</Text>
        <Text style={styles.subtitle}>See how you stack up against others</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'streak' && styles.activeTab]}
          onPress={() => setActiveTab('streak')}
        >
          <Text style={[styles.tabText, activeTab === 'streak' && styles.activeTabText]}>
            Streaks
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'points' && styles.activeTab]}
          onPress={() => setActiveTab('points')}
        >
          <Text style={[styles.tabText, activeTab === 'points' && styles.activeTabText]}>
            Points
          </Text>
        </TouchableOpacity>
      </View>

      {/* Top 3 Podium */}
      {getCurrentLeaderboard().length >= 3 && (
        <View style={styles.podiumContainer}>
          <Text style={styles.podiumTitle}>Top 3</Text>
          <View style={styles.podium}>
            {/* 2nd Place */}
            <View style={[styles.podiumItem, styles.secondPlace]}>
              <Text style={styles.podiumRank}>2</Text>
              <Text style={styles.podiumName} numberOfLines={1}>
                {getCurrentLeaderboard()[1]?.user.firstName} {getCurrentLeaderboard()[1]?.user.lastName}
              </Text>
              <Text style={styles.podiumValue}>
                {activeTab === 'streak' 
                  ? `${getCurrentLeaderboard()[1]?.streak.currentStreak} days`
                  : gamificationService.formatPointsText(getCurrentLeaderboard()[1]?.streak.totalPoints || 0)
                }
              </Text>
            </View>

            {/* 1st Place */}
            <View style={[styles.podiumItem, styles.firstPlace]}>
              <Text style={styles.podiumRank}>1</Text>
              <Text style={styles.podiumName} numberOfLines={1}>
                {getCurrentLeaderboard()[0]?.user.firstName} {getCurrentLeaderboard()[0]?.user.lastName}
              </Text>
              <Text style={styles.podiumValue}>
                {activeTab === 'streak' 
                  ? `${getCurrentLeaderboard()[0]?.streak.currentStreak} days`
                  : gamificationService.formatPointsText(getCurrentLeaderboard()[0]?.streak.totalPoints || 0)
                }
              </Text>
            </View>

            {/* 3rd Place */}
            <View style={[styles.podiumItem, styles.thirdPlace]}>
              <Text style={styles.podiumRank}>3</Text>
              <Text style={styles.podiumName} numberOfLines={1}>
                {getCurrentLeaderboard()[2]?.user.firstName} {getCurrentLeaderboard()[2]?.user.lastName}
              </Text>
              <Text style={styles.podiumValue}>
                {activeTab === 'streak' 
                  ? `${getCurrentLeaderboard()[2]?.streak.currentStreak} days`
                  : gamificationService.formatPointsText(getCurrentLeaderboard()[2]?.streak.totalPoints || 0)
                }
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Full Leaderboard */}
      <View style={styles.leaderboardContainer}>
        <Text style={styles.leaderboardTitle}>Full Rankings</Text>
        <FlatList
          data={getCurrentLeaderboard()}
          renderItem={renderLeaderboardItem}
          keyExtractor={(item, index) => `${activeTab}-${index}`}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              tintColor="#D8FF3E"
            />
          }
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
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
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#D8FF3E',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  activeTabText: {
    color: '#000',
  },
  podiumContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  podiumTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  podium: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    height: 120,
  },
  podiumItem: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    marginHorizontal: 4,
  },
  firstPlace: {
    height: 100,
    borderColor: '#FFD700',
    borderWidth: 2,
  },
  secondPlace: {
    height: 80,
    borderColor: '#C0C0C0',
    borderWidth: 2,
  },
  thirdPlace: {
    height: 60,
    borderColor: '#CD7F32',
    borderWidth: 2,
  },
  podiumRank: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  podiumName: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  podiumValue: {
    fontSize: 10,
    color: '#D8FF3E',
    fontWeight: '600',
  },
  leaderboardContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  leaderboardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  listContainer: {
    paddingBottom: 40,
  },
});
