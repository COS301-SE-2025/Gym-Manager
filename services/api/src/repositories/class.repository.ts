// src/repositories/class.repository.ts
import { duration } from 'drizzle-orm/gel-core';
import { db as globalDb } from '../db/client';
import {
    classes,
    classbookings,
    classattendance,
    userroles,
    workouts,
    exercises, 
    rounds, 
    subrounds, 
    subroundExercises,
  // other tables if needed
} from '../db/schema';
import { eq, and, gt, gte, or, sql, inArray } from 'drizzle-orm';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

export type ClassRow = InferSelectModel<typeof classes>;
export type WorkoutRow = InferSelectModel<typeof workouts>;
export type BookingRow = InferSelectModel<typeof classbookings>;
export type AttendanceRow = InferSelectModel<typeof classattendance>;
type Executor = typeof globalDb | any;

export class ClassRepository {
  private exec(tx?: Executor): Executor {
    return tx ?? globalDb;
  }

  // Coach-specific queries
  async findAssignedClassesByCoach(coachId: number, tx?: Executor): Promise<ClassRow[]> {
    return this.exec(tx)
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
  }

  async findAssignedClassesWithWorkoutsByCoach(coachId: number, tx?: Executor): Promise<any[]> {
    return this.exec(tx)
      .select({
        classId: classes.classId,
        capacity: classes.capacity,
        scheduledDate: classes.scheduledDate,
        scheduledTime: classes.scheduledTime,
        durationMinutes: classes.durationMinutes,
        workoutName: workouts.workoutName,
        workoutId: workouts.workoutId,
      })
      .from(classes)
      .leftJoin(workouts, eq(classes.workoutId, workouts.workoutId))
      .where(eq(classes.coachId, coachId));
  }

  async findClassByIdForUpdate(classId: number, tx: Executor): Promise<any | null> {
    // used inside a transaction with FOR UPDATE locking
    const [row] = await this.exec(tx)
      .select({
        classId: classes.classId,
        capacity: classes.capacity,
        scheduledDate: classes.scheduledDate,
        scheduledTime: classes.scheduledTime,
        durationMinutes: classes.durationMinutes,
      })
      .from(classes)
      .where(eq(classes.classId, classId))
      .for('update')
      .limit(1);
    return row ?? null;
  }

  async updateWorkoutForClass(classId: number, workoutId: number, tx?: Executor): Promise<void> {
    await this.exec(tx)
      .update(classes)
      .set({ workoutId })
      .where(eq(classes.classId, classId));
  }

  // Workouts
  async createWorkout(
    workoutPayload: { workoutName: string; type: string; metadata: Record<string, unknown> },
    roundsInput: Array<any>, // keep loose here; controller validates shape
  ): Promise<number> {
    return (await globalDb.transaction(async (tx: any) => {
      // 1) Insert workout
      const [created] = await tx
        .insert(workouts)
        .values({
          workoutName: workoutPayload.workoutName,
          type: workoutPayload.type,
          metadata: workoutPayload.metadata,
        })
        .returning({ workoutId: workouts.workoutId });

      const workoutId = created.workoutId;

      // 2) Gather all requested IDs & names
      const wantedIds = new Set<number>();
      const wantedNames = new Set<string>();
      for (const r of roundsInput) {
        for (const sr of r.subrounds) {
          for (const ex of sr.exercises) {
            if (ex.exerciseId != null) wantedIds.add(ex.exerciseId);
            else wantedNames.add(ex.exerciseName);
          }
        }
      }

      // 3) Verify existing IDs
      if (wantedIds.size > 0) {
        const existingIdRows = await tx
          .select({ id: exercises.exerciseId })
          .from(exercises)
          .where(inArray(exercises.exerciseId, [...wantedIds]));
        const existingIds = new Set(existingIdRows.map((r: any) => r.id));
        const missingIds = [...wantedIds].filter((id) => !existingIds.has(id));
        if (missingIds.length) {
          throw new Error(`These exerciseIds do not exist: ${missingIds.join(', ')}`);
        }
      }

      // 4) Resolve names → IDs (upsert missing names)
      const nameToId = new Map<string, number>();
      if (wantedNames.size > 0) {
        // 4a) Fetch any that already exist by name
        const existingByNameRows = await tx
          .select({ id: exercises.exerciseId, name: exercises.name })
          .from(exercises)
          .where(inArray(exercises.name, [...wantedNames]));

        existingByNameRows.forEach((r: any) => nameToId.set(r.name, r.id));

        // 4b) Insert the truly new names
        for (const name of wantedNames) {
          if (!nameToId.has(name)) {
            const [ins] = await tx
              .insert(exercises)
              .values({ name, description: null })
              .returning({ id: exercises.exerciseId });
            nameToId.set(name, ins.id);
          }
        }
      }

      // 5) Insert rounds, subrounds & subround_exercises
      for (const r of roundsInput) {
        const [roundRec] = await tx
          .insert(rounds)
          .values({ workoutId, roundNumber: r.roundNumber })
          .returning({ roundId: rounds.roundId });
        const roundId = roundRec.roundId;

        for (const sr of r.subrounds) {
          const [subRec] = await tx
            .insert(subrounds)
            .values({
              roundId,
              subroundNumber: sr.subroundNumber,
            })
            .returning({ subroundId: subrounds.subroundId });
          const subroundId = subRec.subroundId;

          for (const ex of sr.exercises) {
            const exId = ex.exerciseId != null ? ex.exerciseId : nameToId.get(ex.exerciseName);
            if (!exId) {
              // Defensive: should not happen if controller validated inputs and repo inserted missing names
              throw new Error(`Unable to resolve exercise id for ${ex.exerciseName ?? ex.exerciseId}`);
            }
            await tx.insert(subroundExercises).values({
              subroundId,
              exerciseId: exId,
              position: ex.position,
              quantityType: ex.quantityType,
              quantity: ex.quantity,
              notes: ex.notes ?? null,
            });
          }
        }
      }

      return workoutId;
    })) as number;
  }

  // Member / listing queries
  async getUpcomingClassesForMembers(notPastCondition: any, tx?: Executor) {
    return this.exec(tx)
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
      .where(notPastCondition);
  }

  async getBookedClassesForMember(memberId: number, notPastCondition: any, tx?: Executor) {
    return this.exec(tx)
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
      .where(and(eq(classbookings.memberId, memberId), notPastCondition));
  }

  // Booking helpers used within transactions
  async alreadyBooked(classId: number, memberId: number, tx: Executor) {
    const rows = await this.exec(tx)
      .select()
      .from(classbookings)
      .where(and(eq(classbookings.classId, classId), eq(classbookings.memberId, memberId)))
      .limit(1);
    return rows.length > 0;
  }

  async countBookingsForClass(classId: number, tx: Executor) {
    const [{ count }] = await this.exec(tx)
      .select({ count: sql<number>`count(*)` })
      .from(classbookings)
      .where(eq(classbookings.classId, classId));
    return Number(count);
  }

  async insertBooking(classId: number, memberId: number, tx: Executor) {
    await this.exec(tx).insert(classbookings).values({ classId, memberId });
  }

// class.repository.ts (inside ClassRepository)
async insertAttendance(classId: number, memberId: number, tx?: Executor) {
    const executor = this.exec(tx);
    const [attendance] = await executor
        .insert(classattendance)
        .values({ classId, memberId })
        .onConflictDoNothing()
        .returning();

    // if null/undefined => row wasn't inserted (duplicate existed)
    return attendance ?? null;
}

  async deleteBooking(classId: number, memberId: number, tx?: Executor) {
    return this.exec(tx)
      .delete(classbookings)
      .where(and(eq(classbookings.classId, classId), eq(classbookings.memberId, memberId)));
  }
}

export default ClassRepository;
