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
 * authControllers.test.ts – unit tests for register() & login()
 */
const authController_1 = require("../../controllers/authController");
const client_1 = require("../../db/client");
const authUtils = __importStar(require("../../middleware/auth"));
const builder_1 = require("../builder");
/* ────────────────────────── mocks ────────────────────────── */
jest.mock('../../db/client', () => ({
    db: {
        select: jest.fn(),
        insert: jest.fn(),
    },
}));
jest.mock('../../middleware/auth', () => ({
    hashPassword: jest.fn(async (p) => 'hashed-' + p),
    verifyPassword: jest.fn(async () => true),
    generateJwt: jest.fn(() => 'fake.jwt'),
}));
/* silence console noise inside tests */
beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => { });
    jest.spyOn(console, 'error').mockImplementation(() => { });
    jest.spyOn(console, 'warn').mockImplementation(() => { });
});
/* helper to build mock res */
const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};
/* ────────────────────────── tests ────────────────────────── */
describe('register()', () => {
    it('creates user & returns token', async () => {
        client_1.db.select.mockReturnValue((0, builder_1.builder)([])); // no duplicate email
        client_1.db.insert.mockReturnValue((0, builder_1.builder)([{ userId: 1 }]));
        const req = {
            body: {
                firstName: 'Jane',
                lastName: 'Doe',
                email: 'j@x',
                phone: '1',
                password: 'pw',
            },
        };
        const res = mockRes();
        await (0, authController_1.register)(req, res);
        expect(client_1.db.insert).toHaveBeenCalled();
        expect(authUtils.generateJwt).toHaveBeenCalledWith(expect.objectContaining({ userId: 1 }));
        expect(res.json).toHaveBeenCalledWith({ token: 'fake.jwt' });
    });
    it('rejects duplicate email', async () => {
        client_1.db.select.mockReturnValue((0, builder_1.builder)([{ userId: 9 }]));
        const req = { body: { email: 'dup', password: 'pw' } };
        const res = mockRes();
        await (0, authController_1.register)(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
});
describe('login()', () => {
    it('returns token and full user object on valid creds', async () => {
        /* 1st SELECT → user row */
        client_1.db.select
            .mockReturnValueOnce((0, builder_1.builder)([
            {
                userId: 1,
                firstName: 'Ada',
                lastName: 'Lovelace',
                email: 'ada@x',
                passwordHash: 'hash',
            },
        ]))
            /* 2nd SELECT → roles */
            .mockReturnValueOnce((0, builder_1.builder)([{ userRole: 'member' }]));
        const req = { body: { email: 'ada@x', password: 'pw' } };
        const res = mockRes();
        await (0, authController_1.login)(req, res);
        expect(res.json).toHaveBeenCalledWith({
            token: 'fake.jwt',
            user: {
                id: 1,
                firstName: 'Ada',
                lastName: 'Lovelace',
                email: 'ada@x',
                roles: ['member'],
            },
        });
    });
    it('401 on bad password', async () => {
        /* user exists */
        client_1.db.select.mockReturnValue((0, builder_1.builder)([{ userId: 1, passwordHash: 'h' }]));
        /* password fails */
        authUtils.verifyPassword.mockResolvedValue(false);
        const req = { body: { email: 'x', password: 'bad' } };
        const res = mockRes();
        await (0, authController_1.login)(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
    });
});
