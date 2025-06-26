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

  it('404 when no member found to update', async () => {
    // returning empty array → [updated] === undefined
    (db.update as jest.Mock).mockReturnValue(builder([]));

    const req = mockReq({ userId: 42, publicVisibility: false });
    const res = mockRes();

    await editSettings(req, res);

    expect(db.update).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Member not found' });
  });

  it('500 when DB throws an error', async () => {
    (db.update as jest.Mock).mockImplementation(() => {
      throw new Error('boom');
    });

    const req = mockReq({ userId: 7, publicVisibility: true });
    const res = mockRes();

    await editSettings(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update visibility setting' });
  });

  it('success path returns updated visibility', async () => {
    (db.update as jest.Mock).mockReturnValue(builder([{ userId: 99 }]));

    const req = mockReq({ userId: 99, publicVisibility: true });
    const res = mockRes();

    await editSettings(req, res);

    expect(db.update).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      userId: 99,
      publicVisibility: true,
    });
  });
});
