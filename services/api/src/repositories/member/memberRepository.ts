import { db } from '../../db/client';
import { members, users } from '../../db/schema';
import { eq } from 'drizzle-orm';

export class MemberRepository {
  /**
   * Get member's current credit balance
   */
  async getCreditsBalance(userId: number): Promise<number> {
    console.log('Repository: Getting credits balance for user ID:', userId);
    
    const result = await db
      .select({ creditsBalance: members.creditsBalance })
      .from(members)
      .where(eq(members.userId, userId))
      .limit(1);

    console.log('Repository: Query result:', result);

    if (result.length === 0) {
      console.log('Repository: No member found for user ID:', userId);
      throw new Error('Member not found');
    }

    console.log('Repository: Found member with credits:', result[0].creditsBalance);
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
  async addCredits(userId: number, credits: number): Promise<number> {
    // Get current balance
    const currentResult = await db
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
    await db
      .update(members)
      .set({ creditsBalance: newBalance })
      .where(eq(members.userId, userId));

    return newBalance;
  }

  /**
   * Deduct credits from member's account
   */
  async deductCredits(userId: number, credits: number): Promise<number> {
    // Get current balance
    const currentResult = await db
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
    await db
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
}
