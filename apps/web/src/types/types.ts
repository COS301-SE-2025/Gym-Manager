export interface BaseUser {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface Member extends BaseUser {
  status: string;
  credits_balance: number;
}

export interface Admin extends BaseUser {
  authorisation: string;
}

export interface Coach extends BaseUser {
  bio: string;
}

export type User = Member | Admin | Coach;
export type UserRole = 'member' | 'coach' | 'admin' | 'manager';

export interface AuthUser {
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

export interface ClassScheduleItem {
  classId: number;
  scheduledDate: string;
  scheduledTime: string;
  durationMinutes: number;
  capacity: number;
  workoutName: string;
  coachName: string;
}

export interface WeeklyScheduleResponse {
  [date: string]: ClassScheduleItem[];
}

export interface CalendarEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  resource?: ClassScheduleItem;
}
