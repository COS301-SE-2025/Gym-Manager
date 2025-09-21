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
import { NativeModules, Platform } from 'react-native';

const { Constants } = require('react-native-health');
const { width } = Dimensions.get('window');

interface WorkoutData {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  duration: number;
  calories?: number;
  distance?: number;
  source: string;
}

interface HeartRateData {
  value: number;
  startDate: string;
  endDate: string;
  source: string;
}

interface WorkoutSession {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  duration: number;
  totalEnergyBurned?: number;
  totalDistance?: number;
  source: string;
}

interface HeartRateStats {
  average: number;
  max: number;
  min: number;
  zones: {
    resting: number;
    fatBurn: number;
    cardio: number;
    peak: number;
  };
  samples: number;
}

interface EnergyStats {
  totalCalories: number;
  averagePerMinute: number;
  peakBurningRate: number;
}

interface ActivityStats {
  totalSteps: number;
  averageStepsPerMinute: number;
  distance: number;
}

interface DetailedWorkoutStats {
  hasWorkout: boolean;
  workout?: WorkoutSession;
  heartRate?: HeartRateStats;
  energy?: EnergyStats;
  activity?: ActivityStats;
  duration?: number;
}

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
  const [workoutStats, setWorkoutStats] = useState<DetailedWorkoutStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadWorkoutData();
  }, []);

  // Fix for the date validation issue
const loadWorkoutData = async () => {
  if (Platform.OS !== 'ios') {
    console.log('Workout tracking only available on iOS');
    setIsLoading(false);
    return;
  }

  try {
    const healthKit = NativeModules.RCTAppleHealthKit;
    if (!healthKit) {
      console.log('HealthKit not available');
      setIsLoading(false);
      return;
    }

    // Validate and create dates safely
    console.log('Raw workout data:', { 
      startDate: workout.startDate, 
      endDate: workout.endDate,
      type: typeof workout.startDate 
    });

    // Handle different date formats
    let startDate: Date;
    let endDate: Date;

    try {
      // If the dates are already Date objects or valid ISO strings
      startDate = new Date(workout.startDate);
      endDate = new Date(workout.endDate);
      
      // Check if dates are valid
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid date values');
      }
    } catch (dateError) {
      console.error('Date parsing error:', dateError);
      console.error('Invalid date values:', { 
        start: workout.startDate, 
        end: workout.endDate 
      });
      setWorkoutStats({ hasWorkout: false });
      setIsLoading(false);
      return;
    }

    console.log('Loading workout data for period:', {
      start: startDate.toISOString(),
      end: endDate.toISOString()
    });

    // First, check if user tracked a workout during this time
    const workoutSessions = await getWorkoutSessions(healthKit, startDate, endDate);
    
    if (workoutSessions.length === 0) {
      // No workout tracked - show message
      setWorkoutStats({ hasWorkout: false });
      setIsLoading(false);
      return;
    }

    // User tracked a workout - get detailed stats
    const trackedWorkout = workoutSessions[0]; // Use the first/primary workout
    const detailedStats = await getDetailedWorkoutStats(healthKit, trackedWorkout);
    setWorkoutStats({ hasWorkout: true, ...detailedStats });

  } catch (error) {
    console.error('Error loading workout data:', error);
    setWorkoutStats({ hasWorkout: false });
  } finally {
    setIsLoading(false);
  }
};

  const getWorkoutSessions = async (healthKit: any, startDate: Date, endDate: Date): Promise<WorkoutSession[]> => {
    return new Promise((resolve) => {
      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      // Try multiple workout types that users might use for gym classes
      const workoutTypes = [
        Constants.Activities.FunctionalStrengthTraining,
        Constants.Activities.HighIntensityIntervalTraining,
        Constants.Activities.CrossTraining,
        Constants.Activities.TraditionalStrengthTraining,
        Constants.Activities.Running,
        Constants.Activities.Walking
      ];

      let completedRequests = 0;
      const allWorkouts: WorkoutSession[] = [];

      workoutTypes.forEach(workoutType => {
        healthKit.getSamples({
          type: workoutType,
          startDate: options.startDate,
          endDate: options.endDate,
        }, (error: string, results: any[]) => {
          completedRequests++;
          
          if (!error && results && results.length > 0) {
            const workouts: WorkoutSession[] = results.map((workout: any) => ({
              id: workout.uuid || `workout_${Date.now()}`,
              type: mapWorkoutType(workout.activityType || workout.type),
              startDate: workout.startDate,
              endDate: workout.endDate,
              duration: calculateDuration(workout.startDate, workout.endDate),
              totalEnergyBurned: workout.totalEnergyBurned,
              totalDistance: workout.totalDistance,
              source: workout.sourceName || 'Apple Health',
            }));
            allWorkouts.push(...workouts);
          }

          // When all requests are complete, resolve with unique workouts
          if (completedRequests === workoutTypes.length) {
            // Remove duplicates and resolve
            const uniqueWorkouts = allWorkouts.filter((workout, index, self) => 
              index === self.findIndex(w => w.id === workout.id)
            );
            resolve(uniqueWorkouts);
          }
        });
      });
    });
  };

  const getDetailedWorkoutStats = async (healthKit: any, workout: WorkoutSession): Promise<Omit<DetailedWorkoutStats, 'hasWorkout'>> => {
    const startDate = new Date(workout.startDate);
    const endDate = new Date(workout.endDate);

    // Get all sample data during the workout
    const [heartRateSamples, stepSamples, energySamples] = await Promise.all([
      getHeartRateSamples(healthKit, startDate, endDate),
      getStepCountSamples(healthKit, startDate, endDate),
      getActiveEnergySamples(healthKit, startDate, endDate)
    ]);

    return calculateDetailedStats(workout, heartRateSamples, stepSamples, energySamples);
  };

  const getHeartRateSamples = async (healthKit: any, startDate: Date, endDate: Date): Promise<HeartRateData[]> => {
    return new Promise((resolve) => {
      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      healthKit.getHeartRateSamples(options, (error: string, results: any[]) => {
        if (error) {
          console.log('Error getting heart rate samples:', error);
          resolve([]);
          return;
        }

        const samples: HeartRateData[] = (results || []).map((hr: any) => ({
          value: Math.round(hr.value),
          startDate: hr.startDate,
          endDate: hr.endDate || hr.startDate,
          source: hr.sourceName || 'Apple Health',
        }));

        resolve(samples);
      });
    });
  };

  const getStepCountSamples = async (healthKit: any, startDate: Date, endDate: Date): Promise<any[]> => {
    return new Promise((resolve) => {
      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      healthKit.getStepCountSamples(options, (error: string, results: any[]) => {
        if (error) {
          console.log('Error getting step samples:', error);
          resolve([]);
          return;
        }

        resolve(results || []);
      });
    });
  };

  const getActiveEnergySamples = async (healthKit: any, startDate: Date, endDate: Date): Promise<any[]> => {
    return new Promise((resolve) => {
      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      healthKit.getActiveEnergyBurnedSamples(options, (error: string, results: any[]) => {
        if (error) {
          console.log('Error getting energy samples:', error);
          resolve([]);
          return;
        }

        resolve(results || []);
      });
    });
  };

  const calculateDetailedStats = (workout: WorkoutSession, hrSamples: HeartRateData[], stepSamples: any[], energySamples: any[]) => {
    // Heart Rate Analysis
    const heartRateStats: HeartRateStats = {
      average: hrSamples.length > 0 ? Math.round(hrSamples.reduce((sum, hr) => sum + hr.value, 0) / hrSamples.length) : 0,
      max: hrSamples.length > 0 ? Math.max(...hrSamples.map(hr => hr.value)) : 0,
      min: hrSamples.length > 0 ? Math.min(...hrSamples.map(hr => hr.value)) : 0,
      zones: calculateHeartRateZones(hrSamples),
      samples: hrSamples.length
    };

    // Energy Analysis
    const totalEnergy = energySamples.reduce((sum, energy) => sum + (energy.value || 0), 0);
    const energyStats: EnergyStats = {
      totalCalories: Math.round(totalEnergy),
      averagePerMinute: workout.duration > 0 ? Math.round(totalEnergy / workout.duration) : 0,
      peakBurningRate: energySamples.length > 0 ? Math.max(...energySamples.map(e => e.value || 0)) : 0
    };

    // Activity Analysis
    const totalSteps = stepSamples.reduce((sum, step) => sum + (step.value || 0), 0);
    const activityStats: ActivityStats = {
      totalSteps: Math.round(totalSteps),
      averageStepsPerMinute: workout.duration > 0 ? Math.round(totalSteps / workout.duration) : 0,
      distance: workout.totalDistance || 0
    };

    return {
      workout,
      heartRate: heartRateStats,
      energy: energyStats,
      activity: activityStats,
      duration: workout.duration
    };
  };

  const calculateHeartRateZones = (hrSamples: HeartRateData[]): { resting: number; fatBurn: number; cardio: number; peak: number } => {
    if (hrSamples.length === 0) {
      return { resting: 0, fatBurn: 0, cardio: 0, peak: 0 };
    }

    // Assuming max HR = 220 - age (we'll use 190 as average for gym members)
    const estimatedMaxHR = 190;
    
    const zones = {
      resting: 0,   // < 50% max HR
      fatBurn: 0,   // 50-60% max HR
      cardio: 0,    // 60-70% max HR
      peak: 0,      // > 70% max HR
    };

    hrSamples.forEach(hr => {
      const percentage = (hr.value / estimatedMaxHR) * 100;
      
      if (percentage < 50) {
        zones.resting++;
      } else if (percentage < 60) {
        zones.fatBurn++;
      } else if (percentage < 70) {
        zones.cardio++;
      } else {
        zones.peak++;
      }
    });

    const total = hrSamples.length;
    return {
      resting: Math.round((zones.resting / total) * 100),
      fatBurn: Math.round((zones.fatBurn / total) * 100),
      cardio: Math.round((zones.cardio / total) * 100),
      peak: Math.round((zones.peak / total) * 100),
    };
  };

  const mapWorkoutType = (activityType: number | string): string => {
    const typeMap: { [key: number]: string } = {
      13: 'Cross Training',
      16: 'Functional Strength Training',
      35: 'High Intensity Interval Training',
      37: 'Running',
      52: 'Traditional Strength Training',
      80: 'Walking',
    };

    if (typeof activityType === 'number') {
      return typeMap[activityType] || `Activity ${activityType}`;
    }
    
    return activityType || 'Unknown Workout';
  };

  const calculateDuration = (startDate: string, endDate: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
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

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#D8FF3E" />
          <Text style={styles.loadingText}>Loading workout data...</Text>
        </View>
      );
    }

    if (!workoutStats) {
      return (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#FF6B6B" />
          <Text style={styles.errorText}>Failed to load workout data</Text>
        </View>
      );
    }

    if (!workoutStats.hasWorkout) {
      return <NoWorkoutMessage />;
    }

    return <DetailedWorkoutStats stats={workoutStats} />;
  };

  const NoWorkoutMessage = () => (
    <View style={styles.noWorkoutContainer}>
      <Ionicons name="fitness-outline" size={64} color="#D8FF3E" />
      <Text style={styles.noWorkoutTitle}>No Workout Tracked</Text>
      <Text style={styles.noWorkoutMessage}>
        To see detailed stats for this class, start a workout on your Apple Watch or iPhone during your next class.
      </Text>
      <View style={styles.tipContainer}>
        <Text style={styles.tipTitle}>💡 Tip:</Text>
        <Text style={styles.tipText}>
          Choose "Functional Strength Training" or "Cross Training" when starting your workout for the best results.
        </Text>
      </View>
    </View>
  );

  const DetailedWorkoutStats = ({ stats }: { stats: DetailedWorkoutStats }) => (
    <ScrollView style={styles.statsContainer}>
      {/* Workout Header */}
      <View style={styles.workoutHeader}>
        <Text style={styles.workoutName}>{stats.workout?.type}</Text>
        <Text style={styles.workoutDate}>{formatDateTime(workout.startDate)}</Text>
        <Text style={styles.workoutTime}>
          {formatTime(workout.startDate)} - {formatTime(workout.endDate)}
        </Text>
        <Text style={styles.workoutDuration}>
          Duration: {formatDuration(stats.duration || 0)}
        </Text>
      </View>

      {/* Heart Rate Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Heart Rate</Text>
        <View style={styles.heartRateGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.heartRate?.average || 0}</Text>
            <Text style={styles.statLabel}>Avg BPM</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.heartRate?.max || 0}</Text>
            <Text style={styles.statLabel}>Max BPM</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.heartRate?.min || 0}</Text>
            <Text style={styles.statLabel}>Min BPM</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.heartRate?.samples || 0}</Text>
            <Text style={styles.statLabel}>Readings</Text>
          </View>
        </View>

        {/* Heart Rate Zones */}
        {stats.heartRate?.zones && (
          <View style={styles.zonesContainer}>
            <Text style={styles.zonesTitle}>Heart Rate Zones</Text>
            <View style={styles.zonesGrid}>
              <View style={[styles.zoneItem, { backgroundColor: '#4CAF50' }]}>
                <Text style={styles.zonePercentage}>{stats.heartRate.zones.resting}%</Text>
                <Text style={styles.zoneLabel}>Resting</Text>
              </View>
              <View style={[styles.zoneItem, { backgroundColor: '#8BC34A' }]}>
                <Text style={styles.zonePercentage}>{stats.heartRate.zones.fatBurn}%</Text>
                <Text style={styles.zoneLabel}>Fat Burn</Text>
              </View>
              <View style={[styles.zoneItem, { backgroundColor: '#FF9800' }]}>
                <Text style={styles.zonePercentage}>{stats.heartRate.zones.cardio}%</Text>
                <Text style={styles.zoneLabel}>Cardio</Text>
              </View>
              <View style={[styles.zoneItem, { backgroundColor: '#F44336' }]}>
                <Text style={styles.zonePercentage}>{stats.heartRate.zones.peak}%</Text>
                <Text style={styles.zoneLabel}>Peak</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Energy Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Energy</Text>
        <View style={styles.energyGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.energy?.totalCalories || 0}</Text>
            <Text style={styles.statLabel}>Total Calories</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.energy?.averagePerMinute || 0}</Text>
            <Text style={styles.statLabel}>Cal/Min</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.energy?.peakBurningRate || 0}</Text>
            <Text style={styles.statLabel}>Peak Rate</Text>
          </View>
        </View>
      </View>

      {/* Activity Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Activity</Text>
        <View style={styles.activityGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.activity?.totalSteps?.toLocaleString() || '0'}</Text>
            <Text style={styles.statLabel}>Total Steps</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.activity?.averageStepsPerMinute || 0}</Text>
            <Text style={styles.statLabel}>Steps/Min</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.activity?.distance?.toFixed(2) || '0.00'}</Text>
            <Text style={styles.statLabel}>Distance (km)</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );

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

      {renderContent()}
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
  statsContainer: {
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
    marginBottom: 20,
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
    marginBottom: 4,
  },
  workoutDuration: {
    color: '#D8FF3E',
    fontSize: 14,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  heartRateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  energyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minWidth: (width - 64) / 3,
    flex: 1,
  },
  statValue: {
    color: '#D8FF3E',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
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
  errorContainer: {
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  noWorkoutContainer: {
    alignItems: 'center',
    padding: 40,
  },
  noWorkoutTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 12,
  },
  noWorkoutMessage: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  tipContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    width: '100%',
  },
  tipTitle: {
    color: '#D8FF3E',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  tipText: {
    color: '#888',
    fontSize: 14,
    lineHeight: 20,
  },
  zonesContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
  },
  zonesTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  zonesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  zoneItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 2,
  },
  zonePercentage: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  zoneLabel: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default WorkoutDetailScreen;