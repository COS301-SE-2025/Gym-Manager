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
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import axios from 'axios';
import { getToken } from '../../utils/authStorage';
import config from '../../config';
import { MemberAnalytics, ClassPerformance } from '../../types';
import IconLogo from '../../components/common/IconLogo';

const { width } = Dimensions.get('window');

type MemberAnalyticsScreenProps = {
  navigation: StackNavigationProp<AuthStackParamList, 'MemberAnalytics'>;
};

const MemberAnalyticsScreen: React.FC<MemberAnalyticsScreenProps> = ({ navigation }) => {
  const [analytics, setAnalytics] = useState<MemberAnalytics | null>(null);
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

      const response = await axios.get<MemberAnalytics>(
        `${config.BASE_URL}/analytics/member`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setAnalytics(response.data);
    } catch (err: any) {
      console.error('Failed to fetch member analytics:', err);
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

  const getPositionColor = (position: number, totalParticipants: number) => {
    const percentage = (position / totalParticipants) * 100;
    if (percentage <= 25) return '#D8FF3E'; // Top 25%
    if (percentage <= 50) return '#4CAF50'; // Top 50%
    if (percentage <= 75) return '#FF9800'; // Top 75%
    return '#FF6B6B'; // Bottom 25%
  };

  const getPositionText = (position: number, totalParticipants: number) => {
    const percentage = (position / totalParticipants) * 100;
    if (percentage <= 25) return 'Top 25%';
    if (percentage <= 50) return 'Top 50%';
    if (percentage <= 75) return 'Top 75%';
    return 'Bottom 25%';
  };

  const renderClassPerformanceItem = (performance: ClassPerformance, index: number) => {
    const positionColor = getPositionColor(performance.position, performance.totalParticipants);
    const positionText = getPositionText(performance.position, performance.totalParticipants);
    const date = new Date(performance.scheduledDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    return (
      <View key={performance.classId} style={styles.performanceItem}>
        <View style={styles.performanceDate}>
          <Text style={styles.dateText}>{date}</Text>
        </View>
        <View style={styles.performanceInfo}>
          <Text style={styles.workoutName}>{performance.workoutName}</Text>
          <Text style={styles.performanceDetails}>
            Score: {performance.score ?? 'N/A'} • {performance.totalParticipants} participants
          </Text>
        </View>
        <View style={styles.performanceStats}>
          <View style={[styles.positionBadge, { backgroundColor: positionColor }]}>
            <Text style={styles.positionNumber}>#{performance.position}</Text>
          </View>
          <Text style={styles.positionText}>{positionText}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <IconLogo width={50} height={46} />
          <Text style={styles.headerTitle}>My Performance</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#D8FF3E" />
          <Text style={styles.loadingText}>Loading performance data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <IconLogo width={50} height={46} />
          <Text style={styles.headerTitle}>My Performance</Text>
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
        <Text style={styles.headerTitle}>My Performance</Text>
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
              'Avg Position',
              analytics?.averageLeaderboardPosition.toFixed(1) || '0',
              'on leaderboard'
            )}
            {renderStatCard(
              'Classes Attended',
              analytics?.totalClassesAttended || 0,
              'total'
            )}
          </View>
        </View>

        {/* Class Performance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Class Performance</Text>
          {analytics?.classPerformance && analytics.classPerformance.length > 0 ? (
            <View style={styles.performanceList}>
              {analytics.classPerformance.map((performance, index) =>
                renderClassPerformanceItem(performance, index)
              )}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No performance data available</Text>
              <Text style={styles.emptySubtext}>
                Attend classes to see your performance analytics
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
  performanceList: {
    gap: 12,
  },
  performanceItem: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  performanceDate: {
    width: 50,
    alignItems: 'center',
    marginRight: 12,
  },
  dateText: {
    color: '#D8FF3E',
    fontSize: 12,
    fontWeight: '600',
  },
  performanceInfo: {
    flex: 1,
  },
  workoutName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  performanceDetails: {
    color: '#888',
    fontSize: 12,
  },
  performanceStats: {
    alignItems: 'center',
  },
  positionBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  positionNumber: {
    color: '#1a1a1a',
    fontSize: 14,
    fontWeight: '700',
  },
  positionText: {
    color: '#888',
    fontSize: 10,
    textAlign: 'center',
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

export default MemberAnalyticsScreen;
