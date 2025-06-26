import { Request, Response } from 'express';
import { db } from '../db/client';
import { classes, workouts, coaches, members, classbookings, userroles, classattendance } from '../db/schema';
import { eq, and, lte, gte, sql } from 'drizzle-orm';
import { AuthenticatedRequest } from '../middleware/auth';
import { users } from '../db/schema';
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
        classId: classattendance.classId,
        memberId: classattendance.memberId,
        score: classattendance.score,
        markedAt: classattendance.markedAt,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(classattendance)
      .innerJoin(users, eq(classattendance.memberId, users.userId))
      .where(eq(classattendance.classId, parseInt(classId)))
      .orderBy(desc(classattendance.score));

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


// POST /submitScore
export const submitScore = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user)
    return res.status(401).json({ success: false, error: "UNAUTHORIZED" });

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
  if (!classId || typeof classId !== "number")
    return res
      .status(400)
      .json({ success: false, error: "CLASS_ID_REQUIRED" });

  // 2. COACH FLOW
  if (roles.includes("coach") && Array.isArray(req.body.scores)) {
    // Make sure this coach is assigned to that class
    const [cls] = await db
      .select({ coachId: classes.coachId })
      .from(classes)
      .where(eq(classes.classId, classId))
      .limit(1);

    if (!cls || cls.coachId !== userId)
      return res
        .status(403)
        .json({ success: false, error: "NOT_CLASS_COACH" });

    const rows = req.body.scores as { userId: number; score: number }[];

    // Upsert every (classId, memberId) with its score
    for (const row of rows) {
      if (
        typeof row.userId !== "number" ||
        typeof row.score !== "number" ||
        row.score < 0
      )
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
  if (!roles.includes("member"))
    return res
      .status(403)
      .json({ success: false, error: "ROLE_NOT_ALLOWED" });

  const { score } = req.body;
  if (typeof score !== "number" || score < 0)
    return res
      .status(400)
      .json({ success: false, error: "SCORE_REQUIRED" });

  // Check the member is actually booked
  const bookingExists = await db
    .select()
    .from(classbookings)
    .where(
      and(
        eq(classbookings.classId, classId),
        eq(classbookings.memberId, userId)
      )
    )
    .limit(1);

  if (bookingExists.length === 0)
    return res
      .status(403)
      .json({ success: false, error: "NOT_BOOKED" });

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