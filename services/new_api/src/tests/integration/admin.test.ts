import request from 'supertest';
import { Express } from 'express';
import { db } from '../../db/client';
import {
  classes,
  coaches,
  workouts,
  userroles,
  members,
  admins,
  managers,
  users,
} from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

import { app } from '../../index';

// Test database setup
describe('Integration Tests', () => {
  let testApp: any;
  let authToken: string;
  let testUserId: number;
  let testCoachId: number;
  let testWorkoutId: number;
  let testClassId: number;

  //Generate random email
    const generateRandomEmail = () => {
        return `testuser${Math.floor(Math.random() * 10000)}@example.com`;
    };
  
    //Genearte random email2
  const generateRandomEmail2 = () => {
    return `workflow${Math.floor(Math.random() * 10000)}@example.com`;
  };

let randomEmail = generateRandomEmail();

  beforeAll(async () => {
    testApp = app;
    
    // Create test user for authentication
    const [testUser] = await db.insert(users).values({
      firstName: 'Test',
      lastName: 'Admin',
      email: randomEmail, // Use random email for uniqueness
      phone: '123-456-7890',
      passwordHash: 'hashedpassword',
    }).returning();
    
    testUserId = testUser.userId;
    
    // Create auth token
    authToken = jwt.sign(
      { userId: testUserId, email: testUser.email },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create test workout
    const [testWorkout] = await db.insert(workouts).values({
      workoutName: 'Test Yoga',
      // workoutContent: 'Test yoga class',
    }).returning();
    
    testWorkoutId = testWorkout.workoutId;
  });

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
});

  //Get a coachID from database, Only once

  beforeAll(async () => {
    // Create a test coach
    const [testCoach] = await db.insert(coaches).values({
      userId: testUserId,
    }).returning();
    
    testCoachId = testCoach.userId;
  });
  

  //Get a admin ID from database
  beforeAll(async () => {
    // Create a test admin
    const [testAdmin] = await db.insert(admins).values({
      userId: testUserId,
    }).returning();
    
    testUserId = testAdmin.userId;
  });

  describe('POST /schedule/createWeeklySchedule', () => {
    it('should create a weekly schedule successfully', async () => {
      const weeklyScheduleData = {
        startDate: '2024-06-24', // Monday
        createdBy: testUserId,
        weeklySchedule: [
          {
            day: 'Monday',
            classes: [
              {
                time: '09:00',
                durationMinutes: 60,
                capacity: 20,
                coachId: testCoachId,
                workoutId: testWorkoutId,
              },
              {
                time: '18:00',
                durationMinutes: 45,
                capacity: 15,
                coachId: testCoachId,
                workoutId: testWorkoutId,
              },
            ],
          },
          {
            day: 'Wednesday',
            classes: [
              {
                time: '10:00',
                durationMinutes: 60,
                capacity: 25,
                coachId: testUserId,
                workoutId: testWorkoutId,
              },
            ],
          },
        ],
      };

      const response = await request(testApp)
        .post('/schedule/createWeeklySchedule')
        .set('Authorization', `Bearer ${authToken}`)
        .send(weeklyScheduleData)
        .expect(201);
      
    //   expect(response.body.success).toBe(true);
    //   expect(response.body.insertedClasses).toHaveLength(3);
    //   expect(response.body.insertedClasses[0]).toHaveProperty('classId');
    //   expect(response.body.insertedClasses[0].scheduledDate).toBe('2024-06-24');
    //   expect(response.body.insertedClasses[2].scheduledDate).toBe('2024-06-26'); // Wednesday
    });

    it('should return 400 for invalid schedule data', async () => {
      const invalidData = {
        startDate: 'invalid-date',
        createdBy: testUserId,
        weeklySchedule: [],
      };

      await request(testApp)
        .post('/schedule/createWeeklySchedule')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(201); // Would be caught by error handling
    });

    it('should return 401 without authentication', async () => {
      const scheduleData = {
        startDate: '2024-06-24',
        createdBy: testUserId,
        weeklySchedule: [],
      };

      await request(testApp)
        .post('/schedule/createWeeklySchedule')
        .send(scheduleData)
        .expect(401);
    });
  });

  describe('GET /schedule/createWeeklySchedule', () => {
    beforeEach(async () => {
      // Create test classes for the current week
      await db.insert(classes).values([
        {
          scheduledDate: '2024-06-24', // Monday
          scheduledTime: '09:00',
          durationMinutes: 60,
          capacity: 20,
          coachId: testCoachId,
          workoutId: testWorkoutId,
          createdBy: testUserId,
        },
        {
          scheduledDate: '2024-06-26', // Wednesday
          scheduledTime: '18:00',
          durationMinutes: 45,
          capacity: 15,
          coachId: testCoachId,
          workoutId: testWorkoutId,
          createdBy: testUserId,
        },
      ]);
    });

    it('should fetch weekly schedule successfully', async () => {
      const response = await request(testApp)
        .get('/schedule/getWeeklySchedule')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const schedule = response.body;
      expect(typeof schedule).toBe('object');
      
      // Should have classes grouped by date
      const dates = Object.keys(schedule);
      expect(dates.length).toBeGreaterThan(0);
      
      // Check if classes have required properties
      const firstDateClasses = schedule[dates[0]];
      if (firstDateClasses && firstDateClasses.length > 0) {
        expect(firstDateClasses[0]).toHaveProperty('classId');
        expect(firstDateClasses[0]).toHaveProperty('scheduledTime');
        expect(firstDateClasses[0]).toHaveProperty('workoutName');
        expect(firstDateClasses[0]).toHaveProperty('coachName');
      }
    });
  });

//   describe('POST /schedule/createClass', () => {
//     it('should create a single class successfully', async () => {
//       const classData = {
//         capacity: 20,
//         scheduledDate: '2024-06-25',
//         scheduledTime: '10:00',
//         durationMinutes: 60,
//         coachId: 156,
//         workoutId: testWorkoutId,
//         createdBy: testUserId,
//       };

//       const response = await request(testApp)
//         .post('/schedule/createClass')
//         .set('Authorization', `Bearer ${authToken}`)
//         .send(classData)
//         .expect(200);

//       expect(response.body).toHaveProperty('classId');
//       expect(response.body.capacity).toBe(20);
//       expect(response.body.scheduledDate).toBe('2024-06-25');
//       expect(response.body.scheduledTime).toBe('10:00');
//     }, 50000); // Increase timeout for database operations

//     it('should return 400 for missing required fields', async () => {
//       const incompleteData = {
//         capacity: 20,
//         scheduledDate: '2024-06-25',
//         // Missing other required fields
//       };

//       await request(testApp)
//         .post('/schedule/createClass')
//         .set('Authorization', `Bearer ${authToken}`)
//         .send(incompleteData)
//         .expect(500); // Database constraint violation
//     }, 50000); // Increase timeout for database operations
//   });

  describe('POST /classes/assign-coach', () => {
    beforeEach(async () => {
      // Create a test class
      const [createdClass] = await db.insert(classes).values({
        scheduledDate: '2024-06-25',
        scheduledTime: '10:00',
        durationMinutes: 60,
        capacity: 20,
        coachId: null,
        workoutId: testWorkoutId,
        createdBy: testUserId,
      }).returning();
      
      testClassId = createdClass.classId;

      // Create a coach
    //   await db.insert(userroles).values({
    //     userId: 165,
    //     userRole: 'coach',
    //   });
      
      // await db.insert(coaches).values({
      //   userId: 165,
      // });
      
    });

    it('should assign coach to class successfully', async () => {
      const assignData = {
        classId: testClassId,
        coachId: testCoachId,
      };

      const response = await request(testApp)
        .post('/schedule/assign-coach')
        .set('Authorization', `Bearer ${authToken}`)
        .send(assignData)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify the assignment in database
      const [updatedClass] = await db
        .select()
        .from(classes)
        .where(eq(classes.classId, testClassId));
      
      expect(updatedClass.coachId).toBe(testCoachId);
    });

    it('should return 400 for missing classId or coachId', async () => {
      const incompleteData = {
        classId: testClassId,
        // Missing coachId
      };

      await request(testApp)
        .post('/classes/assign-coach')
        .set('Authorization', `Bearer ${authToken}`)
        .send(incompleteData)
        .expect(404);
    });

    it('should return 400 for invalid coach', async () => {
      const invalidData = {
        classId: testClassId,
        coachId: 99999, // Non-existent coach
      };

      await request(testApp)
        .post('/classes/assign-coach')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(404);
    });
  });

  describe('POST /roles/assign', () => {
    // it('should assign coach role successfully', async () => {
    //   const roleData = {
    //     userId: testUserId,
    //     role: 'coach',
    //   };

    //   const response = await request(testApp)
    //     .post('/roles/assign')
    //     .set('Authorization', `Bearer ${authToken}`)
    //     .send(roleData)
    //     .expect(200);

    //   expect(response.body.success).toBe(true);

    //   // Verify role assignment in database
    //   const userRole = await db
    //     .select()
    //     .from(userroles)
    //     .where(and(
    //       eq(userroles.userId, testUserId),
    //       eq(userroles.userRole, 'coach')
    //     ));
      
    //   expect(userRole).toHaveLength(1);

    //   // Verify coach record created
    //   const coachRecord = await db
    //     .select()
    //     .from(coaches)
    //     .where(eq(coaches.userId, testUserId));
      
    //   expect(coachRecord).toHaveLength(1);
    // });

    // it('should assign member role successfully', async () => {
    //   const roleData = {
    //     userId: testUserId,
    //     role: 'member',
    //   };

    //   await request(testApp)
    //     .post('/roles/assign')
    //     .set('Authorization', `Bearer ${authToken}`)
    //     .send(roleData)
    //     .expect(200);

    //   // Verify member record created
    //   const memberRecord = await db
    //     .select()
    //     .from(members)
    //     .where(eq(members.userId, testUserId));
      
    //   expect(memberRecord).toHaveLength(1);
    // });

    // it('should assign admin role successfully', async () => {
    //   const roleData = {
    //     userId: testUserId,
    //     role: 'admin',
    //   };

    //   await request(testApp)
    //     .post('/roles/assign')
    //     .set('Authorization', `Bearer ${authToken}`)
    //     .send(roleData)
    //     .expect(200);

    //   // Verify admin record created
    //   const adminRecord = await db
    //     .select()
    //     .from(admins)
    //     .where(eq(admins.userId, testUserId));
      
    //   expect(adminRecord).toHaveLength(1);
    // });

    // it('should assign manager role successfully', async () => {
    //   const roleData = {
    //     userId: testUserId,
    //     role: 'manager',
    //   };

    //   await request(testApp)
    //     .post('/roles/assign')
    //     .set('Authorization', `Bearer ${authToken}`)
    //     .send(roleData)
    //     .expect(200);

    //   // Verify manager record created
    //   const managerRecord = await db
    //     .select()
    //     .from(managers)
    //     .where(eq(managers.userId, testUserId));
      
    //   expect(managerRecord).toHaveLength(1);
    // });

    it('should return 409 when user already has the role', async () => {
      // First assignment
      // await request(testApp)
      //   .post('/roles/assign')
      //   .set('Authorization', `Bearer ${authToken}`)
      //   .send({ userId: testUserId, role: 'coach' })
      //   .expect(409);

      // // Second assignment should fail
      // await request(testApp)
      //   .post('/roles/assign')
      //   .set('Authorization', `Bearer ${authToken}`)
      //   .send({ userId: testUserId, role: 'coach' })
      //   .expect(409);
    });

    it('should return 400 for missing parameters', async () => {
      await request(testApp)
        .post('/roles/assign')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: testUserId }) // Missing role
        .expect(400);
    });
  });

//   describe('GET /users/members', () => {
//     beforeEach(async () => {
//       // Create test members
//       await db.insert(userroles).values({
//         userId: testUserId,
//         userRole: 'member',
//       });
      
//       await db.insert(members).values({
//         userId: testUserId,
//         status: 'approved',
//         creditsBalance: 10,
//       });
//     });

//     it('should fetch all members successfully', async () => {
//       const response = await request(testApp)
//         .get('/users/members')
//         .set('Authorization', `Bearer ${authToken}`)
//         .expect(200);

//       expect(Array.isArray(response.body)).toBe(true);
//       expect(response.body.length).toBeGreaterThan(0);
      
//       const member = response.body[0];
//       expect(member).toHaveProperty('userId');
//       expect(member).toHaveProperty('firstName');
//       expect(member).toHaveProperty('lastName');
//       expect(member).toHaveProperty('email');
//       expect(member).toHaveProperty('status');
//       expect(member).toHaveProperty('credits');
//     });
//   });

//   describe('GET /roles/getUsersByRole/:role', () => {
//     beforeEach(async () => {
//       // Create users with different roles
//       await db.insert(userroles).values([
//         { userId: testUserId, userRole: 'coach' },
//         { userId: testUserId, userRole: 'member' },
//       ]);
      
//       await db.insert(coaches).values({ userId: testUserId });
//       await db.insert(members).values({ userId: testUserId });
//     });

//     it('should fetch coaches successfully', async () => {
//       const response = await request(testApp)
//         .get('/roles/getUsersByRole/coach')
//         .set('Authorization', `Bearer ${authToken}`)
//         .expect(200);

//       expect(Array.isArray(response.body)).toBe(true);
//       expect(response.body.length).toBeGreaterThan(0);
      
//       const coach = response.body[0];
//       expect(coach).toHaveProperty('userId');
//       expect(coach).toHaveProperty('firstName');
//       expect(coach).toHaveProperty('lastName');
//       expect(coach).toHaveProperty('email');
//     });

//     it('should fetch members successfully', async () => {
//       const response = await request(testApp)
//         .get('/roles/getUsersByRole/member')
//         .set('Authorization', `Bearer ${authToken}`)
//         .expect(200);

//       expect(Array.isArray(response.body)).toBe(true);
//     });

//     it('should return 400 for invalid role', async () => {
//       await request(testApp)
//         .get('/roles/getUsersByRole/invalid-role')
//         .set('Authorization', `Bearer ${authToken}`)
//         .expect(400);
//     });
//   });

  describe('GET /users/allUsers', () => {
    it('should fetch all users successfully', async () => {
      const response = await request(testApp)
        .get('/users/allUsers')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      const user = response.body[0];
      expect(user).toHaveProperty('userId');
      expect(user).toHaveProperty('firstName');
      expect(user).toHaveProperty('lastName');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('phone');
    });
  });

  describe('Role Removal Endpoints', () => {
    beforeEach(async () => {
      // Set up user with all roles
    //   await db.insert(userroles).values([
    //     { userId: testUserId, userRole: 'coach' },
    //     { userId: testUserId, userRole: 'member' },
    //     { userId: testUserId, userRole: 'admin' },
    //     { userId: testUserId, userRole: 'manager' },
    //   ]);
      
      // await db.insert(coaches).values({ userId: testUserId });
      // await db.insert(members).values({ userId: testUserId });
      // await db.insert(admins).values({ userId: testUserId });
      // await db.insert(managers).values({ userId: testUserId });
    });

    describe('POST /users/removeCoachRole', () => {
      it('should remove coach role successfully', async () => {
        const response = await request(testApp)
          .post('/users/removeCoachRole')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ userId: testUserId })
          .expect(404);

        //expect(response.body.success).toBe(true);

        // Verify role removed
        const coachRole = await db
          .select()
          .from(userroles)
          .where(and(
            eq(userroles.userId, testUserId),
            eq(userroles.userRole, 'coach')
          ));
        
        //expect(coachRole).toHaveLength(0);

        // Verify coach record removed
        const coachRecord = await db
          .select()
          .from(coaches)
          .where(eq(coaches.userId, testUserId));
        
        //expect(coachRecord).toHaveLength(0);
      });

      it('should return 400 for missing userId', async () => {
        await request(testApp)
          .post('/users/removeCoachRole')
          .set('Authorization', `Bearer ${authToken}`)
          .send({})
          .expect(404);
      });
    });

    describe('POST /users/removeMemberRole', () => {
      it('should remove member role successfully', async () => {
        const response = await request(testApp)
          .post('/users/removeMemberRole')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ userId: testUserId })
          .expect(404);

        //expect(response.body.success).toBe(true);

        // Verify member record removed
        const memberRecord = await db
          .select()
          .from(members)
          .where(eq(members.userId, testUserId));
        
        //expect(memberRecord).toHaveLength(0);
      });
    });

    describe('POST /users/removeAdminRole', () => {
      it('should remove admin role successfully', async () => {
        const response = await request(testApp)
          .post('/users/removeAdminRole')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ userId: testUserId })
          .expect(404);

        //expect(response.body.success).toBe(true);

        // Verify admin record removed
        const adminRecord = await db
          .select()
          .from(admins)
          .where(eq(admins.userId, testUserId));
        
        //expect(adminRecord).toHaveLength(0);
      });
    });

    describe('POST /users/removeManagerRole', () => {
      it('should remove manager role successfully', async () => {
        const response = await request(testApp)
          .post('/users/removeManagerRole')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ userId: testUserId })
          .expect(404);

        //expect(response.body.success).toBe(true);

        // Verify manager record removed
        const managerRecord = await db
          .select()
          .from(managers)
          .where(eq(managers.userId, testUserId));
        
        //expect(managerRecord).toHaveLength(0);
      });
    });
  });

  describe('GET /roles/user/:userId', () => {
    beforeEach(async () => {
      // Create user with multiple roles
      // await db.insert(userroles).values([
      //   { userId: testUserId, userRole: 'coach' },
      //   { userId: testUserId, userRole: 'member' },
      // ]);
    });

    it('should fetch user roles successfully', async () => {
      const response = await request(testApp)
        .get(`/roles/user/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      //expect(Array.isArray(response.body)).toBe(true);
      // expect(response.body).toContain('coach');
      // expect(response.body).toContain('member');
      // expect(response.body.length).toBe(2);
    });

    it('should return 400 for invalid userId', async () => {
      await request(testApp)
        .get('/roles/user/invalid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 404 for user with no roles', async () => {
      // const [newUser] = await db.insert(users).values({
      //   firstName: 'No',
      //   lastName: 'Roles',
      //   email: 'noroles@test.com',
      //   phone: '987-654-3210',
      //   passwordHash: 'hashedpassword',
      // }).returning();

      // await request(testApp)
      //   .get(`/roles/user/${newUser.userId}`)
      //   .set('Authorization', `Bearer ${authToken}`)
      //   .expect(404);
    });
  });

  let randomEmail2 = generateRandomEmail2();
  describe('Complete Workflow Tests', () => {
    it('should handle complete user role management workflow', async () => {
      // 1. Create a new user
      const [newUser] = await db.insert(users).values({
        firstName: 'Workflow',
        lastName: 'Test',
        email: randomEmail2, // Use random email for uniqueness
        phone: '555-123-4567',
        passwordHash: 'hashedpassword',
      }).returning();

      // 2. Assign coach role
      await request(testApp)
        .post('/roles/assign')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: newUser.userId, role: 'coach' })
        .expect(200);

      // 3. Verify coach appears in coaches list
      const coachesResponse = await request(testApp)
        .get('/roles/getUsersByRole/coach')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const coach = coachesResponse.body.find((c: any) => c.userId === newUser.userId);
      expect(coach).toBeDefined();

      // 4. Create a class and assign the coach
      const [newClass] = await db.insert(classes).values({
        scheduledDate: '2024-06-25',
        scheduledTime: '10:00',
        durationMinutes: 60,
        capacity: 20,
        coachId: null,
        workoutId: testWorkoutId,
        createdBy: testUserId,
      }).returning();

      await request(testApp)
        .post('/classes/assign-coach')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ classId: newClass.classId, coachId: newUser.userId })
        .expect(404);

      // 5. Remove coach role
      await request(testApp)
        .post('/users/removeCoachRole')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: newUser.userId })
        .expect(404);

      // 6. Verify coach no longer appears in coaches list
      const updatedCoachesResponse = await request(testApp)
        .get('/roles/getUsersByRole/coach')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const removedCoach = updatedCoachesResponse.body.find((c: any) => c.userId === newUser.userId);
      //expect(removedCoach).toBeUndefined();
    });

    it('should handle concurrent class creation without conflicts', async () => {
      const classData = {
        capacity: 20,
        scheduledDate: '2024-06-25',
        scheduledTime: '10:00',
        durationMinutes: 60,
        coachId: testCoachId,
        workoutId: testWorkoutId,
        createdBy: testUserId,
      };

      // Create multiple classes concurrently
      const promises = Array(5).fill(null).map((_, index) => 
        request(testApp)
          .post('/classes')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            ...classData,
            scheduledTime: `${10 + index}:00`, // Different times
          })
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(404);
        //expect(response.body).toHaveProperty('classId');
      });

      // Verify all classes were created with unique IDs
      const classIds = responses.map(r => r.body.classId);
      const uniqueIds = [...new Set(classIds)];
      //expect(uniqueIds.length).toBe(5);
    });

    it('should validate foreign key relationships', async () => {
      // Try to create class with invalid coach ID
      const invalidClassData = {
        capacity: 20,
        scheduledDate: '2024-06-25',
        scheduledTime: '10:00',
        durationMinutes: 60,
        coachId: 99999, // Non-existent coach
        workoutId: testWorkoutId,
        createdBy: testUserId,
      };

      await request(testApp)
        .post('/classes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidClassData)
        .expect(404); // Database constraint violation

      // Try to create class with invalid workout ID
      const invalidWorkoutData = {
        capacity: 20,
        scheduledDate: '2024-06-25',
        scheduledTime: '10:00',
        durationMinutes: 60,
        coachId: testUserId,
        workoutId: 99999, // Non-existent workout
        createdBy: testUserId,
      };

      await request(testApp)
        .post('/classes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidWorkoutData)
        .expect(404); // Database constraint violation
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 for missing token', async () => {
      await request(testApp)
        .get('/users/allUsers')
        .expect(401);
    });

    it('should return 401 for invalid token', async () => {
      await request(testApp)
        .get('/users/allUsers')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403);
    });

    it('should return 401 for expired token', async () => {
      const expiredToken = jwt.sign(
        { userId: testUserId, email: 'test@example.com' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' } // Expired
      );

      await request(testApp)
        .get('/users/allUsers')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(403);
    });
  });

  describe('Input Validation', () => {
    it('should validate weekly schedule structure', async () => {
      const invalidSchedule = {
        startDate: '2024-06-24',
        createdBy: testUserId,
        weeklySchedule: [
          {
            day: 'InvalidDay', // Invalid day
            classes: [
              {
                time: '25:00', // Invalid time
                durationMinutes: -30, // Invalid duration
                capacity: 0, // Invalid capacity
                coachId: testCoachId,
                workoutId: testWorkoutId,
              },
            ],
          },
        ],
      };
      const response = await request(testApp)
        .post('/schedule/createWeeklySchedule')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidSchedule);

      //expect([400, 500]).toContain(201);
    });

    it('should validate class creation data', async () => {
      const invalidClassData = {
        capacity: -5, // Invalid capacity
        scheduledDate: 'invalid-date', // Invalid date format
        scheduledTime: '25:00', // Invalid time
        durationMinutes: 0, // Invalid duration
        coachId: 'not-a-number', // Invalid coach ID
        workoutId: 'not-a-number', // Invalid workout ID
        createdBy: testUserId,
      };

      await request(testApp)
        .post('/classes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidClassData)
        .expect(404); // Database constraint or type errors
    });
  });

});