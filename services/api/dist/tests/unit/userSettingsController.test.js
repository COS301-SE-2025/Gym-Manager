"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * userSettingsController.test.ts – unit tests for editSettings
 */
const userSettingsController_1 = require("../../controllers/userSettingsController");
const client_1 = require("../../db/client");
const builder_1 = require("../builder");
// ─── DB stub ────────────────────────────────────────────────
jest.mock('../../db/client', () => ({
    db: { update: jest.fn() },
}));
// ─── helpers ────────────────────────────────────────────────
const mockReq = (publicVisibility, // value we’re testing
uid = 1 // authenticated user id
) => ({ user: { userId: uid }, body: { publicVisibility } });
const mockRes = () => {
    const r = {};
    r.status = jest.fn().mockReturnValue(r);
    r.json = jest.fn().mockReturnValue(r);
    return r;
};
beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => { });
    jest.spyOn(console, 'error').mockImplementation(() => { });
    jest.spyOn(console, 'warn').mockImplementation(() => { });
});
afterEach(jest.clearAllMocks);
// ─── tests ──────────────────────────────────────────────────
describe('editSettings', () => {
    it('400 when publicVisibility is not boolean', async () => {
        const req = mockReq('yes'); // ← wrong type
        const res = mockRes();
        await (0, userSettingsController_1.editSettings)(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            error: "'publicVisibility' must be a boolean",
        });
    });
    it('404 when member row not found', async () => {
        client_1.db.update.mockReturnValue((0, builder_1.builder)([]) // nothing returned
        );
        const req = mockReq(false);
        const res = mockRes();
        await (0, userSettingsController_1.editSettings)(req, res);
        expect(client_1.db.update).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: 'Member not found' });
    });
    it('500 when DB throws', async () => {
        client_1.db.update.mockImplementation(() => { throw new Error('boom'); });
        const req = mockReq(true);
        const res = mockRes();
        await (0, userSettingsController_1.editSettings)(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            error: 'Failed to update visibility setting',
        });
    });
    it('success path returns updated visibility', async () => {
        client_1.db.update.mockReturnValue((0, builder_1.builder)([{ userId: 1 }]));
        const req = mockReq(true);
        const res = mockRes();
        await (0, userSettingsController_1.editSettings)(req, res);
        expect(client_1.db.update).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            userId: 1,
            publicVisibility: true,
        });
    });
});
