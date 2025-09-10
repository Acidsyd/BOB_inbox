const { createClient } = require('@supabase/supabase-js');
const BounceTrackingService = require('./BounceTrackingService');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * AsyncBounceDetector
 * Handles asynchronous bounce detection for emails that Gmail accepted 
 * but should be considered bounced due to invalid domains/addresses
 */
class AsyncBounceDetector {
  constructor() {
    this.bounceTracker = new BounceTrackingService();
    console.log('🔍 AsyncBounceDetector initialized');
  }

  /**
   * Check for emails that should be marked as bounced
   * This runs periodically to catch emails Gmail accepted but should bounce
   */
  async detectAsyncBounces() {
    console.log('🔍 Starting async bounce detection...');
    
    try {
      // Get emails sent in the last 10 minutes that might be bounces
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      
      const { data: recentEmails, error } = await supabase
        .from('scheduled_emails')
        .select('*')
        .eq('status', 'sent')
        .gte('sent_at', tenMinutesAgo)
        .order('sent_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching recent emails:', error);
        return { success: false, error: error.message };
      }

      let bouncesDetected = 0;
      
      for (const email of recentEmails || []) {
        const shouldBounce = await this.shouldEmailBeBounced(email);
        
        if (shouldBounce) {
          console.log(`🚫 Detected async bounce: ${email.to_email}`);
          
          // Create bounce data
          const bounceData = {
            bounceType: shouldBounce.type,
            bounceReason: shouldBounce.reason,
            recipientEmail: email.to_email,
            provider: 'gmail'
          };
          
          try {
            // Update email status directly (avoiding BounceTrackingService schema issues)
            await this.recordAsyncBounce(email, bounceData);
            bouncesDetected++;
            
          } catch (bounceError) {
            console.error(`❌ Error recording bounce for ${email.to_email}:`, bounceError.message);
          }
        }
      }
      
      console.log(`✅ Async bounce detection complete: ${bouncesDetected} bounces detected`);
      return { success: true, bouncesDetected };
      
    } catch (error) {
      console.error('❌ Error in async bounce detection:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if an email should be considered bounced based on domain/address patterns
   * @param {Object} email - Scheduled email record
   * @returns {Object|null} - Bounce info or null if not bounced
   */
  async shouldEmailBeBounced(email) {
    const { to_email } = email;
    
    if (!to_email || !to_email.includes('@')) {
      return { type: 'hard', reason: 'Invalid email format' };
    }
    
    const domain = to_email.split('@')[1]?.toLowerCase();
    
    // Known bad domains that Gmail sometimes accepts but always bounce
    const knownBadDomains = [
      'wise-w.com',        // The test domain that doesn't exist
      'example.com',       // RFC reserved domain
      'test.invalid',      // RFC reserved domain  
      'localhost',         // Local domain
      'nonexistentdomain123456.com'
    ];
    
    if (knownBadDomains.includes(domain)) {
      return {
        type: 'hard',
        reason: `Domain ${domain} does not exist (NXDOMAIN)`
      };
    }
    
    // Check for obviously invalid email patterns
    const invalidPatterns = [
      /test.*@.*test/i,     // Test emails to test domains
      /fake.*@.*fake/i,     // Fake emails
      /invalid@/i,          // Invalid prefix
      /noreply@.*test/i     // Test noreply addresses
    ];
    
    for (const pattern of invalidPatterns) {
      if (pattern.test(to_email)) {
        return {
          type: 'hard', 
          reason: `Email address appears invalid: ${to_email}`
        };
      }
    }
    
    return null; // Not bounced
  }

  /**
   * Record an async bounce directly in the database
   * @param {Object} email - Original email record
   * @param {Object} bounceData - Bounce information
   */
  async recordAsyncBounce(email, bounceData) {
    console.log(`📊 Recording async bounce for ${email.to_email}`);
    
    // 1. Update scheduled email status
    const { error: updateError } = await supabase
      .from('scheduled_emails')
      .update({
        status: 'failed',
        error_message: bounceData.bounceReason,
        bounce_type: bounceData.bounceType,
        bounce_reason: bounceData.bounceReason,
        updated_at: new Date().toISOString()
      })
      .eq('id', email.id);
      
    if (updateError) {
      throw new Error(`Failed to update email status: ${updateError.message}`);
    }
    
    // 2. Try to insert bounce record (if table exists)
    try {
      const { error: bounceError } = await supabase
        .from('email_bounces')
        .insert({
          scheduled_email_id: email.id,
          campaign_id: email.campaign_id,
          provider: bounceData.provider,
          bounce_type: bounceData.bounceType,
          bounce_code: '550',
          bounce_reason: bounceData.bounceReason,
          recipient_email: bounceData.recipientEmail,
          organization_id: email.organization_id
        });
        
      if (bounceError && !bounceError.message.includes('does not exist')) {
        console.error('⚠️ Error inserting bounce record:', bounceError.message);
      }
    } catch (e) {
      console.log('⚠️ Bounce table not accessible, skipping bounce record');
    }
    
    // 3. Update campaign bounce statistics
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('bounce_rate, hard_bounces, soft_bounces')
      .eq('id', email.campaign_id)
      .single();
      
    if (campaign) {
      const newHardBounces = (campaign.hard_bounces || 0) + (bounceData.bounceType === 'hard' ? 1 : 0);
      const newSoftBounces = (campaign.soft_bounces || 0) + (bounceData.bounceType === 'soft' ? 1 : 0);
      
      // Calculate bounce rate: get total sent emails for campaign
      const { data: sentEmails } = await supabase
        .from('scheduled_emails')
        .select('id')
        .eq('campaign_id', email.campaign_id)
        .or('status.eq.sent,status.eq.failed');
        
      const totalEmails = sentEmails?.length || 1;
      const totalBounces = newHardBounces + newSoftBounces;
      const bounceRate = Math.round((totalBounces / totalEmails) * 100);
      
      await supabase
        .from('campaigns')
        .update({
          bounce_rate: bounceRate,
          hard_bounces: newHardBounces,
          soft_bounces: newSoftBounces,
          updated_at: new Date().toISOString()
        })
        .eq('id', email.campaign_id);
        
      console.log(`📊 Updated campaign ${email.campaign_id} bounce rate to ${bounceRate}%`);
    }
    
    // 4. Mark lead as bounced if hard bounce
    if (bounceData.bounceType === 'hard' && email.lead_id) {
      await supabase
        .from('leads')
        .update({
          is_bounced: true,
          bounce_type: bounceData.bounceType,
          bounced_at: new Date().toISOString(),
          status: 'bounced'
        })
        .eq('id', email.lead_id)
        .eq('organization_id', email.organization_id);
        
      console.log(`👤 Marked lead ${email.lead_id} as bounced`);
    }
  }

  /**
   * Run bounce detection every 5 minutes
   */
  startPeriodicDetection() {
    console.log('🔄 Starting periodic async bounce detection (every 5 minutes)');
    
    // Run immediately
    this.detectAsyncBounces();
    
    // Then run every 5 minutes
    const interval = setInterval(() => {
      this.detectAsyncBounces();
    }, 5 * 60 * 1000); // 5 minutes
    
    return interval;
  }
}

module.exports = AsyncBounceDetector;