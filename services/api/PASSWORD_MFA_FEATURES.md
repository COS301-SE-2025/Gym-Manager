# Password Change and MFA Features

This document describes the implementation of password changing functionality and Multi-Factor Authentication (MFA) for the Gym Manager application.

## Features Implemented

### 1. Password Change Feature
- **Endpoint**: `POST /change-password`
- **Authentication**: Required
- **Description**: Allows authenticated users to change their password
- **Request Body**:
  ```json
  {
    "currentPassword": "string",
    "newPassword": "string"
  }
  ```
- **Response**: Success message on successful password change

### 2. Multi-Factor Authentication (MFA)
MFA is **opt-in only** - users must explicitly enable it.

#### MFA Setup Process
1. **Generate MFA Secret**: `POST /mfa/generate-secret`
   - Returns QR code and secret for authenticator app setup
   - **Response**:
     ```json
     {
       "secret": "string",
       "qrCode": "data:image/png;base64,..."
     }
     ```

2. **Enable MFA**: `POST /mfa/enable`
   - Verifies the token from authenticator app
   - **Request Body**:
     ```json
     {
       "token": "123456"
     }
     ```
   - **Response**:
     ```json
     {
       "backupCodes": ["ABC12345", "DEF67890", ...]
     }
     ```

3. **Disable MFA**: `POST /mfa/disable`
   - Requires current MFA token to disable
   - **Request Body**:
     ```json
     {
       "token": "123456"
     }
     ```

#### MFA During Login
- If MFA is enabled, login requires additional MFA token or backup code
- **Login Request** (with MFA):
  ```json
  {
    "email": "user@example.com",
    "password": "password",
    "mfaToken": "123456"
  }
  ```
- **Or with backup code**:
  ```json
  {
    "email": "user@example.com",
    "password": "password",
    "mfaBackupCode": "ABC12345"
  }
  ```

## Database Changes

### New Fields in Users Table
- `mfa_enabled`: Boolean (default: false)
- `mfa_secret`: Text (encrypted secret for TOTP)
- `mfa_backup_codes`: JSONB (array of backup codes)

## Security Features

### Password Security
- Current password verification required for changes
- New passwords are hashed using bcrypt
- Password change events are logged for analytics

### MFA Security
- TOTP (Time-based One-Time Password) using RFC 6238 standard
- Backup codes for account recovery
- MFA can only be disabled with valid current token
- All MFA operations are logged for security auditing

### Backup Codes
- 10 single-use backup codes generated when MFA is enabled
- Codes are removed from database when used
- Users should store these securely

## API Endpoints Summary

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/change-password` | Yes | Change user password |
| POST | `/mfa/generate-secret` | Yes | Generate MFA setup data |
| POST | `/mfa/enable` | Yes | Enable MFA for user |
| POST | `/mfa/disable` | Yes | Disable MFA for user |
| POST | `/login` | No | Login (supports MFA) |

## Error Handling

### Password Change Errors
- `400`: Missing current or new password
- `400`: Current password is incorrect
- `404`: User not found
- `500`: Server error

### MFA Errors
- `400`: Missing MFA token
- `400`: Invalid MFA token
- `400`: MFA not enabled (for disable)
- `404`: User not found
- `500`: Server error

### Login Errors
- `400`: Missing credentials
- `401`: Invalid credentials
- `401`: MFA token required
- `401`: Invalid MFA token or backup code

## Implementation Details

### Dependencies Added
- `speakeasy`: TOTP generation and verification
- `qrcode`: QR code generation for authenticator apps

### Architecture
- **MfaService**: Handles TOTP operations
- **AuthService**: Business logic for MFA and password changes
- **UserRepository**: Database operations for MFA settings
- **AuthController**: HTTP request/response handling

### Security Considerations
1. MFA secrets are stored encrypted in the database
2. Backup codes are hashed before storage
3. All MFA operations require authentication
4. MFA can only be disabled with current token verification
5. Password changes require current password verification

## Usage Examples

### Setting up MFA
1. User calls `/mfa/generate-secret` to get QR code
2. User scans QR code with authenticator app (Google Authenticator, Authy, etc.)
3. User calls `/mfa/enable` with token from app
4. User receives backup codes and should store them securely

### Login with MFA
1. User provides email and password
2. If MFA is enabled, user must also provide MFA token or backup code
3. System verifies all credentials before issuing JWT token

### Changing Password
1. User provides current password and new password
2. System verifies current password
3. System hashes and stores new password
4. Password change is logged for security

## Testing

The implementation includes comprehensive error handling and validation. All endpoints require proper authentication and include appropriate HTTP status codes for different error scenarios.

## Future Enhancements

Potential future improvements could include:
- SMS-based MFA as an alternative
- Email-based MFA
- Hardware security key support
- MFA recovery via email
- Admin ability to reset user MFA settings

