#!/usr/bin/env node
require('dotenv').config();
const NightlyRescheduleService = require('../src/services/NightlyRescheduleService');

/**
 * Test script for NightlyRescheduleService
 *
 * Usage:
 *   node backend/scripts/test-nightly-reschedule.js
 *
 * This script manually triggers the nightly reschedule process for testing.
 * Useful for validating the feature without waiting until 3am.
 */

async function testNightlyReschedule() {
  console.log('🧪 Testing Nightly Reschedule Service\n');
  console.log('='.repeat(60));
  console.log('This will manually trigger the nightly reschedule process.');
  console.log('All active campaigns will be rescheduled to pick up new leads.');
  console.log('='.repeat(60) + '\n');

  try {
    // Get current status
    const status = NightlyRescheduleService.getRescheduleStatus();
    console.log('📊 Current Status:');
    console.log(`   Configured Time: ${status.scheduleTime}`);
    console.log(`   Next Scheduled: ${status.nextRescheduleEstimate || 'Not scheduled'}`);
    console.log();

    // Trigger manual reschedule
    console.log('🚀 Triggering manual reschedule...\n');
    await NightlyRescheduleService.triggerManualReschedule();

    console.log('\n✅ Test completed successfully!');
    console.log('📝 Check the logs above for detailed results.');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testNightlyReschedule();
