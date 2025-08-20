// src/controllers/userSettings.controller.ts
import { Response } from 'express';
import UserRepository from '../repositories/user.repository';
import { AuthenticatedRequest } from '../infrastructure/middleware/authMiddleware';

const userRepo = new UserRepository();

// GET /user/settings
export const getUserSettings = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const userId = req.user.userId;

  try {
    const member = await userRepo.getMemberSettings(userId);
    if (!member) return res.status(404).json({ error: 'Member not found' });

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
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const userId = req.user.userId;
  const { publicVisibility } = req.body;

  if (typeof publicVisibility !== 'boolean') {
    return res.status(400).json({ error: "'publicVisibility' must be a boolean" });
  }

  try {
    const updated = await userRepo.updateMemberVisibility(userId, publicVisibility);
    if (!updated) return res.status(404).json({ error: 'Member not found' });

    return res.json({ success: true, userId: updated.userId, publicVisibility });
  } catch (err) {
    console.error('editSettings error:', err);
    return res.status(500).json({ error: 'Failed to update visibility setting' });
  }
};
