import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import axios from 'axios';
import { getToken } from '../../utils/authStorage';
import config from '../../config';

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

const LeaderboardScreen = () => {
  const [leaderboard, setLeaderboard] = useState<DailyLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));

  const fetchDailyLeaderboard = useCallback(async (useRefresh = false, date?: string) => {
    if (!useRefresh) setLoading(true);
    setError('');
    try {
      const token = await getToken();
      const targetDate = date || selectedDate;
      
      const res = await axios.get<DailyLeaderboardResponse>(
        `${config.BASE_URL}/daily-leaderboard?date=${targetDate}`, 
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.data.success) {
        setLeaderboard(res.data.leaderboard);
        if (res.data.leaderboard.length === 0) {
          setError('No public scores found for this day');
        }
      } else {
        setError('Failed to load daily leaderboard');
        setLeaderboard([]);
      }
    } catch (err: any) {
      console.error('Daily leaderboard fetch error:', err);
      setError('Failed to load daily leaderboard');
      setLeaderboard([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchDailyLeaderboard();
  }, [fetchDailyLeaderboard]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDailyLeaderboard(true);
  }, [fetchDailyLeaderboard]);

  const navigateDate = useCallback((direction: 'prev' | 'next') => {
    const currentDate = new Date(selectedDate);
    const newDate = new Date(currentDate);
    
    if (direction === 'prev') {
      newDate.setDate(currentDate.getDate() - 1);
    } else {
      newDate.setDate(currentDate.getDate() + 1);
    }
    
    // Don't allow future dates
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    if (newDate > today) return;
    
    const newDateString = newDate.toISOString().slice(0, 10);
    setSelectedDate(newDateString);
    fetchDailyLeaderboard(false, newDateString);
  }, [selectedDate, fetchDailyLeaderboard]);

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

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Daily Leaderboard</Text>
      
      {/* Date Navigation */}
      <View style={styles.dateNavigation}>
        <Pressable 
          style={styles.dateButton} 
          onPress={() => navigateDate('prev')}
        >
          <Text style={styles.dateButtonText}>‹</Text>
        </Pressable>
        
        <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
        
        <Pressable 
          style={[styles.dateButton, !canGoNext() && styles.dateButtonDisabled]} 
          onPress={() => navigateDate('next')}
          disabled={!canGoNext()}
        >
          <Text style={[styles.dateButtonText, !canGoNext() && styles.dateButtonTextDisabled]}>›</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color="#D8FF3E" style={{ marginTop: 40 }} />
      ) : error ? (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateIcon}>📊</Text>
          <Text style={styles.emptyStateTitle}>No Scores Today</Text>
          <Text style={styles.emptyStateDescription}>
            {error}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D8FF3E" />
          }
        >
          {leaderboard.map((user, idx) => (
            <View
              key={user.userId}
              style={[
                styles.card,
                idx === 0 && styles.gold,
                idx === 1 && styles.silver,
                idx === 2 && styles.bronze,
              ]}
            >
              <Text style={styles.rank}>{idx + 1}</Text>
              <View style={styles.info}>
                <Text style={styles.name}>
                  {user.firstName} {user.lastName}
                </Text>
                <Text style={styles.score}>{user.totalScore} pts</Text>
                <Text style={styles.details}>
                  {user.classCount} class{user.classCount !== 1 ? 'es' : ''} • Best: {user.bestScore} pts
                </Text>
              </View>
              {idx === 0 && <Text style={styles.crown}>👑</Text>}
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
    backgroundColor: '#1a1a1a',
    paddingTop: 20,
  },
  title: {
    color: '#D8FF3E',
    fontSize: 28,
    fontWeight: 'bold',
    alignSelf: 'center',
    marginBottom: 20,
  },
  dateNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  dateButton: {
    backgroundColor: '#232323',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateButtonDisabled: {
    backgroundColor: '#1a1a1a',
  },
  dateButtonText: {
    color: '#D8FF3E',
    fontSize: 20,
    fontWeight: 'bold',
  },
  dateButtonTextDisabled: {
    color: '#555',
  },
  dateText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 20,
    minWidth: 100,
    textAlign: 'center',
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#232323',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  gold: {
    borderColor: '#FFD700',
    borderWidth: 2,
  },
  silver: {
    borderColor: '#C0C0C0',
    borderWidth: 2,
  },
  bronze: {
    borderColor: '#CD7F32',
    borderWidth: 2,
  },
  rank: {
    color: '#D8FF3E',
    fontSize: 22,
    fontWeight: 'bold',
    width: 36,
    textAlign: 'center',
  },
  info: {
    flex: 1,
    marginLeft: 10,
  },
  name: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  score: {
    color: '#D8FF3E',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 2,
  },
  details: {
    color: '#888',
    fontSize: 14,
    marginTop: 2,
  },
  crown: {
    fontSize: 24,
    marginLeft: 10,
  },
  error: {
    color: '#FF6B6B',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    paddingHorizontal: 24,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 20,
  },
  emptyStateTitle: {
    color: '#D8FF3E',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyStateDescription: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
});

export default LeaderboardScreen;