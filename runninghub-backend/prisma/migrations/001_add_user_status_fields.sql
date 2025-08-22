-- Migration: Add missing user status fields
-- Created: 2025-01-21
-- Description: Adds isActive, isBanned, lastLoginAt fields to User table and revokedAt to RefreshToken table

-- Add user status and login tracking fields
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isBanned" BOOLEAN DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP;

-- Add revoked timestamp to refresh tokens
ALTER TABLE "RefreshToken" ADD COLUMN IF NOT EXISTS "revokedAt" TIMESTAMP;

-- Update existing users to have default values
UPDATE "User" SET "isActive" = true WHERE "isActive" IS NULL;
UPDATE "User" SET "isBanned" = false WHERE "isBanned" IS NULL;