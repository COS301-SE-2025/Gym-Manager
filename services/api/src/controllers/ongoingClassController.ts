import { Request, Response } from 'express';
import { db } from '../db/client';
import { classes, workouts, coaches, members, classbookings, userroles } from '../db/schema';
import { eq, and, lte, gte, sql } from 'drizzle-orm';
import { AuthenticatedRequest } from '../middleware/auth';


// GET /api/leaderboard/:classId
// export const getLeaderboard = async (req: Request, res: Response) => {
//   const { classId } = req.params;

//   const leaderboard = await db
//     .select({
//       userId: users.userId,
//       name: users.name,
//       score: scores.score,
//     })
//     .from(scores)
//     .innerJoin(users, eq(scores.userId, users.userId))
//     .innerJoin(classParticipants, eq(scores.classId, classParticipants.classId))
//     .where(eq(scores.classId, classId))
//     .where(eq(classParticipants.showOnLeaderboard, true))
//     .orderBy(scores.score, "desc");

//   res.json(leaderboard);
// };


// GET /getCurrentClass
export const getCurrentClass = async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const memberId = req.user.userId;

  // current date & time
  const now   = new Date();
  const today = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const time  = now.toTimeString().slice(0, 8); // HH:MM:SS

  const current = await db
    .select({
      classId: classes.classId,
      scheduledDate: classes.scheduledDate,
      scheduledTime: classes.scheduledTime,
      durationMinutes: classes.durationMinutes,
      coachId: classes.coachId,
      workoutId: classes.workoutId,
    })
    .from(classes)
    .innerJoin(
      classbookings,
      eq(classes.classId, classbookings.classId)
    )
    .where(
      and(
        eq(classbookings.memberId, memberId),
        eq(classes.scheduledDate, today),
        lte(classes.scheduledTime, time),
        gte(
          sql`(classes.scheduled_time + (classes.duration_minutes || ' minutes')::interval)`,
          time
        )
      )
    )
    .limit(1);

  if (current.length === 0) return res.json({ ongoing: false });

  res.json({ ongoing: true, class: current[0] });
};