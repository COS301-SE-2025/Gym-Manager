"use strict";
/**
 * @swagger
 * tags:
 *   - name: Admin
 *     description: Schedule and user-role assignment endpoints
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @swagger
 * /schedule/create:
 *   post:
 *     summary: Create a new class
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - capacity
 *               - scheduledDate
 *               - scheduledTime
 *               - durationMinutes
 *               - createdBy
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
 *         description: Class created successfully
 */
/**
 * @swagger
 * /schedule/assign-coach:
 *   post:
 *     summary: Assign a coach to a class
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [coachId, classId]
 *             properties:
 *               coachId:
 *                 type: integer
 *               classId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Coach assigned successfully
 */
/**
 * @swagger
 * /roles/assign:
 *   post:
 *     summary: Assign a role to a user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, userRole]
 *             properties:
 *               userId:
 *                 type: integer
 *               userRole:
 *                 type: string
 *                 enum: [member, coach, admin, manager]
 *     responses:
 *       200:
 *         description: Role assigned successfully
 */
/**
 * @swagger
 * /members:
 *   post:
 *     summary: Get all gym members
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all members
 */
/**
 * @swagger
 * /roles/getUsersByRole/{role}:
 *   get:
 *     summary: Get users by their role
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: role
 *         schema:
 *           type: string
 *           enum: [member, coach, admin, manager]
 *         required: true
 *         description: Role to filter by
 *     responses:
 *       200:
 *         description: List of users by role
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   userId:
 *                     type: integer
 *                   firstName:
 *                     type: string
 *                   lastName:
 *                     type: string
 *                   email:
 *                     type: string
 *                   phone:
 *                     type: string
 */
/**
 * @swagger
 * /users/allUsers:
 *   get:
 *     summary: Get all users
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all users
 */
/**
 * @swagger
 * /roles/removeAdminRole:
 *   post:
 *     summary: Remove admin role from a user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Admin role removed successfully
 */
/**
 * @swagger
 * /roles/removeCoachRole:
 *   post:
 *     summary: Remove coach role from a user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Coach role removed successfully
 */
/**
 * @swagger
 * /roles/removeManagerRole:
 *   post:
 *     summary: Remove manager role from a user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Manager role removed successfully
 */
/**
 * @swagger
 * /roles/removeMemberRole:
 *   post:
 *     summary: Remove member role from a user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Member role removed successfully
 */
/**
 * @swagger
 * /roles/getRolesByUserId/{userId}:
 *   get:
 *     summary: Get all roles assigned to a user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the user to get roles for
 *     responses:
 *       200:
 *         description: List of roles assigned to the user
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 *                 enum: [member, coach, admin, manager]
 *       404:
 *         description: No roles found for this user
 *       500:
 *         description: Internal server error
 */
const express_1 = __importDefault(require("express"));
const adminController_1 = require("../controllers/adminController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.post('/schedule/createWeeklySchedule', auth_1.isAuthenticated, adminController_1.createWeeklySchedule);
router.get('/schedule/getWeeklySchedule', auth_1.isAuthenticated, adminController_1.getWeeklySchedule);
router.post('/schedule/createClass', auth_1.isAuthenticated, adminController_1.createClass);
router.post('/schedule/assign-coach', auth_1.isAuthenticated, adminController_1.assignCoach);
router.post('/roles/assign', auth_1.isAuthenticated, adminController_1.assignUserToRole);
router.post('/members', auth_1.isAuthenticated, adminController_1.getAllMembers);
router.get('/roles/getUsersByRole/:role', auth_1.isAuthenticated, adminController_1.getUsersByRole);
router.get('/users/allUsers', auth_1.isAuthenticated, adminController_1.getAllUsers);
router.post('/roles/removeAdminRole', auth_1.isAuthenticated, adminController_1.removeAdminRole);
router.post('/roles/removeCoachRole', auth_1.isAuthenticated, adminController_1.removeCoachRole);
router.post('/roles/removeManagerRole', auth_1.isAuthenticated, adminController_1.removeManagerRole);
router.post('/roles/removeMemberRole', auth_1.isAuthenticated, adminController_1.removeMemberRole);
router.get('/roles/getRolesByUserId/:userId', auth_1.isAuthenticated, adminController_1.getRolesByUserId);
router.get('/users/getUserById/:userId', auth_1.isAuthenticated, adminController_1.getUserById);
router.patch('/users/updateUserById/:userId', auth_1.isAuthenticated, adminController_1.updateUserById);
router.get('/users/getAllCoaches', auth_1.isAuthenticated, adminController_1.getAllCoaches);
router.get('/users/getAllAdmins', auth_1.isAuthenticated, adminController_1.getAllAdmins);
router.patch('/users/changePassword/:userId', auth_1.isAuthenticated, adminController_1.changeUserPassword);
exports.default = router;
