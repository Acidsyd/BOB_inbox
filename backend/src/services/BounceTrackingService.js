const { createClient } = require('@supabase/supabase-js');

/**
 * BounceTrackingService
 * Handles email bounce detection, recording, and campaign protection
 * Supports Gmail API, Microsoft Graph API, and SMTP bounce detection
 */
class BounceTrackingService {
  constructor() {
    this.BOUNCE_RATE_THRESHOLD = 5.0; // 5% bounce rate triggers auto-pause
    this.MIN_EMAILS_FOR_AUTO_PAUSE = 10; // Minimum emails sent before auto-pause
    
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables are required');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  /**
   * Record a bounce event in the database
   * @param {Object} bounceData - Bounce information
   * @param {string} scheduledEmailId - ID of the scheduled email that bounced
   * @param {string} organizationId - Organization ID for data isolation
   * @returns {Promise<Object>} Bounce record and campaign status
   */
  async recordBounce(bounceData, scheduledEmailId, organizationId) {
    console.log(`📊 Recording bounce for email ${scheduledEmailId}: ${bounceData.bounceType} bounce`);
    
    try {
      // 1. Get scheduled email details for campaign and lead information
      const { data: scheduledEmail, error: emailError } = await this.supabase
        .from('scheduled_emails')
        .select('id, campaign_id, lead_id, to_email, message_id_header')
        .eq('id', scheduledEmailId)
        .eq('organization_id', organizationId)
        .single();

      if (emailError || !scheduledEmail) {
        console.error('❌ Error fetching scheduled email for bounce recording:', emailError);
        throw new Error(`Scheduled email not found: ${scheduledEmailId}`);
      }

      // 2. Record bounce in email_bounces table
      const bounceRecord = {
        scheduled_email_id: scheduledEmailId,
        campaign_id: scheduledEmail.campaign_id,
        lead_id: scheduledEmail.lead_id,
        provider: bounceData.provider || 'unknown',
        bounce_type: bounceData.bounceType || 'unknown',
        bounce_code: bounceData.bounceCode?.toString(),
        bounce_reason: bounceData.bounceReason,
        recipient_email: bounceData.recipientEmail || scheduledEmail.to_email,
        organization_id: organizationId
      };
      
      // Include message_id_header for precise email correlation
      if (scheduledEmail.message_id_header) {
        bounceRecord.message_id_header = scheduledEmail.message_id_header;
      }

      const { data: bounce, error: bounceError } = await this.supabase
        .from('email_bounces')
        .insert(bounceRecord)
        .select()
        .single();

      if (bounceError) {
        console.error('❌ Error recording bounce:', bounceError);
        throw new Error(`Failed to record bounce: ${bounceError.message}`);
      }

      console.log(`✅ Bounce recorded: ${bounce.id} (${bounceData.bounceType})`);

      // 3. Update scheduled email status to 'failed' (bounced emails are marked as failed)
      await this.updateScheduledEmailStatus(scheduledEmailId, 'failed', bounceData);

      // 4. Mark lead as bounced if hard bounce
      if (bounceData.bounceType === 'hard' && scheduledEmail.lead_id) {
        await this.markLeadAsBounced(scheduledEmail.lead_id, bounceData.bounceType, organizationId);
      }

      // 5. Update campaign bounce rate and check for auto-pause (optional)
      let campaignStatus = { wasPaused: false };
      try {
        campaignStatus = await this.updateCampaignBounceRate(scheduledEmail.campaign_id);
      } catch (campaignUpdateError) {
        console.log('⚠️ Campaign bounce rate update skipped (function not available):', campaignUpdateError.message);
        // Continue - bounce was recorded successfully
      }

      return {
        bounceId: bounce.id,
        campaignStatus,
        shouldPause: campaignStatus.wasPaused
      };

    } catch (error) {
      console.error('❌ Error in recordBounce:', error);
      throw error;
    }
  }

  /**
   * Update scheduled email status to failed (for bounced emails)
   * @param {string} scheduledEmailId - Scheduled email ID
   * @param {string} status - New status ('failed')
   * @param {Object} bounceData - Bounce information
   */
  async updateScheduledEmailStatus(scheduledEmailId, status, bounceData) {
    const updateData = {
      status: status,
      bounce_type: bounceData.bounceType,
      bounce_reason: bounceData.bounceReason,
      error_message: bounceData.bounceReason,
      updated_at: new Date().toISOString()
    };

    const { error } = await this.supabase
      .from('scheduled_emails')
      .update(updateData)
      .eq('id', scheduledEmailId);

    if (error) {
      console.error('❌ Error updating scheduled email status:', error);
      throw new Error(`Failed to update email status: ${error.message}`);
    }

    console.log(`📧 Updated email ${scheduledEmailId} status to ${status}`);
  }

  /**
   * Mark a lead as bounced for hard bounces
   * @param {string} leadId - Lead ID to mark as bounced
   * @param {string} bounceType - Type of bounce (hard/soft)
   * @param {string} organizationId - Organization ID
   */
  async markLeadAsBounced(leadId, bounceType, organizationId) {
    // Only mark as bounced for hard bounces
    if (bounceType !== 'hard') return;

    const { error } = await this.supabase
      .from('leads')
      .update({
        is_bounced: true,
        bounce_type: bounceType,
        bounced_at: new Date().toISOString(),
        status: 'bounced' // Update lead status to prevent future campaigns
      })
      .eq('id', leadId)
      .eq('organization_id', organizationId);

    if (error) {
      console.error('❌ Error marking lead as bounced:', error);
      throw new Error(`Failed to mark lead as bounced: ${error.message}`);
    }

    console.log(`👤 Marked lead ${leadId} as bounced (${bounceType})`);
  }

  /**
   * Update campaign bounce rate and check for auto-pause
   * @param {string} campaignId - Campaign ID to update
   * @returns {Promise<Object>} Campaign status information
   */
  async updateCampaignBounceRate(campaignId) {
    console.log(`📊 Updating bounce rate for campaign ${campaignId}`);

    try {
      // Call the database function to update campaign bounce rate
      const { error: updateError } = await this.supabase.rpc('update_campaign_bounce_rate', {
        p_campaign_id: campaignId
      });

      if (updateError) {
        console.error('❌ Error updating campaign bounce rate:', updateError);
        throw new Error(`Failed to update campaign bounce rate: ${updateError.message}`);
      }

      // Check if campaign should be auto-paused
      const { data: shouldPause, error: pauseError } = await this.supabase.rpc('check_campaign_bounce_rate_for_pause', {
        p_campaign_id: campaignId
      });

      if (pauseError) {
        console.error('❌ Error checking campaign for auto-pause:', pauseError);
        // Don't throw error here - bounce was recorded successfully
      }

      // Get updated campaign statistics
      const campaignStats = await this.getCampaignBounceStats(campaignId);

      if (shouldPause) {
        console.log(`🚨 Campaign ${campaignId} AUTO-PAUSED due to high bounce rate: ${campaignStats.bounceRate}%`);
        
        // TODO: Send notification to campaign owner
        await this.notifyCampaignOwnerOfPause(campaignId, campaignStats.bounceRate);
      }

      return {
        ...campaignStats,
        wasPaused: shouldPause || false
      };

    } catch (error) {
      console.error('❌ Error updating campaign bounce rate:', error);
      throw error;
    }
  }

  /**
   * Get bounce statistics for a campaign
   * @param {string} campaignId - Campaign ID
   * @returns {Promise<Object>} Campaign bounce statistics
   */
  async getCampaignBounceStats(campaignId) {
    try {
      const { data: stats, error } = await this.supabase
        .from('campaign_bounce_stats')
        .select('*')
        .eq('campaign_id', campaignId)
        .single();

      if (error) {
        console.error('❌ Error fetching campaign bounce stats:', error);
        return {
          totalEmails: 0,
          emailsSent: 0,
          emailsBounced: 0,
          hardBounces: 0,
          softBounces: 0,
          bounceRate: 0,
          hardBounceRate: 0
        };
      }

      return {
        totalEmails: stats.total_emails || 0,
        emailsSent: stats.emails_sent || 0,
        emailsBounced: stats.emails_bounced || 0,
        hardBounces: stats.hard_bounces || 0,
        softBounces: stats.soft_bounces || 0,
        bounceRate: stats.bounce_rate || 0,
        hardBounceRate: stats.hard_bounce_rate || 0,
        lastBounceAt: stats.last_bounce_at,
        lastSentAt: stats.last_sent_at
      };
    } catch (error) {
      console.error('❌ Error in getCampaignBounceStats:', error);
      throw error;
    }
  }

  /**
   * Check if a campaign should be paused due to high bounce rate
   * @param {string} campaignId - Campaign ID to check
   * @returns {Promise<boolean>} True if campaign should be paused
   */
  async shouldPauseCampaign(campaignId) {
    try {
      const stats = await this.getCampaignBounceStats(campaignId);
      
      return stats.emailsSent >= this.MIN_EMAILS_FOR_AUTO_PAUSE && 
             stats.bounceRate >= this.BOUNCE_RATE_THRESHOLD;
    } catch (error) {
      console.error('❌ Error checking if campaign should pause:', error);
      return false;
    }
  }

  /**
   * Manually pause a campaign due to bounce issues
   * @param {string} campaignId - Campaign ID to pause
   * @param {string} reason - Reason for pausing
   * @param {string} organizationId - Organization ID
   */
  async pauseCampaignForBounces(campaignId, reason, organizationId) {
    console.log(`⏸️ Manually pausing campaign ${campaignId}: ${reason}`);

    try {
      // Update campaign status
      const { error: campaignError } = await this.supabase
        .from('campaigns')
        .update({
          status: 'paused',
          updated_at: new Date().toISOString()
        })
        .eq('id', campaignId)
        .eq('organization_id', organizationId);

      if (campaignError) {
        throw new Error(`Failed to pause campaign: ${campaignError.message}`);
      }

      // Cancel pending emails
      const { error: emailsError } = await this.supabase
        .from('scheduled_emails')
        .update({
          status: 'skipped',
          updated_at: new Date().toISOString()
        })
        .eq('campaign_id', campaignId)
        .eq('status', 'scheduled');

      if (emailsError) {
        console.error('⚠️ Error cancelling pending emails:', emailsError);
        // Don't throw - campaign pause was successful
      }

      console.log(`✅ Campaign ${campaignId} paused successfully`);
      return true;

    } catch (error) {
      console.error('❌ Error pausing campaign:', error);
      throw error;
    }
  }

  /**
   * Get bounce statistics for all campaigns in an organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Array of campaign bounce statistics
   */
  async getOrganizationBounceStats(organizationId) {
    try {
      const { data: stats, error } = await this.supabase
        .from('campaign_bounce_stats')
        .select('*')
        .eq('organization_id', organizationId)
        .order('bounce_rate', { ascending: false });

      if (error) {
        console.error('❌ Error fetching organization bounce stats:', error);
        return [];
      }

      return stats || [];
    } catch (error) {
      console.error('❌ Error in getOrganizationBounceStats:', error);
      return [];
    }
  }

  /**
   * Parse provider-specific error information to determine if it's a bounce
   * @param {Object} error - Error object from email provider
   * @param {string} provider - Provider type ('gmail', 'outlook', 'smtp')
   * @returns {Object|null} Bounce information or null if not a bounce
   */
  static parseBounceFromError(error, provider) {
    switch (provider) {
      case 'gmail':
        return BounceTrackingService.parseGmailError(error);
      
      case 'outlook':
        return BounceTrackingService.parseOutlookError(error);
      
      case 'smtp':
        return BounceTrackingService.parseSMTPError(error);
      
      default:
        return BounceTrackingService.parseGenericError(error, provider);
    }
  }

  /**
   * Parse Gmail API errors for bounce detection
   * @param {Object} error - Gmail API error
   * @returns {Object|null} Bounce information
   */
  static parseGmailError(error) {
    const message = error.message?.toLowerCase() || '';
    const code = error.code || error.status || 0;

    // Hard bounce indicators for Gmail API
    const hardBounceIndicators = [
      'invalid recipient',
      'user not found',
      'domain not found',
      'mailbox unavailable',
      'recipient address rejected',
      'no such user',
      'unknown user',
      'invalid address',
      'not valid',
      'is not valid',
      'invalid email',
      'address is invalid',
      'email address you are sending to',
      'delivery to the following recipient failed',
      'address not found',
      'does not exist',
      'undeliverable'
    ];

    // Soft bounce indicators for Gmail API  
    const softBounceIndicators = [
      'mailbox full',
      'temporary failure',
      'rate limited',
      'quota exceeded',
      'try again later',
      'temporarily unavailable'
    ];

    for (const indicator of hardBounceIndicators) {
      if (message.includes(indicator)) {
        return {
          isBounce: true,
          bounceType: 'hard',
          bounceCode: code.toString(),
          bounceReason: error.message,
          provider: 'gmail'
        };
      }
    }

    for (const indicator of softBounceIndicators) {
      if (message.includes(indicator)) {
        return {
          isBounce: true,
          bounceType: 'soft',
          bounceCode: code.toString(),
          bounceReason: error.message,
          provider: 'gmail'
        };
      }
    }

    return null; // Not a bounce
  }

  /**
   * Parse SMTP errors for bounce detection
   * @param {Object} error - SMTP error
   * @returns {Object|null} Bounce information
   */
  static parseSMTPError(error) {
    const responseCode = error.responseCode || error.code || 0;
    const response = error.response || error.message || '';

    // SMTP hard bounce codes
    const hardBounceCodes = [550, 551, 553, 554];
    // SMTP soft bounce codes
    const softBounceCodes = [421, 450, 451, 452];

    if (hardBounceCodes.includes(responseCode)) {
      return {
        isBounce: true,
        bounceType: 'hard',
        bounceCode: responseCode.toString(),
        bounceReason: response,
        provider: 'smtp'
      };
    }

    if (softBounceCodes.includes(responseCode)) {
      return {
        isBounce: true,
        bounceType: 'soft',
        bounceCode: responseCode.toString(),
        bounceReason: response,
        provider: 'smtp'
      };
    }

    return null; // Not a bounce
  }

  /**
   * Parse Outlook/Microsoft Graph errors for bounce detection
   * @param {Object} error - Microsoft Graph error
   * @returns {Object|null} Bounce information
   */
  static parseOutlookError(error) {
    // TODO: Implement when Microsoft Graph integration is added
    // This is a placeholder for future implementation
    const message = error.message?.toLowerCase() || '';
    const code = error.code || error.status || 0;

    // Microsoft Graph bounce patterns (to be refined based on actual API responses)
    if (message.includes('recipient not found') || message.includes('invalid recipient')) {
      return {
        isBounce: true,
        bounceType: 'hard',
        bounceCode: code.toString(),
        bounceReason: error.message,
        provider: 'outlook'
      };
    }

    return null; // Not a bounce or not implemented yet
  }

  /**
   * Parse generic errors for unknown providers
   * @param {Object} error - Generic error
   * @param {string} provider - Provider name
   * @returns {Object|null} Bounce information
   */
  static parseGenericError(error, provider) {
    const message = error.message?.toLowerCase() || '';

    // Generic bounce keywords
    const bounceKeywords = [
      'bounce',
      'undelivered',
      'recipient not found',
      'mailbox unavailable',
      'invalid address'
    ];

    for (const keyword of bounceKeywords) {
      if (message.includes(keyword)) {
        return {
          isBounce: true,
          bounceType: 'unknown',
          bounceCode: error.code?.toString() || '0',
          bounceReason: error.message,
          provider: provider || 'unknown'
        };
      }
    }

    return null; // Not a bounce
  }

  /**
   * Notify campaign owner of auto-pause (placeholder for notification system)
   * @param {string} campaignId - Campaign ID
   * @param {number} bounceRate - Current bounce rate
   */
  async notifyCampaignOwnerOfPause(campaignId, bounceRate) {
    // TODO: Implement notification system
    // This could send email, SMS, or push notifications
    console.log(`🔔 NOTIFICATION: Campaign ${campaignId} paused due to ${bounceRate}% bounce rate`);
    
    // For now, just log the event
    // In the future, integrate with email notification service
  }
}

module.exports = BounceTrackingService;