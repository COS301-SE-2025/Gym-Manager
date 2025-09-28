/**
 * ongoingClassController.test.ts
 * Unit tests for getLeaderboard, getLiveClass, submitScore
 */
import { LiveClassController } from '../../../controllers/liveClass/liveClassController';
import { db } from '../../../db/client';
import { Request, Response } from 'express';
import { builder } from '../../builder';

// Create controller instance for testing
const controller = new LiveClassController();

// ──────────────────── Drizzle Mock ──────────────────────────
var insertMock: jest.Mock;

jest.mock('../../../db/client', () => {
  insertMock = jest.fn(() => ({
    values: () => ({
      onConflictDoUpdate: () => Promise.resolve(),
    }),
  }));

  return {
    db: {
      select : jest.fn(),
      insert : (...args: any[]) => insertMock(...args),
      execute : jest.fn(),
    },
  };
});

beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});


// ──────────────────── Helpers ───────────────────────────────
const mockReq = (
  uid?: number,
  roles: string[] = [],
  extras: Record<string, unknown> = {}
): Request =>
  ({ user: uid ? { userId: uid, roles } : undefined, ...extras } as unknown as Request);

const mockRes = (): Response => {
  const r: any = {};
  r.status = jest.fn().mockReturnValue(r);
  r.json   = jest.fn().mockReturnValue(r);
  return r;
};

// Silence console noise from expected error branches
jest.spyOn(console, 'error').mockImplementation(() => {});
jest.spyOn(console, 'log').mockImplementation(() => {});

// Fix time so getLiveClass comparisons are deterministic
const NOW = new Date('2025-06-26T12:00:00Z');
jest.useFakeTimers().setSystemTime(NOW);

// clear stubs between tests
afterEach(jest.clearAllMocks);


// ──────────────── getLeaderboard ────────────────────────────
describe('getLeaderboard', () => {
  it('400 if classId missing', async () => {
    const res = mockRes();
    await controller.getLeaderboard(mockReq(1, [], { params: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns ordered rows', async () => {
    const rows = [{ classId: 5, memberId: 2, score: 90 }];
    (db.select as jest.Mock).mockReturnValue(builder(rows));
    const req = mockReq(1, [], { params: { classId: '5' } });
    const res = mockRes();
    await controller.getLeaderboard(req, res);
    expect(res.json).toHaveBeenCalledWith(rows);
  });
});


// ──────────────── getLiveClass ──────────────────────────────
describe('getLiveClass', () => {
  const today = NOW.toISOString().slice(0, 10);
  const eleven = '11:59:00';

  it('401 when missing user', async () => {
    const res = mockRes();
    await controller.getLiveClass(mockReq(undefined), res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('coach branch returns participants', async () => {
    (db.select as jest.Mock)
      .mockReturnValueOnce(builder([{
        classId: 7,
        scheduledDate: today,
        scheduledTime: eleven,
        durationMinutes: 60,
        coachId: 30,
        workoutId: 1,
        workoutName: 'Blast',
        workoutContent: '...'
      }]))
      .mockReturnValueOnce(builder([{ userId: 40 }, { userId: 41 }]));

    const req = mockReq(30, ['coach']);
    const res = mockRes();
    await controller.getLiveClass(req, res);

    expect(res.json).toHaveBeenCalledWith({
      ongoing: true,
      roles: ['coach'],
      class: expect.objectContaining({ classId: 7 }),
      participants: [{ userId: 40 }, { userId: 41 }],
    });
  });

  it('member branch returns own class', async () => {
    (db.select as jest.Mock).mockReturnValue(builder([{
      classId: 9,
      scheduledDate: today,
      scheduledTime: eleven,
      durationMinutes: 30,
      coachId: 60,
      workoutId: 3,
      workoutName: 'Core',
      workoutContent: '...'
    }]));

    const req = mockReq(50, ['member']);
    const res = mockRes();
    await controller.getLiveClass(req, res);

    expect(res.json).toHaveBeenCalledWith({
      ongoing: true,
      roles: ['member'],
      class: expect.objectContaining({ classId: 9 })
    });
  });

  it('returns ongoing=false when nothing live', async () => {
    (db.select as jest.Mock).mockReturnValue(builder([]));
    const res = mockRes();
    await controller.getLiveClass(mockReq(99, ['member']), res);
    expect(res.json).toHaveBeenCalledWith({ ongoing: false });
  });
});


// ──────────────── submitScore ───────────────────────────────
describe('submitScore', () => {
  const baseReq = (userId: number, roles: string[], body: any) =>
    mockReq(userId, roles, { body });

  it('401 when unauthenticated', async () => {
    const res = mockRes();
    await controller.submitScore(mockReq(undefined), res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  describe('coach flow', () => {
    it('403 if coach not assigned to class', async () => {
      (db.select as jest.Mock).mockReturnValue(builder([{ coachId: 999 }])); // wrong coach
      const req = baseReq(30, ['coach'], {
        classId: 8,
        scores: [{ userId: 2, score: 90 }],
      });
      const res = mockRes();
      await controller.submitScore(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('successfully upserts scores', async () => {
      (db.select as jest.Mock).mockReturnValue(builder([{ coachId: 30 }]));
      const req = baseReq(30, ['coach'], {
        classId: 8,
        scores: [
          { userId: 2, score: 90 },
          { userId: 3, score: 70 },
        ],
      });
      const res = mockRes();
      await controller.submitScore(req, res);
      // insert called twice
      expect(insertMock).toHaveBeenCalledTimes(2);
      expect(res.json).toHaveBeenCalledWith({ success: true, updated: 2 });
    });
  });

  describe('member flow', () => {
    it('403 if not booked', async () => {
      // bookingExists query returns empty
      (db.select as jest.Mock).mockReturnValue(builder([]));
      const req = baseReq(40, ['member'], { classId: 5, score: 55 });
      const res = mockRes();
      await controller.submitScore(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('inserts own score', async () => {
      // bookingExists query returns one row
      (db.select as jest.Mock).mockReturnValue(builder([{}]));
      const req = baseReq(40, ['member'], { classId: 5, score: 60 });
      const res = mockRes();
      await controller.submitScore(req, res);
      expect(insertMock).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });
  });
});

describe('getWorkoutSteps', () => {
  it('should return workout steps successfully', async () => {
    const mockSteps = [{ exerciseName: 'Pushups', reps: 10 }];
    const mockStepsCumReps = [10];
    const mockWorkoutType = 'AMRAP';
    
    (db.execute as jest.Mock).mockResolvedValue({
      rows: [{ type: mockWorkoutType }]
    });

    const req = mockReq(1, ['member'], { params: { workoutId: '1' } });
    const res = mockRes();
    
    await controller.getWorkoutSteps(req, res);
    
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      workoutType: mockWorkoutType
    }));
  });

  it('should return 400 for invalid workout ID', async () => {
    const req = mockReq(1, ['member'], { params: { workoutId: 'invalid' } });
    const res = mockRes();
    
    await controller.getWorkoutSteps(req, res);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'INVALID_WORKOUT_ID' });
  });
});

describe('startLiveClass', () => {
  it('should return 401 when user is not authenticated', async () => {
    const req = mockReq();
    const res = mockRes();
    
    await controller.startLiveClass(req, res);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'UNAUTHORIZED' });
  });

  it('should handle class not found error', async () => {
    (db.execute as jest.Mock).mockResolvedValue({ rows: [] });
    
    const req = mockReq(1, ['coach'], { params: { classId: '1' } });
    const res = mockRes();
    
    await controller.startLiveClass(req, res);
    
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'CLASS_NOT_FOUND' });
  });
});

describe('stopLiveClass', () => {
  it('should stop live class successfully', async () => {
    (db.execute as jest.Mock).mockResolvedValue({ rows: [] });
    
    const req = mockReq(1, ['coach'], { params: { classId: '1' } });
    const res = mockRes();
    
    await controller.stopLiveClass(req, res);
    
    expect(res.json).toHaveBeenCalledWith({ ok: true, classId: 1 });
  });

  it('should return 401 when user is not authenticated', async () => {
    const req = mockReq();
    const res = mockRes();
    
    await controller.stopLiveClass(req, res);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'UNAUTHORIZED' });
  });
});

describe('advanceProgress', () => {
  it('should return 401 when user is not authenticated', async () => {
    const req = mockReq();
    const res = mockRes();
    
    await controller.advanceProgress(req, res);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'UNAUTHORIZED' });
  });

  it('should handle class session not started error', async () => {
    (db.execute as jest.Mock).mockResolvedValue({ rows: [] });
    
    const req = mockReq(1, ['member'], { 
      params: { classId: '1' },
      body: { direction: 'next' }
    });
    const res = mockRes();
    
    await controller.advanceProgress(req, res);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'CLASS_SESSION_NOT_STARTED' });
  });
});

describe('submitPartial', () => {
  it('should submit partial score successfully', async () => {
    // Mock the session check and then the partial submission
    (db.execute as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ started_at: new Date() }] }) // Session exists
      .mockResolvedValueOnce({ rows: [{ reps: 10 }] }); // Return the same reps as input
    
    const req = mockReq(1, ['member'], { 
      params: { classId: '1' },
      body: { reps: 10 }
    });
    const res = mockRes();
    
    await controller.submitPartial(req, res);
    
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      ok: true,
      reps: 10
    }));
  });

  it('should return 401 when user is not authenticated', async () => {
    const req = mockReq();
    const res = mockRes();
    
    await controller.submitPartial(req, res);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'UNAUTHORIZED' });
  });
});

describe('getRealtimeLeaderboard', () => {
  it('should handle workout not found error', async () => {
    (db.execute as jest.Mock).mockResolvedValue({ rows: [] });
    
    const req = mockReq(1, ['member'], { params: { classId: '1' } });
    const res = mockRes();
    
    await controller.getRealtimeLeaderboard(req, res);
    
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'WORKOUT_NOT_FOUND_FOR_CLASS' });
  });

  it('should handle database errors', async () => {
    (db.execute as jest.Mock).mockRejectedValue(new Error('Database error'));
    
    const req = mockReq(1, ['member'], { params: { classId: '1' } });
    const res = mockRes();
    
    await controller.getRealtimeLeaderboard(req, res);
    
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'LEADERBOARD_FAILED' });
  });
});

describe('getMyProgress', () => {
  it('should return user progress successfully', async () => {
    const mockProgress = { currentStep: 3, totalSteps: 5, completed: false };
    
    (db.execute as jest.Mock).mockResolvedValue({ rows: [mockProgress] });
    
    const req = mockReq(1, ['member'], { params: { classId: '1' } });
    const res = mockRes();
    
    await controller.getMyProgress(req, res);
    
    expect(res.json).toHaveBeenCalledWith(mockProgress);
  });

  it('should return 401 when user is not authenticated', async () => {
    const req = mockReq();
    const res = mockRes();
    
    await controller.getMyProgress(req, res);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'UNAUTHORIZED' });
  });
});

describe('postIntervalScore', () => {
  it('should return 401 when user is not authenticated', async () => {
    const req = mockReq();
    const res = mockRes();
    
    await controller.postIntervalScore(req, res);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'UNAUTHORIZED' });
  });

  it('should handle session not found error', async () => {
    (db.execute as jest.Mock).mockResolvedValue({ rows: [] });
    
    const req = mockReq(1, ['member'], { 
      params: { classId: '1' },
      body: { stepIndex: 2, reps: 15 }
    });
    const res = mockRes();
    
    await controller.postIntervalScore(req, res);
    
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'SESSION_NOT_FOUND' });
  });

  it('should handle invalid step index', async () => {
    (db.execute as jest.Mock).mockRejectedValue(new Error('INVALID_STEP_INDEX'));
    
    const req = mockReq(1, ['member'], { 
      params: { classId: '1' },
      body: { stepIndex: -1, reps: 10 }
    });
    const res = mockRes();
    
    await controller.postIntervalScore(req, res);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'INVALID_STEP_INDEX' });
  });
});

describe('getIntervalLeaderboard', () => {
  it('should return empty leaderboard when no data', async () => {
    (db.execute as jest.Mock).mockResolvedValue({ rows: [] });
    
    const req = mockReq(1, ['member'], { params: { classId: '1' } });
    const res = mockRes();
    
    await controller.getIntervalLeaderboard(req, res);
    
    expect(res.json).toHaveBeenCalledWith([]);
  });

});