import { register, login } from '../controllers/authController';
import { db } from '../db/client';
import * as authUtils from '../middleware/auth';
import { Request, Response } from 'express';
import { builder } from './builder';

// --- mocks ------------
jest.mock('../db/client', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
  },
}));
jest.mock('../middleware/auth', () => ({
  hashPassword : jest.fn(async (p: string) => 'hashed-' + p),
  verifyPassword: jest.fn(async () => true),
  generateJwt   : jest.fn(() => 'fake.jwt'),
}));

const mockRes = (): Response => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res as Response;
};

// --- tests ------------
describe('register()', () => {
  it('creates user & returns token', async () => {
    (db.select as jest.Mock).mockReturnValue(builder([]));          // no dup
    (db.insert as jest.Mock).mockReturnValue(builder([{ userId: 1 }]));

    const req = { body: {
      firstName:'Jane', lastName:'Doe', email:'j@x', phone:'1', password:'pw'
    }} as Request;
    const res = mockRes();

    await register(req, res);

    expect(db.insert).toHaveBeenCalled();
    expect(authUtils.generateJwt).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 1 })
    );
    expect(res.json).toHaveBeenCalledWith({ token: 'fake.jwt' });
  });

  it('rejects duplicate email', async () => {
    (db.select as jest.Mock).mockReturnValue(builder([{ userId: 9 }]));
    const req = { body:{ email:'dup', password:'pw' } } as Request;
    const res = mockRes();

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});