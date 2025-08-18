/**
 * authControllers.test.ts – unit tests for register() & login()
 */
import { register, login } from '../../controllers/authController';
import { db } from '../../db/client';
import * as authUtils from '../../middleware/auth';
import { Request, Response } from 'express';
import { builder } from '../builder';

/* ────────────────────────── mocks ────────────────────────── */
jest.mock('../../db/client', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
  },
}));

jest.mock('../../middleware/auth', () => ({
  hashPassword  : jest.fn(async (p: string) => 'hashed-' + p),
  verifyPassword: jest.fn(async () => true),
  generateJwt   : jest.fn(() => 'fake.jwt'),
}));

/* silence console noise inside tests */
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

/* helper to build mock res */
const mockRes = (): Response => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res as Response;
};

/* ────────────────────────── tests ────────────────────────── */
describe('register()', () => {
  it('creates user & returns token', async () => {
    (db.select as jest.Mock).mockReturnValue(builder([]));                // no duplicate email
    (db.insert as jest.Mock).mockReturnValue(builder([{ userId: 1 }]));

    const req = {
      body: {
        firstName: 'Jane',
        lastName : 'Doe',
        email    : 'j@x',
        phone    : '1',
        password : 'pw',
      },
    } as Request;

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

    const req = { body: { email: 'dup', password: 'pw' } } as Request;
    const res = mockRes();

    await register(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('login()', () => {
  it('returns token and full user object on valid creds', async () => {
    /* 1st SELECT → user row */
    (db.select as jest.Mock)
      .mockReturnValueOnce(
        builder([
          {
            userId      : 1,
            firstName   : 'Ada',
            lastName    : 'Lovelace',
            email       : 'ada@x',
            passwordHash: 'hash',
          },
        ])
      )
      /* 2nd SELECT → roles */
      .mockReturnValueOnce(builder([{ userRole: 'member' }]));

    const req = { body: { email: 'ada@x', password: 'pw' } } as Request;
    const res = mockRes();

    await login(req, res);

    expect(res.json).toHaveBeenCalledWith({
      token: 'fake.jwt',
      user : {
        id        : 1,
        firstName : 'Ada',
        lastName  : 'Lovelace',
        email     : 'ada@x',
        roles     : ['member'],
      },
    });
  });

  it('401 on bad password', async () => {
    /* user exists */
    (db.select as jest.Mock).mockReturnValue(
      builder([{ userId: 1, passwordHash: 'h' }])
    );
    /* password fails */
    (authUtils.verifyPassword as jest.Mock).mockResolvedValue(false);

    const req = { body: { email: 'x', password: 'bad' } } as Request;
    const res = mockRes();

    await login(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
