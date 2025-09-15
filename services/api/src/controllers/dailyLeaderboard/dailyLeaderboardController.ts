import { Request, Response } from 'express';
import { IDailyLeaderboardService, DailyLeaderboardEntry } from '../../services/dailyLeaderboard/dailyLeaderboardService';

export class DailyLeaderboardController {
  constructor(private service: IDailyLeaderboardService) {}

  getDailyLeaderboard = async (req: Request, res: Response) => {
    try {
      const date = req.query.date as string | undefined;
      const leaderboard = await this.service.getDailyLeaderboard(date);
      
      return res.json({
        success: true,
        date: date || new Date().toISOString().slice(0, 10),
        leaderboard,
        total: leaderboard.length,
        message: leaderboard.length > 0 
          ? `Found ${leaderboard.length} members with public scores` 
          : 'No public scores found for this date'
      });
    } catch (error: any) {
      console.error('Daily leaderboard error:', error);
      
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
      
      return res.status(500).json({ 
        success: false,
        error: 'Failed to fetch daily leaderboard' 
      });
    }
  };
}