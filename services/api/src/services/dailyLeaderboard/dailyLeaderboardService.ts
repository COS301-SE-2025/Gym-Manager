import { IDailyLeaderboardRepository, DailyLeaderboardEntry } from '../../repositories/dailyLeaderboard/dailyLeaderboardRepository';

export interface IDailyLeaderboardService {
  getDailyLeaderboard(date?: string, scaling?: string): Promise<DailyLeaderboardEntry[]>;
}

export class DailyLeaderboardService implements IDailyLeaderboardService {
  constructor(private repository: IDailyLeaderboardRepository) {}

  async getDailyLeaderboard(date?: string, scaling?: string): Promise<DailyLeaderboardEntry[]> {
    // Default to today in UTC (you might want to adjust timezone)
    const targetDate = date || new Date().toISOString().slice(0, 10);
    
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      throw new Error('INVALID_DATE_FORMAT');
    }

    // Validate date is not in the future (optional business rule)
    const today = new Date().toISOString().slice(0, 10);
    if (targetDate > today) {
      throw new Error('FUTURE_DATE_NOT_ALLOWED');
    }

    // Validate scaling parameter
    if (scaling && !['rx', 'sc'].includes(scaling)) {
      throw new Error('INVALID_SCALING_TYPE');
    }

    return this.repository.getDailyLeaderboard(targetDate, scaling);
  }
}