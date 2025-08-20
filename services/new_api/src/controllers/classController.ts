// src/controllers/class.controller.ts
import { Request, Response } from 'express';
import { db } from '../db/client';
import {
  classes,
  workouts,
  classbookings,
  classattendance,
  userroles,
} from '../db/schema';
import { eq, and, gt, gte, or, sql } from 'drizzle-orm';
import { AuthenticatedRequest } from '../infrastructure/middleware/authMiddleware';
import { ClassRepository } from '../repositories/class/classRepository';
import UserRepository from '../repositories/user.repository';

const classRepo = new ClassRepository();
const userRepo = new UserRepository();

/**
 * GET /coach/assigned
 */
export const getCoachAssignedClasses = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const coachId = req.user.userId;

  try {
    const assignedClasses = await classRepo.findAssignedClassesByCoach(coachId);
    res.json(assignedClasses);
  } catch (err) {
    console.error('getCoachAssignedClasses error:', err);
    res.status(500).json({ error: 'Failed to fetch assigned classes' });
  }
};

/**
 * GET /coach/classes-with-workouts
 */
export const getCoachClassesWithWorkouts = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    console.log('Unauthorized access attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const coachId = req.user.userId;

  try {
    const classWithWorkouts = await classRepo.findAssignedClassesWithWorkoutsByCoach(coachId);
    res.json(classWithWorkouts);
  } catch (err) {
    console.error('getCoachClassesWithWorkouts error:', err);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
};

/**
 * POST /coach/assign-workout
 */
export const assignWorkoutToClass = async (req: AuthenticatedRequest, res: Response) => {

  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const coachId = req.user.userId;
  const { classId, workoutId } = req.body;

  try {
    // ensure class belongs to coach
    const assigned = await classRepo.findAssignedClassesByCoach(coachId);
    const owns = assigned.some((c) => c.classId === classId);
    if (!owns) return res.status(403).json({ error: 'Unauthorized or class not found' });

    await classRepo.updateWorkoutForClass(classId, workoutId);
    res.json({ success: true });
  } catch (err) {
    console.error('assignWorkoutToClass error:', err);
    res.status(500).json({ error: 'Failed to assign workout' });
  }
};


const WORKOUT_TYPES = ['FOR_TIME', 'AMRAP', 'TABATA', 'EMOM'] as const;
type WorkoutType = (typeof WORKOUT_TYPES)[number];

const QUANTITY_TYPES = ['reps', 'duration'] as const;
type QuantityType = (typeof QUANTITY_TYPES)[number];

type ExerciseInput = {
  exerciseId?: number;
  exerciseName?: string;
  position: number;
  quantityType: QuantityType;
  quantity: number;
  notes?: string;
};

type SubroundInput = {
  subroundNumber: number;
  exercises: ExerciseInput[];
};

type RoundInput = {
  roundNumber: number;
  subrounds: SubroundInput[];
};

export const createWorkout = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const {
    workoutName,
    type,
    metadata,
    rounds: roundsInput,
  } = req.body as {
    workoutName?: string;
    type?: string;
    metadata?: Record<string, unknown>;
    rounds?: RoundInput[];
  };

  // ----- BASIC VALIDATION ----- (keep this identical to previous)
  if (!workoutName || !workoutName.trim()) {
    return res.status(400).json({ error: 'workoutName is required' });
  }
  if (!type || !WORKOUT_TYPES.includes(type as WorkoutType)) {
    return res
      .status(400)
      .json({ error: `type must be one of ${WORKOUT_TYPES.join(', ')}` });
  }
  if (typeof metadata !== 'object' || metadata === null) {
    return res.status(400).json({ error: 'metadata must be an object' });
  }
  if (!Array.isArray(roundsInput) || roundsInput.length === 0) {
    return res.status(400).json({ error: 'rounds must be a non-empty array' });
  }

  for (const r of roundsInput) {
    if (typeof r.roundNumber !== 'number' || !Array.isArray(r.subrounds)) {
      return res
        .status(400)
        .json({ error: 'each round needs roundNumber & subrounds[]' });
    }
    for (const sr of r.subrounds) {
      if (
        typeof sr.subroundNumber !== 'number' ||
        !Array.isArray(sr.exercises) ||
        sr.exercises.length === 0
      ) {
        return res
          .status(400)
          .json({
            error:
              'each subround needs subroundNumber & a non-empty exercises[]',
          });
      }
      for (const ex of sr.exercises) {
        if (
          (ex.exerciseId == null && !ex.exerciseName) ||
          (ex.exerciseId != null && ex.exerciseName)
        ) {
          return res
            .status(400)
            .json({
              error:
                'each exercise must have exactly one of exerciseId or exerciseName',
            });
        }
        if (
          typeof ex.position !== 'number' ||
          !QUANTITY_TYPES.includes(ex.quantityType) ||
          typeof ex.quantity !== 'number'
        ) {
          return res
            .status(400)
            .json({
              error:
                'exercise entries need position:number, quantityType:(reps|duration), quantity:number',
            });
        }
      }
    }
  }

  try {
    const newWorkoutId = await classRepo.createWorkout(
      { workoutName: workoutName.trim(), type: type as WorkoutType, metadata },
      roundsInput,
    );

    return res.json({
      success: true,
      workoutId: newWorkoutId,
      message: 'Workout created with rounds, subrounds & exercises.',
    });
  } catch (err: any) {
    console.error('createWorkout error:', err);
    return res.status(400).json({ error: err.message || 'Insert failed' });
  }
};

/**
 * GET /classes  (member view of upcoming classes)
 */
export const getAllClasses = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const userId = req.user.userId;

  try {
    // get roles via repository
    const roles = await userRepo.getRolesByUserId(userId);
    if (roles.length === 0) return res.status(403).json({ error: 'Unauthorized' });
    if (!roles.includes('member')) return res.status(403).json({ error: 'Unauthorized' });

    const now = new Date();
    const today = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const time = now.toTimeString().slice(0, 8); // HH:MM:SS

    // Drizzle condition: classes.scheduled_date > today OR (classes.scheduled_date = today AND scheduled_time >= time)
    const notPastCondition = or(
      gt(classes.scheduledDate, today),
      and(eq(classes.scheduledDate, today), gte(classes.scheduledTime, time)),
    );

    const classesList = await classRepo.getUpcomingClassesForMembers({ today, time });
    return res.json(classesList);
  } catch (err) {
    console.error('getAllClasses error:', err);
    return res.status(500).json({ error: 'Failed to fetch classes' });
  }
};


/**
 * GET /member/classes
 */
export const getMemberClasses = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const memberId = req.user.userId;

  try {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const time = now.toTimeString().slice(0, 8);

    // Use the same end-time calculation as original code
    const notPastCondition = or(
      gt(classes.scheduledDate, today),
      and(
        eq(classes.scheduledDate, today),
        gte(
          sql`${classes.scheduledTime}::time + (classes.duration_minutes || ' minutes')::interval`,
          time,
        ),
      ),
    );

    const bookedClasses = await classRepo.getBookedClassesForMember(memberId, { today, time });
    return res.json(bookedClasses);
  } catch (err) {
    console.error('getMemberClasses error:', err);
    return res.status(500).json({ error: 'Failed to fetch member classes' });
  }
};

/**
 * POST /book
 */
export const bookClass = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const memberId = req.user.userId;
  const classId = Number(req.body.classId);

  if (!Number.isInteger(classId) || classId <= 0)
    return res.status(400).json({ error: 'Invalid class ID' });

  try {
    await db.transaction(async (tx) => {
      // lock & read class row
      const cls = await classRepo.findClassByIdForUpdate(classId, tx);
      if (!cls) throw { code: 404, msg: 'Class not found' };

      // Reject past classes
      const now = new Date();
      const classEnd = new Date(`${cls.scheduledDate}T${cls.scheduledTime}`);
      classEnd.setMinutes(classEnd.getMinutes() + Number(cls.durationMinutes));

      if (now >= classEnd) throw { code: 400, msg: 'Class has already ended' };

      // Already booked?
      const already = await classRepo.alreadyBooked(classId, memberId, tx);
      if (already) throw { code: 400, msg: 'Already booked' };

      // Seats left?
      const count = await classRepo.countBookingsForClass(classId, tx);
      if (count >= cls.capacity) throw { code: 400, msg: 'Class full' };

      // Insert booking
      await classRepo.insertBooking(classId, memberId, tx);
    });

    return res.json({ success: true });
  } catch (err: any) {
    if (err?.code) return res.status(err.code).json({ error: err.msg });
    console.error('bookClass error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
};

/**
 * POST /checkin
 */
export const checkInToClass = async (req: Request, res: Response) => {
  const { classId, memberId } = req.body;
  if (!classId || !memberId) return res.status(400).json({ error: 'classId and memberId are required' });

  try {
    const attendance = await classRepo.insertAttendance(classId, memberId);
    if (!attendance) return res.status(409).json({ error: 'Already checked in' });
    return res.status(201).json({ success: true, attendance });
  } catch (err) {
    console.error('checkInToClass error:', err);
    return res.status(500).json({ error: 'Failed to check in, class not booked' });
  }
};

/**
 * POST /cancel
 */
export const cancelBooking = async (req: Request, res: Response) => {
  const { classId, memberId } = req.body;
  if (!classId || !memberId) return res.status(400).json({ error: 'classId and memberId are required' });

  try {
    const result: any = await classRepo.deleteBooking(classId, memberId);
    // Drizzle delete may return different shapes depending on driver; attempt to detect row count
    const rowCount = result?.rowCount ?? (Array.isArray(result) ? result.length : undefined);
    if (rowCount === 0) return res.status(404).json({ error: 'Booking not found' });

    return res.json({ success: true });
  } catch (err) {
    console.error('cancelBooking error:', err);
    return res.status(500).json({ error: 'Failed to cancel booking' });
  }
};