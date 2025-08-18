import bcrypt from 'bcrypt';
import { IPasswordService } from '../../domain/interfaces/auth.interface';

const SALT_ROUNDS = 10;

export class PasswordService implements IPasswordService {
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }
}
