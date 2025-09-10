const AccountRateLimitService = require('../services/AccountRateLimitService');

/**
 * Daily Reset Cron Job
 * 
 * This script resets daily email counters for all accounts at midnight.
 * It should be run daily using a cron job or similar scheduler.
 * 
 * Example crontab entry:
 * 0 0 * * * node /path/to/backend/src/cron/dailyReset.js
 * 
 * Or using PM2:
 * pm2 start /path/to/backend/src/cron/dailyReset.js --cron="0 0 * * *" --name="daily-reset" --no-autorestart
 */

class DailyResetJob {
  constructor() {
    this.rateLimitService = new AccountRateLimitService();
    this.isRunning = false;
  }

  /**
   * Run the daily reset job
   */
  async run() {
    if (this.isRunning) {
      console.log('⏳ Daily reset job already running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = new Date();
    console.log(`🌅 Starting daily reset job at ${startTime.toISOString()}`);

    try {
      // Reset daily counters
      const resetCount = await this.rateLimitService.resetDailyCounters();
      
      // Log summary
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      
      console.log(`✅ Daily reset job completed successfully`);
      console.log(`📊 Reset counters for ${resetCount} accounts`);
      console.log(`⏱️ Job duration: ${duration}ms`);
      console.log(`🕐 Completed at: ${endTime.toISOString()}`);

      // Optional: Send notification or update monitoring systems
      await this.sendJobNotification('success', {
        resetCount,
        duration,
        timestamp: endTime.toISOString()
      });

    } catch (error) {
      console.error('❌ Daily reset job failed:', error);
      
      // Send failure notification
      await this.sendJobNotification('failure', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      throw error; // Re-throw for monitoring systems
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Send job notification (can be extended for Slack, email, etc.)
   */
  async sendJobNotification(status, data) {
    try {
      // This could be extended to send notifications to Slack, email, or monitoring systems
      const notification = {
        job: 'daily-reset',
        status,
        data,
        timestamp: new Date().toISOString()
      };

      console.log(`📢 Job notification:`, JSON.stringify(notification, null, 2));
      
      // TODO: Implement actual notification sending (Slack, email, webhooks, etc.)
      
    } catch (error) {
      console.error('⚠️ Failed to send job notification (non-fatal):', error);
    }
  }

  /**
   * Run job with proper error handling and exit
   */
  async runAndExit() {
    try {
      await this.run();
      process.exit(0); // Success exit
    } catch (error) {
      console.error('💥 Daily reset job failed with error:', error);
      process.exit(1); // Error exit
    }
  }
}

// Run the job if this script is executed directly
if (require.main === module) {
  const resetJob = new DailyResetJob();
  resetJob.runAndExit();
}

module.exports = DailyResetJob;