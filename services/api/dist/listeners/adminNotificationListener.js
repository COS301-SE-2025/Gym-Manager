"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const notificationEmitter_1 = require("../events/notificationEmitter");
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
// Listen for signup events
notificationEmitter_1.notificationEmitter.on('user:signup', async (user) => {
    console.log(`📢 New signup event for ${user.firstName} ${user.lastName}`);
    // Store notification
    const [newNotification] = await client_1.db
        .insert(schema_1.notifications)
        .values({
        type: 'info',
        title: 'New User Signup',
        message: `${user.firstName} ${user.lastName} has registered and needs approval.`,
    })
        .returning();
    // Get all admin users to target
    const adminUsers = await client_1.db
        .select({ userId: schema_1.admins.userId })
        .from(schema_1.admins);
    // Target all admins with the notification
    if (adminUsers.length > 0) {
        const targets = adminUsers.map(admin => ({
            notificationId: Number(newNotification.notificationId),
            targetUserId: admin.userId,
        }));
        await client_1.db.insert(schema_1.notificationTargets).values(targets);
    }
    // No need to manually push — Supabase Realtime will pick up DB insert
});
