// === services/api/src/routes/classes.ts ===
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
