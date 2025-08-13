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
import { eq, and, lte, gte, sql } from 'drizzle-orm';
import { AuthenticatedRequest } from '../middleware/auth';
import { users } from '../db/schema';
import { desc } from 'drizzle-orm';

// GET /leaderboard/:classId
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
      .where(
        and(eq(classattendance.classId, parseInt(classId)), eq(members.publicVisibility, true)),
      )
      .orderBy(desc(classattendance.score));

    res.json(leaderboard);
  } catch (err) {
    console.error('Leaderboard fetch error:', err);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
};

// GET /live/class
export const getLiveClass = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });

  const userId = req.user.userId;
  let roles = req.user.roles as string[] | undefined;

  // Ensure roles exist
  if (!roles) {
    const rows = await db
      .select({ role: userroles.userRole })
      .from(userroles)
      .where(eq(userroles.userId, userId));
    roles = rows.map(r => r.role as string);
  }

  // Using SAST "local wall time" for the window check:
  // (classes.scheduled_date + classes.scheduled_time) is a timestamp w/o tz (local),
  // so compare to (now() at time zone 'Africa/Johannesburg') which is also local timestamp (w/o tz).
  const coachWindow = and(
    eq(classes.coachId, userId),
    sql`(classes.scheduled_date + classes.scheduled_time) <= (now() at time zone 'Africa/Johannesburg')`,
    sql`(classes.scheduled_date + classes.scheduled_time + (classes.duration_minutes || ' minutes')::interval) >= (now() at time zone 'Africa/Johannesburg')`
  );

  const memberWindow = and(
    eq(classbookings.memberId, userId),
    sql`(classes.scheduled_date + classes.scheduled_time) <= (now() at time zone 'Africa/Johannesburg')`,
    sql`(classes.scheduled_date + classes.scheduled_time + (classes.duration_minutes || ' minutes')::interval) >= (now() at time zone 'Africa/Johannesburg')`
  );

  // ----- COACH -----
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

  // ----- MEMBER -----
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


// GET /workout/:workoutId/steps
// GET /workout/:workoutId/steps  -> { steps, stepsCumReps, workoutType }
export const getWorkoutSteps = async (req: AuthenticatedRequest, res: Response) => {
  const workoutId = Number(req.params.workoutId);
  if (!workoutId) return res.status(400).json({ error: 'INVALID_WORKOUT_ID' });

  const { steps, stepsCumReps } = await flattenWorkoutToSteps(workoutId);

  const { rows } = await db.execute(sql`
    select type from public.workouts where workout_id=${workoutId} limit 1
  `);

  res.json({ steps, stepsCumReps, workoutType: rows[0]?.type ?? 'FOR_TIME' });
};





// POST /submitScore
export const submitScore = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });

  const userId = req.user.userId;
  let roles = req.user.roles as string[] | undefined;

  // Fetch roles if they weren't in the JWT
  if (!roles) {
    const rows = await db
      .select({ role: userroles.userRole })
      .from(userroles)
      .where(eq(userroles.userId, userId));
    roles = rows.map((r) => r.role as string);
  }

  // 1. CHECK PAYLOAD
  const { classId } = req.body;
  if (!classId || typeof classId !== 'number')
    return res.status(400).json({ success: false, error: 'CLASS_ID_REQUIRED' });

  // 2. COACH FLOW
  if (roles.includes('coach') && Array.isArray(req.body.scores)) {
    // Make sure this coach is assigned to that class
    const [cls] = await db
      .select({ coachId: classes.coachId })
      .from(classes)
      .where(eq(classes.classId, classId))
      .limit(1);

    if (!cls || cls.coachId !== userId)
      return res.status(403).json({ success: false, error: 'NOT_CLASS_COACH' });

    const rows = req.body.scores as { userId: number; score: number }[];

    // Upsert every (classId, memberId) with its score
    for (const row of rows) {
      if (typeof row.userId !== 'number' || typeof row.score !== 'number' || row.score < 0)
        continue;

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

  // 3. MEMBER FLOW
  if (!roles.includes('member'))
    return res.status(403).json({ success: false, error: 'ROLE_NOT_ALLOWED' });

  const { score } = req.body;
  if (typeof score !== 'number' || score < 0)
    return res.status(400).json({ success: false, error: 'SCORE_REQUIRED' });

  // Check the member is actually booked
  const bookingExists = await db
    .select()
    .from(classbookings)
    .where(and(eq(classbookings.classId, classId), eq(classbookings.memberId, userId)))
    .limit(1);

  if (bookingExists.length === 0)
    return res.status(403).json({ success: false, error: 'NOT_BOOKED' });

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



// ============ HELPERS FOR LIVE CLASSES ============
type Step = { index:number; name:string; reps?:number; duration?:number; round:number; subround:number };

async function flattenWorkoutToSteps(workoutId: number): Promise<{
  steps: Step[];
  stepsCumReps: number[]; // NEW
}> {
  const result = await db.execute(sql`
    select
      r.round_number, sr.subround_number, se.position,
      e.name, se.quantity_type, se.quantity
    from public.rounds r
    join public.subrounds sr on sr.round_id = r.round_id
    join public.subround_exercises se on se.subround_id = sr.subround_id
    join public.exercises e on e.exercise_id = se.exercise_id
    where r.workout_id = ${workoutId}
    order by r.round_number asc, sr.subround_number asc, se.position asc
  `);

  const rows = result.rows as any[];

  const steps: Step[] = rows.map((row, idx) => ({
    index: idx,
    name: row.quantity_type === 'reps'
      ? `${row.quantity}x ${row.name}`
      : `${row.name} ${row.quantity}s`,
    reps: row.quantity_type === 'reps' ? Number(row.quantity) : undefined,
    duration: row.quantity_type === 'duration' ? Number(row.quantity) : undefined,
    round: Number(row.round_number),
    subround: Number(row.subround_number),
  }));

  // cumulative reps after each step
  const stepsCumReps: number[] = [];
  let running = 0;
  for (const s of steps) {
    if (typeof s.reps === 'number') running += s.reps;
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


// POST /coach/live/:classId/start  (coach)
export const startLiveClass = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });

  try {
    const classId = Number(req.params.classId);
    if (!Number.isFinite(classId)) return res.status(400).json({ error: 'INVALID_CLASS_ID' });

    // Load class + workout/duration
    const cls = await db.execute(sql`
      select class_id, workout_id, duration_minutes
      from public.classes
      where class_id = ${classId}
    `);
    const row = cls.rows[0] as any;
    if (!row) return res.status(404).json({ error: 'CLASS_NOT_FOUND' });
    if (!row.workout_id) return res.status(400).json({ error: 'WORKOUT_NOT_ASSIGNED' });

    // Build steps/cumulative reps
    const { steps, stepsCumReps } = await flattenWorkoutToSteps(Number(row.workout_id));

    // Lookup workout type
    const { rows: tw } = await db.execute(sql`
      select type from public.workouts where workout_id=${row.workout_id} limit 1
    `);
    const workoutType = (tw[0]?.type as string) ?? 'FOR_TIME';

    // Upsert the live session (persist workout_type)
    await db.execute(sql`
      insert into public.class_sessions
        (class_id, workout_id, status, time_cap_seconds, started_at, ended_at, steps, steps_cum_reps, workout_type)
      values (
        ${classId},
        ${row.workout_id},
        'live',
        ${Number(row.duration_minutes) * 60},
        now(),
        null,
        ${JSON.stringify(steps)}::jsonb,
        ${JSON.stringify(stepsCumReps)}::jsonb,
        ${workoutType}
      )
      on conflict (class_id) do update
        set status           = 'live',
            time_cap_seconds = excluded.time_cap_seconds,
            started_at       = now(),
            ended_at         = null,
            steps            = excluded.steps,
            steps_cum_reps   = excluded.steps_cum_reps,
            workout_type     = excluded.workout_type
    `);

    // Clear stale partial reps on (re)start
    await db.execute(sql`
      update public.live_progress
      set dnf_partial_reps = 0
      where class_id = ${classId}
    `);

    // Optional full restart (?restart=1|true|yes)
    const restartParam = String(req.query.restart ?? '').toLowerCase();
    const restarted = restartParam === '1' || restartParam === 'true' || restartParam === 'yes';
    if (restarted) {
      await db.execute(sql`
        update public.live_progress
        set current_step = 0,
            rounds_completed = 0,
            finished_at  = null,
            updated_at   = now()
        where class_id = ${classId}
      `);
    }

    // Return the fresh session row the client needs
    const { rows: sessionRows } = await db.execute(sql`
      select
        class_id,
        workout_id,
        status,
        time_cap_seconds,
        started_at,
        ended_at,
        steps,
        workout_type
      from public.class_sessions
      where class_id = ${classId}
      limit 1
    `);

    if (!sessionRows.length) {
      console.error('[startLiveClass] upsert succeeded but row not found', { classId });
      return res.status(500).json({ error: 'SESSION_NOT_FOUND_AFTER_START' });
    }

    return res.json({
      ok: true,
      restarted,
      session: sessionRows[0],
    });
  } catch (err) {
    console.error('[startLiveClass] error', err);
    return res.status(500).json({ error: 'START_LIVE_FAILED' });
  }
};



/** POST /coach/live/:classId/stop  (coach only) */
export const stopLiveClass = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });

  const classId = Number(req.params.classId);
  await db.execute(sql`
    update public.class_sessions
      set status='ended', ended_at=now()
    where class_id=${classId}
  `);
  // Phones will switch to View 3/4 based on their own LB row
  return res.json({ ok: true, classId });
};

// POST /live/:classId/advance
export const advanceProgress = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });

  const classId = Number(req.params.classId);
  const userId = Number(req.user.userId);
  const dir = req.body?.direction === 'prev' ? -1 : 1;

  await ensureProgressRow(classId, userId);

  // Get workout type + step_count
  const { rows: meta } = await db.execute(sql`
    select w.type as workout_type, coalesce(jsonb_array_length(cs.steps),0) as step_count
    from public.class_sessions cs
    join public.workouts w on w.workout_id = cs.workout_id
    where cs.class_id=${classId}
    limit 1
  `);
  const workoutType = (meta[0]?.workout_type as string) ?? 'FOR_TIME';
  const stepCount = Number(meta[0]?.step_count ?? 0);
  if (stepCount === 0) return res.status(400).json({ error: 'CLASS_SESSION_NOT_STARTED' });

  if (workoutType === 'AMRAP') {
    // wrap across steps; bump/decrement rounds_completed on wrap
    const { rows } = await db.execute(sql`
      with cur as (
        select current_step, rounds_completed
        from public.live_progress
        where class_id=${classId} and user_id=${userId}
        for update
      ),
      upd as (
        update public.live_progress lp
        set
          current_step = case
            when ${dir} > 0 then ((select current_step from cur) + 1) % ${stepCount}
            else case
              when (select current_step from cur) = 0 and (select rounds_completed from cur) > 0 then ${stepCount-1}
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
          -- while navigating, don't keep any "partial"; it only applies at CAP/STOP
          dnf_partial_reps = 0,
          updated_at = now()
        where lp.class_id=${classId} and lp.user_id=${userId}
        returning current_step, rounds_completed
      )
      select * from upd;
    `);

    return res.json({
      ok: true,
      current_step: rows[0]?.current_step ?? 0,
      finished: false   // AMRAP never "finishes" early
    });
  }

  // Default: FOR_TIME (your original behavior)
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
            when greatest(0, least((select current_step from cur) + ${dir}, (select step_count from cur))) >= (select step_count from cur)
                then now()
            else null
          end,
          dnf_partial_reps = case
            when greatest(
                  0,
                  least((select current_step from cur) + ${dir}, (select step_count from cur))
                ) < (select step_count from cur)
              then 0
            else lp.dnf_partial_reps
          end,
          updated_at = now()
      where lp.class_id = ${classId} and lp.user_id = ${userId}
      returning lp.current_step, lp.finished_at
    )
    select * from upd;
  `);

  return res.json({ ok: true, current_step: rows[0]?.current_step ?? 0, finished: !!rows[0]?.finished_at });
};



// POST /live/:classId/partial  body: { reps: number } (member after cap) */
export const submitPartial = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });

  const classId = Number(req.params.classId);
  const userId = Number(req.user.userId);
  const reps = Math.max(0, Number(req.body?.reps ?? 0));

  await ensureProgressRow(classId, userId);

  // (Optional) verify class ended or time reached – omitted for MVP
  await db.execute(sql`
    update public.live_progress
    set dnf_partial_reps=${reps}, updated_at=now()
    where class_id=${classId} and user_id=${userId}
  `);

  return res.json({ ok: true, reps });
};

// GET /live/:classId/leaderboard
export const getRealtimeLeaderboard = async (req: Request, res: Response) => {
  const classId = Number(req.params.classId);
  const result = await db.execute(sql`
    select *
    from public.leaderboard
    where class_id=${classId}
    order by sort_key asc
  `);
  res.json(result.rows);
};


export const getMyProgress = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });
  const classId = Number(req.params.classId);
  const userId = Number(req.user.userId);

  const { rows } = await db.execute(sql`
    select current_step, finished_at, dnf_partial_reps, rounds_completed
    from public.live_progress
    where class_id=${classId} and user_id=${userId}
  `);

  res.json(rows[0] ?? {
    current_step: 0,
    finished_at: null,
    dnf_partial_reps: 0,
    rounds_completed: 0
  });
};

