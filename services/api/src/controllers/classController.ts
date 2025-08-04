import { Request, Response } from 'express';
import { db } from '../db/client';
import { classes, workouts, rounds, subrounds, subroundExercises, classbookings, userroles, classattendance } from '../db/schema';
import { eq, and, gt, gte, or, sql } from 'drizzle-orm';
import { AuthenticatedRequest } from '../middleware/auth';

export const getCoachAssignedClasses = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const coachId = req.user.userId;
  const assignedClasses = await db
    .select({
      classId: classes.classId,
      scheduledDate: classes.scheduledDate,
      scheduledTime: classes.scheduledTime,
      capacity: classes.capacity,
      workoutId: classes.workoutId,
      coachId: classes.coachId,
      workoutName: workouts.workoutName,
    })
    .from(classes)
    .leftJoin(workouts, eq(classes.workoutId, workouts.workoutId))
    .where(eq(classes.coachId, coachId));
  res.json(assignedClasses);
};

export const getCoachClassesWithWorkouts = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    console.log('Unauthorized access attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const coachId = req.user.userId;
  const classWithWorkouts = await db
    .select({
      classId: classes.classId,
      scheduledDate: classes.scheduledDate,
      scheduledTime: classes.scheduledTime,
      workoutName: workouts.workoutName,
      // workoutContent: workouts.workoutContent,
    })
    .from(classes)
    .leftJoin(workouts, eq(classes.workoutId, workouts.workoutId))
    .where(eq(classes.coachId, coachId));
  res.json(classWithWorkouts);
};

export const assignWorkoutToClass = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const coachId = req.user.userId;
  const { classId, workoutId } = req.body;

  // check class belongs to coach
  const [cls] = await db
    .select()
    .from(classes)
    .where(and(eq(classes.classId, classId), eq(classes.coachId, coachId)));
  if (!cls) return res.status(403).json({ error: 'Unauthorized or class not found' });

  await db.update(classes).set({ workoutId }).where(eq(classes.classId, classId));
  res.json({ success: true });
};

const WORKOUT_TYPES = ['FOR_TIME', 'AMRAP', 'TABATA', 'EMOM'] as const;
type WorkoutType = (typeof WORKOUT_TYPES)[number];

const QUANTITY_TYPES = ['reps', 'duration'] as const;
type QuantityType = (typeof QUANTITY_TYPES)[number];

export const createWorkout = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  type ReqBody = {
    workoutName?: string;
    type?: string;
    metadata?: Record<string, unknown>;
    rounds?: Array<{
      roundNumber: number;
      subrounds: Array<{
        subroundNumber: number;
        exercises: Array<{
          exerciseId: number;
          position: number;
          quantityType: QuantityType;
          quantity: number;
          notes?: string;
        }>;
      }>;
    }>;
  };

  const { workoutName, type, metadata, rounds: roundsInput } =
    req.body as ReqBody;

  // 1) BASIC VALIDATION
  if (!workoutName?.trim())
    return res.status(400).json({ error: 'workoutName is required' });

  if (!type || !(WORKOUT_TYPES as readonly string[]).includes(type))
    return res
      .status(400)
      .json({ error: `type must be one of ${WORKOUT_TYPES.join(', ')}` });

  if (typeof metadata !== 'object' || metadata === null)
    return res.status(400).json({ error: 'metadata must be an object' });

  if (!Array.isArray(roundsInput) || roundsInput.length === 0)
    return res
      .status(400)
      .json({ error: 'rounds must be a non-empty array' });

  // 2) SHAPE-VALIDATION
  for (const r of roundsInput) {
    if (typeof r.roundNumber !== 'number' || !Array.isArray(r.subrounds))
      return res
        .status(400)
        .json({ error: 'each round needs roundNumber & subrounds[]' });

    for (const sr of r.subrounds) {
      if (
        typeof sr.subroundNumber !== 'number' ||
        !Array.isArray(sr.exercises) ||
        sr.exercises.length === 0
      ) {
        return res.status(400).json({
          error: 'each subround needs subroundNumber & non-empty exercises[]',
        });
      }
      for (const ex of sr.exercises) {
        if (
          typeof ex.exerciseId !== 'number' ||
          typeof ex.position !== 'number' ||
          !QUANTITY_TYPES.includes(ex.quantityType) ||
          typeof ex.quantity !== 'number'
        ) {
          return res.status(400).json({
            error:
              'exercise entries must have exerciseId:number, position:number, quantityType:(reps|duration), quantity:number',
          });
        }
      }
    }
  }

  // 3) TRANSACTIONAL INSERT
  try {
    const workoutId = await db.transaction(async (tx) => {
      const [w] = await tx
        .insert(workouts)
        .values({
          workoutName: workoutName.trim(),
          type: type as WorkoutType,
          metadata,
        })
        .returning({ workoutId: workouts.workoutId });

      for (const r of roundsInput) {
        const [roundRec] = await tx
          .insert(rounds)
          .values({
            workoutId: w.workoutId,
            roundNumber: r.roundNumber,
          })
          .returning({ roundId: rounds.roundId });

        for (const sr of r.subrounds) {
          const [subRec] = await tx
            .insert(subrounds)
            .values({
              roundId: roundRec.roundId,
              subroundNumber: sr.subroundNumber,
            })
            .returning({ subroundId: subrounds.subroundId });

          for (const ex of sr.exercises) {
            await tx.insert(subroundExercises).values({
              subroundId: subRec.subroundId,
              exerciseId: ex.exerciseId,
              position: ex.position,
              quantityType: ex.quantityType,
              quantity: ex.quantity,
              notes: ex.notes ?? null,
            });
          }
        }
      }

      return w.workoutId;
    });

    return res.json({
      success: true,
      workoutId,
      message: 'Workout + rounds/subrounds/exercises created',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create workout' });
  }
};

export const getAllClasses = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const userId = req.user.userId;

  const rolesRows = await db
    .select({ role: userroles.userRole })
    .from(userroles)
    .where(eq(userroles.userId, userId));

  if (rolesRows.length === 0) return res.status(403).json({ error: 'Unauthorized' });

  const roles = rolesRows.map((r) => r.role as string);

  const now = new Date();
  const today = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const time = now.toTimeString().slice(0, 8); // HH:MM:SS

  const notPast = or(
    gt(classes.scheduledDate, today),
    and(eq(classes.scheduledDate, today), gte(classes.scheduledTime, time)),
  );

  // -- members can see everything upcoming; coaches ignored for now -------------
  if (!roles.includes('member')) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const classesList = await db
    .select({
      classId: classes.classId,
      scheduledDate: classes.scheduledDate,
      scheduledTime: classes.scheduledTime,
      capacity: classes.capacity,
      coachId: classes.coachId,
      workoutId: classes.workoutId,
      workoutName: workouts.workoutName,
    })
    .from(classes)
    .leftJoin(workouts, eq(classes.workoutId, workouts.workoutId))
    .where(notPast); // ← filter out old ones

  res.json(classesList);
};

export const getMemberClasses = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const memberId = req.user.userId;

  // same not-in-the-past helper
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 8);

  const notPast = or(
    gt(classes.scheduledDate, today),
    and(
      eq(classes.scheduledDate, today),
      gte(
        sql`${classes.scheduledTime}::time + (classes.duration_minutes || ' minutes')::interval`,
        time,
      ),
    ),
  );

  const bookedClasses = await db
    .select({
      bookingId: classbookings.bookingId,
      classId: classes.classId,
      scheduledDate: classes.scheduledDate,
      scheduledTime: classes.scheduledTime,
      workoutName: workouts.workoutName,
    })
    .from(classbookings)
    .innerJoin(classes, eq(classbookings.classId, classes.classId))
    .leftJoin(workouts, eq(classes.workoutId, workouts.workoutId))
    .where(and(eq(classbookings.memberId, memberId), notPast));

  res.json(bookedClasses);
};

export const bookClass = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const memberId = req.user.userId;
  const classId = Number(req.body.classId);

  if (!Number.isInteger(classId) || classId <= 0)
    return res.status(400).json({ error: 'Invalid class ID' });

  try {
    await db.transaction(async (tx) => {
      const [cls] = await tx
        .select({
          capacity: classes.capacity,
          scheduledDate: classes.scheduledDate,
          scheduledTime: classes.scheduledTime,
          duration: classes.durationMinutes,
        })
        .from(classes)
        .where(eq(classes.classId, classId))
        .for('update') // row lock
        .limit(1);

      if (!cls) throw { code: 404, msg: 'Class not found' };

      // 2. Reject past classes
      const now = new Date();

      const classEnd = new Date(`${cls.scheduledDate}T${cls.scheduledTime}`);
      classEnd.setMinutes(classEnd.getMinutes() + cls.duration);

      if (now >= classEnd) throw { code: 400, msg: 'Class has already ended' };

      // 3. Already booked?
      const dup = await tx
        .select()
        .from(classbookings)
        .where(and(eq(classbookings.classId, classId), eq(classbookings.memberId, memberId)))
        .limit(1);

      if (dup.length) throw { code: 400, msg: 'Already booked' };

      // 4. Seats left?
      const [{ count }] = await tx
        .select({ count: sql<number>`count(*)` })
        .from(classbookings)
        .where(eq(classbookings.classId, classId));

      if (count >= cls.capacity) throw { code: 400, msg: 'Class full' };

      // 5. Insert booking
      await tx.insert(classbookings).values({ classId, memberId });
    });

    res.json({ success: true });
  } catch (err: any) {
    if (err?.code) return res.status(err.code).json({ error: err.msg });
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
};

export const checkInToClass = async (req: Request, res: Response) => {
  const { classId, memberId } = req.body;

  if (!classId || !memberId) {
    return res.status(400).json({ error: 'classId and memberId are required' });
  }

  try {
    // Insert attendance
    const [attendance] = await db
      .insert(classattendance)
      .values({
        classId,
        memberId,
      })
      .returning();

    return res.status(201).json({ success: true, attendance });
  } catch (err: any) {
    if (err.code === '23505') {
      // Unique violation
      return res.status(409).json({ error: 'Already checked in' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Failed to check in, class not booked' });
  }
};

export const cancelBooking = async (req: Request, res: Response) => {
  const { classId, memberId } = req.body;

  if (!classId || !memberId) {
    return res.status(400).json({ error: 'classId and memberId are required' });
  }

  try {
    const result = await db
      .delete(classbookings)
      .where(and(eq(classbookings.classId, classId), eq(classbookings.memberId, memberId)));

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to cancel booking' });
  }
};
