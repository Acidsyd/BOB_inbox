const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const useragent = require('useragent');

class EmailTrackingService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    // 1x1 transparent pixel for open tracking
    this.trackingPixel = Buffer.from(
      '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154785e6364000000000500010d0a2db40000000049454e44ae426082',
      'hex'
    );
    
    // Base URL for tracking (will be replaced with actual domain in production)
    this.baseUrl = process.env.BASE_URL || 'http://localhost:4000';
  }

  /**
   * Generate a unique tracking token for an email
   */
  generateTrackingToken() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Add tracking elements to email HTML
   * @param {string} html - Original email HTML
   * @param {string} trackingToken - Unique token for this email
   * @param {boolean} trackOpens - Whether to track opens
   * @param {boolean} trackClicks - Whether to track clicks
   * @returns {string} Modified HTML with tracking
   */
  addTrackingToEmail(html, trackingToken, trackOpens = true, trackClicks = true) {
    let modifiedHtml = html;
    
    // Add open tracking pixel
    if (trackOpens) {
      const pixelUrl = `${this.baseUrl}/api/track/open/${trackingToken}.png`;
      const pixelImg = `<img src="${pixelUrl}" width="1" height="1" style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;" alt="">`;
      
      // Add pixel before closing body tag, or at the end if no body tag
      if (modifiedHtml.includes('</body>')) {
        modifiedHtml = modifiedHtml.replace('</body>', `${pixelImg}</body>`);
      } else {
        modifiedHtml += pixelImg;
      }
    }
    
    // Rewrite links for click tracking
    if (trackClicks) {
      modifiedHtml = this.rewriteLinksForTracking(modifiedHtml, trackingToken);
    }
    
    return modifiedHtml;
  }

  /**
   * Normalize URL by adding protocol if missing
   * @param {string} url - Original URL
   * @returns {string} Normalized URL with protocol
   */
  normalizeUrl(url) {
    // Skip if already has protocol
    if (url.match(/^https?:\/\//i)) {
      return url;
    }
    
    // Skip non-web URLs
    if (url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('#')) {
      return url;
    }
    
    // Add https:// to domain-like strings
    if (url.match(/^(www\.)?[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}/) || 
        url.match(/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}/)) {
      return `https://${url}`;
    }
    
    return url;
  }

  /**
   * Rewrite all links in HTML for click tracking
   * @param {string} html - Email HTML content
   * @param {string} trackingToken - Unique token for this email
   * @returns {string} HTML with rewritten links
   */
  rewriteLinksForTracking(html, trackingToken) {
    // Regular expression to find all <a href="..."> tags
    const linkRegex = /<a([^>]*?)href\s*=\s*["']([^"']+)["']([^>]*?)>/gi;
    let linkIndex = 0;
    const linkMap = new Map();
    
    // First pass: collect all unique URLs and assign indexes
    let match;
    const tempRegex = new RegExp(linkRegex);
    while ((match = tempRegex.exec(html)) !== null) {
      let url = match[2];
      
      // Skip tracking for certain URLs
      if (this.shouldSkipTracking(url)) {
        continue;
      }
      
      // Normalize URL (add protocol if missing)
      url = this.normalizeUrl(url);
      
      if (!linkMap.has(url)) {
        linkMap.set(url, linkIndex++);
      }
    }
    
    // Second pass: rewrite the links
    return html.replace(linkRegex, (fullMatch, beforeHref, originalUrl, afterHref) => {
      // Skip tracking for certain URLs
      if (this.shouldSkipTracking(originalUrl)) {
        return fullMatch;
      }
      
      // Normalize the URL (add protocol if missing)
      const normalizedUrl = this.normalizeUrl(originalUrl);
      const linkIdx = linkMap.get(normalizedUrl);
      const encodedUrl = Buffer.from(normalizedUrl).toString('base64url');
      const trackingUrl = `${this.baseUrl}/api/track/click/${trackingToken}/${linkIdx}/${encodedUrl}`;
      
      return `<a${beforeHref}href="${trackingUrl}"${afterHref}>`;
    });
  }

  /**
   * Check if a URL should skip tracking
   * @param {string} url - URL to check
   * @returns {boolean} True if should skip tracking
   */
  shouldSkipTracking(url) {
    // Skip mailto links, tel links, and anchors
    if (url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('#')) {
      return true;
    }
    
    // Skip unsubscribe links
    if (url.includes('unsubscribe') || url.includes('opt-out')) {
      return true;
    }
    
    return false;
  }

  /**
   * Record an email open event
   * @param {string} trackingToken - Tracking token from the pixel URL
   * @param {object} metadata - Request metadata (IP, user agent, etc.)
   * @returns {object} Result of the tracking operation
   */
  async recordOpen(trackingToken, metadata = {}) {
    try {
      // Get the scheduled email by tracking token
      const { data: scheduledEmail, error: fetchError } = await this.supabase
        .from('scheduled_emails')
        .select(`
          id,
          campaign_id,
          lead_id,
          organization_id
        `)
        .eq('tracking_token', trackingToken)
        .single();
      
      if (fetchError || !scheduledEmail) {
        console.error('❌ Email not found for tracking token:', trackingToken);
        return { success: false, error: 'Email not found' };
      }
      
      // Check if this is likely a bot
      if (this.isBotUserAgent(metadata.userAgent)) {
        console.log('🤖 Bot detected, skipping tracking:', metadata.userAgent);
        return { success: true, bot: true };
      }
      
      // Parse user agent for device info
      const agent = useragent.parse(metadata.userAgent || '');
      const deviceInfo = this.extractDeviceInfo(agent, metadata.userAgent);
      
      // Check for duplicate open within 5 minutes (prevent double tracking)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: recentOpen } = await this.supabase
        .from('email_tracking_events')
        .select('id')
        .eq('scheduled_email_id', scheduledEmail.id)
        .eq('event_type', 'open')
        .eq('ip_address', metadata.ip)
        .gte('created_at', fiveMinutesAgo)
        .single();
      
      if (recentOpen) {
        console.log('⏭️ Duplicate open detected, skipping');
        return { success: true, duplicate: true };
      }
      
      // Record the open event
      const { error: insertError } = await this.supabase
        .from('email_tracking_events')
        .insert({
          scheduled_email_id: scheduledEmail.id,
          campaign_id: scheduledEmail.campaign_id,
          lead_id: scheduledEmail.lead_id,
          organization_id: scheduledEmail.organization_id,
          event_type: 'open',
          ip_address: metadata.ip,
          user_agent: metadata.userAgent,
          device_type: deviceInfo.deviceType,
          browser_name: deviceInfo.browser,
          operating_system: deviceInfo.os,
          country: metadata.country,
          city: metadata.city
        });
      
      if (insertError) {
        console.error('❌ Error recording open:', insertError);
        return { success: false, error: insertError.message };
      }
      
      console.log(`✅ Email open tracked for email ${scheduledEmail.id}`);
      return { 
        success: true, 
        firstOpen: true,
        emailId: scheduledEmail.id 
      };
      
    } catch (error) {
      console.error('❌ Error in recordOpen:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Record a link click event
   * @param {string} trackingToken - Tracking token from the URL
   * @param {number} linkIndex - Index of the clicked link
   * @param {string} encodedUrl - Base64 encoded original URL
   * @param {object} metadata - Request metadata
   * @returns {object} Result with redirect URL
   */
  async recordClick(trackingToken, linkIndex, encodedUrl, metadata = {}) {
    try {
      // Decode the original URL
      const originalUrl = Buffer.from(encodedUrl, 'base64url').toString('utf-8');
      
      // Get the scheduled email by tracking token
      const { data: scheduledEmail, error: fetchError } = await this.supabase
        .from('scheduled_emails')
        .select(`
          id,
          campaign_id,
          lead_id,
          organization_id
        `)
        .eq('tracking_token', trackingToken)
        .single();
      
      if (fetchError || !scheduledEmail) {
        console.error('❌ Email not found for tracking token:', trackingToken);
        // Still redirect to the URL even if tracking fails
        return { success: false, redirectUrl: originalUrl };
      }
      
      // Check if this is likely a bot
      if (this.isBotUserAgent(metadata.userAgent)) {
        console.log('🤖 Bot detected, skipping click tracking:', metadata.userAgent);
        return { success: true, bot: true, redirectUrl: originalUrl };
      }
      
      // Parse user agent for device info
      const agent = useragent.parse(metadata.userAgent || '');
      const deviceInfo = this.extractDeviceInfo(agent, metadata.userAgent);
      
      // Extract link text if possible (this would need to be stored during link rewriting)
      const linkText = `Link ${linkIndex + 1}`;
      
      // Record the click event
      const { error: insertError } = await this.supabase
        .from('email_tracking_events')
        .insert({
          scheduled_email_id: scheduledEmail.id,
          campaign_id: scheduledEmail.campaign_id,
          lead_id: scheduledEmail.lead_id,
          organization_id: scheduledEmail.organization_id,
          event_type: 'click',
          ip_address: metadata.ip,
          user_agent: metadata.userAgent,
          device_type: deviceInfo.deviceType,
          browser_name: deviceInfo.browser,
          operating_system: deviceInfo.os,
          country: metadata.country,
          city: metadata.city,
          original_url: originalUrl,
          click_position: linkIndex,
          link_text: linkText
        });
      
      if (insertError) {
        console.error('❌ Error recording click:', insertError);
        // Still redirect even if tracking fails
        return { success: false, redirectUrl: originalUrl };
      }
      
      console.log(`✅ Link click tracked for email ${scheduledEmail.id}, link: ${originalUrl}`);
      return { 
        success: true, 
        redirectUrl: originalUrl,
        firstClick: true,
        emailId: scheduledEmail.id 
      };
      
    } catch (error) {
      console.error('❌ Error in recordClick:', error);
      // Attempt to decode and redirect even on error
      try {
        const originalUrl = Buffer.from(encodedUrl, 'base64url').toString('utf-8');
        return { success: false, redirectUrl: originalUrl };
      } catch {
        return { success: false, redirectUrl: '/' };
      }
    }
  }

  /**
   * Check if user agent is likely a bot
   * @param {string} userAgent - User agent string
   * @returns {boolean} True if likely a bot
   */
  isBotUserAgent(userAgent) {
    if (!userAgent) return false;
    
    const botPatterns = [
      'GoogleImageProxy',
      'LinkedInBot',
      'Slackbot',
      'facebookexternalhit',
      'WhatsApp',
      'TelegramBot',
      'Twitterbot',
      'Outlook-iOS',
      'Outlook-Android',
      'GoogleDocs',
      'AdsBot-Google',
      'Mediapartners-Google',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.246'
    ];
    
    return botPatterns.some(pattern => 
      userAgent.includes(pattern)
    );
  }

  /**
   * Extract device information from user agent
   * @param {object} agent - Parsed user agent
   * @param {string} rawAgent - Raw user agent string
   * @returns {object} Device information
   */
  extractDeviceInfo(agent, rawAgent) {
    let deviceType = 'unknown';
    
    // Determine device type
    if (rawAgent) {
      if (/mobile|android|iphone/i.test(rawAgent)) {
        deviceType = 'mobile';
      } else if (/ipad|tablet/i.test(rawAgent)) {
        deviceType = 'tablet';
      } else if (/windows|mac|linux/i.test(rawAgent)) {
        deviceType = 'desktop';
      }
    }
    
    return {
      deviceType,
      browser: agent.family || 'Unknown',
      os: agent.os.family || 'Unknown'
    };
  }

  /**
   * Get tracking statistics for a campaign
   * @param {string} campaignId - Campaign ID
   * @param {string} organizationId - Organization ID
   * @returns {object} Tracking statistics
   */
  async getCampaignTrackingStats(campaignId, organizationId) {
    try {
      // Get unique opens
      const { data: opens, error: opensError } = await this.supabase
        .from('email_tracking_events')
        .select('scheduled_email_id')
        .eq('campaign_id', campaignId)
        .eq('organization_id', organizationId)
        .eq('event_type', 'open');
      
      if (opensError) {
        console.error('Error fetching opens:', opensError);
        return { uniqueOpens: 0, uniqueClicks: 0 };
      }
      
      // Get unique clicks
      const { data: clicks, error: clicksError } = await this.supabase
        .from('email_tracking_events')
        .select('scheduled_email_id')
        .eq('campaign_id', campaignId)
        .eq('organization_id', organizationId)
        .eq('event_type', 'click');
      
      if (clicksError) {
        console.error('Error fetching clicks:', clicksError);
        return { uniqueOpens: 0, uniqueClicks: 0 };
      }
      
      // Count unique emails that were opened/clicked
      const uniqueOpens = new Set(opens.map(o => o.scheduled_email_id)).size;
      const uniqueClicks = new Set(clicks.map(c => c.scheduled_email_id)).size;
      
      return {
        uniqueOpens,
        totalOpens: opens.length,
        uniqueClicks,
        totalClicks: clicks.length
      };
      
    } catch (error) {
      console.error('Error getting tracking stats:', error);
      return { uniqueOpens: 0, uniqueClicks: 0 };
    }
  }
}

module.exports = EmailTrackingService;