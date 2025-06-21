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
 *        content:
 *         application/json:
 *        schema:
 *        type: object
 * *         properties:
 *         classes:
 *        type: array
 * *         items:
 *        type: object
 *  *         properties:
 *          classId:
 *        type: integer
 * *         className:
 *       type: string
 * *         classTime:
 *     type: string
 * *         coachId:
 *  type: integer
 * *         coachName:
 *      type: string
 * *         status:
 *  type: string
 * *       401:
 *        description: Unauthorized, user not authenticated
 * *       404:
 *        description: No classes found for the coach
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
 * *        content:
 *         application/json:
 *        schema:
 *         type: object
 * *         properties:
 *         classes:
 *        type: array
 * *         items:
 *        type: object
 *  *         properties:
 *          classId:
 *        type: integer
 * *         className:
 *       type: string
 * *         classTime:
 *     type: string
 * *         coachId:
 *  type: integer
 * *         coachName:
 *      type: string
 * *         workoutId:
 *  type: integer
 * *         workoutName:
 *      type: string
 * *         status:
 *  type: string
 * *       401:
 *        description: Unauthorized, user not authenticated
 * *       404: 
 * *        description: No classes with workouts found for the coach
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
 * *        content:
 *        application/json:
 * *        schema:
 *        type: object
 * *         properties:
 *        success:
 *       type: boolean
 * *         description: Workout successfully assigned to class
 *      400:
 *       description: Bad request, missing classId or workoutId/ Class not found
 * *      401:
 *      description: Unauthorized, user not authenticated
 * *      404:
 *      description: Class or workout not found
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
 * *        content:
 *        application/json:
 * *        schema:
 *       type: object
 * *         properties:
 *       workoutId:
 *      type: integer
 * *         workoutName:
 *     type: string
 * *         workoutContent:
 *     type: string
 * *         createdBy:
 *    type: integer
 * *         description: Workout successfully created
 *     400:
 *      description: Bad request, invalid input data
 * *     401:
 *     description: Unauthorized, user not authenticated
 * *     500:
 *    description: Internal server error, unexpected issue
 * 
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
 * *        content:
 *        application/json:
 * *        schema:
 *       type: object
 * *         properties:
 *       classes:
 *      type: array
 * *         items:
 *      type: object
 * *         properties:
 *      classId:
 *     type: integer
 * *         className:
 *    type: string
 * *         classTime:
 *   type: string
 * *         coachId:
 *   type: integer
 * *         coachName:
 *   type: string
 * *         status:
 *  type: string
 * *       401:
 *       description: Unauthorized, user not authenticated
 * *       404:
 *      description: No booked classes found for the member
 * 
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
 * *     400:
 *         description: Bad request, missing classId or class not found
 * *     401:
 *         description: Unauthorized, user not authenticated
 * *     404:
 *         description: Class not found
 * *     500:
 *         description: Internal server error, unexpected issue
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
 * *        content:
 *        application/json:
 * *        schema:
 *       type: object
 * *         properties:
 *       classes:
 *      type: array     
 * *         items:
 *      type: object
 * *         properties:
 *      classId:
 *     type: integer
 * *         className:
 *    type: string
 * *         classTime:
 *   type: string
 * *         coachId:
 *   type: integer
 * *         coachName:
 *   type: string
 * *         status:
 *  type: string
 * *       401:
 *       description: Unauthorized, user not authenticated
 * *       404:
 *      description: No classes found   
 */
import express from 'express';
import { getCoachAssignedClasses, getCoachClassesWithWorkouts, assignWorkoutToClass, createWorkout, getMemberClasses, bookClass, getAllClasses } from '../controllers/classController';

import { isAuthenticated } from '../middleware/auth';

const router = express.Router();

router.get('/coach/assignedClasses', isAuthenticated, getCoachAssignedClasses);
router.get('/coach/workoutsAssigned', isAuthenticated, getCoachClassesWithWorkouts);
router.post('/coach/assignWorkout', isAuthenticated, assignWorkoutToClass);
router.post('/coach/createWorkout', isAuthenticated, createWorkout);
router.get('/member/getBookedClass',  isAuthenticated, getMemberClasses);
router.post('/member/bookClass', isAuthenticated, bookClass);
router.get('/member/getAllClasses', isAuthenticated, getAllClasses);


export default router;
