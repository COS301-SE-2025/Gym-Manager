import { Request, Response } from 'express';
import { db } from '../db/client';
import { classes, workouts, coaches, members, classbookings, userroles, users } from '../db/schema';
import { eq, and, lte, gte, sql } from 'drizzle-orm';
import { AuthenticatedRequest } from '../middleware/auth';
import { users, classAttendance } from '../db/schema';
import { desc } from 'drizzle-orm';



// GET /leaderboard/:classId
export const getLeaderboard = async (req: Request, res: Response) => {
  const { classId } = req.params;

  if (!classId) {
    return res.status(400).json({ error: "classId is required" });
  }

  try {
    const leaderboard = await db
      .select({
        classId: classAttendance.classId,
        memberId: classAttendance.memberId,
        score: classAttendance.score,
        markedAt: classAttendance.markedAt,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(classAttendance)
      .innerJoin(users, eq(classAttendance.memberId, users.userId))
      .where(eq(classAttendance.classId, parseInt(classId)))
      .orderBy(desc(classAttendance.score));

    res.json(leaderboard);
  } catch (err) {
    console.error("Leaderboard fetch error:", err);
    res.status(500).json({ error: "Failed to get leaderboard" });
  }
};

// GET /live/class
export const getLiveClass = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });

  const userId = req.user.userId;
  let roles = req.user.roles as string[] | undefined;

  if (!roles) {
    const rows = await db
      .select({ role: userroles.userRole })
      .from(userroles)
      .where(eq(userroles.userId, userId));
    roles = rows.map(r => r.role as string);
  }

  const now   = new Date();
  const today = now.toISOString().slice(0, 10);
  const time  = now.toTimeString().slice(0, 8);

  let current: any[] = [];

  // ── coach branch ───────────────────────────────────────────────
  if (roles.includes('coach')) {
    current = await db
      .select({
        classId:         classes.classId,
        scheduledDate:   classes.scheduledDate,
        scheduledTime:   classes.scheduledTime,
        durationMinutes: classes.durationMinutes,
        coachId:         classes.coachId,
        workoutId:       classes.workoutId,
        workoutName:     workouts.workoutName,
        workoutContent:  workouts.workoutContent
      })
      .from(classes)
      .innerJoin(workouts, eq(classes.workoutId, workouts.workoutId))
      .where(
        and(
          eq(classes.coachId, userId),
          eq(classes.scheduledDate, today),
          lte(classes.scheduledTime, time),
          gte(
            sql`(classes.scheduled_time + (classes.duration_minutes || ' minutes')::interval)`,
            time
          )
        )
      )
      .limit(1);

    if (current.length) {
      const participants = await db
        .select({
          userId: classbookings.memberId,
          firstName: users.firstName,
          lastName: users.lastName
        })
        .from(classbookings)
        .innerJoin(users, eq(classbookings.memberId, users.userId))
        .where(eq(classbookings.classId, current[0].classId));

      return res.json({
        ongoing: true,
        roles,
        class: current[0],
        participants
      });
    }
  }

  // ── member branch ──────────────────────────────────────────────
  if (roles.includes('member')) {
    current = await db
      .select({
        classId:         classes.classId,
        scheduledDate:   classes.scheduledDate,
        scheduledTime:   classes.scheduledTime,
        durationMinutes: classes.durationMinutes,
        coachId:         classes.coachId,
        workoutId:       classes.workoutId,
        workoutName:     workouts.workoutName,
        workoutContent:  workouts.workoutContent
      })
      .from(classes)
      .innerJoin(classbookings, eq(classes.classId, classbookings.classId))
      .innerJoin(workouts, eq(classes.workoutId, workouts.workoutId))
      .where(
        and(
          eq(classbookings.memberId, userId),
          eq(classes.scheduledDate, today),
          lte(classes.scheduledTime, time),
          gte(
            sql`(classes.scheduled_time + (classes.duration_minutes || ' minutes')::interval)`,
            time
          )
        )
      )
      .limit(1);

    if (current.length) {
      return res.json({
        ongoing: true,
        roles,
        class: current[0]
      });
    }
  }

  // ── nothing live ───────────────────────────────────────────────
  res.json({ ongoing: false });
};
