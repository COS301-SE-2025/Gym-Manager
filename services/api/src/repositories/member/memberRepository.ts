import { db } from '../../db/client';
import { members, users, classattendance, classes, workouts, coaches } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';

export class MemberRepository {
  /**
   * Get member's current credit balance
   */
  async getCreditsBalance(userId: number): Promise<number> {
    //console.log('Repository: Getting credits balance for user ID:', userId);
    
    const result = await db
      .select({ creditsBalance: members.creditsBalance })
      .from(members)
      .where(eq(members.userId, userId))
      .limit(1);

    //console.log('Repository: Query result:', result);

    if (result.length === 0) {
      //console.log('Repository: No member found for user ID:', userId);
      throw new Error('Member not found');
    }

    //console.log('Repository: Found member with credits:', result[0].creditsBalance);
    return result[0].creditsBalance;
  }

  /**
   * Check if user is a member
   */
  async memberExists(userId: number): Promise<boolean> {
    const result = await db
      .select({ userId: members.userId })
      .from(members)
      .where(eq(members.userId, userId))
      .limit(1);

    return result.length > 0;
  }

  /**
   * Add credits to member's account
   */
  async addCredits(userId: number, credits: number, tx?: any): Promise<number> {
    const dbInstance = tx || db;
    
    // Get current balance
    const currentResult = await dbInstance
      .select({ creditsBalance: members.creditsBalance })
      .from(members)
      .where(eq(members.userId, userId))
      .limit(1);

    if (currentResult.length === 0) {
      throw new Error('Member not found');
    }

    const currentBalance = currentResult[0].creditsBalance;
    const newBalance = currentBalance + credits;

    // Update the balance
    await dbInstance
      .update(members)
      .set({ creditsBalance: newBalance })
      .where(eq(members.userId, userId));

    return newBalance;
  }

  /**
   * Deduct credits from member's account
   */
  async deductCredits(userId: number, credits: number, tx?: any): Promise<number> {
    const dbInstance = tx || db;
    
    // Get current balance
    const currentResult = await dbInstance
      .select({ creditsBalance: members.creditsBalance })
      .from(members)
      .where(eq(members.userId, userId))
      .limit(1);

    if (currentResult.length === 0) {
      throw new Error('Member not found');
    }

    const currentBalance = currentResult[0].creditsBalance;
    
    if (currentBalance < credits) {
      throw new Error('Insufficient credits');
    }

    const newBalance = currentBalance - credits;

    // Update the balance
    await dbInstance
      .update(members)
      .set({ creditsBalance: newBalance })
      .where(eq(members.userId, userId));

    return newBalance;
  }

  /**
   * Get member profile information
   */
  async getMemberProfile(userId: number) {
    const result = await db
      .select({
        userId: users.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        creditsBalance: members.creditsBalance,
        status: members.status,
        publicVisibility: members.publicVisibility,
      })
      .from(members)
      .innerJoin(users, eq(members.userId, users.userId))
      .where(eq(members.userId, userId))
      .limit(1);

    if (result.length === 0) {
      throw new Error('Member not found');
    }

    return result[0];
  }

  /**
   * Get member's attended classes with full details
   */
  async getAttendedClasses(userId: number) {
    const result = await db
      .select({
        classId: classes.classId,
        workoutName: workouts.workoutName,
        scheduledDate: classes.scheduledDate,
        scheduledTime: classes.scheduledTime,
        durationMinutes: classes.durationMinutes,
        coachFirstName: users.firstName,
        coachLastName: users.lastName,
        attendedAt: classattendance.markedAt,
        score: classattendance.score,
        scaling: classattendance.scaling,
      })
      .from(classattendance)
      .innerJoin(classes, eq(classattendance.classId, classes.classId))
      .leftJoin(workouts, eq(classes.workoutId, workouts.workoutId))
      .leftJoin(coaches, eq(classes.coachId, coaches.userId))
      .leftJoin(users, eq(coaches.userId, users.userId))
      .where(eq(classattendance.memberId, userId))
      .orderBy(desc(classattendance.markedAt));

    return result;
  }
}
