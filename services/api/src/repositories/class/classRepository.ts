import { db as globalDb } from '../../db/client';
import {
  classes,
  classbookings,
  classattendance,
  workouts,
  exercises,
  rounds,
  subrounds,
  subroundExercises,
  users
} from '../../db/schema';
import { eq, and, gt, gte, or, sql, inArray, asc } from 'drizzle-orm';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { IClassRepository } from '../../domain/interfaces/class.interface';
import { Class, ClassWithWorkout, ClassAttendance } from '../../domain/entities/class.entity';

/**
 * Types derived from Drizzle schema
 */
export type ClassRow = InferSelectModel<typeof classes>;
export type WorkoutRow = InferSelectModel<typeof workouts>;
export type BookingRow = InferSelectModel<typeof classbookings>;
export type AttendanceRow = InferSelectModel<typeof classattendance>;

/**
 * Executor type: either the global db or a transaction object
 */
type Executor = typeof globalDb | any;

/**
 * ClassRepository - Persistence Layer
 * Implements IClassRepository interface and handles all database operations
 */
export class ClassRepository implements IClassRepository {
  /**
   * Helper to pick the executor (tx or global db)
   */
  private exec(tx?: Executor): Executor {
    return tx ?? globalDb;
  }

  // Coach-specific queries
  async findAssignedClassesByCoach(coachId: number, tx?: Executor): Promise<Class[]> {
    const rows = await this.exec(tx)
      .select({
        classId: classes.classId,
        scheduledDate: classes.scheduledDate,
        scheduledTime: classes.scheduledTime,
        capacity: classes.capacity,
        workoutId: classes.workoutId,
        coachId: classes.coachId,
        durationMinutes: classes.durationMinutes,
        createdBy: classes.createdBy,
        createdAt: classes.createdAt,
      })
      .from(classes)
      .where(eq(classes.coachId, coachId));

    return rows.map((row: any) => this.mapToClass(row));
  }

  async findAssignedClassesWithWorkoutsByCoach(coachId: number, tx?: Executor): Promise<ClassWithWorkout[]> {
    // Subquery: count bookings per class
    const bookingsCount = this.exec(tx)
      .select({
        classId: classbookings.classId,
        bookingsCount: sql<number>`COUNT(${classbookings.bookingId})`.as('bookingsCount'),
      })
      .from(classbookings)
      .groupBy(classbookings.classId)
      .as('bookingsCount');

    const rows = await this.exec(tx)
      .select({
        classId: classes.classId,
        capacity: classes.capacity,
        scheduledDate: classes.scheduledDate,
        scheduledTime: classes.scheduledTime,
        durationMinutes: classes.durationMinutes,
        coachId: classes.coachId,
        createdBy: classes.createdBy,
        createdAt: classes.createdAt,
        workoutName: workouts.workoutName,
        workoutId: workouts.workoutId,
        workoutType: workouts.type,
        workoutMetadata: workouts.metadata,
        coachFirstName: users.firstName,
        coachLastName: users.lastName,
        bookingsCount: bookingsCount.bookingsCount,
      })
      .from(classes)
      .leftJoin(workouts, eq(classes.workoutId, workouts.workoutId))
      .leftJoin(users, eq(classes.coachId, users.userId))
      .leftJoin(bookingsCount, eq(classes.classId, bookingsCount.classId))
      .where(eq(classes.coachId, coachId));

    return rows.map((row: any) => this.mapToClassWithWorkout(row));
  }

  async findClassByIdForUpdate(classId: number, tx?: Executor): Promise<Class | null> {
    const [row] = await this.exec(tx)
      .select({
        classId: classes.classId,
        capacity: classes.capacity,
        scheduledDate: classes.scheduledDate,
        scheduledTime: classes.scheduledTime,
        durationMinutes: classes.durationMinutes,
        coachId: classes.coachId,
        workoutId: classes.workoutId,
        createdBy: classes.createdBy,
        createdAt: classes.createdAt,
      })
      .from(classes)
      .where(eq(classes.classId, classId))
      .for('update')
      .limit(1);

    return row ? this.mapToClass(row) : null;
  }

  async updateWorkoutForClass(classId: number, workoutId: number, tx?: Executor): Promise<void> {
    await this.exec(tx)
      .update(classes)
      .set({ workoutId })
      .where(eq(classes.classId, classId));
  }

  // Workouts
  async createWorkout(
    workoutData: Omit<WorkoutRow, 'workoutId'>,
    roundsInput: Array<any>,
    tx?: Executor
  ): Promise<number> {
    return (await this.exec(tx).transaction(async (tx: any) => {
      // 1) Insert workout
      const [created] = await tx
        .insert(workouts)
        .values(workoutData)
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

  async updateWorkout(
    workoutId: number,
    workoutData: Omit<WorkoutRow, 'workoutId'>,
    roundsInput: Array<any>,
    tx?: Executor
  ): Promise<number> {
    return (await this.exec(tx).transaction(async (tx: any) => {
      // 1) Update workout
      await tx
        .update(workouts)
        .set(workoutData)
        .where(eq(workouts.workoutId, workoutId));

      // 2) Delete existing rounds, subrounds, and subround exercises
      // This will cascade delete due to foreign key constraints
      await tx
        .delete(rounds)
        .where(eq(rounds.workoutId, workoutId));

      // 3) Gather all requested IDs & names
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

      // 4) Verify existing IDs
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

      // 5) Resolve names → IDs (upsert missing names)
      const nameToId = new Map<string, number>();
      if (wantedNames.size > 0) {
        // 5a) Fetch any that already exist by name
        const existingByNameRows = await tx
          .select({ id: exercises.exerciseId, name: exercises.name })
          .from(exercises)
          .where(inArray(exercises.name, [...wantedNames]));

        existingByNameRows.forEach((r: any) => nameToId.set(r.name, r.id));

        // 5b) Insert the truly new names
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

      // 6) Insert new rounds, subrounds & subround_exercises
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
  async getUpcomingClassesForMembers(
    window: { today: string; time: string },
    tx?: Executor,
  ): Promise<ClassWithWorkout[]> {
    const { today, time } = window;

    // Subquery: count bookings per class
    const bookingsCount = this.exec(tx)
      .select({
        classId: classbookings.classId,
        bookingsCount: sql<number>`COUNT(${classbookings.bookingId})`.as('bookingsCount'),
      })
      .from(classbookings)
      .groupBy(classbookings.classId)
      .as('bookingsCount');

    const rows = await this.exec(tx)
      .select({
        classId: classes.classId,
        scheduledDate: classes.scheduledDate,
        scheduledTime: classes.scheduledTime,
        capacity: classes.capacity,
        coachId: classes.coachId,
        workoutId: classes.workoutId,
        durationMinutes: classes.durationMinutes,
        createdBy: classes.createdBy,
        createdAt: classes.createdAt,

        // workout fields
        workoutName: workouts.workoutName,
        workoutType: workouts.type,
        workoutMetadata: workouts.metadata,

        // coach fields (from users)
        coachFirstName: users.firstName,
        coachLastName: users.lastName,

        // bookings
        bookingsCount: bookingsCount.bookingsCount,
      })
      .from(classes)
      .leftJoin(workouts, eq(classes.workoutId, workouts.workoutId))
      .leftJoin(users, eq(classes.coachId, users.userId))
      .leftJoin(bookingsCount, eq(classes.classId, bookingsCount.classId))
      .where(
        or(
          gt(classes.scheduledDate, today),
          and(eq(classes.scheduledDate, today), gte(classes.scheduledTime, time))
        ),
      );

    return rows.map((row: any) => this.mapToClassWithWorkout(row));
  }

  async getBookedClassesForMember(
    memberId: number,
    window: { today: string; time: string },
    tx?: Executor,
  ): Promise<ClassWithWorkout[]> {
    const { today, time } = window;
    // Subquery: count bookings per class
    const bookingsCount = this.exec(tx)
      .select({
        classId: classbookings.classId,
        bookingsCount: sql<number>`COUNT(${classbookings.bookingId})`.as('bookingsCount'),
      })
      .from(classbookings)
      .groupBy(classbookings.classId)
      .as('bookingsCount');

    const rows = await this.exec(tx)
      .select({
        bookingId: classbookings.bookingId,
        classId: classes.classId,
        scheduledDate: classes.scheduledDate,
        scheduledTime: classes.scheduledTime,
        capacity: classes.capacity,
        coachId: classes.coachId,
        workoutId: classes.workoutId,
        durationMinutes: classes.durationMinutes,
        createdBy: classes.createdBy,
        createdAt: classes.createdAt,
        workoutName: workouts.workoutName,
        workoutType: workouts.type,
        workoutMetadata: workouts.metadata,
        coachFirstName: users.firstName,
        coachLastName: users.lastName,
        bookingsCount: bookingsCount.bookingsCount,
      })
      .from(classbookings)
      .innerJoin(classes, eq(classbookings.classId, classes.classId))
      .leftJoin(workouts, eq(classes.workoutId, workouts.workoutId))
      .leftJoin(users, eq(classes.coachId, users.userId))
      .leftJoin(bookingsCount, eq(classes.classId, bookingsCount.classId))
      .where(
        and(
          eq(classbookings.memberId, memberId),
          or(
            gt(classes.scheduledDate, today),
            and(eq(classes.scheduledDate, today), gte(classes.scheduledTime, time))
          )
        ),
      );

    return rows.map((row: any) => this.mapToClassWithWorkout(row));
  }

  async getUnbookedClassesForMember(
    memberId: number,
    window: { today: string; time: string },
    tx?: Executor,
  ): Promise<ClassWithWorkout[]> {
    const { today, time } = window;

    // Subquery: bookings for this member
    const memberBookings = this.exec(tx)
      .select({ classId: classbookings.classId })
      .from(classbookings)
      .where(eq(classbookings.memberId, memberId))
      .as('memberBookings');

    // Subquery: count bookings per class
    const bookingsCount = this.exec(tx)
      .select({
        classId: classbookings.classId,
        bookingsCount: sql<number>`COUNT(${classbookings.bookingId})`.as('bookingsCount'),
      })
      .from(classbookings)
      .groupBy(classbookings.classId)
      .as('bookingsCount');

    const rows = await this.exec(tx)
      .select({
        classId: classes.classId,
        scheduledDate: classes.scheduledDate,
        scheduledTime: classes.scheduledTime,
        capacity: classes.capacity,
        coachId: classes.coachId,
        workoutId: classes.workoutId,
        durationMinutes: classes.durationMinutes,
        createdBy: classes.createdBy,
        createdAt: classes.createdAt,
        workoutName: workouts.workoutName,
        workoutType: workouts.type,
        workoutMetadata: workouts.metadata,
        coachFirstName: users.firstName,
        coachLastName: users.lastName,
        bookingsCount: bookingsCount.bookingsCount,
      })
      .from(classes)
      .leftJoin(workouts, eq(classes.workoutId, workouts.workoutId))
      .leftJoin(users, eq(classes.coachId, users.userId))
      .leftJoin(bookingsCount, eq(classes.classId, bookingsCount.classId))
      // Anti-join with member's bookings to exclude already booked classes
      .leftJoin(memberBookings, eq(classes.classId, memberBookings.classId))
      .where(
        and(
          // upcoming window
          or(
            gt(classes.scheduledDate, today),
            and(eq(classes.scheduledDate, today), gte(classes.scheduledTime, time))
          ),
          // keep only where there is no matching booking row for this member
          sql`"memberBookings"."class_id" IS NULL`
        )
      )
      .orderBy(asc(classes.scheduledDate), asc(classes.scheduledTime));

    return rows.map((row: any) => this.mapToClassWithWorkout(row));
  }

  // Booking helpers used within transactions
  async alreadyBooked(classId: number, memberId: number, tx?: Executor): Promise<boolean> {
    const rows = await this.exec(tx)
      .select()
      .from(classbookings)
      .where(and(eq(classbookings.classId, classId), eq(classbookings.memberId, memberId)))
      .limit(1);
    return rows.length > 0;
  }

  async countBookingsForClass(classId: number, tx?: Executor): Promise<number> {
    const [{ count }] = await this.exec(tx)
      .select({ count: sql<number>`count(*)` })
      .from(classbookings)
      .where(eq(classbookings.classId, classId));
    return Number(count);
  }

  async insertBooking(classId: number, memberId: number, tx?: Executor): Promise<void> {
    await this.exec(tx).insert(classbookings).values({ classId, memberId });
  }

  /**
   * Check if a member has any existing booking that overlaps the provided class window on the same date.
   * Overlap condition: existingStart < newEnd AND existingEnd > newStart
   */
  async hasOverlappingBooking(
    memberId: number,
    window: { scheduledDate: string; scheduledTime: string; durationMinutes: number },
    tx?: Executor,
  ): Promise<boolean> {
    const executor = this.exec(tx);

    const { scheduledDate, scheduledTime, durationMinutes } = window;

    const [row] = await executor
      .select({ count: sql<number>`count(*)` })
      .from(classbookings)
      .innerJoin(classes, eq(classbookings.classId, classes.classId))
      .where(
        and(
          eq(classbookings.memberId, memberId),
          eq(classes.scheduledDate, scheduledDate),
          // existingStart < newEnd
          sql`${classes.scheduledTime}::time < (${scheduledTime}::time + (${durationMinutes}::int || ' minutes')::interval)`,
          // existingEnd > newStart
          sql`(${classes.scheduledTime}::time + (${classes.durationMinutes}::int || ' minutes')::interval) > ${scheduledTime}::time`,
        ),
      );

    return Number(row?.count ?? 0) > 0;
  }

  async insertAttendance(classId: number, memberId: number, tx?: Executor): Promise<ClassAttendance | null> {
    const executor = this.exec(tx);
    const [attendance] = await executor
      .insert(classattendance)
      .values({ classId, memberId })
      .onConflictDoNothing()
      .returning();

    return attendance ? this.mapToClassAttendance(attendance) : null;
  }

  async deleteBooking(classId: number, memberId: number, tx?: Executor): Promise<any> {
    return this.exec(tx)
      .delete(classbookings)
      .where(and(eq(classbookings.classId, classId), eq(classbookings.memberId, memberId)));
  }

  // Utility methods to map database rows to domain entities
  private mapToClass(row: any): Class {
    return {
      classId: row.classId,
      capacity: row.capacity,
      scheduledDate: row.scheduledDate,
      scheduledTime: row.scheduledTime,
      durationMinutes: row.durationMinutes,
      coachId: row.coachId || undefined,
      workoutId: row.workoutId || undefined,
      createdBy: row.createdBy || undefined,
      createdAt: row.createdAt,
    };
  }

  private mapToClassWithWorkout(row: any): ClassWithWorkout {
    return {
      ...this.mapToClass(row),
      workoutName: row.workoutName,
      workoutType: row.workoutType,
      workoutMetadata: row.workoutMetadata,
      coachFirstName: row.coachFirstName,
      coachLastName: row.coachLastName,
      bookingsCount: row.bookingsCount ?? 0,
    };
  }


  private mapToClassAttendance(row: AttendanceRow): ClassAttendance {
    return {
      classId: row.classId,
      memberId: row.memberId,
      markedAt: (row.markedAt ?? undefined) as unknown as Date | undefined,
      score: row.score ?? undefined,
    };
  }
}
