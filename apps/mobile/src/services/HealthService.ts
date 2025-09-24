import { Platform, NativeModules } from 'react-native';

const { Constants } = require('react-native-health');

export interface WorkoutData {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  duration: number; // in minutes
  calories?: number;
  distance?: number;
  source: string;
}

export interface HeartRateData {
  value: number;
  startDate: string;
  endDate: string;
  source: string;
}

export interface DetailedWorkoutData extends WorkoutData {
  heartRateData: HeartRateData[];
  averageHeartRate?: number;
  maxHeartRate?: number;
  minHeartRate?: number;
  heartRateZones: {
    resting: number; // percentage of time
    fatBurn: number;
    cardio: number;
    peak: number;
  };
}

// Mock data for testing
const MOCK_WORKOUTS: WorkoutData[] = [
  {
    id: 'mock_1',
    type: 'HIIT Training',
    startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(),
    duration: 45,
    calories: 312,
    distance: 0,
    source: 'Mock Data',
  },
  {
    id: 'mock_2',
    type: 'Strength Training',
    startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
    duration: 60,
    calories: 285,
    distance: 0,
    source: 'Mock Data',
  },
  {
    id: 'mock_3',
    type: 'Running',
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
    duration: 30,
    calories: 245,
    distance: 5.2,
    source: 'Mock Data',
  },
];

const MOCK_HEART_RATE: HeartRateData[] = [
  { value: 145, startDate: new Date().toISOString(), endDate: new Date().toISOString(), source: 'Mock' },
  { value: 152, startDate: new Date().toISOString(), endDate: new Date().toISOString(), source: 'Mock' },
  { value: 138, startDate: new Date().toISOString(), endDate: new Date().toISOString(), source: 'Mock' },
  { value: 162, startDate: new Date().toISOString(), endDate: new Date().toISOString(), source: 'Mock' },
  { value: 149, startDate: new Date().toISOString(), endDate: new Date().toISOString(), source: 'Mock' },
];

class HealthService {
  private isInitialized = false;
  private platformSupported = false;
  
  constructor() {
    this.platformSupported = Platform.OS === 'ios';
  }

  /**
   * Initialize HealthKit (should already be done in App.tsx)
   */
  async initialize(): Promise<boolean> {
    if (!this.platformSupported) {
      console.log('HealthKit only available on iOS');
      return false;
    }

    try {
      const healthKit = NativeModules.RCTAppleHealthKit;
      if (!healthKit) {
        console.log('HealthKit not available');
        return false;
      }

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing HealthService:', error);
      return false;
    }
  }

  /**
   * Check if health data is available
   */
  async isHealthDataAvailable(): Promise<boolean> {
    return this.platformSupported && this.isInitialized;
  }

  /**
   * Get workouts that occurred during a specific time period
   * This is perfect for finding if a user tracked a workout during a gym class
   */
  async getWorkouts(startDate: Date, endDate: Date): Promise<WorkoutData[]> {
    if (!this.platformSupported) {
      console.log('Returning mock workouts for non-iOS platform');
      return MOCK_WORKOUTS.filter(w => {
        const workoutStart = new Date(w.startDate);
        return workoutStart >= startDate && workoutStart <= endDate;
      });
    }

    return new Promise((resolve, reject) => {
      const healthKit = NativeModules.RCTAppleHealthKit;
      if (!healthKit) {
        reject(new Error('HealthKit not available'));
        return;
      }

      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      console.log('Fetching workouts for period:', options);

      healthKit.getSamples({
        type: Constants.Activities.Running, // We'll need to query multiple types
        startDate: options.startDate,
        endDate: options.endDate,
      }, (error: string, results: any[]) => {
        if (error) {
          console.error('Error fetching workouts:', error);
          resolve([]); // Return empty array instead of rejecting
          return;
        }

        console.log('Workout results:', results);

        const workouts: WorkoutData[] = (results || []).map((workout: any) => ({
          id: workout.uuid || `workout_${Date.now()}`,
          type: this.mapWorkoutType(workout.activityType || workout.type),
          startDate: workout.startDate,
          endDate: workout.endDate,
          duration: this.calculateDuration(workout.startDate, workout.endDate),
          calories: workout.totalEnergyBurned || undefined,
          distance: workout.totalDistance || undefined,
          source: workout.sourceName || 'Apple Health',
        }));

        resolve(workouts);
      });
    });
  }

  /**
   * Get heart rate data for a specific time period
   */
  async getHeartRateData(startDate: Date, endDate: Date): Promise<HeartRateData[]> {
    if (!this.platformSupported) {
      console.log('Returning mock heart rate for non-iOS platform');
      return MOCK_HEART_RATE;
    }

    return new Promise((resolve, reject) => {
      const healthKit = NativeModules.RCTAppleHealthKit;
      if (!healthKit) {
        reject(new Error('HealthKit not available'));
        return;
      }

      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      console.log('Fetching heart rate for period:', options);

      healthKit.getHeartRateSamples(options, (error: string, results: any[]) => {
        if (error) {
          console.error('Error fetching heart rate:', error);
          resolve([]); // Return empty array instead of rejecting
          return;
        }

        console.log('Heart rate results:', results);

        const heartRateData: HeartRateData[] = (results || []).map((hr: any) => ({
          value: Math.round(hr.value),
          startDate: hr.startDate,
          endDate: hr.endDate || hr.startDate,
          source: hr.sourceName || 'Apple Health',
        }));

        resolve(heartRateData);
      });
    });
  }

  /**
   * Get detailed workout data including heart rate zones
   * This is what you'd call when a user taps on a class to see detailed stats
   */
  async getDetailedWorkoutData(classStartTime: Date, classEndTime: Date): Promise<DetailedWorkoutData | null> {
    try {
      // First, check if there's a workout session during the class time
      const workouts = await this.getWorkouts(classStartTime, classEndTime);
      
      // Get heart rate data for the entire class period (whether workout was tracked or not)
      const heartRateData = await this.getHeartRateData(classStartTime, classEndTime);

      // If there's a tracked workout, use its data; otherwise create a class-based workout
      const baseWorkout: WorkoutData = workouts.length > 0 ? workouts[0] : {
        id: `class_${classStartTime.getTime()}`,
        type: 'Gym Class',
        startDate: classStartTime.toISOString(),
        endDate: classEndTime.toISOString(),
        duration: this.calculateDuration(classStartTime.toISOString(), classEndTime.toISOString()),
        source: 'Class Attendance',
      };

      // Calculate heart rate statistics
      const hrValues = heartRateData.map(hr => hr.value);
      const averageHeartRate = hrValues.length > 0 ? Math.round(hrValues.reduce((a, b) => a + b, 0) / hrValues.length) : undefined;
      const maxHeartRate = hrValues.length > 0 ? Math.max(...hrValues) : undefined;
      const minHeartRate = hrValues.length > 0 ? Math.min(...hrValues) : undefined;

      // Calculate heart rate zones (simplified version)
      const heartRateZones = this.calculateHeartRateZones(heartRateData);

      const detailedWorkout: DetailedWorkoutData = {
        ...baseWorkout,
        heartRateData,
        averageHeartRate,
        maxHeartRate,
        minHeartRate,
        heartRateZones,
      };

      return detailedWorkout;
    } catch (error) {
      console.error('Error getting detailed workout data:', error);
      return null;
    }
  }

  /**
   * Helper method to map workout types to readable names
   */
  private mapWorkoutType(activityType: number | string): string {
    const typeMap: { [key: number]: string } = {
      13: 'Cross Training',
      16: 'Functional Strength Training',
      35: 'High Intensity Interval Training',
      37: 'Running',
      52: 'Traditional Strength Training',
      // Add more mappings as needed
    };

    if (typeof activityType === 'number') {
      return typeMap[activityType] || `Activity ${activityType}`;
    }
    
    return activityType || 'Unknown Workout';
  }

  /**
   * Calculate duration in minutes between two dates
   */
  private calculateDuration(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
  }

  /**
   * Calculate heart rate zones based on heart rate data
   * This is a simplified version - you might want to use user's age for more accurate zones
   */
  private calculateHeartRateZones(heartRateData: HeartRateData[]): {
    resting: number;
    fatBurn: number;
    cardio: number;
    peak: number;
  } {
    if (heartRateData.length === 0) {
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

    heartRateData.forEach(hr => {
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

    const total = heartRateData.length;
    return {
      resting: Math.round((zones.resting / total) * 100),
      fatBurn: Math.round((zones.fatBurn / total) * 100),
      cardio: Math.round((zones.cardio / total) * 100),
      peak: Math.round((zones.peak / total) * 100),
    };
  }
}

export default new HealthService();