export interface LiveClass {
  classId: number;
  scheduledDate: string;
  scheduledTime: string;
  durationMinutes: number;
  coachId: number;
  workoutId: number;
  workoutName: string;
  workoutType: string;
}

export interface LiveClassResponse {
  ongoing: boolean;
  roles?: string[];
  class?: LiveClass;
  participants?: { userId: number }[];
}

export interface WorkoutStep {
  index: number;
  name: string;
  reps?: number;
  duration?: number;
  round: number;
  subround: number;
  target_reps?: number;
}

export interface WorkoutStepsResponse {
  steps: WorkoutStep[];
  stepsCumReps: number[];
  workoutType: string;
}

export interface SubmitScoreRequest {
  classId: number;
  score?: number;
  scores?: { userId: number; score: number }[];
}

export interface LeaderboardEntry {
  classId: number;
  memberId: number;
  score: number;
  markedAt: Date;
  firstName: string;
  lastName: string;
}

export interface LiveProgress {
  current_step: number;
  finished_at?: Date;
  dnf_partial_reps: number;
  rounds_completed: number;
}

export interface AdvanceProgressRequest {
  direction: 'next' | 'prev';
}

export interface SubmitPartialRequest {
  reps: number;
}

export interface IntervalScoreRequest {
  stepIndex: number;
  reps: number;
}

export interface RealtimeLeaderboardEntry {
  class_id: number;
  user_id: number;
  finished: boolean;
  elapsed_seconds?: number;
  total_reps?: number;
  sort_bucket: number;
  sort_key: number;
  completed_minutes?: number;
}

export interface IntervalLeaderboardEntry {
  user_id: number;
  total_reps: number;
  display_score: string;
  first_name: string;
  last_name: string;
}

export interface ClassSession {
  class_id: number;
  workout_id: number;
  status: string;
  time_cap_seconds: number;
  started_at: Date;
  ended_at?: Date;
  steps: WorkoutStep[];
  steps_cum_reps: number[];
}

export interface StartLiveClassRequest {
  restart?: boolean;
}

export interface StartLiveClassResponse {
  ok: boolean;
  restarted: boolean;
  session: ClassSession;
}
