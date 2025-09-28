import { db as globalDb } from '../../db/client';
import { users, userroles, members, coaches, admins, managers } from '../../db/schema';
import { eq, and, inArray, sql, asc } from 'drizzle-orm';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { IUserRepository } from '../../domain/interfaces/auth.interface';
import { User } from '../../domain/entities/user.entity';

/**
 * Types derived from Drizzle schema
 */
export type UserRow = InferSelectModel<typeof users>;
export type UserInsert = InferInsertModel<typeof users>;
export type UserRoleRow = InferSelectModel<typeof userroles>;
export type MemberRow = InferSelectModel<typeof members>;
export type CoachRow = InferSelectModel<typeof coaches>;
export type AdminRow = InferSelectModel<typeof admins>;
export type ManagerRow = InferSelectModel<typeof managers>;

/**
 * Executor type: either the global db or a transaction object
 */
type Executor = typeof globalDb | any;

/**
 * UserRepository - Persistence Layer
 * Implements IUserRepository interface and handles all database operations
 */
export class UserRepository implements IUserRepository {
  /**
   * Helper to pick the executor (tx or global db)
   */
  private exec(tx?: Executor): Executor {
    return tx ?? globalDb;
  }

  // Basic user operations
  async findByEmail(email: string, tx?: Executor): Promise<User | null> {
    const [u] = await this.exec(tx).select().from(users).where(eq(users.email, email)).limit(1);
    return u ? this.mapToUser(u) : null;
  }

  async findById(userId: number, tx?: Executor): Promise<User | null> {
    const [u] = await this.exec(tx).select().from(users).where(eq(users.userId, userId)).limit(1);
    return u ? this.mapToUser(u) : null;
  }

  async createUser(userData: Omit<User, 'userId'>, tx?: Executor): Promise<User> {
    const [created] = await this.exec(tx).insert(users).values(userData).returning();
    return this.mapToUser(created);
  }

  async createUserWithRoles(userData: Omit<User, 'userId'>, roles: string[]): Promise<User> {
    return globalDb.transaction(async (tx: Executor) => {
      const created = await this.createUser(userData, tx);
      if (roles.length > 0) {
        await this.assignRoles(
          created.userId,
          roles as Array<'member' | 'coach' | 'admin' | 'manager'>,
          tx,
        );
      }
      return created;
    });
  }

  async getRolesByUserId(userId: number, tx?: Executor): Promise<string[]> {
    const rows = await this.exec(tx)
      .select({ role: userroles.userRole })
      .from(userroles)
      .where(eq(userroles.userId, userId));
    return rows.map((r: any) => r.role);
  }

  async getMemberStatus(userId: number, tx?: Executor): Promise<string | null> {
    const [row] = await this.exec(tx)
      .select({ status: members.status })
      .from(members)
      .where(eq(members.userId, userId))
      .limit(1);

    return row ? row.status : null;
  }

  // Additional repository methods (not in interface but needed for business logic)
  async updateUser(
    userId: number,
    updates: Partial<UserInsert>,
    tx?: Executor,
  ): Promise<User | null> {
    const [updated] = await this.exec(tx)
      .update(users)
      .set(updates)
      .where(eq(users.userId, userId))
      .returning();
    return updated ? this.mapToUser(updated) : null;
  }

  async deleteUser(userId: number, tx?: Executor): Promise<void> {
    await this.exec(tx).delete(users).where(eq(users.userId, userId));
  }

  async assignRoles(
    userId: number,
    roles: Array<'member' | 'coach' | 'admin' | 'manager'>,
    tx?: Executor,
  ): Promise<void> {
    const executor = this.exec(tx);

    // Check existing roles
    const existing = await executor.select().from(userroles).where(eq(userroles.userId, userId));
    const existingSet = new Set(existing.map((r: any) => r.userRole));

    const toInsert = roles.filter((r) => !existingSet.has(r)).map((r) => ({ userId, userRole: r }));
    if (toInsert.length > 0) {
      await executor.insert(userroles).values(toInsert);
    }

    // Ensure specialized rows exist for each role
    for (const role of roles) {
      if (role === 'member') {
        const [m] = await executor
          .select()
          .from(members)
          .where(eq(members.userId, userId))
          .limit(1);
        if (!m) {
          await executor.insert(members).values({ userId, status: 'pending', creditsBalance: 0 });
        }
      } else if (role === 'coach') {
        const [c] = await executor
          .select()
          .from(coaches)
          .where(eq(coaches.userId, userId))
          .limit(1);
        if (!c) {
          await executor.insert(coaches).values({ userId, bio: '' });
        }
      } else if (role === 'admin') {
        const [a] = await executor.select().from(admins).where(eq(admins.userId, userId)).limit(1);
        if (!a) {
          await executor.insert(admins).values({ userId, authorisation: null });
        }
      } else if (role === 'manager') {
        const [m] = await executor
          .select()
          .from(managers)
          .where(eq(managers.userId, userId))
          .limit(1);
        if (!m) {
          await executor.insert(managers).values({ userId, permissions: null });
        }
      }
    }
  }

  // Utility method to map database row to domain entity
  private mapToUser(row: UserRow): User {
    return {
      userId: row.userId,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      phone: row.phone || undefined,
      passwordHash: row.passwordHash || undefined,
    };
  }
}
