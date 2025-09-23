// services/api/src/repositories/dailyLeaderboard/dailyLeaderboardRepository.ts
import { db as globalDb } from '../../db/client';
import { sql } from 'drizzle-orm';
import {
  classes,
  workouts,
  users,
  members,
  classattendance
} from '../../db/schema';

export interface IDailyLeaderboardRepository {
  getDailyLeaderboard(date: string, scaling?: string): Promise<DailyLeaderboardEntry[]>;
}

export interface DailyLeaderboardEntry {
  userId: number;
  firstName: string;
  lastName: string;
  totalScore: number;      // daily points (sum of per-class points)
  classCount: number;      // how many classes they appeared in that day
  bestScore: number;       // best per-class points that day
  bestWorkoutName: string; // workout name for the bestScore class
  scaling: string;         // 'RX' | 'SC' | 'mixed'
}

type Executor = typeof globalDb | any;

export class DailyLeaderboardRepository implements IDailyLeaderboardRepository {
  private exec(tx?: Executor): Executor { return tx ?? globalDb; }

  async getDailyLeaderboard(date: string, scaling?: string, tx?: Executor): Promise<DailyLeaderboardEntry[]> {
    // Normalize scaling param (controller/service already validate when provided)
    const scalingUpper = (scaling ?? '').toUpperCase(); // 'RX' | 'SC' | ''

    // Raw SQL is easier for conditional ranking + window functions
    const { rows } = await this.exec(tx).execute(sql`
      with base as (
        select
          c.class_id,
          w.workout_name,
          upper(w.type) as workout_type,
          u.user_id,
          u.first_name,
          u.last_name,
          -- Use new rich finals, with safe fallbacks to legacy "score" for historical rows
          case
            when coalesce(ca.finished,false) and upper(w.type) = 'FOR_TIME'
              then coalesce(ca.score_seconds, ca.score)          -- FOR_TIME finisher: seconds
            when upper(w.type) = 'EMOM'
              then coalesce(ca.score_seconds, ca.score)          -- EMOM: seconds
            else coalesce(ca.score_seconds, null)
          end as sec_val,

          case
            when (not coalesce(ca.finished,false)) and upper(w.type) = 'FOR_TIME'
              then coalesce(ca.score_reps, ca.score)             -- FOR_TIME DNF: reps
            when upper(w.type) in ('AMRAP','INTERVAL','TABATA')
              then coalesce(ca.score_reps, ca.score)             -- reps
            else coalesce(ca.score_reps, null)
          end as reps_val,

          coalesce(ca.finished,false) as finished
        from public.classes c
        join public.classattendance ca on ca.class_id = c.class_id
        join public.users u            on u.user_id   = ca.member_id
        join public.members m          on m.user_id   = u.user_id
        left join public.workouts w    on w.workout_id = c.workout_id
        where c.scheduled_date = ${date}
          and m.public_visibility = true
          ${scalingUpper ? sql`and upper(coalesce(ca.scaling,'RX')) = ${scalingUpper}` : sql``}
      ),

      ranked as (
        select
          b.*,
          count(*) over (partition by b.class_id) as participants,
          dense_rank() over (
            partition by b.class_id
            order by
              -- FOR_TIME: finishers first (0), DNFs after (1)
              case when b.workout_type = 'FOR_TIME'
                   then case when b.finished then 0 else 1 end end asc,

              -- FOR_TIME finishers: time ascending (lower is better)
              case when b.workout_type = 'FOR_TIME' and b.finished
                   then b.sec_val end asc,

              -- FOR_TIME DNFs: reps descending
              case when b.workout_type = 'FOR_TIME' and not b.finished
                   then -coalesce(b.reps_val,0) end asc,

              -- AMRAP / INTERVAL / TABATA: reps descending
              case when b.workout_type in ('AMRAP','INTERVAL','TABATA')
                   then -coalesce(b.reps_val,0) end asc,

              -- EMOM: total seconds ascending
              case when b.workout_type = 'EMOM'
                   then b.sec_val end asc,

              -- stable final tiebreaker
              b.first_name asc nulls last,
              b.last_name asc nulls last
          ) as rk
        from base b
      ),

      points as (
        select
          r.*,
          (r.participants - r.rk + 1) as pts
        from ranked r
      ),

      agg as (
        select
          p.user_id,
          min(p.first_name) as first_name,
          min(p.last_name)  as last_name,
          sum(p.pts)::int   as total_points,
          count(*)::int     as class_count,
          max(p.pts)::int   as best_points
        from points p
        group by p.user_id
      ),

      best as (
        -- pick the workout name corresponding to the user's best points
        select distinct on (p.user_id)
          p.user_id,
          p.pts         as best_points,
          p.workout_name
        from points p
        order by p.user_id, p.pts desc, p.class_id asc
      )

      select
        a.user_id      as "userId",
        a.first_name   as "firstName",
        a.last_name    as "lastName",
        a.total_points as "totalScore",
        a.class_count  as "classCount",
        a.best_points  as "bestScore",
        coalesce(b.workout_name, 'Unknown Workout') as "bestWorkoutName",
        ${scalingUpper ? sql`${scalingUpper}` : sql`'mixed'`} as "scaling"
      from agg a
      left join best b on b.user_id = a.user_id
      order by a.total_points desc, a.class_count desc, a.first_name asc
    `);

    // rows already match DailyLeaderboardEntry shape
    return rows as unknown as DailyLeaderboardEntry[];
  }
}
