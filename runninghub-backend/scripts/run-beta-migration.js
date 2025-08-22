/**
 * Beta Management Migration Runner
 * Executes the beta management and production monitoring database migration
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function runMigration() {
  try {
    console.log('🚀 Starting Beta Management Migration...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '..', 'prisma', 'migrations', '002_add_beta_management.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded successfully');
    console.log(`📏 Migration size: ${migrationSQL.length} characters`);
    
    // Execute the migration
    console.log('⚡ Executing migration...');
    await prisma.$executeRawUnsafe(migrationSQL);
    
    console.log('✅ Migration executed successfully!');
    
    // Verify the migration by checking if new tables exist
    console.log('🔍 Verifying migration...');
    
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('BetaInviteCode', 'BetaUserAccess', 'BetaAnalytics', 'ProductionError', 'ProductionAlert', 'ProductionMetric', 'SystemHealthStatus')
      ORDER BY table_name;
    `;
    
    console.log('📋 New tables created:');
    tables.forEach(table => {
      console.log(`  ✓ ${table.table_name}`);
    });
    
    // Check beta invite codes
    const inviteCodes = await prisma.$queryRaw`
      SELECT code, "accessLevel", "maxUses", description 
      FROM "BetaInviteCode" 
      WHERE "isActive" = true
      ORDER BY "accessLevel";
    `;
    
    console.log('🎫 Beta invite codes available:');
    inviteCodes.forEach(code => {
      console.log(`  🔑 ${code.code} (${code.accessLevel}) - ${code.description}`);
    });
    
    // Test basic functionality
    console.log('🧪 Testing basic functionality...');
    
    // Test beta analytics insertion
    const testAnalytic = await prisma.$queryRaw`
      INSERT INTO "BetaAnalytics" ("id", "sessionId", "eventType", "feature", "eventData")
      VALUES ('test_migration_' || extract(epoch from now()), 'test_session', 'migration_test', 'database', '{"test": true}')
      RETURNING id, "eventType", feature;
    `;
    
    console.log('📊 Test analytics record created:', testAnalytic[0]);
    
    // Clean up test data
    await prisma.$queryRaw`
      DELETE FROM "BetaAnalytics" 
      WHERE "eventType" = 'migration_test' AND feature = 'database';
    `;
    
    console.log('🧹 Test data cleaned up');
    
    console.log('\n🎉 Beta Management Migration completed successfully!');
    console.log('\n📚 Available APIs:');
    console.log('  • POST /api/beta/validate-invite - Validate beta invitation codes');
    console.log('  • POST /api/beta/join - Join beta program with invitation code');  
    console.log('  • GET  /api/beta/user-access - Get user beta access information');
    console.log('  • PUT  /api/beta/user-access/:userId - Update user beta access (admin)');
    console.log('  • POST /api/beta/analytics - Record beta analytics events');
    console.log('  • GET  /api/beta/analytics - Get beta analytics (admin)');
    console.log('  • POST /api/mobile/upload-optimized - Mobile-optimized image upload');
    console.log('  • GET  /api/mobile/upload-config - Get mobile upload configuration');
    console.log('  • POST /api/mobile/upload-estimate - Estimate upload time');
    console.log('  • POST /api/mobile/analytics - Mobile analytics tracking');
    console.log('  • GET  /api/mobile/performance - Mobile performance metrics');
    console.log('  • GET  /api/monitoring/health-summary - Production health summary (admin)');
    console.log('  • GET  /api/monitoring/metrics - Production metrics dashboard (admin)');
    console.log('  • GET  /api/monitoring/alerts - Get production alerts (admin)');
    console.log('  • GET  /api/monitoring/errors - Get production errors (admin)');
    console.log('  • GET  /api/monitoring/system - System resource monitoring');
    console.log('  • GET  /api/monitoring/prometheus - Prometheus metrics endpoint');
    
    console.log('\n🔑 Default Beta Invitation Codes:');
    console.log('  • COSNAPBETA2025 - Basic Beta Access (100 uses)');
    console.log('  • PREMIUM_BETA_2025 - Premium Beta Access (50 uses)');
    console.log('  • DEV_ACCESS_2025 - Developer Access (10 uses)');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
runMigration();