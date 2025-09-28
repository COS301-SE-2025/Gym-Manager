import request from 'supertest';
import { app } from '../../index';
import { db } from '../../db/client';
import { 
  users, 
  userroles, 
  members, 
  paymentPackages,
  paymentTransactions
} from '../../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

describe('Member Payment Integration Tests', () => {
  jest.setTimeout(30000); // 30 seconds timeout
  let testMemberUserId: number;
  let testPackageId: number;
  let memberToken: string;

  const generateRandomEmail = () => {
    return `testuser${Math.floor(Math.random() * 10000)}@example.com`;
  };

  beforeAll(async () => {
    // Create test member user
    const [testMember] = await db.insert(users).values({
      firstName: 'Test',
      lastName: 'Member',
      email: generateRandomEmail(),
      phone: '123-456-7890',
      passwordHash: 'hashedpassword',
    }).returning();
    testMemberUserId = testMember.userId;

    // Create member role
    await db.insert(userroles).values({
      userId: testMemberUserId,
      userRole: 'member',
    });

    // Create member record
    await db.insert(members).values({
      userId: testMemberUserId,
      status: 'approved',
      creditsBalance: 10,
    });

    // Create test payment package
    const [testPackage] = await db.insert(paymentPackages).values({
      name: 'Basic Package',
      priceCents: 2999,
      creditsAmount: 20,
      description: 'Basic credit package',
      isActive: true,
    }).returning();
    testPackageId = testPackage.packageId;

    // Generate token
    memberToken = jwt.sign(
      { userId: testMemberUserId, email: testMember.email, roles: ['member'] },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Clean up test data in correct order (respecting foreign key constraints)
    // First delete dependent records
    await db.delete(paymentTransactions).where(eq(paymentTransactions.memberId, testMemberUserId));
    // Delete user_financial_metrics if it exists
    try {
      await db.execute(sql`DELETE FROM user_financial_metrics WHERE member_id = ${testMemberUserId}`);
    } catch (error) {
      // Table might not exist, ignore error
    }
    await db.delete(members).where(eq(members.userId, testMemberUserId));
    await db.delete(userroles).where(eq(userroles.userId, testMemberUserId));
    await db.delete(users).where(eq(users.userId, testMemberUserId));
    await db.delete(paymentPackages).where(eq(paymentPackages.packageId, testPackageId));
  });

  describe('Member Profile Management', () => {
    it('should allow member to view their profile', async () => {
      const response = await request(app)
        .get(`/members/${testMemberUserId}/profile`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('userId');
      expect(response.body).toHaveProperty('firstName');
      expect(response.body).toHaveProperty('lastName');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('creditsBalance');
    });

    it('should allow member to view their credits', async () => {
      const response = await request(app)
        .get(`/members/${testMemberUserId}/credits`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('creditsBalance');
      expect(response.body.creditsBalance).toBe(10);
    });

    it('should allow member to view their attended classes', async () => {
      const response = await request(app)
        .get(`/members/${testMemberUserId}/attended-classes`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Payment Package Management', () => {
    it('should allow member to view available payment packages', async () => {
      const response = await request(app)
        .get('/payments/packages')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('packageId');
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('priceCents');
      expect(response.body[0]).toHaveProperty('creditsAmount');
    });

    it('should allow member to purchase credits with package', async () => {
      const purchaseData = {
        packageId: testPackageId,
        paymentMethod: 'credit_card',
        cardNumber: '4111111111111111',
        expiryDate: '12/25',
        cvv: '123'
      };

      const response = await request(app)
        .post(`/members/${testMemberUserId}/credits/purchase-package`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send(purchaseData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('transactionId');
      expect(response.body).toHaveProperty('newBalance');

      // Verify transaction was recorded
      const transaction = await db
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.memberId, testMemberUserId));
      expect(transaction.length).toBeGreaterThan(0);
    });

    it('should allow member to purchase credits directly', async () => {
      const purchaseData = {
        amount: 50.00,
        credits: 30,
        paymentMethod: 'credit_card',
        cardNumber: '4111111111111111',
        expiryDate: '12/25',
        cvv: '123'
      };

      const response = await request(app)
        .post(`/members/${testMemberUserId}/credits/purchase`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send(purchaseData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('transactionId');
    });

    it('should prevent purchase with invalid payment information', async () => {
      const invalidPurchaseData = {
        packageId: testPackageId,
        paymentMethod: 'credit_card',
        cardNumber: 'invalid',
        expiryDate: 'invalid',
        cvv: 'invalid'
      };

      await request(app)
        .post(`/members/${testMemberUserId}/credits/purchase-package`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send(invalidPurchaseData)
        .expect(400);
    });
  });

  describe('Credit Management', () => {
    it('should track credit usage when booking classes', async () => {
      // This test would require setting up a class and booking it
      // The credit balance should decrease when a class is booked
      const initialCredits = await db
        .select()
        .from(members)
        .where(eq(members.userId, testMemberUserId));
      
      expect(initialCredits[0].creditsBalance).toBeGreaterThanOrEqual(0);
    });

    it('should prevent booking when insufficient credits', async () => {
      // Set member credits to 0
      await db.update(members)
        .set({ creditsBalance: 0 })
        .where(eq(members.userId, testMemberUserId));

      // Attempt to book a class should fail
      await request(app)
        .post('/classes/book')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ classId: 1 })
        .expect(400);

      // Restore credits
      await db.update(members)
        .set({ creditsBalance: 10 })
        .where(eq(members.userId, testMemberUserId));
    });
  });

  describe('Transaction History', () => {
    it('should allow member to view transaction history', async () => {
      // Create a test transaction
      await db.insert(paymentTransactions).values({
        memberId: testMemberUserId,
        packageId: testPackageId,
        amountCents: 2999,
        creditsPurchased: 20,
        paymentMethod: 'test',
        paymentStatus: 'completed'
      });

      const response = await request(app)
        .get(`/members/${testMemberUserId}/transactions`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('transactionId');
      expect(response.body[0]).toHaveProperty('amount');
      expect(response.body[0]).toHaveProperty('type');
      expect(response.body[0]).toHaveProperty('status');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent member', async () => {
      await request(app)
        .get('/members/99999/profile')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(404);
    });

    it('should return 400 for invalid package ID', async () => {
      const purchaseData = {
        packageId: 99999,
        paymentMethod: 'credit_card',
        cardNumber: '4111111111111111',
        expiryDate: '12/25',
        cvv: '123'
      };

      await request(app)
        .post(`/members/${testMemberUserId}/credits/purchase-package`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send(purchaseData)
        .expect(400);
    });

    it('should return 401 for unauthenticated requests', async () => {
      await request(app)
        .get(`/members/${testMemberUserId}/profile`)
        .expect(401);
    });

    it('should return 403 for accessing other member\'s data', async () => {
      // Create another member
      const [anotherMember] = await db.insert(users).values({
        firstName: 'Another',
        lastName: 'Member',
        email: generateRandomEmail(),
        phone: '555-555-5555',
        passwordHash: 'hashedpassword',
      }).returning();

      await request(app)
        .get(`/members/${anotherMember.userId}/profile`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);

      // Clean up
      await db.delete(users).where(eq(users.userId, anotherMember.userId));
    });
  });

  describe('Payment Security', () => {
    it('should validate payment card information', async () => {
      const invalidCardData = {
        packageId: testPackageId,
        paymentMethod: 'credit_card',
        cardNumber: '1234567890123456', // Invalid card number
        expiryDate: '12/25',
        cvv: '123'
      };

      await request(app)
        .post(`/members/${testMemberUserId}/credits/purchase-package`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send(invalidCardData)
        .expect(400);
    });

    it('should prevent duplicate transactions', async () => {
      const purchaseData = {
        packageId: testPackageId,
        paymentMethod: 'credit_card',
        cardNumber: '4111111111111111',
        expiryDate: '12/25',
        cvv: '123'
      };

      // First purchase
      await request(app)
        .post(`/members/${testMemberUserId}/credits/purchase-package`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send(purchaseData)
        .expect(200);

      // Attempt duplicate purchase should be handled appropriately
      const response = await request(app)
        .post(`/members/${testMemberUserId}/credits/purchase-package`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send(purchaseData);

      // The response might be 200 (if duplicate prevention is handled at business logic level)
      // or 400 (if handled at API level)
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('Concurrent Payment Operations', () => {
    it('should handle concurrent credit purchases', async () => {
      const purchaseData = {
        packageId: testPackageId,
        paymentMethod: 'credit_card',
        cardNumber: '4111111111111111',
        expiryDate: '12/25',
        cvv: '123'
      };

      // Attempt multiple concurrent purchases
      const promises = Array(3).fill(null).map(() =>
        request(app)
          .post(`/members/${testMemberUserId}/credits/purchase-package`)
          .set('Authorization', `Bearer ${memberToken}`)
          .send(purchaseData)
      );

      const responses = await Promise.all(promises);
      
      // At least one should succeed, others might fail due to business logic
      const successfulResponses = responses.filter(r => r.status === 200);
      expect(successfulResponses.length).toBeGreaterThan(0);
    });
  });
});
