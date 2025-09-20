import { Platform } from 'react-native';

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
  
  // Core methods to implement:
  async initialize(): Promise<boolean>
  async isHealthDataAvailable(): Promise<boolean>
  async requestPermissions(): Promise<boolean>
  async getWorkouts(startDate: Date, endDate: Date): Promise<WorkoutData[]>
  async getHeartRateData(startDate: Date, endDate: Date): Promise<HeartRateData[]>
  async getDetailedWorkoutData(workoutId: string): Promise<DetailedWorkoutData>
}

export default new HealthService();