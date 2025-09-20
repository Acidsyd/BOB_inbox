const { createClient } = require('@supabase/supabase-js');
const EmailSyncService = require('./EmailSyncService');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Simple Background Sync Service
 *
 * Features:
 * - Syncs all OAuth accounts every 15 minutes
 * - Single background process for all organizations
 * - Simple error handling and logging
 * - No complex activity-based intervals
 */
class BackgroundSyncService {
  constructor() {
    this.syncInterval = null;
    this.emailSyncService = new EmailSyncService();
    this.isShuttingDown = false;
    this.isSyncing = false;

    // Simple 15-minute interval for all accounts
    this.SYNC_INTERVAL = 15 * 60 * 1000; // 15 minutes

    console.log('🔄 BackgroundSyncService initialized - 15 minute interval');
  }

  /**
   * Start the background sync process
   */
  start() {
    if (this.syncInterval) {
      console.log('⚠️ Background sync already running, stopping existing interval');
      this.stop();
    }

    console.log('🚀 Starting background sync - syncing every 15 minutes');

    // Run initial sync after 30 seconds (allow server to fully start)
    setTimeout(() => {
      if (!this.isShuttingDown) {
        this.syncAllAccounts();
      }
    }, 30000);

    // Then sync every 15 minutes
    this.syncInterval = setInterval(() => {
      if (!this.isShuttingDown) {
        this.syncAllAccounts();
      }
    }, this.SYNC_INTERVAL);

    console.log('✅ Background sync started successfully');
  }

  /**
   * Stop the background sync process
   */
  stop() {
    this.isShuttingDown = true;

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('⏹️ Background sync stopped');
    }
  }

  /**
   * Sync all OAuth accounts across all organizations
   */
  async syncAllAccounts() {
    if (this.isSyncing) {
      console.log('⏭️ Background sync already in progress, skipping this cycle');
      return;
    }

    const syncStart = Date.now();
    this.isSyncing = true;

    try {
      console.log('🔄 === BACKGROUND SYNC STARTED ===');

      // Get all active OAuth accounts
      const { data: accounts, error } = await supabase
        .from('oauth2_tokens')
        .select('id, email, organization_id')
        .eq('status', 'linked_to_account');

      if (error) {
        throw new Error(`Failed to fetch accounts: ${error.message}`);
      }

      if (!accounts || accounts.length === 0) {
        console.log('📭 No OAuth accounts found to sync');
        return;
      }

      console.log(`📧 Found ${accounts.length} accounts to sync`);

      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      // Sync each account
      for (const account of accounts) {
        try {
          console.log(`🔄 Syncing account: ${account.email}`);

          const result = await this.emailSyncService.syncAccount(
            account.id,
            account.organization_id
          );

          if (result.success) {
            successCount++;
            console.log(`✅ ${account.email} - ${result.newMessages || 0} new, ${result.updatedMessages || 0} updated`);
          } else {
            errorCount++;
            errors.push(`${account.email}: ${result.error || 'Unknown error'}`);
            console.error(`❌ ${account.email} - Sync failed`);
          }

        } catch (accountError) {
          errorCount++;
          errors.push(`${account.email}: ${accountError.message}`);
          console.error(`❌ ${account.email} - Sync error:`, accountError.message);
        }
      }

      const duration = Date.now() - syncStart;
      console.log(`✅ Background sync completed in ${duration}ms`);
      console.log(`📊 Results: ${successCount} success, ${errorCount} errors`);

      if (errors.length > 0) {
        console.log('⚠️ Sync errors:', errors);
      }

      // Store sync result for monitoring
      await this.recordSyncResult(accounts.length, successCount, errorCount, duration);

    } catch (error) {
      console.error('❌ Background sync failed:', error);

      // Record failed sync
      await this.recordSyncResult(0, 0, 1, Date.now() - syncStart, error.message);

    } finally {
      this.isSyncing = false;
      console.log('🔄 === BACKGROUND SYNC ENDED ===\n');
    }
  }

  /**
   * Record sync result for monitoring and debugging
   */
  async recordSyncResult(totalAccounts, successCount, errorCount, duration, errorMessage = null) {
    try {
      // Get all organizations that have accounts
      const { data: organizations, error: orgError } = await supabase
        .from('oauth2_tokens')
        .select('organization_id')
        .eq('status', 'linked_to_account');

      if (orgError) {
        console.warn('⚠️ Could not get organizations for sync history:', orgError.message);
        return;
      }

      // Get unique organization IDs
      const uniqueOrgs = [...new Set(organizations.map(org => org.organization_id))];

      // Record sync result for each organization
      for (const organizationId of uniqueOrgs) {
        const syncResult = {
          organization_id: organizationId,
          sync_type: 'background',
          started_at: new Date(Date.now() - duration).toISOString(),
          completed_at: new Date().toISOString(),
          duration_ms: duration,
          status: errorMessage ? 'failed' : 'completed',
          accounts_total: totalAccounts,
          accounts_success: successCount,
          accounts_failed: errorCount,
          messages_synced: 0, // Will be updated when we have message counts
          messages_new: 0,
          error_message: errorMessage,
          sync_details: {
            sync_timestamp: new Date().toISOString(),
            interval_minutes: this.SYNC_INTERVAL / (1000 * 60)
          }
        };

        await supabase
          .from('sync_history')
          .insert(syncResult)
          .select();
      }

      console.log(`📊 Recorded sync result for ${uniqueOrgs.length} organizations`);

    } catch (recordError) {
      // Don't fail the sync if we can't record the result
      console.warn('⚠️ Failed to record sync result:', recordError.message);
    }
  }

  /**
   * Get sync status for health checks
   */
  getSyncStatus() {
    return {
      isRunning: !!this.syncInterval,
      isSyncing: this.isSyncing,
      intervalMinutes: this.SYNC_INTERVAL / (1000 * 60),
      nextSyncEstimate: this.syncInterval ?
        new Date(Date.now() + this.SYNC_INTERVAL).toISOString() : null
    };
  }

  /**
   * Manual trigger for background sync (for testing)
   */
  async triggerManualBackgroundSync() {
    if (this.isSyncing) {
      throw new Error('Background sync already in progress');
    }

    console.log('🔄 Manual background sync triggered');
    await this.syncAllAccounts();
  }
}

// Export singleton instance
module.exports = new BackgroundSyncService();