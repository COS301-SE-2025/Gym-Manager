import * as ctrl from '../controllers/classController';
import { db } from '../db/client';
import { Request, Response } from 'express';
import { builder } from './builder';

// --- Drizzle Mock ------------
jest.mock('../db/client', () => ({
  db: {
    select : jest.fn(),
    update : jest.fn(),
    insert : jest.fn(),
  },
}));

// --- Helpers ------------
const mockReq = (uid = 1, extras = {}): Request =>
  ({ user: { userId: uid }, ...extras } as unknown as Request);

const mockRes = (): Response => {
  const r: any = {};
  r.status = jest.fn().mockReturnValue(r);
  r.json   = jest.fn().mockReturnValue(r);
  return r as Response;
};

// --- Tests ------------
describe('getCoachAssignedClasses', () => {
  it('returns classes for coach', async () => {
    (db.select as jest.Mock).mockReturnValue(builder([{ classId: 5 }]));
    const res = mockRes();
    await ctrl.getCoachAssignedClasses(mockReq(), res);
    expect(res.json).toHaveBeenCalledWith([{ classId: 5 }]);
  });
});

describe('getCoachClassesWithWorkouts', () => {
  it('returns joined class + workout list', async () => {
    const rows = [{ classId: 5, workoutName: 'HIIT' }];
    (db.select as jest.Mock).mockReturnValue(builder(rows));
    const res = mockRes();
    await ctrl.getCoachClassesWithWorkouts(mockReq(), res);
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
      .mockReturnValueOnce(builder([{ role: 'member' }])) // roles lookup
      .mockReturnValueOnce(builder([{ classId: 1 }, { classId: 2 }])); // classes
    const res = mockRes();
    await ctrl.getAllClasses(mockReq(), res);
    expect(res.json).toHaveBeenCalledWith([{ classId: 1 }, { classId: 2 }]);
  });

  it('unknown role - 403', async () => {
    (db.select as jest.Mock).mockReturnValue(builder([{ role: 'alien' }]));
    const res = mockRes();
    await ctrl.getAllClasses(mockReq(), res);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});


describe('getMemberClasses', () => {
  it('returns bookings for member', async () => {
    const rows = [{ bookingId: 9, classId: 3 }];
    (db.select as jest.Mock).mockReturnValue(builder(rows));
    const res = mockRes();
    await ctrl.getMemberClasses(mockReq(), res);
    expect(res.json).toHaveBeenCalledWith(rows);
  });
});


describe('bookClass', () => {
  it('books successfully', async () => {
    // sequence of SELECTs inside bookClass
    (db.select as jest.Mock)
      .mockReturnValueOnce(builder([{ status: 'approved' }])) // member
      .mockReturnValueOnce(builder([{ classId: 1, capacity: 10 }])) // class
      .mockReturnValueOnce(builder([])) // dup check
      .mockReturnValueOnce(builder([])); // count

    (db.insert as jest.Mock).mockReturnValue(builder()); // booking

    const req = mockReq(1, { body: { classId: 1 } });
    const res = mockRes();
    await ctrl.bookClass(req, res);
    expect(db.insert).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  it('400 on duplicate booking', async () => {
    (db.select as jest.Mock)
      .mockReturnValueOnce(builder([{ status: 'approved' }]))
      .mockReturnValueOnce(builder([{ classId: 1, capacity: 10 }]))
      .mockReturnValueOnce(builder([{ bookingId: 99 }])); // duplicate

    const req = mockReq(1, { body: { classId: 1 } });
    const res = mockRes();
    await ctrl.bookClass(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

});