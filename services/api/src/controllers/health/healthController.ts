import { Request, Response } from 'express';
import { HealthService } from '../../services/health/healthService';

/**
 * HealthController - Controller Layer
 * Handles HTTP requests/responses and delegates business logic to service layer
 */
export class HealthController {
  private healthService: HealthService;

  constructor(healthService?: HealthService) {
    this.healthService = healthService || new HealthService();
  }

  healthCheck = async (_req: Request, res: Response) => {
    try {
      const result = await this.healthService.checkHealth();
      
      if (result.ok) {
        return res.json(result);
      } else {
        return res.status(503).json(result);
      }
    } catch (error: any) {
      console.error('Health check error:', error);
      return res.status(503).json({
        ok: false,
        uptime: 0,
        db: 'DOWN',
        error: 'Health check failed'
      });
    }
  };
}
