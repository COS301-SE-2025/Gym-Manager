import { Response } from 'express';
import { AuthenticatedRequest } from '../../infrastructure/middleware/authMiddleware';
import { UserSettingsService } from '../../services/userSettings/userSettingsService';
import { UpdateUserSettingsRequest } from '../../domain/entities/userSettings.entity';

/**
 * UserSettingsController - Controller Layer
 * Handles HTTP requests/responses and delegates business logic to service layer
 */
export class UserSettingsController {
  private userSettingsService: UserSettingsService;

  constructor(userSettingsService?: UserSettingsService) {
    this.userSettingsService = userSettingsService || new UserSettingsService();
  }

  getUserSettings = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = req.user.userId;

    try {
      const result = await this.userSettingsService.getUserSettings(userId);
      return res.json(result);
    } catch (error: any) {
      console.error('getUserSettings error:', error);

      if (error.message === 'Member not found') {
        return res.status(404).json({ error: 'Member not found' });
      }

      return res.status(500).json({ error: 'Failed to fetch user settings' });
    }
  };

  editSettings = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = req.user.userId;
    const { publicVisibility } = req.body;

    try {
      const request: UpdateUserSettingsRequest = {
        publicVisibility,
      };

      const result = await this.userSettingsService.updateUserSettings(userId, request);
      return res.json(result);
    } catch (error: any) {
      console.error('editSettings error:', error);

      if (error.message === "'publicVisibility' must be a boolean") {
        return res.status(400).json({ error: "'publicVisibility' must be a boolean" });
      }

      if (error.message === 'Member not found') {
        return res.status(404).json({ error: 'Member not found' });
      }

      return res.status(500).json({ error: 'Failed to update visibility setting' });
    }
  };
}
