/**
 * userSettingsController.test.ts – unit tests for editSettings
 */
import { editSettings } from '../controllers/userSettingsController';
import { db } from '../db/client';
import { Request, Response } from 'express';
import { builder } from './builder';

jest.mock('../db/client', () => ({
  db: {
    update: jest.fn(),
  },
}));

// ───────────── Req/Res stubs ────────────────────────────────
const mockReq = (body: any): Request =>
  ({ body } as unknown as Request);

const mockRes = (): Response => {
  const r: any = {};
  r.status = jest.fn().mockReturnValue(r);
  r.json   = jest.fn().mockReturnValue(r);
  return r;
};

afterEach(() => {
  jest.clearAllMocks();
});

describe('editSettings', () => {
  it("400 when 'userId' is not a number", async () => {
    const req = mockReq({ userId: 'foo', publicVisibility: true });
    const res = mockRes();

    await editSettings(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "'userId' must be a number" });
  });

  it("400 when 'publicVisibility' is not a boolean", async () => {
    const req = mockReq({ userId: 123, publicVisibility: 'yes' });
    const res = mockRes();

    await editSettings(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "'publicVisibility' must be a boolean" });
  });


});
