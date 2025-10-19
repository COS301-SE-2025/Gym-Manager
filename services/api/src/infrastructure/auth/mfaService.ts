import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { IMfaService } from '../../domain/interfaces/auth.interface';

export class MfaService implements IMfaService {
  generateSecret(userEmail: string, serviceName: string = 'Gym Manager'): string {
    return speakeasy.generateSecret({
      name: userEmail,
      issuer: serviceName,
      length: 32,
    }).base32;
  }

  generateQRCode(secret: string, userEmail: string, serviceName: string = 'Gym Manager'): Promise<string> {
    const otpauthUrl = speakeasy.otpauthURL({
      secret,
      label: userEmail,
      issuer: serviceName,
    });
    
    return QRCode.toDataURL(otpauthUrl);
  }

  verifyToken(token: string, secret: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2, // Allow for clock drift
    });
  }

  generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric codes
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  verifyBackupCode(code: string, backupCodes: string[]): boolean {
    const index = backupCodes.indexOf(code);
    if (index === -1) return false;
    
    // Remove the used backup code
    backupCodes.splice(index, 1);
    return true;
  }
}

