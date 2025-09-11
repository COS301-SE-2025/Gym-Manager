"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// === services/api/src/routes/classes.ts ===
const express_1 = __importDefault(require("express"));
const classController_1 = require("../controllers/classController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.get('/coach/assignedClasses', auth_1.isAuthenticated, classController_1.getCoachAssignedClasses);
router.get('/coach/workoutsAssigned', auth_1.isAuthenticated, classController_1.getCoachClassesWithWorkouts);
router.post('/coach/assignWorkout', auth_1.isAuthenticated, classController_1.assignWorkoutToClass);
router.post('/coach/createWorkout', auth_1.isAuthenticated, classController_1.createWorkout);
router.get('/member/getBookedClass', auth_1.isAuthenticated, classController_1.getMemberClasses);
router.post('/member/bookClass', auth_1.isAuthenticated, classController_1.bookClass);
router.post('/member/cancelBooking', auth_1.isAuthenticated, classController_1.cancelBooking);
router.get('/member/getAllClasses', auth_1.isAuthenticated, classController_1.getAllClasses);
router.post('/member/checkIn', auth_1.isAuthenticated, classController_1.checkInToClass);
exports.default = router;
