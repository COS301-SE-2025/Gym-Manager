import { Request, Response } from 'express';
import { db } from '../db/client';
import { classes, workouts, coaches, members, classbookings, userroles } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { AuthenticatedRequest } from '../middleware/auth';

export const getCoachAssignedClasses = async (req : AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
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

export const getCoachClassesWithWorkouts = async (req : AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    console.log('Unauthorized access attempt');
    return res.status(401).json({ error: "Unauthorized" });
  }
  const coachId = req.user.userId;
  const classWithWorkouts = await db.select({
      classId: classes.classId,
      scheduledDate: classes.scheduledDate,
      scheduledTime: classes.scheduledTime,
      workoutName: workouts.workoutName,
      workoutContent: workouts.workoutContent,
    })
    .from(classes)
    .leftJoin(workouts, eq(classes.workoutId, workouts.workoutId))
    .where(eq(classes.coachId, coachId));
  res.json(classWithWorkouts);
};

export const assignWorkoutToClass = async (req : AuthenticatedRequest, res : Response) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const coachId = req.user.userId;
  const { classId, workoutId } = req.body;

  // check class belongs to coach
  const [cls] = await db.select().from(classes).where(and(eq(classes.classId, classId), eq(classes.coachId, coachId)));
  if (!cls) return res.status(403).json({ error: "Unauthorized or class not found" });

  await db.update(classes).set({ workoutId }).where(eq(classes.classId, classId));
  res.json({ success: true });
};

export const createWorkout = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  const { workoutName, workoutContent } = req.body;
  
  // Validate input
  if (!workoutName || !workoutContent) {
    return res.status(400).json({ error: "Workout name and content are required" });
  }
  
  try {
    // Insert new workout
    const [newWorkout] = await db.insert(workouts).values({
      workoutName: workoutName.trim(),
      workoutContent: workoutContent.trim(),
    }).returning({ workoutId: workouts.workoutId });
    
    res.json({ 
      success: true, 
      workoutId: newWorkout.workoutId,
      message: "Workout created successfully" 
    });
  } catch (error) {
    console.error('Error creating workout:', error);
    res.status(500).json({ error: "Failed to create workout" });
  }
};

export const getAllClasses = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const userId = req.user.userId;

  const rows = await db
    .select({ role: userroles.userRole })
    .from(userroles)
    .where(eq(userroles.userId, userId));
  if (rows.length === 0) return res.status(403).json({ error: 'Unauthorized' });

  const roles = rows.map(r => r.role as string);   // ['member', 'coach', …]
  let classesList;

  // COACHES WILL BE IGNORED FOR NOW BECAUSE THEY CAN'T HAVE CLASSES WITHOUT MEMBERSHIP ROLE.
  // IF THIS NEEDS TO CHANGE, LET ME KNOW

  // if (roles.includes('coach')) {
  //   classesList = await db
  //     .select()
  //     .from(classes)
  //     .where(eq(classes.coachId, userId));
  // } else 
  if (roles.includes('member')) {
    classesList = await db
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
      .leftJoin(workouts, eq(classes.workoutId, workouts.workoutId));
  } else {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  res.json(classesList);
};

export const getMemberClasses = async (req : AuthenticatedRequest, res : Response) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const memberId = req.user.userId;

  // Get classes booked by member
  const bookedClasses = await db.select({
      bookingId: classbookings.bookingId,
      classId: classes.classId,
      scheduledDate: classes.scheduledDate,
      scheduledTime: classes.scheduledTime,
      workoutName: workouts.workoutName,
    })
    .from(classbookings)
    .innerJoin(classes, eq(classbookings.classId, classes.classId))
    .leftJoin(workouts, eq(classes.workoutId, workouts.workoutId))
    .where(eq(classbookings.memberId, memberId));

  res.json(bookedClasses);
};

export const bookClass = async (req : AuthenticatedRequest, res : Response) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const memberId = req.user.userId;
  const { classId: classIdStr } = req.body;

  // Parse classId to integer
  const classId = parseInt(classIdStr, 10);
  if (isNaN(classId)) {
    return res.status(400).json({ error: "Invalid class ID format" });
  }

  // // Check if member exists and is approved
  // const [member] = await db.select().from(members).where(eq(members.userId, memberId));
  // if (!member || member.status !== 'approved') return res.status(403).json({ error: "Membership not approved" });

  // Check if class exists
  const [cls] = await db.select().from(classes).where(eq(classes.classId, classId));
  if (!cls) return res.status(404).json({ error: "Class not found" });

  // Check if already booked
  const existingBooking = await db.select().from(classbookings).where(and(eq(classbookings.classId, classId), eq(classbookings.memberId, memberId)));
  if (existingBooking.length > 0) return res.status(400).json({ error: "Already booked" });

  // Check class capacity
  const bookingCount = await db.select().from(classbookings).where(eq(classbookings.classId, classId));
  if (bookingCount.length >= cls.capacity) return res.status(400).json({ error: "Class full" });

  // Book class
  await db.insert(classbookings).values({ classId, memberId });
  await db.update(classes).set({ capacity: cls.capacity - 1 }).where(eq(classes.classId, classId));
  res.json({ success: true });
};
