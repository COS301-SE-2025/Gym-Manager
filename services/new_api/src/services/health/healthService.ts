import { IHealthService, IHealthRepository } from '../../domain/interfaces/health.interface';
import { HealthCheckResponse } from '../../domain/entities/health.entity';
import { HealthRepository } from '../../repositories/health/healthRepository';

/**
 * HealthService - Business Layer
 * Contains all business logic for health check operations
 */
export class HealthService implements IHealthService {
  private healthRepository: IHealthRepository;
  private startedAt: number;

  constructor(healthRepository?: IHealthRepository) {
    this.healthRepository = healthRepository || new HealthRepository();
    this.startedAt = Number(process.env.APP_STARTED_AT ?? Date.now());
  }

  async checkHealth(): Promise<HealthCheckResponse> {
    const uptimeSec = Math.round((Date.now() - this.startedAt) / 1000);
    const memBytes = process.memoryUsage().rss;

    try {
      // Call repository which will throw on timeout or DB failure
      await this.healthRepository.ping(100);
      
      return {
        ok: true,
        uptime: uptimeSec,
        memory: memBytes,
        version: process.env.npm_package_version,
        db: 'UP',
      };
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Health-check DB ping failed:', errorMessage);
      
      return {
        ok: false,
        uptime: uptimeSec,
        memory: memBytes,
        db: 'DOWN',
        error: errorMessage,
      };
    }
  }
}
