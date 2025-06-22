import { Request, Response } from 'express';
import { db } from '../db/client';
import { classes, workouts, coaches, members, classbookings, userroles } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { AuthenticatedRequest } from '../middleware/auth';


// GET /api/leaderboard/:classId
export const getLeaderboard = async (req: Request, res: Response) => {
  const { classId } = req.params;

  const leaderboard = await db
    .select({
      userId: users.userId,
      name: users.name,
      score: scores.score,
    })
    .from(scores)
    .innerJoin(users, eq(scores.userId, users.userId))
    .innerJoin(classParticipants, eq(scores.classId, classParticipants.classId))
    .where(eq(scores.classId, classId))
    .where(eq(classParticipants.showOnLeaderboard, true))
    .orderBy(scores.score, "desc");

  res.json(leaderboard);
};

// PUT /api/leaderboard/visibility
export const editSettings = async (req: AuthenticatedRequest, res: Response) => {
  const { classId, visibility } = req.body;

  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  await db
    .update(classParticipants)
    .set({ showOnLeaderboard: visibility })
    .where(eq(classParticipants.userId, req.user.userId))
    .where(eq(classParticipants.classId, classId));

  res.json({ success: true });
};