import { NotificationRepository } from '../../../repositories/notifications/notificationRepository';
import { builder } from '../../builder';
import { notifications, notificationTargets } from '../../../db/schema';

jest.mock('../../../db/client', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    transaction: jest.fn(),
  },
}));

describe('NotificationRepository', () => {
  let notificationRepository: NotificationRepository;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    const { db } = require('../../../db/client');
    mockDb = db;
    
    notificationRepository = new NotificationRepository();
  });

  describe('createNotification', () => {
    it('should create a notification with title and message', async () => {
      const payload = {
        title: 'Class Reminder',
        message: 'Your Morning HIIT class starts in 30 minutes!',
      };
      const mockNotification = {
        notificationId: 1,
        title: 'Class Reminder',
        message: 'Your Morning HIIT class starts in 30 minutes!',
        createdAt: new Date('2025-01-15T08:30:00Z'),
      };

      mockDb.insert.mockReturnValue(builder([mockNotification]));

      const result = await notificationRepository.createNotification(payload);

      expect(mockDb.insert).toHaveBeenCalledWith(notifications);
      expect(result).toEqual(mockNotification);
    });

    it('should create notification with different content', async () => {
      const payload = {
        title: 'Payment Due',
        message: 'Your membership payment is due tomorrow. Please update your payment method.',
      };
      const mockNotification = {
        notificationId: 2,
        title: 'Payment Due',
        message: 'Your membership payment is due tomorrow. Please update your payment method.',
        createdAt: new Date('2025-01-15T09:00:00Z'),
      };

      mockDb.insert.mockReturnValue(builder([mockNotification]));

      const result = await notificationRepository.createNotification(payload);

      expect(result.title).toBe('Payment Due');
      expect(result.message).toContain('membership payment');
    });

    it('should work with transaction executor', async () => {
      const payload = {
        title: 'Coach Update',
        message: 'Your class schedule has been updated by Jason Mayo',
      };
      const mockNotification = {
        notificationId: 3,
        title: 'Coach Update',
        message: 'Your class schedule has been updated by Jason Mayo',
        createdAt: new Date('2025-01-15T10:00:00Z'),
      };
      const mockTx = {
        insert: jest.fn().mockReturnValue(builder([mockNotification])),
      };

      const result = await notificationRepository.createNotification(payload, mockTx);

      expect(mockTx.insert).toHaveBeenCalledWith(notifications);
      expect(mockDb.insert).not.toHaveBeenCalled();
      expect(result).toEqual(mockNotification);
    });

    it('should handle empty message', async () => {
      const payload = {
        title: 'System Alert',
        message: '',
      };
      const mockNotification = {
        notificationId: 4,
        title: 'System Alert',
        message: '',
        createdAt: new Date('2025-01-15T11:00:00Z'),
      };

      mockDb.insert.mockReturnValue(builder([mockNotification]));

      const result = await notificationRepository.createNotification(payload);

      expect(result.message).toBe('');
    });

    it('should handle long notification content', async () => {
      const payload = {
        title: 'Important Gym Policy Update - Please Read',
        message: 'Dear valued members, we are updating our gym policies to better serve you. Please review the new guidelines regarding class bookings, cancellation policies, equipment usage, and facility hours. These changes will take effect from January 20, 2025. For any questions, please contact our support team.',
      };
      const mockNotification = {
        notificationId: 5,
        title: payload.title,
        message: payload.message,
        createdAt: new Date('2025-01-15T12:00:00Z'),
      };

      mockDb.insert.mockReturnValue(builder([mockNotification]));

      const result = await notificationRepository.createNotification(payload);

      expect(result.title).toHaveLength(41);
      expect(result.message.length).toBeGreaterThan(200);
    });

    it('should handle special characters in content', async () => {
      const payload = {
        title: 'Special Event! 🎉',
        message: 'Join us for a special workout session with coach Jared Hurlimam! Date: 2025-01-20 @ 6:00 PM. Cost: $25. Limited spots available - first come, first served! 💪',
      };
      const mockNotification = {
        notificationId: 6,
        title: payload.title,
        message: payload.message,
        createdAt: new Date('2025-01-15T13:00:00Z'),
      };

      mockDb.insert.mockReturnValue(builder([mockNotification]));

      const result = await notificationRepository.createNotification(payload);

      expect(result.title).toContain('🎉');
      expect(result.message).toContain('💪');
    });
  });

  describe('addTarget', () => {
    it('should add member target to notification', async () => {
      const notificationId = 1;
      const targetRole = 'member';

      mockDb.insert.mockReturnValue(builder());

      await notificationRepository.addTarget(notificationId, targetRole);

      expect(mockDb.insert).toHaveBeenCalledWith(notificationTargets);
    });

    it('should add coach target to notification', async () => {
      const notificationId = 2;
      const targetRole = 'coach';

      mockDb.insert.mockReturnValue(builder());

      await notificationRepository.addTarget(notificationId, targetRole);

      expect(mockDb.insert).toHaveBeenCalledWith(notificationTargets);
    });

    it('should add admin target to notification', async () => {
      const notificationId = 3;
      const targetRole = 'admin';

      mockDb.insert.mockReturnValue(builder());

      await notificationRepository.addTarget(notificationId, targetRole);

      expect(mockDb.insert).toHaveBeenCalledWith(notificationTargets);
    });

    it('should add manager target to notification', async () => {
      const notificationId = 4;
      const targetRole = 'manager';

      mockDb.insert.mockReturnValue(builder());

      await notificationRepository.addTarget(notificationId, targetRole);

      expect(mockDb.insert).toHaveBeenCalledWith(notificationTargets);
    });

    it('should work with transaction executor', async () => {
      const notificationId = 5;
      const targetRole = 'member';
      const mockTx = {
        insert: jest.fn().mockReturnValue(builder()),
      };

      await notificationRepository.addTarget(notificationId, targetRole, mockTx);

      expect(mockTx.insert).toHaveBeenCalledWith(notificationTargets);
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('should handle large notification IDs', async () => {
      const notificationId = 999999;
      const targetRole = 'coach';

      mockDb.insert.mockReturnValue(builder());

      await notificationRepository.addTarget(notificationId, targetRole);

      expect(mockDb.insert).toHaveBeenCalledWith(notificationTargets);
    });
  });

  describe('createNotificationWithTarget', () => {
    it('should create notification and add member target', async () => {
      const payload = {
        title: 'Class Cancelled',
        message: 'Unfortunately, the Evening Yoga class on 2025-01-16 has been cancelled due to instructor illness. We apologize for the inconvenience.',
      };
      const targetRole = 'member';
      const mockNotification = {
        notificationId: 1,
        title: payload.title,
        message: payload.message,
        createdAt: new Date('2025-01-15T14:00:00Z'),
      };

      const mockTransaction = {
        insert: jest.fn()
          .mockReturnValueOnce(builder([mockNotification])) // createNotification
          .mockReturnValueOnce(builder()),                   // addTarget
      };
      mockDb.transaction.mockImplementation((callback: any) => callback(mockTransaction));

      const result = await notificationRepository.createNotificationWithTarget(payload, targetRole);

      expect(mockDb.transaction).toHaveBeenCalled();
      expect(mockTransaction.insert).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockNotification);
    });

    it('should create notification and add coach target', async () => {
      const payload = {
        title: 'Schedule Update',
        message: 'Your class schedule for next week has been updated. Please check the coach portal for details.',
      };
      const targetRole = 'coach';
      const mockNotification = {
        notificationId: 2,
        title: payload.title,
        message: payload.message,
        createdAt: new Date('2025-01-15T15:00:00Z'),
      };

      const mockTransaction = {
        insert: jest.fn()
          .mockReturnValueOnce(builder([mockNotification]))
          .mockReturnValueOnce(builder()),
      };
      mockDb.transaction.mockImplementation((callback: any) => callback(mockTransaction));

      const result = await notificationRepository.createNotificationWithTarget(payload, targetRole);

      expect(result.title).toBe('Schedule Update');
    });

    it('should create notification and add admin target', async () => {
      const payload = {
        title: 'System Maintenance',
        message: 'Scheduled system maintenance will occur tonight from 11 PM to 2 AM. The system may be temporarily unavailable.',
      };
      const targetRole = 'admin';
      const mockNotification = {
        notificationId: 3,
        title: payload.title,
        message: payload.message,
        createdAt: new Date('2025-01-15T16:00:00Z'),
      };

      const mockTransaction = {
        insert: jest.fn()
          .mockReturnValueOnce(builder([mockNotification]))
          .mockReturnValueOnce(builder()),
      };
      mockDb.transaction.mockImplementation((callback: any) => callback(mockTransaction));

      const result = await notificationRepository.createNotificationWithTarget(payload, targetRole);

      expect(result.title).toBe('System Maintenance');
    });

    it('should create notification and add manager target', async () => {
      const payload = {
        title: 'Monthly Report',
        message: 'The monthly performance report for December 2024 is now available. Revenue increased by 15% compared to last year.',
      };
      const targetRole = 'manager';
      const mockNotification = {
        notificationId: 4,
        title: payload.title,
        message: payload.message,
        createdAt: new Date('2025-01-15T17:00:00Z'),
      };

      const mockTransaction = {
        insert: jest.fn()
          .mockReturnValueOnce(builder([mockNotification]))
          .mockReturnValueOnce(builder()),
      };
      mockDb.transaction.mockImplementation((callback: any) => callback(mockTransaction));

      const result = await notificationRepository.createNotificationWithTarget(payload, targetRole);

      expect(result.message).toContain('Revenue increased');
    });

    it('should handle emergency notifications', async () => {
      const payload = {
        title: 'URGENT: Facility Closure',
        message: 'Due to a water main break, the facility will be closed today. All classes are cancelled. We will update members as soon as we have more information.',
      };
      const targetRole = 'member';
      const mockNotification = {
        notificationId: 5,
        title: payload.title,
        message: payload.message,
        createdAt: new Date('2025-01-15T18:00:00Z'),
      };

      const mockTransaction = {
        insert: jest.fn()
          .mockReturnValueOnce(builder([mockNotification]))
          .mockReturnValueOnce(builder()),
      };
      mockDb.transaction.mockImplementation((callback: any) => callback(mockTransaction));

      const result = await notificationRepository.createNotificationWithTarget(payload, targetRole);

      expect(result.title).toContain('URGENT');
    });

    it('should handle promotional notifications', async () => {
      const payload = {
        title: 'New Year Special Offer! 🎊',
        message: 'Start 2025 strong! Get 20% off all personal training sessions booked before January 31st. Contact Vansh Sood or Dennis Woodly to schedule.',
      };
      const targetRole = 'member';
      const mockNotification = {
        notificationId: 6,
        title: payload.title,
        message: payload.message,
        createdAt: new Date('2025-01-15T19:00:00Z'),
      };

      const mockTransaction = {
        insert: jest.fn()
          .mockReturnValueOnce(builder([mockNotification]))
          .mockReturnValueOnce(builder()),
      };
      mockDb.transaction.mockImplementation((callback: any) => callback(mockTransaction));

      const result = await notificationRepository.createNotificationWithTarget(payload, targetRole);

      expect(result.message).toContain('Vansh Sood');
      expect(result.message).toContain('Dennis Woodly');
    });

    it('should handle achievement notifications', async () => {
      const payload = {
        title: 'Congratulations! 🏆',
        message: 'Amazing work this month! You completed 15 classes and earned 150 points. Keep up the excellent progress, Amadeus!',
      };
      const targetRole = 'member';
      const mockNotification = {
        notificationId: 7,
        title: payload.title,
        message: payload.message,
        createdAt: new Date('2025-01-15T20:00:00Z'),
      };

      const mockTransaction = {
        insert: jest.fn()
          .mockReturnValueOnce(builder([mockNotification]))
          .mockReturnValueOnce(builder()),
      };
      mockDb.transaction.mockImplementation((callback: any) => callback(mockTransaction));

      const result = await notificationRepository.createNotificationWithTarget(payload, targetRole);

      expect(result.message).toContain('Amadeus');
      expect(result.title).toContain('🏆');
    });
  });

  describe('edge cases and error scenarios', () => {
    it('should handle database errors in createNotification', async () => {
      const payload = {
        title: 'Test Notification',
        message: 'Test message',
      };

      mockDb.insert.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(notificationRepository.createNotification(payload)).rejects.toThrow('Database connection failed');
    });

    it('should handle database errors in addTarget', async () => {
      const notificationId = 1;
      const targetRole = 'member';

      mockDb.insert.mockImplementation(() => {
        throw new Error('Insert failed');
      });

      await expect(notificationRepository.addTarget(notificationId, targetRole)).rejects.toThrow('Insert failed');
    });

    it('should handle transaction failures in createNotificationWithTarget', async () => {
      const payload = {
        title: 'Failed Notification',
        message: 'This should fail',
      };
      const targetRole = 'member';

      mockDb.transaction.mockImplementation(() => {
        throw new Error('Transaction failed');
      });

      await expect(notificationRepository.createNotificationWithTarget(payload, targetRole)).rejects.toThrow('Transaction failed');
    });

    it('should handle failure during target creation in transaction', async () => {
      const payload = {
        title: 'Partial Success',
        message: 'Notification created but target fails',
      };
      const targetRole = 'coach';
      const mockNotification = {
        notificationId: 8,
        title: payload.title,
        message: payload.message,
        createdAt: new Date('2025-01-15T21:00:00Z'),
      };

      const mockTransaction = {
        insert: jest.fn()
          .mockReturnValueOnce(builder([mockNotification]))
          .mockImplementationOnce(() => {
            throw new Error('Target creation failed');
          }),
      };
      mockDb.transaction.mockImplementation((callback: any) => callback(mockTransaction));

      await expect(notificationRepository.createNotificationWithTarget(payload, targetRole)).rejects.toThrow('Target creation failed');
    });

    it('should handle zero notification ID in addTarget', async () => {
      const notificationId = 0;
      const targetRole = 'admin';

      mockDb.insert.mockReturnValue(builder());

      await notificationRepository.addTarget(notificationId, targetRole);

      expect(mockDb.insert).toHaveBeenCalledWith(notificationTargets);
    });

    it('should handle negative notification ID in addTarget', async () => {
      const notificationId = -1;
      const targetRole = 'manager';

      mockDb.insert.mockReturnValue(builder());

      await notificationRepository.addTarget(notificationId, targetRole);

      expect(mockDb.insert).toHaveBeenCalledWith(notificationTargets);
    });

    it('should handle empty title in notification', async () => {
      const payload = {
        title: '',
        message: 'Message without title',
      };
      const mockNotification = {
        notificationId: 9,
        title: '',
        message: 'Message without title',
        createdAt: new Date('2025-01-15T22:00:00Z'),
      };

      mockDb.insert.mockReturnValue(builder([mockNotification]));

      const result = await notificationRepository.createNotification(payload);

      expect(result.title).toBe('');
      expect(result.message).toBe('Message without title');
    });

    it('should handle unicode characters in notifications', async () => {
      const payload = {
        title: 'Multilingual Notice 中文 العربية',
        message: 'Welcome to our diverse community! 欢迎 مرحبا Hello Bonjour Hola',
      };
      const mockNotification = {
        notificationId: 10,
        title: payload.title,
        message: payload.message,
        createdAt: new Date('2025-01-15T23:00:00Z'),
      };

      mockDb.insert.mockReturnValue(builder([mockNotification]));

      const result = await notificationRepository.createNotification(payload);

      expect(result.title).toContain('中文');
      expect(result.message).toContain('مرحبا');
    });

    it('should handle very large notification IDs', async () => {
      const notificationId = Number.MAX_SAFE_INTEGER;
      const targetRole = 'member';

      mockDb.insert.mockReturnValue(builder());

      await notificationRepository.addTarget(notificationId, targetRole);

      expect(mockDb.insert).toHaveBeenCalledWith(notificationTargets);
    });

    it('should handle notification creation with missing fields', async () => {
      const payload = {} as any;

      mockDb.insert.mockReturnValue(builder([{ notificationId: 11 }]));

      const result = await notificationRepository.createNotification(payload);

      expect(result.notificationId).toBe(11);
    });
  });
});
