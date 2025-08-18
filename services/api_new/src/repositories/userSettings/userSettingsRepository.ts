import { db as globalDb } from '../../db/client';
import {
  members,
  users,
} from '../../db/schema';
import { eq } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import { IUserSettingsRepository } from '../../domain/interfaces/userSettings.interface';
import { UserSettings } from '../../domain/entities/userSettings.entity';

/**
 * Types derived from Drizzle schema
 */
export type MemberRow = InferSelectModel<typeof members>;

/**
 * Executor type: either the global db or a transaction object
 */
type Executor = typeof globalDb | any;

/**
 * UserSettingsRepository - Persistence Layer
 * Implements IUserSettingsRepository interface and handles all database operations
 */
export class UserSettingsRepository implements IUserSettingsRepository {
  /**
   * Helper to pick the executor (tx or global db)
   */
  private exec(tx?: Executor): Executor {
    return tx ?? globalDb;
  }

  async getMemberSettings(userId: number): Promise<UserSettings | null> {
    const [row] = await this.exec()
      .select({
        userId: members.userId,
        status: members.status,
        creditsBalance: members.creditsBalance,
        publicVisibility: members.publicVisibility,
      })
      .from(members)
      .where(eq(members.userId, userId))
      .limit(1);

    return row ? this.mapToUserSettings(row) : null;
  }

  async updateMemberVisibility(userId: number, publicVisibility: boolean): Promise<{ userId: number } | null> {
    const [updated] = await this.exec()
      .update(members)
      .set({ publicVisibility })
      .where(eq(members.userId, userId))
      .returning({ userId: members.userId });

    return updated ? { userId: updated.userId } : null;
  }

  // Utility methods to map database rows to domain entities
  private mapToUserSettings(row: MemberRow): UserSettings {
    return {
      userId: row.userId,
      status: row.status,
      creditsBalance: row.creditsBalance,
      publicVisibility: row.publicVisibility,
    };
  }
}
