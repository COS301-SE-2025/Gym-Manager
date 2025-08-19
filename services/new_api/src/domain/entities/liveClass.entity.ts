export type WorkoutType = 'FOR_TIME' | 'AMRAP' | 'INTERVAL' | 'TABATA' | 'EMOM';

export interface Step {
  index: number;
  name: string;
  reps?: number;
  duration?: number;
  round: number;
  subround: number;
  target_reps?: number;
}

export interface LiveSession {
  class_id: number;
  workout_id: number;
  status: 'live' | 'paused' | 'ended';
  time_cap_seconds: number | null;
  started_at: string | Date | null;
  ended_at: string | Date | null;
  paused_at: string | Date | null;
  pause_accum_seconds: number;
  started_at_s: number | null;
  ended_at_s: number | null;
  paused_at_s: number | null;
  steps: Step[];
  steps_cum_reps: number[];
  workout_type: WorkoutType | string;
}
