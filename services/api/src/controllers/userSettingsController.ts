import { Request, Response } from 'express';
import { db } from '../db/client';
import { classes, workouts, coaches, members, classbookings, userroles } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { AuthenticatedRequest } from '../middleware/auth';

import { Request, Response } from "express";
import { db } from "../db/client";
import { members } from "../db/schema";
import { eq } from "drizzle-orm";
import { AuthenticatedRequest } from "../middleware/auth";

// PATCH /user/settings/visibility
export const editSettings = async (req: Request, res: Response) => {
  const { userId, publicVisibility } = req.body;

  // Validate inputs
  if (typeof userId !== "number") {
    return res.status(400).json({ error: "'userId' must be a number" });
  }
  if (typeof publicVisibility !== "boolean") {
    return res
      .status(400)
      .json({ error: "'publicVisibility' must be a boolean" });
  }

  try {
    const [updated] = await db
      .update(members)
      .set({ [members.publicVisibility]: publicVisibility })
      .where(eq(members.userId, userId))
      .returning({ userId: members.userId });

    if (!updated) {
      return res.status(404).json({ error: "Member not found" });
    }

    return res.json({ success: true, userId, publicVisibility });
  } catch (err) {
    console.error("editSettings error:", err);
    return res
      .status(500)
      .json({ error: "Failed to update visibility setting" });
  }
};