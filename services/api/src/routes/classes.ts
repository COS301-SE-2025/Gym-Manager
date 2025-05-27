// === services/api/src/routes/classes.ts ===
import express from 'express';
import { getCoachAssignedClasses, getCoachClassesWithWorkouts, assignWorkoutToClass, getMemberClasses, bookClass } from '../controllers/classController';

import { isAuthenticated } from '../middleware/auth';

const router = express.Router();

router.get('/coach/assignedClasses', isAuthenticated, getCoachAssignedClasses);
router.get('/coach/workoutsAssigned', isAuthenticated, getCoachClassesWithWorkouts);
router.post('/coach/assignWorkout', isAuthenticated, assignWorkoutToClass);
router.get('/member/getBookedClass',  isAuthenticated, getMemberClasses);
router.post('/member/bookClass', isAuthenticated, bookClass);


export default router;
