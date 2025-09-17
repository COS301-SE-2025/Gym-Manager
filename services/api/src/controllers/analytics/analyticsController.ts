import { Request, Response } from 'express';
import { AnalyticsService } from '../../services/analytics/analyticsService';
import { IAnalyticsRepository } from '../../domain/interfaces/analytics.interface';
import { AnalyticsRepository } from '../../repositories/analytics/analyticsRepository';

const analyticsRepository: IAnalyticsRepository = new AnalyticsRepository();
const analyticsService = new AnalyticsService(analyticsRepository);

export const getLogs = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const logs = await analyticsService.getLogs(startDate as string, endDate as string);
    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve logs', error });
  }
};

export const getSummaryStats = async (req: Request, res: Response) => {
  try {
    const { period } = req.query;
    const stats = await analyticsService.getSummaryStats(period as string);
    res.status(200).json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve summary stats', error });
  }
};