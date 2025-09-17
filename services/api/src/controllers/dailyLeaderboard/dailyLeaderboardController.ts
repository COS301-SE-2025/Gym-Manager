// services/api/src/controllers/dailyLeaderboard/dailyLeaderboardController.ts
import { Request, Response } from 'express';
import { IDailyLeaderboardService } from '../../services/dailyLeaderboard/dailyLeaderboardService';

export class DailyLeaderboardController {
  constructor(private service: IDailyLeaderboardService) {}

  getDailyLeaderboard = async (req: Request, res: Response) => {
    try {
      const date = req.query.date as string | undefined;
      const scaling = req.query.scaling as string | undefined;
      
      const leaderboard = await this.service.getDailyLeaderboard(date, scaling);
      
      const response = {
        success: true,
        date: date || new Date().toISOString().slice(0, 10),
        scaling: scaling || 'all',
        leaderboard,
        total: leaderboard.length,
        message: leaderboard.length > 0 
          ? `Found ${leaderboard.length} members with public scores${scaling ? ` (${scaling.toUpperCase()})` : ''}` 
          : `No public scores found for this date${scaling ? ` with ${scaling.toUpperCase()} scaling` : ''}`
      };
      
      return res.json(response);
    } catch (error: any) {
      if (error.message === 'INVALID_DATE_FORMAT') {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid date format. Use YYYY-MM-DD' 
        });
      }
      
      if (error.message === 'FUTURE_DATE_NOT_ALLOWED') {
        return res.status(400).json({ 
          success: false,
          error: 'Cannot fetch leaderboard for future dates' 
        });
      }
      
      if (error.message === 'INVALID_SCALING_TYPE') {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid scaling type. Use "rx" or "sc"' 
        });
      }
      
      return res.status(500).json({ 
        success: false,
        error: 'Failed to fetch daily leaderboard' 
      });
    }
  };
}