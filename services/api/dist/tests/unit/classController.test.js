"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * classController.test.ts – unit tests for every branch in classController
 */
const ctrl = __importStar(require("../../controllers/classController"));
const client_1 = require("../../db/client");
const builder_1 = require("../builder");
// ---------- Drizzle mocks ----------
const txMock = {
    select: jest.fn().mockReturnValue((0, builder_1.builder)([])),
    insert: jest.fn().mockReturnValue((0, builder_1.builder)()),
    where: jest.fn().mockReturnThis(),
    for: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
};
jest.mock('../../db/client', () => ({
    db: {
        select: jest.fn(),
        update: jest.fn(),
        insert: jest.fn(),
        transaction: jest.fn((cb) => cb(txMock)),
    },
}));
beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => { });
    jest.spyOn(console, 'error').mockImplementation(() => { });
    jest.spyOn(console, 'warn').mockImplementation(() => { });
});
// ---------- helpers ----------
const mockReq = (uid, extras = {}) => ({ user: uid ? { userId: uid } : undefined, ...extras });
const mockRes = () => {
    const r = {};
    r.status = jest.fn().mockReturnValue(r);
    r.json = jest.fn().mockReturnValue(r);
    return r;
};
afterEach(jest.clearAllMocks);
describe('getCoachAssignedClasses', () => {
    it('returns classes for coach', async () => {
        client_1.db.select.mockReturnValue((0, builder_1.builder)([{ classId: 5 }]));
        const res = mockRes();
        await ctrl.getCoachAssignedClasses(mockReq(1), res);
        expect(res.json).toHaveBeenCalledWith([{ classId: 5 }]);
    });
});
describe('getCoachClassesWithWorkouts', () => {
    it('returns joined class + workout list', async () => {
        const rows = [{ classId: 5, workoutName: 'HIIT' }];
        client_1.db.select.mockReturnValue((0, builder_1.builder)(rows));
        const res = mockRes();
        await ctrl.getCoachClassesWithWorkouts(mockReq(1), res);
        expect(res.json).toHaveBeenCalledWith(rows);
    });
});
describe('assignWorkoutToClass', () => {
    it('updates class when coach owns it', async () => {
        client_1.db.select.mockReturnValue((0, builder_1.builder)([{ classId: 7 }]));
        client_1.db.update.mockReturnValue((0, builder_1.builder)());
        const req = mockReq(1, { body: { classId: 7, workoutId: 3 } });
        const res = mockRes();
        await ctrl.assignWorkoutToClass(req, res);
        expect(client_1.db.update).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({ success: true });
    });
    it('403 when coach does NOT own it', async () => {
        client_1.db.select.mockReturnValue((0, builder_1.builder)([]));
        const req = mockReq(1, { body: { classId: 77, workoutId: 3 } });
        const res = mockRes();
        await ctrl.assignWorkoutToClass(req, res);
        expect(res.status).toHaveBeenCalledWith(403);
    });
});
describe('getAllClasses', () => {
    it('member sees full list', async () => {
        client_1.db.select
            .mockReturnValueOnce((0, builder_1.builder)([{ role: 'member' }]))
            .mockReturnValueOnce((0, builder_1.builder)([{ classId: 1 }, { classId: 2 }]));
        const res = mockRes();
        await ctrl.getAllClasses(mockReq(2), res);
        expect(res.json).toHaveBeenCalledWith([{ classId: 1 }, { classId: 2 }]);
    });
    it('unknown role → 403', async () => {
        client_1.db.select.mockReturnValue((0, builder_1.builder)([{ role: 'alien' }]));
        const res = mockRes();
        await ctrl.getAllClasses(mockReq(2), res);
        expect(res.status).toHaveBeenCalledWith(403);
    });
});
describe('getMemberClasses', () => {
    it('returns bookings for member', async () => {
        const rows = [{ bookingId: 9, classId: 3 }];
        client_1.db.select.mockReturnValue((0, builder_1.builder)(rows));
        const res = mockRes();
        await ctrl.getMemberClasses(mockReq(3), res);
        expect(res.json).toHaveBeenCalledWith(rows);
    });
});
describe('bookClass (original happy/dup tests)', () => {
    it('books successfully', async () => {
        txMock.select
            .mockReturnValueOnce((0, builder_1.builder)([{
                classId: 1, capacity: 10, scheduledDate: '2100-01-01',
                scheduledTime: '12:00:00', duration: 60
            }]))
            .mockReturnValueOnce((0, builder_1.builder)([]))
            .mockReturnValueOnce((0, builder_1.builder)([{ count: 0 }]));
        const req = mockReq(4, { body: { classId: 1 } });
        const res = mockRes();
        await ctrl.bookClass(req, res);
        expect(txMock.insert).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({ success: true });
    });
    it('400 duplicate booking', async () => {
        txMock.select
            .mockReturnValueOnce((0, builder_1.builder)([{
                classId: 1, capacity: 10, scheduledDate: '2100-01-01',
                scheduledTime: '12:00:00', duration: 60
            }]))
            .mockReturnValueOnce((0, builder_1.builder)([{ bookingId: 99 }]));
        const req = mockReq(4, { body: { classId: 1 } });
        const res = mockRes();
        await ctrl.bookClass(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
});
describe('getCoachAssignedClasses – auth guard', () => {
    it('401 when user missing', async () => {
        const res = mockRes();
        await ctrl.getCoachAssignedClasses(mockReq(undefined), res);
        expect(res.status).toHaveBeenCalledWith(401);
    });
});
describe('getCoachClassesWithWorkouts – auth guard', () => {
    it('401 when user missing', async () => {
        const res = mockRes();
        await ctrl.getCoachClassesWithWorkouts(mockReq(undefined), res);
        expect(res.status).toHaveBeenCalledWith(401);
    });
});
describe('createWorkout', () => {
    it('400 when name/content missing', async () => {
        const res = mockRes();
        await ctrl.createWorkout(mockReq(1, { body: { workoutName: '' } }), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
    it('500 when DB throws', async () => {
        client_1.db.insert.mockImplementation(() => { throw new Error(); });
        const req = mockReq(1, { body: { workoutName: 'HIT', workoutContent: '...' } });
        const res = mockRes();
        await ctrl.createWorkout(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });
    it('success path', async () => {
        client_1.db.insert.mockReturnValue((0, builder_1.builder)([{ workoutId: 9 }]));
        const req = mockReq(1, { body: { workoutName: 'HIT', workoutContent: '...' } });
        const res = mockRes();
        await ctrl.createWorkout(req, res);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            workoutId: 9,
            message: 'Workout created successfully',
        });
    });
});
describe('bookClass – extra error branches', () => {
    const baseReq = (body) => mockReq(5, { body });
    it('400 invalid classId', async () => {
        const res = mockRes();
        await ctrl.bookClass(baseReq({ classId: 'abc' }), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
    it('404 class not found', async () => {
        txMock.select.mockReturnValueOnce((0, builder_1.builder)([]));
        const res = mockRes();
        await ctrl.bookClass(baseReq({ classId: 99 }), res);
        expect(res.status).toHaveBeenCalledWith(404);
    });
    it('400 class full', async () => {
        txMock.select
            .mockReturnValueOnce((0, builder_1.builder)([{
                capacity: 1, scheduledDate: '2100-01-01', scheduledTime: '12:00:00', duration: 30,
            }]))
            .mockReturnValueOnce((0, builder_1.builder)([]))
            .mockReturnValueOnce((0, builder_1.builder)([{ count: 1 }]));
        const res = mockRes();
        await ctrl.bookClass(baseReq({ classId: 1 }), res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Class full' });
    });
    it('400 class already ended', async () => {
        const past = new Date(Date.now() - 60000).toISOString().split('T');
        txMock.select.mockReturnValueOnce((0, builder_1.builder)([{
                capacity: 10,
                scheduledDate: past[0],
                scheduledTime: past[1].slice(0, 8),
                duration: 1,
            }]));
        const res = mockRes();
        await ctrl.bookClass(baseReq({ classId: 2 }), res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Class has already ended' });
    });
});
