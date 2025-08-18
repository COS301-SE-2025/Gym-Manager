import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import { getToken } from '../../utils/authStorage';
import { getLiveClass } from '../../utils/liveClass';
import config from '../../config';

const LeaderboardScreen = () => {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [classId, setClassId] = useState<number | null>(null);

  const fetchLeaderboard = useCallback(async (useRefresh = false) => {
    if (!useRefresh) setLoading(true);
    setError('');
    try {
      const token = await getToken();

      const liveClass = await getLiveClass(token);
      if (!liveClass || !liveClass.class || !liveClass.class.classId) {
        setError('No live class found');
        setLeaderboard([]);
        setClassId(null);
        return;
      }
      setClassId(liveClass.class.classId);
      const res = await axios.get(`${config.BASE_URL}/leaderboard/${liveClass.class.classId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLeaderboard(res.data);
    } catch (err: any) {
      setError('Failed to load leaderboard');
      setLeaderboard([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLeaderboard(true);
  }, [fetchLeaderboard]);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Leaderboard</Text>
      {loading ? (
        <ActivityIndicator color="#D8FF3E" style={{ marginTop: 40 }} />
      ) : error === 'No live class found' ? (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateIcon}>📊</Text>
          <Text style={styles.emptyStateTitle}>No Live Class</Text>
          <Text style={styles.emptyStateDescription}>
            There is currently no live class. Check back later to see the leaderboard for your next
            class!
          </Text>
        </View>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D8FF3E" />
          }
        >
          {leaderboard.map((user, idx) => (
            <View
              key={user.memberId || user.userId || idx}
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
                <Text style={styles.score}>{user.score} pts</Text>
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
