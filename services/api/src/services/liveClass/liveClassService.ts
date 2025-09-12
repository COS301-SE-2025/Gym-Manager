import { ILiveClassService, ILiveClassRepository, LiveSession, Step } from '../../domain/interfaces/liveClass.interface';
import { LiveClassRepository } from '../../repositories/liveClass/liveClassRepository';
import { IUserRepository } from '../../domain/interfaces/auth.interface';
import { UserRepository } from '../../repositories/auth/userRepository';

export class LiveClassService implements ILiveClassService {
  private repo: ILiveClassRepository;
  private userRepo: IUserRepository;

  constructor(repo?: ILiveClassRepository, userRepo?: IUserRepository) {
    this.repo = repo || new LiveClassRepository();
    this.userRepo = userRepo || new UserRepository();
  }

  // --- Session ---
  async getLiveSession(classId: number): Promise<LiveSession | null> {
    if (!Number.isFinite(classId)) throw new Error('INVALID_CLASS_ID');
    await this.repo.autoEndIfCapReached(classId);
    return this.repo.getClassSession(classId);
  }

  // --- Final leaderboard ---
  async getFinalLeaderboard(classId: number) {
    return this.repo.getFinalLeaderboard(classId);
  }

  // --- Live class discovery for user ---
  async getLiveClassForUser(userId: number, roles?: string[]) {
    let userRoles = roles;
    if (!userRoles || !userRoles.length) userRoles = await this.userRepo.getRolesByUserId(userId);

    // coach perspective
    if (userRoles.includes('coach')) {
      const coach = await this.repo.getLiveClassForCoach(userId);
      if (coach) return coach;
    }

    // member perspective
    if (userRoles.includes('member')) {
      const member = await this.repo.getLiveClassForMember(userId);
      if (member) return member;
    }

    return { ongoing: false };
  }

  // --- Workout steps ---
  async getWorkoutSteps(workoutId: number) {
    if (!Number.isFinite(workoutId) || workoutId <= 0) throw new Error('INVALID_WORKOUT_ID');
    const rows = await this.repo.getFlattenRowsForWorkout(workoutId);

    const steps: Step[] = rows.map((row: any, idx: number) => {
      const isReps = row.quantity_type === 'reps';
      const isDur = row.quantity_type === 'duration';
      const reps = isReps ? Number(row.quantity) : undefined;
      const dur = isDur ? Number(row.quantity) : undefined;
      const label = isReps ? `${row.quantity}x ${row.name}` : `${row.name} ${row.quantity}s`;
      return {
        index: idx,
        name: label,
        reps,
        duration: dur,
        round: Number(row.round_number),
        subround: Number(row.subround_number),
        target_reps: row.target_reps != null ? Number(row.target_reps) : undefined,
      };
    });

    const stepsCumReps: number[] = [];
    let running = 0;
    for (const s of steps) {
      if (typeof s.reps === 'number') running += s.reps;
      stepsCumReps.push(running);
    }

    const workoutType = await this.repo.getWorkoutType(workoutId);
    return { steps, stepsCumReps, workoutType: workoutType ?? 'FOR_TIME' };
  }

  // --- Submit score (coach batch or member single) ---
  async submitScore(userId: number, roles: string[] = [], body: any) {
    const classId = body?.classId;
    if (!Number.isFinite(classId)) throw new Error('CLASS_ID_REQUIRED');

    if (roles.includes('coach') && Array.isArray(body?.scores)) {
      await this.repo.assertCoachOwnsClass(classId, userId);
      const updated = await this.repo.upsertScoresBatch(classId, body.scores);
      return { success: true, updated };
    }

    if (!roles.includes('member')) throw new Error('ROLE_NOT_ALLOWED');
    const score = Number(body?.score);
    if (!Number.isFinite(score) || score < 0) throw new Error('SCORE_REQUIRED');
    await this.repo.assertMemberBooked(classId, userId);
    await this.repo.upsertMemberScore(classId, userId, score);
    return { success: true };
  }

  // --- Coach session controls ---
  async startLiveClass(classId: number) {
    const cls = await this.repo.getClassMeta(classId);
    if (!cls) throw new Error('CLASS_NOT_FOUND');
    if (!cls.workout_id) throw new Error('WORKOUT_NOT_ASSIGNED');

    const workoutId: number = Number(cls.workout_id);
    const { steps, stepsCumReps, workoutType } = await this.getWorkoutSteps(workoutId);
    const timeCapSeconds = Number(cls.duration_minutes || 0) * 60;

    await this.repo.upsertClassSession(classId, workoutId, timeCapSeconds, steps, stepsCumReps, workoutType);
    await this.repo.seedLiveProgressForClass(classId);
    await this.repo.resetLiveProgressForClass(classId);
    return this.repo.getClassSession(classId);
  }

  async stopLiveClass(classId: number) {
    await this.repo.stopSession(classId);
  }
  async pauseLiveClass(classId: number) {
    await this.repo.pauseSession(classId);
  }
  async resumeLiveClass(classId: number) {
    await this.repo.resumeSession(classId);
  }

  // --- Member progression (For Time / AMRAP) ---
  async advanceProgress(classId: number, userId: number, direction: 'next' | 'prev') {
    await this.repo.ensureProgressRow(classId, userId);

    const meta = await this.repo.getAdvanceMeta(classId);
    if (!meta) throw new Error('CLASS_SESSION_NOT_STARTED');
    if ((meta.status || '').toString() !== 'live') throw new Error('NOT_LIVE');

    const elapsed = await this.repo.getElapsedSeconds(meta.started_at, meta.paused_at, meta.pause_accum_seconds);
    if (Number(meta.time_cap_seconds ?? 0) > 0 && elapsed >= Number(meta.time_cap_seconds)) {
      await this.repo.stopSession(classId);
      throw new Error('TIME_UP');
    }

    const stepCount = Number(meta.step_count ?? 0);
    if (stepCount === 0) throw new Error('CLASS_SESSION_NOT_STARTED');

    if ((meta.workout_type || '').toString().toUpperCase() === 'AMRAP') {
      const row = await this.repo.advanceAmrap(classId, userId, stepCount, direction === 'prev' ? -1 : 1);
      return { ok: true, current_step: row?.current_step ?? 0, finished: false };
    }

    const row = await this.repo.advanceForTime(classId, userId, direction === 'prev' ? -1 : 1);
    return { ok: true, current_step: row?.current_step ?? 0, finished: !!row?.finished_at };
  }

  // --- Submit partial reps (DNF) ---
  async submitPartial(classId: number, userId: number, reps: number) {
    const safe = Math.max(0, Number(reps || 0));
    await this.repo.ensureProgressRow(classId, userId);
    await this.repo.setPartialReps(classId, userId, safe);
    return { ok: true, reps: safe };
  }

  // --- Realtime leaderboard ---
  async getRealtimeLeaderboard(classId: number) {
    const type = await this.repo.getWorkoutTypeByClass(classId);
    if (!type) throw new Error('WORKOUT_NOT_FOUND_FOR_CLASS');

    const t = type.toUpperCase();
    if (t === 'INTERVAL' || t === 'TABATA' || t === 'EMOM') return this.repo.realtimeIntervalLeaderboard(classId);
    if (t === 'AMRAP') return this.repo.realtimeAmrapLeaderboard(classId);
    return this.repo.realtimeForTimeLeaderboard(classId);
  }

  // --- My progress ---
  async getMyProgress(classId: number, userId: number) {
    return this.repo.getMyProgress(classId, userId);
  }

  // --- Interval score ---
  async postIntervalScore(classId: number, userId: number, stepIndex: number, reps: number) {
    if (!Number.isFinite(stepIndex) || stepIndex < 0) throw new Error('INVALID_STEP_INDEX');
    const sess = await this.repo.getSessionTypeAndSteps(classId);
    if (!sess) throw new Error('SESSION_NOT_FOUND');

    const type = (sess.type || '').toString().toUpperCase();
    if (!['TABATA','INTERVAL','EMOM'].includes(type)) throw new Error('NOT_INTERVAL_WORKOUT');

    const stepsArr: any[] = Array.isArray(sess.steps) ? sess.steps : [];
    if (stepIndex >= stepsArr.length) throw new Error('STEP_INDEX_OUT_OF_RANGE');

    await this.repo.assertMemberBooked(classId, userId);
    await this.repo.upsertIntervalScore(classId, userId, stepIndex, Math.max(0, Number(reps || 0)));
  }

  async getIntervalLeaderboard(classId: number) {
    return this.repo.intervalLeaderboard(classId);
  }
}
