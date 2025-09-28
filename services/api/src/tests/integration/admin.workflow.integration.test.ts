import request from 'supertest';
import { app } from '../../index';
import { db } from '../../db/client';
import { 
  users, 
  userroles, 
  members, 
  coaches, 
  admins,
  notifications,
  notificationTargets
} from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

describe('Admin Workflow Integration Tests', () => {
  jest.setTimeout(30000); // 30 seconds timeout
  let testAdminUserId: number;
  let testMemberUserId: number;
  let testCoachUserId: number;
  let adminToken: string;
  let memberToken: string;
  let coachToken: string;

  const generateRandomEmail = () => {
    return `testuser${Math.floor(Math.random() * 10000)}@example.com`;
  };

  beforeAll(async () => {
    // Create test admin user
    const [testAdmin] = await db.insert(users).values({
      firstName: 'Test',
      lastName: 'Admin',
      email: generateRandomEmail(),
      phone: '123-456-7890',
      passwordHash: 'hashedpassword',
    }).returning();
    testAdminUserId = testAdmin.userId;

    // Create test member user
    const [testMember] = await db.insert(users).values({
      firstName: 'Test',
      lastName: 'Member',
      email: generateRandomEmail(),
      phone: '123-456-7891',
      passwordHash: 'hashedpassword',
    }).returning();
    testMemberUserId = testMember.userId;

    // Create test coach user
    const [testCoach] = await db.insert(users).values({
      firstName: 'Test',
      lastName: 'Coach',
      email: generateRandomEmail(),
      phone: '123-456-7892',
      passwordHash: 'hashedpassword',
    }).returning();
    testCoachUserId = testCoach.userId;

    // Create roles
    await db.insert(userroles).values([
      { userId: testAdminUserId, userRole: 'admin' },
      { userId: testMemberUserId, userRole: 'member' },
      { userId: testCoachUserId, userRole: 'coach' },
    ]);

    // Create role-specific records
    await db.insert(admins).values({
      userId: testAdminUserId,
    });

    await db.insert(members).values({
      userId: testMemberUserId,
      status: 'pending',
      creditsBalance: 0,
    });

    await db.insert(coaches).values({
      userId: testCoachUserId,
    });

    // Generate tokens
    adminToken = jwt.sign(
      { userId: testAdminUserId, email: testAdmin.email, roles: ['admin'] },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    memberToken = jwt.sign(
      { userId: testMemberUserId, email: testMember.email, roles: ['member'] },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    coachToken = jwt.sign(
      { userId: testCoachUserId, email: testCoach.email, roles: ['coach'] },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Clean up test data
    await db.delete(members).where(eq(members.userId, testMemberUserId));
    await db.delete(coaches).where(eq(coaches.userId, testCoachUserId));
    await db.delete(admins).where(eq(admins.userId, testAdminUserId));
    await db.delete(userroles).where(eq(userroles.userId, testAdminUserId));
    await db.delete(userroles).where(eq(userroles.userId, testMemberUserId));
    await db.delete(userroles).where(eq(userroles.userId, testCoachUserId));
    await db.delete(users).where(eq(users.userId, testAdminUserId));
    await db.delete(users).where(eq(users.userId, testMemberUserId));
    await db.delete(users).where(eq(users.userId, testCoachUserId));
  });

  describe('User Management', () => {
    it('should allow admin to view all users', async () => {
      const response = await request(app)
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('userId');
      expect(response.body[0]).toHaveProperty('firstName');
      expect(response.body[0]).toHaveProperty('lastName');
      expect(response.body[0]).toHaveProperty('email');
    });

    it('should allow admin to view users by role', async () => {
      const response = await request(app)
        .get('/users/role/member')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should allow admin to view pending members', async () => {
      const response = await request(app)
        .get('/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should prevent non-admin from accessing admin endpoints', async () => {
      await request(app)
        .get('/users')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });
  });

  describe('Member Approval Workflow', () => {
    it('should allow admin to approve pending member', async () => {
      const response = await request(app)
        .post('/members/approve')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: testMemberUserId })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify member status was updated
      const [member] = await db
        .select()
        .from(members)
        .where(eq(members.userId, testMemberUserId));
      expect(member.status).toBe('approved');
    });

    it('should allow admin to reject pending member', async () => {
      // Create another pending member
      const [pendingMember] = await db.insert(users).values({
        firstName: 'Pending',
        lastName: 'Member',
        email: generateRandomEmail(),
        phone: '555-555-5555',
        passwordHash: 'hashedpassword',
      }).returning();

      await db.insert(userroles).values({
        userId: pendingMember.userId,
        userRole: 'member',
      });

      await db.insert(members).values({
        userId: pendingMember.userId,
        status: 'pending',
        creditsBalance: 0,
      });

      const response = await request(app)
        .post('/admin/members/reject')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: pendingMember.userId })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify member was removed
      const member = await db
        .select()
        .from(members)
        .where(eq(members.userId, pendingMember.userId));
      expect(member.length).toBe(0);

      // Clean up
      await db.delete(userroles).where(eq(userroles.userId, pendingMember.userId));
      await db.delete(users).where(eq(users.userId, pendingMember.userId));
    });
  });

  describe('Role Management', () => {
    it('should allow admin to assign roles to users', async () => {
      const [newUser] = await db.insert(users).values({
        firstName: 'New',
        lastName: 'User',
        email: generateRandomEmail(),
        phone: '555-555-5556',
        passwordHash: 'hashedpassword',
      }).returning();

      const response = await request(app)
        .post('/admin/roles/assign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: newUser.userId, role: 'coach' })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify role was assigned
      const role = await db
        .select()
        .from(userroles)
        .where(
          and(
            eq(userroles.userId, newUser.userId),
            eq(userroles.userRole, 'coach')
          )
        );
      expect(role.length).toBe(1);

      // Clean up
      await db.delete(userroles).where(eq(userroles.userId, newUser.userId));
      await db.delete(users).where(eq(users.userId, newUser.userId));
    });

    it('should allow admin to remove roles from users', async () => {
      const response = await request(app)
        .post('/admin/roles/remove')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: testCoachUserId, role: 'coach' })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify role was removed
      const role = await db
        .select()
        .from(userroles)
        .where(
          and(
            eq(userroles.userId, testCoachUserId),
            eq(userroles.userRole, 'coach')
          )
        );
      expect(role.length).toBe(0);
    });
  });

  describe('Notification System', () => {
    it('should create notification when new member registers', async () => {
      const [newMember] = await db.insert(users).values({
        firstName: 'Notification',
        lastName: 'Test',
        email: generateRandomEmail(),
        phone: '555-555-5557',
        passwordHash: 'hashedpassword',
      }).returning();

      await db.insert(userroles).values({
        userId: newMember.userId,
        userRole: 'member',
      });

      await db.insert(members).values({
        userId: newMember.userId,
        status: 'pending',
        creditsBalance: 0,
      });

      // Check if notification was created
      const notificationResults = await db
        .select()
        .from(notifications)
        .where(eq(notifications.title, 'New User Signup'));

      expect(notificationResults.length).toBeGreaterThan(0);

      // Clean up
      await db.delete(members).where(eq(members.userId, newMember.userId));
      await db.delete(userroles).where(eq(userroles.userId, newMember.userId));
      await db.delete(users).where(eq(users.userId, newMember.userId));
    });

    it('should allow admin to view notifications', async () => {
      const response = await request(app)
        .get('/notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should allow admin to mark notifications as read', async () => {
      // Create a test notification
      const [notification] = await db.insert(notifications).values({
        title: 'Test Notification',
        message: 'This is a test notification',
      }).returning();

      const response = await request(app)
        .post('/admin/notifications/mark-read')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notificationId: notification.notificationId })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Clean up
      await db.delete(notifications).where(eq(notifications.notificationId, notification.notificationId));
    });
  });

  describe('System Analytics', () => {
    it('should allow admin to view system statistics', async () => {
      const response = await request(app)
        .get('/analytics/summary-stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalUsers');
      expect(response.body).toHaveProperty('totalMembers');
      expect(response.body).toHaveProperty('totalCoaches');
      expect(response.body).toHaveProperty('totalClasses');
    });

    it('should allow admin to view user activity', async () => {
      const response = await request(app)
        .get('/analytics/operations-data')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should allow admin to view class statistics', async () => {
      const response = await request(app)
        .get('/analytics/gym-utilization')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalClasses');
      expect(response.body).toHaveProperty('activeClasses');
      expect(response.body).toHaveProperty('completedClasses');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent user operations', async () => {
      await request(app)
        .post('/members/approve')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: 99999 })
        .expect(404);
    });

    it('should return 400 for invalid role assignments', async () => {
      await request(app)
        .post('/admin/roles/assign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: testMemberUserId, role: 'invalid-role' })
        .expect(400);
    });

    it('should return 401 for unauthenticated requests', async () => {
      await request(app)
        .get('/users')
        .expect(401);
    });

    it('should return 403 for unauthorized role access', async () => {
      await request(app)
        .get('/users')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });
  });

  describe('Bulk Operations', () => {
    it('should allow admin to approve multiple members', async () => {
      // Create multiple pending members
      const memberIds = [];
      for (let i = 0; i < 3; i++) {
        const [member] = await db.insert(users).values({
          firstName: `Bulk${i}`,
          lastName: 'Member',
          email: generateRandomEmail(),
          phone: `555-555-555${i}`,
          passwordHash: 'hashedpassword',
        }).returning();

        await db.insert(userroles).values({
          userId: member.userId,
          userRole: 'member',
        });

        await db.insert(members).values({
          userId: member.userId,
          status: 'pending',
          creditsBalance: 0,
        });

        memberIds.push(member.userId);
      }

      const response = await request(app)
        .post('/members/bulk-approve')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userIds: memberIds })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.approvedCount).toBe(3);

      // Clean up
      for (const userId of memberIds) {
        await db.delete(members).where(eq(members.userId, userId));
        await db.delete(userroles).where(eq(userroles.userId, userId));
        await db.delete(users).where(eq(users.userId, userId));
      }
    });
  });
});
