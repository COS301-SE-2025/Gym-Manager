import { NotificationService } from '../../services/notifications/notificationService';

describe('NotificationService', () => {
  it('createUserSignupNotification creates admin-targeted notification with expected title/message', async () => {
    const createNotificationWithTarget = jest.fn().mockResolvedValue({ notificationId: 1 });
    const mockRepo = { createNotificationWithTarget } as any;

    const service = new NotificationService(mockRepo);
    await service.createUserSignupNotification({
      userId: 123,
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
    } as any);

    expect(createNotificationWithTarget).toHaveBeenCalledTimes(1);
    const [payload, role] = createNotificationWithTarget.mock.calls[0];
    expect(payload).toEqual({
      title: 'New User Signup',
      message: 'Jane Doe has registered and needs approval.',
    });
    expect(role).toBe('admin');
  });
});


