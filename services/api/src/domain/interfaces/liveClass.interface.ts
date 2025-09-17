import { LiveSession, Step } from '../entities/liveClass.entity';

export interface ILiveClassService {
  getLiveSession(classId: number): Promise<LiveSession | null>;
  getFinalLeaderboard(classId: number): Promise<any>;
  getLiveClassForUser(userId: number, roles?: string[]): Promise<any>;
  getWorkoutSteps(workoutId: number): Promise<{ steps: Step[]; stepsCumReps: number[]; workoutType: string }>;
  submitScore(userId: number, roles: string[], body: any): Promise<any>;
  startLiveClass(classId: number): Promise<LiveSession | null>;
  stopLiveClass(classId: number): Promise<void>;
  pauseLiveClass(classId: number): Promise<void>;
  resumeLiveClass(classId: number): Promise<void>;
  advanceProgress(classId: number, userId: number, direction: 'next' | 'prev'): Promise<any>;
  submitPartial(classId: number, userId: number, reps: number): Promise<any>;
  getRealtimeLeaderboard(classId: number): Promise<any>;
  getMyProgress(classId: number, userId: number): Promise<any>;
  postIntervalScore(classId: number, userId: number, stepIndex: number, reps: number): Promise<void>;
  getIntervalLeaderboard(classId: number): Promise<any>;
}

export interface ILiveClassRepository {
  autoEndIfCapReached(classId: number): Promise<void>;
  getClassSession(classId: number): Promise<LiveSession | null>;

  getFinalLeaderboard(classId: number): Promise<any>;
  getLiveClassForCoach(userId: number): Promise<any>;
  getLiveClassForMember(userId: number): Promise<any>;

  getFlattenRowsForWorkout(workoutId: number): Promise<any[]>;
  getWorkoutType(workoutId: number): Promise<string | null>;

  getClassMeta(classId: number): Promise<any>;
  getWorkoutMetadata(workoutId: number): Promise<any>
  upsertClassSession(classId: number, workoutId: number, timeCapSeconds: number, steps: Step[], stepsCumReps: number[], workoutType: string, workoutMetadata: any): Promise<void>;
  seedLiveProgressForClass(classId: number): Promise<void>;
  resetLiveProgressForClass(classId: number): Promise<void>;
  stopSession(classId: number): Promise<void>;
  pauseSession(classId: number): Promise<void>;
  resumeSession(classId: number): Promise<void>;

  ensureProgressRow(classId: number, userId: number): Promise<void>;
  getAdvanceMeta(classId: number): Promise<any>;
  getElapsedSeconds(startedAt: any, pausedAt: any, pauseAccumSeconds: number): Promise<number>;
  advanceAmrap(classId: number, userId: number, stepCount: number, dir: number): Promise<any>;
  advanceForTime(classId: number, userId: number, dir: number): Promise<any>;
  setPartialReps(classId: number, userId: number, reps: number): Promise<void>;

  getWorkoutTypeByClass(classId: number): Promise<string | null>;
  realtimeIntervalLeaderboard(classId: number): Promise<any[]>;
  realtimeAmrapLeaderboard(classId: number): Promise<any[]>;
  realtimeForTimeLeaderboard(classId: number): Promise<any[]>;

  getMyProgress(classId: number, userId: number): Promise<any>;

  getSessionTypeAndSteps(classId: number): Promise<any>;
  assertMemberBooked(classId: number, userId: number): Promise<void>;
  upsertIntervalScore(classId: number, userId: number, stepIndex: number, reps: number): Promise<void>;
  intervalLeaderboard(classId: number): Promise<any[]>;

  assertCoachOwnsClass(classId: number, coachId: number): Promise<void>;
  upsertScoresBatch(classId: number, rows: { userId: number; score: number }[]): Promise<number>;
  upsertMemberScore(classId: number, userId: number, score: number): Promise<void>;

  realtimeEmomLeaderboard(classId: number): Promise<any[]>;

  getCoachNote(classId: number): Promise<any[]>;
  setCoachNote(classId: number, text: string): Promise<void>;
  setForTimeFinish(classId: number, userId: number, finishSeconds: number | null, startedAt: any): Promise<void>;
  setAmrapProgress(classId: number, userId: number, rounds: number, currentStep: number, partial: number): Promise<void>;
  upsertEmomMark(classId: number, userId: number, minuteIndex: number, finished: boolean, finishSeconds: number): Promise<void>;

}

export type { LiveSession, Step };
