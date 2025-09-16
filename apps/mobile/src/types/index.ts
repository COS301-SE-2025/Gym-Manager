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
  averageFillRate: number;
  attendanceTrends: AttendanceTrend[];
}

export interface AttendanceTrend {
  date: string;
  attendance: number;
  capacity: number;
  fillRate: number;
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
