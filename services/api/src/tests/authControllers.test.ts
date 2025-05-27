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