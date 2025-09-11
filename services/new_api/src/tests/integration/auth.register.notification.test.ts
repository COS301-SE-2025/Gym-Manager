import request from 'supertest';
import { db } from '../../db/client';
import { app } from '../../index';
import { notifications, notificationTargets } from '../../db/schema';
import { and, eq } from 'drizzle-orm';

describe('Integration: register triggers admin notification', () => {
  it('creates a notification + admin target on successful signup', async () => {
    const email = `user_${Date.now()}@example.com`;

    const res = await request(app)
      .post('/auth/register')
      .send({
        firstName: 'Alice',
        lastName: 'Smith',
        email,
        password: 'password123',
        roles: ['member'],
      })
      .expect(201);

    expect(res.body.token).toBeTruthy();

    // Check notifications table for the latest notification
    const rows = await db.select().from(notifications);
    const latest = rows[rows.length - 1];
    expect(latest.title).toBe('New User Signup');
    expect(latest.message).toBe('Alice Smith has registered and needs approval.');

    // Check notification_targets for admin
    const targets = await db.select().from(notificationTargets).where(eq(notificationTargets.notificationId, latest.notificationId));
    expect(targets.some(t => t.targetRole === 'admin')).toBe(true);
  });
});


