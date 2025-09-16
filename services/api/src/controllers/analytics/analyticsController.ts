import { Request, Response } from 'express';
import { AnalyticsService } from '../../services/analytics/analyticsService';
import { IAnalyticsRepository } from '../../domain/interfaces/analytics.interface';
import { AnalyticsRepository } from '../../repositories/analytics/analyticsRepository';

export class AnalyticsController {
private analyticsRepository: IAnalyticsRepository = new AnalyticsRepository();
private analyticsService = new AnalyticsService(this.analyticsRepository);

public getLogs = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const logs = await this.analyticsService.getLogs(startDate as string, endDate as string);
    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve logs', error });
  }
};
}