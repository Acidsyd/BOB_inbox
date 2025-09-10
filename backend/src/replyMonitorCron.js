/**
 * Reply Monitoring Cron Service
 * Periodically checks Gmail accounts for replies to campaign emails
 */

// Load environment variables
require('dotenv').config();

const ReplyMonitoringService = require('./services/ReplyMonitoringService');

const replyMonitoringService = new ReplyMonitoringService();

console.log('🚀 Starting Reply Monitoring Cron Service...');
console.log('📬 This service monitors Gmail accounts for replies to campaign emails');

// Run reply monitoring every 15 minutes
const MONITORING_INTERVAL = 15 * 60 * 1000; // 15 minutes in milliseconds

async function runReplyMonitoring() {
  try {
    console.log(`📬 === Reply Monitoring Cycle Started at ${new Date().toISOString()} ===`);
    
    await replyMonitoringService.monitorReplies();
    
    console.log(`✅ === Reply Monitoring Cycle Completed at ${new Date().toISOString()} ===`);
  } catch (error) {
    console.error('❌ Error in reply monitoring cycle:', error);
  }
}

// Start the monitoring loop
async function startReplyMonitoring() {
  console.log(`📬 Reply monitoring will run every ${MONITORING_INTERVAL / 1000 / 60} minutes`);
  
  // Run immediately on startup
  await runReplyMonitoring();
  
  // Then run every 15 minutes
  setInterval(async () => {
    await runReplyMonitoring();
  }, MONITORING_INTERVAL);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n📬 Reply monitoring service shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n📬 Reply monitoring service shutting down...');
  process.exit(0);
});

// Start the service
startReplyMonitoring().catch(error => {
  console.error('❌ Failed to start reply monitoring service:', error);
  process.exit(1);
});