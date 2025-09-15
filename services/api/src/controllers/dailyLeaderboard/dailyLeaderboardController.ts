// services/api/src/controllers/dailyLeaderboard/dailyLeaderboardController.ts
import { Request, Response } from 'express';
import { IDailyLeaderboardService } from '../../services/dailyLeaderboard/dailyLeaderboardService';

export class DailyLeaderboardController {
  constructor(private service: IDailyLeaderboardService) {
    console.log('🔵 DailyLeaderboardController: Constructor called');
  }

  getDailyLeaderboard = async (req: Request, res: Response) => {
    console.log('🟢 DailyLeaderboardController: getDailyLeaderboard method called');
    console.log('🟢 Request query:', req.query);
    console.log('🟢 Request user:', (req as any).user);
    
    try {
      const date = req.query.date as string | undefined;
      console.log('🔵 DailyLeaderboardController: Calling service with date:', date);
      
      const leaderboard = await this.service.getDailyLeaderboard(date);
      console.log('🔵 DailyLeaderboardController: Service returned:', leaderboard.length, 'entries');
      
      const response = {
        success: true,
        date: date || new Date().toISOString().slice(0, 10),
        leaderboard,
        total: leaderboard.length,
        message: leaderboard.length > 0 
          ? `Found ${leaderboard.length} members with public scores` 
          : 'No public scores found for this date'
      };
      
      console.log('✅ DailyLeaderboardController: Sending successful response');
      return res.json(response);
    } catch (error: any) {
      console.error('❌ DailyLeaderboardController: Error occurred:', error);
      
      if (error.message === 'INVALID_DATE_FORMAT') {
        console.log('🔴 DailyLeaderboardController: Invalid date format error');
        return res.status(400).json({ 
          success: false,
          error: 'Invalid date format. Use YYYY-MM-DD' 
        });
      }
      
      if (error.message === 'FUTURE_DATE_NOT_ALLOWED') {
        console.log('🔴 DailyLeaderboardController: Future date error');
        return res.status(400).json({ 
          success: false,
          error: 'Cannot fetch leaderboard for future dates' 
        });
      }
      
      console.log('🔴 DailyLeaderboardController: Generic error, sending 500');
      return res.status(500).json({ 
        success: false,
        error: 'Failed to fetch daily leaderboard' 
      });
    }
  };
}