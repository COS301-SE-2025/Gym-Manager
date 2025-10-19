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
  LayoutAnimation,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeModules, Platform } from 'react-native';
import WorkoutStepsDisplay from '../../components/WorkoutStepsDisplay';
import { useWorkoutSteps } from '../../hooks/useWorkoutSteps';

const { Constants } = require('react-native-health');
const { width } = Dimensions.get('window');
import { LineChart } from 'react-native-chart-kit';

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
  heartRateSamples?: HeartRateData[];
  energy?: EnergyStats;
  activity?: ActivityStats;
  duration?: number;
}

interface WorkoutDetailScreenProps {
  route: {
    params: {
      workout: WorkoutData & { workoutId?: number };
    };
  };
  navigation: any;
}

const WorkoutDetailScreen = ({ route, navigation }: WorkoutDetailScreenProps) => {
  const { workout } = route.params;
  const [workoutStats, setWorkoutStats] = useState<DetailedWorkoutStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [calculatedEffortLevel, setCalculatedEffortLevel] = useState<number | null>(null);
  const [isWorkoutExpanded, setIsWorkoutExpanded] = useState(false);

  // Use the workout steps hook
  const {
    steps: workoutSteps,
    loading: workoutLoading,
    error: workoutError,
  } = useWorkoutSteps(workout.workoutId || null);

  useEffect(() => {
    loadWorkoutData();
  }, []);

  // Calculate effort level based on heart rate zones and duration
  const calculateEffortLevel = (stats: DetailedWorkoutStats): number => {
    if (!stats.heartRate?.zones || !stats.workout?.duration) {
      return 1; // Default to very easy if no data
    }

    const zones = stats.heartRate.zones;
    const duration = stats.workout.duration; // in minutes

    // Calculate weighted effort score based on time spent in each zone
    const zoneWeights = {
      resting: 0.1, // Very light effort
      fatBurn: 0.3, // Light effort
      cardio: 0.7, // Moderate effort
      peak: 1.0, // High effort
    };

    // Calculate total time in each zone (assuming percentages of total duration)
    const totalZoneTime = zones.resting + zones.fatBurn + zones.cardio + zones.peak;

    if (totalZoneTime === 0) return 1;

    const restingTime = (zones.resting / totalZoneTime) * duration;
    const fatBurnTime = (zones.fatBurn / totalZoneTime) * duration;
    const cardioTime = (zones.cardio / totalZoneTime) * duration;
    const peakTime = (zones.peak / totalZoneTime) * duration;

    // Calculate weighted effort score
    const effortScore =
      restingTime * zoneWeights.resting +
      fatBurnTime * zoneWeights.fatBurn +
      cardioTime * zoneWeights.cardio +
      peakTime * zoneWeights.peak;

    // Normalize effort score to 1-5 scale based on duration
    const normalizedScore = effortScore / duration;

    // Map to effort levels (1-5)
    if (normalizedScore <= 0.2) return 1; // Very Easy
    if (normalizedScore <= 0.4) return 2; // Easy
    if (normalizedScore <= 0.6) return 3; // Moderate
    if (normalizedScore <= 0.8) return 4; // Hard
    return 5; // Very Hard
  };

  const loadWorkoutData = async () => {
    if (Platform.OS !== 'ios') {
      console.log('Workout tracking only available on iOS');
      setWorkoutStats({ hasWorkout: false });
      setIsLoading(false);
      return;
    }

    if (!workout) return;

    setIsLoading(true);
    console.log('Raw workout data:', {
      startDate: workout.startDate,
      endDate: workout.endDate,
      type: typeof workout.startDate,
    });
    let startDate: Date;
    let endDate: Date;

    try {
      // Fix: Handle SQL timestamp format from database
      let startDateString = workout.startDate;
      let endDateString = workout.endDate;

      // Convert SQL timestamp format to ISO format if needed
      if (
        typeof startDateString === 'string' &&
        startDateString.includes(' ') &&
        !startDateString.includes('T')
      ) {
        startDateString = startDateString.replace(' ', 'T') + 'Z';
      }
      if (
        typeof endDateString === 'string' &&
        endDateString.includes(' ') &&
        !endDateString.includes('T')
      ) {
        endDateString = endDateString.replace(' ', 'T') + 'Z';
      }

      startDate = new Date(startDateString);
      endDate = new Date(endDateString);

      // Add validation for date validity and range
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid date values');
      }

      // Check if dates are too far in the past (HealthKit limitation)
      const now = new Date();
      const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000); // 6 months ago

      if (startDate < sixMonthsAgo) {
        console.log('Workout date is too far in the past for HealthKit');
        setWorkoutStats({ hasWorkout: false });
        setIsLoading(false);
        return;
      }

      // Check if end date is before start date
      if (endDate <= startDate) {
        console.log('End date is before or equal to start date');
        setWorkoutStats({ hasWorkout: false });
        setIsLoading(false);
        return;
      }

      // Add a small buffer to the date range to ensure we capture the workout
      const bufferMinutes = 5; // 5 minutes buffer
      startDate = new Date(startDate.getTime() - bufferMinutes * 60 * 1000);
      endDate = new Date(endDate.getTime() + bufferMinutes * 60 * 1000);
    } catch (dateError) {
      console.error('Error parsing workout dates:', dateError);
      console.error('Start date:', workout.startDate);
      console.error('End date:', workout.endDate);
      setWorkoutStats({ hasWorkout: false });
      setIsLoading(false);
      return;
    }

    try {
      const healthKit = NativeModules.RCTAppleHealthKit;
      if (!healthKit) {
        console.log('HealthKit not available');
        setWorkoutStats({ hasWorkout: false });
        setIsLoading(false);
        return;
      }

      console.log('Loading workout data for period:', {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      });
      const workoutSessions = await getWorkoutSessions(healthKit, startDate, endDate);

      if (workoutSessions.length === 0) {
        setWorkoutStats({ hasWorkout: false });
        setIsLoading(false);
        return;
      }
      const trackedWorkout = workoutSessions[0];
      const detailedStats = await getDetailedWorkoutStats(healthKit, trackedWorkout);
      const fullStats = { hasWorkout: true, ...detailedStats };
      setWorkoutStats(fullStats);

      // Calculate effort level based on heart rate data
      const effortLevel = calculateEffortLevel(fullStats);
      setCalculatedEffortLevel(effortLevel);
      console.log('Calculated effort level:', effortLevel);
    } catch (error) {
      console.error('Error loading workout data:', error);
      setWorkoutStats({ hasWorkout: false });
    } finally {
      setIsLoading(false);
    }
  };

  const getWorkoutSessions = async (
    healthKit: any,
    startDate: Date,
    endDate: Date,
  ): Promise<WorkoutSession[]> => {
    return new Promise((resolve) => {
      console.log('=== getWorkoutSessions START ===');
      console.log('Start Date:', startDate.toISOString());
      console.log('End Date:', endDate.toISOString());

      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        includeManuallyAdded: false, // Only get automatic workout data
      };

      console.log('Options being sent to HealthKit:', options);
      const workoutTypes = [
        Constants.Activities.FunctionalStrengthTraining,
        Constants.Activities.HighIntensityIntervalTraining,
        Constants.Activities.CrossTraining,
        Constants.Activities.TraditionalStrengthTraining,
        Constants.Activities.Running,
        Constants.Activities.Walking,
      ];

      console.log('Workout types being queried:', workoutTypes);

      let completedRequests = 0;
      const allWorkouts: WorkoutSession[] = [];

      workoutTypes.forEach((workoutType, index) => {
        console.log(
          `\n--- Querying workout type ${index + 1}/${workoutTypes.length}: ${workoutType} ---`,
        );
        healthKit.getSamples(
          {
            type: workoutType,
            startDate: options.startDate,
            endDate: options.endDate,
            includeManuallyAdded: options.includeManuallyAdded,
          },
          (error: string, results: any[]) => {
            completedRequests++;

            console.log(`\n--- Response for workout type ${workoutType} ---`);
            console.log('Error:', error);
            console.log('Results:', results);
            console.log('Results length:', results ? results.length : 'null/undefined');

            // Fix: Handle error object properly
            if (error) {
              const errorMessage =
                typeof error === 'string'
                  ? error
                  : (error as any)?.message || JSON.stringify(error);

              if (
                errorMessage.includes('date out of range') ||
                errorMessage.includes('out of range')
              ) {
                console.log('Date out of range error - this workout may be too old for HealthKit');
              } else if (
                errorMessage.includes('permission') ||
                errorMessage.includes('authorization')
              ) {
                console.log('Permission error - HealthKit permissions may not be granted');
              } else {
                console.log('Other HealthKit error:', errorMessage);
              }
            }

            if (!error && results && results.length > 0) {
              console.log('Processing workout results...');
              const workouts: WorkoutSession[] = results.map(
                (workout: any, workoutIndex: number) => {
                  console.log(`\nWorkout ${workoutIndex + 1}:`, {
                    id: workout.id,
                    activityType: workout.activityType,
                    type: workout.type,
                    start: workout.start, // These are the actual property names
                    end: workout.end, // from HealthKit API
                    startDate: workout.startDate, // These might be undefined
                    endDate: workout.endDate, // These might be undefined
                    totalEnergyBurned: workout.totalEnergyBurned,
                    totalDistance: workout.totalDistance,
                    metadata: workout.metadata,
                  });

                  // Fix: Use the correct property names from HealthKit API
                  const startDate = workout.startDate || workout.start;
                  const endDate = workout.endDate || workout.end;

                  return {
                    id: workout.id || `workout_${Date.now()}_${workoutIndex}`,
                    type: mapWorkoutType(workout.activityType || workout.type),
                    startDate: startDate,
                    endDate: endDate,
                    duration: startDate && endDate ? calculateDuration(startDate, endDate) : 0,
                    totalEnergyBurned: workout.totalEnergyBurned,
                    totalDistance: workout.totalDistance || workout.distance, // Also check 'distance' property
                    source: workout.metadata?.HKWasUserEntered ? 'User Entered' : 'Apple Health',
                  };
                },
              );

              console.log('Mapped workouts:', workouts);
              allWorkouts.push(...workouts);
            } else {
              console.log('No workouts found for this type');
            }

            console.log(`Completed requests: ${completedRequests}/${workoutTypes.length}`);
            console.log(`Total workouts found so far: ${allWorkouts.length}`);

            // When all requests are complete, resolve with unique workouts
            if (completedRequests === workoutTypes.length) {
              console.log('\n=== ALL REQUESTS COMPLETE ===');
              console.log('All workouts found:', allWorkouts);

              // Remove duplicates and resolve
              const uniqueWorkouts = allWorkouts.filter(
                (workout, index, self) => index === self.findIndex((w) => w.id === workout.id),
              );

              console.log('Unique workouts after deduplication:', uniqueWorkouts);
              console.log('=== getWorkoutSessions END ===\n');

              resolve(uniqueWorkouts);
            }
          },
        );
      });
    });
  };

  const getDetailedWorkoutStats = async (
    healthKit: any,
    workout: WorkoutSession,
  ): Promise<Omit<DetailedWorkoutStats, 'hasWorkout'>> => {
    console.log('\n=== getDetailedWorkoutStats START ===');
    console.log('Workout session:', workout);

    // Fix: Handle undefined dates
    if (!workout.startDate || !workout.endDate) {
      console.log('Workout missing start or end date, returning default stats');
      return {
        workout: workout,
        duration: workout.duration || 0,
        heartRate: {
          average: 0,
          max: 0,
          min: 0,
          zones: {
            resting: 0,
            fatBurn: 0,
            cardio: 0,
            peak: 0,
          },
          samples: 0,
        },
        heartRateSamples: [],
        energy: {
          totalCalories: 0,
          averagePerMinute: 0,
          peakBurningRate: 0,
        },
        activity: {
          totalSteps: 0,
          averageStepsPerMinute: 0,
          distance: workout.totalDistance || 0,
        },
      };
    }

    const startDate = new Date(workout.startDate);
    const endDate = new Date(workout.endDate);

    // Additional validation for parsed dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.log('Invalid dates after parsing, returning default stats');
      return {
        workout: workout,
        duration: workout.duration || 0,
        heartRate: {
          average: 0,
          max: 0,
          min: 0,
          zones: {
            resting: 0,
            fatBurn: 0,
            cardio: 0,
            peak: 0,
          },
          samples: 0,
        },
        heartRateSamples: [],
        energy: {
          totalCalories: 0,
          averagePerMinute: 0,
          peakBurningRate: 0,
        },
        activity: {
          totalSteps: 0,
          averageStepsPerMinute: 0,
          distance: workout.totalDistance || 0,
        },
      };
    }

    console.log('Parsed dates:', {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    });

    // Get all sample data during the workout
    console.log('Fetching heart rate samples...');
    const heartRateSamples = await getHeartRateSamples(healthKit, startDate, endDate);
    console.log('Heart rate samples:', heartRateSamples);

    console.log('Fetching step samples...');
    const stepSamples = await getStepCountSamples(healthKit, startDate, endDate);
    console.log('Step samples:', stepSamples);

    console.log('Fetching energy samples...');
    const energySamples = await getActiveEnergySamples(healthKit, startDate, endDate);
    console.log('Energy samples:', energySamples);

    const result = calculateDetailedStats(workout, heartRateSamples, stepSamples, energySamples);
    console.log('Calculated detailed stats:', result);
    console.log('=== getDetailedWorkoutStats END ===\n');

    return result;
  };

  const getHeartRateSamples = async (
    healthKit: any,
    startDate: Date,
    endDate: Date,
  ): Promise<HeartRateData[]> => {
    return new Promise((resolve) => {
      console.log('\n--- getHeartRateSamples START ---');
      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        includeManuallyAdded: false,
      };

      console.log('Heart rate options:', options);

      healthKit.getHeartRateSamples(options, (error: string, results: any[]) => {
        console.log('Heart rate error:', error);
        console.log('Heart rate results:', results);
        console.log('Heart rate results length:', results ? results.length : 'null/undefined');

        if (error) {
          console.log('Error getting heart rate samples:', error);
          resolve([]);
          return;
        }

        const samples: HeartRateData[] = (results || []).map((hr: any, index: number) => {
          console.log(`Heart rate sample ${index + 1}:`, {
            value: hr.value,
            startDate: hr.startDate,
            endDate: hr.endDate,
            sourceName: hr.sourceName,
          });

          return {
            value: Math.round(hr.value),
            startDate: hr.startDate,
            endDate: hr.endDate || hr.startDate,
            source: hr.sourceName || 'Apple Health',
          };
        });

        console.log('Mapped heart rate samples:', samples);
        console.log('--- getHeartRateSamples END ---\n');
        resolve(samples);
      });
    });
  };

  const getStepCountSamples = async (
    healthKit: any,
    startDate: Date,
    endDate: Date,
  ): Promise<any[]> => {
    return new Promise((resolve) => {
      console.log('\n--- getStepCountSamples START ---');
      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        includeManuallyAdded: false,
      };

      console.log('Step count options:', options);
      healthKit.getStepCount(options, (error: string, results: any) => {
        console.log('Step count error:', error);
        console.log('Step count results:', results);

        if (error) {
          console.log('Error getting step count:', error);
          resolve([]);
          return;
        }
        const stepData = results
          ? [
              {
                id: `step_${Date.now()}`,
                value: results.value || 0,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                metadata: results.metadata || {},
              },
            ]
          : [];

        console.log('Mapped step data:', stepData);
        console.log('--- getStepCountSamples END ---\n');
        resolve(stepData);
      });
    });
  };

  const getActiveEnergySamples = async (
    healthKit: any,
    startDate: Date,
    endDate: Date,
  ): Promise<any[]> => {
    return new Promise((resolve) => {
      console.log('\n--- getActiveEnergySamples START ---');
      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        includeManuallyAdded: false,
      };

      console.log('Energy options:', options);
      healthKit.getActiveEnergyBurned(options, (error: string, results: any) => {
        console.log('Energy error:', error);
        console.log('Energy results:', results);

        if (error) {
          console.log('Error getting active energy:', error);
          resolve([]);
          return;
        }
        // HealthKit returns an array of energy samples, process them correctly
        const energyData =
          results && Array.isArray(results) && results.length > 0
            ? results.map((sample: any, index: number) => ({
                id: `energy_${Date.now()}_${index}`,
                value: sample.value || 0,
                startDate: sample.startDate || startDate.toISOString(),
                endDate: sample.endDate || endDate.toISOString(),
                metadata: sample.metadata || {},
              }))
            : [];

        console.log('Mapped energy data:', energyData);
        console.log('--- getActiveEnergySamples END ---\n');
        resolve(energyData);
      });
    });
  };

  const calculateDetailedStats = (
    workout: WorkoutSession,
    hrSamples: HeartRateData[],
    stepSamples: any[],
    energySamples: any[],
  ) => {
    // Heart Rate Analysis
    const heartRateStats: HeartRateStats = {
      average:
        hrSamples.length > 0
          ? Math.round(hrSamples.reduce((sum, hr) => sum + hr.value, 0) / hrSamples.length)
          : 0,
      max: hrSamples.length > 0 ? Math.max(...hrSamples.map((hr) => hr.value)) : 0,
      min: hrSamples.length > 0 ? Math.min(...hrSamples.map((hr) => hr.value)) : 0,
      zones: calculateHeartRateZones(hrSamples),
      samples: hrSamples.length,
    };

    // Energy Analysis
    const totalEnergy = energySamples.reduce((sum, energy) => sum + (energy.value || 0), 0);
    const energyStats: EnergyStats = {
      totalCalories: Math.round(totalEnergy * 100) / 100, // Round to 2 decimal places
      averagePerMinute:
        workout.duration > 0 ? Math.round((totalEnergy / workout.duration) * 100) / 100 : 0, // Round to 2 decimal places
      peakBurningRate:
        energySamples.length > 0
          ? Math.round(Math.max(...energySamples.map((e) => e.value || 0)) * 100) / 100
          : 0, // Round to 2 decimal places
    };

    // Activity Analysis
    const totalSteps = stepSamples.reduce((sum, step) => sum + (step.value || 0), 0);
    const activityStats: ActivityStats = {
      totalSteps: Math.round(totalSteps),
      averageStepsPerMinute: workout.duration > 0 ? Math.round(totalSteps / workout.duration) : 0,
      distance: workout.totalDistance || 0,
    };

    return {
      workout,
      heartRate: heartRateStats,
      heartRateSamples: hrSamples,
      energy: energyStats,
      activity: activityStats,
      duration: workout.duration,
    };
  };

  const calculateHeartRateZones = (
    hrSamples: HeartRateData[],
  ): { resting: number; fatBurn: number; cardio: number; peak: number } => {
    if (hrSamples.length === 0) {
      return { resting: 0, fatBurn: 0, cardio: 0, peak: 0 };
    }

    // Assuming max HR = 220 - age (we'll use 190 as average for gym members)
    const estimatedMaxHR = 190;

    const zones = {
      resting: 0, // < 50% max HR
      fatBurn: 0, // 50-60% max HR
      cardio: 0, // 60-70% max HR
      peak: 0, // > 70% max HR
    };

    hrSamples.forEach((hr) => {
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

  const calculateDuration = (
    startDate: string | undefined,
    endDate: string | undefined,
  ): number => {
    if (!startDate || !endDate) return 0;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

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
    // Android compatibility check
    if (Platform.OS === 'android') {
      return (
        <View style={styles.androidMessageContainer}>
          <View style={styles.androidMessageCard}>
            <Ionicons name="phone-portrait-outline" size={48} color="#D8FF3E" />
            <Text style={styles.androidMessageTitle}>Workout Details Unavailable</Text>
            <Text style={styles.androidMessageText}>
              Detailed workout analytics are currently only available on iOS devices. Android
              support is coming soon!
            </Text>
            <View style={styles.androidMessageFooter}>
              <Ionicons name="information-circle-outline" size={16} color="#888" />
              <Text style={styles.androidMessageFooterText}>
                iOS users can view heart rate graphs, effort levels, and detailed metrics
              </Text>
            </View>
          </View>
        </View>
      );
    }

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
        To see detailed stats for this class, start a workout on your Apple Watch or iPhone during
        your next class.
      </Text>
      <View style={styles.tipContainer}>
        <Text style={styles.tipTitle}>💡 Tip:</Text>
        <Text style={styles.tipText}>
          Choose "Functional Strength Training" or "Cross Training" when starting your workout for
          the best results.
        </Text>
      </View>
    </View>
  );

  const HeartRateGraph = ({ heartRateSamples }: { heartRateSamples: HeartRateData[] }) => {
    if (heartRateSamples.length === 0) {
      return (
        <View style={styles.graphContainer}>
          <Text style={styles.graphTitle}>Heart Rate During Workout</Text>
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No heart rate data available</Text>
          </View>
        </View>
      );
    }

    // Sort heart rate samples in chronological order (earliest to latest)
    const sortedSamples = [...heartRateSamples].sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );

    // Convert heart rate samples to chart data
    const chartData = {
      labels: sortedSamples.map((sample, index) => {
        const totalSamples = sortedSamples.length;
        // Show labels only at beginning, middle, and end
        if (index === 0) {
          const date = new Date(sample.startDate);
          return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          });
        } else if (index === Math.floor(totalSamples / 2)) {
          const date = new Date(sample.startDate);
          return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          });
        } else if (index === totalSamples - 1) {
          const date = new Date(sample.startDate);
          return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          });
        }
        return '';
      }),
      datasets: [
        {
          data: sortedSamples.map((hr) => hr.value),
          color: (opacity = 1) => `rgba(216, 255, 62, ${opacity})`, // App color
          strokeWidth: 2,
        },
      ],
    };

    const chartConfig = {
      backgroundColor: '#2a2a2a',
      backgroundGradientFrom: '#2a2a2a',
      backgroundGradientTo: '#2a2a2a',
      decimalPlaces: 0,
      color: (opacity = 1) => `rgba(216, 255, 62, ${opacity})`,
      labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`, // Restore white labels
      style: {
        borderRadius: 16,
      },
      propsForDots: {
        r: '3',
        strokeWidth: '2',
        stroke: '#D8FF3E',
      },
      propsForBackgroundLines: {
        strokeDasharray: '5,5',
        stroke: 'rgba(255, 255, 255, 0.1)',
      },
      withHorizontalLabels: true, // Show x-axis labels (beginning, middle, end)
      withVerticalLabels: true, // Show y-axis labels (heart rate values)
      withInnerLines: true, // Keep grid lines
      withOuterLines: false, // Remove outer border lines
    };

    return (
      <View style={styles.graphContainer}>
        <Text style={styles.graphTitle}>Heart Rate During Workout</Text>
        <View style={styles.chartWrapper}>
          <LineChart
            data={chartData}
            width={width - 40} // Account for padding
            height={200}
            chartConfig={chartConfig}
            bezier // Smooth curves
            style={styles.chart}
          />
        </View>
        <View style={styles.graphStats}>
          <Text style={styles.graphStatText}>
            Min: {Math.min(...heartRateSamples.map((hr) => hr.value))} BPM
          </Text>
          <Text style={styles.graphStatText}>
            Max: {Math.max(...heartRateSamples.map((hr) => hr.value))} BPM
          </Text>
          <Text style={styles.graphStatText}>Samples: {heartRateSamples.length}</Text>
        </View>
      </View>
    );
  };
  const WorkoutStructureSection = () => {
    const toggleExpanded = () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsWorkoutExpanded(!isWorkoutExpanded);
    };

    return (
      <View style={styles.workoutSection}>
        <TouchableOpacity style={styles.workoutHeader} onPress={toggleExpanded}>
          <Text style={styles.workoutSectionTitle}>Workout Structure</Text>
          <Ionicons
            name={isWorkoutExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#D8FF3E"
          />
        </TouchableOpacity>

        {isWorkoutExpanded && (
          <View style={styles.workoutContent}>
            <WorkoutStepsDisplay
              steps={workoutSteps}
              loading={workoutLoading}
              error={workoutError}
            />
          </View>
        )}
      </View>
    );
  };

  const EffortLevelGraph = ({ calculatedLevel }: { calculatedLevel: number | null }) => {
    const effortLevels = [
      { level: 1, label: 'Very Easy' },
      { level: 2, label: 'Easy' },
      { level: 3, label: 'Moderate' },
      { level: 4, label: 'Hard' },
      { level: 5, label: 'Very Hard' },
    ];

    const getBarHeight = (level: number) => {
      return 20 + level * 12; // More subtle height progression
    };

    return (
      <View style={styles.effortContainer}>
        {/* Visual Bars */}
        <View style={styles.effortBarsContainer}>
          {effortLevels.map((effort) => (
            <View key={effort.level} style={styles.effortBarWrapper}>
              <View
                style={[
                  styles.effortBar,
                  {
                    height: getBarHeight(effort.level),
                    backgroundColor:
                      calculatedLevel === effort.level ? '#D8FF3E' : 'rgba(255, 255, 255, 0.4)',
                  },
                ]}
              />
              <View style={styles.effortDot} />
            </View>
          ))}
        </View>

        {/* Calculated Effort Display */}
        {calculatedLevel && (
          <View style={styles.selectedEffortContainer}>
            <View style={styles.selectedEffortBadge}>
              <Text style={styles.selectedEffortNumber}>{calculatedLevel}</Text>
            </View>
            <Text style={styles.selectedEffortLabel}>
              {effortLevels.find((e) => e.level === calculatedLevel)?.label || 'Unknown'}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const DetailedWorkoutStats = ({ stats }: { stats: DetailedWorkoutStats }) => (
    <ScrollView style={styles.statsContainer}>
      {/* Workout Header */}
      <View style={styles.workoutHeaderCard}>
        <Text style={styles.workoutName}>{workout.type}</Text>
        <Text style={styles.workoutDate}>{formatDateTime(workout.startDate)}</Text>
        <Text style={styles.workoutTime}>
          {formatTime(workout.startDate)} - {formatTime(workout.endDate)}
        </Text>
        <Text style={styles.workoutDuration}>Duration: {formatDuration(stats.duration || 0)}</Text>
      </View>

      {/* Workout Structure Section */}
      <WorkoutStructureSection />

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

        <HeartRateGraph heartRateSamples={stats.heartRateSamples || []} />

        {/* Heart Rate Zones */}
        {stats.heartRate?.zones && (
          <View style={styles.zonesContainer}>
            <Text style={styles.zonesTitle}>Heart Rate Zones</Text>
            <View style={styles.zonesGrid}>
              <View
                style={[
                  styles.zoneItem,
                  {
                    backgroundColor: `rgba(216, 255, 62, ${getZoneOpacity(stats.heartRate.zones.resting, stats.heartRate.zones)})`,
                  },
                ]}
              >
                <Text style={styles.zonePercentage}>{stats.heartRate.zones.resting}%</Text>
                <Text style={styles.zoneLabel}>Resting</Text>
              </View>
              <View
                style={[
                  styles.zoneItem,
                  {
                    backgroundColor: `rgba(216, 255, 62, ${getZoneOpacity(stats.heartRate.zones.fatBurn, stats.heartRate.zones)})`,
                  },
                ]}
              >
                <Text style={styles.zonePercentage}>{stats.heartRate.zones.fatBurn}%</Text>
                <Text style={styles.zoneLabel}>Fat Burn</Text>
              </View>
              <View
                style={[
                  styles.zoneItem,
                  {
                    backgroundColor: `rgba(216, 255, 62, ${getZoneOpacity(stats.heartRate.zones.cardio, stats.heartRate.zones)})`,
                  },
                ]}
              >
                <Text style={styles.zonePercentage}>{stats.heartRate.zones.cardio}%</Text>
                <Text style={styles.zoneLabel}>Cardio</Text>
              </View>
              <View
                style={[
                  styles.zoneItem,
                  {
                    backgroundColor: `rgba(216, 255, 62, ${getZoneOpacity(stats.heartRate.zones.peak, stats.heartRate.zones)})`,
                  },
                ]}
              >
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
            <Text style={styles.statValue}>{(stats.energy?.totalCalories || 0).toFixed(2)}</Text>
            <Text style={styles.statLabel}>Total Calories</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{(stats.energy?.averagePerMinute || 0).toFixed(2)}</Text>
            <Text style={styles.statLabel}>Cal/Min</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{(stats.energy?.peakBurningRate || 0).toFixed(2)}</Text>
            <Text style={styles.statLabel}>Peak Rate</Text>
          </View>
        </View>
      </View>

      {/* Activity Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Activity</Text>
        <View style={styles.activityGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {stats.activity?.totalSteps?.toLocaleString() || '0'}
            </Text>
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

      {/* Effort Level Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Effort Level</Text>
        <EffortLevelGraph calculatedLevel={calculatedEffortLevel} />
      </View>
    </ScrollView>
  );

  const getZoneOpacity = (
    zonePercentage: number,
    allZones: { resting: number; fatBurn: number; cardio: number; peak: number },
  ): number => {
    const maxPercentage = Math.max(
      allZones.resting,
      allZones.fatBurn,
      allZones.cardio,
      allZones.peak,
    );
    if (zonePercentage === maxPercentage) {
      return 1.0;
    }
    const opacity = Math.max(0.2, zonePercentage / maxPercentage);
    return opacity;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
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
  workoutHeaderCard: {
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
    marginTop: 10,
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
    borderWidth: 1,
    borderColor: 'rgba(216, 255, 62, 0.3)',
  },
  zonePercentage: {
    color: 'black',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  zoneLabel: {
    color: 'black',
    fontSize: 12,
    fontWeight: '500',
  },
  graphContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  graphTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  chartWrapper: {
    alignItems: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  graphStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  graphStatText: {
    color: '#D8FF3E',
    fontSize: 12,
    fontWeight: '500',
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noDataText: {
    color: '#888',
    fontSize: 14,
  },
  // Effort Level Styles - Apple Watch Design
  effortContainer: {
    backgroundColor: 'transparent',
    alignItems: 'center',
    paddingVertical: 20,
  },
  effortBarsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    height: 100,
    marginBottom: 30,
    gap: 20,
  },
  effortBarWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
    maxWidth: 40,
  },
  effortBar: {
    width: 55,
    borderRadius: 12.5,
    marginBottom: 12,
  },
  effortDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  selectedEffortContainer: {
    backgroundColor: 'rgba(216, 255, 62, 0.15)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(216, 255, 62, 0.3)',
  },
  selectedEffortBadge: {
    backgroundColor: '#D8FF3E',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  selectedEffortNumber: {
    color: '#1a1a1a',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedEffortLabel: {
    color: '#D8FF3E',
    fontSize: 16,
    fontWeight: '500',
  },
  // Android compatibility styles
  androidMessageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  androidMessageCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    maxWidth: 350,
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  androidMessageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#D8FF3E',
    marginTop: 20,
    marginBottom: 16,
    textAlign: 'center',
  },
  androidMessageText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  androidMessageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  androidMessageFooterText: {
    fontSize: 14,
    color: '#888',
    marginLeft: 8,
    flex: 1,
  },
  // Workout Structure Section Styles
  workoutSection: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3a',
  },
  workoutSectionTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  workoutContent: {
    padding: 16,
  },
});

export default WorkoutDetailScreen;
