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
import { AuthenticatedRequest } from '../middleware/auth';
import { users } from '../db/schema';

// ===== NEW: GET /live/:classId/session — get class_sessions row if started =====
export const getLiveSession = async (req: Request, res: Response) => {
  const classId = Number(req.params.classId);
  if (!Number.isFinite(classId)) {
    return res.status(400).json({ error: 'INVALID_CLASS_ID' });
  }

  // Auto-end when cap reached (pause-aware)
  await db.execute(sql`
    update public.class_sessions cs
    set status = 'ended', ended_at = now()
    where cs.class_id = ${classId}
      and cs.status = 'live'
      and cs.time_cap_seconds > 0
      and (
        extract(epoch from (now() - cs.started_at))
        - coalesce(cs.pause_accum_seconds, 0)
        - coalesce(extract(epoch from (now() - cs.paused_at)), 0)
      ) >= cs.time_cap_seconds
  `);

  const { rows } = await db.execute(sql`
    select
      class_id,
      workout_id,
      status,
      time_cap_seconds,
      started_at,
      ended_at,
      paused_at,
      coalesce(pause_accum_seconds, 0)::bigint as pause_accum_seconds,
      extract(epoch from started_at)::bigint as started_at_s,
      extract(epoch from ended_at)::bigint   as ended_at_s,
      extract(epoch from paused_at)::bigint  as paused_at_s,
      steps,
      steps_cum_reps,
      workout_type
    from public.class_sessions
    where class_id = ${classId}
    limit 1
  `);
  if (!rows[0]) return res.status(404).json({ error: 'NO_SESSION' });
  return res.json(rows[0]);
};


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
    }
    return res.json({ success: true, updated: rows.length });
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
  await db
    .insert(classattendance)
    .values({
      classId,
      memberId: userId,
      score,
    })
    .onConflictDoUpdate({
      target: [classattendance.classId, classattendance.memberId],
      set: { score },
    });
  return res.json({ success: true });
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

// POST /coach/live/:classId/start — coach starts the live workout session (resets progress)
export const startLiveClass = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });

  const classId = Number(req.params.classId);
  if (!Number.isFinite(classId)) {
    return res.status(400).json({ error: 'INVALID_CLASS_ID' });
  }

  try {
    let out: any = null;

    await db.transaction(async (tx) => {
      const cls = await tx.execute(sql`
        select class_id, workout_id, coalesce(duration_minutes, 0) as duration_minutes
        from public.classes
        where class_id = ${classId}
        limit 1
      `);
      const row = cls.rows[0] as any;
      if (!row) throw new Error('CLASS_NOT_FOUND');
      if (!row.workout_id) throw new Error('WORKOUT_NOT_ASSIGNED');

      const workoutId = Number(row.workout_id);
      const { steps, stepsCumReps } = await flattenWorkoutToSteps(workoutId);

      await tx.execute(sql`
        insert into public.class_sessions
          (class_id, workout_id, status, time_cap_seconds, started_at, ended_at, paused_at, pause_accum_seconds, steps, steps_cum_reps, workout_type)
        values (
          ${classId},
          ${workoutId},
          'live',
          ${Number(row.duration_minutes) * 60},
          now(),
          null,
          null,
          0,
          ${JSON.stringify(steps)}::jsonb,
          ${JSON.stringify(stepsCumReps)}::jsonb,
          (select type from public.workouts where workout_id=${workoutId})
        )
        on conflict (class_id) do update
          set status               = 'live',
              time_cap_seconds     = excluded.time_cap_seconds,
              started_at           = now(),
              ended_at             = null,
              paused_at            = null,
              pause_accum_seconds  = 0,
              steps                = excluded.steps,
              steps_cum_reps       = excluded.steps_cum_reps,
              workout_type         = excluded.workout_type
      `);

      await tx.execute(sql`
        insert into public.live_progress (class_id, user_id)
        select ${classId}, cb.member_id
        from public.classbookings cb
        where cb.class_id = ${classId}
        on conflict (class_id, user_id) do nothing
      `);

      await tx.execute(sql`
        update public.live_progress
        set current_step = 0,
            rounds_completed = 0,
            finished_at = null,
            dnf_partial_reps = 0,
            updated_at = now()
        where class_id = ${classId}
      `);

      const fresh = await tx.execute(sql`
        select class_id, workout_id, status, time_cap_seconds, started_at, ended_at, paused_at,
               coalesce(pause_accum_seconds,0)::bigint as pause_accum_seconds,
               steps, steps_cum_reps, workout_type
        from public.class_sessions
        where class_id = ${classId}
        limit 1
      `);

      out = fresh.rows[0];
    });

    return res.json({ ok: true, session: out });
  } catch (err: any) {
    if (err?.message === 'CLASS_NOT_FOUND') {
      return res.status(404).json({ error: 'CLASS_NOT_FOUND' });
    }
    if (err?.message === 'WORKOUT_NOT_ASSIGNED') {
      return res.status(400).json({ error: 'WORKOUT_NOT_ASSIGNED' });
    }
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
  return res.json({ ok: true, classId });
};

// POST /coach/live/:classId/pause
export const pauseLiveClass = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });
  const classId = Number(req.params.classId);
  await db.execute(sql`
    update public.class_sessions
    set status = 'paused',
        paused_at = case when paused_at is null then now() else paused_at end
    where class_id = ${classId}
  `);
  return res.json({ ok: true, classId });
};


// POST /coach/live/:classId/resume
export const resumeLiveClass = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });
  const classId = Number(req.params.classId);
  await db.execute(sql`
    update public.class_sessions
    set status = 'live',
        pause_accum_seconds = coalesce(pause_accum_seconds, 0)
                              + coalesce(extract(epoch from (now() - paused_at))::bigint, 0),
        paused_at = null
    where class_id = ${classId}
  `);
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

  // fetch session meta + type + step count
  const { rows: meta } = await db.execute(sql`
    select
      cs.status,
      cs.time_cap_seconds,
      cs.started_at,
      cs.paused_at,
      coalesce(cs.pause_accum_seconds,0) as pause_accum_seconds,
      w.type as workout_type,
      coalesce(jsonb_array_length(cs.steps), 0) as step_count
    from public.class_sessions cs
    join public.workouts w on w.workout_id = cs.workout_id
    where cs.class_id = ${classId}
    limit 1
  `);
  const m = meta[0] as any;
  if (!m) return res.status(400).json({ error: 'CLASS_SESSION_NOT_STARTED' });

  // must be live
  if ((m.status || '').toString() !== 'live') {
    return res.status(409).json({ error: 'NOT_LIVE' });
  }

  // auto-end if cap reached (pause-aware)
  const elapsed = await db.execute(sql`
    select (
      extract(epoch from (now() - ${m.started_at}))::bigint
      - ${Number(m.pause_accum_seconds)}
      - coalesce(extract(epoch from (now() - ${m.paused_at}))::bigint, 0)
    )::bigint as e
  `);
  const eVal = Number((elapsed.rows[0] as any)?.e ?? 0);
  if (Number(m.time_cap_seconds ?? 0) > 0 && eVal >= Number(m.time_cap_seconds)) {
    await db.execute(sql`
      update public.class_sessions
      set status = 'ended', ended_at = now()
      where class_id = ${classId}
    `);
    return res.status(409).json({ error: 'TIME_UP', ended: true });
  }

  const workoutType = (m.workout_type as string) ?? 'FOR_TIME';
  const stepCount = Number(m.step_count ?? 0);
  if (stepCount === 0) {
    return res.status(400).json({ error: 'CLASS_SESSION_NOT_STARTED' });
  }

  if (workoutType.toUpperCase() === 'AMRAP') {
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
          dnf_partial_reps = 0,
          updated_at = now()
        where lp.class_id = ${classId} and lp.user_id = ${userId}
        returning current_step, rounds_completed
      )
      select * from upd;
    `);
    return res.json({ ok: true, current_step: rows[0]?.current_step ?? 0, finished: false });
  }

  // FOR_TIME
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
  await db.execute(sql`
    update public.live_progress
    set dnf_partial_reps = ${reps}, updated_at = now()
    where class_id = ${classId} and user_id = ${userId}
  `);
  return res.json({ ok: true, reps });
};

// GET /live/:classId/leaderboard — realtime leaderboard for an ongoing class
// GET /live/:classId/leaderboard — realtime leaderboard for an ongoing class
export const getRealtimeLeaderboard = async (req: Request, res: Response) => {
  const classId = Number(req.params.classId);
  if (!Number.isFinite(classId)) {
    return res.status(400).json({ error: 'INVALID_CLASS_ID' });
  }

  const runQuery = async () => {
    // workout type
    const { rows: wrows } = await db.execute(sql`
      select w.type
      from public.classes c
      join public.workouts w on w.workout_id = c.workout_id
      where c.class_id = ${classId}
      limit 1
    `);
    const type = (wrows[0]?.type ?? '').toString().toUpperCase();
    if (!type) return { rows: [], status: 404, body: { error: 'WORKOUT_NOT_FOUND_FOR_CLASS' } };

    // INTERVAL/TABATA/EMOM (unchanged ordering, include names)
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
          a.class_id,
          a.user_id,
          u.first_name,
          u.last_name,
          false as finished,
          null::numeric as elapsed_seconds,
          a.total_reps
        from agg a
        join public.users u on u.user_id = a.user_id
        order by a.completed_minutes desc, a.total_reps desc
      `);
      return { rows, status: 200, body: rows };
    }

    // AMRAP: total reps must include completed rounds
    if (type === 'AMRAP') {
      const { rows } = await db.execute(sql`
        with base as (
          select
            lp.user_id,
            lp.current_step,
            lp.rounds_completed,
            lp.dnf_partial_reps,
            cs.class_id,
            cs.steps_cum_reps
          from public.live_progress lp
          join public.class_sessions cs on cs.class_id = lp.class_id
          where lp.class_id = ${classId}
        ),
        calc as (
          select
            b.*,
            -- last cumulative (total reps per round)
            coalesce(
              (b.steps_cum_reps ->> greatest(jsonb_array_length(b.steps_cum_reps) - 1, 0))::int,
              0
            ) as reps_per_round,
            case when b.current_step > 0
              then (b.steps_cum_reps ->> (b.current_step - 1))::int
              else 0 end as within_round_reps
          from base b
        )
        select
          c.class_id,
          c.user_id,
          u.first_name,
          u.last_name,
          false as finished,
          null::numeric as elapsed_seconds,
          (c.rounds_completed * c.reps_per_round + c.within_round_reps + coalesce(c.dnf_partial_reps, 0))::int as total_reps
        from calc c
        join public.users u on u.user_id = c.user_id
        order by total_reps desc, u.first_name asc
      `);
      return { rows, status: 200, body: rows };
    }

    // FOR_TIME: finishers first by time, then DNFs by reps (names included)
    const { rows } = await db.execute(sql`
      with base as (
        select
          lp.user_id,
          lp.current_step,
          lp.finished_at,
          lp.dnf_partial_reps,
          cs.class_id,
          cs.started_at,
          cs.steps_cum_reps
        from public.live_progress lp
        join public.class_sessions cs on cs.class_id = lp.class_id
        where lp.class_id = ${classId}
      )
      select
        b.class_id,
        b.user_id,
        u.first_name,
        u.last_name,
        (b.finished_at is not null) as finished,
        case when b.finished_at is not null
          then extract(epoch from (b.finished_at - b.started_at))::numeric
          else null::numeric
        end as elapsed_seconds,
        (
          (case when b.current_step > 0
                then ((b.steps_cum_reps ->> (b.current_step - 1))::int)
                else 0 end)
          + coalesce(b.dnf_partial_reps, 0)
        ) as total_reps
      from base b
      join public.users u on u.user_id = b.user_id
      order by
        case when b.finished_at is not null then 0 else 1 end,
        elapsed_seconds asc nulls last,
        total_reps desc nulls last
    `);
    return { rows, status: 200, body: rows };
  };

  try {
    const out = await runQuery();
    if (!res.headersSent) return res.status(out.status).json(out.body);
  } catch (err: any) {
    const isConnReset = err?.code === 'ECONNRESET' || /ECONNRESET|read ECONNRESET/i.test(String(err?.message ?? ''));
    if (isConnReset) {
      try {
        const out = await runQuery();
        if (!res.headersSent) return res.status(out.status).json(out.body);
      } catch (err2) {
        console.error('[getRealtimeLeaderboard] retry failed:', err2);
        if (!res.headersSent) return res.status(503).json({ error: 'DB_CONNECTION_RESET' });
      }
      return;
    }
    console.error('[getRealtimeLeaderboard] error:', err);
    if (!res.headersSent) return res.status(500).json({ error: 'LEADERBOARD_FAILED' });
  }
};





// GET /live/:classId/me — get current user's live_progress
export const getMyProgress = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }
  const classId = Number(req.params.classId);
  const userId = Number(req.user.userId);
  const { rows } = await db.execute(sql`
    select
      current_step,
      finished_at,
      extract(epoch from finished_at)::bigint as finished_at_s,
      dnf_partial_reps,
      rounds_completed
    from public.live_progress
    where class_id = ${classId} and user_id = ${userId}
  `);
  res.json(rows[0] ?? {
    current_step: 0,
    finished_at: null,
    finished_at_s: null,
    dnf_partial_reps: 0,
    rounds_completed: 0
  });
};


// POST /live/:classId/interval/score
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

  const booked = await db
    .select()
    .from(classbookings)
    .where(and(eq(classbookings.classId, classId), eq(classbookings.memberId, userId)))
    .limit(1);
  if (booked.length === 0) {
    return res.status(403).json({ error: 'NOT_BOOKED' });
  }

  await db.execute(sql`
    insert into public.live_interval_scores (class_id, user_id, step_index, reps)
    values (${classId}, ${userId}, ${stepIndex}, ${reps})
    on conflict (class_id, user_id, step_index) do update
      set reps = excluded.reps, updated_at = now()
  `);
  return res.json({ ok: true });
};

// GET /live/:classId/interval/leaderboard
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
