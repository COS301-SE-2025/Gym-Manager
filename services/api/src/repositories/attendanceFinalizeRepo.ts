// src/repositories/attendanceFinalizeRepo.ts
import { sql } from 'slonik';
import { globalDb } from '../db'; // your pooled slonik / db wrapper

type LbRow = {
  user_id: number;
  finished: boolean | null;
  elapsed_seconds: number | null;
  total_reps: number | null;
};

export class AttendanceFinalizeRepo {
  /**
   * Returns workout type string for a class (e.g., 'FOR_TIME','AMRAP','INTERVAL','TABATA','EMOM')
   * Source of truth = the live session joined to the workout.
   */
  async getWorkoutTypeForClass(classId: number): Promise<string | null> {
    const { rows } = await globalDb.execute(sql`
      SELECT UPPER(w.type) AS type
      FROM public.class_sessions cs
      JOIN public.workouts w ON w.workout_id = cs.workout_id
      WHERE cs.class_id = ${classId}
      LIMIT 1;
    `);
    return rows[0]?.type ?? null;
  }

  /**
   * Pulls the same numbers your live leaderboard shows.
   * Keep this aligned with your existing leaderboard SQL per type.
   * Returns: user_id, finished, elapsed_seconds (time types), total_reps (rep types)
   */
  async getFinalLeaderboardSnapshot(classId: number): Promise<LbRow[]> {
    // If you have different SQL per type, you can branch here.
    // A generic "unified" leaderboard SQL is often easier to reuse.
    const { rows } = await globalDb.execute(sql`
      SELECT user_id, finished, elapsed_seconds, total_reps
      FROM public.live_leaderboard_view  -- <— If you don’t have a view, swap in your existing leaderboard CTE
      WHERE class_id = ${classId}
      ORDER BY user_id ASC;
    `);
    return rows as any;
  }

  /**
   * Minimal upsert to classattendance using the snapshot:
   * - FOR_TIME / EMOM => write final_time_seconds
   * - AMRAP / INTERVAL / TABATA => write final_total_reps
   */
  async finalizeClassAttendance(classId: number): Promise<void> {
    const type = (await this.getWorkoutTypeForClass(classId)) ?? '';

    // grab the latest scoreboard snapshot (exactly what UI shows)
    const snap = await this.getFinalLeaderboardSnapshot(classId);

    // Upsert one row per member based on type family
    const isTime = type === 'FOR_TIME' || type === 'EMOM';
    const isReps = type === 'AMRAP' || type === 'INTERVAL' || type === 'TABATA';

    // Nothing to do if unknown type
    if (!isTime && !isReps) return;

    // Build a single VALUES list for efficient upsert
    if (snap.length === 0) return;

    // Slonik insert … on conflict do update
    await globalDb.transaction(async (trx) => {
      for (const r of snap) {
        await trx.execute(sql`
          INSERT INTO public.classattendance (class_id, member_id, final_time_seconds, final_total_reps, updated_at)
          VALUES (
            ${classId},
            ${r.user_id},
            ${isTime ? (r.elapsed_seconds ?? null) : null},
            ${isReps ? (r.total_reps ?? null)       : null},
            now()
          )
          ON CONFLICT (class_id, member_id) DO UPDATE
          SET
            final_time_seconds = COALESCE(EXCLUDED.final_time_seconds, classattendance.final_time_seconds),
            final_total_reps   = COALESCE(EXCLUDED.final_total_reps,   classattendance.final_total_reps),
            updated_at         = now();
        `);
      }
    });
  }

  /**
   * Post-class coach edit for INTERVAL: overwrite the stored final reps.
   * Only callable AFTER the workout has ended.
   */
  async editIntervalFinalReps(classId: number, memberId: number, totalReps: number): Promise<void> {
    // sanity: ensure class really is INTERVAL and ended
    const { rows } = await globalDb.execute(sql`
      SELECT UPPER(w.type) AS type, cs.status
      FROM public.class_sessions cs
      JOIN public.workouts w ON w.workout_id = cs.workout_id
      WHERE cs.class_id = ${classId}
      LIMIT 1;
    `);
    const row = rows[0];
    if (!row) throw new Error('SESSION_NOT_FOUND');
    if (row.type !== 'INTERVAL') throw new Error('NOT_INTERVAL');
    if (row.status !== 'ended') throw new Error('NOT_ENDED');

    await globalDb.execute(sql`
      INSERT INTO public.classattendance (class_id, member_id, final_total_reps, updated_at)
      VALUES (${classId}, ${memberId}, ${Math.max(0, Number(totalReps) || 0)}, now())
      ON CONFLICT (class_id, member_id) DO UPDATE
      SET final_total_reps = EXCLUDED.final_total_reps,
          updated_at       = now();
    `);
  }
}

export const attendanceFinalizeRepo = new AttendanceFinalizeRepo();
