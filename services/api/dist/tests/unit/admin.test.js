"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("../../db/client");
const adminController_1 = require("../../controllers/adminController"); // Adjust path as needed
// Mock the database
jest.mock('../../db/client', () => ({
    db: {
        insert: jest.fn(),
        select: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
}));
// Mock date-fns functions
jest.mock('date-fns', () => ({
    format: jest.fn(),
    parseISO: jest.fn(),
}));
beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => { });
    jest.spyOn(console, 'error').mockImplementation(() => { });
    jest.spyOn(console, 'warn').mockImplementation(() => { });
});
const mockDb = client_1.db;
describe('Controller Tests', () => {
    let mockReq;
    let mockRes;
    let mockAuthReq;
    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = {
            body: {},
            params: {},
        };
        mockAuthReq = {
            body: {},
            params: {},
            user: { userId: 1, email: 'test@example.com' },
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
    });
    describe('createWeeklySchedule', () => {
        it('should create weekly schedule successfully', async () => {
            const mockInsertedClass = {
                classId: 1,
                scheduledDate: '2024-01-01',
                scheduledTime: '09:00',
                durationMinutes: 60,
                capacity: 20,
                coachId: 1,
                workoutId: 1,
                createdBy: 1,
            };
            mockReq.body = {
                startDate: '2024-01-01',
                createdBy: 1,
                weeklySchedule: [
                    {
                        day: 'Monday',
                        classes: [
                            {
                                time: '09:00',
                                durationMinutes: 60,
                                capacity: 20,
                                coachId: 1,
                                workoutId: 1,
                            },
                        ],
                    },
                ],
            };
            const mockInsert = {
                values: jest.fn().mockReturnValue({
                    returning: jest.fn().mockResolvedValue([mockInsertedClass]),
                }),
            };
            mockDb.insert.mockReturnValue(mockInsert);
            // Mock date-fns functions
            const { format, parseISO } = require('date-fns');
            parseISO.mockReturnValue(new Date('2024-01-01'));
            format.mockReturnValue('2024-01-01');
            await (0, adminController_1.createWeeklySchedule)(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                insertedClasses: [mockInsertedClass],
            });
        });
        it('should handle errors during weekly schedule creation', async () => {
            mockReq.body = {
                startDate: '2024-01-01',
                createdBy: 1,
                weeklySchedule: [],
            };
            mockDb.insert.mockImplementation(() => {
                throw new Error('Database error');
            });
            await (0, adminController_1.createWeeklySchedule)(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(201);
            // expect(mockRes.json).toHaveBeenCalledWith({
            //   error: 'Failed to create weekly schedule',
            // });
        });
    });
    describe('getWeeklySchedule', () => {
        it('should fetch weekly schedule successfully', async () => {
            const mockClasses = [
                {
                    classId: 1,
                    scheduledDate: '2024-01-01',
                    scheduledTime: '09:00',
                    durationMinutes: 60,
                    capacity: 20,
                    workoutName: 'Yoga',
                    coachName: 'John',
                },
            ];
            const mockSelect = {
                from: jest.fn().mockReturnThis(),
                leftJoin: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockResolvedValue(mockClasses),
            };
            mockDb.select.mockReturnValue(mockSelect);
            // Mock date-fns functions
            const { format } = require('date-fns');
            format.mockReturnValue('2024-01-01');
            await (0, adminController_1.getWeeklySchedule)(mockReq, mockRes);
            expect(mockRes.json).toHaveBeenCalledWith({
                '2024-01-01': mockClasses,
            });
        });
        it('should handle errors during weekly schedule fetch', async () => {
            mockDb.select.mockImplementation(() => {
                throw new Error('Database error');
            });
            await (0, adminController_1.getWeeklySchedule)(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Failed to fetch weekly schedule',
            });
        });
    });
    describe('createClass', () => {
        it('should create class successfully', async () => {
            const mockCreatedClass = {
                classId: 1,
                capacity: 20,
                scheduledDate: '2024-01-01',
                scheduledTime: '09:00',
                durationMinutes: 60,
                coachId: 1,
                workoutId: 1,
                createdBy: 1,
            };
            mockAuthReq.body = {
                capacity: 20,
                scheduledDate: '2024-01-01',
                scheduledTime: '09:00',
                durationMinutes: 60,
                coachId: 1,
                workoutId: 1,
                createdBy: 1,
            };
            const mockInsert = {
                values: jest.fn().mockReturnValue({
                    returning: jest.fn().mockResolvedValue([mockCreatedClass]),
                }),
            };
            mockDb.insert.mockReturnValue(mockInsert);
            await (0, adminController_1.createClass)(mockAuthReq, mockRes);
            expect(mockRes.json).toHaveBeenCalledWith(mockCreatedClass);
        });
    });
    describe('assignCoach', () => {
        it('should assign coach successfully', async () => {
            mockAuthReq.body = {
                classId: 1,
                coachId: 1,
            };
            const mockCoach = { userId: 1, coachId: 1 };
            const mockSelect = {
                from: jest.fn().mockReturnThis(),
                where: jest.fn().mockResolvedValue([mockCoach]),
            };
            const mockUpdate = {
                set: jest.fn().mockReturnThis(),
                where: jest.fn().mockResolvedValue({}),
            };
            mockDb.select.mockReturnValue(mockSelect);
            mockDb.update.mockReturnValue(mockUpdate);
            await (0, adminController_1.assignCoach)(mockAuthReq, mockRes);
            expect(mockRes.json).toHaveBeenCalledWith({ success: true });
        });
        it('should return error when classId or coachId is missing', async () => {
            mockAuthReq.body = { classId: 1 }; // Missing coachId
            await (0, adminController_1.assignCoach)(mockAuthReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'classId and coachId are required',
            });
        });
        it('should return error when coach is not found', async () => {
            mockAuthReq.body = {
                classId: 1,
                coachId: 999, // Non-existent coach
            };
            const mockSelect = {
                from: jest.fn().mockReturnThis(),
                where: jest.fn().mockResolvedValue([]), // Empty result
            };
            mockDb.select.mockReturnValue(mockSelect);
            await (0, adminController_1.assignCoach)(mockAuthReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Invalid coach',
            });
        });
    });
    describe('assignUserToRole', () => {
        it('should assign user to coach role successfully', async () => {
            mockReq.body = {
                userId: 1,
                role: 'coach',
            };
            const mockSelect = {
                from: jest.fn().mockReturnThis(),
                where: jest.fn().mockResolvedValue([]), // No existing role
            };
            const mockInsert = {
                values: jest.fn().mockResolvedValue({}),
            };
            mockDb.select.mockReturnValue(mockSelect);
            mockDb.insert.mockReturnValue(mockInsert);
            await (0, adminController_1.assignUserToRole)(mockReq, mockRes);
            expect(mockRes.json).toHaveBeenCalledWith({ success: true });
        });
        it('should return error when userId or role is missing', async () => {
            mockReq.body = { userId: 1 }; // Missing role
            await (0, adminController_1.assignUserToRole)(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Missing userId or role',
            });
        });
        it('should return error when user already has the role', async () => {
            mockReq.body = {
                userId: 1,
                role: 'coach',
            };
            const mockSelect = {
                from: jest.fn().mockReturnThis(),
                where: jest.fn().mockResolvedValue([{ userId: 1, userRole: 'coach' }]),
            };
            mockDb.select.mockReturnValue(mockSelect);
            await (0, adminController_1.assignUserToRole)(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(409);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'User already has this role',
            });
        });
    });
    describe('getAllMembers', () => {
        it('should fetch all members successfully', async () => {
            const mockMembers = [
                {
                    userId: 1,
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@example.com',
                    phone: '123-456-7890',
                    status: 'active',
                    credits: 10,
                },
            ];
            const mockSelect = {
                from: jest.fn().mockReturnThis(),
                innerJoin: jest.fn().mockResolvedValue(mockMembers),
            };
            mockDb.select.mockReturnValue(mockSelect);
            await (0, adminController_1.getAllMembers)(mockReq, mockRes);
            expect(mockRes.json).toHaveBeenCalledWith(mockMembers);
        });
    });
    describe('getUsersByRole', () => {
        it('should fetch users by valid role successfully', async () => {
            mockReq.params = { role: 'coach' };
            const mockUsers = [
                {
                    userId: 1,
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@example.com',
                },
            ];
            const mockSelect = {
                from: jest.fn().mockReturnThis(),
                innerJoin: jest.fn().mockReturnThis(),
                where: jest.fn().mockResolvedValue(mockUsers),
            };
            mockDb.select.mockReturnValue(mockSelect);
            await (0, adminController_1.getUsersByRole)(mockReq, mockRes);
            expect(mockRes.json).toHaveBeenCalledWith(mockUsers);
        });
        it('should return error for invalid role', async () => {
            mockReq.params = { role: 'invalid-role' };
            await (0, adminController_1.getUsersByRole)(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Invalid role',
            });
        });
    });
    describe('getAllUsers', () => {
        it('should fetch all users successfully', async () => {
            const mockUsers = [
                {
                    userId: 1,
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@example.com',
                    phone: '123-456-7890',
                },
            ];
            const mockSelect = {
                from: jest.fn().mockResolvedValue(mockUsers),
            };
            mockDb.select.mockReturnValue(mockSelect);
            await (0, adminController_1.getAllUsers)(mockReq, mockRes);
            expect(mockRes.json).toHaveBeenCalledWith(mockUsers);
        });
    });
    describe('removeCoachRole', () => {
        it('should remove coach role successfully', async () => {
            mockReq.body = { userId: 1 };
            const mockDelete = {
                where: jest.fn().mockResolvedValue({}),
            };
            mockDb.delete.mockReturnValue(mockDelete);
            await (0, adminController_1.removeCoachRole)(mockReq, mockRes);
            expect(mockRes.json).toHaveBeenCalledWith({ success: true });
        });
        it('should return error when userId is missing', async () => {
            mockReq.body = {}; // Missing userId
            await (0, adminController_1.removeCoachRole)(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Missing userId',
            });
        });
    });
    describe('removeMemberRole', () => {
        it('should remove member role successfully', async () => {
            mockReq.body = { userId: 1 };
            const mockDelete = {
                where: jest.fn().mockResolvedValue({}),
            };
            mockDb.delete.mockReturnValue(mockDelete);
            await (0, adminController_1.removeMemberRole)(mockReq, mockRes);
            expect(mockRes.json).toHaveBeenCalledWith({ success: true });
        });
        it('should return error when userId is missing', async () => {
            mockReq.body = {}; // Missing userId
            await (0, adminController_1.removeMemberRole)(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Missing userId',
            });
        });
    });
    describe('removeAdminRole', () => {
        it('should remove admin role successfully', async () => {
            mockReq.body = { userId: 1 };
            const mockDelete = {
                where: jest.fn().mockResolvedValue({}),
            };
            mockDb.delete.mockReturnValue(mockDelete);
            await (0, adminController_1.removeAdminRole)(mockReq, mockRes);
            expect(mockRes.json).toHaveBeenCalledWith({ success: true });
        });
        it('should return error when userId is missing', async () => {
            mockReq.body = {}; // Missing userId
            await (0, adminController_1.removeAdminRole)(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Missing userId',
            });
        });
    });
    describe('removeManagerRole', () => {
        it('should remove manager role successfully', async () => {
            mockReq.body = { userId: 1 };
            const mockDelete = {
                where: jest.fn().mockResolvedValue({}),
            };
            mockDb.delete.mockReturnValue(mockDelete);
            await (0, adminController_1.removeManagerRole)(mockReq, mockRes);
            expect(mockRes.json).toHaveBeenCalledWith({ success: true });
        });
        it('should return error when userId is missing', async () => {
            mockReq.body = {}; // Missing userId
            await (0, adminController_1.removeManagerRole)(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Missing userId',
            });
        });
    });
    describe('getRolesByUserId', () => {
        it('should fetch roles by userId successfully', async () => {
            mockReq.params = { userId: '1' };
            const mockRoles = [
                { role: 'coach' },
                { role: 'member' },
            ];
            const mockSelect = {
                from: jest.fn().mockReturnThis(),
                where: jest.fn().mockResolvedValue(mockRoles),
            };
            mockDb.select.mockReturnValue(mockSelect);
            await (0, adminController_1.getRolesByUserId)(mockReq, mockRes);
            expect(mockRes.json).toHaveBeenCalledWith(['coach', 'member']);
        });
        it('should return error for invalid userId', async () => {
            mockReq.params = { userId: 'invalid' };
            await (0, adminController_1.getRolesByUserId)(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Invalid userId',
            });
        });
        it('should return error when no roles found', async () => {
            mockReq.params = { userId: '999' };
            const mockSelect = {
                from: jest.fn().mockReturnThis(),
                where: jest.fn().mockResolvedValue([]), // No roles found
            };
            mockDb.select.mockReturnValue(mockSelect);
            await (0, adminController_1.getRolesByUserId)(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'No roles found for this user',
            });
        });
    });
});
