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

  const userId = req.user.userId;

  try {
    const [member] = await db
      .select({ publicVisibility: members.publicVisibility })
      .from(members)
      .where(eq(members.userId, userId))
      .limit(1);

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

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
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = req.user.userId;
  const { publicVisibility } = req.body;

  // Validate inputs
  if (typeof publicVisibility !== 'boolean') {
    return res.status(400).json({ error: "'publicVisibility' must be a boolean" });
  }

  try {
    const [updated] = await db
      .update(members)
      .set({ publicVisibility })
      .where(eq(members.userId, userId))
      .returning({ userId: members.userId });

    if (!updated) {
      return res.status(404).json({ error: 'Member not found' });
    }

    return res.json({ success: true, userId, publicVisibility });
  } catch (err) {
    console.error('editSettings error:', err);
    return res.status(500).json({ error: 'Failed to update visibility setting' });
  }
};
