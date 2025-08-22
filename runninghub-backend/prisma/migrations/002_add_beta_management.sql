-- Beta Management System Migration
-- This adds beta user management, invitation codes, and analytics

-- Add beta access level enum
DO $$ BEGIN
    CREATE TYPE "BetaAccessLevel" AS ENUM ('NONE', 'BASIC', 'PREMIUM', 'ADVANCED', 'DEVELOPER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add beta fields to User table
ALTER TABLE "User" 
ADD COLUMN IF NOT EXISTS "betaAccessLevel" "BetaAccessLevel" DEFAULT 'NONE',
ADD COLUMN IF NOT EXISTS "betaInviteCode" TEXT,
ADD COLUMN IF NOT EXISTS "betaJoinedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "betaFeatures" JSONB;

-- Create BetaInviteCode table
CREATE TABLE IF NOT EXISTS "BetaInviteCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "accessLevel" "BetaAccessLevel" NOT NULL DEFAULT 'BASIC',
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "currentUses" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BetaInviteCode_pkey" PRIMARY KEY ("id")
);

-- Create BetaUserAccess table
CREATE TABLE IF NOT EXISTS "BetaUserAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessLevel" "BetaAccessLevel" NOT NULL DEFAULT 'BASIC',
    "inviteCodeId" TEXT,
    "features" JSONB,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,

    CONSTRAINT "BetaUserAccess_pkey" PRIMARY KEY ("id")
);

-- Create BetaAnalytics table
CREATE TABLE IF NOT EXISTS "BetaAnalytics" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "eventData" JSONB,
    "userContext" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "BetaAnalytics_pkey" PRIMARY KEY ("id")
);

-- Create unique constraints and indexes
CREATE UNIQUE INDEX IF NOT EXISTS "BetaInviteCode_code_key" ON "BetaInviteCode"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "BetaUserAccess_userId_key" ON "BetaUserAccess"("userId");

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "BetaInviteCode_code_idx" ON "BetaInviteCode"("code");
CREATE INDEX IF NOT EXISTS "BetaInviteCode_isActive_idx" ON "BetaInviteCode"("isActive");
CREATE INDEX IF NOT EXISTS "BetaInviteCode_expiresAt_idx" ON "BetaInviteCode"("expiresAt");

CREATE INDEX IF NOT EXISTS "BetaUserAccess_userId_idx" ON "BetaUserAccess"("userId");
CREATE INDEX IF NOT EXISTS "BetaUserAccess_accessLevel_idx" ON "BetaUserAccess"("accessLevel");
CREATE INDEX IF NOT EXISTS "BetaUserAccess_isActive_idx" ON "BetaUserAccess"("isActive");

CREATE INDEX IF NOT EXISTS "BetaAnalytics_userId_idx" ON "BetaAnalytics"("userId");
CREATE INDEX IF NOT EXISTS "BetaAnalytics_sessionId_idx" ON "BetaAnalytics"("sessionId");
CREATE INDEX IF NOT EXISTS "BetaAnalytics_eventType_idx" ON "BetaAnalytics"("eventType");
CREATE INDEX IF NOT EXISTS "BetaAnalytics_feature_idx" ON "BetaAnalytics"("feature");
CREATE INDEX IF NOT EXISTS "BetaAnalytics_timestamp_idx" ON "BetaAnalytics"("timestamp");

-- Add foreign key constraints
DO $$ 
BEGIN
    -- Add foreign key for BetaUserAccess -> BetaInviteCode
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'BetaUserAccess_inviteCodeId_fkey'
    ) THEN
        ALTER TABLE "BetaUserAccess" 
        ADD CONSTRAINT "BetaUserAccess_inviteCodeId_fkey" 
        FOREIGN KEY ("inviteCodeId") REFERENCES "BetaInviteCode"("id") 
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    
    -- Add foreign key for BetaUserAccess -> User
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'BetaUserAccess_userId_fkey'
    ) THEN
        ALTER TABLE "BetaUserAccess" 
        ADD CONSTRAINT "BetaUserAccess_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Insert some default beta invitation codes for testing
INSERT INTO "BetaInviteCode" ("id", "code", "accessLevel", "maxUses", "description") 
VALUES 
    ('beta_001', 'COSNAPBETA2025', 'BASIC', 100, 'General Beta Access for Early Users'),
    ('beta_002', 'PREMIUM_BETA_2025', 'PREMIUM', 50, 'Premium Beta Access with Advanced Features'),
    ('beta_003', 'DEV_ACCESS_2025', 'DEVELOPER', 10, 'Developer Access for Testing and Debug Features')
ON CONFLICT ("code") DO NOTHING;

-- Create production monitoring tables

-- Production Error Tracking
CREATE TABLE IF NOT EXISTS "ProductionError" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "code" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'low',
    "context" JSONB,
    "endpoint" TEXT,
    "userId" TEXT,
    "ip" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,

    CONSTRAINT "ProductionError_pkey" PRIMARY KEY ("id")
);

-- Production Alerts
CREATE TABLE IF NOT EXISTS "ProductionAlert" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "context" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedBy" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "ProductionAlert_pkey" PRIMARY KEY ("id")
);

-- Performance Monitoring
CREATE TABLE IF NOT EXISTS "ProductionMetric" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metricType" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "context" JSONB,
    "endpoint" TEXT,
    "userId" TEXT,

    CONSTRAINT "ProductionMetric_pkey" PRIMARY KEY ("id")
);

-- System Health Status
CREATE TABLE IF NOT EXISTS "SystemHealthStatus" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "service" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "responseTime" DOUBLE PRECISION,
    "details" JSONB,
    "region" TEXT,

    CONSTRAINT "SystemHealthStatus_pkey" PRIMARY KEY ("id")
);

-- Create indexes for production monitoring
CREATE INDEX IF NOT EXISTS "ProductionError_timestamp_idx" ON "ProductionError"("timestamp");
CREATE INDEX IF NOT EXISTS "ProductionError_severity_idx" ON "ProductionError"("severity");
CREATE INDEX IF NOT EXISTS "ProductionError_endpoint_idx" ON "ProductionError"("endpoint");
CREATE INDEX IF NOT EXISTS "ProductionError_userId_idx" ON "ProductionError"("userId");
CREATE INDEX IF NOT EXISTS "ProductionError_resolved_idx" ON "ProductionError"("resolved");

CREATE INDEX IF NOT EXISTS "ProductionAlert_timestamp_idx" ON "ProductionAlert"("timestamp");
CREATE INDEX IF NOT EXISTS "ProductionAlert_severity_idx" ON "ProductionAlert"("severity");
CREATE INDEX IF NOT EXISTS "ProductionAlert_type_idx" ON "ProductionAlert"("type");
CREATE INDEX IF NOT EXISTS "ProductionAlert_acknowledged_idx" ON "ProductionAlert"("acknowledged");
CREATE INDEX IF NOT EXISTS "ProductionAlert_resolved_idx" ON "ProductionAlert"("resolved");

CREATE INDEX IF NOT EXISTS "ProductionMetric_timestamp_idx" ON "ProductionMetric"("timestamp");
CREATE INDEX IF NOT EXISTS "ProductionMetric_metricType_idx" ON "ProductionMetric"("metricType");
CREATE INDEX IF NOT EXISTS "ProductionMetric_metricName_idx" ON "ProductionMetric"("metricName");
CREATE INDEX IF NOT EXISTS "ProductionMetric_endpoint_idx" ON "ProductionMetric"("endpoint");

CREATE INDEX IF NOT EXISTS "SystemHealthStatus_timestamp_idx" ON "SystemHealthStatus"("timestamp");
CREATE INDEX IF NOT EXISTS "SystemHealthStatus_service_idx" ON "SystemHealthStatus"("service");
CREATE INDEX IF NOT EXISTS "SystemHealthStatus_status_idx" ON "SystemHealthStatus"("status");

-- Update existing users who might already be in the system
-- This is just a placeholder - in real deployment you'd have specific logic
UPDATE "User" 
SET "betaAccessLevel" = 'BASIC', "betaJoinedAt" = CURRENT_TIMESTAMP
WHERE "betaAccessLevel" IS NULL AND "createdAt" < CURRENT_TIMESTAMP - INTERVAL '30 days';

COMMIT;