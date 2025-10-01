const { createClient } = require('@supabase/supabase-js');
const { toLocalTimestamp } = require('../utils/dateUtils.cjs');

class HealthCheckService {
  constructor() {
    this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    this.lastCronHeartbeat = null;
    this.HEARTBEAT_TIMEOUT = 3 * 60 * 1000; // 3 minutes
  }

  // Called by cron processor every minute
  async recordCronHeartbeat() {
    const timestamp = new Date().toISOString();
    try {
      // Update heartbeat in database
      await this.supabase
        .from('system_health')
        .upsert({
          service: 'cron_processor',
          status: 'running',
          last_heartbeat: timestamp,
          updated_at: timestamp
        });

      this.lastCronHeartbeat = new Date();
      console.log('💓 Cron heartbeat recorded:', timestamp);
    } catch (error) {
      console.error('❌ Error recording cron heartbeat:', error);
    }
  }

  // Check if cron processor is running
  async isCronProcessorRunning() {
    try {
      const { data, error } = await this.supabase
        .from('system_health')
        .select('last_heartbeat, status')
        .eq('service', 'cron_processor')
        .single();

      if (error || !data) {
        console.log('⚠️ No cron heartbeat found in database');
        return false;
      }

      const lastHeartbeat = new Date(data.last_heartbeat);
      const now = new Date();
      const timeDiff = now - lastHeartbeat;

      const isRunning = timeDiff < this.HEARTBEAT_TIMEOUT && data.status === 'running';
      
      if (!isRunning) {
        console.log(`⚠️ Cron processor appears inactive. Last heartbeat: ${data.last_heartbeat}, ${Math.floor(timeDiff/1000)}s ago`);
      }

      return isRunning;
    } catch (error) {
      console.error('❌ Error checking cron processor status:', error);
      return false;
    }
  }

  // Comprehensive system health check
  async getSystemHealth() {
    const cronRunning = await this.isCronProcessorRunning();
    
    // Check for stuck campaigns (active but no recent email sends)
    const { data: stuckCampaigns, error } = await this.supabase
      .from('campaigns')
      .select(`
        id, name, status, updated_at,
        scheduled_emails(count)
      `)
      .eq('status', 'active')
      .lt('updated_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()); // 10+ minutes old

    return {
      cronProcessor: {
        running: cronRunning,
        status: cronRunning ? 'healthy' : 'inactive'
      },
      campaigns: {
        stuckCount: stuckCampaigns?.length || 0,
        stuckCampaigns: stuckCampaigns || []
      },
      overallHealth: cronRunning ? 'healthy' : 'degraded'
    };
  }

  // Create system_health table if it doesn't exist
  async initializeHealthTable() {
    try {
      // Test if system_health table exists by doing a simple query
      const { data, error } = await this.supabase
        .from('system_health')
        .select('service')
        .limit(1);

      if (error) {
        console.log('⚠️ system_health table does not exist, but RPC exec not available');
        console.log('🔧 Please create the table manually in Supabase dashboard using:');
        console.log(`
CREATE TABLE IF NOT EXISTS system_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service varchar(50) NOT NULL UNIQUE,
  status varchar(20) NOT NULL,
  last_heartbeat timestamptz NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_health_service 
ON system_health(service);

CREATE INDEX IF NOT EXISTS idx_system_health_heartbeat 
ON system_health(last_heartbeat DESC);

INSERT INTO system_health (service, status, last_heartbeat, updated_at)
VALUES ('cron_processor', 'running', now(), now());
        `);
      } else {
        console.log('✅ System health table exists and is accessible');
      }
    } catch (error) {
      console.error('❌ Error checking health table:', error);
    }
  }
}

module.exports = HealthCheckService;