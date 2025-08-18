<<<<<<< HEAD
// src/controllers/userSettings.controller.ts
import { Response } from 'express';
import UserRepository from '../repositories/user.repository';
import { AuthenticatedRequest } from '../middleware/auth';

const userRepo = new UserRepository();

// GET /user/settings
export const getUserSettings = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
=======
import { Response } from 'express';
import { db } from '../db/client';
import { members } from '../db/schema';
import { eq } from 'drizzle-orm';
import { AuthenticatedRequest } from '../middleware/auth';

// GET /user/settings
export const getUserSettings = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
>>>>>>> c1781474751a74e1b8038e2937c0ae609c4776a3

  const userId = req.user.userId;

  try {
<<<<<<< HEAD
    const member = await userRepo.getMemberSettings(userId);
    if (!member) return res.status(404).json({ error: 'Member not found' });
=======
    const [member] = await db
      .select({ publicVisibility: members.publicVisibility })
      .from(members)
      .where(eq(members.userId, userId))
      .limit(1);

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }
>>>>>>> c1781474751a74e1b8038e2937c0ae609c4776a3

    return res.json({
      success: true,
      settings: {
        publicVisibility: member.publicVisibility,
      },
    });
  } catch (err) {
    console.error('getUserSettings error:', err);
    return res.status(500).json({ error: 'Failed to fetch user settings' });
  }
};

// POST /user/settings/visibility
export const editSettings = async (req: AuthenticatedRequest, res: Response) => {
<<<<<<< HEAD
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
=======
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
>>>>>>> c1781474751a74e1b8038e2937c0ae609c4776a3

  const userId = req.user.userId;
  const { publicVisibility } = req.body;

<<<<<<< HEAD
=======
  // Validate inputs
>>>>>>> c1781474751a74e1b8038e2937c0ae609c4776a3
  if (typeof publicVisibility !== 'boolean') {
    return res.status(400).json({ error: "'publicVisibility' must be a boolean" });
  }

  try {
<<<<<<< HEAD
    const updated = await userRepo.updateMemberVisibility(userId, publicVisibility);
    if (!updated) return res.status(404).json({ error: 'Member not found' });

    return res.json({ success: true, userId: updated.userId, publicVisibility });
=======
    const [updated] = await db
      .update(members)
      .set({ publicVisibility })
      .where(eq(members.userId, userId))
      .returning({ userId: members.userId });

    if (!updated) {
      return res.status(404).json({ error: 'Member not found' });
    }

    return res.json({ success: true, userId, publicVisibility });
>>>>>>> c1781474751a74e1b8038e2937c0ae609c4776a3
  } catch (err) {
    console.error('editSettings error:', err);
    return res.status(500).json({ error: 'Failed to update visibility setting' });
  }
};
