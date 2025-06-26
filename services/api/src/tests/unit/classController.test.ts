/**
 * classController.test.ts – unit tests for every branch in classController
 */
import * as ctrl from '../controllers/classController';
import { db } from '../db/client';
import { Request, Response } from 'express';
import { builder } from './builder';

// ---------- Drizzle mocks ----------
const txMock = {
  select : jest.fn().mockReturnValue(builder([])),
  insert : jest.fn().mockReturnValue(builder()),
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

// ---------- helpers ----------
const mockReq = (uid?: number, extras: Record<string, unknown> = {}): Request =>
  ({ user: uid ? { userId: uid } : undefined, ...extras } as unknown as Request);

const mockRes = (): Response => {
  const r: any = {};
  r.status = jest.fn().mockReturnValue(r);
  r.json   = jest.fn().mockReturnValue(r);
  return r;
};

afterEach(jest.clearAllMocks);

describe('getCoachAssignedClasses', () => {
  it('returns classes for coach', async () => {
    (db.select as jest.Mock).mockReturnValue(builder([{ classId: 5 }]));
    const res = mockRes();
    await ctrl.getCoachAssignedClasses(mockReq(1), res);
    expect(res.json).toHaveBeenCalledWith([{ classId: 5 }]);
  });
});

describe('getCoachClassesWithWorkouts', () => {
  it('returns joined class + workout list', async () => {
    const rows = [{ classId: 5, workoutName: 'HIIT' }];
    (db.select as jest.Mock).mockReturnValue(builder(rows));
    const res = mockRes();
    await ctrl.getCoachClassesWithWorkouts(mockReq(1), res);
    expect(res.json).toHaveBeenCalledWith(rows);
  });
});

describe('assignWorkoutToClass', () => {
  it('updates class when coach owns it', async () => {
    (db.select as jest.Mock).mockReturnValue(builder([{ classId: 7 }]));
    (db.update as jest.Mock).mockReturnValue(builder());
    const req = mockReq(1, { body: { classId: 7, workoutId: 3 } });
    const res = mockRes();
    await ctrl.assignWorkoutToClass(req, res);
    expect(db.update).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  it('403 when coach does NOT own it', async () => {
    (db.select as jest.Mock).mockReturnValue(builder([]));
    const req = mockReq(1, { body: { classId: 77, workoutId: 3 } });
    const res = mockRes();
    await ctrl.assignWorkoutToClass(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('getAllClasses', () => {
  it('member sees full list', async () => {
    (db.select as jest.Mock)
      .mockReturnValueOnce(builder([{ role: 'member' }]))
      .mockReturnValueOnce(builder([{ classId: 1 }, { classId: 2 }]));
    const res = mockRes();
    await ctrl.getAllClasses(mockReq(2), res);
    expect(res.json).toHaveBeenCalledWith([{ classId: 1 }, { classId: 2 }]);
  });

  it('unknown role → 403', async () => {
    (db.select as jest.Mock).mockReturnValue(builder([{ role: 'alien' }]));
    const res = mockRes();
    await ctrl.getAllClasses(mockReq(2), res);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('getMemberClasses', () => {
  it('returns bookings for member', async () => {
    const rows = [{ bookingId: 9, classId: 3 }];
    (db.select as jest.Mock).mockReturnValue(builder(rows));
    const res = mockRes();
    await ctrl.getMemberClasses(mockReq(3), res);
    expect(res.json).toHaveBeenCalledWith(rows);
  });
});

describe('bookClass (original happy/dup tests)', () => {
  it('books successfully', async () => {
    (txMock.select as jest.Mock)
      .mockReturnValueOnce(builder([{
        classId: 1, capacity: 10, scheduledDate: '2100-01-01',
        scheduledTime: '12:00:00', duration: 60 }]))
      .mockReturnValueOnce(builder([]))
      .mockReturnValueOnce(builder([{ count: 0 }]));

    const req = mockReq(4, { body: { classId: 1 } });
    const res = mockRes();
    await ctrl.bookClass(req, res);
    expect(txMock.insert).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  it('400 duplicate booking', async () => {
    (txMock.select as jest.Mock)
      .mockReturnValueOnce(builder([{
        classId: 1, capacity: 10, scheduledDate: '2100-01-01',
        scheduledTime: '12:00:00', duration: 60 }]))
      .mockReturnValueOnce(builder([{ bookingId: 99 }]));

    const req = mockReq(4, { body: { classId: 1 } });
    const res = mockRes();
    await ctrl.bookClass(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

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
      success  : true,
      workoutId: 9,
      message  : 'Workout created successfully',
    });
  });
});

describe('bookClass – extra error branches', () => {
  const baseReq = (body: any) => mockReq(5, { body });

  it('400 invalid classId', async () => {
    const res = mockRes();
    await ctrl.bookClass(baseReq({ classId: 'abc' }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('404 class not found', async () => {
    (txMock.select as jest.Mock).mockReturnValueOnce(builder([]));
    const res = mockRes();
    await ctrl.bookClass(baseReq({ classId: 99 }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('400 class full', async () => {
    (txMock.select as jest.Mock)
      .mockReturnValueOnce(builder([{
        capacity: 1, scheduledDate: '2100-01-01', scheduledTime: '12:00:00', duration: 30,
      }]))
      .mockReturnValueOnce(builder([]))
      .mockReturnValueOnce(builder([{ count: 1 }]));

    const res = mockRes();
    await ctrl.bookClass(baseReq({ classId: 1 }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Class full' });
  });

  it('400 class already ended', async () => {
    const past = new Date(Date.now() - 60_000).toISOString().split('T');
    (txMock.select as jest.Mock).mockReturnValueOnce(builder([{
      capacity: 10,
      scheduledDate: past[0],
      scheduledTime: past[1].slice(0, 8),
      duration: 1,
    }]));

    const res = mockRes();
    await ctrl.bookClass(baseReq({ classId: 2 }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Class has already ended' });
  });
});
