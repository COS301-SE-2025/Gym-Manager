-- Migration to add MFA fields to users table in Supabase
-- Run this SQL in your Supabase SQL Editor

-- Add MFA fields to the users table
ALTER TABLE users 
ADD COLUMN mfa_enabled BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN mfa_secret TEXT,
ADD COLUMN mfa_backup_codes JSONB;

-- Add comments to document the new columns
COMMENT ON COLUMN users.mfa_enabled IS 'Whether MFA is enabled for this user (opt-in only)';
COMMENT ON COLUMN users.mfa_secret IS 'Encrypted TOTP secret for MFA authentication';
COMMENT ON COLUMN users.mfa_backup_codes IS 'Array of backup codes for MFA recovery';

-- Optional: Create an index on mfa_enabled for faster queries
CREATE INDEX IF NOT EXISTS idx_users_mfa_enabled ON users(mfa_enabled);

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('mfa_enabled', 'mfa_secret', 'mfa_backup_codes');

