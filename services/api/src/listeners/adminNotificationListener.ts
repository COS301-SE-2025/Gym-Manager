import { notificationEmitter } from '../events/notificationEmitter';
import { db } from '../db/client';
import { notifications, notificationTargets } from '../db/schema';

// Listen for signup events
notificationEmitter.on('user:signup', async (user) => {
  console.log(`📢 New signup event for ${user.firstName} ${user.lastName}`);

  // Store notification
  const [newNotification] = await db
    .insert(notifications)
    .values({
      title: 'New User Signup',
      message: `${user.firstName} ${user.lastName} has registered and needs approval.`,
    })
    .returning();

  // Target admins
  await db.insert(notificationTargets).values({
    notificationId: Number(newNotification.notificationId),
    targetRole: 'admin',
  });

  // No need to manually push — Supabase Realtime will pick up DB insert
});
