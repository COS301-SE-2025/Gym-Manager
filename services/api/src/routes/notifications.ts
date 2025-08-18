// src/routes/notifications.ts
import { Router } from "express";
import { sendPushNotification } from "../controllers/notificationsController";
import db from "../db"; // your drizzle db instance
import { users } from "../db/schema"; 

const router = Router();

router.post("/users/push_token", async (req, res) => {
    const { token } = req.body;
    if (!token) {
        return res.status(400).json({ error: "Push token is required" });
    }

    try {
        // Ensure req.user exists
        if (!req.user || !req.user.userId) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        // Update user's push token in the database
        const result = await db.query(
            "UPDATE users SET push_token = $1 WHERE id = $2 RETURNING *",
            [token, req.user.userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json({ success: true });
    } catch (err) {
        console.error("Error updating push token:", err);
        res.status(500).json({ error: "Failed to update push token" });
    }
});

// Example: notify a user when a booking is confirmed
router.post("/notify-booking", async (req, res) => {
  try {
    const { userId, className } = req.body;

    // Get user's push token from DB
    const result = await db.query(
      "SELECT push_token FROM users WHERE id = $1 LIMIT 1",
      [userId]
    );
    const user = result.rows[0];

    if (!user || !user.push_token) {
      return res.status(404).json({ error: "User push token not found" });
    }

    await sendPushNotification(
      user.push_token,
      "Booking Confirmed ✅",
      `You are booked for ${className}`
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Error sending push notification:", err);
    res.status(500).json({ error: "Failed to send notification" });
  }
});

export default router;
