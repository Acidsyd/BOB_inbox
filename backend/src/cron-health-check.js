#!/usr/bin/env node

/**
 * Email Account Health Check Cron Job
 *
 * Runs every 24 hours to check the health of all email accounts
 *
 * Usage:
 * - Manual: node backend/src/cron-health-check.js
 * - Cron: npm run health-check:run
 * - PM2: Configured in ecosystem.config.cjs
 */

import EmailAccountHealthChecker from './services/EmailAccountHealthChecker.js';

async function main() {
  console.log('🏥 [HealthCheckCron] Starting email account health check...');
  console.log(`⏰ [HealthCheckCron] Started at: ${new Date().toISOString()}`);

  const checker = new EmailAccountHealthChecker();

  try {
    const result = await checker.runHealthChecks();

    if (result.success) {
      console.log('✅ [HealthCheckCron] Health check completed successfully');
      console.log('📊 [HealthCheckCron] Results:', JSON.stringify(result.results, null, 2));
      process.exit(0);
    } else {
      console.error('❌ [HealthCheckCron] Health check failed:', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 [HealthCheckCron] Fatal error:', error);
    process.exit(1);
  }
}

main();
