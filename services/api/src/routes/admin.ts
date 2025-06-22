// === services/api/src/routes/schedule.ts ===
/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Schedule and user-role assignment endpoints
 */

/**
 * @swagger
 * /schedule/create:
 *   post:
 *     summary: Create a new class
 *     tags: [Schedule]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               capacity:
 *                 type: integer
 *               scheduledDate:
 *                 type: string
 *                 format: date
 *               scheduledTime:
 *                 type: string
 *                 format: time
 *               durationMinutes:
 *                 type: integer
 *               coachId:
 *                 type: integer
 *               workoutId:
 *                 type: integer
 *               createdBy:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Class created
 */

/**
 * @swagger
 * /schedule/assign-coach:
 *   post:
 *     summary: Assign a coach to a class
 *     tags: [Schedule]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               coachId:
 *                 type: integer
 *               classId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Coach assigned
 */

/**
 * @swagger
 * /roles/assign:
 *   post:
 *     summary: Assign a role to a user
 *     tags: [Schedule]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: integer
 *               userRole:
 *                 type: string
 *                 enum: [member, coach, admin, manager]
 *     responses:
 *       200:
 *         description: Role assigned
 */

/**
 * @swagger
 * /members:
 *   post:
 *     summary: Get all gym members
 *     tags: [Schedule]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all members
 */

/**
 * @swagger
 * /roles/getUsersByRole:
 *   get:
 *     summary: Get users by their role
 *     tags: [Schedule]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         required: true
 *         description: Role to filter by (e.g. member, coach, admin)
 *     responses:
 *       200:
 *         description: List of users by role
 */
import express from 'express';
import { createWeeklySchedule, getWeeklySchedule, assignCoach, createClass,assignUserToRole, getAllMembers, getUsersByRole, getAllUsers, removeAdminRole, removeCoachRole, removeManagerRole, removeMemberRole} from '../controllers/adminController';
import { isAuthenticated } from '../middleware/auth';

const router = express.Router();

router.post('/schedule/createWeeklySchedule', isAuthenticated, createWeeklySchedule);
router.get('/schedule/getWeeklySchedule', isAuthenticated, getWeeklySchedule);
router.post('/schedule/createClass', isAuthenticated, createClass);
router.post('/schedule/assign-coach', isAuthenticated, assignCoach);
router.post('/roles/assign', isAuthenticated, assignUserToRole);
router.post('/members', isAuthenticated, getAllMembers);
router.get('/roles/getUsersByRole', isAuthenticated, getUsersByRole);
router.get('/users/allUsers', isAuthenticated, getAllUsers);
router.post('/roles/removeAdminRole', isAuthenticated, removeAdminRole);
router.post('/roles/removeCoachRole', isAuthenticated, removeCoachRole);
router.post('/roles/removeManagerRole', isAuthenticated, removeManagerRole);
router.post('/roles/removeMemberRole', isAuthenticated, removeMemberRole);

export default router;

