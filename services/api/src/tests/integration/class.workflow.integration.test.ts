import request from 'supertest';
import { app } from '../../index';
import { db } from '../../db/client';
import { 
  users, 
  userroles, 
  members, 
  coaches, 
  classes, 
  workouts, 
  classbookings, 
  classattendance 
} from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

describe('Class Management Workflow Integration Tests', () => {
  jest.setTimeout(30000); // 30 seconds timeout
  let testCoachUserId: number;
  let testMemberUserId: number;
  let testWorkoutId: number;
  let testClassId: number;
  let coachToken: string;
  let memberToken: string;

  const generateRandomEmail = () => {
    return `testuser${Math.floor(Math.random() * 10000)}@example.com`;
  };

  beforeAll(async () => {
    // Create test coach user
    const [testCoach] = await db.insert(users).values({
      firstName: 'Test',
      lastName: 'Coach',
      email: generateRandomEmail(),
      phone: '123-456-7890',
      passwordHash: 'hashedpassword',
    }).returning();
    testCoachUserId = testCoach.userId;

    // Create test member user
    const [testMember] = await db.insert(users).values({
      firstName: 'Test',
      lastName: 'Member',
      email: generateRandomEmail(),
      phone: '123-456-7891',
      passwordHash: 'hashedpassword',
    }).returning();
    testMemberUserId = testMember.userId;

    // Create roles
    await db.insert(userroles).values([
      { userId: testCoachUserId, userRole: 'coach' },
      { userId: testMemberUserId, userRole: 'member' },
    ]);

    // Create role-specific records
    await db.insert(coaches).values({
      userId: testCoachUserId,
    });

    await db.insert(members).values({
      userId: testMemberUserId,
      status: 'approved',
      creditsBalance: 10,
    });

    // Create test workout
    const [testWorkout] = await db.insert(workouts).values({
      workoutName: 'Test Yoga Class',
    }).returning();
    testWorkoutId = testWorkout.workoutId;

    // Generate tokens
    coachToken = jwt.sign(
      { userId: testCoachUserId, email: testCoach.email, roles: ['coach'] },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    memberToken = jwt.sign(
      { userId: testMemberUserId, email: testMember.email, roles: ['member'] },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  beforeEach(async () => {
    // Create fresh test class for each test
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7); // 7 days from now
    
    const [testClass] = await db.insert(classes).values({
      scheduledDate: futureDate.toISOString().split('T')[0], // YYYY-MM-DD format
      scheduledTime: '10:00:00',
      capacity: 20,
      durationMinutes: 60,
      coachId: testCoachUserId,
      workoutId: testWorkoutId,
    }).returning();
    testClassId = testClass.classId;
  });

  afterEach(async () => {
    // Clean up test class and related data
    if (testClassId) {
      await db.delete(classattendance).where(eq(classattendance.classId, testClassId));
      await db.delete(classbookings).where(eq(classbookings.classId, testClassId));
      await db.delete(classes).where(eq(classes.classId, testClassId));
    }
  });

  afterAll(async () => {
    // Clean up test data in correct order (respecting foreign key constraints)
    // First delete dependent records
    await db.delete(classattendance).where(eq(classattendance.memberId, testMemberUserId));
    await db.delete(classbookings).where(eq(classbookings.memberId, testMemberUserId));
    await db.delete(members).where(eq(members.userId, testMemberUserId));
    
    // Delete classes that reference coaches and workouts
    await db.delete(classes).where(eq(classes.coachId, testCoachUserId));
    await db.delete(classes).where(eq(classes.workoutId, testWorkoutId));
    
    // Then delete coaches, workouts, and users
    await db.delete(coaches).where(eq(coaches.userId, testCoachUserId));
    await db.delete(workouts).where(eq(workouts.workoutId, testWorkoutId));
    await db.delete(userroles).where(eq(userroles.userId, testCoachUserId));
    await db.delete(userroles).where(eq(userroles.userId, testMemberUserId));
    await db.delete(users).where(eq(users.userId, testCoachUserId));
    await db.delete(users).where(eq(users.userId, testMemberUserId));
  });

  describe('Coach Class Management', () => {
    it('should allow coach to view assigned classes', async () => {
      const response = await request(app)
        .get('/coach/assigned')
        .set('Authorization', `Bearer ${coachToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('classId');
      expect(response.body[0]).toHaveProperty('scheduledDate');
      expect(response.body[0]).toHaveProperty('scheduledTime');
    });

    it('should allow coach to view classes with workout details', async () => {
      const response = await request(app)
        .get('/coach/classes-with-workouts')
        .set('Authorization', `Bearer ${coachToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('workoutName');
    });

    it('should allow coach to create workout', async () => {
      const workoutData = {
        workoutName: 'Test HIIT Workout',
        type: 'AMRAP',
        metadata: { description: 'Test workout' },
        rounds: [
          {
            roundNumber: 1,
            subrounds: [
              {
                subroundNumber: 1,
                exercises: [
                  {
                    exerciseName: 'Burpees',
                    position: 1,
                    quantityType: 'reps',
                    quantity: 10,
                    restTime: 30
                  }
                ]
              }
            ]
          }
        ]
      };

      const response = await request(app)
        .post('/coach/create-workout')
        .set('Authorization', `Bearer ${coachToken}`)
        .send(workoutData);

      if (response.status !== 200) {
        console.log('Workout creation error:', response.status, response.body);
      }
      
      expect(response.status).toBe(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('workoutId');

      // Clean up created workout
      await db.delete(workouts).where(eq(workouts.workoutId, response.body.workoutId));
    });

    it('should allow coach to assign workout to class', async () => {
      const [newWorkout] = await db.insert(workouts).values({
        workoutName: 'Test Pilates',
      }).returning();

      const assignData = {
        classId: testClassId,
        workoutId: newWorkout.workoutId,
      };

      const response = await request(app)
        .post('/coach/assign-workout')
        .set('Authorization', `Bearer ${coachToken}`)
        .send(assignData)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Clean up - delete classes first, then workouts
      await db.delete(classes).where(eq(classes.workoutId, newWorkout.workoutId));
      await db.delete(workouts).where(eq(workouts.workoutId, newWorkout.workoutId));
    });
  });

  describe('Member Class Booking', () => {
    it('should allow member to view all available classes', async () => {
      const response = await request(app)
        .get('/classes')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('classId');
      expect(response.body[0]).toHaveProperty('scheduledDate');
      expect(response.body[0]).toHaveProperty('capacity');
    });

    it('should allow member to view their booked classes', async () => {
      const response = await request(app)
        .get('/member/classes')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should allow member to book a class', async () => {
      const bookingData = {
        classId: testClassId,
      };

      const response = await request(app)
        .post('/book')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(bookingData)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify booking was created in database
      const booking = await db
        .select()
        .from(classbookings)
        .where(
          and(
            eq(classbookings.classId, testClassId),
            eq(classbookings.memberId, testMemberUserId)
          )
        );
      expect(booking.length).toBe(1);
    });

    it('should prevent double booking', async () => {
      const bookingData = {
        classId: testClassId,
      };

      // First booking
      await request(app)
        .post('/book')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(bookingData)
        .expect(200);

      // Second booking should fail
      await request(app)
        .post('/book')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(bookingData)
        .expect(400);
    });

    it('should allow member to cancel booking', async () => {
      // First book the class
      await request(app)
        .post('/book')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ classId: testClassId })
        .expect(200);

      // Then cancel it
      const response = await request(app)
        .post('/cancel')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ classId: testClassId })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify booking was removed
      const booking = await db
        .select()
        .from(classbookings)
        .where(
          and(
            eq(classbookings.classId, testClassId),
            eq(classbookings.memberId, testMemberUserId)
          )
        );
      expect(booking.length).toBe(0);
    });
  });

  describe('Class Check-in Process', () => {
    beforeEach(async () => {
      // Book the class first
      await request(app)
        .post('/book')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ classId: testClassId })
        .expect(200);
    });

    it('should allow member to check in to booked class', async () => {
      const checkInData = {
        classId: testClassId,
        memberId: testMemberUserId,
      };

      const response = await request(app)
        .post('/checkin')
        .send(checkInData)
        .expect(201);

      expect(response.body.success).toBe(true);

      // Verify attendance was recorded
      const attendance = await db
        .select()
        .from(classattendance)
        .where(
          and(
            eq(classattendance.classId, testClassId),
            eq(classattendance.memberId, testMemberUserId)
          )
        );
      expect(attendance.length).toBe(1);
    });

    it('should prevent double check-in', async () => {
      const checkInData = {
        classId: testClassId,
        memberId: testMemberUserId,
      };

      // First check-in
      await request(app)
        .post('/checkin')
        .send(checkInData)
        .expect(201);

      // Second check-in should fail
      await request(app)
        .post('/checkin')
        .send(checkInData)
        .expect(409);
    });
  });

  describe('Class Capacity Management', () => {
    it('should prevent booking when class is at capacity', async () => {
      // Create a class with capacity of 1
      const [smallClass] = await db.insert(classes).values({
        scheduledDate: '2024-12-02',
        scheduledTime: '11:00:00',
        capacity: 1,
        durationMinutes: 60,
        coachId: testCoachUserId,
        workoutId: testWorkoutId,
      }).returning();

      // Create another member
      const [anotherMember] = await db.insert(users).values({
        firstName: 'Another',
        lastName: 'Member',
        email: generateRandomEmail(),
        phone: '555-555-5555',
        passwordHash: 'hashedpassword',
      }).returning();

      await db.insert(userroles).values({
        userId: anotherMember.userId,
        userRole: 'member',
      });

      await db.insert(members).values({
        userId: anotherMember.userId,
        status: 'approved',
        creditsBalance: 10,
      });

      const anotherMemberToken = jwt.sign(
        { userId: anotherMember.userId, email: anotherMember.email, roles: ['member'] },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      // First member books the class
      await request(app)
        .post('/book')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ classId: smallClass.classId })
        .expect(200);

      // Second member tries to book - should fail due to capacity
      await request(app)
        .post('/book')
        .set('Authorization', `Bearer ${anotherMemberToken}`)
        .send({ classId: smallClass.classId })
        .expect(400);

      // Clean up
      await db.delete(classbookings).where(eq(classbookings.classId, smallClass.classId));
      await db.delete(classes).where(eq(classes.classId, smallClass.classId));
      await db.delete(members).where(eq(members.userId, anotherMember.userId));
      await db.delete(userroles).where(eq(userroles.userId, anotherMember.userId));
      await db.delete(users).where(eq(users.userId, anotherMember.userId));
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent class', async () => {
      await request(app)
        .post('/book')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ classId: 99999 })
        .expect(404);
    });

    it('should return 400 for invalid class ID format', async () => {
      await request(app)
        .post('/book')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ classId: 'invalid' })
        .expect(400);
    });

    it('should return 401 for unauthenticated requests', async () => {
      await request(app)
        .get('/coach/assigned')
        .expect(401);
    });

    it('should return 200 for authenticated access (no role check)', async () => {
      await request(app)
        .get('/coach/assigned')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);
    });
  });
});
