const { createClient } = require('@supabase/supabase-js');
const EmailSyncService = require('./EmailSyncService');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Smart Interval-Based Sync Scheduler
 * 
 * Features:
 * - Intelligent sync intervals based on account activity
 * - Campaign-aware sync prioritization
 * - Resource-efficient polling management
 * - Automatic sync health monitoring
 * - Graceful start/stop controls
 */
class SyncSchedulerService {
  constructor() {
    this.syncIntervals = new Map(); // accountId -> timer
    this.syncStatus = new Map();    // accountId -> last sync info
    this.emailSyncService = new EmailSyncService();
    this.isShuttingDown = false;
    
    // Activity level thresholds
    this.ACTIVITY_THRESHOLDS = {
      HIGH_EMAIL_COUNT: 50,   // emails per day
      MEDIUM_EMAIL_COUNT: 10, // emails per day
      RECENT_HOURS: 24        // hours to look back for activity
    };

    // Sync intervals (in milliseconds)
    this.SYNC_INTERVALS = {
      campaign: 1 * 60 * 1000,    // 1 minute for active campaign accounts
      high: 2 * 60 * 1000,        // 2 minutes for high-activity accounts
      medium: 5 * 60 * 1000,      // 5 minutes for medium-activity accounts
      low: 15 * 60 * 1000,        // 15 minutes for low-activity accounts
      inactive: 30 * 60 * 1000    // 30 minutes for inactive accounts
    };

    console.log('🔄 SyncSchedulerService initialized');
  }

  /**
   * Analyze account activity level to determine optimal sync frequency
   * @param {Object} account - Email account object
   * @param {string} organizationId - Organization ID
   * @returns {string} Activity level: 'campaign' | 'high' | 'medium' | 'low' | 'inactive'
   */
  async getAccountActivityLevel(account, organizationId) {
    try {
      const hoursBack = this.ACTIVITY_THRESHOLDS.RECENT_HOURS;
      const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

      // Check for active campaigns using this account
      const { data: activeCampaigns, error: campaignError } = await supabase
        .from('campaigns')
        .select('id, config')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .contains('config', { emailAccounts: [account.id] });

      if (campaignError) {
        console.warn('⚠️ Error checking active campaigns:', campaignError);
      } else if (activeCampaigns && activeCampaigns.length > 0) {
        console.log(`📈 Account ${account.email} has ${activeCampaigns.length} active campaigns - using campaign interval`);
        return 'campaign';
      }

      // Count recent emails sent/received
      const { count: sentCount, error: sentError } = await supabase
        .from('scheduled_emails')
        .select('id', { count: 'exact' })
        .eq('email_account_id', account.id)
        .eq('organization_id', organizationId)
        .gte('created_at', cutoffTime);

      const { count: receivedCount, error: receivedError } = await supabase
        .from('conversation_messages')
        .select('id', { count: 'exact' })
        .eq('organization_id', organizationId)
        .eq('direction', 'received')
        .gte('received_at', cutoffTime);

      if (sentError || receivedError) {
        console.warn('⚠️ Error checking email activity:', sentError || receivedError);
        return 'medium'; // Default fallback
      }

      const totalActivity = (sentCount || 0) + (receivedCount || 0);
      console.log(`📊 Account ${account.email} activity: ${totalActivity} emails in ${hoursBack}h`);

      // Determine activity level
      if (totalActivity >= this.ACTIVITY_THRESHOLDS.HIGH_EMAIL_COUNT) {
        return 'high';
      } else if (totalActivity >= this.ACTIVITY_THRESHOLDS.MEDIUM_EMAIL_COUNT) {
        return 'medium';
      } else if (totalActivity > 0) {
        return 'low';
      } else {
        return 'inactive';
      }

    } catch (error) {
      console.error('❌ Error analyzing account activity:', error);
      return 'medium'; // Safe fallback
    }
  }

  /**
   * Get optimal sync interval for an account
   * @param {Object} account - Email account object
   * @param {string} organizationId - Organization ID
   * @returns {number} Interval in milliseconds
   */
  async getOptimalSyncInterval(account, organizationId) {
    const activityLevel = await this.getAccountActivityLevel(account, organizationId);
    const interval = this.SYNC_INTERVALS[activityLevel];
    
    console.log(`⏱️ Account ${account.email} - Activity: ${activityLevel}, Interval: ${interval/1000/60}min`);
    return interval;
  }

  /**
   * Start smart sync for a single account
   * @param {string} accountId - Account ID to sync
   * @param {string} organizationId - Organization ID
   */
  async startAccountSync(accountId, organizationId) {
    try {
      // Stop existing sync if running
      if (this.syncIntervals.has(accountId)) {
        this.stopAccountSync(accountId);
      }

      // Get account details
      const { data: account, error } = await supabase
        .from('oauth2_tokens')
        .select('*')
        .eq('id', accountId)
        .eq('status', 'linked_to_account')
        .single();

      if (error || !account) {
        console.error(`❌ Account ${accountId} not found or not linked`);
        return false;
      }

      // Get optimal sync interval
      const interval = await this.getOptimalSyncInterval(account, organizationId);

      // Create sync timer
      const syncTimer = setInterval(async () => {
        if (this.isShuttingDown) return;
        
        await this.performScheduledSync(accountId, organizationId);
      }, interval);

      // Store timer and status
      this.syncIntervals.set(accountId, syncTimer);
      this.syncStatus.set(accountId, {
        email: account.email,
        interval: interval,
        startedAt: new Date(),
        lastSync: null,
        status: 'active',
        consecutiveErrors: 0
      });

      console.log(`✅ Smart sync started for ${account.email} (${interval/1000/60}min intervals)`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to start sync for account ${accountId}:`, error);
      return false;
    }
  }

  /**
   * Stop sync for a specific account
   * @param {string} accountId - Account ID to stop syncing
   */
  stopAccountSync(accountId) {
    const timer = this.syncIntervals.get(accountId);
    if (timer) {
      clearInterval(timer);
      this.syncIntervals.delete(accountId);
      
      const status = this.syncStatus.get(accountId);
      if (status) {
        status.status = 'stopped';
        status.stoppedAt = new Date();
      }
      
      console.log(`⏹️ Smart sync stopped for account ${accountId}`);
      return true;
    }
    return false;
  }

  /**
   * Start smart sync for all accounts in an organization
   * @param {string} organizationId - Organization ID
   */
  async startOrganizationSync(organizationId) {
    try {
      console.log(`🚀 Starting smart sync for organization: ${organizationId}`);

      // Get all linked email accounts
      const { data: accounts, error } = await supabase
        .from('oauth2_tokens')
        .select('id, email')
        .eq('status', 'linked_to_account')
        // Note: We'll filter by organization in the sync method

      if (error) {
        console.error('❌ Error fetching email accounts:', error);
        return { success: false, error: error.message };
      }

      if (!accounts || accounts.length === 0) {
        console.log('📭 No linked email accounts found for organization');
        return { success: true, accountsStarted: 0, message: 'No accounts to sync' };
      }

      // Start sync for each account
      let accountsStarted = 0;
      const results = [];

      for (const account of accounts) {
        const started = await this.startAccountSync(account.id, organizationId);
        if (started) {
          accountsStarted++;
          results.push({ accountId: account.id, email: account.email, status: 'started' });
        } else {
          results.push({ accountId: account.id, email: account.email, status: 'failed' });
        }
      }

      console.log(`✅ Smart sync started for ${accountsStarted}/${accounts.length} accounts`);

      return {
        success: true,
        accountsStarted,
        totalAccounts: accounts.length,
        results
      };

    } catch (error) {
      console.error('❌ Failed to start organization sync:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Stop sync for all accounts in an organization
   * @param {string} organizationId - Organization ID
   */
  stopOrganizationSync(organizationId) {
    console.log(`⏹️ Stopping smart sync for organization: ${organizationId}`);

    let accountsStopped = 0;
    const results = [];

    // Stop all running syncs
    for (const [accountId, timer] of this.syncIntervals) {
      const status = this.syncStatus.get(accountId);
      // We don't have organization context in status, so we stop all for now
      // In production, you'd want to track organization per account
      
      this.stopAccountSync(accountId);
      accountsStopped++;
      results.push({ 
        accountId, 
        email: status?.email || 'unknown',
        status: 'stopped' 
      });
    }

    return {
      success: true,
      accountsStopped,
      results
    };
  }

  /**
   * Perform scheduled sync for an account
   * @param {string} accountId - Account ID to sync
   * @param {string} organizationId - Organization ID
   */
  async performScheduledSync(accountId, organizationId) {
    const status = this.syncStatus.get(accountId);
    if (!status) return;

    try {
      console.log(`🔄 Performing scheduled sync for ${status.email}`);

      const syncResult = await this.emailSyncService.syncAccount(accountId, organizationId);

      // Update status
      status.lastSync = new Date();
      status.consecutiveErrors = 0;
      status.lastResult = {
        success: true,
        newMessages: syncResult.newMessages || 0,
        updatedMessages: syncResult.updatedStatus || 0,
        syncTime: syncResult.syncTime || 0
      };

      if (syncResult.newMessages > 0 || syncResult.updatedStatus > 0) {
        console.log(`✅ Sync completed for ${status.email}: ${syncResult.newMessages} new, ${syncResult.updatedStatus} updated`);
      }

    } catch (error) {
      console.error(`❌ Scheduled sync failed for ${status.email}:`, error.message);
      
      status.consecutiveErrors = (status.consecutiveErrors || 0) + 1;
      status.lastError = {
        message: error.message,
        timestamp: new Date()
      };

      // If too many consecutive errors, slow down the sync
      if (status.consecutiveErrors >= 3) {
        console.warn(`⚠️ Account ${status.email} has ${status.consecutiveErrors} consecutive errors, slowing sync`);
        // You could implement exponential backoff here
      }
    }
  }

  /**
   * Get sync status for all accounts
   * @returns {Object} Current sync status
   */
  getSyncStatus() {
    const status = {
      activeAccounts: this.syncIntervals.size,
      accounts: {},
      totalErrors: 0
    };

    for (const [accountId, accountStatus] of this.syncStatus) {
      status.accounts[accountId] = {
        ...accountStatus,
        isActive: this.syncIntervals.has(accountId)
      };
      
      if (accountStatus.consecutiveErrors > 0) {
        status.totalErrors += accountStatus.consecutiveErrors;
      }
    }

    return status;
  }

  /**
   * Gracefully shutdown all sync operations
   */
  async shutdown() {
    console.log('🛑 Shutting down SyncSchedulerService...');
    this.isShuttingDown = true;

    // Stop all sync timers
    for (const [accountId] of this.syncIntervals) {
      this.stopAccountSync(accountId);
    }

    console.log('✅ SyncSchedulerService shutdown complete');
  }

  /**
   * Health check for the sync scheduler
   * @returns {Object} Health status
   */
  getHealthStatus() {
    const status = this.getSyncStatus();
    const now = new Date();
    
    let healthyAccounts = 0;
    let errorAccounts = 0;
    let staleAccounts = 0;

    for (const accountStatus of Object.values(status.accounts)) {
      if (accountStatus.consecutiveErrors === 0) {
        healthyAccounts++;
      } else {
        errorAccounts++;
      }

      // Check for stale syncs (no sync in last 2x interval)
      if (accountStatus.lastSync) {
        const timeSinceLastSync = now - new Date(accountStatus.lastSync);
        if (timeSinceLastSync > accountStatus.interval * 2) {
          staleAccounts++;
        }
      }
    }

    return {
      status: errorAccounts === 0 && staleAccounts === 0 ? 'healthy' : 'degraded',
      activeAccounts: status.activeAccounts,
      healthyAccounts,
      errorAccounts,
      staleAccounts,
      timestamp: now.toISOString()
    };
  }
}

module.exports = SyncSchedulerService;