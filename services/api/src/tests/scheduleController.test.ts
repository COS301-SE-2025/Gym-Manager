import * as ctrl from '../controllers/adminController';
import { db } from '../db/client';
import { Request, Response } from 'express';
import { builder } from './builder';
import { jest } from '@jest/globals';

jest.mock('../db/client', () => ({
  db: { insert: jest.fn(), select: jest.fn(), update: jest.fn() },
}));

// This make the output quieter
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

const resMock = (): Response => {
  const r: any = {};
  r.status = jest.fn().mockReturnValue(r);
  r.json   = jest.fn().mockReturnValue(r);
  return r as Response;
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('createClass', () => {
  it('inserts and returns one class', async () => {
    (db.insert as jest.Mock).mockReturnValue(builder([{ classId: 123 }]));
    const req = { body: { capacity: 10 } } as Request;
    const res = resMock();

    await ctrl.createClass(req, res);

    expect(db.insert).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({ classId: 123 });
  });
});

describe('createSchedule', () => {
  it('creates multiple classes from schedule array', async () => {
    (db.insert as jest.Mock).mockReturnValue(builder([{ classId: 1 }]));
    const req = { body: { schedule: [ {}, {} ] } } as Request; // 2 items
    const res = resMock();

    //await ctrl.createSchedule(req, res);

    expect(db.insert).toHaveBeenCalledTimes(2);
    expect(res.json).toHaveBeenCalledWith([{ classId: 1 }, { classId: 1 }]);
  });
});

describe('assignCoach', () => {
  it('400 if coach missing', async () => {
    (db.select as jest.Mock).mockReturnValue(builder([]));
    const req = { body: { classId: 1, coachId: 99 } } as Request;
    const res = resMock();

    await ctrl.assignCoach(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('updates when coach exists', async () => {
    (db.select as jest.Mock).mockReturnValue(builder([{ userId: 7 }]));
    (db.update as jest.Mock).mockReturnValue(builder());
    const req = { body: { classId: 1, coachId: 7 } } as Request;
    const res = resMock();

    await ctrl.assignCoach(req, res);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });
});