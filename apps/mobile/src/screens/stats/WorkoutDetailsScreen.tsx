import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HealthService, { WorkoutData, HeartRateData } from '../../services/HealthService';

const { width } = Dimensions.get('window');

interface WorkoutDetailScreenProps {
  route: {
    params: {
      workout: WorkoutData;
    };
  };
  navigation: any;
}

const WorkoutDetailScreen = ({ route, navigation }: WorkoutDetailScreenProps) => {
  const { workout } = route.params;
  const [heartRateData, setHeartRateData] = useState<HeartRateData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHeartRateData();
  }, []);

  const loadHeartRateData = async () => {
    try {
      const startDate = new Date(workout.startDate);
      const endDate = new Date(workout.endDate);
      
      const hrData = await HealthService.getHeartRateData(startDate, endDate);
      setHeartRateData(hrData);
    } catch (error) {
      console.error('Error loading heart rate data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getHeartRateStats = () => {
    if (heartRateData.length === 0) return null;
    
    const values = heartRateData.map(hr => hr.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    return { min: Math.round(min), max: Math.round(max), avg: Math.round(avg) };
  };

  const heartRateStats = getHeartRateStats();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Workout Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollContainer}>
        {/* Workout Info Section */}
        <View style={styles.section}>
          <View style={styles.workoutHeader}>
            <Text style={styles.workoutName}>{workout.type}</Text>
            <Text style={styles.workoutDate}>{formatDateTime(workout.startDate)}</Text>
            <Text style={styles.workoutTime}>
              {formatTime(workout.startDate)} - {formatTime(workout.endDate)}
            </Text>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.section}>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="time-outline" size={24} color="#D8FF3E" />
              <Text style={styles.statValue}>{formatDuration(workout.duration)}</Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>

            {workout.calories && (
              <View style={styles.statCard}>
                <Ionicons name="flame-outline" size={24} color="#D8FF3E" />
                <Text style={styles.statValue}>{Math.round(workout.calories)}</Text>
                <Text style={styles.statLabel}>Calories</Text>
              </View>
            )}

            {workout.distance && (
              <View style={styles.statCard}>
                <Ionicons name="footsteps-outline" size={24} color="#D8FF3E" />
                <Text style={styles.statValue}>{workout.distance.toFixed(1)} km</Text>
                <Text style={styles.statLabel}>Distance</Text>
              </View>
            )}
          </View>
        </View>

        {/* Heart Rate Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Heart Rate</Text>
          
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#D8FF3E" />
              <Text style={styles.loadingText}>Loading heart rate data...</Text>
            </View>
          ) : heartRateStats ? (
            <View style={styles.heartRateContainer}>
              <View style={styles.heartRateStats}>
                <View style={styles.heartRateStatItem}>
                  <Text style={styles.heartRateValue}>{heartRateStats.min}</Text>
                  <Text style={styles.heartRateLabel}>Min BPM</Text>
                </View>
                <View style={styles.heartRateStatItem}>
                  <Text style={styles.heartRateValue}>{heartRateStats.avg}</Text>
                  <Text style={styles.heartRateLabel}>Avg BPM</Text>
                </View>
                <View style={styles.heartRateStatItem}>
                  <Text style={styles.heartRateValue}>{heartRateStats.max}</Text>
                  <Text style={styles.heartRateLabel}>Max BPM</Text>
                </View>
              </View>
              
              <View style={styles.heartRateInfo}>
                <Text style={styles.heartRateInfoText}>
                  {heartRateData.length} heart rate readings during this workout
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.noDataContainer}>
              <Ionicons name="heart-outline" size={40} color="#666" />
              <Text style={styles.noDataTitle}>No Heart Rate Data</Text>
              <Text style={styles.noDataSubtitle}>
                No heart rate data was recorded during this workout.
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 30,
  },
  workoutHeader: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 20,
  },
  workoutName: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  workoutDate: {
    color: '#D8FF3E',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  workoutTime: {
    color: '#888',
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minWidth: (width - 64) / 2,
    flex: 1,
  },
  statValue: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    color: '#888',
    fontSize: 14,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    color: '#888',
    marginTop: 12,
  },
  heartRateContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 20,
  },
  heartRateStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  heartRateStatItem: {
    alignItems: 'center',
  },
  heartRateValue: {
    color: '#D8FF3E',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  heartRateLabel: {
    color: '#888',
    fontSize: 12,
  },
  heartRateInfo: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  heartRateInfoText: {
    color: '#888',
    fontSize: 14,
  },
  noDataContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },
  noDataTitle: {
    color: '#666',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
  },
  noDataSubtitle: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default WorkoutDetailScreen;