import { HealthService } from '../../services/health/healthService';

describe('HealthService', () => {
  it('returns ok UP when repo ping succeeds', async () => {
    const mockRepo = { ping: jest.fn().mockResolvedValue(undefined) } as any;
    const svc = new HealthService(mockRepo);
    const res = await svc.checkHealth();
    expect(res.ok).toBe(true);
    expect(res.db).toBe('UP');
    expect(typeof res.uptime).toBe('number');
  });

  it('returns DOWN when repo ping fails', async () => {
    const mockRepo = { ping: jest.fn().mockRejectedValue(new Error('boom')) } as any;
    const svc = new HealthService(mockRepo);
    const res = await svc.checkHealth();
    expect(res.ok).toBe(false);
    expect(res.db).toBe('DOWN');
    expect(res.error).toContain('boom');
  });
});


