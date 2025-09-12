import { HealthStatus, HealthCheckResponse } from '../entities/health.entity';

export interface IHealthService {
  checkHealth(): Promise<HealthCheckResponse>;
}

export interface IHealthRepository {
  ping(timeout: number): Promise<void>;
}
