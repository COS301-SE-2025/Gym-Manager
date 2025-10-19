import {
  ILiveClassService,
  ILiveClassRepository,
  LiveSession,
  Step,
} from '../../domain/interfaces/liveClass.interface';
import { LiveClassRepository } from '../../repositories/liveClass/liveClassRepository';
import { IUserRepository } from '../../domain/interfaces/auth.interface';
import { UserRepository } from '../../repositories/auth/userRepository';
import { GamificationService } from '../gamification/gamificationService';
import { GamificationRepository } from '../../repositories/gamification/gamificationRepository';

export class LiveClassService implements ILiveClassService {
  private repo: ILiveClassRepository;
  private userRepo: IUserRepository;
  private gamificationService: GamificationService;

  constructor(
    repo?: ILiveClassRepository,
    userRepo?: IUserRepository,
    gamificationService?: GamificationService,
  ) {
    this.repo = repo || new LiveClassRepository();
    this.userRepo = userRepo || new UserRepository();

    this.gamificationService =
      gamificationService || new GamificationService(new GamificationRepository());
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
  // --- Workout steps ---
  // --- Workout steps ---
  // --- Workout steps ---
  async getWorkoutSteps(workoutId: number) {
    if (!Number.isFinite(workoutId) || workoutId <= 0) throw new Error('INVALID_WORKOUT_ID');

    const rows = await this.repo.getFlattenRowsForWorkout(workoutId);
    const workoutTypeRaw = await this.repo.getWorkoutType(workoutId);
    const meta = await this.repo.getWorkoutMetadata(workoutId);
    const workoutType = (workoutTypeRaw ?? 'FOR_TIME').toUpperCase();

    // Build steps with TABATA/INTERVAL semantics:
    // - quantity is ALWAYS seconds
    // - quantity_type = 'reps'  => member enters reps (input visible)
    // - quantity_type = 'duration' => timed-only (no input)
    const baseSteps: Step[] = rows.map((row: any, idx: number) => {
      const round = Number(row.round_number);
      const subround = Number(row.subround_number);
      const seconds = Number(row.quantity); // always seconds in DB for TABATA/INTERVAL
      const qType = String(row.quantity_type ?? '').toLowerCase();

      if (['TABATA', 'INTERVAL'].includes(workoutType)) {
        // Label always shows seconds; we surface quantityType so the client can decide about inputs
        const label = `${row.name} ${seconds}s`;
        return {
          index: idx,
          name: label,
          duration: seconds,
          round,
          subround,
          // not used for cum reps, but handy for the client:
          // @ts-ignore – allow extra field
          quantityType: qType, // 'reps' (enter reps) or 'duration' (timed-only)
        };
      }

      // Default / non-interval types keep existing behavior
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
        round,
        subround,
        target_reps: row.target_reps != null ? Number(row.target_reps) : undefined,
        // @ts-ignore – allow extra field
        quantityType: qType,
      };
    });

    // helper: expand a 1-round template N times
    const expandByRoundsIfSingleRound = (stepsIn: Step[], repeats: number): Step[] => {
      const uniqRounds = new Set(stepsIn.map((s) => Number(s.round)));
      if (repeats <= 1 || uniqRounds.size !== 1) {
        return stepsIn.map((s, i) => ({ ...s, index: i }));
      }
      const baseRoundNo = Math.min(...Array.from(uniqRounds));
      const template = stepsIn
        .filter((s) => Number(s.round) === baseRoundNo)
        .sort((a, b) => (a as any).subround - (b as any).subround || a.index - b.index);

      const out: Step[] = [];
      let idx = 0;
      for (let r = 1; r <= repeats; r++) {
        for (const t of template) out.push({ ...t, round: r, index: idx++ });
      }
      return out;
    };

    let steps: Step[];

    if (workoutType === 'EMOM') {
      // EMOM: keep existing grouping-by-subround ordering
      const bySub: Record<number, Step[]> = {};
      for (const s of baseSteps) {
        const sr = Math.max(1, Number((s as any).subround || 1));
        (bySub[sr] ??= []).push(s);
      }
      const out: Step[] = [];
      let idx = 0;
      for (const sr of Object.keys(bySub)
        .map(Number)
        .sort((a, b) => a - b)) {
        const group = bySub[sr].sort((a, b) => a.index - b.index);
        for (const t of group) out.push({ ...t, round: sr, index: idx++ });
      }
      steps = out;
    } else if (['FOR_TIME', 'TABATA', 'INTERVAL'].includes(workoutType)) {
      const repeats = Math.max(1, Number(meta?.number_of_rounds ?? 1));
      steps = expandByRoundsIfSingleRound(baseSteps, repeats);
    } else {
      steps = baseSteps.map((s, i) => ({ ...s, index: i }));
    }

    // cum reps (used by non-interval types; safe here)
    const stepsCumReps: number[] = [];
    let running = 0;
    for (const s of steps) {
      if (typeof (s as any).reps === 'number') running += (s as any).reps;
      stepsCumReps.push(running);
    }

    return { steps, stepsCumReps, workoutType, metadata: meta };
  }

  // --- Submit score (coach batch or member single) ---
  async submitScore(userId: number, roles: string[] = [], body: any) {
    const classId = body?.classId;
    if (!Number.isFinite(classId)) throw new Error('CLASS_ID_REQUIRED');

    if (roles.includes('coach') && Array.isArray(body?.scores)) {
      await this.repo.assertCoachOwnsClass(classId, userId);
      const updated = await this.repo.upsertScoresBatch(classId, body.scores);

      // Trigger gamification updates for each member
      const gamificationResults = [];
      for (const scoreRow of body.scores) {
        try {
          const gamificationResult = await this.gamificationService.recordClassAttendance(
            scoreRow.userId,
            classId,
            new Date(),
          );
          gamificationResults.push({
            userId: scoreRow.userId,
            streak: gamificationResult.streak,
            newBadges: gamificationResult.newBadges,
          });
        } catch (gamificationError) {
          console.error(
            `Gamification update failed for user ${scoreRow.userId}:`,
            gamificationError,
          );
          gamificationResults.push({
            userId: scoreRow.userId,
            error: 'Failed to update gamification',
          });
        }
      }

      return { success: true, updated, gamification: gamificationResults };
    }

    if (!roles.includes('member')) throw new Error('ROLE_NOT_ALLOWED');
    const score = Number(body?.score);
    if (!Number.isFinite(score) || score < 0) throw new Error('SCORE_REQUIRED');
    await this.repo.assertMemberBooked(classId, userId);
    await this.repo.upsertMemberScore(classId, userId, score);

    // Trigger gamification updates for member
    try {
      const gamificationResult = await this.gamificationService.recordClassAttendance(
        userId,
        classId,
        new Date(),
      );
      return {
        success: true,
        gamification: {
          streak: gamificationResult.streak,
          newBadges: gamificationResult.newBadges,
          pointsEarned: gamificationResult.streak.totalPoints,
        },
      };
    } catch (gamificationError) {
      console.error('Gamification update failed:', gamificationError);
      return { success: true, gamificationError: 'Failed to update gamification' };
    }
  }

  // in LiveClassService
  async startLiveClass(classId: number) {
    const existing = await this.repo.getClassSession(classId);
    if (existing) {
      const st = String(existing.status || '');
      if (st === 'ended') throw new Error('ALREADY_ENDED');
      if (st === 'live' || st === 'paused') throw new Error('ALREADY_STARTED');
    }

    const cls = await this.repo.getClassMeta(classId);
    if (!cls) throw new Error('CLASS_NOT_FOUND');
    if (!cls.workout_id) throw new Error('WORKOUT_NOT_ASSIGNED');

    const workoutId: number = Number(cls.workout_id);
    const { steps, stepsCumReps, workoutType } = await this.getWorkoutSteps(workoutId);
    const meta = await this.repo.getWorkoutMetadata(workoutId);
    const capFromMeta = Number(meta?.time_limit ?? 0) * 60;
    const timeCapSeconds =
      Number.isFinite(capFromMeta) && capFromMeta > 0
        ? capFromMeta
        : Number(cls.duration_minutes || 0) * 60;

    await this.repo.upsertClassSession(
      classId,
      workoutId,
      timeCapSeconds,
      steps,
      stepsCumReps,
      workoutType,
      meta,
    );

    await this.repo.seedLiveProgressForClass(classId);
    await this.repo.resetLiveProgressForClass(classId);
    return this.repo.getClassSession(classId);
  }

  async stopLiveClass(classId: number) {
    await this.repo.stopSession(classId);
    try {
      await this.repo.persistScoresFromLive(classId);

      // Trigger gamification for all participants
      // Get all participants who had attendance records created
      const participants = await this.getParticipantsForClass(classId);
      for (const participant of participants) {
        try {
          const gamificationResult = await this.gamificationService.recordClassAttendance(
            participant.userId,
            classId,
            new Date(),
          );
        } catch (gamificationError) {
          console.error(`Gamification failed for user ${participant.userId}:`, gamificationError);
        }
      }
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

    const elapsed = await this.repo.getElapsedSeconds(
      meta.started_at,
      meta.paused_at,
      meta.pause_accum_seconds,
    );
    if (Number(meta.time_cap_seconds ?? 0) > 0 && elapsed >= Number(meta.time_cap_seconds)) {
      await this.repo.stopSession(classId);
      throw new Error('TIME_UP');
    }

    const stepCount = Number(meta.step_count ?? 0);
    if (stepCount === 0) throw new Error('CLASS_SESSION_NOT_STARTED');

    if ((meta.workout_type || '').toString().toUpperCase() === 'AMRAP') {
      const row = await this.repo.advanceAmrap(
        classId,
        userId,
        stepCount,
        direction === 'prev' ? -1 : 1,
      );
      return { ok: true, current_step: row?.current_step ?? 0, finished: false };
    }

    const row = await this.repo.advanceForTime(classId, userId, direction === 'prev' ? -1 : 1);
    return { ok: true, current_step: row?.current_step ?? 0, finished: !!row?.finished_at };
  }

  async submitPartial(classId: number, userId: number, reps: number) {
    const safe = Math.max(0, Number(reps || 0));
    await this.repo.ensureProgressRow(classId, userId);
    await this.repo.setPartialReps(classId, userId, safe);

    try {
      const sess = await this.repo.getClassSession(classId);
      if (String(sess?.status ?? '').toLowerCase() === 'ended') {
        await this.repo.persistScoresFromLive(classId);
      }
    } catch (e) {
      console.error('persist after partial failed', e);
    }

    return { ok: true, reps: safe };
  }

  async getRealtimeLeaderboard(classId: number) {
    const sess = await this.repo.getClassSession(classId);
    const status = String(sess?.status ?? '').toLowerCase();
    const type = (sess?.workout_type || (await this.repo.getWorkoutTypeByClass(classId)) || '')
      .toString()
      .toUpperCase();

    // For EMOM, always use realtime leaderboard (even when ended) 
    // because it properly calculates scores for all booked members
    if (type === 'EMOM') return this.repo.realtimeEmomLeaderboard(classId);

    if (status === 'ended') {
      const finals = await this.repo.getFinalLeaderboard(classId);

      const mapped = (finals || []).map((r: any) => {
        const finished = !!(r.finished ?? false);
        const seconds = r.scoreSeconds ?? r.score_seconds ?? null;
        const reps = r.scoreReps ?? r.score_reps ?? r.score ?? null;

        return {
          user_id: Number(r.memberId ?? r.user_id ?? r.userId),
          first_name: r.firstName ?? r.first_name ?? null,
          last_name: r.lastName ?? r.last_name ?? null,
          finished,
          elapsed_seconds: finished ? (seconds != null ? Number(seconds) : null) : null,
          total_reps: !finished
            ? reps != null
              ? Number(reps)
              : 0
            : (r.scoreReps ?? r.score_reps ?? null),
          scaling: ((r.scaling ?? 'RX') as string).toUpperCase(),
          name: r.name ?? null,
        };
      });

      if (type === 'FOR_TIME') {
        mapped.sort(
          (
            a: { finished: any; elapsed_seconds: number; total_reps: any },
            b: { finished: any; elapsed_seconds: number; total_reps: any },
          ) => {
            if (a.finished && b.finished) {
              const ta = a.elapsed_seconds ?? Number.MAX_SAFE_INTEGER;
              const tb = b.elapsed_seconds ?? Number.MAX_SAFE_INTEGER;
              return ta - tb || (b.total_reps ?? 0) - (a.total_reps ?? 0);
            }
            if (a.finished !== b.finished) return a.finished ? -1 : 1;
            return (b.total_reps ?? 0) - (a.total_reps ?? 0);
          },
        );
      } else {
        mapped.sort(
          (a: { total_reps: any }, b: { total_reps: any }) =>
            (b.total_reps ?? 0) - (a.total_reps ?? 0),
        );
      }

      return mapped;
    }

    if (type === 'INTERVAL' || type === 'TABATA')
      return this.repo.realtimeIntervalLeaderboard(classId);
    if (type === 'AMRAP') return this.repo.realtimeAmrapLeaderboard(classId);
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
    if (!['TABATA', 'INTERVAL', 'EMOM'].includes(type)) throw new Error('NOT_INTERVAL_WORKOUT');

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
    payload: {
      minuteIndex: number;
      finished: boolean;
      finishSeconds: number | null;
      exercisesCompleted?: number;
      exercisesTotal?: number;
    },
  ) {
    const sess = await this.repo.getSessionTypeAndSteps(classId);
    if (!sess) throw new Error('SESSION_NOT_FOUND');
    const type = (sess.type || '').toString().toUpperCase();
    if (type !== 'EMOM') throw new Error('NOT_EMOM_WORKOUT');

    await this.repo.assertMemberBooked(classId, userId);

    // planned minutes from metadata to keep inbound minuteIndex sane
    const sessionRow = await this.repo.getClassSession(classId);
    const planned = Array.isArray(sessionRow?.workout_metadata?.emom_repeats)
      ? (sessionRow!.workout_metadata!.emom_repeats as any[]).map(Number).reduce((a, b) => a + b, 0)
      : 0;

    // clamp minute index within 0..planned-1 (if we know the plan)
    let m = Math.max(0, Number(payload.minuteIndex || 0));
    if (planned > 0) m = Math.min(m, planned - 1);

    // allow 60 as the "not finished" penalty; finished minutes should be 0..59
    const sec =
      payload.finishSeconds == null
        ? payload.finished
          ? 0
          : 60
        : Math.max(0, Math.min(60, Number(payload.finishSeconds)));

    await this.repo.upsertEmomMark(classId, userId, m, !!payload.finished, sec);
  }

  async getCoachNote(classId: number) {
    return this.repo.getCoachNote(classId);
  }
  async setCoachNote(classId: number, coachId: number, text: string) {
    await this.repo.assertCoachOwnsClass(classId, coachId);
    await this.repo.setCoachNote(classId, text);
  }

  async coachEmomSetTotalEndedOnly(
    classId: number,
    coachId: number,
    userId: number,
    totalSeconds: number,
  ) {
    await this.repo.assertCoachOwnsClass(classId, coachId);
    const sess = await this.repo.getClassSession(classId);
    if (!sess) throw new Error('SESSION_NOT_FOUND');
    if ((sess.status || '').toString() !== 'ended') throw new Error('NOT_ENDED');

    await this.repo.assertMemberBooked(classId, userId);
    await this.repo.upsertFinal(classId, userId, {
      seconds: Math.max(0, Number(totalSeconds || 0)),
      finished: true,
    });
  }

  // --- Coach edit: FOR_TIME finish ---
  async coachSetForTimeFinish(
    classId: number,
    coachId: number,
    userId: number,
    finishSeconds: number | null,
  ) {
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
    const cum: number[] = Array.isArray(sess.steps_cum_reps)
      ? (sess.steps_cum_reps as any[]).map(Number)
      : [];
    const repsPerRound = cum.length ? Number(cum[cum.length - 1] ?? 0) : 0;

    let rounds = 0,
      within = totalReps,
      step = 0,
      partial = 0;
    if (repsPerRound > 0) {
      rounds = Math.floor(totalReps / repsPerRound);
      within = totalReps - rounds * repsPerRound;
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
  async coachPostIntervalScore(
    classId: number,
    coachId: number,
    userId: number,
    stepIndex: number,
    reps: number,
  ) {
    await this.repo.assertCoachOwnsClass(classId, coachId);
    const sess = await this.repo.getSessionTypeAndSteps(classId);
    if (!sess) throw new Error('SESSION_NOT_FOUND');
    const stepsArr: any[] = Array.isArray(sess.steps) ? sess.steps : [];
    if (!Number.isFinite(stepIndex) || stepIndex < 0 || stepIndex >= stepsArr.length)
      throw new Error('STEP_INDEX_OUT_OF_RANGE');
    await this.repo.upsertIntervalScore(classId, userId, stepIndex, Math.max(0, Number(reps || 0)));
  }

  // --- Coach edit: EMOM mark (minute) ---
  async coachPostEmomMark(
    classId: number,
    coachId: number,
    userId: number,
    minuteIndex: number,
    finished: boolean,
    finishSeconds: number,
  ) {
    await this.repo.assertCoachOwnsClass(classId, coachId);
    await this.repo.upsertEmomMark(
      classId,
      userId,
      minuteIndex,
      finished,
      Math.max(0, Math.min(59, Number(finishSeconds || 0))),
    );
  }

  async coachForTimeSetFinishSecondsEndedOnly(
    classId: number,
    userId: number,
    finishSeconds: number,
  ) {
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

  async getMyScaling(classId: number, userId: number): Promise<'RX' | 'SC'> {
    return this.repo.getScaling(classId, userId);
  }

  async setMyScaling(classId: number, userId: number, scaling: 'RX' | 'SC'): Promise<void> {
    // user must be booked to set scaling
    await this.repo.assertMemberBooked(classId, userId);
    await this.repo.upsertScaling(classId, userId, scaling);

    // Trigger gamification updates for class attendance
    try {
      const gamificationResult = await this.gamificationService.recordClassAttendance(
        userId,
        classId,
        new Date(),
      );
    } catch (gamificationError) {
      console.error('Gamification update failed for scaling:', gamificationError);
    }
  }

  private async getParticipantsForClass(classId: number): Promise<Array<{ userId: number }>> {
    // Get all users who have attendance records for this class
    const { db } = await import('../../db/client');
    const { classattendance } = await import('../../db/schema');
    const { eq } = await import('drizzle-orm');

    const participants = await db
      .select({ userId: classattendance.memberId })
      .from(classattendance)
      .where(eq(classattendance.classId, classId));

    return participants.map((p) => ({ userId: p.userId }));
  }
}
