import * as ctrl from '../controllers/scheduleController';
import { db } from '../db/client';
import { Request, Response } from 'express';
import { builder } from './builder';

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