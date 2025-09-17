import { db as globalDb } from '../../db/client';
import { classes, workouts, classbookings, classattendance, members, userroles, users } from '../../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { ILiveClassRepository, LiveSession, Step } from '../../domain/interfaces/liveClass.interface';

type Executor = typeof globalDb | any;

export class LiveClassRepository implements ILiveClassRepository {
  private exec(tx?: Executor) { return tx ?? globalDb; }

  // --- Session helpers ---
  async autoEndIfCapReached(classId: number): Promise<void> {
    await globalDb.execute(sql`
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
  }

  async getClassSession(classId: number): Promise<LiveSession | null> {
    const { rows } = await globalDb.execute(sql`
      select
        class_id, workout_id, status, time_cap_seconds,
        started_at, ended_at, paused_at,
        coalesce(pause_accum_seconds, 0)::bigint as pause_accum_seconds,
        extract(epoch from started_at)::bigint as started_at_s,
        extract(epoch from ended_at)::bigint   as ended_at_s,
        extract(epoch from paused_at)::bigint  as paused_at_s,
        steps, steps_cum_reps, workout_type,
        coalesce(workout_metadata, '{}'::jsonb) as workout_metadata
      from public.class_sessions
      where class_id = ${classId}
      limit 1
    `);
    return (rows[0] as unknown as LiveSession) || null;
  }

  // --- Final leaderboard ---
  async getFinalLeaderboard(classId: number) {
    const leaderboard = await globalDb
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
      .where(and(eq(classattendance.classId, Number(classId)), eq(members.publicVisibility, true)))
      .orderBy(desc(classattendance.score));

    return leaderboard;
  }

  // --- Discovery for coach ---
  async getLiveClassForCoach(userId: number) {
    const nowLocal = sql`(now() at time zone 'Africa/Johannesburg')`;
    const coachWindow = and(
      eq(classes.coachId, userId),
      sql`${classes.scheduledDate} + ${classes.scheduledTime} <= ${nowLocal}`,
      sql`${classes.scheduledDate} + ${classes.scheduledTime} + (${classes.durationMinutes || '0'}::int || ' minutes')::interval >= ${nowLocal}`
    );

    const currentCoach = await globalDb
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

    if (!currentCoach.length) return null;

    const participants = await globalDb
      .select({ userId: classbookings.memberId })
      .from(classbookings)
      .where(eq(classbookings.classId, currentCoach[0].classId));

    return {
      ongoing: true,
      roles: ['coach'],
      class: currentCoach[0],
      participants,
    };
  }

  // --- Discovery for member ---
  async getLiveClassForMember(userId: number) {
    const nowLocal = sql`(now() at time zone 'Africa/Johannesburg')`;
    const memberWindow = and(
      eq(classbookings.memberId, userId),
      sql`${classes.scheduledDate} + ${classes.scheduledTime} <= ${nowLocal}`,
      sql`${classes.scheduledDate} + ${classes.scheduledTime} + (${classes.durationMinutes || '0'}::int || ' minutes')::interval >= ${nowLocal}`
    );

    const currentMember = await globalDb
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

    if (!currentMember.length) return null;

    return { ongoing: true, roles: ['member'], class: currentMember[0] };
  }

  // --- Workout flatten rows & type ---
  async getFlattenRowsForWorkout(workoutId: number) {
    const result = await globalDb.execute(sql`
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
    return result.rows as any[];
  }

  async getWorkoutType(workoutId: number): Promise<string | null> {
    const { rows } = await globalDb.execute(sql`select type from public.workouts where workout_id=${workoutId} limit 1`);
    return (rows[0] as { type: string })?.type ?? null;
  }

  // --- Coach controls ---
  async getClassMeta(classId: number) {
    const cls = await globalDb.execute(sql`
      select class_id, workout_id, coalesce(duration_minutes, 0) as duration_minutes
      from public.classes
      where class_id = ${classId}
      limit 1
    `);
    return cls.rows[0] as any;
  }

  async getWorkoutMetadata(workoutId: number): Promise<any> {
    const { rows } = await globalDb.execute(sql`
      select coalesce(metadata, '{}'::jsonb) as metadata
      from public.workouts
      where workout_id = ${workoutId}
      limit 1
    `);
    return (rows[0] as any)?.metadata ?? {};
  }

  async upsertClassSession(
    classId: number,
    workoutId: number,
    timeCapSeconds: number,
    steps: Step[],
    stepsCumReps: number[],
    workoutType: string,
    workoutMetadata: any
  ) {
    await globalDb.execute(sql`
      insert into public.class_sessions
        (class_id, workout_id, status, time_cap_seconds, started_at, ended_at, paused_at, pause_accum_seconds, steps, steps_cum_reps, workout_type, workout_metadata)
      values (
        ${classId}, ${workoutId}, 'live', ${timeCapSeconds}, now(), null, null, 0,
        ${JSON.stringify(steps)}::jsonb, ${JSON.stringify(stepsCumReps)}::jsonb, ${workoutType}, ${JSON.stringify(workoutMetadata)}::jsonb
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
            workout_type         = excluded.workout_type,
            workout_metadata     = excluded.workout_metadata
    `);
  }

  async seedLiveProgressForClass(classId: number) {
    await globalDb.execute(sql`
      insert into public.live_progress (class_id, user_id)
      select ${classId}, cb.member_id
      from public.classbookings cb
      where cb.class_id = ${classId}
      on conflict (class_id, user_id) do nothing
    `);
  }
  async resetLiveProgressForClass(classId: number) {
    await globalDb.execute(sql`
      update public.live_progress
      set current_step = 0,
          rounds_completed = 0,
          finished_at = null,
          dnf_partial_reps = 0,
          updated_at = now()
      where class_id = ${classId}
    `);
  }

  async stopSession(classId: number) {
    await globalDb.execute(sql`
      update public.class_sessions
      set status = 'ended', ended_at = now()
      where class_id = ${classId}
    `);
  }
  async pauseSession(classId: number) {
    await globalDb.execute(sql`
      update public.class_sessions
      set status = 'paused',
          paused_at = case when paused_at is null then now() else paused_at end
      where class_id = ${classId}
    `);
  }
  async resumeSession(classId: number) {
    await globalDb.execute(sql`
      update public.class_sessions
      set status = 'live',
          pause_accum_seconds = coalesce(pause_accum_seconds, 0)
                                + coalesce(extract(epoch from (now() - paused_at))::bigint, 0),
          paused_at = null
      where class_id = ${classId}
    `);
  }

  // --- Advance helpers ---
  async ensureProgressRow(classId: number, userId: number) {
    await globalDb.execute(sql`
      insert into public.live_progress (class_id, user_id)
      values (${classId}, ${userId})
      on conflict (class_id, user_id) do nothing
    `);
  }

  async getAdvanceMeta(classId: number) {
    const { rows } = await globalDb.execute(sql`
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
    return rows[0] as any;
  }

  async getElapsedSeconds(startedAt: any, pausedAt: any, pauseAccumSeconds: number): Promise<number> {
    const q = await globalDb.execute(sql`
      select (
        extract(epoch from (now() - ${startedAt}))::bigint
        - ${Number(pauseAccumSeconds)}
        - coalesce(extract(epoch from (now() - ${pausedAt}))::bigint, 0)
      )::bigint as e
    `);
    return Number((q.rows[0] as any)?.e ?? 0);
    }

  async advanceAmrap(classId: number, userId: number, stepCount: number, dir: number) {
    const { rows } = await globalDb.execute(sql`
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
    return rows[0];
  }

  async advanceForTime(classId: number, userId: number, dir: number) {
    const { rows } = await globalDb.execute(sql`
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
    return rows[0];
  }

  async setPartialReps(classId: number, userId: number, reps: number) {
    await globalDb.execute(sql`
      update public.live_progress
      set dnf_partial_reps = ${reps}, updated_at = now()
      where class_id = ${classId} and user_id = ${userId}
    `);
  }

  // --- Realtime leaderboards ---
  async getWorkoutTypeByClass(classId: number): Promise<string | null> {
    const { rows } = await globalDb.execute(sql`
      select w.type
      from public.classes c
      join public.workouts w on w.workout_id = c.workout_id
      where c.class_id = ${classId}
      limit 1
    `);
    return (rows[0] as { type: string })?.type ?? null;
  }

  async realtimeIntervalLeaderboard(classId: number) {
    const { rows } = await globalDb.execute(sql`
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
    return rows;
  }

  async realtimeAmrapLeaderboard(classId: number) {
    const { rows } = await globalDb.execute(sql`
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
    return rows;
  }

  async realtimeForTimeLeaderboard(classId: number) {
    const { rows } = await globalDb.execute(sql`
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
          then extract(epoch from (b.finished_at - b.started_at))::bigint
          else null::bigint
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
    return rows;
  }

  async realtimeEmomLeaderboard(classId: number) {
    // Cumulative time rules:
    // - Past minutes [0..full_minutes-1]: finished -> finish_seconds (0..59), else 60
    // - Current minute (= full_minutes): include ONLY if finished; else 0
    // - Future minutes: 0
    const { rows } = await globalDb.execute(sql`
      with sess as (
        select
          cs.class_id,
          cs.started_at,
          cs.paused_at,
          coalesce(cs.pause_accum_seconds, 0)::bigint as pause_accum_seconds,
          cs.status,
          cs.workout_id
        from public.class_sessions cs
        where cs.class_id = ${classId}
        limit 1
      ),
      plan as (
        select
          s.class_id,
          (w.metadata -> 'emom_repeats') as reps,
          s.started_at,
          s.paused_at,
          s.pause_accum_seconds,
          s.status
        from sess s
        join public.workouts w on w.workout_id = s.workout_id
      ),
      mins as (
        select
          p.class_id,
          coalesce(
            (select sum((x)::int) from jsonb_array_elements_text(coalesce(p.reps, '[]'::jsonb)) x),
            0
          ) as planned_minutes,
          (
            extract(epoch from (now() - p.started_at))::bigint
            - coalesce(p.pause_accum_seconds, 0)
            - coalesce(extract(epoch from (now() - p.paused_at))::bigint, 0)
          )::bigint as elapsed_seconds,
          p.status
        from plan p
      ),
      bound as (
        select
          class_id,
          planned_minutes,
          least(planned_minutes, greatest(0, (elapsed_seconds / 60)::int)) as full_minutes,
          status
        from mins
      ),

      members as (
        select cb.member_id as user_id
        from public.classbookings cb
        where cb.class_id = ${classId}
      ),

      /* ✅ Generate rows ONLY when we actually have past minutes.
        If full_minutes = 0, this produces ZERO rows (no phantom +60). */
      past_idx as (
        select m.user_id, gs.idx as minute_index
        from members m
        cross join bound b
        join lateral (
          select generate_series(0, b.full_minutes - 1) as idx
        ) gs on b.full_minutes > 0
      ),

      past_minutes as (
        select
          p.user_id,
          coalesce(
            case
              when s.finished then greatest(0, least(59, coalesce(s.finish_seconds, 60)))::numeric
              else 60::numeric
            end,
            60::numeric
          ) as minute_time
        from past_idx p
        left join public.live_emom_scores s
          on s.class_id    = ${classId}
        and s.user_id     = p.user_id
        and s.minute_index = p.minute_index
      ),

      past_sum as (
        select user_id, coalesce(sum(minute_time), 0)::numeric as total_past
        from past_minutes
        group by user_id
      ),

      /* Current minute: include ONLY if finished (else 0) */
      current_sum as (
        select
          m.user_id,
          coalesce((
            select greatest(0, least(59, coalesce(s.finish_seconds, 60)))::numeric
            from public.live_emom_scores s
            join bound b on true
            where s.class_id     = ${classId}
              and s.user_id      = m.user_id
              and s.minute_index = b.full_minutes
              and s.finished     = true
              and b.full_minutes < b.planned_minutes
              and b.status      <> 'ended'
          ), 0)::numeric as cur_part
        from members m
      ),

      totals as (
        select
          m.user_id,
          coalesce(p.total_past, 0)::numeric + coalesce(c.cur_part, 0)::numeric as total_time
        from members m
        left join past_sum   p on p.user_id = m.user_id
        left join current_sum c on c.user_id = m.user_id
      )

      select
        ${classId}::int as class_id,
        t.user_id,
        u.first_name,
        u.last_name,
        true as finished,                 -- force time display path
        t.total_time as elapsed_seconds,  -- cumulative seconds so far
        null::int as total_reps
      from totals t
      join public.users u on u.user_id = t.user_id
      order by t.total_time asc, u.first_name asc;
    `);
    return rows;
  }

  // --- My progress ---
  // repositories/liveClass/liveClassRepository.ts
  async getMyProgress(classId: number, userId: number) {
    const { rows } = await globalDb.execute(sql`
      select
        lp.current_step,
        lp.finished_at,
        extract(epoch from lp.finished_at)::bigint as finished_at_s,
        lp.dnf_partial_reps,
        lp.rounds_completed,
        case when lp.finished_at is not null
          then extract(epoch from (lp.finished_at - cs.started_at))::bigint
          else null
        end as elapsed_seconds,
        case when w.type = 'AMRAP' then
          (
            (lp.rounds_completed
              * coalesce((cs.steps_cum_reps ->> greatest(jsonb_array_length(cs.steps_cum_reps)-1,0))::int,0))
            + (case when lp.current_step > 0
                  then (cs.steps_cum_reps ->> (lp.current_step-1))::int
                  else 0 end)
            + coalesce(lp.dnf_partial_reps, 0)
          )::int
        else
          (
            (case when lp.current_step > 0
                  then (cs.steps_cum_reps ->> (lp.current_step-1))::int
                  else 0 end)
            + coalesce(lp.dnf_partial_reps, 0)
          )::int
        end as total_reps
      from public.live_progress lp
      join public.class_sessions cs on cs.class_id = lp.class_id
      join public.workouts w on w.workout_id = cs.workout_id
      where lp.class_id = ${classId} and lp.user_id = ${userId}
    `);

    return rows[0] ?? {
      current_step: 0,
      finished_at: null,
      finished_at_s: null,
      dnf_partial_reps: 0,
      rounds_completed: 0,
      elapsed_seconds: null,
      total_reps: 0,
    };
  }


  // --- Interval scores ---
  async getSessionTypeAndSteps(classId: number) {
    const { rows } = await globalDb.execute(sql`
      select cs.steps, w.type
      from public.class_sessions cs
      join public.workouts w on w.workout_id = cs.workout_id
      where cs.class_id = ${classId}
      limit 1
    `);
    return rows[0] as any;
  }

  async assertMemberBooked(classId: number, userId: number) {
    const booked = await globalDb.select().from(classbookings)
      .where(and(eq(classbookings.classId, classId), eq(classbookings.memberId, userId))).limit(1);
    if (booked.length === 0) throw new Error('NOT_BOOKED');
  }

  async upsertIntervalScore(classId: number, userId: number, stepIndex: number, reps: number) {
    await globalDb.execute(sql`
      insert into public.live_interval_scores (class_id, user_id, step_index, reps)
      values (${classId}, ${userId}, ${stepIndex}, ${reps})
      on conflict (class_id, user_id, step_index) do update
        set reps = excluded.reps, updated_at = now()
    `);
  }

  async intervalLeaderboard(classId: number) {
    const { rows } = await globalDb.execute(sql`
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
    return rows.map((r: any) => ({
      user_id: r.user_id,
      total_reps: Number(r.total_reps ?? 0),
      display_score: `${Number(r.total_reps ?? 0)} reps`,
      first_name: r.first_name,
      last_name: r.last_name,
    }));
  }

  // --- Scores ---
  async assertCoachOwnsClass(classId: number, coachId: number) {
    const rows = await globalDb.select({ coachId: classes.coachId })
      .from(classes).where(eq(classes.classId, classId)).limit(1);
    const cls = rows[0];
    if (!cls || Number(cls.coachId) !== Number(coachId)) throw new Error('NOT_CLASS_COACH');
  }

  async upsertScoresBatch(classId: number, rows: { userId: number; score: number }[]) {
    let updated = 0;
    for (const row of rows) {
      if (!Number.isFinite(row.userId) || !Number.isFinite(row.score) || row.score < 0) continue;
      await globalDb
        .insert(classattendance)
        .values({ classId, memberId: row.userId, score: row.score })
        .onConflictDoUpdate({
          target: [classattendance.classId, classattendance.memberId],
          set: { score: row.score },
        });
      updated += 1;
    }
    return updated;
  }

  async upsertMemberScore(classId: number, userId: number, score: number) {
    await globalDb
      .insert(classattendance)
      .values({ classId, memberId: userId, score })
      .onConflictDoUpdate({
        target: [classattendance.classId, classattendance.memberId],
        set: { score },
      });
  }

  // --- Notes ---
  async getCoachNote(classId: number) {
    const { rows } = await globalDb.execute(sql`
      select coach_notes from public.class_sessions where class_id = ${classId} limit 1
    `);
    return (rows[0] as any)?.coach_notes ?? null;
  }

  async setCoachNote(classId: number, text: string) {
    await globalDb.execute(sql`
      update public.class_sessions
      set coach_notes = ${text}
      where class_id = ${classId}
    `);
  }

  // --- Coach edit: FOR_TIME finish ---
  async setForTimeFinish(classId: number, userId: number, finishSeconds: number | null, startedAt: any) {
    if (finishSeconds == null) {
      await globalDb.execute(sql`
        update public.live_progress
        set finished_at = null, updated_at = now()
        where class_id = ${classId} and user_id = ${userId}
      `);
    } else {
      await globalDb.execute(sql`
        update public.live_progress
        set finished_at = (${startedAt} + make_interval(secs => ${Math.max(0, Number(finishSeconds))})), updated_at = now()
        where class_id = ${classId} and user_id = ${userId}
      `);
    }
  }

  // --- Coach edit: AMRAP map from total reps ---
  async setAmrapProgress(classId: number, userId: number, rounds: number, currentStep: number, partial: number) {
    await globalDb.execute(sql`
      update public.live_progress
      set rounds_completed = ${Math.max(0, rounds)},
          current_step     = ${Math.max(0, currentStep)},
          dnf_partial_reps = ${Math.max(0, partial)},
          updated_at       = now()
      where class_id = ${classId} and user_id = ${userId}
    `);
  }

  // --- Coach edit: EMOM mark ---
  async upsertEmomMark(classId: number, userId: number, minuteIndex: number, finished: boolean, finishSeconds: number) {
    await globalDb.execute(sql`
      insert into public.live_emom_scores (class_id, user_id, minute_index, finished, finish_seconds)
      values (${classId}, ${userId}, ${minuteIndex}, ${finished}, ${finishSeconds})
      on conflict (class_id, user_id, minute_index) do update
        set finished = excluded.finished,
            finish_seconds = excluded.finish_seconds,
            updated_at = now()
    `);
  }

}
