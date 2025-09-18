import { HealthRepository } from '../../../repositories/health/healthRepository';
import { sql } from 'drizzle-orm';

jest.mock('../../../db/client', () => ({
  db: {
    execute: jest.fn(),
  },
}));

describe('HealthRepository', () => {
  let healthRepository: HealthRepository;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    const { db } = require('../../../db/client');
    mockDb = db;
    
    healthRepository = new HealthRepository();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('ping', () => {
    it('should resolve successfully when database responds quickly', async () => {
      mockDb.execute.mockResolvedValue([{ '?column?': 1 }]);

      await expect(healthRepository.ping(1000)).resolves.toBeUndefined();

      expect(mockDb.execute).toHaveBeenCalledWith(sql`SELECT 1`);
    });

    it('should use default timeout of 100ms when not specified', async () => {
      mockDb.execute.mockResolvedValue([{ '?column?': 1 }]);

      await expect(healthRepository.ping()).resolves.toBeUndefined();

      expect(mockDb.execute).toHaveBeenCalledWith(sql`SELECT 1`);
    });

    it('should reject with timeout error when database takes too long', async () => {
      mockDb.execute.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([{ '?column?': 1 }]), 200))
      );

      const pingPromise = healthRepository.ping(100);

      jest.advanceTimersByTime(100);

      await expect(pingPromise).rejects.toThrow('timeout');
    });

    it('should reject with database error when query fails', async () => {
      const dbError = new Error('Connection failed');
      mockDb.execute.mockRejectedValue(dbError);

      await expect(healthRepository.ping(1000)).rejects.toThrow('Connection failed');

      expect(mockDb.execute).toHaveBeenCalledWith(sql`SELECT 1`);
    });

    it('should handle very short timeout', async () => {
      mockDb.execute.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([{ '?column?': 1 }]), 10))
      );

      const pingPromise = healthRepository.ping(5);

      jest.advanceTimersByTime(5);

      await expect(pingPromise).rejects.toThrow('timeout');
    });

    it('should handle zero timeout', async () => {
      mockDb.execute.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([{ '?column?': 1 }]), 10))
      );

      const pingPromise = healthRepository.ping(0);

      jest.advanceTimersByTime(1);

      await expect(pingPromise).rejects.toThrow('timeout');
    });

    it('should resolve when database responds exactly at timeout boundary', async () => {
      let resolveDb: (value: any) => void;
      const dbPromise = new Promise(resolve => {
        resolveDb = resolve;
      });
      
      mockDb.execute.mockReturnValue(dbPromise);

      const pingPromise = healthRepository.ping(100);

      jest.advanceTimersByTime(99);
      resolveDb!([{ '?column?': 1 }]);

      await expect(pingPromise).resolves.toBeUndefined();
    });

    it('should handle database returning different result format', async () => {
      mockDb.execute.mockResolvedValue({ rows: [{ value: 1 }] });

      await expect(healthRepository.ping(1000)).resolves.toBeUndefined();

      expect(mockDb.execute).toHaveBeenCalledWith(sql`SELECT 1`);
    });

    it('should handle database returning empty result', async () => {
      mockDb.execute.mockResolvedValue([]);

      await expect(healthRepository.ping(1000)).resolves.toBeUndefined();

      expect(mockDb.execute).toHaveBeenCalledWith(sql`SELECT 1`);
    });

    it('should handle database returning null', async () => {
      mockDb.execute.mockResolvedValue(null);

      await expect(healthRepository.ping(1000)).resolves.toBeUndefined();

      expect(mockDb.execute).toHaveBeenCalledWith(sql`SELECT 1`);
    });

    it('should handle concurrent ping requests', async () => {
      mockDb.execute.mockResolvedValue([{ '?column?': 1 }]);

      const ping1 = healthRepository.ping(1000);
      const ping2 = healthRepository.ping(1000);
      const ping3 = healthRepository.ping(1000);

      await expect(Promise.all([ping1, ping2, ping3])).resolves.toEqual([
        undefined,
        undefined,
        undefined,
      ]);

      expect(mockDb.execute).toHaveBeenCalledTimes(3);
    });

    it('should handle mixed success and timeout in concurrent requests', async () => {
      mockDb.execute
        .mockResolvedValueOnce([{ '?column?': 1 }])
        .mockImplementationOnce(() => 
          new Promise(resolve => setTimeout(() => resolve([{ '?column?': 1 }]), 200))
        )
        .mockResolvedValueOnce([{ '?column?': 1 }]);

      const ping1 = healthRepository.ping(1000);
      const ping2 = healthRepository.ping(100);
      const ping3 = healthRepository.ping(1000);

      jest.advanceTimersByTime(100);

      const results = await Promise.allSettled([ping1, ping2, ping3]);

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');
    });

    it('should handle very large timeout values', async () => {
      mockDb.execute.mockResolvedValue([{ '?column?': 1 }]);

      await expect(healthRepository.ping(Number.MAX_SAFE_INTEGER)).resolves.toBeUndefined();

      expect(mockDb.execute).toHaveBeenCalledWith(sql`SELECT 1`);
    });

    it('should handle negative timeout values', async () => {
      mockDb.execute.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([{ '?column?': 1 }]), 10))
      );

      const pingPromise = healthRepository.ping(-100);

      jest.advanceTimersByTime(1);

      await expect(pingPromise).rejects.toThrow('timeout');
    });

    it('should handle database connection timeout error', async () => {
      const timeoutError = new Error('connect ETIMEDOUT');
      mockDb.execute.mockRejectedValue(timeoutError);

      await expect(healthRepository.ping(1000)).rejects.toThrow('connect ETIMEDOUT');
    });

    it('should handle database authentication error', async () => {
      const authError = new Error('authentication failed');
      mockDb.execute.mockRejectedValue(authError);

      await expect(healthRepository.ping(1000)).rejects.toThrow('authentication failed');
    });

    it('should handle database network error', async () => {
      const networkError = new Error('ENOTFOUND database.example.com');
      mockDb.execute.mockRejectedValue(networkError);

      await expect(healthRepository.ping(1000)).rejects.toThrow('ENOTFOUND database.example.com');
    });

    it('should handle promise rejection with non-Error objects', async () => {
      mockDb.execute.mockRejectedValue('String error');

      await expect(healthRepository.ping(1000)).rejects.toBe('String error');
    });

    it('should handle promise rejection with null', async () => {
      mockDb.execute.mockRejectedValue(null);

      await expect(healthRepository.ping(1000)).rejects.toBeNull();
    });

    it('should handle promise rejection with undefined', async () => {
      mockDb.execute.mockRejectedValue(undefined);

      await expect(healthRepository.ping(1000)).rejects.toBeUndefined();
    });

    it('should handle database slow response that still beats timeout', async () => {
      mockDb.execute.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([{ '?column?': 1 }]), 50))
      );

      const pingPromise = healthRepository.ping(100);

      jest.advanceTimersByTime(50);

      await expect(pingPromise).resolves.toBeUndefined();
    });

    it('should handle multiple timeouts with different values', async () => {
      mockDb.execute.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([{ '?column?': 1 }]), 150))
      );

      const shortPing = healthRepository.ping(100);
      const longPing = healthRepository.ping(200);

      jest.advanceTimersByTime(100);
      
      await expect(shortPing).rejects.toThrow('timeout');

      jest.advanceTimersByTime(50);

      await expect(longPing).resolves.toBeUndefined();
    });
  });

  describe('edge cases and error scenarios', () => {
    it('should handle database execute method throwing synchronously', async () => {
      mockDb.execute.mockImplementation(() => {
        throw new Error('Synchronous error');
      });

      await expect(healthRepository.ping(1000)).rejects.toThrow('Synchronous error');
    });

    it('should handle timeout race condition', async () => {
      let dbResolve: (value: any) => void;
      const dbPromise = new Promise(resolve => {
        dbResolve = resolve;
      });
      
      mockDb.execute.mockReturnValue(dbPromise);

      const pingPromise = healthRepository.ping(100);

      jest.advanceTimersByTime(100);
      
      setTimeout(() => dbResolve!([{ '?column?': 1 }]), 0);

      await expect(pingPromise).rejects.toThrow('timeout');
    });

    it('should handle fractional timeout values', async () => {
      mockDb.execute.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([{ '?column?': 1 }]), 10))
      );

      const pingPromise = healthRepository.ping(5.5);

      jest.advanceTimersByTime(6);

      await expect(pingPromise).rejects.toThrow('timeout');
    });

    it('should handle NaN timeout', async () => {
      mockDb.execute.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([{ '?column?': 1 }]), 10))
      );

      const pingPromise = healthRepository.ping(NaN);

      jest.advanceTimersByTime(1);

      await expect(pingPromise).rejects.toThrow('timeout');
    });

    it('should handle Infinity timeout', async () => {
      mockDb.execute.mockResolvedValue([{ '?column?': 1 }]);

      await expect(healthRepository.ping(Infinity)).resolves.toBeUndefined();
    });

    it('should handle database returning a promise that never resolves', async () => {
      mockDb.execute.mockReturnValue(new Promise(() => {}));

      const pingPromise = healthRepository.ping(50);

      jest.advanceTimersByTime(50);

      await expect(pingPromise).rejects.toThrow('timeout');
    });
  });
});
