-- Add role column to users table (default "user" for existing records)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'user';

-- Add user_email column to execution_sessions for admin query indexing
ALTER TABLE "execution_sessions" ADD COLUMN IF NOT EXISTS "user_email" TEXT NOT NULL DEFAULT '';

-- Set the default admin user
UPDATE "users" SET "role" = 'admin' WHERE "email" = 'dzontak@gmail.com';
