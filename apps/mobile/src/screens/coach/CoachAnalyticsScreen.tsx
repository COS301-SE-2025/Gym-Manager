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
  TouchableOpacity,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { CoachStackParamList } from '../../navigation/CoachNavigator';
import axios from 'axios';
import { getToken } from '../../utils/authStorage';
import config from '../../config';
import { CoachAnalytics, AttendanceTrend } from '../../types';
import IconLogo from '../../components/common/IconLogo';
import { Ionicons } from '@expo/vector-icons';

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

  const renderAttendanceTrendItem = (trend: AttendanceTrend, index: number) => {
    const date = new Date(trend.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    
    return (
      <View key={index} style={styles.trendItem}>
        <View style={styles.trendDate}>
          <Text style={styles.trendDateText}>{date}</Text>
        </View>
        <View style={styles.trendInfo}>
          <Text style={styles.trendAttendance}>{trend.attendance}/{trend.capacity}</Text>
          <Text style={styles.trendFillRate}>{trend.fillRate.toFixed(0)}% filled</Text>
        </View>
        <View style={styles.trendBar}>
          <View 
            style={[
              styles.trendBarFill, 
              { width: `${Math.min(trend.fillRate, 100)}%` }
            ]} 
          />
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#D8FF3E" />
          </TouchableOpacity>
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
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#D8FF3E" />
          </TouchableOpacity>
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
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#D8FF3E" />
        </TouchableOpacity>
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
          <View style={styles.statsContainer}>
            {renderStatCard(
              'Average Fill Rate',
              `${analytics?.averageFillRate.toFixed(1) || '0'}%`,
              'capacity utilization'
            )}
          </View>
        </View>

        {/* Attendance Trends */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Attendance Trends (Last 30 Days)</Text>
          {analytics?.attendanceTrends && analytics.attendanceTrends.length > 0 ? (
            <View style={styles.trendsList}>
              {analytics.attendanceTrends.map((trend, index) =>
                renderAttendanceTrendItem(trend, index)
              )}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No recent class data available</Text>
              <Text style={styles.emptySubtext}>
                Start teaching classes to see attendance trends
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
  backButton: {
    marginRight: 12,
    padding: 4,
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
    marginBottom: 12,
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
  trendsList: {
    gap: 12,
  },
  trendItem: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendDate: {
    width: 50,
    alignItems: 'center',
    marginRight: 12,
  },
  trendDateText: {
    color: '#D8FF3E',
    fontSize: 12,
    fontWeight: '600',
  },
  trendInfo: {
    flex: 1,
  },
  trendAttendance: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  trendFillRate: {
    color: '#888',
    fontSize: 12,
  },
  trendBar: {
    width: 60,
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
  },
  trendBarFill: {
    height: '100%',
    backgroundColor: '#D8FF3E',
    borderRadius: 4,
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
