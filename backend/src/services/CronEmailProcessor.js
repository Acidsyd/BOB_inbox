const { createClient } = require('@supabase/supabase-js');
const OAuth2Service = require('./OAuth2Service');
const EmailService = require('./EmailService');
const UnifiedInboxService = require('./UnifiedInboxService');
const AccountRateLimitService = require('./AccountRateLimitService');
const BounceTrackingService = require('./BounceTrackingService');
const HealthCheckService = require('./HealthCheckService');
const TimezoneService = require('./TimezoneService');
const SpintaxParser = require('../utils/spintax');
const { toLocalTimestamp } = require('../utils/dateUtils.cjs');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

class CronEmailProcessor {
  constructor() {
    this.oauth2Service = new OAuth2Service();
    this.emailService = new EmailService();
    this.unifiedInboxService = new UnifiedInboxService();
    this.rateLimitService = new AccountRateLimitService();
    this.bounceTrackingService = new BounceTrackingService();
    this.healthCheckService = new HealthCheckService();
    this.isProcessing = false;
    
    // 🔄 Account rotation tracking - ensures fair distribution across accounts
    this.campaignAccountRotation = new Map(); // campaignId -> lastAccountIndex
    
    // 🚀 NEW: Global account usage tracking to prevent simultaneous usage across campaigns
    // Removed global account usage tracking - campaigns should run in parallel
    
    this.failureCount = 0;
    this.maxConsecutiveFailures = 5;
    this.isShuttingDown = false;
    this.processingStartTime = null;
    this.maxProcessingTime = 300000; // 5 minutes timeout
  }

  /**
   * Start the cron job processor with error resilience
   */
  start() {
    console.log('🚀 Starting Cron Email Processor...');
    
    // Add graceful shutdown handlers
    this.setupGracefulShutdown();
    
    // Process emails every minute with error recovery
    const intervalId = setInterval(async () => {
      if (this.isShuttingDown) {
        console.log('🛑 Shutting down, stopping email processing...');
        clearInterval(intervalId);
        return;
      }
      
      if (!this.isProcessing) {
        try {
          await this.processScheduledEmailsWithRecovery();
        } catch (error) {
          console.error('🚨 Critical error in cron interval:', error);
          await this.handleCriticalError(error);
        }
      } else {
        // Check for stuck processing
        await this.checkForStuckProcessing();
      }
    }, 60000); // 60 seconds
    
    // Also run immediately
    setTimeout(() => this.processScheduledEmailsWithRecovery(), 1000);
    
    console.log('✅ Cron Email Processor started - checking every minute');
  }

  /**
   * Main processing function
   */
  async processScheduledEmails() {
    if (this.isProcessing) {
      console.log('⏳ Email processing already in progress, skipping...');
      return;
    }

    this.isProcessing = true;
    console.log('🔍 Checking for scheduled emails to send...');

    try {
      // Record heartbeat to indicate cron processor is active
      await this.healthCheckService.recordCronHeartbeat();
      
      // Reset hourly counters if needed
      await this.rateLimitService.resetHourlyCounters();

      // Get pending emails
      const emailsToSend = await this.getPendingEmails();
      
      if (emailsToSend.length === 0) {
        console.log('📭 No emails to send at this time');
        return;
      }

      console.log(`📧 Found ${emailsToSend.length} emails to process`);

      // Group by organization for user isolation
      const emailsByOrg = this.groupBy(emailsToSend, 'organization_id');

      for (const [orgId, orgEmails] of Object.entries(emailsByOrg)) {
        console.log(`👤 Processing ${orgEmails.length} emails for organization ${orgId}`);
        await this.processOrganizationEmails(orgId, orgEmails);
      }

    } catch (error) {
      console.error('❌ Error in cron email processor:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Enhanced processing with error recovery and resilience
   */
  async processScheduledEmailsWithRecovery() {
    if (this.isProcessing) {
      console.log('⏳ Email processing already in progress, skipping...');
      return;
    }

    this.isProcessing = true;
    this.processingStartTime = Date.now();
    console.log('🔍 Checking for scheduled emails to send...');

    try {
      // Record heartbeat to indicate cron processor is active
      await this.healthCheckService.recordCronHeartbeat();
      
      // Reset hourly counters if needed
      await this.rateLimitService.resetHourlyCounters();

      // Get pending emails with retry
      const emailsToSend = await this.getPendingEmailsWithRetry();
      
      if (emailsToSend.length === 0) {
        console.log('📭 No emails to send at this time');
        this.failureCount = 0; // Reset failure count on successful processing
        return;
      }

      console.log(`📧 Found ${emailsToSend.length} emails to process`);

      // Group by organization for user isolation
      const emailsByOrg = this.groupBy(emailsToSend, 'organization_id');

      for (const [orgId, orgEmails] of Object.entries(emailsByOrg)) {
        if (this.isShuttingDown) {
          console.log('🛑 Shutdown requested, stopping organization processing...');
          break;
        }
        
        console.log(`👤 Processing ${orgEmails.length} emails for organization ${orgId}`);
        await this.processOrganizationEmailsWithErrorHandling(orgId, orgEmails);
      }
      
      // Reset failure count on successful completion
      this.failureCount = 0;
      console.log(`✅ Successfully processed ${emailsToSend.length} emails`);

    } catch (error) {
      this.failureCount++;
      console.error(`❌ Error in cron email processor (failure #${this.failureCount}):`, error);
      
      // Handle consecutive failures
      if (this.failureCount >= this.maxConsecutiveFailures) {
        console.error(`🚨 Maximum consecutive failures (${this.maxConsecutiveFailures}) reached!`);
        await this.handleMaxFailuresReached(error);
      }
      
      throw error; // Re-throw to trigger critical error handling
    } finally {
      this.isProcessing = false;
      this.processingStartTime = null;
    }
  }

  /**
   * Get emails ready to be sent with retry mechanism
   */
  async getPendingEmailsWithRetry(maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.getPendingEmails();
      } catch (error) {
        console.error(`❌ Attempt ${attempt}/${maxRetries} failed to get pending emails:`, error);
        
        if (attempt === maxRetries) {
          throw new Error(`Failed to get pending emails after ${maxRetries} attempts: ${error.message}`);
        }
        
        // Exponential backoff: 1s, 2s, 4s
        const delayMs = Math.pow(2, attempt - 1) * 1000;
        console.log(`⏳ Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  /**
   * Process organization emails with error isolation
   */
  async processOrganizationEmailsWithErrorHandling(organizationId, orgEmails) {
    try {
      await this.processOrganizationEmails(organizationId, orgEmails);
    } catch (error) {
      console.error(`❌ Error processing emails for organization ${organizationId}:`, error);
      
      // Don't let one org's failure stop others
      // Mark these emails as failed and move on
      await this.markEmailsAsFailed(orgEmails, error.message);
    }
  }

  /**
   * Mark emails as failed in database using batch operations
   */
  async markEmailsAsFailed(emails, errorMessage) {
    if (emails.length === 0) return;
    
    try {
      // Prepare batch update data
      const updates = emails.map(email => ({
        id: email.id,
        status: 'failed',
        error: errorMessage,
        attempts: (email.attempts || 0) + 1,
        updated_at: new Date().toISOString()
      }));

      // Use batch update for efficiency
      const { error } = await supabase
        .from('scheduled_emails')
        .upsert(updates, { 
          onConflict: 'id',
          ignoreDuplicates: false
        });

      if (error) {
        throw error;
      }

      console.log(`📝 Marked ${emails.length} emails as failed in batch`);
      
    } catch (batchError) {
      console.error(`❌ Batch update failed, falling back to individual updates:`, batchError);
      
      // Fallback to individual updates
      for (const email of emails) {
        try {
          await supabase
            .from('scheduled_emails')
            .update({
              status: 'failed',
              error: errorMessage,
              attempts: (email.attempts || 0) + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', email.id);
        } catch (dbError) {
          console.error(`❌ Failed to mark email ${email.id} as failed:`, dbError);
        }
      }
    }
  }

  /**
   * Check for stuck processing (timeout protection)
   */
  async checkForStuckProcessing() {
    if (this.processingStartTime) {
      const processingTime = Date.now() - this.processingStartTime;
      
      if (processingTime > this.maxProcessingTime) {
        console.error(`🚨 Processing stuck for ${processingTime}ms (max: ${this.maxProcessingTime}ms)!`);
        
        // Force reset processing flag
        this.isProcessing = false;
        this.processingStartTime = null;
        this.failureCount++;
        
        console.log('🔄 Forced reset of stuck processing flag');
      }
    }
  }

  /**
   * Handle maximum failures reached
   */
  async handleMaxFailuresReached(lastError) {
    console.error(`🚨 CRITICAL: Maximum consecutive failures reached!`);
    console.error(`🚨 Last error:`, lastError);
    
    // Reset failure count to prevent permanent shutdown
    this.failureCount = 0;
    
    // Wait longer before trying again (5 minutes)
    console.log('⏳ Waiting 5 minutes before attempting recovery...');
    await new Promise(resolve => setTimeout(resolve, 300000));
    
    console.log('🔄 Attempting automatic recovery...');
  }

  /**
   * Handle critical errors in the main interval
   */
  async handleCriticalError(error) {
    console.error('🚨 CRITICAL ERROR in cron interval:', error);
    
    // Ensure processing flag is reset
    this.isProcessing = false;
    this.processingStartTime = null;
    
    // Implement exponential backoff for critical errors
    const backoffMs = Math.min(60000 * Math.pow(2, this.failureCount), 300000); // Max 5 minutes
    console.log(`⏳ Critical error backoff: waiting ${backoffMs}ms before retry...`);
    
    await new Promise(resolve => setTimeout(resolve, backoffMs));
  }

  /**
   * Setup graceful shutdown handlers
   */
  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`🛑 Received ${signal}, initiating graceful shutdown...`);
      this.isShuttingDown = true;
      
      // Wait for current processing to complete (max 30 seconds)
      let waitTime = 0;
      const maxWaitTime = 30000;
      
      while (this.isProcessing && waitTime < maxWaitTime) {
        console.log(`⏳ Waiting for current processing to complete... (${waitTime}ms/${maxWaitTime}ms)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        waitTime += 1000;
      }
      
      if (this.isProcessing) {
        console.log('⏰ Timeout reached, forcing shutdown...');
      } else {
        console.log('✅ Graceful shutdown completed');
      }
      
      process.exit(0);
    };
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('uncaughtException', (error) => {
      console.error('🚨 Uncaught Exception:', error);
      shutdown('uncaughtException');
    });
    process.on('unhandledRejection', (reason, promise) => {
      console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
      shutdown('unhandledRejection');
    });
  }

  /**
   * Get emails ready to be sent with optimized query and intelligent batching
   */
  async getPendingEmails() {
    // Calculate dynamic batch size based on system load
    const batchSize = await this.calculateOptimalBatchSize();

    const { data: emails, error } = await supabase
      .from('scheduled_emails')
      .select(`
        id,
        campaign_id,
        organization_id,
        email_account_id,
        to_email,
        from_email,
        subject,
        content,
        send_at,
        status,
        attempts,
        message_id_header,
        thread_id
      `) // Only select needed columns instead of *
      .lte('send_at', new Date().toISOString()) // FIXED: Use UTC timestamp instead of new Date().toISOString()
      .eq('status', 'scheduled')
      .order('send_at', { ascending: true })
      .limit(batchSize);

    if (error) {
      console.error('❌ Error fetching pending emails:', error);
      return [];
    }

    if (!emails || emails.length === 0) {
      return [];
    }

    // Filter emails based on campaign status and sending hours configuration
    const emailsWithinSendingHours = await this.filterBySendingHours(emails);
    
    console.log(`📊 Query optimization: Retrieved ${emails.length} emails, ${emailsWithinSendingHours.length} from active campaigns within sending hours (batch size: ${batchSize})`);
    return emailsWithinSendingHours;
  }

  /**
   * Filter emails based on campaign status and sending hours configuration
   * CRITICAL: Only processes emails from active campaigns
   */
  async filterBySendingHours(emails) {
    if (!emails || emails.length === 0) return [];

    // Get unique campaign IDs
    const campaignIds = [...new Set(emails.map(e => e.campaign_id).filter(Boolean))];
    
    if (campaignIds.length === 0) {
      // No campaigns, allow all emails (might be one-off emails)
      return emails;
    }

    // Fetch campaign configurations and status
    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select('id, config, status')
      .in('id', campaignIds);

    if (error) {
      console.error('❌ Error fetching campaign configs:', error);
      // On error, allow emails to be sent rather than blocking
      return emails;
    }

    // Create a map of campaign_id to config and status
    const campaignConfigMap = {};
    const campaignStatusMap = {};
    const campaignTimezoneMap = {};
    const campaignActiveDaysMap = {};
    campaigns?.forEach(campaign => {
      campaignConfigMap[campaign.id] = campaign.config?.sendingHours || null;
      campaignStatusMap[campaign.id] = campaign.status;
      campaignTimezoneMap[campaign.id] = campaign.config?.timezone || 'UTC';
      campaignActiveDaysMap[campaign.id] = campaign.config?.activeDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    });
    const filteredEmails = emails.filter(email => {
      // If no campaign_id, allow the email
      if (!email.campaign_id) return true;

      // CRITICAL: Check if campaign is active
      const campaignStatus = campaignStatusMap[email.campaign_id];
      if (campaignStatus !== 'active') {
        console.log(`🚫 Skipping email ${email.id} from ${campaignStatus} campaign ${email.campaign_id}`);
        return false;
      }

      const campaignTimezone = campaignTimezoneMap[email.campaign_id];
      const activeDays = campaignActiveDaysMap[email.campaign_id];

      // Check if today is an active day (timezone-aware)
      const todayInCampaignTz = new Date().toLocaleDateString('en-US', {
        timeZone: campaignTimezone,
        weekday: 'long'
      }).toLowerCase();
      if (!activeDays.includes(todayInCampaignTz)) {
        console.log(`📅 Skipping email ${email.id} - ${todayInCampaignTz} not in active days [${activeDays.join(', ')}] for campaign ${email.campaign_id}`);
        return false;
      }

      const sendingHours = campaignConfigMap[email.campaign_id];

      // If no sending hours configured, allow all times
      if (!sendingHours || !sendingHours.start || !sendingHours.end) {
        return true;
      }

      const { start, end } = sendingHours;

      // Use TimezoneService for reliable business hours checking
      const isWithinHours = TimezoneService.isWithinBusinessHours(
        campaignTimezone,
        new Date(),
        { start, end }
      );

      if (!isWithinHours) {
        const currentTime = TimezoneService.convertToUserTimezone(new Date(), campaignTimezone, {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        console.log(`⏰ Email skipped - outside sending hours ${start}:00-${end}:00 in ${campaignTimezone} (current: ${currentTime})`);
      }

      return isWithinHours;
    });

    const skippedCount = emails.length - filteredEmails.length;
    if (skippedCount > 0) {
      // Show current time for different campaign timezones for debugging
      const timezoneExample = [...new Set(Object.values(campaignTimezoneMap))][0] || 'UTC';
      const currentHourExample = new Date().toLocaleString('en-US', {
        timeZone: timezoneExample,
        hour12: false,
        hour: 'numeric'
      });
      console.log(`⏰ Skipped ${skippedCount} emails due to sending hours restrictions (current hour in ${timezoneExample}: ${currentHourExample}:00)`);
    }

    return filteredEmails;
  }

  /**
   * Calculate optimal batch size based on system performance
   */
  async calculateOptimalBatchSize() {
    const baseSize = 100;
    const maxSize = 500;
    const minSize = 50;
    
    // Factor in current system load
    if (this.failureCount > 0) {
      // Reduce batch size if we've had failures
      const reductionFactor = Math.max(0.5, 1 - (this.failureCount * 0.1));
      return Math.max(minSize, Math.floor(baseSize * reductionFactor));
    }
    
    // Check if we're processing quickly (under 10 seconds last time)
    const processingTime = this.processingStartTime ? Date.now() - this.processingStartTime : 0;
    if (processingTime > 0 && processingTime < 10000) {
      // We're processing fast, can handle more
      return Math.min(maxSize, baseSize * 1.5);
    }
    
    return baseSize;
  }

  /**
   * Process emails for an organization using assigned email accounts with parallel campaign processing
   */
  async processOrganizationEmails(organizationId, orgEmails) {
    console.log(`🔄 Processing ${orgEmails.length} emails using assigned accounts`);

    // Campaigns process in parallel with their assigned accounts

    // 🔥 CRITICAL FIX: Group by CAMPAIGN first, then apply interval compliance per campaign
    const emailsByCampaign = this.groupBy(orgEmails, 'campaign_id');
    
    const campaignCount = Object.keys(emailsByCampaign).length;
    console.log(`📊 Found ${campaignCount} campaigns with pending emails`);

    // 🚀 ENHANCEMENT: Process campaigns in parallel with proper account staggering PER campaign
    const maxConcurrentCampaigns = Math.min(5, campaignCount); // Limit to 5 concurrent campaigns
    const campaignEntries = Object.entries(emailsByCampaign);
    
    console.log(`⚡ Processing up to ${maxConcurrentCampaigns} campaigns in parallel with account staggering`);

    // Process campaigns in parallel using Promise.allSettled
    const campaignPromises = campaignEntries.map(([campaignId, campaignEmails]) => 
      this.processCampaignEmailsWithIsolation(organizationId, campaignId, campaignEmails)
    );

    // Use Promise.allSettled to prevent one campaign failure from stopping others
    const results = await Promise.allSettled(campaignPromises);
    
    // Analyze results and log outcomes
    let successfulCampaigns = 0;
    let failedCampaigns = 0;
    
    results.forEach((result, index) => {
      const [campaignId] = campaignEntries[index];
      
      if (result.status === 'fulfilled') {
        successfulCampaigns++;
        console.log(`✅ Campaign ${campaignId.substring(0,8)}... completed successfully`);
      } else {
        failedCampaigns++;
        console.error(`❌ Campaign ${campaignId.substring(0,8)}... failed:`, result.reason);
      }
    });

    console.log(`📊 Campaign processing summary: ${successfulCampaigns} successful, ${failedCampaigns} failed`);
    
    // If more than half failed, this might indicate a systemic issue
    if (failedCampaigns > successfulCampaigns && campaignCount > 2) {
      console.warn(`⚠️ More than half of campaigns failed (${failedCampaigns}/${campaignCount}), possible systemic issue`);
    }
  }

  /**
   * Process campaign emails with error isolation wrapper
   */
  async processCampaignEmailsWithIsolation(organizationId, campaignId, campaignEmails) {
    const startTime = Date.now();
    
    try {
      console.log(`🎯 [${campaignId.substring(0,8)}...] Starting campaign processing with ${campaignEmails.length} emails`);
      
      await this.processCampaignEmails(organizationId, campaignId, campaignEmails);
      
      const processingTime = Date.now() - startTime;
      console.log(`🎯 [${campaignId.substring(0,8)}...] Completed in ${processingTime}ms`);
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`🎯 [${campaignId.substring(0,8)}...] Failed after ${processingTime}ms:`, error.message);
      
      // Mark campaign emails as failed and rethrow for Promise.allSettled
      try {
        await this.markEmailsAsFailed(campaignEmails, `Campaign processing failed: ${error.message}`);
      } catch (markFailedError) {
        console.error(`❌ Failed to mark campaign emails as failed:`, markFailedError);
      }
      
      throw error; // Rethrow to be caught by Promise.allSettled
    }
  }

  /**
   * Process emails for a specific campaign with SIMPLE account rotation (fixed)
   */
  async processCampaignEmails(organizationId, campaignId, campaignEmails) {
    // Group emails by their assigned email_account_id (respects campaign configuration)
    const emailsByAccount = this.groupBy(campaignEmails, 'email_account_id');
    
    const accountCount = Object.keys(emailsByAccount).length;
    console.log(`📊 Campaign has ${accountCount} assigned accounts for ${campaignEmails.length} emails`);

    // Get campaign configuration for proper interval handling
    const campaignConfig = await this.getCampaignConfig(campaignId);
    const sendingIntervalMinutes = campaignConfig?.sendingInterval || 15;
    const emailsPerHour = campaignConfig?.emailsPerHour || 10; // Default 10 emails/hour
    
    // Calculate minimum interval based on emailsPerHour limit
    const minIntervalMinutes = Math.ceil(60 / emailsPerHour); // 60 minutes / emails per hour
    const actualIntervalMinutes = Math.max(sendingIntervalMinutes, minIntervalMinutes);
    
    console.log(`⏱️ Campaign ${campaignId} SIMPLE ROTATION: Base interval ${sendingIntervalMinutes}min, ${emailsPerHour} emails/hour limit`);
    console.log(`⏱️ Using actual interval: ${actualIntervalMinutes} minutes (min: ${minIntervalMinutes}min for hourly limit)`);

    const accountEntries = Object.entries(emailsByAccount);

    // 🔄 SIMPLE ROTATION: Get next account in rotation
    const lastAccountIndex = this.campaignAccountRotation.get(campaignId) || -1;
    const currentAccountIndex = (lastAccountIndex + 1) % accountEntries.length;
    
    console.log(`🔄 Campaign ${campaignId}: Using account ${currentAccountIndex + 1}/${accountCount} (last used: ${lastAccountIndex})`);

    // Process ONLY the current account in rotation
    const [accountId, accountEmails] = accountEntries[currentAccountIndex];
    
    if (accountEmails.length === 0) {
      console.log(`📭 Campaign ${campaignId}: No emails for current account, skipping cycle`);
      return;
    }
      
    // Get account information
    const accountInfo = await this.getAccountInfo(accountId, organizationId);
    
    if (!accountInfo) {
      console.log(`❌ Campaign ${campaignId}: Account ${accountId} not found, rescheduling emails`);
      const rescheduleTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour later
      await this.rescheduleEmails(accountEmails, rescheduleTime);
      return;
    }
    
    console.log(`🚀 Campaign ${campaignId}: Processing account ${currentAccountIndex + 1}/${accountCount} (${accountInfo.email})`);
    
    // Check rate limits
    const rateLimitInfo = await this.rateLimitService.checkAccountAvailability(accountId, organizationId);
    
    if (!rateLimitInfo.canSend) {
      console.log(`⏰ Campaign ${campaignId}: Account ${currentAccountIndex + 1}/${accountCount} reached limits - rescheduling`);
      
      
      await this.rescheduleEmails(accountEmails, rateLimitInfo.nextAvailableTime || new Date(Date.now() + 60 * 60 * 1000));
      return;
    }
    
    // Send 1 email from this account and reschedule the rest
    await this.processAccountEmails(accountInfo, accountEmails, organizationId);
    
    // Save rotation state
    this.campaignAccountRotation.set(campaignId, currentAccountIndex);
    console.log(`🔄 Campaign ${campaignId}: Saved rotation state - account ${currentAccountIndex} used`);

    // 🚨 CRITICAL FIX: Get the last email sent time to calculate proper reschedule time
    const lastEmailSentTime = await this.getLastEmailSentTime(campaignId, organizationId);
    const baseTime = lastEmailSentTime || new Date(); // Use last send time or current time if no emails sent

    // 🔄 PERFECT ROTATION: Reschedule emails in round-robin order across all accounts
    // This ensures perfect account rotation: Acc1, Acc2, Acc3, ..., Acc8, Acc1, Acc2, ...
    await this.rescheduleEmailsWithPerfectRotation(
      accountEntries,
      currentAccountIndex,
      baseTime,
      actualIntervalMinutes
    );
  }

  /**
   * Distribute emails across available accounts for balanced load
   */
  distributeEmailsAcrossAccounts(emails, availableAccounts) {
    const distribution = new Map();
    
    // Initialize distribution map
    availableAccounts.forEach(account => {
      distribution.set(account, []);
    });

    // Distribute emails in round-robin fashion
    emails.forEach((email, index) => {
      const accountIndex = index % availableAccounts.length;
      const selectedAccount = availableAccounts[accountIndex];
      distribution.get(selectedAccount).push(email);
    });

    return distribution;
  }

  /**
   * Process emails for a specific account with rate limiting
   */
  async processAccountEmails(accountInfo, accountEmails, organizationId) {
    if (accountEmails.length === 0) return;

    const accountId = accountInfo.id;
    const fromEmail = accountInfo.email;
    const campaignId = accountEmails[0].campaign_id;
    console.log(`📨 Processing ${accountEmails.length} emails for account ${fromEmail}`);

    // Get campaign configuration to respect sending intervals
    const campaignConfig = await this.getCampaignConfig(campaignId);
    const sendingIntervalMinutes = campaignConfig?.sendingInterval || 15; // Default 15 minutes
    const emailsPerHour = campaignConfig?.emailsPerHour || 4; // Default 4 emails/hour

    // Calculate minimum interval based on emailsPerHour limit
    const minIntervalMinutes = Math.ceil(60 / emailsPerHour); // 60 minutes / emails per hour
    const actualIntervalMinutes = Math.max(sendingIntervalMinutes, minIntervalMinutes);

    console.log(`⏱️ Campaign ${campaignId} config: ${sendingIntervalMinutes} min interval, ${emailsPerHour} emails/hour limit`);
    console.log(`⏱️ Using actual interval: ${actualIntervalMinutes} minutes (min: ${minIntervalMinutes}min for hourly limit)`);

    // 🚨 CRITICAL FIX: Check when the last email was sent for this campaign
    const lastEmailSentTime = await this.getLastEmailSentTime(campaignId, organizationId);
    const timeSinceLastEmail = lastEmailSentTime ? Date.now() - lastEmailSentTime.getTime() : Infinity;
    const requiredIntervalMs = actualIntervalMinutes * 60 * 1000;

    console.log(`🕒 Last email sent: ${lastEmailSentTime ? lastEmailSentTime.toISOString() : 'NEVER'}`);
    console.log(`🕒 Time since last: ${timeSinceLastEmail === Infinity ? 'N/A' : Math.round(timeSinceLastEmail / 60000)} minutes`);
    console.log(`🕒 Required interval: ${actualIntervalMinutes} minutes`);

    // 🚨 CRITICAL: If not enough time has passed, reschedule ALL emails
    if (timeSinceLastEmail < requiredIntervalMs) {
      const timeToWait = requiredIntervalMs - timeSinceLastEmail;
      const rescheduleTime = new Date(Date.now() + timeToWait);
      console.log(`⏰ Campaign interval not reached! Rescheduling ${accountEmails.length} emails for ${Math.round(timeToWait / 60000)} minutes from now`);

      await this.rescheduleEmailsWithInterval(accountEmails, rescheduleTime, actualIntervalMinutes);
      return; // Don't send any emails yet
    }

    // 🔥 CRITICAL FIX: Check rate limits for ALL account types (OAuth2 and SMTP)
    let emailsToSendNow, emailsToReschedule;

    // Check account availability and daily/hourly limits for all account types
    const rateLimitInfo = await this.rateLimitService.checkAccountAvailability(accountId, organizationId);

    if (!rateLimitInfo.canSend) {
      console.log(`⏰ Account ${fromEmail} reached limits. Reason: ${rateLimitInfo.reason}`);
      console.log(`📊 Daily: ${rateLimitInfo.dailyRemaining || 0}/${rateLimitInfo.dailyLimit || 'N/A'}, Hourly: ${rateLimitInfo.hourlyRemaining || 0}/${rateLimitInfo.hourlyLimit || 'N/A'}`);

      // Reschedule all emails for when account becomes available again
      await this.rescheduleEmailsWithInterval(accountEmails, rateLimitInfo.nextAvailableTime || new Date(Date.now() + 60 * 60 * 1000), actualIntervalMinutes);
      return;
    }

    // 🔥 CRITICAL FIX: Always send only 1 email per campaign interval
    // This ensures proper interval compliance regardless of account type
    console.log(`🔑 ${accountInfo.type === 'oauth2' ? 'OAuth2' : 'SMTP'} account - respecting limits: ${rateLimitInfo.dailyRemaining || 0}/${rateLimitInfo.dailyLimit || 'N/A'} daily, ${rateLimitInfo.hourlyRemaining || 0}/${rateLimitInfo.hourlyLimit || 'N/A'} hourly`);

    // ALWAYS send exactly 1 email to respect campaign interval timing
    emailsToSendNow = accountEmails.slice(0, 1); // Only first email
    emailsToReschedule = accountEmails.slice(1);  // Rest for next interval

    console.log(`✅ Sending ${emailsToSendNow.length} emails, rescheduling ${emailsToReschedule.length}`);

    // 🚨 CRITICAL FIX: Calculate reschedule time based on WHEN THIS EMAIL WILL BE SENT
    if (emailsToReschedule.length > 0) {
      const emailSendTime = new Date(); // Current time when email will be sent
      const nextEmailTime = new Date(emailSendTime.getTime() + (actualIntervalMinutes * 60 * 1000)); // Next interval

      console.log(`🚨 FIXED RESCHEDULE: Next email scheduled for ${nextEmailTime.toISOString()} (${actualIntervalMinutes} min from send time)`);
      await this.rescheduleEmailsWithInterval(emailsToReschedule, nextEmailTime, actualIntervalMinutes);
    }

    // Send allowed emails
    for (const email of emailsToSendNow) {
      // Update email with correct account info
      email.email_account_id = accountId;
      email.from_email = fromEmail;
      
      // 🔥 NEW: Check if we should stop sending due to replies (stopOnReply)
      if (await this.shouldStopOnReply(email, campaignConfig, organizationId)) {
        console.log(`🛑 Skipping email ${email.id} to ${email.to_email} - lead has replied (stopOnReply enabled)`);
        await this.updateEmailStatus(email.id, 'skipped', null, 'Lead replied - campaign paused for this contact');
        continue;
      }
      
      // 🚫 NEW: Check if lead has unsubscribed
      if (await this.isLeadUnsubscribed(email.to_email, organizationId)) {
        console.log(`🚫 Skipping email ${email.id} to ${email.to_email} - lead has unsubscribed`);
        await this.updateEmailStatus(email.id, 'skipped', null, 'Lead has unsubscribed');
        continue;
      }
      
      const success = await this.sendSingleEmail(email, organizationId);
      
      // Record usage only if email was successfully sent
      if (success) {
        await this.rateLimitService.recordEmailSent(accountId, organizationId, 1);
      }
    }
  }

  /**
   * Send a single email
   * @returns {Promise<boolean>} Success status
   */
  async sendSingleEmail(email, organizationId) {
    console.log(`📤 Sending email ${email.id}: ${email.subject} to ${email.to_email}`);

    try {
      // Update status to sending
      await this.updateEmailStatus(email.id, 'sending');

      // Get campaign configuration for unsubscribe and tracking settings
      const campaignConfig = await this.getCampaignConfig(email.campaign_id);
      const includeUnsubscribe = campaignConfig?.includeUnsubscribe || false;
      const trackOpens = campaignConfig?.trackOpens || false;
      const trackClicks = campaignConfig?.trackClicks || false;

      // ✅ Use pre-processed content from scheduled_emails table
      // Spintax and variable substitution already done during campaign creation
      const processedSubject = email.subject;
      const processedContent = email.content;

      console.log(`✅ Using pre-processed content for ${email.to_email} (spintax & variables already substituted)`);

      // Try OAuth2 first, then SMTP fallback
      const useOAuth2 = await this.shouldUseOAuth2(email.from_email, organizationId);

      let result;
      // Always use EmailService for consistent tracking
      console.log('📨 Sending via EmailService with tracking');
      result = await this.emailService.sendEmail({
        accountId: email.email_account_id,
        organizationId: organizationId,
        to: email.to_email,
        subject: processedSubject,
        html: processedContent,
        campaignId: email.campaign_id,
        includeUnsubscribe: includeUnsubscribe,
        trackOpens: trackOpens,
        trackClicks: trackClicks,
        trackingToken: email.tracking_token,
        scheduledEmailId: email.id
      });

      if (result.success) {
        await this.updateEmailStatus(email.id, 'sent', result.messageId, null, result.actualMessageId, result.threadId);
        console.log(`✅ Email ${email.id} sent successfully - MessageID: ${result.messageId}, ActualMessageID: ${result.actualMessageId || 'N/A'}`);

        // 🔥 NEW: Ingest sent email into unified inbox system
        try {
          await this.ingestSentEmailIntoUnifiedInbox(email, result, organizationId);
        } catch (unifiedInboxError) {
          console.error('⚠️ Error ingesting sent email into unified inbox (non-fatal):', unifiedInboxError);
          // Don't fail the email sending if unified inbox fails
        }

        return true; // Email sent successfully
      } else {
        // Check if the failure was due to a bounce
        if (result.bounceInfo?.isBounce) {
          console.log(`📊 Email ${email.id} bounced: ${result.bounceInfo.bounceType} bounce`);
          
          // Record the bounce
          try {
            const bounceResult = await this.bounceTrackingService.recordBounce({
              provider: result.provider || 'unknown',
              bounceType: result.bounceInfo.bounceType,
              bounceCode: result.bounceInfo.bounceCode,
              bounceReason: result.bounceInfo.bounceReason,
              recipientEmail: email.to_email
            }, email.id, organizationId);
            
            if (bounceResult.shouldPause) {
              console.log(`🚨 Campaign auto-paused due to high bounce rate`);
            }
            
          } catch (bounceError) {
            console.error('⚠️ Error recording bounce (non-fatal):', bounceError.message);
            // Don't fail the email processing if bounce recording fails
          }
          
          await this.updateEmailStatus(email.id, 'bounced', null, result.error);
        } else {
          await this.updateEmailStatus(email.id, 'failed', null, result.error);
        }
        
        console.error(`❌ Email ${email.id} failed:`, result.error);
        return false; // Email failed to send
      }

    } catch (error) {
      await this.updateEmailStatus(email.id, 'failed', null, error.message);
      console.error(`❌ Email ${email.id} error:`, error.message);
      return false; // Email failed to send
    }
  }

  /**
   * Check if account should use OAuth2
   */
  async shouldUseOAuth2(email, organizationId) {
    try {
      const { data: tokenData } = await supabase
        .from('oauth2_tokens')
        .select('id')
        .eq('email', email)
        .eq('organization_id', organizationId)
        .eq('status', 'linked_to_account')
        .single();

      return !!tokenData;
    } catch {
      return false;
    }
  }


  /**
   * Update email status in database
   */
  async updateEmailStatus(emailId, status, messageId = null, errorMessage = null, actualMessageId = null, threadId = null) {
    const updateData = {
      status: status,
      updated_at: new Date().toISOString()
    };

    if (status === 'sent') {
      updateData.sent_at = new Date().toISOString();
      if (messageId) updateData.message_id = messageId;
      if (actualMessageId) updateData.message_id_header = actualMessageId;
      if (threadId) updateData.thread_id = threadId;
    }

    if (errorMessage) {
      updateData.error_message = errorMessage;
      updateData.attempts = await this.incrementAttempts(emailId);
    }

    const { error } = await supabase
      .from('scheduled_emails')
      .update(updateData)
      .eq('id', emailId);

    if (error) {
      console.error('❌ Error updating email status:', error);
    }
  }

  /**
   * Reschedule emails to a later time
   */
  async rescheduleEmails(emails, newSendTime) {
    const emailIds = emails.map(e => e.id);
    
    const { error } = await supabase
      .from('scheduled_emails')
      .update({
        send_at: newSendTime.toISOString(),
        status: 'scheduled'
      })
      .in('id', emailIds);

    if (error) {
      console.error('❌ Error rescheduling emails:', error);
    } else {
      console.log(`⏰ Rescheduled ${emailIds.length} emails to ${newSendTime.toISOString()}`);
    }
  }

  /**
   * Reschedule emails with proper intervals using optimized batch operations
   */
  async rescheduleEmailsWithInterval(emails, baseTime, intervalMinutes) {
    console.log(`⏱️ Rescheduling ${emails.length} emails with ${intervalMinutes} minute intervals`);
    
    if (emails.length === 0) return;
    
    // Use batch processing for better performance
    const batchSize = 50; // Process in batches of 50
    
    for (let batchStart = 0; batchStart < emails.length; batchStart += batchSize) {
      const batch = emails.slice(batchStart, batchStart + batchSize);
      
      try {
        await this.rescheduleEmailBatch(batch, baseTime, intervalMinutes, batchStart);
      } catch (error) {
        console.error(`❌ Error processing batch starting at ${batchStart}:`, error);
        
        // Fallback to individual updates for this batch
        await this.rescheduleEmailsIndividually(batch, baseTime, intervalMinutes, batchStart);
      }
    }
  }

  /**
   * Reschedule a batch of emails using efficient batch update
   */
  async rescheduleEmailBatch(emails, baseTime, intervalMinutes, startIndex) {
    console.log(`🔄 Rescheduling batch of ${emails.length} emails with ${intervalMinutes}-minute intervals`);
    
    // Process batch updates individually since Supabase doesn't support batch UPDATE with different values
    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      const rescheduleTime = new Date(baseTime.getTime() + ((startIndex + i) * intervalMinutes * 60 * 1000));
      
      const { error } = await supabase
        .from('scheduled_emails')
        .update({
          send_at: rescheduleTime.toISOString(),
          status: 'scheduled',
          updated_at: new Date().toISOString()
        })
        .eq('id', email.id);

      if (error) {
        console.error(`❌ Failed to reschedule email ${email.id}:`, error.message);
        throw new Error(`Failed to reschedule email ${email.id}: ${error.message}`);
      }

      console.log(`⏰ Email ${email.id.substring(0, 8)}... rescheduled to ${rescheduleTime.toISOString()}`);
    }

    console.log(`⏰ Successfully rescheduled batch of ${emails.length} emails`);
  }

  /**
   * Fallback method for individual email rescheduling
   */
  async rescheduleEmailsIndividually(emails, baseTime, intervalMinutes, startIndex) {
    console.log(`🔄 Falling back to individual updates for ${emails.length} emails`);
    
    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      const rescheduleTime = new Date(baseTime.getTime() + ((startIndex + i) * intervalMinutes * 60 * 1000));
      
      try {
        const { error } = await supabase
          .from('scheduled_emails')
          .update({
            send_at: rescheduleTime.toISOString(),
            status: 'scheduled',
            updated_at: new Date().toISOString()
          })
          .eq('id', email.id);

        if (error) {
          console.error(`❌ Error rescheduling email ${email.id}:`, error);
        } else {
          console.log(`⏰ Email ${email.id} rescheduled to ${toLocalTimestamp(rescheduleTime)}`);
        }
      } catch (error) {
        console.error(`❌ Failed to reschedule email ${email.id}:`, error);
      }
    }
  }

  /**
   * Get campaign configuration
   */
  async getCampaignConfig(campaignId) {
    try {
      const { data: campaign, error } = await supabase
        .from('campaigns')
        .select('config')
        .eq('id', campaignId)
        .single();

      if (error || !campaign) {
        console.error('❌ Failed to get campaign config:', error);
        return null;
      }

      return campaign.config;
    } catch (error) {
      console.error('❌ Error getting campaign config:', error);
      return null;
    }
  }

  /**
   * Get the last email sent time for a campaign to enforce proper intervals
   */
  async getLastEmailSentTime(campaignId, organizationId) {
    try {
      const { data: lastEmail, error } = await supabase
        .from('scheduled_emails')
        .select('sent_at')
        .eq('campaign_id', campaignId)
        .eq('organization_id', organizationId)
        .eq('status', 'sent')
        .order('sent_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        // PGRST116 means no rows returned (no emails sent yet)
        if (error.code === 'PGRST116') {
          return null; // No emails sent yet for this campaign
        }
        console.error(`❌ Error getting last email sent time for campaign ${campaignId}:`, error);
        return null;
      }

      return lastEmail?.sent_at ? new Date(lastEmail.sent_at) : null;
    } catch (error) {
      console.error(`❌ Error in getLastEmailSentTime for campaign ${campaignId}:`, error);
      return null;
    }
  }

  /**
   * Increment attempt counter
   */
  async incrementAttempts(emailId) {
    const { data } = await supabase
      .from('scheduled_emails')
      .select('attempts')
      .eq('id', emailId)
      .single();

    return (data?.attempts || 0) + 1;
  }


  /**
   * Ingest sent email into unified inbox system
   */
  async ingestSentEmailIntoUnifiedInbox(email, result, organizationId) {
    try {
      console.log(`📬 Ingesting sent email into unified inbox: ${email.subject} to ${email.to_email}`);

      // Prepare email data for unified inbox
      const emailData = {
        message_id_header: result.actualMessageId || result.messageId, // Use actual Message-ID header if available
        thread_id: result.threadId,
        from_email: email.from_email,
        to_email: email.to_email,
        subject: email.subject,
        content_html: email.content,
        content_plain: (email.content || '').replace(/<[^>]*>/g, ''),
        sent_at: new Date().toISOString(),
        campaign_id: email.campaign_id,
        lead_id: email.lead_id,
        scheduled_email_id: email.id,
        email_account_id: email.email_account_id,
        organization_id: organizationId,
        provider: result.provider || 'gmail'
      };

      // Ingest as sent email
      const inboxResult = await this.unifiedInboxService.ingestEmail(emailData, 'sent');
      
      console.log(`✅ Sent email ingested into unified inbox - Conversation: ${inboxResult.conversation.id}`);
      return inboxResult;

    } catch (error) {
      console.error('❌ Error ingesting sent email into unified inbox:', error);
      throw error;
    }
  }

  /**
   * Get account information from OAuth2 or email_accounts table
   */
  async getAccountInfo(accountId, organizationId) {
    try {
      // First try OAuth2 accounts (preferred)
      const { data: oauth2Account, error: oauth2Error } = await supabase
        .from('oauth2_tokens')
        .select('id, email, status')
        .eq('id', accountId)
        .eq('organization_id', organizationId)
        .single();
      
      if (oauth2Account && oauth2Account.status === 'linked_to_account') {
        return {
          id: oauth2Account.id,
          email: oauth2Account.email,
          type: 'oauth2',
          status: oauth2Account.status
        };
      }
      
      // Fallback to email_accounts table
      const { data: emailAccount, error: emailError } = await supabase
        .from('email_accounts')
        .select('id, email, provider, status')
        .eq('id', accountId)
        .eq('organization_id', organizationId)
        .single();
      
      if (emailAccount && emailAccount.status === 'active') {
        return {
          id: emailAccount.id,
          email: emailAccount.email,
          type: 'smtp',
          provider: emailAccount.provider,
          status: emailAccount.status
        };
      }
      
      return null;
    } catch (error) {
      console.error(`❌ Error fetching account info for ${accountId}:`, error);
      return null;
    }
  }

  /**
   * Check if we should stop sending emails to a lead due to replies
   * @param {Object} email - The scheduled email
   * @param {Object} campaignConfig - Campaign configuration
   * @param {string} organizationId - Organization ID
   * @returns {Promise<boolean>} True if we should stop sending
   */
  async shouldStopOnReply(email, campaignConfig, organizationId) {
    try {
      // Only apply stopOnReply logic if the setting is enabled in campaign config
      if (!campaignConfig?.stopOnReply) {
        return false;
      }
      
      // Only stop follow-up emails, not the initial email
      if (!email.is_follow_up) {
        return false;
      }
      
      console.log(`🔍 Checking for replies from lead ${email.to_email} in campaign ${email.campaign_id}`);
      
      // Check if there are any replies for this lead in this campaign
      const { data: replies, error } = await supabase
        .from('email_replies')
        .select('id, reply_message_id, replied_at, from_email')
        .eq('campaign_id', email.campaign_id)
        .eq('from_email', email.to_email)
        .eq('organization_id', organizationId)
        .limit(1);
      
      if (error) {
        console.error(`❌ Error checking replies for lead ${email.to_email}:`, error);
        return false; // Continue sending if we can't check replies
      }
      
      // If we found any replies, stop sending
      if (replies && replies.length > 0) {
        console.log(`✅ Found ${replies.length} reply(s) from lead ${email.to_email} - stopping further emails`);
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error(`❌ Error in shouldStopOnReply for email ${email.id}:`, error);
      return false; // Continue sending if there's an error
    }
  }

  /**
   * Check if a lead has unsubscribed from the organization
   * @param {string} leadEmail - Lead email address
   * @param {string} organizationId - Organization ID
   * @returns {Promise<boolean>} True if lead has unsubscribed
   */
  async isLeadUnsubscribed(leadEmail, organizationId) {
    try {
      console.log(`🔍 Checking if lead ${leadEmail} has unsubscribed`);
      
      // Check if lead exists in unsubscribes table
      const { data: unsubscribeRecord, error } = await supabase
        .from('unsubscribes')
        .select('id, unsubscribed_at, source')
        .eq('email', leadEmail)
        .eq('organization_id', organizationId)
        .single();
      
      if (error) {
        // PGRST116 means no rows returned (not unsubscribed)
        if (error.code === 'PGRST116') {
          return false; // Lead has not unsubscribed
        }
        console.error(`❌ Error checking unsubscribe status for lead ${leadEmail}:`, error);
        return false; // Continue sending if we can't check status
      }
      
      // If we found an unsubscribe record, the lead has unsubscribed
      if (unsubscribeRecord) {
        console.log(`✅ Lead ${leadEmail} unsubscribed on ${unsubscribeRecord.unsubscribed_at} via ${unsubscribeRecord.source}`);
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error(`❌ Error in isLeadUnsubscribed for lead ${leadEmail}:`, error);
      return false; // Continue sending if there's an error
    }
  }

  /**
   * Check if it's this account's turn to send based on staggered rotation and timing
   */
  async isAccountTurnToSend(campaignId, accountIndex, staggerMinutes) {
    // Get current time in minutes since midnight for consistent timing calculations
    const now = new Date();
    const currentMinuteOfDay = (now.getHours() * 60) + now.getMinutes();
    
    // Get the campaign's sending interval
    const campaignConfig = await this.getCampaignConfig(campaignId);
    const sendingIntervalMinutes = campaignConfig?.sendingInterval || 15;
    
    // Calculate the time slot for this account within the interval cycle
    // Each account gets a specific time slot: Account 0 at 0min, Account 1 at stagger offset, etc.
    const accountTimeSlot = accountIndex * staggerMinutes;
    
    // Check if we're within this account's time window (allow 2-minute window for processing)
    const intervalPosition = currentMinuteOfDay % sendingIntervalMinutes;
    const timeWindow = 2; // 2-minute window
    
    const isWithinTimeWindow = 
      intervalPosition >= accountTimeSlot && 
      intervalPosition < (accountTimeSlot + timeWindow);
    
    console.log(`🕐 Campaign ${campaignId.substring(0,8)}: Account ${accountIndex} time check - Current: ${intervalPosition}min, Slot: ${accountTimeSlot}min, Window: ${isWithinTimeWindow}`);
    
    return isWithinTimeWindow;
  }

  /**
   * Reschedule emails with account-specific staggered intervals
   */
  async rescheduleEmailsWithStaggeredInterval(emails, baseTime, intervalMinutes, accountIndex, totalAccounts) {
    if (emails.length === 0) return;
    
    // Calculate this account's specific stagger offset
    const staggerOffsetMinutes = Math.floor(intervalMinutes / Math.max(totalAccounts, 1));
    const accountStaggerTime = new Date(baseTime.getTime() + (accountIndex * staggerOffsetMinutes * 60 * 1000));
    
    console.log(`⏰ Rescheduling ${emails.length} emails for account ${accountIndex + 1}/${totalAccounts} with stagger +${accountIndex * staggerOffsetMinutes}min`);
    
    // Use the existing rescheduleEmailsWithInterval method with the staggered time
    await this.rescheduleEmailsWithInterval(emails, accountStaggerTime, intervalMinutes);
  }

  /**
   * Reschedule emails with perfect round-robin account rotation
   * This ensures Account 1 -> Account 2 -> Account 3 -> ... -> Account N -> Account 1 pattern
   */
  async rescheduleEmailsWithPerfectRotation(accountEntries, currentAccountIndex, baseTime, intervalMinutes) {
    const totalAccounts = accountEntries.length;

    if (totalAccounts === 0) {
      console.log('⚠️ No accounts found for rescheduling');
      return;
    }

    // Collect all emails that need rescheduling (from all accounts)
    let allEmailsToSchedule = [];

    // Start from the next account after current
    for (let offset = 1; offset <= totalAccounts; offset++) {
      const accountIndex = (currentAccountIndex + offset) % totalAccounts;
      const [accountId, accountEmails] = accountEntries[accountIndex];

      if (accountEmails && accountEmails.length > 0) {
        // Add each email with its account index for rotation tracking
        accountEmails.forEach(email => {
          allEmailsToSchedule.push({
            email: email,
            accountId: accountId,
            accountIndex: accountIndex
          });
        });
      }
    }

    if (allEmailsToSchedule.length === 0) {
      console.log('✅ No emails to reschedule - all accounts processed');
      return;
    }

    console.log(`🔄 PERFECT ROTATION: Rescheduling ${allEmailsToSchedule.length} emails across ${totalAccounts} accounts`);
    console.log(`⏱️  Starting at ${baseTime.toISOString()} with ${intervalMinutes}min intervals`);

    // Sort emails by account index to ensure perfect rotation order
    // Then by their original send_at time to preserve relative ordering within accounts
    allEmailsToSchedule.sort((a, b) => {
      // First sort by rotating account index (starting from currentAccountIndex + 1)
      const aRotationOrder = (a.accountIndex - currentAccountIndex - 1 + totalAccounts) % totalAccounts;
      const bRotationOrder = (b.accountIndex - currentAccountIndex - 1 + totalAccounts) % totalAccounts;

      if (aRotationOrder !== bRotationOrder) {
        return aRotationOrder - bRotationOrder;
      }

      // Within same account, maintain original order
      return new Date(a.email.send_at) - new Date(b.email.send_at);
    });

    // Reschedule emails with perfect intervals
    const batchSize = 50;
    let processedCount = 0;

    for (let batchStart = 0; batchStart < allEmailsToSchedule.length; batchStart += batchSize) {
      const batch = allEmailsToSchedule.slice(batchStart, Math.min(batchStart + batchSize, allEmailsToSchedule.length));

      try {
        for (let i = 0; i < batch.length; i++) {
          const globalIndex = batchStart + i;
          const item = batch[i];
          const rescheduleTime = new Date(baseTime.getTime() + ((globalIndex + 1) * intervalMinutes * 60 * 1000));

          const { error } = await supabase
            .from('scheduled_emails')
            .update({
              send_at: rescheduleTime.toISOString(),
              status: 'scheduled',
              updated_at: new Date().toISOString()
            })
            .eq('id', item.email.id);

          if (error) {
            console.error(`❌ Failed to reschedule email ${item.email.id}:`, error.message);
          } else {
            processedCount++;

            // Log first 10 and every 50th to show rotation pattern
            if (globalIndex < 10 || globalIndex % 50 === 0) {
              const accountShort = item.accountId.substring(0, 8);
              console.log(`✅ [${globalIndex + 1}/${allEmailsToSchedule.length}] Email scheduled at ${rescheduleTime.toISOString()} -> Account ...${accountShort}`);
            }
          }
        }
      } catch (error) {
        console.error(`❌ Error processing batch at index ${batchStart}:`, error);
      }
    }

    console.log(`✅ PERFECT ROTATION COMPLETE: ${processedCount}/${allEmailsToSchedule.length} emails rescheduled`);

    // Log rotation summary
    const accountDistribution = {};
    allEmailsToSchedule.forEach(item => {
      const accountShort = item.accountId.substring(0, 8);
      accountDistribution[accountShort] = (accountDistribution[accountShort] || 0) + 1;
    });

    console.log('📊 Distribution across accounts:');
    Object.entries(accountDistribution)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([accountShort, count]) => {
        console.log(`   ...${accountShort}: ${count} emails`);
      });
  }

  /**
   * Utility function to group array by key
   */
  groupBy(array, key) {
    return array.reduce((result, item) => {
      const group = item[key];
      if (!result[group]) {
        result[group] = [];
      }
      result[group].push(item);
      return result;
    }, {});
  }
}

module.exports = CronEmailProcessor;
