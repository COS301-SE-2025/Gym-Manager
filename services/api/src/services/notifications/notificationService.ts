import { User } from '../../domain/entities/user.entity';
import { NotificationRepository } from '../../repositories/notifications/notificationRepository';

export class NotificationService {
  private notificationRepository: NotificationRepository;

  constructor(notificationRepository?: NotificationRepository) {
    this.notificationRepository = notificationRepository || new NotificationRepository();
  }

  async createUserSignupNotification(user: User): Promise<void> {
    const title = 'New User Signup';
    const message = `${user.firstName} ${user.lastName} has registered and needs approval.`;

    await this.notificationRepository.createNotificationWithTarget({ title, message }, 'admin');
  }
}
