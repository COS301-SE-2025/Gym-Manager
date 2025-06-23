// === services/api/src/routes/classes.ts ===
/**
 * @swagger
 * tags:
 *   name: Classes
 *   description: Class-related endpoints for coaches and members
 */

/**
 * @swagger
 * /coach/assignedClasses:
 *   get:
 *     summary: Get all classes assigned to the logged-in coach
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of assigned classes
 */

/**
 * @swagger
 * /coach/workoutsAssigned:
 *   get:
 *     summary: Get coach's classes with assigned workouts
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of classes with workout information
 */

/**
 * @swagger
 * /coach/assignWorkout:
 *   post:
 *     summary: Assign a workout to a class (Coach only)
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               classId:
 *                 type: integer
 *               workoutId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Workout assigned
 */

/**
 * @swagger
 * /coach/createWorkout:
 *   post:
 *     summary: Create a new workout (Coach only)
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               workoutName:
 *                 type: string
 *               workoutContent:
 *                 type: string
 *     responses:
 *       201:
 *         description: Workout created
 */

/**
 * @swagger
 * /member/getBookedClass:
 *   get:
 *     summary: Get all classes booked by the member
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of booked classes
 */

/**
 * @swagger
 * /member/bookClass:
 *   post:
 *     summary: Book a class (Member only)
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               classId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Class booked
 */

/**
 * @swagger
 * /member/getAllClasses:
 *   get:
 *     summary: Get all available classes (Member only)
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all classes
 */
import express from 'express';
import { getCoachAssignedClasses, getCoachClassesWithWorkouts, assignWorkoutToClass, createWorkout, getMemberClasses, bookClass, cancelBooking, getAllClasses, checkInToClass} from '../controllers/classController';

import { isAuthenticated } from '../middleware/auth';

const router = express.Router();

router.get('/coach/assignedClasses', isAuthenticated, getCoachAssignedClasses);
router.get('/coach/workoutsAssigned', isAuthenticated, getCoachClassesWithWorkouts);
router.post('/coach/assignWorkout', isAuthenticated, assignWorkoutToClass);
router.post('/coach/createWorkout', isAuthenticated, createWorkout);
router.get('/member/getBookedClass',  isAuthenticated, getMemberClasses);
router.post('/member/bookClass', isAuthenticated, bookClass);
router.post('/member/cancelBooking', isAuthenticated, cancelBooking);
router.get('/member/getAllClasses', isAuthenticated, getAllClasses);
router.post('/member/checkIn', isAuthenticated, checkInToClass);


export default router;
