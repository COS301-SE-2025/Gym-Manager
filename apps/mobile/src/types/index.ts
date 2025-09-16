export interface User {
  id: string;
  email: string;
  name: string;
  role: 'member' | 'admin' | 'coach';
}

export interface GymClass {
  id: string;
  name: string;
  instructor: string;
  startTime: Date;
  duration: number;
  capacity: number;
  enrolled: number;
}

// Analytics Types
export interface CoachAnalytics {
  averageAttendance: number;
  totalClasses: number;
  workoutPopularity: WorkoutPopularity[];
}

export interface WorkoutPopularity {
  workoutId: number;
  workoutName: string;
  classCount: number;
  averageAttendance: number;
}

export interface MemberAnalytics {
  averageLeaderboardPosition: number;
  totalClassesAttended: number;
  classPerformance: ClassPerformance[];
}

export interface ClassPerformance {
  classId: number;
  workoutName: string;
  scheduledDate: string;
  position: number;
  totalParticipants: number;
  score: number | null;
}
