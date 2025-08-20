import { AuthService } from '../../services/auth/authService';

describe('AuthService.register', () => {
  it('calls notificationService after user creation', async () => {
    const mockUserRepository = {
      findByEmail: jest.fn().mockResolvedValue(null),
      createUserWithRoles: jest.fn().mockResolvedValue({
        userId: 42,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      }),
      getRolesByUserId: jest.fn().mockResolvedValue(['member']),
    } as any;

    const mockJwtService = { generateToken: jest.fn().mockReturnValue('token') } as any;
    const mockPasswordService = { hashPassword: jest.fn().mockResolvedValue('hash') } as any;
    const mockNotificationService = { createUserSignupNotification: jest.fn().mockResolvedValue(undefined) } as any;

    const service = new AuthService(
      mockUserRepository,
      mockJwtService,
      mockPasswordService,
      mockNotificationService,
    );

    const result = await service.register({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'secret',
      roles: ['member'],
    });

    expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('john@example.com');
    expect(mockPasswordService.hashPassword).toHaveBeenCalledWith('secret');
    expect(mockUserRepository.createUserWithRoles).toHaveBeenCalled();
    expect(mockNotificationService.createUserSignupNotification).toHaveBeenCalledWith({
      userId: 42,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    });
    expect(result).toEqual({ token: 'token' });
  });
});


