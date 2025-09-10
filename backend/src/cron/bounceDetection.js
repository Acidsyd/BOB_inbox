const { createClient } = require('@supabase/supabase-js');
const GmailBounceDetector = require('../services/GmailBounceDetector');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Bounce Detection Service
 * Runs every 2 hours to scan Gmail accounts for bounce messages
 * Works with standard OAuth2 permissions - no webhooks required
 */
class BounceDetectionService {
  constructor() {
    this.bounceDetector = new GmailBounceDetector();
    this.isRunning = false;
    this.interval = null;
  }

  /**
   * Start the bounce detection service
   */
  start() {
    console.log('🔍 Starting Bounce Detection Service...');
    
    // Run every 2 hours (2 * 60 * 60 * 1000 = 7200000 ms)
    // This balances thoroughness with Gmail API rate limits
    this.interval = setInterval(async () => {
      await this.runBounceDetection();
    }, 2 * 60 * 60 * 1000);
    
    // Also run once on startup after 5 minutes
    setTimeout(async () => {
      await this.runBounceDetection();
    }, 5 * 60 * 1000); // 5 minutes
    
    console.log('✅ Bounce Detection Service scheduled to run every 2 hours');
  }

  /**
   * Run bounce detection for all organizations
   */
  async runBounceDetection() {
    if (this.isRunning) {
      console.log('⚠️ Bounce detection already running, skipping...');
      return;
    }
    
    this.isRunning = true;
    const startTime = new Date();
    
    console.log('🔍 Starting bounce detection scan...');
    console.log(`⏰ Started at: ${startTime.toISOString()}`);
    
    try {
      // Get all organizations with active campaigns or recent activity
      const { data: organizations, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .limit(100); // Process first 100 organizations
      
      if (orgError) {
        console.error('❌ Error fetching organizations:', orgError);
        return;
      }
      
      if (!organizations || organizations.length === 0) {
        console.log('ℹ️ No organizations found for bounce detection');
        return;
      }
      
      console.log(`📊 Processing bounce detection for ${organizations.length} organizations`);
      
      let totalStats = {
        organizationsProcessed: 0,
        accountsScanned: 0,
        totalBounces: 0,
        totalMessages: 0,
        errors: 0
      };
      
      // Process each organization
      for (const org of organizations) {
        try {
          console.log(`\n🏢 Processing organization: ${org.id}`);
          
          const result = await this.bounceDetector.runBounceDetectionForOrganization(org.id);
          
          if (result) {
            totalStats.organizationsProcessed++;
            totalStats.accountsScanned += result.accountsScanned || 0;
            totalStats.totalBounces += result.totalBounces || 0;
            totalStats.totalMessages += result.totalMessages || 0;
            
            console.log(`✅ Org ${org.id}: ${result.totalBounces} bounces detected`);
          }
          
        } catch (error) {
          console.error(`❌ Error processing organization ${org.id}:`, error.message);
          totalStats.errors++;
        }
        
        // Add small delay between organizations to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Log final statistics
      const endTime = new Date();
      const duration = Math.round((endTime - startTime) / 1000);
      
      console.log('\n🎉 Bounce Detection Complete!');
      console.log('================================');
      console.log(`⏰ Duration: ${duration} seconds`);
      console.log(`🏢 Organizations processed: ${totalStats.organizationsProcessed}`);
      console.log(`📧 Accounts scanned: ${totalStats.accountsScanned}`);
      console.log(`📨 Messages analyzed: ${totalStats.totalMessages}`);
      console.log(`🚫 Bounces detected: ${totalStats.totalBounces}`);
      console.log(`❌ Errors: ${totalStats.errors}`);
      
      // Record bounce detection run stats
      await this.recordBounceDetectionRun(totalStats, duration);
      
    } catch (error) {
      console.error('❌ Bounce detection failed:', error.message);
    } finally {
      this.isRunning = false;
    }
  }
  
  /**
   * Record bounce detection run statistics
   */
  async recordBounceDetectionRun(stats, duration) {
    try {
      const { error } = await supabase
        .from('system_health')
        .upsert({
          service: 'bounce_detection',
          status: 'healthy',
          last_heartbeat: new Date().toISOString(),
          metadata: {
            ...stats,
            duration_seconds: duration,
            last_run: new Date().toISOString()
          }
        });
        
      if (error) {
        console.error('⚠️ Error recording bounce detection stats:', error);
      }
    } catch (error) {
      console.error('⚠️ Error in recordBounceDetectionRun:', error.message);
    }
  }
  
  /**
   * Stop the bounce detection service
   */
  stop() {
    console.log('🛑 Stopping Bounce Detection Service...');
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}

module.exports = BounceDetectionService;