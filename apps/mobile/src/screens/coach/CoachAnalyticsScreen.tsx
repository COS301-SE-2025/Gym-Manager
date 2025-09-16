import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { CoachStackParamList } from '../../navigation/CoachNavigator';
import axios from 'axios';
import { getToken } from '../../utils/authStorage';
import config from '../../config';
import { CoachAnalytics, WorkoutPopularity } from '../../types';
import IconLogo from '../../components/common/IconLogo';

const { width } = Dimensions.get('window');

type CoachAnalyticsScreenProps = {
  navigation: StackNavigationProp<CoachStackParamList, 'CoachAnalytics'>;
};

const CoachAnalyticsScreen: React.FC<CoachAnalyticsScreenProps> = ({ navigation }) => {
  const [analytics, setAnalytics] = useState<CoachAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async (useRefresh = false) => {
    if (!useRefresh) setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get<CoachAnalytics>(
        `${config.BASE_URL}/analytics/coach`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setAnalytics(response.data);
    } catch (err: any) {
      console.error('Failed to fetch coach analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalytics(true);
  };

  const renderStatCard = (title: string, value: string | number, subtitle?: string) => (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  const renderWorkoutPopularityItem = (workout: WorkoutPopularity, index: number) => (
    <View key={workout.workoutId} style={styles.workoutItem}>
      <View style={styles.workoutRank}>
        <Text style={styles.workoutRankText}>#{index + 1}</Text>
      </View>
      <View style={styles.workoutInfo}>
        <Text style={styles.workoutName}>{workout.workoutName}</Text>
        <Text style={styles.workoutDetails}>
          {workout.classCount} class{workout.classCount === 1 ? '' : 'es'} • 
          Avg {workout.averageAttendance.toFixed(1)} attendees
        </Text>
      </View>
      <View style={styles.workoutAttendance}>
        <Text style={styles.attendanceNumber}>{workout.averageAttendance.toFixed(1)}</Text>
        <Text style={styles.attendanceLabel}>avg</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <IconLogo width={50} height={46} />
          <Text style={styles.headerTitle}>Analytics</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#D8FF3E" />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <IconLogo width={50} height={46} />
          <Text style={styles.headerTitle}>Analytics</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <IconLogo width={50} height={46} />
        <Text style={styles.headerTitle}>Analytics</Text>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D8FF3E" />
        }
      >
        {/* Overview Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsContainer}>
            {renderStatCard(
              'Average Attendance',
              analytics?.averageAttendance.toFixed(1) || '0',
              'per class'
            )}
            {renderStatCard(
              'Total Classes',
              analytics?.totalClasses || 0,
              'taught'
            )}
          </View>
        </View>

        {/* Workout Popularity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Workout Popularity</Text>
          {analytics?.workoutPopularity && analytics.workoutPopularity.length > 0 ? (
            <View style={styles.workoutList}>
              {analytics.workoutPopularity.map((workout, index) =>
                renderWorkoutPopularityItem(workout, index)
              )}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No workout data available</Text>
              <Text style={styles.emptySubtext}>
                Start teaching classes to see workout popularity analytics
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: '700',
    marginLeft: 12,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  statValue: {
    color: '#D8FF3E',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  statTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  statSubtitle: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  workoutList: {
    gap: 12,
  },
  workoutItem: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  workoutRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D8FF3E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  workoutRankText: {
    color: '#1a1a1a',
    fontSize: 14,
    fontWeight: '700',
  },
  workoutInfo: {
    flex: 1,
  },
  workoutName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  workoutDetails: {
    color: '#888',
    fontSize: 12,
  },
  workoutAttendance: {
    alignItems: 'center',
  },
  attendanceNumber: {
    color: '#D8FF3E',
    fontSize: 18,
    fontWeight: '700',
  },
  attendanceLabel: {
    color: '#888',
    fontSize: 10,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 16,
    textAlign: 'center',
  },
  emptyState: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default CoachAnalyticsScreen;
