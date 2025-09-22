import { Request, Response } from 'express';
import { db } from '../db/client';
import {
  classes,
  workouts,
  members,
  classbookings,
  userroles,
  classattendance,
} from '../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { AuthenticatedRequest } from '../infrastructure/middleware/authMiddleware';
import { users } from '../db/schema';
import { GamificationService } from '../services/gamification/gamificationService';
import { GamificationRepository } from '../repositories/gamification/gamificationRepository';

// Initialize gamification service
const gamificationRepo = new GamificationRepository();
const gamificationService = new GamificationService(gamificationRepo);

// GET /leaderboard/:classId  — final leaderboard (for completed class sessions)
export const getLeaderboard = async (req: Request, res: Response) => {
  const { classId } = req.params;
  if (!classId) {
    return res.status(400).json({ error: 'classId is required' });
  }
  try {
    const leaderboard = await db
      .select({
        classId: classattendance.classId,
        memberId: classattendance.memberId,
        score: classattendance.score,
        markedAt: classattendance.markedAt,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(classattendance)
      .innerJoin(users, eq(classattendance.memberId, users.userId))
      .innerJoin(members, eq(users.userId, members.userId))
      .where(and(
        eq(classattendance.classId, Number(classId)),
        eq(members.publicVisibility, true)
      ))
      .orderBy(desc(classattendance.score));
    res.json(leaderboard);
  } catch (err) {
    console.error('Leaderboard fetch error:', err);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
};

// GET /live/class — fetch ongoing class for current user (if any)
export const getLiveClass = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
  }
  const userId = req.user.userId;
  let roles = req.user.roles as string[] | undefined;
  if (!roles) {
    const rows = await db
      .select({ role: userroles.userRole })
      .from(userroles)
      .where(eq(userroles.userId, userId));
    roles = rows.map(r => r.role as string);
  }

  // Determine if there's an ongoing class for this user (coach or member) in current time window
  const nowLocal = sql`(now() at time zone 'Africa/Johannesburg')`;  // current time in SAST
  const coachWindow = and(
    eq(classes.coachId, userId),
    sql`${classes.scheduledDate} + ${classes.scheduledTime} <= ${nowLocal}`,
    sql`${classes.scheduledDate} + ${classes.scheduledTime} + (${classes.durationMinutes || '0'}::int || ' minutes')::interval >= ${nowLocal}`
  );
  const memberWindow = and(
    eq(classbookings.memberId, userId),
    sql`${classes.scheduledDate} + ${classes.scheduledTime} <= ${nowLocal}`,
    sql`${classes.scheduledDate} + ${classes.scheduledTime} + (${classes.durationMinutes || '0'}::int || ' minutes')::interval >= ${nowLocal}`
  );

  // Coach perspective
  if (roles.includes('coach')) {
    const currentCoach = await db
      .select({
        classId: classes.classId,
        scheduledDate: classes.scheduledDate,
        scheduledTime: classes.scheduledTime,
        durationMinutes: classes.durationMinutes,
        coachId: classes.coachId,
        workoutId: classes.workoutId,
        workoutName: workouts.workoutName,
        workoutType: workouts.type,
      })
      .from(classes)
      .innerJoin(workouts, eq(classes.workoutId, workouts.workoutId))
      .where(coachWindow)
      .limit(1);
    if (currentCoach.length) {
      const participants = await db
        .select({ userId: classbookings.memberId })
        .from(classbookings)
        .where(eq(classbookings.classId, currentCoach[0].classId));
      return res.json({
        ongoing: true,
        roles,
        class: currentCoach[0],
        participants,
      });
    }
  }

  // Member perspective
  if (roles.includes('member')) {
    const currentMember = await db
      .select({
        classId: classes.classId,
        scheduledDate: classes.scheduledDate,
        scheduledTime: classes.scheduledTime,
        durationMinutes: classes.durationMinutes,
        coachId: classes.coachId,
        workoutId: classes.workoutId,
        workoutName: workouts.workoutName,
        workoutType: workouts.type,
      })
      .from(classes)
      .innerJoin(classbookings, eq(classes.classId, classbookings.classId))
      .innerJoin(workouts, eq(classes.workoutId, workouts.workoutId))
      .where(memberWindow)
      .limit(1);
    if (currentMember.length) {
      return res.json({
        ongoing: true,
        roles,
        class: currentMember[0],
      });
    }
  }

  res.json({ ongoing: false });
};

// GET /workout/:workoutId/steps — returns flattened workout steps and type
export const getWorkoutSteps = async (req: AuthenticatedRequest, res: Response) => {
  const workoutId = Number(req.params.workoutId);
  if (!workoutId) {
    return res.status(400).json({ error: 'INVALID_WORKOUT_ID' });
  }
  const { steps, stepsCumReps } = await flattenWorkoutToSteps(workoutId);
  const { rows } = await db.execute(sql`select type from public.workouts where workout_id=${workoutId} limit 1`);
  res.json({ steps, stepsCumReps, workoutType: rows[0]?.type ?? 'FOR_TIME' });
};

// POST /submitScore — submit or update final scores (coach for all or member for self)
export const submitScore = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
  }
  const userId = req.user.userId;
  let roles = req.user.roles as string[] | undefined;
  if (!roles) {
    const rows = await db
      .select({ role: userroles.userRole })
      .from(userroles)
      .where(eq(userroles.userId, userId));
    roles = rows.map(r => r.role as string);
  }

  const { classId } = req.body;
  if (!classId || typeof classId !== 'number') {
    return res.status(400).json({ success: false, error: 'CLASS_ID_REQUIRED' });
  }

  // Coach submitting multiple scores for a class
  if (roles.includes('coach') && Array.isArray(req.body.scores)) {
    // Verify this coach is assigned to that class
    const [cls] = await db
      .select({ coachId: classes.coachId })
      .from(classes)
      .where(eq(classes.classId, classId))
      .limit(1);
    if (!cls || cls.coachId !== userId) {
      return res.status(403).json({ success: false, error: 'NOT_CLASS_COACH' });
    }
    const rows = req.body.scores as { userId: number; score: number }[];
    const gamificationResults = [];
    
    for (const row of rows) {
      if (typeof row.userId !== 'number' || typeof row.score !== 'number' || row.score < 0) continue;
      
      await db
        .insert(classattendance)
        .values({
          classId,
          memberId: row.userId,
          score: row.score,
        })
        .onConflictDoUpdate({
          target: [classattendance.classId, classattendance.memberId],
          set: { score: row.score },
        });

      // Trigger gamification updates for each member
      try {
        const gamificationResult = await gamificationService.recordClassAttendance(row.userId, classId, new Date());
        gamificationResults.push({
          userId: row.userId,
          streak: gamificationResult.streak,
          newBadges: gamificationResult.newBadges
        });
      } catch (gamificationError) {
        console.error(`Gamification update failed for user ${row.userId}:`, gamificationError);
        gamificationResults.push({
          userId: row.userId,
          error: 'Failed to update gamification'
        });
      }
    }
    
    return res.json({ 
      success: true, 
      updated: rows.length,
      gamification: gamificationResults
    });
  }

  // Member submitting own score
  if (!roles.includes('member')) {
    return res.status(403).json({ success: false, error: 'ROLE_NOT_ALLOWED' });
  }
  const { score } = req.body;
  if (typeof score !== 'number' || score < 0) {
    return res.status(400).json({ success: false, error: 'SCORE_REQUIRED' });
  }
  // Member must be booked in class
  const bookingExists = await db
    .select()
    .from(classbookings)
    .where(and(eq(classbookings.classId, classId), eq(classbookings.memberId, userId)))
    .limit(1);
  if (bookingExists.length === 0) {
    return res.status(403).json({ success: false, error: 'NOT_BOOKED' });
  }
  // Upsert member's own score
  const attendanceResult = await db
    .insert(classattendance)
    .values({
      classId,
      memberId: userId,
      score,
    })
    .onConflictDoUpdate({
      target: [classattendance.classId, classattendance.memberId],
      set: { score },
    })
    .returning();

  // Trigger gamification updates for class completion
  try {
    console.log(`🎯 Triggering gamification for user ${userId}, class ${classId}`);
    const gamificationResult = await gamificationService.recordClassAttendance(userId, classId, new Date());
    console.log(`✅ Gamification result:`, {
      streak: gamificationResult.streak.currentStreak,
      totalPoints: gamificationResult.streak.totalPoints,
      newBadges: gamificationResult.newBadges.length
    });
    
    return res.json({ 
      success: true, 
      gamification: {
        streak: gamificationResult.streak,
        newBadges: gamificationResult.newBadges,
        pointsEarned: gamificationResult.streak.totalPoints
      }
    });
  } catch (gamificationError) {
    console.error('❌ Gamification update failed:', gamificationError);
    console.error('Error details:', gamificationError.stack);
    // Still return success for the score submission even if gamification fails
    return res.json({ success: true, gamificationError: 'Failed to update gamification' });
  }
};

// ===== Helpers for live classes =====
type Step = {
  index: number;
  name: string;
  reps?: number;
  duration?: number;
  round: number;
  subround: number;
  target_reps?: number;
};

async function flattenWorkoutToSteps(workoutId: number): Promise<{
  steps: Step[];
  stepsCumReps: number[];
}> {
  const result = await db.execute(sql`
    select
      r.round_number,
      sr.subround_number,
      se.position,
      e.name,
      se.quantity_type,
      se.quantity,
      se.subround_exercise_id,
      et.target_reps
    from public.rounds r
    join public.subrounds sr on sr.round_id = r.round_id
    join public.subround_exercises se on se.subround_id = sr.subround_id
    join public.exercises e on e.exercise_id = se.exercise_id
    left join public.emom_targets et on et.subround_exercise_id = se.subround_exercise_id
    where r.workout_id = ${workoutId}
    order by r.round_number asc, sr.subround_number asc, se.position asc
  `);
  const rows = result.rows as any[];
  const steps: Step[] = rows.map((row, idx) => {
    const isReps = row.quantity_type === 'reps';
    const isDur = row.quantity_type === 'duration';
    const reps = isReps ? Number(row.quantity) : undefined;
    const dur = isDur ? Number(row.quantity) : undefined;
    const label = isReps
      ? `${row.quantity}x ${row.name}`
      : `${row.name} ${row.quantity}s`;
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
  // Compute cumulative reps after each rep step for scoring (For Time/AMRAP)
  const stepsCumReps: number[] = [];
  let running = 0;
  for (const s of steps) {
    if (typeof s.reps === 'number') {
      running += s.reps;
    }
    stepsCumReps.push(running);
  }
  return { steps, stepsCumReps };
}

async function ensureProgressRow(classId: number, userId: number) {
  await db.execute(sql`
    insert into public.live_progress (class_id, user_id)
    values (${classId}, ${userId})
    on conflict (class_id, user_id) do nothing
  `);
}

// POST /coach/live/:classId/start — coach starts the live workout session
export const startLiveClass = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }
  try {
    const classId = Number(req.params.classId);
    if (!Number.isFinite(classId)) {
      return res.status(400).json({ error: 'INVALID_CLASS_ID' });
    }
    const cls = await db.execute(sql`
      select class_id, workout_id, duration_minutes
      from public.classes
      where class_id = ${classId}
    `);
    const row = cls.rows[0] as any;
    if (!row) return res.status(404).json({ error: 'CLASS_NOT_FOUND' });
    if (!row.workout_id) return res.status(400).json({ error: 'WORKOUT_NOT_ASSIGNED' });

    const workoutId = Number(row.workout_id);
    const { steps, stepsCumReps } = await flattenWorkoutToSteps(workoutId);

    // Insert or update class session record for this class
    await db.execute(sql`
      insert into public.class_sessions
        (class_id, workout_id, status, time_cap_seconds, started_at, ended_at, steps, steps_cum_reps)
      values (
        ${classId},
        ${workoutId},
        'live',
        ${Number(row.duration_minutes) * 60},
        now(),
        null,
        ${JSON.stringify(steps)}::jsonb,
        ${JSON.stringify(stepsCumReps)}::jsonb
      )
      on conflict (class_id) do update
        set status           = 'live',
            time_cap_seconds = excluded.time_cap_seconds,
            started_at       = now(),
            ended_at         = null,
            steps            = excluded.steps,
            steps_cum_reps   = excluded.steps_cum_reps
    `);

    // Reset any partial reps from previous runs
    await db.execute(sql`
      update public.live_progress
      set dnf_partial_reps = 0
      where class_id = ${classId}
    `);

    // Ensure every booked participant has a live_progress entry (so leaderboard shows everyone at start)
    await db.execute(sql`
      insert into public.live_progress (class_id, user_id)
      select ${classId}, cb.member_id
      from public.classbookings cb
      where cb.class_id = ${classId}
      on conflict (class_id, user_id) do nothing
    `);

    // If restart flag is provided, reset all participants' progress (start fresh)
    const restartParam = String(req.query.restart ?? '').toLowerCase();
    const restarted = restartParam === '1' || restartParam === 'true' || restartParam === 'yes';
    if (restarted) {
      await db.execute(sql`
        update public.live_progress
        set current_step = 0,
            rounds_completed = 0,
            finished_at = null,
            dnf_partial_reps = 0,
            updated_at = now()
        where class_id = ${classId}
      `);
    }

    const { rows: sessionRows } = await db.execute(sql`
      select class_id, workout_id, status, time_cap_seconds, started_at, ended_at, steps
      from public.class_sessions
      where class_id = ${classId}
      limit 1
    `);
    return res.json({ ok: true, restarted, session: sessionRows[0] });
  } catch (err) {
    console.error('[startLiveClass] error', err);
    return res.status(500).json({ error: 'START_LIVE_FAILED' });
  }
};

// POST /coach/live/:classId/stop — coach stops the live workout session
export const stopLiveClass = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }
  const classId = Number(req.params.classId);
  await db.execute(sql`
    update public.class_sessions
    set status = 'ended', ended_at = now()
    where class_id = ${classId}
  `);
  // (Phones will detect class_sessions.status via realtime and switch to results view)
  return res.json({ ok: true, classId });
};

// POST /live/:classId/advance — member moves to next/prev step (For Time / AMRAP)
export const advanceProgress = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }
  const classId = Number(req.params.classId);
  const userId = Number(req.user.userId);
  const dir = req.body?.direction === 'prev' ? -1 : 1;

  await ensureProgressRow(classId, userId);

  // Fetch workout type and step count for this class session
  const { rows: meta } = await db.execute(sql`
    select w.type as workout_type, coalesce(jsonb_array_length(cs.steps), 0) as step_count
    from public.class_sessions cs
    join public.workouts w on w.workout_id = cs.workout_id
    where cs.class_id = ${classId}
    limit 1
  `);
  const workoutType = (meta[0]?.workout_type as string) ?? 'FOR_TIME';
  const stepCount = Number(meta[0]?.step_count ?? 0);
  if (stepCount === 0) {
    return res.status(400).json({ error: 'CLASS_SESSION_NOT_STARTED' });
  }

  if (workoutType.toUpperCase() === 'AMRAP') {
    // AMRAP: wrap around steps and count rounds
    const { rows } = await db.execute(sql`
      with cur as (
        select current_step, rounds_completed
        from public.live_progress
        where class_id = ${classId} and user_id = ${userId}
        for update
      ),
      upd as (
        update public.live_progress lp
        set
          current_step = case
            when ${dir} > 0 then ((select current_step from cur) + 1) % ${stepCount}
            else case
              when (select current_step from cur) = 0 and (select rounds_completed from cur) > 0
                then ${stepCount - 1}
              else greatest(0, (select current_step from cur) - 1)
            end
          end,
          rounds_completed = case
            when ${dir} > 0 and ((select current_step from cur) + 1) >= ${stepCount}
              then (select rounds_completed from cur) + 1
            when ${dir} < 0 and (select current_step from cur) = 0 and (select rounds_completed from cur) > 0
              then (select rounds_completed from cur) - 1
            else (select rounds_completed from cur)
          end,
          dnf_partial_reps = 0,  -- reset any partial count when navigating
          updated_at = now()
        where lp.class_id = ${classId} and lp.user_id = ${userId}
        returning current_step, rounds_completed
      )
      select * from upd;
    `);
    return res.json({
      ok: true,
      current_step: rows[0]?.current_step ?? 0,
      finished: false  // AMRAP workouts never finish early (always run until time/cap)
    });
  }

  // Default: FOR_TIME logic
  const { rows } = await db.execute(sql`
    with sc as (
      select coalesce(jsonb_array_length(steps), 0) as step_count
      from public.class_sessions
      where class_id = ${classId}
    ),
    cur as (
      select lp.current_step, (select step_count from sc) as step_count
      from public.live_progress lp
      where lp.class_id = ${classId} and lp.user_id = ${userId}
      for update
    ),
    upd as (
      update public.live_progress lp
      set current_step = greatest(
            0,
            least((select current_step from cur) + ${dir}, (select step_count from cur))
          ),
          finished_at = case
            when lp.finished_at is not null then lp.finished_at
            when least((select current_step from cur) + ${dir}, (select step_count from cur)) >= (select step_count from cur)
              then now()
            else null
          end,
          dnf_partial_reps = case
            when least((select current_step from cur) + ${dir}, (select step_count from cur)) < (select step_count from cur)
              then 0
            else lp.dnf_partial_reps
          end,
          updated_at = now()
      where lp.class_id = ${classId} and lp.user_id = ${userId}
      returning lp.current_step, lp.finished_at
    )
    select * from upd;
  `);
  return res.json({
    ok: true,
    current_step: rows[0]?.current_step ?? 0,
    finished: !!rows[0]?.finished_at
  });
};

// POST /live/:classId/partial — member submits reps completed at time cap (DNF scenario)
export const submitPartial = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }
  const classId = Number(req.params.classId);
  const userId = Number(req.user.userId);
  const reps = Math.max(0, Number(req.body?.reps ?? 0));
  await ensureProgressRow(classId, userId);
  // (Optionally verify time cap or class ended, not enforced here)
  await db.execute(sql`
    update public.live_progress
    set dnf_partial_reps = ${reps}, updated_at = now()
    where class_id = ${classId} and user_id = ${userId}
  `);
  return res.json({ ok: true, reps });
};

// GET /live/:classId/leaderboard — realtime leaderboard for an ongoing class
export const getRealtimeLeaderboard = async (req: Request, res: Response) => {
  const classId = Number(req.params.classId);
  if (!Number.isFinite(classId)) {
    return res.status(400).json({ error: 'INVALID_CLASS_ID' });
  }

  const runQuery = async () => {
    // Determine workout type for this class
    const { rows: wrows } = await db.execute(sql`
      select w.type
      from public.classes c
      join public.workouts w on w.workout_id = c.workout_id
      where c.class_id = ${classId}
      limit 1
    `);
    const type = (wrows[0]?.type ?? '').toString().toUpperCase();
    if (!type) {
      return { rows: [], status: 404, body: { error: 'WORKOUT_NOT_FOUND_FOR_CLASS' } };
    }

    // For Interval/Tabata/EMOM: aggregate total reps and completed minutes (if applicable) from interval scores
    if (type === 'INTERVAL' || type === 'TABATA' || type === 'EMOM') {
      const { rows } = await db.execute(sql`
        with agg as (
          select
            lis.class_id,
            lis.user_id,
            sum(lis.reps)::int as total_reps,
            sum(
              case
                when ((cs.steps -> (lis.step_index)::int) ->> 'target_reps') is not null
                  and lis.reps >= (((cs.steps -> (lis.step_index)::int) ->> 'target_reps')::int)
                then 1 else 0
              end
            )::int as completed_minutes
          from public.live_interval_scores lis
          join public.class_sessions cs on cs.class_id = lis.class_id
          where lis.class_id = ${classId}
          group by lis.class_id, lis.user_id
        )
        select
          class_id,
          user_id,
          false as finished,
          null::numeric as elapsed_seconds,
          total_reps,
          1 as sort_bucket,
          case when '${type}' = 'EMOM'
               then row_number() over (order by completed_minutes desc, total_reps desc)::numeric
               else (- total_reps)::numeric
          end as sort_key,
          completed_minutes
        from agg
        order by
          case when '${type}' = 'EMOM' then completed_minutes end desc nulls last,
          total_reps desc;
      `);
      return { rows, status: 200, body: rows };
    }

    // For FOR_TIME & AMRAP: use precomputed view (assuming triggers keep it updated)
    const result = await db.execute(sql`
      select class_id, user_id, finished, elapsed_seconds, total_reps, sort_bucket, sort_key
      from public.leaderboard
      where class_id = ${classId}
      order by sort_key asc
    `);
    return { rows: result.rows, status: 200, body: result.rows };
  };

  try {
    const out = await runQuery();
    if (!res.headersSent) {
      return res.status(out.status).json(out.body);
    }
  } catch (err: any) {
    const isConnReset = err?.code === 'ECONNRESET' || /ECONNRESET|read ECONNRESET/i.test(String(err?.message ?? ''));
    if (isConnReset) {
      try {
        const out = await runQuery();
        if (!res.headersSent) {
          return res.status(out.status).json(out.body);
        }
      } catch (err2) {
        console.error('[getRealtimeLeaderboard] retry failed:', err2);
        if (!res.headersSent) {
          return res.status(503).json({ error: 'DB_CONNECTION_RESET' });
        }
      }
      return;
    }
    console.error('[getRealtimeLeaderboard] error:', err);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'LEADERBOARD_FAILED' });
    }
  }
};

// GET /live/:classId/me — get current user's live_progress (convenience endpoint)
export const getMyProgress = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }
  const classId = Number(req.params.classId);
  const userId = Number(req.user.userId);
  const { rows } = await db.execute(sql`
    select current_step, finished_at, dnf_partial_reps, rounds_completed
    from public.live_progress
    where class_id = ${classId} and user_id = ${userId}
  `);
  res.json(rows[0] ?? {
    current_step: 0,
    finished_at: null,
    dnf_partial_reps: 0,
    rounds_completed: 0
  });
};

// POST /live/:classId/interval/score — member submits reps for a completed interval step
export const postIntervalScore = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }
  const classId = Number(req.params.classId);
  const userId = Number(req.user.userId);
  const stepIndex = Number(req.body?.stepIndex);
  const reps = Math.max(0, Number(req.body?.reps ?? 0));
  if (!Number.isFinite(stepIndex) || stepIndex < 0) {
    return res.status(400).json({ error: 'INVALID_STEP_INDEX' });
  }

  // Validate that this is an interval-type workout (Interval/Tabata/EMOM)
  const { rows: sessRows } = await db.execute(sql`
    select cs.steps, w.type
    from public.class_sessions cs
    join public.workouts w on w.workout_id = cs.workout_id
    where cs.class_id = ${classId}
    limit 1
  `);
  const sess = sessRows[0] as any;
  if (!sess) {
    return res.status(404).json({ error: 'SESSION_NOT_FOUND' });
  }
  const workoutType = (sess.type || '').toString().toUpperCase();
  if (workoutType !== 'TABATA' && workoutType !== 'INTERVAL' && workoutType !== 'EMOM') {
    return res.status(400).json({ error: 'NOT_INTERVAL_WORKOUT' });
  }
  const steps: any[] = Array.isArray(sess.steps) ? sess.steps : [];
  if (stepIndex >= steps.length) {
    return res.status(400).json({ error: 'STEP_INDEX_OUT_OF_RANGE' });
  }

  // Ensure user is booked in class
  const booked = await db
    .select()
    .from(classbookings)
    .where(and(eq(classbookings.classId, classId), eq(classbookings.memberId, userId)))
    .limit(1);
  if (booked.length === 0) {
    return res.status(403).json({ error: 'NOT_BOOKED' });
  }

  // Insert or update the interval score for this user and step
  await db.execute(sql`
    insert into public.live_interval_scores (class_id, user_id, step_index, reps)
    values (${classId}, ${userId}, ${stepIndex}, ${reps})
    on conflict (class_id, user_id, step_index) do update
      set reps = excluded.reps, updated_at = now()
  `);
  return res.json({ ok: true });
};

// GET /live/:classId/interval/leaderboard — quick leaderboard of interval totals (for interval-based workouts)
export const getIntervalLeaderboard = async (req: Request, res: Response) => {
  const classId = Number(req.params.classId);
  const { rows } = await db.execute(sql`
    select s.user_id,
           sum(s.reps) as total_reps,
           u.first_name,
           u.last_name
    from public.live_interval_scores s
    join public.users u on u.user_id = s.user_id
    where s.class_id = ${classId}
    group by s.user_id, u.first_name, u.last_name
    order by sum(s.reps) desc, u.first_name asc
  `);
  const mapped = rows.map((r: any) => ({
    user_id: r.user_id,
    total_reps: Number(r.total_reps ?? 0),
    display_score: `${Number(r.total_reps ?? 0)} reps`,
    first_name: r.first_name,
    last_name: r.last_name,
  }));
  res.json(mapped);
};
