import { db as globalDb } from '../../db/client';
import { notifications, notificationTargets } from '../../db/schema';
type Executor = typeof globalDb | any;
type NotificationRow = any;

export class NotificationRepository {
  private exec(tx?: Executor): Executor {
    return tx ?? globalDb;
  }

  async createNotification(
    payload: { title: string; message: string },
    tx?: Executor,
  ): Promise<NotificationRow> {
    const [row] = await this.exec(tx)
      .insert(notifications)
      .values(payload)
      .returning();
    return row;
  }

  async addTarget(
    notificationId: number,
    targetRole: 'member' | 'coach' | 'admin' | 'manager',
    tx?: Executor,
  ): Promise<void> {
    await this.exec(tx)
      .insert(notificationTargets)
      .values({ notificationId, targetRole });
  }

  async createNotificationWithTarget(
    payload: { title: string; message: string },
    targetRole: 'member' | 'coach' | 'admin' | 'manager',
  ): Promise<NotificationRow> {
    return globalDb.transaction(async (tx: Executor) => {
      const created = await this.createNotification(payload, tx);
      await this.addTarget(Number(created.notificationId), targetRole, tx);
      return created;
    });
  }
}


