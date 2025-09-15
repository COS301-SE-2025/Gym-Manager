import { db as globalDb } from '../../db/client';
import {
  classes,
  workouts,
  users,
  members,
  classattendance
} from '../../db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';

/**
 * Types derived from Drizzle schema
 */
export type ClassRow = InferSelectModel<typeof classes>;
export type WorkoutRow = InferSelectModel<typeof workouts>;
export type UserRow = InferSelectModel<typeof users>;
export type MemberRow = InferSelectModel<typeof members>;
export type AttendanceRow = InferSelectModel<typeof classattendance>;

/**
 * Executor type: either the global db or a transaction object
 */
type Executor = typeof globalDb | any;

/**
 * Domain interfaces
 */
export interface IDailyLeaderboardRepository {
  getDailyLeaderboard(date: string, tx?: Executor): Promise<DailyLeaderboardEntry[]>;
}

export interface DailyLeaderboardEntry {
  userId: number;
  firstName: string;
  lastName: string;
  totalScore: number;
  classCount: number;
  bestScore: number;
  bestWorkoutName: string;
}

/**
 * DailyLeaderboardRepository - Persistence Layer
 * Implements IDailyLeaderboardRepository interface and handles all database operations
 */
export class DailyLeaderboardRepository implements IDailyLeaderboardRepository {
  /**
   * Helper to pick the executor (tx or global db)
   */
  private exec(tx?: Executor): Executor {
    return tx ?? globalDb;
  }

  async getDailyLeaderboard(date: string, tx?: Executor): Promise<DailyLeaderboardEntry[]> {
    try {
      // First, get all classes for the specified date with their attendance records
      const rows = await this.exec(tx)
        .select({
          classId: classes.classId,
          userId: users.userId,
          firstName: users.firstName,
          lastName: users.lastName,
          score: classattendance.score,
          workoutName: workouts.workoutName,
          workoutType: workouts.type,
        })
        .from(classes)
        .innerJoin(classattendance, eq(classes.classId, classattendance.classId))
        .innerJoin(users, eq(classattendance.memberId, users.userId))
        .innerJoin(members, eq(users.userId, members.userId))
        .leftJoin(workouts, eq(classes.workoutId, workouts.workoutId))
        .where(
          and(
            eq(classes.scheduledDate, date),
            eq(members.publicVisibility, true)
          )
        );

      // Aggregate the results by user
      const userMap = new Map<number, {
        userId: number;
        firstName: string;
        lastName: string;
        scores: number[];
        workouts: { name: string; score: number }[];
      }>();

      // Process each row and group by user
      rows.forEach((row: any) => {
        const userId = row.userId;
        const score = row.score || 0;
        
        if (!userMap.has(userId)) {
          userMap.set(userId, {
            userId: row.userId,
            firstName: row.firstName || '',
            lastName: row.lastName || '',
            scores: [],
            workouts: []
          });
        }

        const userData = userMap.get(userId)!;
        userData.scores.push(score);
        userData.workouts.push({
          name: row.workoutName || 'Unknown Workout',
          score: score
        });
      });

      // Transform into final result format
      const leaderboardEntries: DailyLeaderboardEntry[] = Array.from(userMap.values()).map(userData => {
        const totalScore = userData.scores.reduce((sum, score) => sum + score, 0);
        const bestWorkout = userData.workouts.reduce((best, current) => 
          current.score > best.score ? current : best, 
          { name: 'No workouts', score: 0 }
        );

        return {
          userId: userData.userId,
          firstName: userData.firstName,
          lastName: userData.lastName,
          totalScore,
          classCount: userData.scores.length,
          bestScore: bestWorkout.score,
          bestWorkoutName: bestWorkout.name
        };
      });

      // Sort by total score descending, then by class count descending, then alphabetically
      return leaderboardEntries.sort((a, b) => {
        if (b.totalScore !== a.totalScore) {
          return b.totalScore - a.totalScore;
        }
        if (b.classCount !== a.classCount) {
          return b.classCount - a.classCount;
        }
        return a.firstName.localeCompare(b.firstName);
      });

    } catch (error) {
      console.error('Error fetching daily leaderboard:', error);
      throw new Error('Failed to fetch daily leaderboard');
    }
  }
}