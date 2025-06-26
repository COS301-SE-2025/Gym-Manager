/**
 * classController.test.ts – unit tests for all paths in classController
 */
import * as ctrl from '../controllers/classController';
import { db } from '../db/client';
import { Request, Response } from 'express';
import { builder } from './builder';

// ───────────── Drizzle-mock helpers ──────────────────────────
const txMock = {
  select : jest.fn(),
  insert : jest.fn(),
  where  : jest.fn().mockReturnThis(),
  for    : jest.fn().mockReturnThis(),
  limit  : jest.fn().mockReturnThis(),
};
jest.mock('../db/client', () => ({
  db: {
    select      : jest.fn(),
    update      : jest.fn(),
    insert      : jest.fn(),
    transaction : jest.fn((cb: any) => cb(txMock)),
  },
}));

// ───────────── Req/Res stubs ────────────────────────────────
const mockReq = (uid?: number, extras = {}): Request =>
  ({ user: uid ? { userId: uid } : undefined, ...extras } as unknown as Request);

const mockRes = (): Response => {
  const r: any = {};
  r.status = jest.fn().mockReturnValue(r);
  r.json   = jest.fn().mockReturnValue(r);
  return r;
};

// reset mocks between tests
afterEach(jest.clearAllMocks);

// ───────────── existing tests (unchanged) ───────────────────
/* … your original describe blocks stay here … */

// ───────────── NEW TESTS ────────────────────────────────────
describe('getCoachAssignedClasses – auth guard', () => {
  it('401 when user missing', async () => {
    const res = mockRes();
    await ctrl.getCoachAssignedClasses(mockReq(undefined), res);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('getCoachClassesWithWorkouts – auth guard', () => {
  it('401 when user missing', async () => {
    const res = mockRes();
    await ctrl.getCoachClassesWithWorkouts(mockReq(undefined), res);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('createWorkout', () => {
  it('400 when name/content missing', async () => {
    const res = mockRes();
    await ctrl.createWorkout(mockReq(1, { body: { workoutName: '' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('500 when DB throws', async () => {
    (db.insert as jest.Mock).mockImplementation(() => { throw new Error(); });
    const req = mockReq(1, { body: { workoutName: 'HIT', workoutContent: '...' } });
    const res = mockRes();
    await ctrl.createWorkout(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('success path', async () => {
    (db.insert as jest.Mock).mockReturnValue(builder([{ workoutId: 9 }]));
    const req = mockReq(1, { body: { workoutName: 'HIT', workoutContent: '...' } });
    const res = mockRes();
    await ctrl.createWorkout(req, res);
    expect(res.json).toHaveBeenCalledWith({
      success : true,
      workoutId: 9,
      message : 'Workout created successfully',
    });
  });
});

describe('bookClass – new branches', () => {
  const baseReq = (body: any) => mockReq(5, { body });

  it('400 invalid classId', async () => {
    const res = mockRes();
    await ctrl.bookClass(baseReq({ classId: 'abc' }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('404 class not found', async () => {
    (txMock.select as jest.Mock).mockReturnValueOnce(builder([])); // no class
    const res = mockRes();
    await ctrl.bookClass(baseReq({ classId: 99 }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('400 class full', async () => {
    // 1: class exists
    (txMock.select as jest.Mock).mockReturnValueOnce(builder([{
      capacity: 1, scheduledDate: '2100-01-01', scheduledTime: '12:00:00', duration: 30,
    }]));
    // 2: dup check empty
    (txMock.select as jest.Mock).mockReturnValueOnce(builder([]));
    // 3: count equals capacity
    (txMock.select as jest.Mock).mockReturnValueOnce(builder([{ count: 1 }]));

    const res = mockRes();
    await ctrl.bookClass(baseReq({ classId: 1 }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Class full' });
  });

  it('400 class already ended', async () => {
    const pastDate = new Date(Date.now() - 60_000).toISOString().split('T');
    (txMock.select as jest.Mock).mockReturnValueOnce(builder([{
      capacity: 10,
      scheduledDate: pastDate[0],
      scheduledTime: pastDate[1].slice(0,8),
      duration: 1,
    }]));

    const res = mockRes();
    await ctrl.bookClass(baseReq({ classId: 2 }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Class has already ended' });
  });
});
