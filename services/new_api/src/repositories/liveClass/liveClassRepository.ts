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
  classSessions,
  liveProgress,
  users,
} from '../../db/schema';
import { eq, and, sql, desc, asc } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import { ILiveClassRepository } from '../../domain/interfaces/liveClass.interface';
import {
  LeaderboardEntry,
  LiveProgress,
  RealtimeLeaderboardEntry,
  IntervalLeaderboardEntry,
} from '../../domain/entities/liveClass.entity';

/**
 * Types derived from Drizzle schema
 */
export type ClassSessionRow = InferSelectModel<typeof classSessions>;
export type LiveProgressRow = InferSelectModel<typeof liveProgress>;

/**
 * Executor type: either the global db or a transaction object
 */
type Executor = typeof globalDb | any;

/**
 * LiveClassRepository - Persistence Layer
 * Implements ILiveClassRepository interface and handles all database operations
 */
export class LiveClassRepository implements ILiveClassRepository {
  /**
   * Helper to pick the executor (tx or global db)
   */
  private exec(tx?: Executor): Executor {
    return tx ?? globalDb;
  }

  async getLeaderboard(classId: number): Promise<LeaderboardEntry[]> {
    const rows = await this.exec()
      .select({
        userId: users.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        score: classattendance.score,
      })
      .from(classattendance)
      .innerJoin(users, eq(classattendance.memberId, users.userId))
      .where(eq(classattendance.classId, classId))
      .orderBy(desc(classattendance.score), asc(users.lastName), asc(users.firstName));

    return rows.map(row => ({
      userId: row.userId,
      firstName: row.firstName,
      lastName: row.lastName,
      score: row.score,
    }));
  }

  async getLiveClassForCoach(userId: number): Promise<any> {
    const [row] = await this.exec()
      .select({
        classId: classes.classId,
        scheduledDate: classes.scheduledDate,
        scheduledTime: classes.scheduledTime,
        workoutId: classes.workoutId,
        workoutName: workouts.workoutName,
        status: classSessions.status,
        startedAt: classSessions.startedAt,
        timeCapSeconds: classSessions.timeCapSeconds,
      })
      .from(classes)
      .leftJoin(workouts, eq(classes.workoutId, workouts.workoutId))
      .leftJoin(classSessions, eq(classes.classId, classSessions.classId))
      .where(and(eq(classes.coachId, userId), eq(classSessions.status, 'live')))
      .limit(1);

    return row || null;
  }

  async getLiveClassForMember(userId: number): Promise<any> {
    const [row] = await this.exec()
      .select({
        classId: classes.classId,
        scheduledDate: classes.scheduledDate,
        scheduledTime: classes.scheduledTime,
        workoutId: classes.workoutId,
        workoutName: workouts.workoutName,
        status: classSessions.status,
        startedAt: classSessions.startedAt,
        timeCapSeconds: classSessions.timeCapSeconds,
      })
      .from(classbookings)
      .innerJoin(classes, eq(classbookings.classId, classes.classId))
      .leftJoin(workouts, eq(classes.workoutId, workouts.workoutId))
      .leftJoin(classSessions, eq(classes.classId, classSessions.classId))
      .where(and(eq(classbookings.memberId, userId), eq(classSessions.status, 'live')))
      .limit(1);

    return row || null;
  }

  async getWorkoutSteps(workoutId: number): Promise<{ steps: any[]; stepsCumReps: number[]; workoutType: string }> {
    // This is a complex query that needs to be implemented based on the workout structure
    // For now, returning a placeholder implementation
    const [workout] = await this.exec()
      .select({
        type: workouts.type,
        metadata: workouts.metadata,
      })
      .from(workouts)
      .where(eq(workouts.workoutId, workoutId))
      .limit(1);

    if (!workout) {
      throw new Error('Workout not found');
    }

    // This would need to be implemented based on the actual workout structure
    // For now, returning placeholder data
    return {
      steps: [],
      stepsCumReps: [],
      workoutType: workout.type || 'FOR_TIME',
    };
  }

  async submitCoachScores(classId: number, scores: { userId: number; score: number }[]): Promise<void> {
    for (const score of scores) {
      await this.exec()
        .update(classattendance)
        .set({ score: score.score })
        .where(and(eq(classattendance.classId, classId), eq(classattendance.memberId, score.userId)));
    }
  }

  async submitMemberScore(classId: number, memberId: number, score: number): Promise<void> {
    await this.exec()
      .update(classattendance)
      .set({ score })
      .where(and(eq(classattendance.classId, classId), eq(classattendance.memberId, memberId)));
  }

  async startLiveClass(
    classId: number,
    workoutId: number,
    steps: any[],
    stepsCumReps: number[],
    timeCapSeconds: number,
    restart: boolean
  ): Promise<any> {
    return this.exec().transaction(async (tx) => {
      // Insert or update class session record
      const [session] = await tx
        .insert(classSessions)
        .values({
          classId,
          workoutId,
          status: 'live',
          timeCapSeconds,
          steps,
          stepsCumReps,
        })
        .onConflictDoUpdate({
          target: classSessions.classId,
          set: {
            status: 'live',
            timeCapSeconds,
            startedAt: new Date().toISOString(),
            endedAt: null,
            steps,
            stepsCumReps,
          },
        })
        .returning();

      // Reset any partial reps from previous runs
      await tx
        .update(liveProgress)
        .set({ dnfPartialReps: 0 })
        .where(eq(liveProgress.classId, classId));

      // Ensure every booked participant has a live_progress entry
      await tx.execute(sql`
        insert into public.live_progress (class_id, user_id)
        select ${classId}, cb.member_id
        from public.classbookings cb
        where cb.class_id = ${classId}
        on conflict (class_id, user_id) do nothing
      `);

      // If restart flag is provided, reset all participants' progress
      if (restart) {
        await tx
          .update(liveProgress)
          .set({
            currentStep: 0,
            roundsCompleted: 0,
            finishedAt: null,
            dnfPartialReps: 0,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(liveProgress.classId, classId));
      }

      return session;
    });
  }

  async stopLiveClass(classId: number): Promise<void> {
    await this.exec()
      .update(classSessions)
      .set({
        status: 'finished',
        endedAt: new Date().toISOString(),
      })
      .where(eq(classSessions.classId, classId));
  }

  async advanceProgress(
    classId: number,
    userId: number,
    direction: number,
    workoutType: string,
    stepCount: number
  ): Promise<{ current_step: number; finished_at?: Date }> {
    const [progress] = await this.exec()
      .select({
        currentStep: liveProgress.currentStep,
        roundsCompleted: liveProgress.roundsCompleted,
      })
      .from(liveProgress)
      .where(and(eq(liveProgress.classId, classId), eq(liveProgress.userId, userId)))
      .limit(1);

    if (!progress) {
      throw new Error('Progress not found');
    }

    let newStep = progress.currentStep + direction;
    let finishedAt = null;

    if (newStep >= stepCount) {
      newStep = stepCount;
      finishedAt = new Date().toISOString();
    } else if (newStep < 0) {
      newStep = 0;
    }

    await this.exec()
      .update(liveProgress)
      .set({
        currentStep: newStep,
        finishedAt,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(liveProgress.classId, classId), eq(liveProgress.userId, userId)));

    return {
      current_step: newStep,
      finished_at: finishedAt ? new Date(finishedAt) : undefined,
    };
  }

  async submitPartial(classId: number, userId: number, reps: number): Promise<void> {
    await this.exec()
      .update(liveProgress)
      .set({
        dnfPartialReps: reps,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(liveProgress.classId, classId), eq(liveProgress.userId, userId)));
  }

  async getRealtimeLeaderboard(classId: number): Promise<RealtimeLeaderboardEntry[]> {
    const rows = await this.exec()
      .select({
        userId: users.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        currentStep: liveProgress.currentStep,
        roundsCompleted: liveProgress.roundsCompleted,
        finishedAt: liveProgress.finishedAt,
        dnfPartialReps: liveProgress.dnfPartialReps,
      })
      .from(liveProgress)
      .innerJoin(users, eq(liveProgress.userId, users.userId))
      .where(eq(liveProgress.classId, classId))
      .orderBy(desc(liveProgress.currentStep), desc(liveProgress.roundsCompleted), asc(users.lastName));

    return rows.map(row => ({
      userId: row.userId,
      firstName: row.firstName,
      lastName: row.lastName,
      currentStep: row.currentStep,
      roundsCompleted: row.roundsCompleted,
      finishedAt: row.finishedAt,
      dnfPartialReps: row.dnfPartialReps,
    }));
  }

  async getMyProgress(classId: number, userId: number): Promise<LiveProgress> {
    const [row] = await this.exec()
      .select({
        classId: liveProgress.classId,
        userId: liveProgress.userId,
        currentStep: liveProgress.currentStep,
        roundsCompleted: liveProgress.roundsCompleted,
        finishedAt: liveProgress.finishedAt,
        dnfPartialReps: liveProgress.dnfPartialReps,
        updatedAt: liveProgress.updatedAt,
      })
      .from(liveProgress)
      .where(and(eq(liveProgress.classId, classId), eq(liveProgress.userId, userId)))
      .limit(1);

    if (!row) {
      throw new Error('Progress not found');
    }

    return {
      classId: row.classId,
      userId: row.userId,
      currentStep: row.currentStep,
      roundsCompleted: row.roundsCompleted,
      finishedAt: row.finishedAt,
      dnfPartialReps: row.dnfPartialReps,
      updatedAt: row.updatedAt,
    };
  }

  async postIntervalScore(classId: number, userId: number, stepIndex: number, reps: number): Promise<void> {
    // This would need to be implemented based on the interval workout structure
    // For now, just updating the partial reps
    await this.submitPartial(classId, userId, reps);
  }

  async getIntervalLeaderboard(classId: number): Promise<IntervalLeaderboardEntry[]> {
    // This would need to be implemented based on the interval workout structure
    // For now, returning the realtime leaderboard
    const realtimeEntries = await this.getRealtimeLeaderboard(classId);
    return realtimeEntries.map(entry => ({
      userId: entry.userId,
      firstName: entry.firstName,
      lastName: entry.lastName,
      currentStep: entry.currentStep,
      roundsCompleted: entry.roundsCompleted,
      finishedAt: entry.finishedAt,
      dnfPartialReps: entry.dnfPartialReps,
    }));
  }

  async ensureProgressRow(classId: number, userId: number): Promise<void> {
    await this.exec()
      .insert(liveProgress)
      .values({
        classId,
        userId,
        currentStep: 0,
        roundsCompleted: 0,
        dnfPartialReps: 0,
      })
      .onConflictDoNothing();
  }

  async validateIntervalWorkout(classId: number): Promise<{ type: string; steps: any[] }> {
    const [session] = await this.exec()
      .select({
        workoutId: classSessions.workoutId,
        steps: classSessions.steps,
      })
      .from(classSessions)
      .where(eq(classSessions.classId, classId))
      .limit(1);

    if (!session) {
      throw new Error('Class session not found');
    }

    return {
      type: 'INTERVAL', // This would be determined from the workout type
      steps: session.steps || [],
    };
  }

  async validateBooking(classId: number, userId: number): Promise<boolean> {
    const [booking] = await this.exec()
      .select()
      .from(classbookings)
      .where(and(eq(classbookings.classId, classId), eq(classbookings.memberId, userId)))
      .limit(1);

    return !!booking;
  }
}
