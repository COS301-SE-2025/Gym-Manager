import { ILiveClassService, ILiveClassRepository } from '../../domain/interfaces/liveClass.interface';
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
} from '../../domain/entities/liveClass.entity';
import { LiveClassRepository } from '../../repositories/liveClass/liveClassRepository';

/**
 * LiveClassService - Business Layer
 * Contains all business logic for live class operations
 */
export class LiveClassService implements ILiveClassService {
  private liveClassRepository: ILiveClassRepository;

  constructor(liveClassRepository?: ILiveClassRepository) {
    this.liveClassRepository = liveClassRepository || new LiveClassRepository();
  }

  async getLeaderboard(classId: number): Promise<LeaderboardEntry[]> {
    if (!classId) {
      throw new Error('classId is required');
    }

    return this.liveClassRepository.getLeaderboard(classId);
  }

  async getLiveClass(userId: number, roles: string[]): Promise<LiveClassResponse> {
    // Coach perspective
    if (roles.includes('coach')) {
      const currentCoach = await this.liveClassRepository.getLiveClassForCoach(userId);
      if (currentCoach.length) {
        const participants = await this.liveClassRepository.getParticipants(currentCoach[0].classId);
        return {
          ongoing: true,
          roles,
          class: currentCoach[0],
          participants,
        };
      }
    }

    // Member perspective
    if (roles.includes('member')) {
      const currentMember = await this.liveClassRepository.getLiveClassForMember(userId);
      if (currentMember.length) {
        return {
          ongoing: true,
          roles,
          class: currentMember[0],
        };
      }
    }

    return { ongoing: false };
  }

  async getWorkoutSteps(workoutId: number): Promise<WorkoutStepsResponse> {
    if (!workoutId) {
      throw new Error('INVALID_WORKOUT_ID');
    }

    return this.liveClassRepository.getWorkoutSteps(workoutId);
  }

  async submitScore(userId: number, roles: string[], request: SubmitScoreRequest): Promise<{ success: boolean; updated?: number }> {
    const { classId } = request;

    if (!classId || typeof classId !== 'number') {
      throw new Error('CLASS_ID_REQUIRED');
    }

    // Coach submitting multiple scores for a class
    if (roles.includes('coach') && Array.isArray(request.scores)) {
      // Verify this coach is assigned to that class
      const isClassCoach = await this.liveClassRepository.validateClassCoach(classId, userId);
      if (!isClassCoach) {
        throw new Error('NOT_CLASS_COACH');
      }

      const scores = request.scores as { userId: number; score: number }[];
      const validScores = scores.filter(row => 
        typeof row.userId === 'number' && 
        typeof row.score === 'number' && 
        row.score >= 0
      );

      await this.liveClassRepository.submitCoachScores(classId, validScores);
      return { success: true, updated: validScores.length };
    }

    // Member submitting own score
    if (!roles.includes('member')) {
      throw new Error('ROLE_NOT_ALLOWED');
    }

    const { score } = request;
    if (typeof score !== 'number' || score < 0) {
      throw new Error('SCORE_REQUIRED');
    }

    // Member must be booked in class
    const isBooked = await this.liveClassRepository.validateBooking(classId, userId);
    if (!isBooked) {
      throw new Error('NOT_BOOKED');
    }

    // Upsert member's own score
    await this.liveClassRepository.submitMemberScore(classId, userId, score);
    return { success: true };
  }

  async startLiveClass(classId: number, request: StartLiveClassRequest): Promise<StartLiveClassResponse> {
    if (!Number.isFinite(classId)) {
      throw new Error('INVALID_CLASS_ID');
    }

    const classInfo = await this.liveClassRepository.getClassInfo(classId);
    if (!classInfo) {
      throw new Error('CLASS_NOT_FOUND');
    }

    if (!classInfo.workout_id) {
      throw new Error('WORKOUT_NOT_ASSIGNED');
    }

    const workoutId = Number(classInfo.workout_id);
    const { steps, stepsCumReps } = await this.liveClassRepository.getWorkoutSteps(workoutId);
    const timeCapSeconds = Number(classInfo.duration_minutes) * 60;
    const restart = request.restart || false;

    const session = await this.liveClassRepository.startLiveClass(
      classId,
      workoutId,
      steps,
      stepsCumReps,
      timeCapSeconds,
      restart
    );

    return {
      ok: true,
      restarted: restart,
      session
    };
  }

  async stopLiveClass(classId: number): Promise<{ ok: boolean; classId: number }> {
    await this.liveClassRepository.stopLiveClass(classId);
    return { ok: true, classId };
  }

  async advanceProgress(classId: number, userId: number, request: AdvanceProgressRequest): Promise<{ ok: boolean; current_step: number; finished: boolean }> {
    const dir = request.direction === 'prev' ? -1 : 1;

    await this.liveClassRepository.ensureProgressRow(classId, userId);

    // Fetch workout type and step count for this class session
    const meta = await this.liveClassRepository.getClassSessionMeta(classId);
    const workoutType = meta.workout_type ?? 'FOR_TIME';
    const stepCount = Number(meta.step_count ?? 0);

    if (stepCount === 0) {
      throw new Error('CLASS_SESSION_NOT_STARTED');
    }

    const result = await this.liveClassRepository.advanceProgress(
      classId,
      userId,
      dir,
      workoutType,
      stepCount
    );

    return {
      ok: true,
      current_step: result.current_step ?? 0,
      finished: !!result.finished_at
    };
  }

  async submitPartial(classId: number, userId: number, request: SubmitPartialRequest): Promise<{ ok: boolean; reps: number }> {
    const reps = Math.max(0, Number(request.reps ?? 0));
    await this.liveClassRepository.ensureProgressRow(classId, userId);
    await this.liveClassRepository.submitPartial(classId, userId, reps);
    return { ok: true, reps };
  }

  async getRealtimeLeaderboard(classId: number): Promise<RealtimeLeaderboardEntry[]> {
    if (!Number.isFinite(classId)) {
      throw new Error('INVALID_CLASS_ID');
    }

    return this.liveClassRepository.getRealtimeLeaderboard(classId);
  }

  async getMyProgress(classId: number, userId: number): Promise<LiveProgress> {
    const progress = await this.liveClassRepository.getMyProgress(classId, userId);
    return progress ?? {
      current_step: 0,
      finished_at: null,
      dnf_partial_reps: 0,
      rounds_completed: 0
    };
  }

  async postIntervalScore(classId: number, userId: number, request: IntervalScoreRequest): Promise<{ ok: boolean }> {
    const stepIndex = Number(request.stepIndex);
    const reps = Math.max(0, Number(request.reps ?? 0));

    if (!Number.isFinite(stepIndex) || stepIndex < 0) {
      throw new Error('INVALID_STEP_INDEX');
    }

    // Validate that this is an interval-type workout
    const workoutInfo = await this.liveClassRepository.validateIntervalWorkout(classId);
    const workoutType = (workoutInfo.type || '').toString().toUpperCase();
    
    if (workoutType !== 'TABATA' && workoutType !== 'INTERVAL' && workoutType !== 'EMOM') {
      throw new Error('NOT_INTERVAL_WORKOUT');
    }

    const steps = Array.isArray(workoutInfo.steps) ? workoutInfo.steps : [];
    if (stepIndex >= steps.length) {
      throw new Error('STEP_INDEX_OUT_OF_RANGE');
    }

    // Ensure user is booked in class
    const isBooked = await this.liveClassRepository.validateBooking(classId, userId);
    if (!isBooked) {
      throw new Error('NOT_BOOKED');
    }

    // Insert or update the interval score
    await this.liveClassRepository.postIntervalScore(classId, userId, stepIndex, reps);
    return { ok: true };
  }

  async getIntervalLeaderboard(classId: number): Promise<IntervalLeaderboardEntry[]> {
    return this.liveClassRepository.getIntervalLeaderboard(classId);
  }
}
