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

    const meta = await this.repo.getWorkoutMetadata(workoutId);
    await this.repo.upsertClassSession(classId, workoutId, timeCapSeconds, steps, stepsCumReps, workoutType, meta); // pass meta

    await this.repo.seedLiveProgressForClass(classId);
    await this.repo.resetLiveProgressForClass(classId);
    return this.repo.getClassSession(classId);
  }

  async stopLiveClass(classId: number) {
    await this.repo.stopSession(classId);
    // ⬇️ persist final scores for history
    try {
      await this.repo.persistScoresFromLive(classId);
    } catch (e) {
      // don't blow up stop on a persistence hiccup; log and move on
      console.error('persistScoresFromLive failed', e);
    }
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
    if (t === 'EMOM') return this.repo.realtimeEmomLeaderboard(classId);
    if (t === 'INTERVAL' || t === 'TABATA') return this.repo.realtimeIntervalLeaderboard(classId);
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

  // REPLACE your method with this version
  async postEmomMark(
    classId: number,
    userId: number,
    payload: { minuteIndex: number; finished: boolean; finishSeconds: number | null; exercisesCompleted?: number; exercisesTotal?: number }
  ) {
    const sess = await this.repo.getSessionTypeAndSteps(classId);
    if (!sess) throw new Error('SESSION_NOT_FOUND');
    const type = (sess.type || '').toString().toUpperCase();
    if (type !== 'EMOM') throw new Error('NOT_EMOM_WORKOUT');

    await this.repo.assertMemberBooked(classId, userId);

    const m = Math.max(0, Number(payload.minuteIndex || 0));
    // If finished=false and no seconds provided, treat as 60 (full-minute penalty).
    // If finished=true and no seconds provided, treat as 0 (instant, but you can tweak).
    const sec =
      payload.finishSeconds == null
        ? (payload.finished ? 0 : 60)
        : Math.max(0, Math.min(59, Number(payload.finishSeconds)));

    await this.repo.upsertEmomMark(
      classId,
      userId,
      m,
      !!payload.finished,
      sec
    );
  }


  async getCoachNote(classId: number) {
    return this.repo.getCoachNote(classId);
  }
  async setCoachNote(classId: number, coachId: number, text: string) {
    await this.repo.assertCoachOwnsClass(classId, coachId);
    await this.repo.setCoachNote(classId, text);
  }

  // --- Coach edit: FOR_TIME finish ---
  async coachSetForTimeFinish(classId: number, coachId: number, userId: number, finishSeconds: number | null) {
    await this.repo.assertCoachOwnsClass(classId, coachId);
    const sess = await this.repo.getClassSession(classId);
    if (!sess?.started_at) throw new Error('SESSION_NOT_FOUND');
    await this.repo.setForTimeFinish(classId, userId, finishSeconds, sess.started_at);
  }

  // --- Coach edit: AMRAP set total reps ---
  async coachSetAmrapTotal(classId: number, coachId: number, userId: number, totalReps: number) {
    await this.repo.assertCoachOwnsClass(classId, coachId);
    const sess = await this.repo.getClassSession(classId);
    if (!sess) throw new Error('SESSION_NOT_FOUND');
    // Compute rounds/current_step/partial from totalReps and steps_cum_reps
    const cum: number[] = Array.isArray(sess.steps_cum_reps) ? (sess.steps_cum_reps as any[]).map(Number) : [];
    const repsPerRound = cum.length ? Number(cum[cum.length - 1] ?? 0) : 0;

    let rounds = 0, within = totalReps, step = 0, partial = 0;
    if (repsPerRound > 0) {
      rounds = Math.floor(totalReps / repsPerRound);
      within = totalReps - (rounds * repsPerRound);
    }
    // map within to step index & partial reps
    for (let i = 0; i < cum.length; i++) {
      const need = Number(cum[i] ?? 0);
      if (within < need) {
        step = i; // current_step points to next step index
        const prev = i > 0 ? Number(cum[i - 1]) : 0;
        partial = within - prev; // reps inside the current step
        break;
      }
      if (i === cum.length - 1) {
        step = cum.length;
        partial = 0;
      }
    }

    await this.repo.setAmrapProgress(classId, userId, rounds, step, Math.max(0, partial));
  }

  // --- Coach edit: INTERVAL/TABATA step score ---
  async coachPostIntervalScore(classId: number, coachId: number, userId: number, stepIndex: number, reps: number) {
    await this.repo.assertCoachOwnsClass(classId, coachId);
    const sess = await this.repo.getSessionTypeAndSteps(classId);
    if (!sess) throw new Error('SESSION_NOT_FOUND');
    const stepsArr: any[] = Array.isArray(sess.steps) ? sess.steps : [];
    if (!Number.isFinite(stepIndex) || stepIndex < 0 || stepIndex >= stepsArr.length) throw new Error('STEP_INDEX_OUT_OF_RANGE');
    await this.repo.upsertIntervalScore(classId, userId, stepIndex, Math.max(0, Number(reps || 0)));
  }

  // --- Coach edit: EMOM mark (minute) ---
  async coachPostEmomMark(classId: number, coachId: number, userId: number, minuteIndex: number, finished: boolean, finishSeconds: number) {
    await this.repo.assertCoachOwnsClass(classId, coachId);
    await this.repo.upsertEmomMark(classId, userId, minuteIndex, finished, Math.max(0, Math.min(59, Number(finishSeconds || 0))));
  }

  async coachForTimeSetFinishSecondsEndedOnly(classId: number, userId: number, finishSeconds: number) {
    const sess = await this.repo.getClassSession(classId);
    if (!sess) throw new Error('SESSION_NOT_FOUND');
    if ((sess.status || '').toString() !== 'ended') throw new Error('NOT_ENDED');
    await this.repo.assertMemberBooked(classId, userId);
    await this.repo.setForTimeFinishBySeconds(classId, userId, finishSeconds);
  }

  async coachForTimeSetTotalRepsEndedOnly(classId: number, userId: number, totalReps: number) {
    const sess = await this.repo.getClassSession(classId);
    if (!sess) throw new Error('SESSION_NOT_FOUND');
    if ((sess.status || '').toString() !== 'ended') throw new Error('NOT_ENDED');
    await this.repo.assertMemberBooked(classId, userId);
    await this.repo.setForTimeTotalReps(classId, userId, totalReps);
  }

  async coachAmrapSetTotalEndedOnly(classId: number, userId: number, totalReps: number) {
    const sess = await this.repo.getClassSession(classId);
    if (!sess) throw new Error('SESSION_NOT_FOUND');
    if ((sess.status || '').toString() !== 'ended') throw new Error('NOT_ENDED');
    await this.repo.assertMemberBooked(classId, userId);
    await this.repo.setAmrapTotalReps(classId, userId, totalReps);
  }

  async coachIntervalSetTotalEndedOnly(classId: number, userId: number, totalReps: number) {
    const sess = await this.repo.getClassSession(classId);
    if (!sess) throw new Error('SESSION_NOT_FOUND');
    if ((sess.status || '').toString() !== 'ended') throw new Error('NOT_ENDED');
    await this.repo.assertMemberBooked(classId, userId);
    await this.repo.upsertIntervalOverride(classId, userId, totalReps);
  }

  async getMyScaling(classId: number, userId: number): Promise<'RX'|'SC'> {
    return this.repo.getScaling(classId, userId);
  }

  async setMyScaling(classId: number, userId: number, scaling: 'RX'|'SC'): Promise<void> {
    // user must be booked to set scaling
    await this.repo.assertMemberBooked(classId, userId);
    await this.repo.upsertScaling(classId, userId, scaling);
  }


}
