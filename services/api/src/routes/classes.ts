// === services/api/src/routes/classes.ts ===
import express from 'express';
import { getCoachAssignedClasses, getCoachClassesWithWorkouts, assignWorkoutToClass, getMemberClasses, bookClass } from '../controllers/classController';

import { isAuthenticated } from '../middleware/auth';

const router = express.Router();

router.post('/coach/assignedClasses', getCoachAssignedClasses);
router.get('/coach/workoutsAssigned', getCoachClassesWithWorkouts);
router.post('/coach/assignWorkout', assignWorkoutToClass);
router.get('/member/getBookedClass',  getMemberClasses);
router.post('/member/bookClass', bookClass);


export default router;
