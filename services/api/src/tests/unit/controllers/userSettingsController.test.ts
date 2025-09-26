/**
 * userSettingsController.test.ts – unit tests for controller.editSettings
 */
import { UserSettingsController } from '../../../controllers/userSettings/userSettingsController';
import { db }            from '../../../db/client';
import { Request, Response } from 'express';
import { builder }       from '../../builder';

// Create controller instance for testing
const controller = new UserSettingsController();

// ─── DB stub ────────────────────────────────────────────────
jest.mock('../../../db/client', () => ({
  db: { update: jest.fn() },
}));

// ─── helpers ────────────────────────────────────────────────
const mockReq = (
  publicVisibility: any,   // value we’re testing
  uid = 1                  // authenticated user id
): Request =>
  ({ user:{ userId: uid }, body:{ publicVisibility } } as unknown as Request);

const mockRes = (): Response => {
  const r: any = {};
  r.status = jest.fn().mockReturnValue(r);
  r.json   = jest.fn().mockReturnValue(r);
  return r;
};

beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(jest.clearAllMocks);

// ─── tests ──────────────────────────────────────────────────
describe('controller.editSettings', () => {
  it('400 when publicVisibility is not boolean', async () => {
    const req = mockReq('yes');               // ← wrong type
    const res = mockRes();

    await controller.editSettings(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "'publicVisibility' must be a boolean",
    });
  });

  it('404 when member row not found', async () => {
    (db.update as jest.Mock).mockReturnValue(
      builder([])                              // nothing returned
    );

    const req = mockReq(false);
    const res = mockRes();

    await controller.editSettings(req, res);

    expect(db.update).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Member not found' });
  });

  it('500 when DB throws', async () => {
    (db.update as jest.Mock).mockImplementation(() => { throw new Error('boom'); });

    const req = mockReq(true);
    const res = mockRes();

    await controller.editSettings(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Failed to update visibility setting',
    });
  });

  it('success path returns updated visibility', async () => {
    (db.update as jest.Mock).mockReturnValue(
      builder([{ userId: 1 }])
    );

    const req = mockReq(true);
    const res = mockRes();

    await controller.editSettings(req, res);

    expect(db.update).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      userId : 1,
      publicVisibility: true,
    });
  });
});
