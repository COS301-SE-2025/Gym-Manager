import { NotificationService } from '../../../services/notifications/notificationService';

describe('NotificationService', () => {
  let service: NotificationService;
  let mockRepository: any;

  beforeEach(() => {
    mockRepository = {
      createNotificationWithTarget: jest.fn(),
    };
    service = new NotificationService(mockRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createUserSignupNotification', () => {
    it('should create admin-targeted notification with correct title and message', async () => {
      const user = {
        userId: 123,
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
      };

      mockRepository.createNotificationWithTarget.mockResolvedValue({ notificationId: 1 });

      await service.createUserSignupNotification(user);

      expect(mockRepository.createNotificationWithTarget).toHaveBeenCalledTimes(1);
      const [payload, role] = mockRepository.createNotificationWithTarget.mock.calls[0];
      expect(payload).toEqual({
        title: 'New User Signup',
        message: 'Jane Doe has registered and needs approval.',
      });
      expect(role).toBe('admin');
    });

    it('should handle user with only first name', async () => {
      const user = {
        userId: 124,
        firstName: 'John',
        lastName: '',
        email: 'john@example.com',
      };

      mockRepository.createNotificationWithTarget.mockResolvedValue({ notificationId: 2 });

      await service.createUserSignupNotification(user);

      const [payload] = mockRepository.createNotificationWithTarget.mock.calls[0];
      expect(payload.message).toBe('John  has registered and needs approval.');
    });

    it('should handle user with only last name', async () => {
      const user = {
        userId: 125,
        firstName: '',
        lastName: 'Smith',
        email: 'smith@example.com',
      };

      mockRepository.createNotificationWithTarget.mockResolvedValue({ notificationId: 3 });

      await service.createUserSignupNotification(user);

      const [payload] = mockRepository.createNotificationWithTarget.mock.calls[0];
      expect(payload.message).toBe(' Smith has registered and needs approval.');
    });

    it('should handle user with no names', async () => {
      const user = {
        userId: 126,
        firstName: '',
        lastName: '',
        email: 'noname@example.com',
      };

      mockRepository.createNotificationWithTarget.mockResolvedValue({ notificationId: 4 });

      await service.createUserSignupNotification(user);

      const [payload] = mockRepository.createNotificationWithTarget.mock.calls[0];
      expect(payload.message).toBe('  has registered and needs approval.');
    });

    it('should propagate repository errors', async () => {
      const user = {
        userId: 127,
        firstName: 'Error',
        lastName: 'User',
        email: 'error@example.com',
      };

      const error = new Error('Database connection failed');
      mockRepository.createNotificationWithTarget.mockRejectedValue(error);

      await expect(
        service.createUserSignupNotification(user)
      ).rejects.toThrow('Database connection failed');
    });
  });
});


