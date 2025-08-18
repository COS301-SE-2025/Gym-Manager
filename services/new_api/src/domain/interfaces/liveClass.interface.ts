import {
  LiveClassResponse,
  WorkoutStepsResponse,
  SubmitScoreRequest,
  LeaderboardEntry,
  LiveProgress,
  AdvanceProgressRequest,
  SubmitPartialRequest,
  IntervalScoreRequest,
  RealtimeLeaderboardEntry,
  IntervalLeaderboardEntry,
  StartLiveClassRequest,
  StartLiveClassResponse
} from '../entities/liveClass.entity';

export interface ILiveClassService {
  getLeaderboard(classId: number): Promise<LeaderboardEntry[]>;
  getLiveClass(userId: number, roles: string[]): Promise<LiveClassResponse>;
  getWorkoutSteps(workoutId: number): Promise<WorkoutStepsResponse>;
  submitScore(userId: number, roles: string[], request: SubmitScoreRequest): Promise<{ success: boolean; updated?: number }>;
  startLiveClass(classId: number, request: StartLiveClassRequest): Promise<StartLiveClassResponse>;
  stopLiveClass(classId: number): Promise<{ ok: boolean; classId: number }>;
  advanceProgress(classId: number, userId: number, request: AdvanceProgressRequest): Promise<{ ok: boolean; current_step: number; finished: boolean }>;
  submitPartial(classId: number, userId: number, request: SubmitPartialRequest): Promise<{ ok: boolean; reps: number }>;
  getRealtimeLeaderboard(classId: number): Promise<RealtimeLeaderboardEntry[]>;
  getMyProgress(classId: number, userId: number): Promise<LiveProgress>;
  postIntervalScore(classId: number, userId: number, request: IntervalScoreRequest): Promise<{ ok: boolean }>;
  getIntervalLeaderboard(classId: number): Promise<IntervalLeaderboardEntry[]>;
}

export interface ILiveClassRepository {
  getLeaderboard(classId: number): Promise<LeaderboardEntry[]>;
  getLiveClassForCoach(userId: number): Promise<any>;
  getLiveClassForMember(userId: number): Promise<any>;
  getWorkoutSteps(workoutId: number): Promise<{ steps: any[]; stepsCumReps: number[]; workoutType: string }>;
  submitCoachScores(classId: number, scores: { userId: number; score: number }[]): Promise<void>;
  submitMemberScore(classId: number, memberId: number, score: number): Promise<void>;
  startLiveClass(classId: number, workoutId: number, steps: any[], stepsCumReps: number[], timeCapSeconds: number, restart: boolean): Promise<any>;
  stopLiveClass(classId: number): Promise<void>;
  advanceProgress(classId: number, userId: number, direction: number, workoutType: string, stepCount: number): Promise<{ current_step: number; finished_at?: Date }>;
  submitPartial(classId: number, userId: number, reps: number): Promise<void>;
  getRealtimeLeaderboard(classId: number): Promise<RealtimeLeaderboardEntry[]>;
  getMyProgress(classId: number, userId: number): Promise<LiveProgress>;
  postIntervalScore(classId: number, userId: number, stepIndex: number, reps: number): Promise<void>;
  getIntervalLeaderboard(classId: number): Promise<IntervalLeaderboardEntry[]>;
  ensureProgressRow(classId: number, userId: number): Promise<void>;
  validateIntervalWorkout(classId: number): Promise<{ type: string; steps: any[] }>;
  validateBooking(classId: number, userId: number): Promise<boolean>;
}
