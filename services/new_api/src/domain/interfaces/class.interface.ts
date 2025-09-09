import {
  Class,
  ClassWithWorkout,
  ClassBooking,
  ClassAttendance,
  Workout,
  CreateClassRequest,
  CreateWorkoutRequest,
  BookClassRequest,
  CheckInRequest,
  AssignCoachRequest,
  AssignWorkoutRequest,
  WeeklyScheduleRequest,
  WeeklyScheduleInput
} from '../entities/class.entity';

export interface IClassService {
  getCoachAssignedClasses(coachId: number): Promise<Class[]>;
  getCoachClassesWithWorkouts(coachId: number): Promise<ClassWithWorkout[]>;
  assignWorkoutToClass(coachId: number, classId: number, workoutId: number): Promise<void>;
  createWorkout(workoutData: CreateWorkoutRequest): Promise<number>;
  getAllClasses(userId: number): Promise<ClassWithWorkout[]>;
  getMemberClasses(memberId: number): Promise<ClassWithWorkout[]>;
  bookClass(memberId: number, classId: number): Promise<void>;
  checkInToClass(classId: number, memberId: number): Promise<ClassAttendance>;
  cancelBooking(classId: number, memberId: number): Promise<void>;
}

export interface IClassRepository {
  findAssignedClassesByCoach(coachId: number): Promise<Class[]>;
  findAssignedClassesWithWorkoutsByCoach(coachId: number): Promise<ClassWithWorkout[]>;
  updateWorkoutForClass(classId: number, workoutId: number): Promise<void>;
  createWorkout(workoutData: Omit<Workout, 'workoutId'>, rounds: any[]): Promise<number>;
  getUpcomingClassesForMembers(condition: any): Promise<ClassWithWorkout[]>;
  getBookedClassesForMember(memberId: number, condition: any): Promise<ClassWithWorkout[]>;
  findClassByIdForUpdate(classId: number, tx?: any): Promise<Class | null>;
  alreadyBooked(classId: number, memberId: number, tx?: any): Promise<boolean>;
  countBookingsForClass(classId: number, tx?: any): Promise<number>;
  insertBooking(classId: number, memberId: number, tx?: any): Promise<void>;
  insertAttendance(classId: number, memberId: number): Promise<ClassAttendance | null>;
  deleteBooking(classId: number, memberId: number): Promise<any>;
  hasOverlappingBooking(
    memberId: number,
    window: { scheduledDate: string; scheduledTime: string; durationMinutes: number },
    tx?: any,
  ): Promise<boolean>;
}

export interface IAdminService {
  createWeeklySchedule(request: WeeklyScheduleRequest): Promise<any[]>;
  getWeeklySchedule(): Promise<any>;
  createClass(request: CreateClassRequest): Promise<Class>;
  assignCoachToClass(classId: number, coachId: number): Promise<{ ok: boolean; reason?: string }>;
  assignUserToRole(userId: number, role: string): Promise<{ ok: boolean; reason?: string }>;
  getAllMembers(): Promise<any[]>;
  getUsersByRole(role: string): Promise<any[]>;
  getAllUsers(): Promise<any[]>;
  removeRole(userId: number, role: string): Promise<void>;
  getRolesByUserId(userId: number): Promise<string[]>;
  getUserById(userId: number): Promise<any>;
  updateUserById(userId: number, updates: any): Promise<{ ok: boolean; reason?: string }>;
}

export interface IAdminRepository {
  createWeeklySchedule(startDate: string, createdBy: number, weeklySchedule: WeeklyScheduleInput): Promise<any[]>;
  getWeeklySchedule(): Promise<any>;
  createClass(payload: CreateClassRequest): Promise<Class>;
  assignCoachToClass(classId: number, coachId: number): Promise<{ ok: boolean; reason?: string }>;
  assignUserToRole(userId: number, role: string): Promise<{ ok: boolean; reason?: string }>;
  getAllMembers(): Promise<any[]>;
  getUsersByRole(role: string): Promise<any[]>;
  getAllUsers(): Promise<any[]>;
  removeRole(userId: number, role: string): Promise<void>;
  getRolesByUserId(userId: number): Promise<string[]>;
  getUserById(userId: number): Promise<any>;
  updateUserById(userId: number, updates: any): Promise<{ ok: boolean; reason?: string }>;
}
