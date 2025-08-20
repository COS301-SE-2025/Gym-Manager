export interface HealthStatus {
  ok: boolean;
  uptime: number;
  memory: number;
  version?: string;
  db: 'UP' | 'DOWN';
  error?: string;
}

export interface HealthCheckResponse {
  ok: boolean;
  uptime: number;
  memory: number;
  version?: string;
  db: 'UP' | 'DOWN';
  error?: string;
}
