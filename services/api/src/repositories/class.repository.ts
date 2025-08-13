// src/repositories/class.repository.ts
import { duration } from 'drizzle-orm/gel-core';
import { db as globalDb } from '../db/client';
import {
  classes,
  workouts,
  classbookings,
  classattendance,
  userroles,
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
  async createWorkout(payload: { workoutName: string; workoutContent: string }, tx?: Executor) {
    const [ins] = await this.exec(tx)
      .insert(workouts)
      .values({
        workoutName: payload.workoutName,
        workoutContent: payload.workoutContent,
      })
      .returning({ workoutId: workouts.workoutId });
    return ins;
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

  async insertAttendance(classId: number, memberId: number, tx?: Executor) {
    const [attendance] = await this.exec(tx)
      .insert(classattendance)
      .values({
        classId,
        memberId,
      })
      .returning();
    return attendance;
  }

  async deleteBooking(classId: number, memberId: number, tx?: Executor) {
    return this.exec(tx)
      .delete(classbookings)
      .where(and(eq(classbookings.classId, classId), eq(classbookings.memberId, memberId)));
  }
}

export default ClassRepository;
