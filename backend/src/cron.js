require('dotenv').config();
const CronEmailProcessor = require('./services/CronEmailProcessor');
const HealthCheckService = require('./services/HealthCheckService');
const BounceDetectionService = require('./cron/bounceDetection');
const NightlyRescheduleService = require('./services/NightlyRescheduleService');

console.log('🚀 Starting Email Cron Service...');

// Initialize health check service
const healthCheckService = new HealthCheckService();

// Initialize system health table on startup
healthCheckService.initializeHealthTable().then(() => {
  console.log('✅ Health monitoring initialized');
}).catch(error => {
  console.error('❌ Failed to initialize health monitoring:', error);
});

// Create and start the email processor
const processor = new CronEmailProcessor();
processor.start();

// Create and start the bounce detection service
const bounceDetector = new BounceDetectionService();
bounceDetector.start();

// Start the nightly reschedule service (singleton instance)
NightlyRescheduleService.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

console.log('✅ Email Cron Service is running');
console.log('📧 Processing scheduled emails every minute');
console.log('🔍 Detecting bounces every 2 hours via Gmail scanning');
console.log('🌙 Rescheduling campaigns nightly at 3am to pick up new leads');
console.log('🔄 Press Ctrl+C to stop');