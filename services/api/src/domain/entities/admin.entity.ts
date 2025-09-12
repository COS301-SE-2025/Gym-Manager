export interface AdminUser {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  roles: string[];
  bio?: string;
  authorisation?: string;
  status?: string;
  creditsBalance?: number;
}

export interface Member {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  status: string;
  credits: number;
}

export interface Coach {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  bio: string;
}

export interface Admin {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  authorisation: string;
}

export interface AssignRoleRequest {
  userId: number;
  role: 'coach' | 'member' | 'admin' | 'manager';
}

export interface RemoveRoleRequest {
  userId: number;
  role: 'coach' | 'member' | 'admin' | 'manager';
}

export interface UpdateUserRequest {
  userId: number;
  updates: Partial<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    bio: string;
    authorisation: string;
    status: string;
    creditsBalance: number;
  }>;
}

export interface WeeklyScheduleRequest {
  startDate: string;
  createdBy: number;
  weeklySchedule: WeeklyScheduleInput;
}

export interface WeeklyScheduleInput {
  monday?: ClassSchedule[];
  tuesday?: ClassSchedule[];
  wednesday?: ClassSchedule[];
  thursday?: ClassSchedule[];
  friday?: ClassSchedule[];
  saturday?: ClassSchedule[];
  sunday?: ClassSchedule[];
}

export interface ClassSchedule {
  scheduledTime: string;
  durationMinutes: number;
  capacity: number;
  coachId?: number;
  workoutId?: number;
}
