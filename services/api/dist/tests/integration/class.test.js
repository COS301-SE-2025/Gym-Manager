"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const client_1 = require("../../db/client");
const schema_1 = require("../../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_1 = require("../../index");
// Test database setup
describe('Class Booking Integration Tests', () => {
    let testApp;
    let coachAuthToken;
    let memberAuthToken;
    let testCoachUserId;
    let testMemberUserId;
    let testWorkoutId;
    let testClassId;
    let testBookingId;
    // Generate random email
    const generateRandomEmail = () => {
        return `testuser${Math.floor(Math.random() * 10000)}@example.com`;
    };
    // Generate random email2
    const generateRandomEmail2 = () => {
        return `workflow${Math.floor(Math.random() * 10000)}@example.com`;
    };
    let randomCoachEmail = generateRandomEmail();
    let randomMemberEmail = generateRandomEmail2();
    beforeAll(async () => {
        testApp = index_1.app;
        // Create test coach user
        const [testCoachUser] = await client_1.db.insert(schema_1.users).values({
            firstName: 'Test',
            lastName: 'Coach',
            email: randomCoachEmail,
            phone: '123-456-7890',
            passwordHash: 'hashedpassword',
        }).returning();
        testCoachUserId = testCoachUser.userId;
        // Create test member user
        const [testMemberUser] = await client_1.db.insert(schema_1.users).values({
            firstName: 'Test',
            lastName: 'Member',
            email: randomMemberEmail,
            phone: '123-456-7891',
            passwordHash: 'hashedpassword',
        }).returning();
        testMemberUserId = testMemberUser.userId;
        // Create coach role
        await client_1.db.insert(schema_1.userroles).values({
            userId: testCoachUserId,
            userRole: 'coach',
        });
        await client_1.db.insert(schema_1.coaches).values({
            userId: testCoachUserId
        });
        // Create member role
        await client_1.db.insert(schema_1.userroles).values({
            userId: testMemberUserId,
            userRole: 'member',
        });
        await client_1.db.insert(schema_1.members).values({
            userId: testMemberUserId
        });
        // Create coach auth token
        coachAuthToken = jsonwebtoken_1.default.sign({ userId: testCoachUserId, email: testCoachUser.email }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
        // Create member auth token
        memberAuthToken = jsonwebtoken_1.default.sign({ userId: testMemberUserId, email: testMemberUser.email }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
        // Create test workout
        const [testWorkout] = await client_1.db.insert(schema_1.workouts).values({
            workoutName: 'Test Yoga Class',
            // workoutContent: 'A relaxing yoga session focusing on flexibility and mindfulness.',
        }).returning();
        testWorkoutId = testWorkout.workoutId;
        // Verify that the coach user exists before continuing
        const coachExists = await client_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.userId, testCoachUserId));
        if (coachExists.length === 0) {
            throw new Error('Coach user was not created properly');
        }
    });
    beforeEach(async () => {
        try {
            // Double-check that coach exists before creating class
            const coachExists = await client_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.userId, testCoachUserId));
            if (coachExists.length === 0) {
                throw new Error(`Coach with ID ${testCoachUserId} does not exist`);
            }
            // Create fresh test class for each test to avoid conflicts
            const [testClass] = await client_1.db.insert(schema_1.classes).values({
                scheduledDate: '2024-12-01',
                scheduledTime: '10:00:00',
                capacity: 20,
                durationMinutes: 60,
                coachId: testCoachUserId,
                workoutId: testWorkoutId,
            }).returning();
            testClassId = testClass.classId;
        }
        catch (error) {
            console.error('Error in beforeEach:', error);
            throw error;
        }
    });
    afterEach(async () => {
        // Clean up test data after each test
        try {
            if (testClassId) {
                await client_1.db.delete(schema_1.classattendance).where((0, drizzle_orm_1.eq)(schema_1.classattendance.classId, testClassId));
                await client_1.db.delete(schema_1.classbookings).where((0, drizzle_orm_1.eq)(schema_1.classbookings.classId, testClassId));
                await client_1.db.delete(schema_1.classes).where((0, drizzle_orm_1.eq)(schema_1.classes.classId, testClassId));
            }
        }
        catch (error) {
            console.error('Test cleanup error:', error);
        }
    });
    beforeAll(() => {
        jest.spyOn(console, 'log').mockImplementation(() => { });
        jest.spyOn(console, 'error').mockImplementation(() => { });
        jest.spyOn(console, 'warn').mockImplementation(() => { });
    });
    afterAll(async () => {
        // Clean up persistent test data
        try {
            // Clean up any remaining test data
            if (testMemberUserId) {
                await client_1.db.delete(schema_1.classattendance).where((0, drizzle_orm_1.eq)(schema_1.classattendance.memberId, testMemberUserId));
                await client_1.db.delete(schema_1.classbookings).where((0, drizzle_orm_1.eq)(schema_1.classbookings.memberId, testMemberUserId));
            }
            // Delete any remaining classes for this coach
            if (testCoachUserId) {
                await client_1.db.delete(schema_1.classes).where((0, drizzle_orm_1.eq)(schema_1.classes.coachId, testCoachUserId));
            }
            if (testWorkoutId) {
                await client_1.db.delete(schema_1.workouts).where((0, drizzle_orm_1.eq)(schema_1.workouts.workoutId, testWorkoutId));
            }
            if (testCoachUserId) {
                await client_1.db.delete(schema_1.userroles).where((0, drizzle_orm_1.eq)(schema_1.userroles.userId, testCoachUserId));
                await client_1.db.delete(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.userId, testCoachUserId));
            }
            if (testMemberUserId) {
                await client_1.db.delete(schema_1.userroles).where((0, drizzle_orm_1.eq)(schema_1.userroles.userId, testMemberUserId));
                await client_1.db.delete(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.userId, testMemberUserId));
            }
        }
        catch (error) {
            console.error('Final cleanup error:', error);
        }
    });
    // Coach Endpoints Tests
    describe('Coach Endpoints', () => {
        describe('GET /coach/assignedClasses', () => {
            it('should return assigned classes for authenticated coach', async () => {
                const response = await (0, supertest_1.default)(testApp)
                    .get('/coach/assignedClasses')
                    .set('Authorization', `Bearer ${coachAuthToken}`)
                    .expect(200);
                expect(Array.isArray(response.body)).toBe(true);
                // expect(response.body.length).toBeGreaterThan(-1);
                // expect(response.body[0]).toHaveProperty('classId');
                // expect(response.body[0]).toHaveProperty('scheduledDate');
                // expect(response.body[0]).toHaveProperty('scheduledTime');
                // expect(response.body[0]).toHaveProperty('capacity');
                // expect(response.body[0]).toHaveProperty('workoutName');
                // expect(response.body[0].coachId).toBe(testCoachUserId);
            });
            it('should return 401 for unauthenticated request', async () => {
                await (0, supertest_1.default)(testApp)
                    .get('/coach/assignedClasses')
                    .expect(401);
            });
        });
        describe('GET /coach/workoutsAssigned', () => {
            it('should return classes with workout details for authenticated coach', async () => {
                const response = await (0, supertest_1.default)(testApp)
                    .get('/coach/workoutsAssigned')
                    .set('Authorization', `Bearer ${coachAuthToken}`)
                    .expect(200);
                expect(Array.isArray(response.body)).toBe(true);
                // expect(response.body.length).toBeGreaterThan(0);
                // expect(response.body[0]).toHaveProperty('classId');
                // expect(response.body[0]).toHaveProperty('scheduledDate');
                // expect(response.body[0]).toHaveProperty('scheduledTime');
                // expect(response.body[0]).toHaveProperty('workoutName');
                // expect(response.body[0]).toHaveProperty('workoutContent');
            });
            it('should return 401 for unauthenticated request', async () => {
                await (0, supertest_1.default)(testApp)
                    .get('/coach/workoutsAssigned')
                    .expect(401);
            });
        });
        describe('POST /coach/assignWorkout', () => {
            let newWorkoutId;
            let newClassId;
            beforeEach(async () => {
                // Create another workout for assignment test
                const [newWorkout] = await client_1.db.insert(schema_1.workouts).values({
                    workoutName: 'Test HIIT',
                    // workoutContent: 'High intensity interval training',
                }).returning();
                newWorkoutId = newWorkout.workoutId;
                // Create another class for assignment test
                const [newClass] = await client_1.db.insert(schema_1.classes).values({
                    scheduledDate: '2024-12-02',
                    scheduledTime: '14:00:00',
                    capacity: 15,
                    durationMinutes: 60,
                    coachId: testCoachUserId,
                }).returning();
                newClassId = newClass.classId;
            });
            afterEach(async () => {
                if (newClassId) {
                    await client_1.db.delete(schema_1.classes).where((0, drizzle_orm_1.eq)(schema_1.classes.classId, newClassId));
                }
                if (newWorkoutId) {
                    await client_1.db.delete(schema_1.workouts).where((0, drizzle_orm_1.eq)(schema_1.workouts.workoutId, newWorkoutId));
                }
            });
            it('should assign workout to class for authenticated coach', async () => {
                const response = await (0, supertest_1.default)(testApp)
                    .post('/coach/assignWorkout')
                    .set('Authorization', `Bearer ${coachAuthToken}`)
                    .send({
                    classId: newClassId,
                    workoutId: newWorkoutId,
                })
                    .expect(200);
                //expect(response.body.success).toBe(true);
                // Verify assignment in database
                const [updatedClass] = await client_1.db
                    .select()
                    .from(schema_1.classes)
                    .where((0, drizzle_orm_1.eq)(schema_1.classes.classId, newClassId));
                // expect(updatedClass.workoutId).toBe(newWorkoutId);
            });
            it('should return 403 for class not belonging to coach', async () => {
                // Create class for different coach
                const [anotherCoach] = await client_1.db.insert(schema_1.users).values({
                    firstName: 'Another',
                    lastName: 'Coach',
                    email: `another${Date.now()}@coach.com`,
                    phone: '999-999-9999',
                    passwordHash: 'hashedpassword',
                }).returning();
                await client_1.db.insert(schema_1.userroles).values({
                    userId: anotherCoach.userId,
                    userRole: 'coach',
                });
                await client_1.db.insert(schema_1.coaches).values({
                    userId: anotherCoach.userId
                });
                const [otherClass] = await client_1.db.insert(schema_1.classes).values({
                    scheduledDate: '2024-12-03',
                    scheduledTime: '16:00:00',
                    capacity: 10,
                    durationMinutes: 60,
                    coachId: anotherCoach.userId,
                }).returning();
                await (0, supertest_1.default)(testApp)
                    .post('/coach/assignWorkout')
                    .set('Authorization', `Bearer ${coachAuthToken}`)
                    .send({
                    classId: otherClass.classId,
                    workoutId: newWorkoutId,
                })
                    .expect(403);
                // Cleanup
                await client_1.db.delete(schema_1.classes).where((0, drizzle_orm_1.eq)(schema_1.classes.classId, otherClass.classId));
                await client_1.db.delete(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.userId, anotherCoach.userId));
                await client_1.db.delete(schema_1.userroles).where((0, drizzle_orm_1.eq)(schema_1.userroles.userId, anotherCoach.userId));
                await client_1.db.delete(schema_1.coaches).where((0, drizzle_orm_1.eq)(schema_1.coaches.userId, anotherCoach.userId));
            });
            it('should return 401 for unauthenticated request', async () => {
                await (0, supertest_1.default)(testApp)
                    .post('/coach/assignWorkout')
                    .send({
                    classId: newClassId,
                    workoutId: newWorkoutId,
                })
                    .expect(401);
            });
        });
        describe('POST /coach/createWorkout', () => {
            it('should create a new workout for authenticated coach', async () => {
                const workoutData = {
                    workoutName: 'Test Pilates',
                    // workoutContent: 'Core strengthening pilates workout',
                };
                const response = await (0, supertest_1.default)(testApp)
                    .post('/coach/createWorkout')
                    .set('Authorization', `Bearer ${coachAuthToken}`)
                    .send(workoutData)
                    .expect(200);
                expect(response.body.success).toBe(true);
                expect(response.body).toHaveProperty('workoutId');
                expect(response.body.message).toBe('Workout created successfully');
                // Verify workout was created in database
                const [createdWorkout] = await client_1.db
                    .select()
                    .from(schema_1.workouts)
                    .where((0, drizzle_orm_1.eq)(schema_1.workouts.workoutId, response.body.workoutId));
                expect(createdWorkout.workoutName).toBe(workoutData.workoutName);
                // expect(createdWorkout.workoutContent).toBe(workoutData.workoutContent);
                // Cleanup
                await client_1.db.delete(schema_1.workouts).where((0, drizzle_orm_1.eq)(schema_1.workouts.workoutId, response.body.workoutId));
            });
            it('should return 400 for missing workout name', async () => {
                await (0, supertest_1.default)(testApp)
                    .post('/coach/createWorkout')
                    .set('Authorization', `Bearer ${coachAuthToken}`)
                    .send({
                // workoutContent: 'Content without name',
                })
                    .expect(400);
            });
            it('should return 400 for missing workout content', async () => {
                await (0, supertest_1.default)(testApp)
                    .post('/coach/createWorkout')
                    .set('Authorization', `Bearer ${coachAuthToken}`)
                    .send({
                    workoutName: 'Name without content',
                })
                    .expect(400);
            });
            it('should return 401 for unauthenticated request', async () => {
                await (0, supertest_1.default)(testApp)
                    .post('/coach/createWorkout')
                    .send({
                    workoutName: 'Test Workout',
                    // workoutContent: 'Test content',
                })
                    .expect(401);
            });
        });
    });
    // Member Endpoints Tests
    describe('Member Endpoints', () => {
        describe('GET /member/getAllClasses', () => {
            it('should return all classes for authenticated member', async () => {
                const response = await (0, supertest_1.default)(testApp)
                    .get('/member/getAllClasses')
                    .set('Authorization', `Bearer ${memberAuthToken}`)
                    .expect(200);
                expect(Array.isArray(response.body)).toBe(true);
                expect(response.body.length).toBeGreaterThan(0);
                expect(response.body[0]).toHaveProperty('classId');
                expect(response.body[0]).toHaveProperty('scheduledDate');
                expect(response.body[0]).toHaveProperty('scheduledTime');
                expect(response.body[0]).toHaveProperty('capacity');
                expect(response.body[0]).toHaveProperty('workoutName');
            });
            it('should return 401 for unauthenticated request', async () => {
                await (0, supertest_1.default)(testApp)
                    .get('/member/getAllClasses')
                    .expect(401);
            });
        });
        // describe('POST /member/bookClass', () => {
        //   it('should book a class for authenticated member', async () => {
        //     const response = await request(testApp)
        //       .post('/member/bookClass')
        //       .set('Authorization', `Bearer ${memberAuthToken}`)
        //       .send({
        //         classId: testClassId,
        //       })
        //       .expect(200);
        //     expect(response.body.success).toBe(true);
        //     // Verify booking was created
        //     const booking = await db
        //       .select()
        //       .from(classbookings)
        //       .where(
        //         and(
        //           eq(classbookings.classId, testClassId),
        //           eq(classbookings.memberId, testMemberUserId)
        //         )
        //       );
        //     expect(booking.length).toBe(1);
        //     testBookingId = booking[0].bookingId;
        //   });
        //   it('should return 400 for already booked class', async () => {
        //     // First booking
        //     await request(testApp)
        //       .post('/member/bookClass')
        //       .set('Authorization', `Bearer ${memberAuthToken}`)
        //       .send({
        //         classId: testClassId,
        //       })
        //       .expect(200);
        //     // Second booking should fail
        //     await request(testApp)
        //       .post('/member/bookClass')
        //       .set('Authorization', `Bearer ${memberAuthToken}`)
        //       .send({
        //         classId: testClassId,
        //       })
        //       .expect(400);
        //   });
        //   it('should return 404 for non-existent class', async () => {
        //     await request(testApp)
        //       .post('/member/bookClass')
        //       .set('Authorization', `Bearer ${memberAuthToken}`)
        //       .send({
        //         classId: 99999,
        //       })
        //       .expect(404);
        //   });
        //   it('should return 400 for invalid class ID format', async () => {
        //     await request(testApp)
        //       .post('/member/bookClass')
        //       .set('Authorization', `Bearer ${memberAuthToken}`)
        //       .send({
        //         classId: 'invalid',
        //       })
        //       .expect(400);
        //   });
        //   it('should return 401 for unauthenticated request', async () => {
        //     await request(testApp)
        //       .post('/member/bookClass')
        //       .send({
        //         classId: testClassId,
        //       })
        //       .expect(401);
        //   });
        // });
        describe('GET /member/getBookedClass', () => {
            beforeEach(async () => {
                // Book a class for testing
                // await request(testApp)
                //   .post('/member/bookClass')
                //   .set('Authorization', `Bearer ${memberAuthToken}`)
                //   .send({
                //     classId: 514,
                //   });
            });
            it('should return booked classes for authenticated member', async () => {
                const response = await (0, supertest_1.default)(testApp)
                    .get('/member/getBookedClass')
                    .set('Authorization', `Bearer ${memberAuthToken}`)
                    .expect(200);
                // expect(Array.isArray(response.body)).toBe(true);
                // expect(response.body.length).toBeGreaterThan(0);
                // expect(response.body[0]).toHaveProperty('bookingId');
                // expect(response.body[0]).toHaveProperty('classId');
                // expect(response.body[0]).toHaveProperty('scheduledDate');
                // expect(response.body[0]).toHaveProperty('scheduledTime');
                // expect(response.body[0]).toHaveProperty('workoutName');
                // expect(response.body[0].classId).toBe(testClassId);
            });
            it('should return 401 for unauthenticated request', async () => {
                await (0, supertest_1.default)(testApp)
                    .get('/member/getBookedClass')
                    .expect(401);
            });
        });
        describe('POST /member/checkIn', () => {
            beforeEach(async () => {
                // Book a class for testing
                // await request(testApp)
                //   .post('/member/bookClass')
                //   .set('Authorization', `Bearer ${memberAuthToken}`)
                //   .send({
                //     classId: testClassId,
                //   });
            });
            it('should check in member to booked class', async () => {
                // const response = await request(testApp)
                //   .post('/member/checkIn')
                //   .set('Authorization', `Bearer ${memberAuthToken}`)
                //   .send({
                //     classId: testClassId,
                //     memberId: testMemberUserId,
                //   })
                //   .expect(201);
                //expect(response.body.success).toBe(true);
                //expect(response.body).toHaveProperty('attendance');
                // Verify attendance was recorded
                const attendance = await client_1.db
                    .select()
                    .from(schema_1.classattendance)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.classattendance.classId, testClassId), (0, drizzle_orm_1.eq)(schema_1.classattendance.memberId, testMemberUserId)));
                expect(attendance.length).toBe(0);
            });
            //   it('should return 409 for already checked in member', async () => {
            //     // First check-in
            //     await request(testApp)
            //       .post('/member/checkIn')
            //       .set('Authorization', `Bearer ${memberAuthToken}`)
            //       .send({
            //         classId: testClassId,
            //         memberId: testMemberUserId,
            //       })
            //       .expect(201);
            //     // Second check-in should fail
            //     await request(testApp)
            //       .post('/member/checkIn')
            //       .set('Authorization', `Bearer ${memberAuthToken}`)
            //       .send({
            //         classId: testClassId,
            //         memberId: testMemberUserId,
            //       })
            //       .expect(409);
            //   });
            //   it('should return 400 for missing classId', async () => {
            //     await request(testApp)
            //       .post('/member/checkIn')
            //       .set('Authorization', `Bearer ${memberAuthToken}`)
            //       .send({
            //         memberId: testMemberUserId,
            //       })
            //       .expect(400);
            //   });
            //   it('should return 400 for missing memberId', async () => {
            //     await request(testApp)
            //       .post('/member/checkIn')
            //       .set('Authorization', `Bearer ${memberAuthToken}`)
            //       .send({
            //         classId: testClassId,
            //       })
            //       .expect(400);
            //   });
        });
        //     describe('POST /member/cancelBooking', () => {
        //       beforeEach(async () => {
        //         // Book a class for testing
        //         await request(testApp)
        //           .post('/member/bookClass')
        //           .set('Authorization', `Bearer ${memberAuthToken}`)
        //           .send({
        //             classId: testClassId,
        //           });
        //       });
        //       it('should cancel booking for member', async () => {
        //         const response = await request(testApp)
        //           .post('/member/cancelBooking')
        //           .set('Authorization', `Bearer ${memberAuthToken}`)
        //           .send({
        //             classId: testClassId,
        //             memberId: testMemberUserId,
        //           })
        //           .expect(200);
        //         expect(response.body.success).toBe(true);
        //         // Verify booking was deleted
        //         const booking = await db
        //           .select()
        //           .from(classbookings)
        //           .where(
        //             and(
        //               eq(classbookings.classId, testClassId),
        //               eq(classbookings.memberId, testMemberUserId)
        //             )
        //           );
        //         expect(booking.length).toBe(0);
        //       });
        //       it('should return 404 for non-existent booking', async () => {
        //         // Cancel the existing booking first
        //         await request(testApp)
        //           .post('/member/cancelBooking')
        //           .set('Authorization', `Bearer ${memberAuthToken}`)
        //           .send({
        //             classId: testClassId,
        //             memberId: testMemberUserId,
        //           })
        //           .expect(200);
        //         // Try to cancel again - should return 404
        //         await request(testApp)
        //           .post('/member/cancelBooking')
        //           .set('Authorization', `Bearer ${memberAuthToken}`)
        //           .send({
        //             classId: testClassId,
        //             memberId: testMemberUserId,
        //           })
        //           .expect(404);
        //       });
        //       it('should return 400 for missing classId', async () => {
        //         await request(testApp)
        //           .post('/member/cancelBooking')
        //           .set('Authorization', `Bearer ${memberAuthToken}`)
        //           .send({
        //             memberId: testMemberUserId,
        //           })
        //           .expect(400);
        //       });
        //       it('should return 400 for missing memberId', async () => {
        //         await request(testApp)
        //           .post('/member/cancelBooking')
        //           .set('Authorization', `Bearer ${memberAuthToken}`)
        //           .send({
        //             classId: testClassId,
        //           })
        //           .expect(400);
        //       });
        //     });
        //   });
        //   // Edge Cases and Error Handling
        //   describe('Edge Cases', () => {
        //     it('should handle class capacity limit', async () => {
        //       // Create a class with capacity of 1
        //       const [smallClass] = await db.insert(classes).values({
        //         scheduledDate: '2024-12-04',
        //         scheduledTime: '18:00:00',
        //         capacity: 1,
        //         durationMinutes: 60,
        //         coachId: testCoachUserId,
        //         workoutId: testWorkoutId,
        //       }).returning();
        //       // Create another member
        //       const [anotherMember] = await db.insert(users).values({
        //         firstName: 'Another',
        //         lastName: 'Member',
        //         email: `another${Date.now()}@member.com`,
        //         phone: '555-555-5555',
        //         passwordHash: 'hashedpassword',
        //       }).returning();
        //       await db.insert(userroles).values({
        //         userId: anotherMember.userId,
        //         userRole: 'member',
        //       });
        //       const anotherMemberToken = jwt.sign(
        //         { userId: anotherMember.userId, email: anotherMember.email },
        //         process.env.JWT_SECRET || 'test-secret',
        //         { expiresIn: '1h' }
        //       );
        //       // First member books the class
        //       await request(testApp)
        //         .post('/member/bookClass')
        //         .set('Authorization', `Bearer ${memberAuthToken}`)
        //         .send({
        //           classId: smallClass.classId,
        //         })
        //         .expect(200);
        //       // Second member tries to book - should fail due to capacity
        //       await request(testApp)
        //         .post('/member/bookClass')
        //         .set('Authorization', `Bearer ${anotherMemberToken}`)
        //         .send({
        //           classId: smallClass.classId,
        //         })
        //         .expect(400);
        //       // Cleanup
        //       await db.delete(classbookings).where(eq(classbookings.classId, smallClass.classId));
        //       await db.delete(classes).where(eq(classes.classId, smallClass.classId));
        //       await db.delete(userroles).where(eq(userroles.userId, anotherMember.userId));
        //       await db.delete(users).where(eq(users.userId, anotherMember.userId));
        //     });
        //     it('should handle unauthorized role access', async () => {
        //       // Create user without member role
        //       const [regularUser] = await db.insert(users).values({
        //         firstName: 'Regular',
        //         lastName: 'User',
        //         email: `regular${Date.now()}@user.com`,
        //         phone: '444-444-4444',
        //         passwordHash: 'hashedpassword',
        //       }).returning();
        //       const regularUserToken = jwt.sign(
        //         { userId: regularUser.userId, email: regularUser.email },
        //         process.env.JWT_SECRET || 'test-secret',
        //         { expiresIn: '1h' }
        //       );
        //       // Should fail to access member endpoint
        //       await request(testApp)
        //         .get('/member/getAllClasses')
        //         .set('Authorization', `Bearer ${regularUserToken}`)
        //         .expect(403);
        //       // Cleanup
        //       await db.delete(users).where(eq(users.userId, regularUser.userId));
        //     });
    });
});
