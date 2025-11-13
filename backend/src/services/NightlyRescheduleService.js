const { createClient } = require('@supabase/supabase-js');
const CampaignScheduler = require('../utils/CampaignScheduler');
const { fetchAllWithPagination } = require('../utils/supabaseHelpers');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Nightly Reschedule Service
 *
 * Features:
 * - Automatically reschedules all active campaigns at 3am daily
 * - Picks up new leads added during the day
 * - Preserves already-sent emails (conversation history)
 * - Updates scheduled/failed/skipped emails with fresh timing
 * - Adds new leads that don't have scheduled_emails yet
 *
 * Design Philosophy:
 * - Runs once per day at a configured time (default: 3am server time)
 * - Processes all organizations and active campaigns
 * - Isolated error handling per campaign
 * - Comprehensive logging for debugging
 */
class NightlyRescheduleService {
  constructor() {
    this.rescheduleInterval = null;
    this.isRescheduling = false;
    this.isShuttingDown = false;

    // Configurable reschedule time (default 3am)
    this.rescheduleHour = parseInt(process.env.RESCHEDULE_HOUR || '3');
    this.rescheduleMinute = parseInt(process.env.RESCHEDULE_MINUTE || '0');

    // Ensure valid time range
    this.rescheduleHour = Math.max(0, Math.min(23, this.rescheduleHour));
    this.rescheduleMinute = Math.max(0, Math.min(59, this.rescheduleMinute));

    console.log(`🌙 NightlyRescheduleService initialized - runs daily at ${String(this.rescheduleHour).padStart(2, '0')}:${String(this.rescheduleMinute).padStart(2, '0')}`);
  }

  /**
   * Start the nightly reschedule service
   */
  start() {
    if (this.rescheduleInterval) {
      console.log('⚠️ Nightly reschedule already running, stopping existing interval');
      this.stop();
    }

    console.log('🚀 Starting nightly reschedule service');

    // Schedule daily check
    this.scheduleNextReschedule();

    console.log('✅ Nightly reschedule service started successfully');
  }

  /**
   * Stop the nightly reschedule service
   */
  stop() {
    this.isShuttingDown = true;

    if (this.rescheduleInterval) {
      clearTimeout(this.rescheduleInterval);
      this.rescheduleInterval = null;
      console.log('⏹️ Nightly reschedule service stopped');
    }
  }

  /**
   * Schedule the next reschedule operation
   */
  scheduleNextReschedule() {
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(this.rescheduleHour, this.rescheduleMinute, 0, 0);

    // If scheduled time has passed today, schedule for tomorrow
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const msUntilReschedule = scheduledTime.getTime() - now.getTime();
    const hoursUntil = Math.floor(msUntilReschedule / (1000 * 60 * 60));
    const minutesUntil = Math.floor((msUntilReschedule % (1000 * 60 * 60)) / (1000 * 60));

    console.log(`⏰ Next reschedule scheduled for: ${scheduledTime.toISOString()} (in ${hoursUntil}h ${minutesUntil}m)`);

    this.rescheduleInterval = setTimeout(() => {
      if (!this.isShuttingDown) {
        this.rescheduleAllCampaigns();
        // Schedule next day's reschedule
        this.scheduleNextReschedule();
      }
    }, msUntilReschedule);
  }

  /**
   * Reschedule all active campaigns across all organizations
   */
  async rescheduleAllCampaigns() {
    if (this.isRescheduling) {
      console.log('⏭️ Reschedule already in progress, skipping this cycle');
      return;
    }

    const startTime = Date.now();
    this.isRescheduling = true;

    try {
      console.log('\n🌙 === NIGHTLY RESCHEDULE STARTED ===');
      console.log(`🕐 Time: ${new Date().toISOString()}`);

      // Get all active campaigns
      const { data: activeCampaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select('id, name, organization_id, config, status, reschedule_count')
        .eq('status', 'active');

      if (campaignsError) {
        console.error('❌ Failed to fetch active campaigns:', campaignsError.message);
        return;
      }

      if (!activeCampaigns || activeCampaigns.length === 0) {
        console.log('📭 No active campaigns found to reschedule');
        return;
      }

      console.log(`📋 Found ${activeCampaigns.length} active campaign(s) to reschedule`);

      let successCount = 0;
      let errorCount = 0;
      let skippedCount = 0;
      const errors = [];

      // Process each campaign
      for (const campaign of activeCampaigns) {
        try {
          console.log(`\n🔄 Processing campaign: ${campaign.name} (${campaign.id})`);

          const result = await this.rescheduleCampaign(campaign);

          if (result.success) {
            successCount++;
            console.log(`✅ ${campaign.name} - ${result.message}`);
          } else if (result.skipped) {
            skippedCount++;
            console.log(`⏭️ ${campaign.name} - ${result.message}`);
          } else {
            errorCount++;
            errors.push(`${campaign.name}: ${result.error || 'Unknown error'}`);
            console.error(`❌ ${campaign.name} - Reschedule failed: ${result.error}`);
          }

        } catch (campaignError) {
          errorCount++;
          errors.push(`${campaign.name}: ${campaignError.message}`);
          console.error(`❌ ${campaign.name} - Reschedule error:`, campaignError.message);
        }
      }

      const duration = Date.now() - startTime;
      console.log(`\n✅ Nightly reschedule completed in ${duration}ms`);
      console.log(`📊 Results: ${successCount} success, ${skippedCount} skipped, ${errorCount} errors`);

      if (errors.length > 0) {
        console.log('⚠️ Reschedule errors:', errors);
      }

      // Record reschedule result for monitoring
      await this.recordRescheduleResult(
        activeCampaigns.length,
        successCount,
        skippedCount,
        errorCount,
        duration
      );

    } catch (error) {
      console.error('❌ Nightly reschedule failed:', error);

      // Record failed reschedule
      await this.recordRescheduleResult(0, 0, 0, 1, Date.now() - startTime, error.message);

    } finally {
      this.isRescheduling = false;
      console.log('🌙 === NIGHTLY RESCHEDULE ENDED ===\n');
    }
  }

  /**
   * Reschedule a single campaign
   * Based on rescheduleExistingCampaign() from campaigns.js
   */
  async rescheduleCampaign(campaign) {
    const { id: campaignId, organization_id: organizationId, config } = campaign;

    try {
      // Step 1: Check for concurrent reschedule operations
      const { data: recentSkipped, error: skipError } = await supabase
        .from('scheduled_emails')
        .select('updated_at')
        .eq('campaign_id', campaignId)
        .eq('organization_id', organizationId)
        .eq('status', 'skipped')
        .gte('updated_at', new Date(Date.now() - 30 * 1000).toISOString())
        .limit(1);

      if (!skipError && recentSkipped && recentSkipped.length > 0) {
        const timeDiff = (Date.now() - new Date(recentSkipped[0].updated_at).getTime()) / 1000;
        if (timeDiff < 30) {
          return {
            success: false,
            skipped: true,
            message: `Concurrent reschedule detected ${timeDiff.toFixed(1)}s ago`
          };
        }
      }

      // Step 2: Get existing scheduled_emails
      const { data: existingEmails } = await fetchAllWithPagination(supabase, 'scheduled_emails', {
        select: 'id, lead_id, status',
        filters: [
          { column: 'campaign_id', value: campaignId },
          { column: 'organization_id', value: organizationId }
        ]
      });

      if (!existingEmails || existingEmails.length === 0) {
        return {
          success: false,
          skipped: true,
          message: 'No scheduled emails found - campaign might be completed'
        };
      }

      // Separate sent emails from updateable emails
      const sentEmails = new Set();
      const updateableEmailMap = new Map();

      existingEmails.forEach(email => {
        if (email.status === 'sent') {
          sentEmails.add(email.lead_id);
        } else if (['scheduled', 'failed', 'skipped'].includes(email.status)) {
          updateableEmailMap.set(email.lead_id, email);
        }
      });

      console.log(`  ✅ Sent emails (preserved): ${sentEmails.size}`);
      console.log(`  🔄 Updateable emails: ${updateableEmailMap.size}`);

      // Step 3: Get all leads for this campaign
      const leadListId = config?.leadListId;
      if (!leadListId) {
        return { success: false, error: 'No lead list configured' };
      }

      const { data: allLeads } = await fetchAllWithPagination(supabase, 'leads', {
        select: '*',
        filters: [
          { column: 'lead_list_id', value: leadListId },
          { column: 'organization_id', value: organizationId },
          { column: 'status', value: 'active' }
        ]
      });

      if (!allLeads || allLeads.length === 0) {
        return { success: false, error: 'No active leads found' };
      }

      // Filter out already-sent leads
      const leadsToSchedule = allLeads.filter(lead => !sentEmails.has(lead.id));

      if (leadsToSchedule.length === 0) {
        return {
          success: true,
          message: `All ${allLeads.length} leads already sent - nothing to reschedule`
        };
      }

      console.log(`  📊 Total leads: ${allLeads.length}, To schedule: ${leadsToSchedule.length}`);

      // Step 4: Generate fresh schedule
      const emailAccounts = config?.emailAccounts || [];
      if (emailAccounts.length === 0) {
        return { success: false, error: 'No email accounts configured' };
      }

      const scheduler = new CampaignScheduler({
        timezone: config?.timezone || 'UTC',
        emailsPerDay: config?.emailsPerDay || 100,
        emailsPerHour: config?.emailsPerHour || 10,
        sendingInterval: config?.sendingInterval || 15,
        sendingHours: config?.sendingHours || { start: 9, end: 17 },
        activeDays: config?.activeDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
      });

      const leadSchedules = scheduler.scheduleEmailsWithPerfectRotation(leadsToSchedule, emailAccounts);

      console.log(`  ✅ Generated ${leadSchedules.length} schedules`);

      // Step 5: Categorize leads
      const leadsToUpdate = [];
      const leadsToInsert = [];

      leadSchedules.forEach(schedule => {
        if (updateableEmailMap.has(schedule.lead.id)) {
          leadsToUpdate.push(schedule);
        } else {
          leadsToInsert.push(schedule);
        }
      });

      console.log(`  🔄 To update: ${leadsToUpdate.length}`);
      console.log(`  ➕ To insert: ${leadsToInsert.length}`);

      // Step 6: Update existing scheduled_emails
      const UPDATE_BATCH_SIZE = 50;
      let totalUpdated = 0;

      for (let i = 0; i < leadsToUpdate.length; i += UPDATE_BATCH_SIZE) {
        const batch = leadsToUpdate.slice(i, i + UPDATE_BATCH_SIZE);

        for (const schedule of batch) {
          const existingEmail = updateableEmailMap.get(schedule.lead.id);

          await supabase
            .from('scheduled_emails')
            .update({
              send_at: schedule.sendAt.toISOString(),
              email_account_id: schedule.emailAccountId,
              status: 'scheduled',
              updated_at: new Date().toISOString()
            })
            .eq('id', existingEmail.id);

          totalUpdated++;
        }
      }

      // Step 7: Insert new scheduled_emails
      const INSERT_BATCH_SIZE = 50;
      let totalInserted = 0;

      for (let i = 0; i < leadsToInsert.length; i += INSERT_BATCH_SIZE) {
        const batch = leadsToInsert.slice(i, i + INSERT_BATCH_SIZE);

        const emailRecords = batch.map(schedule => ({
          campaign_id: campaignId,
          organization_id: organizationId,
          lead_id: schedule.lead.id,
          to_email: schedule.lead.email,
          subject: config?.emailSubject || 'No Subject',
          content: config?.emailContent || '',
          send_at: schedule.sendAt.toISOString(),
          email_account_id: schedule.emailAccountId,
          status: 'scheduled',
          sequence_index: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

        await supabase
          .from('scheduled_emails')
          .insert(emailRecords);

        totalInserted += emailRecords.length;
      }

      console.log(`  ✅ Updated: ${totalUpdated}, Inserted: ${totalInserted}`);

      // Step 8: Increment reschedule count and update timestamp
      const currentRescheduleCount = campaign.reschedule_count || 0;
      const { error: updateCountError } = await supabase
        .from('campaigns')
        .update({
          reschedule_count: currentRescheduleCount + 1,
          last_rescheduled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', campaignId)
        .eq('organization_id', organizationId);

      if (updateCountError) {
        console.warn(`  ⚠️ Failed to update reschedule count:`, updateCountError.message);
        // Don't fail the reschedule if we can't update the count
      } else {
        console.log(`  ✅ Reschedule count updated: ${currentRescheduleCount} → ${currentRescheduleCount + 1}`);
      }

      return {
        success: true,
        message: `Rescheduled ${totalUpdated + totalInserted} emails (${totalUpdated} updated, ${totalInserted} new leads)`
      };

    } catch (error) {
      console.error(`  ❌ Error rescheduling campaign ${campaignId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Record reschedule result for monitoring
   */
  async recordRescheduleResult(
    totalCampaigns,
    successCount,
    skippedCount,
    errorCount,
    duration,
    errorMessage = null
  ) {
    try {
      // Get all organizations that have active campaigns
      const { data: organizations, error: orgError } = await supabase
        .from('campaigns')
        .select('organization_id')
        .eq('status', 'active');

      if (orgError) {
        console.warn('⚠️ Could not get organizations for reschedule history:', orgError.message);
        return;
      }

      // Get unique organization IDs
      const uniqueOrgs = [...new Set(organizations.map(org => org.organization_id))];

      // Record reschedule result for each organization
      for (const organizationId of uniqueOrgs) {
        const rescheduleResult = {
          organization_id: organizationId,
          operation_type: 'nightly_reschedule',
          started_at: new Date(Date.now() - duration).toISOString(),
          completed_at: new Date().toISOString(),
          duration_ms: duration,
          status: errorMessage ? 'failed' : 'completed',
          campaigns_total: totalCampaigns,
          campaigns_success: successCount,
          campaigns_skipped: skippedCount,
          campaigns_failed: errorCount,
          error_message: errorMessage,
          operation_details: {
            reschedule_time: `${String(this.rescheduleHour).padStart(2, '0')}:${String(this.rescheduleMinute).padStart(2, '0')}`,
            timestamp: new Date().toISOString()
          }
        };

        // Store in system_operations table (create if doesn't exist)
        await supabase
          .from('system_operations')
          .insert(rescheduleResult);
      }

      console.log(`📊 Recorded reschedule result for ${uniqueOrgs.length} organization(s)`);

    } catch (recordError) {
      // Don't fail the reschedule if we can't record the result
      console.warn('⚠️ Failed to record reschedule result:', recordError.message);
    }
  }

  /**
   * Get reschedule status for health checks
   */
  getRescheduleStatus() {
    return {
      isRunning: !!this.rescheduleInterval,
      isRescheduling: this.isRescheduling,
      scheduleTime: `${String(this.rescheduleHour).padStart(2, '0')}:${String(this.rescheduleMinute).padStart(2, '0')}`,
      nextRescheduleEstimate: this.rescheduleInterval ?
        this.calculateNextRescheduleTime().toISOString() : null
    };
  }

  /**
   * Calculate next reschedule time
   */
  calculateNextRescheduleTime() {
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(this.rescheduleHour, this.rescheduleMinute, 0, 0);

    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    return scheduledTime;
  }

  /**
   * Manual trigger for nightly reschedule (for testing)
   */
  async triggerManualReschedule() {
    if (this.isRescheduling) {
      throw new Error('Reschedule already in progress');
    }

    console.log('🔄 Manual nightly reschedule triggered');
    await this.rescheduleAllCampaigns();
  }
}

// Export singleton instance
module.exports = new NightlyRescheduleService();
