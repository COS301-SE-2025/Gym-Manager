// === services/api/src/routes/schedule.ts ===
/**
 * @swagger
 * tags:
 *   name: Schedule
 *   description: Schedule and user-role assignment endpoints
 */

/**
 * @swagger
 * /schedule/createClass:
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties: 
 *                 classId:
 *                 type: integer
 *                message:
 *                 type: string
 *                description: Class successfully created
 * *       400:
 *        description: Bad request, invalid input data
 * *       401:
 *        description: Unauthorized, user not authenticated
 * *       500:
 *       description: Internal server error, unexpected issue                       
 * 
 * 
 * 
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
 *        content:
 *          application/json:
 *           schema:
 *            type: object
 * *            properties:
 *             success:
 *            type: boolean
 * *            description: Coach successfully assigned to class
 *      400:
 *       description: Bad request, missing classId or coachId/ Coach not found
 *      401:
 *       description: Unauthorized, user not authenticated
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
 * *         content:
 *          application/json:
 *          schema:
 *           type: object
 * *           properties:  
 * *            success:
 *           type: boolean
 * *            description: User successfully assigned to role
 *      400:
 *      description: Bad request, missing userId or userRole/ Invalid role/ Invalid userId
 *      401:
 *      description: Unauthorized, user not authenticated
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
 * *         content:
 *          application/json:
 *         schema:
 *          type: object
 * *         properties:
 *          members:
 *         type: array
 * *         items:
 *         type: object
 * *         properties:
 *          userId:
 *        type: integer
 * *          firstName:
 *       type: string
 * *          lastName:
 *      type: string
 * *          email:
 *     type: string
 * *          phone:
 *   type: string
 * *          status:
 *   type: string
 * *          credits:
 *  type: integer
 * *       401:
 *        description: Unauthorized, user not authenticated
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
 * *         content:
 *         application/json:
 *        schema:
 *         type: object
 * *         properties:
 *         users:
 *        type: array
 * *         items:
 *       type: object
 * *         properties:
 *        userId:
 *       type: integer
 * *         firstName:
 *      type: string
 * *         lastName:
 *    type: string
 *  *         email:
 *    type: string
 *       400:
 *         description: Invalid role specified
 *       401:
 *         description: Unauthorized, user not authenticated
 */
import express from 'express';
import { createSchedule, assignCoach, createClass,assignUserToRole, getAllMembers, getUsersByRole } from '../controllers/scheduleController';
import { isAuthenticated } from '../middleware/auth';

const router = express.Router();

router.post('/schedule/createClass', isAuthenticated, createClass);
router.post('/schedule/assign-coach', isAuthenticated, assignCoach);
router.post('/roles/assign', isAuthenticated, assignUserToRole);
router.post('/members', isAuthenticated, getAllMembers);
router.get('/roles/getUsersByRole', isAuthenticated, getUsersByRole);


export default router;

