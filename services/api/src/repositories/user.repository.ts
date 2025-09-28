// src/repositories/user.repository.ts
import { db as globalDb } from '../db/client';
import { users, userroles, members, coaches, admins, managers } from '../db/schema';
import { eq, and, inArray, sql, asc } from 'drizzle-orm';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

/**
 * Types derived from Drizzle schema (modern API)
 */
export type UserRow = InferSelectModel<typeof users>;
export type UserInsert = InferInsertModel<typeof users>;
export type UserRoleRow = InferSelectModel<typeof userroles>;
export type MemberRow = InferSelectModel<typeof members>;
export type CoachRow = InferSelectModel<typeof coaches>;
export type AdminRow = InferSelectModel<typeof admins>;
export type ManagerRow = InferSelectModel<typeof managers>;

/**
 * Executor type: either the global db or a transaction object returned by db.transaction()
 * Keep typed as `any` to accept Drizzle transaction objects — adjust if you have a specific type alias.
 */
type Executor = typeof globalDb | any;

/**
 * UserRepository
 * Encapsulates all user-related DB access.
 */
export class UserRepository {
  /**
   * Helper to pick the executor (tx or global db)
   */
  private exec(tx?: Executor): Executor {
    return tx ?? globalDb;
  }

  // -------------------------
  // Basic user operations
  // -------------------------

  async findByEmail(email: string, tx?: Executor): Promise<UserRow | null> {
    const [u] = await this.exec(tx).select().from(users).where(eq(users.email, email)).limit(1);
    return u ?? null;
  }

  async findById(userId: number, tx?: Executor): Promise<UserRow | null> {
    const [u] = await this.exec(tx).select().from(users).where(eq(users.userId, userId)).limit(1);
    return u ?? null;
  }

  async createUser(payload: UserInsert, tx?: Executor): Promise<UserRow> {
    const [created] = await this.exec(tx).insert(users).values(payload).returning();
    return created;
  }

  async updateUser(
    userId: number,
    updates: Partial<UserInsert>,
    tx?: Executor,
  ): Promise<UserRow | null> {
    const [updated] = await this.exec(tx)
      .update(users)
      .set(updates)
      .where(eq(users.userId, userId))
      .returning();
    return updated ?? null;
  }

  async deleteUser(userId: number, tx?: Executor): Promise<void> {
    await this.exec(tx).delete(users).where(eq(users.userId, userId));
  }

  // -------------------------
  // Roles & role-specific rows
  // -------------------------

  /**
   * Get role strings for a user
   */
  async getRolesByUserId(userId: number, tx?: Executor): Promise<string[]> {
    const rows = await this.exec(tx)
      .select({ role: userroles.userRole })
      .from(userroles)
      .where(eq(userroles.userId, userId));
    return rows.map((r: any) => r.role);
  }

  /**
   * Assign multiple roles to a user.
   * Also inserts into specialized tables (members/coaches/admins/managers) if role not already present.
   * This method is idempotent.
   */
  async assignRoles(
    userId: number,
    roles: Array<'member' | 'coach' | 'admin' | 'manager'>,
    tx?: Executor,
  ): Promise<void> {
    const executor = this.exec(tx);

    // check existing roles quickly
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

  /**
   * Remove a role for a user. Also deletes from specialized table.
   */
  async removeRole(
    userId: number,
    role: 'member' | 'coach' | 'admin' | 'manager',
    tx?: Executor,
  ): Promise<void> {
    const executor = this.exec(tx);
    // delete specialized row first (to preserve DB integrity if constraints exist)
    switch (role) {
      case 'member':
        await executor.delete(members).where(eq(members.userId, userId));
        break;
      case 'coach':
        await executor.delete(coaches).where(eq(coaches.userId, userId));
        break;
      case 'admin':
        await executor.delete(admins).where(eq(admins.userId, userId));
        break;
      case 'manager':
        await executor.delete(managers).where(eq(managers.userId, userId));
        break;
    }
    // delete role mapping
    await executor
      .delete(userroles)
      .where(and(eq(userroles.userId, userId), eq(userroles.userRole, role)));
  }

  // -------------------------
  // Query helpers for admin views
  // -------------------------

  /**
   * Return all users joined with roles + optional role-specific fields
   * Produces a "flattened" row per role association (same user may appear multiple times with different roles)
   */
  async getAllUsersDetailed(tx?: Executor) {
    return this.exec(tx)
      .select({
        userId: users.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone,
        role: userroles.userRole,
        bio: coaches.bio,
        authorisation: admins.authorisation,
        status: members.status,
        creditsBalance: members.creditsBalance,
      })
      .from(users)
      .leftJoin(userroles, eq(users.userId, userroles.userId))
      .leftJoin(coaches, eq(users.userId, coaches.userId))
      .leftJoin(admins, eq(users.userId, admins.userId))
      .leftJoin(members, eq(users.userId, members.userId))
      .orderBy(asc(users.lastName), asc(users.firstName));
  }

  async getAllMembers(tx?: Executor) {
    return this.exec(tx)
      .select({
        userId: users.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone,
        status: members.status,
        credits: members.creditsBalance,
      })
      .from(users)
      .innerJoin(members, eq(users.userId, members.userId));
  }

  async getAllCoaches(tx?: Executor) {
    return this.exec(tx)
      .select({
        userId: users.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone,
        bio: coaches.bio,
      })
      .from(users)
      .innerJoin(coaches, eq(users.userId, coaches.userId));
  }

  async getAllAdmins(tx?: Executor) {
    return this.exec(tx)
      .select({
        userId: users.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone,
        role: userroles.userRole,
        authorisation: admins.authorisation,
      })
      .from(users)
      .innerJoin(admins, eq(users.userId, admins.userId))
      .innerJoin(userroles, eq(users.userId, userroles.userId));
  }

  // -------------------------
  // Convenience + utilities
  // -------------------------

  /**
   * Create a user and associated role rows in one call (transactional).
   * Returns the created user.
   */
  async createUserWithRoles(
    payload: UserInsert,
    rolesToAssign: Array<'member' | 'coach' | 'admin' | 'manager'> = [],
  ) {
    return globalDb.transaction(async (tx: Executor) => {
      const created = await this.createUser(payload, tx);
      if (rolesToAssign.length > 0) {
        await this.assignRoles(created.userId, rolesToAssign, tx);
      }
      return created;
    });
  }

  /**
   * Replace roles for a user (remove all existing roles and set new ones).
   * This is destructive – run in a transaction at service level if you need safety.
   */
  async replaceRoles(
    userId: number,
    newRoles: Array<'member' | 'coach' | 'admin' | 'manager'>,
    tx?: Executor,
  ): Promise<void> {
    const executor = this.exec(tx);

    // delete all specialized rows first
    await executor.delete(members).where(eq(members.userId, userId));
    await executor.delete(coaches).where(eq(coaches.userId, userId));
    await executor.delete(admins).where(eq(admins.userId, userId));
    await executor.delete(managers).where(eq(managers.userId, userId));

    // delete role mappings
    await executor.delete(userroles).where(eq(userroles.userId, userId));

    // assign new roles (also creates specialized rows)
    await this.assignRoles(userId, newRoles, executor);
  }

  /**
   * Find multiple users by IDs
   */
  async findByIds(userIds: number[], tx?: Executor) {
    if (userIds.length === 0) return [];
    return this.exec(tx).select().from(users).where(inArray(users.userId, userIds));
  }

  /**
   * Utility: check if a user has a role
   */
  async userHasRole(
    userId: number,
    role: 'member' | 'coach' | 'admin' | 'manager',
    tx?: Executor,
  ): Promise<boolean> {
    const rows = await this.exec(tx)
      .select()
      .from(userroles)
      .where(and(eq(userroles.userId, userId), eq(userroles.userRole, role)))
      .limit(1);
    return rows.length > 0;
  }

  /**
   * Get membership status for a user (if any).
   * Returns status string (e.g. 'pending', 'approved') or null if no member row.
   */
  async getMemberStatus(userId: number, tx?: Executor): Promise<string | null> {
    const [row] = await this.exec(tx)
      .select({ status: members.status })
      .from(members)
      .where(eq(members.userId, userId))
      .limit(1);

    return row ? row.status : null;
  }

  // Returns { publicVisibility: boolean } or null if not found
  async getMemberSettings(
    userId: number,
    tx?: Executor,
  ): Promise<{ publicVisibility: boolean } | null> {
    const [row] = await this.exec(tx)
      .select({ publicVisibility: members.publicVisibility })
      .from(members)
      .where(eq(members.userId, userId))
      .limit(1);

    return row ?? null;
  }

  async updateMemberVisibility(
    userId: number,
    publicVisibility: boolean,
    tx?: Executor,
  ): Promise<{ userId: number } | null> {
    const [updated] = await this.exec(tx)
      .update(members)
      .set({ publicVisibility })
      .where(eq(members.userId, userId))
      .returning({ userId: members.userId });

    return updated ?? null;
  }
}

export default UserRepository;
