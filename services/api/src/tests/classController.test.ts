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