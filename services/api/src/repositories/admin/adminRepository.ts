import { db as globalDb } from '../../db/client';
import {
  classes,
  coaches,
  workouts,
  userroles,
  members,
  admins,
  managers,
  users,
} from '../../db/schema';
import { eq, and, asc, between } from 'drizzle-orm';
import { format, addWeeks } from 'date-fns';
import { parseISO as dateFnsParseISO } from 'date-fns';
import { IAdminRepository } from '../../domain/interfaces/class.interface';
import { Class, WeeklyScheduleInput } from '../../domain/entities/class.entity';

type Executor = typeof globalDb;

// Map day -> weekday offset from Monday
const dayToOffset: Record<
  'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday',
  number
> = {
  Monday: 0,
  Tuesday: 1,
  Wednesday: 2,
  Thursday: 3,
  Friday: 4,
  Saturday: 5,
  Sunday: 6,
};

/**
 * AdminRepository - Persistence Layer
 * Implements IAdminRepository interface and handles all database operations
 */
export class AdminRepository implements IAdminRepository {
  private exec(tx?: Executor) {
    return tx ?? globalDb;
  }

  /* ============== SCHEDULING / CLASSES ============== */

  async createWeeklySchedule(
    startDate: string,
    createdBy: number,
    weeklySchedule: any,
    tx?: Executor,
  ): Promise<any[]> {
    const baseDate = dateFnsParseISO(startDate);
    const inserted: (typeof classes.$inferSelect)[] = [];

    for (const dayBlock of weeklySchedule || []) {
      const offset = dayToOffset[dayBlock.day as keyof typeof dayToOffset];
      if (offset === undefined) continue;

      const scheduledDate = addDays(baseDate, offset);

      for (const cls of dayBlock.classes || []) {
        const payload = {
          scheduledDate: format(scheduledDate, 'yyyy-MM-dd'),
          scheduledTime: cls.time,
          durationMinutes: cls.durationMinutes,
          capacity: cls.capacity,
          coachId: cls.coachId ?? null,
          workoutId: cls.workoutId ?? null,
          createdBy,
        };
        const [row] = await this.exec(tx).insert(classes).values(payload).returning();
        inserted.push(row);
      }
    }

    return inserted;
  }

  async getWeeklySchedule(tx?: Executor): Promise<any> {
    const today = new Date();

    // Show classes for the next 4 weeks instead of just current week
    const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const weekEnd = format(addWeeks(endOfWeek(today, { weekStartsOn: 1 }), 3), 'yyyy-MM-dd');

    const rows = await this.exec(tx)
      .select({
        classId: classes.classId,
        scheduledDate: classes.scheduledDate,
        scheduledTime: classes.scheduledTime,
        durationMinutes: classes.durationMinutes,
        capacity: classes.capacity,
        workoutName: workouts.workoutName,
        coachName: users.firstName,
      })
      .from(classes)
      .leftJoin(workouts, eq(classes.workoutId, workouts.workoutId))
      .leftJoin(coaches, eq(classes.coachId, coaches.userId))
      .leftJoin(users, eq(coaches.userId, users.userId))
      .where(between(classes.scheduledDate, weekStart, weekEnd))
      .orderBy(asc(classes.scheduledDate), asc(classes.scheduledTime));

    // Fix implicit-any by deriving element type
    type Row = (typeof rows)[number];

    const grouped = rows.reduce<Record<string, Row[]>>((acc, cls) => {
      const day = cls.scheduledDate;
      if (!acc[day]) acc[day] = [];
      acc[day].push(cls);
      return acc;
    }, {});

    return grouped;
  }

  async createClass(
    payload: {
      capacity: number;
      scheduledDate: string;
      scheduledTime: string;
      durationMinutes: number;
      coachId?: number | null;
      workoutId?: number | null;
      createdBy: number;
    },
    tx?: Executor,
  ): Promise<Class> {
    const [created] = await this.exec(tx).insert(classes).values(payload).returning();
    return this.mapToClass(created);
  }

  async assignCoachToClass(
    classId: number,
    coachId: number,
    tx?: Executor,
  ): Promise<{ ok: boolean; reason?: string }> {
    const [coach] = await this.exec(tx).select().from(coaches).where(eq(coaches.userId, coachId));
    if (!coach) return { ok: false, reason: 'invalid_coach' };

    await this.exec(tx).update(classes).set({ coachId }).where(eq(classes.classId, classId));
    return { ok: true };
  }

  async updateClass(
    classId: number,
    updates: {
      capacity?: number;
      scheduledDate?: string;
      scheduledTime?: string;
      durationMinutes?: number;
      coachId?: number | null;
    },
    tx?: Executor,
  ): Promise<Class> {
    const [updated] = await this.exec(tx)
      .update(classes)
      .set(updates)
      .where(eq(classes.classId, classId))
      .returning();

    if (!updated) {
      throw new Error('Class not found');
    }

    return this.mapToClass(updated);
  }

  async deleteClass(classId: number, tx?: Executor): Promise<boolean> {
    const result = await this.exec(tx)
      .delete(classes)
      .where(eq(classes.classId, classId))
      .returning({ classId: classes.classId });

    return result.length > 0;
  }

  /* ============== ROLES & USERS ============== */

  async assignUserToRole(
    userId: number,
    role: 'coach' | 'member' | 'admin' | 'manager',
    tx?: Executor,
  ): Promise<{ ok: boolean; reason?: string }> {
    const roleExists = await this.exec(tx)
      .select()
      .from(userroles)
      .where(and(eq(userroles.userId, userId), eq(userroles.userRole, role)));

    if (roleExists.length > 0) return { ok: false, reason: 'already_has_role' };

    await this.exec(tx).insert(userroles).values({ userId, userRole: role });

    switch (role) {
      case 'coach':
        await this.exec(tx).insert(coaches).values({ userId });
        break;
      case 'member':
        await this.exec(tx).insert(members).values({ userId });
        break;
      case 'admin':
        await this.exec(tx).insert(admins).values({ userId });
        break;
      case 'manager':
        await this.exec(tx).insert(managers).values({ userId });
        break;
    }

    return { ok: true };
  }

  async getAllMembers(tx?: Executor): Promise<any[]> {
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

  async getAllCoaches(tx?: Executor): Promise<any[]> {
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
      .innerJoin(coaches, eq(users.userId, coaches.userId))
      .orderBy(asc(users.userId));
  }

  async getAllAdmins(tx?: Executor): Promise<any[]> {
    return this.exec(tx)
      .select({
        userId: users.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone,
        // role: userroles.userRole,
        authorisation: admins.authorisation,
      })
      .from(users)
      .innerJoin(admins, eq(users.userId, admins.userId))
      .orderBy(asc(users.userId));
  }

  async getUsersByRole(
    role: 'coach' | 'member' | 'admin' | 'manager',
    tx?: Executor,
  ): Promise<any[]> {
    if (role === 'member') return this.getAllMembers(tx);
    if (role === 'coach') return this.getAllCoaches(tx);
    if (role === 'admin') return this.getAllAdmins(tx);
    if (role === 'manager') {
      return this.exec(tx)
        .select({
          userId: users.userId,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          phone: users.phone,
        })
        .from(users)
        .innerJoin(managers, eq(users.userId, managers.userId))
        .orderBy(asc(users.userId));
    }
    return [];
  }

  async getAllUsers(tx?: Executor): Promise<any[]> {
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

  async removeRole(
    userId: number,
    role: 'coach' | 'member' | 'admin' | 'manager',
    tx?: Executor,
  ): Promise<void> {
    switch (role) {
      case 'coach':
        await this.exec(tx).delete(coaches).where(eq(coaches.userId, userId));
        break;
      case 'member':
        await this.exec(tx).delete(members).where(eq(members.userId, userId));
        break;
      case 'admin':
        await this.exec(tx).delete(admins).where(eq(admins.userId, userId));
        break;
      case 'manager':
        await this.exec(tx).delete(managers).where(eq(managers.userId, userId));
        break;
    }

    await this.exec(tx)
      .delete(userroles)
      .where(and(eq(userroles.userId, userId), eq(userroles.userRole, role)));
  }

  async getRolesByUserId(userId: number, tx?: Executor): Promise<string[]> {
    const rows = await this.exec(tx)
      .select({ role: userroles.userRole })
      .from(userroles)
      .where(eq(userroles.userId, userId));
    return rows.map((r) => r.role);
  }

  async getUserById(userId: number, tx?: Executor): Promise<any> {
    const result = await this.exec(tx)
      .select({
        userId: users.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone,
        roles: userroles.userRole,
        bio: coaches.bio,
        status: members.status,
        creditsBalance: members.creditsBalance,
        authorisation: admins.authorisation,
      })
      .from(users)
      .leftJoin(userroles, eq(users.userId, userroles.userId))
      .leftJoin(coaches, eq(users.userId, coaches.userId))
      .leftJoin(members, eq(users.userId, members.userId))
      .leftJoin(admins, eq(users.userId, admins.userId))
      .where(eq(users.userId, userId));

    if (result.length === 0) return null;

    const base: any = {
      userId: result[0].userId,
      firstName: result[0].firstName,
      lastName: result[0].lastName,
      email: result[0].email,
      phone: result[0].phone,
      roles: result.map((r) => r.roles).filter(Boolean),
    };

    for (const row of result) {
      if (row.roles === 'coach') {
        Object.assign(base, { bio: row.bio });
      } else if (row.roles === 'member') {
        Object.assign(base, { status: row.status, creditsBalance: row.creditsBalance });
      } else if (row.roles === 'admin') {
        Object.assign(base, { authorisation: row.authorisation });
      }
    }

    return base;
  }

  async updateUserById(
    userId: number,
    updates: any,
    tx?: Executor,
  ): Promise<{ ok: boolean; reason?: string }> {
    const [userRoleRow] = await this.exec(tx)
      .select({ role: userroles.userRole })
      .from(userroles)
      .where(eq(userroles.userId, userId));

    if (!userRoleRow) return { ok: false, reason: 'role_not_found' };
    const role = userRoleRow.role;

    const userFields = {
      firstName: updates.firstName,
      lastName: updates.lastName,
      email: updates.email,
      phone: updates.phone,
    };
    const filteredUserFields = objectDefined(userFields);

    if (Object.keys(filteredUserFields).length > 0) {
      await this.exec(tx).update(users).set(filteredUserFields).where(eq(users.userId, userId));
    }

    if (role === 'coach') {
      const coachFields = objectDefined({ bio: updates.bio });
      if (Object.keys(coachFields).length > 0) {
        await this.exec(tx).update(coaches).set(coachFields).where(eq(coaches.userId, userId));
      }
    }

    if (role === 'admin') {
      const adminFields = objectDefined({ authorisation: updates.authorisation });
      if (Object.keys(adminFields).length > 0) {
        await this.exec(tx).update(admins).set(adminFields).where(eq(admins.userId, userId));
      }
    }

    if (role === 'member') {
      const memberFields = objectDefined({
        status: updates.status,
        creditsBalance: updates.creditsBalance,
      });
      if (Object.keys(memberFields).length > 0) {
        await this.exec(tx).update(members).set(memberFields).where(eq(members.userId, userId));
      }
    }

    return { ok: true };
  }

  // Utility methods
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
}

/* ------------ small helpers ------------- */

function objectDefined<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

function addDays(baseDate: Date, offset: number) {
  const result = new Date(baseDate);
  result.setDate(result.getDate() + offset);
  return result;
}

function startOfWeek(date: Date, options: { weekStartsOn: number }): Date {
  const day = date.getDay();
  const diff = (day < options.weekStartsOn ? 7 : 0) + day - options.weekStartsOn;
  const start = new Date(date);
  start.setDate(date.getDate() - diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function endOfWeek(date: Date, options: { weekStartsOn: number }): Date {
  const start = startOfWeek(date, options);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}
