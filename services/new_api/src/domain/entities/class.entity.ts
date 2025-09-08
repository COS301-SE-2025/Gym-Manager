export interface Class {
  classId: number;
  capacity: number;
  scheduledDate: string;
  scheduledTime: string;
  durationMinutes: number;
  coachId?: number;
  workoutId?: number;
  createdBy: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ClassWithWorkout extends Class {
  workoutName?: string;
  workoutType?: string;
  workoutMetadata?: any;  // if you’re selecting it already

  // new fields
  coachFirstName?: string;
  coachLastName?: string;
  bookingsCount: number; // not optional, since COUNT() always returns 0+
}


export interface ClassBooking {
  classId: number;
  memberId: number;
  bookedAt?: Date;
}

export interface ClassAttendance {
  classId: number;
  memberId: number;
  score?: number;
  markedAt?: Date;
}

export interface Workout {
  workoutId: number;
  workoutName: string;
  type: 'FOR_TIME' | 'AMRAP' | 'TABATA' | 'EMOM' | 'INTERVAL';
  metadata: Record<string, unknown>;
  createdBy?: number;
  createdAt?: Date;
}

export interface Exercise {
  exerciseId: number;
  name: string;
  description?: string;
}

export interface Round {
  roundId: number;
  workoutId: number;
  roundNumber: number;
}

export interface Subround {
  subroundId: number;
  roundId: number;
  subroundNumber: number;
}

export interface SubroundExercise {
  subroundExerciseId: number;
  subroundId: number;
  exerciseId?: number;
  exerciseName?: string;
  position: number;
  quantityType: 'reps' | 'duration';
  quantity: number;
  notes?: string;
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

export interface CreateClassRequest {
  capacity: number;
  scheduledDate: string;
  scheduledTime: string;
  durationMinutes: number;
  coachId?: number;
  workoutId?: number;
  createdBy: number;
}

export interface CreateWorkoutRequest {
  workoutName: string;
  type: 'FOR_TIME' | 'AMRAP' | 'TABATA' | 'EMOM' | 'INTERVAL';
  metadata: Record<string, unknown>;
  rounds: RoundInput[];
}

export interface RoundInput {
  roundNumber: number;
  subrounds: SubroundInput[];
}

export interface SubroundInput {
  subroundNumber: number;
  exercises: ExerciseInput[];
}

export interface ExerciseInput {
  exerciseId?: number;
  exerciseName?: string;
  position: number;
  quantityType: 'reps' | 'duration';
  quantity: number;
  notes?: string;
}

export interface BookClassRequest {
  classId: number;
  memberId: number;
}

export interface CheckInRequest {
  classId: number;
  memberId: number;
}

export interface AssignCoachRequest {
  classId: number;
  coachId: number;
}

export interface AssignWorkoutRequest {
  classId: number;
  workoutId: number;
}
