const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const { fetchAllWithPagination, fetchCount } = require('../utils/supabaseHelpers');
const EmailService = require('../services/EmailService');
const EmailTrackingService = require('../services/EmailTrackingService');
const HealthCheckService = require('../services/HealthCheckService');
const ProcessManagerService = require('../services/ProcessManagerService');
const WebhookService = require('../services/WebhookService');
const SpintaxParser = require('../utils/spintax');
const { toLocalTimestamp } = require('../utils/dateUtils.cjs');
const CampaignScheduler = require('../utils/CampaignScheduler');
const TimezoneService = require('../services/TimezoneService');
const emailService = new EmailService();
const webhookService = new WebhookService();

// Helper function to format dates for campaign responses
function formatCampaignDate(date, timezone = 'UTC', format = 'MMM d, yyyy h:mm a') {
  if (!date) return null;

  // Convert string dates to Date objects
  let dateObj;
  if (date instanceof Date) {
    dateObj = date;
  } else {
    const dateStr = date.toString();
    // Handle timestamps without timezone suffix
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/) && !dateStr.endsWith('Z')) {
      dateObj = new Date(dateStr + 'Z');
    } else {
      dateObj = new Date(dateStr);
    }
  }

  // For yyyy-MM-dd format, we need to extract the date parts in the target timezone
  if (format === 'yyyy-MM-dd') {
    try {
      const tzDate = new Date(dateObj.toLocaleString('en-US', { timeZone: timezone }));
      const year = tzDate.getFullYear();
      const month = String(tzDate.getMonth() + 1).padStart(2, '0');
      const day = String(tzDate.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error formatting date to yyyy-MM-dd:', error);
      // Fallback to UTC
      const year = dateObj.getUTCFullYear();
      const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  // For other formats, use TimezoneService
  let options = {};

  if (format === 'MMM d') {
    options = {
      month: 'short',
      day: 'numeric'
    };
  } else {
    // Default format: 'MMM d, yyyy h:mm a'
    options = {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
  }

  return TimezoneService.convertToUserTimezone(date, timezone, options);
}
const emailTrackingService = new EmailTrackingService();
const healthCheckService = new HealthCheckService();
const processManager = new ProcessManagerService();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Helper function to get actual lead count for a campaign - FIXED: No more 1000-row limit
const getLeadCount = async (leadListId, organizationId) => {
  if (!leadListId) return 0;
  
  try {
    const { count, error } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('lead_list_id', leadListId)
      .eq('organization_id', organizationId)
      .eq('status', 'active');
      
    if (error) {
      console.error('❌ Error fetching lead count:', error);
      return 0;
    }
    
    return count || 0;
  } catch (error) {
    console.error('❌ Error in getLeadCount:', error);
    return 0;
  }
};

// Helper function to get campaign metrics from scheduled_emails table and bounce tracking
const getCampaignMetrics = async (campaignId, organizationId) => {
  try {
    // Use COUNT queries to avoid 1000-row limit and improve performance
    const { count: deliveredCount } = await supabase
      .from('scheduled_emails')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .eq('organization_id', organizationId)
      .eq('status', 'sent');

    // Count bounced emails (status='bounced')
    const { count: bouncedStatusCount } = await supabase
      .from('scheduled_emails')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .eq('organization_id', organizationId)
      .eq('status', 'bounced');

    // Count failed emails with bounce-related error messages
    const { data: failedEmails } = await supabase
      .from('scheduled_emails')
      .select('error_message')
      .eq('campaign_id', campaignId)
      .eq('organization_id', organizationId)
      .eq('status', 'failed');

    // Filter failed emails that are actually bounces
    const bounceRelatedFailed = (failedEmails || []).filter(e => {
      const msg = (e.error_message || '').toLowerCase();
      return msg.includes('bounce') ||
             msg.includes('domain') ||
             msg.includes('nxdomain') ||
             msg.includes('mailbox') ||
             msg.includes('recipient') ||
             msg.includes('inesistente');
    }).length;

    const delivered = deliveredCount || 0;
    const bounced = (bouncedStatusCount || 0) + bounceRelatedFailed;
    const failed = (failedEmails?.length || 0) - bounceRelatedFailed; // Non-bounce failures

    // Total attempted includes both delivered and bounced
    const sent = delivered + bounced;
    
    // Get bounce breakdown from email_bounces table if available
    let hardBounces = 0;
    let softBounces = 0;
    
    try {
      const { data: bounceRecords } = await supabase
        .from('email_bounces')
        .select('bounce_type')
        .eq('campaign_id', campaignId)
        .eq('organization_id', organizationId);
        
      if (bounceRecords) {
        hardBounces = bounceRecords.filter(b => b.bounce_type === 'hard').length;
        softBounces = bounceRecords.filter(b => b.bounce_type === 'soft').length;
      }
    } catch (e) {
      // Fallback if email_bounces table query fails
      console.log('Could not fetch bounce records:', e.message);
    }
    
    // Also check campaign table for bounce_rate if available
    let campaignBounceRate = null;
    try {
      const { data: campaignData } = await supabase
        .from('campaigns')
        .select('bounce_rate, hard_bounces, soft_bounces')
        .eq('id', campaignId)
        .single();
        
      if (campaignData) {
        // Use campaign table data if available
        if (campaignData.bounce_rate !== null && campaignData.bounce_rate !== undefined) {
          campaignBounceRate = campaignData.bounce_rate;
        }
        if (campaignData.hard_bounces) hardBounces = campaignData.hard_bounces;
        if (campaignData.soft_bounces) softBounces = campaignData.soft_bounces;
      }
    } catch (e) {
      console.log('Could not fetch campaign bounce data:', e.message);
    }
    
    // Get replies from conversation_messages table (unified inbox)
    let replied = 0;
    try {
      const { data: replyStats, error: replyError } = await supabase
        .from('conversation_messages')
        .select(`
          created_at,
          conversations!inner(campaign_id, organization_id)
        `)
        .eq('conversations.campaign_id', campaignId)
        .eq('conversations.organization_id', organizationId)
        .eq('direction', 'received') // Only count incoming messages (replies)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true });
      
      replied = replyError ? 0 : (replyStats?.length || 0);
      console.log(`📨 Found ${replied} replies for campaign ${campaignId}`);
    } catch (replyErr) {
      console.error('❌ Reply tracking error:', replyErr.message);
      replied = 0;
    }

    // Get real tracking data from email_tracking_events
    let opened = 0;
    let clicked = 0;
    
    try {
      // Get unique opened emails
      const { data: openedEmails, error: openError } = await supabase
        .from('email_tracking_events')
        .select('scheduled_email_id')
        .eq('campaign_id', campaignId)
        .eq('organization_id', organizationId)
        .eq('event_type', 'open');
      
      if (!openError && openedEmails) {
        // Count unique emails that were opened
        opened = new Set(openedEmails.map(e => e.scheduled_email_id)).size;
        console.log(`📧 Found ${opened} unique opens for campaign ${campaignId}`);
      }
      
      // Get unique clicked emails
      const { data: clickedEmails, error: clickError } = await supabase
        .from('email_tracking_events')
        .select('scheduled_email_id')
        .eq('campaign_id', campaignId)
        .eq('organization_id', organizationId)
        .eq('event_type', 'click');
      
      if (!clickError && clickedEmails) {
        // Count unique emails that were clicked
        clicked = new Set(clickedEmails.map(e => e.scheduled_email_id)).size;
        console.log(`🔗 Found ${clicked} unique clicks for campaign ${campaignId}`);
      }
    } catch (trackingErr) {
      console.error('❌ Tracking data error:', trackingErr.message);
      // Continue with 0 values if tracking query fails
    }
    
    // Calculate rates based on total emails attempted (sent + bounced)
    const totalAttempted = sent + bounced;
    const openRate = sent > 0 ? Math.round((opened / sent) * 100) : 0;
    const clickRate = opened > 0 ? Math.round((clicked / opened) * 100) : 0;
    const replyRate = sent > 0 ? Math.round((replied / sent) * 100) : 0;
    
    // Use campaign table bounce_rate if available, otherwise calculate
    const bounceRate = campaignBounceRate !== null ? 
      campaignBounceRate : 
      (totalAttempted > 0 ? Math.round((bounced / totalAttempted) * 100) : 0);

    console.log(`📊 Campaign ${campaignId} metrics: sent=${sent}, bounced=${bounced}, failed=${failed}, bounceRate=${bounceRate}%`);

    // Get sequence step breakdown
    const { count: initialEmailsCount } = await supabase
      .from('scheduled_emails')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .eq('organization_id', organizationId)
      .eq('sequence_step', 0);

    const { count: followUpEmailsCount } = await supabase
      .from('scheduled_emails')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .eq('organization_id', organizationId)
      .gt('sequence_step', 0);

    return {
      sent,
      delivered,
      opened,
      clicked,
      replied,
      bounced,
      failed,
      openRate,
      clickRate,
      replyRate,
      bounceRate,
      hardBounces,
      softBounces,
      initialEmails: initialEmailsCount || 0,
      followUpEmails: followUpEmailsCount || 0
    };
  } catch (error) {
    console.error('❌ Error in getCampaignMetrics:', error);
    return {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      replied: 0,
      bounced: 0,
      failed: 0,
      openRate: 0,
      clickRate: 0,
      replyRate: 0,
      bounceRate: 0,
      hardBounces: 0,
      softBounces: 0,
      initialEmails: 0,
      followUpEmails: 0
    };
  }
};

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// POST /api/campaigns/test-email - Send test email
router.post('/test-email', authenticateToken, async (req, res) => {
  try {
    console.log('📧 POST /api/campaigns/test-email called');
    console.log('👤 User:', req.user);
    console.log('📨 Request body:', req.body);

    const { 
      recipientEmail,
      senderAccountId, 
      subject, 
      content,
      sampleData = {},
      campaignName,
      emailIndex
    } = req.body;

    // Map frontend field names to expected names
    const testEmail = recipientEmail;
    const fromAccount = senderAccountId;
    const personalization = {
      firstName: sampleData.first_name,
      lastName: sampleData.last_name,
      company: sampleData.company,
      jobTitle: sampleData.job_title,
      fullName: sampleData.full_name,
      website: sampleData.website,
      email: recipientEmail
    };

    // Validate required fields
    if (!testEmail || !subject || !content || !fromAccount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: recipientEmail, subject, content, senderAccountId'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email address format'
      });
    }

    // Apply personalization with spintax support
    let personalizedSubject = SpintaxParser.spinWithSeed(subject, testEmail);
    let personalizedContent = SpintaxParser.spinWithSeed(content, testEmail);
    
    // Replace common token variants to mirror campaign scheduling behavior
    const tokenPairs = [
      ['firstName', personalization.firstName],
      ['lastName', personalization.lastName],
      ['fullName', personalization.fullName],
      ['company', personalization.company],
      ['jobTitle', personalization.jobTitle],
      ['website', personalization.website],
      ['email', personalization.email]
    ];
    const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const toSnake = (s) => s ? s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase() : s;
    tokenPairs.forEach(([key, val]) => {
      if (!val) return;
      const snake = toSnake(key);
      const variants = [
        `{{${key}}}`, `{${key}}`,
        `{{${snake}}}`, `{${snake}}`
      ];
      variants.forEach(ph => {
        const re = new RegExp(escapeRegExp(ph), 'g');
        personalizedSubject = personalizedSubject.replace(re, String(val));
        personalizedContent = personalizedContent.replace(re, String(val));
      });
    });

    console.log('✅ Test email validation passed');
    console.log('📤 Attempting to send real email to:', testEmail);
    console.log('📄 Subject:', personalizedSubject);
    console.log('📧 From account:', fromAccount);

    // Send actual email using EmailService
    const emailResult = await emailService.sendTestEmail({
      accountId: fromAccount,
      organizationId: req.user.organizationId,
      recipientEmail: testEmail,
      subject: personalizedSubject,
      content: personalizedContent,
      personalization
    });

    if (emailResult.success) {
      console.log('🎉 Test email sent successfully:', emailResult.messageId);
      res.json({
        success: true,
        message: 'Test email sent successfully',
        data: {
          messageId: emailResult.messageId,
          to: emailResult.to,
          from: emailResult.from,
          subject: emailResult.subject,
          deliveryStatus: 'sent',
          timestamp: emailResult.timestamp,
          response: emailResult.response
        }
      });
    } else {
      console.log('❌ Test email failed:', emailResult.error);
      res.status(500).json({
        success: false,
        error: 'Failed to send test email',
        details: emailResult.error
      });
    }

  } catch (error) {
    console.error('❌ Test email error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test email',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/campaigns - List all campaigns (OPTIMIZED - no individual metrics per campaign)
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('📋 GET /api/campaigns called');
    console.log('👤 User:', req.user);

    // Get campaigns from database by organization
    const { data: userCampaigns, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('organization_id', req.user.organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Database error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch campaigns',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    console.log(`📊 Found ${userCampaigns?.length || 0} campaigns for organization ${req.user.organizationId}`);

    // Load metrics for each campaign
    const expandedCampaigns = await Promise.all((userCampaigns || []).map(async campaign => {
      // Get actual lead count and metrics for this campaign
      const actualLeadCount = await getLeadCount(campaign.config?.leadListId, req.user.organizationId);
      const metrics = await getCampaignMetrics(campaign.id, req.user.organizationId);

      const expanded = {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        organizationId: campaign.organization_id,
        createdBy: campaign.created_by,
        createdAt: campaign.created_at,
        updatedAt: campaign.updated_at,
        // Spread config fields to top level
        ...(campaign.config || {}),
        // Ensure type field exists
        type: campaign.config?.type || 'outbound',
        // Keep original config for reference
        _config: campaign.config,
        // Add real metrics
        leads: actualLeadCount,
        sent: metrics.sent,
        delivered: metrics.delivered,
        opened: metrics.opened,
        clicked: metrics.clicked,
        replied: metrics.replied,
        bounced: metrics.bounced,
        openRate: metrics.openRate,
        clickRate: metrics.clickRate,
        replyRate: metrics.replyRate,
        bounceRate: metrics.bounceRate
      };

      console.log(`📊 Campaign ${campaign.name}: ${actualLeadCount} leads, ${metrics.sent} sent, ${metrics.opened} opened`);

      return expanded;
    }));

    console.log(`✅ Returned ${expandedCampaigns.length} campaigns with real metrics`);

    res.json({
      success: true,
      campaigns: expandedCampaigns,
      total: expandedCampaigns.length
    });

  } catch (error) {
    console.error('❌ Campaign list error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaigns',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/campaigns - Create new campaign
router.post('/', authenticateToken, async (req, res) => {
  try {
    console.log('📋 POST /api/campaigns called');
    console.log('👤 User:', req.user);
    console.log('📨 Campaign data:', req.body);

    const {
      name,
      description,
      type,
      emailSubject,
      emailContent,
      emailSequence,
      leadListId,
      emailAccounts,
      scheduleType,
      scheduledDate,
      emailsPerDay,
      emailsPerHour,
      sendingInterval,
      activeDays,
      sendingHours,
      timezone,
      // Advanced settings
      stopOnReply,
      stopOnClick,
      stopOnOpen,
      sendPlainText,
      trackOpens,
      trackClicks,
      companyLevelPause,
      domainLevelPause,
      aiEmailMatching,
      aiLeadCategorization,
      bounceProtection,
      domainRateLimit,
      includeUnsubscribe,
      // Human-like timing settings
      enableJitter,
      jitterMinutes
    } = req.body;

    // 🔍 DEBUG: Log email sequence data specifically
    console.log('🔍 DEBUG - Email Sequence data received:');
    console.log('emailSequence:', emailSequence);
    console.log('emailSequence type:', typeof emailSequence);
    console.log('emailSequence length:', emailSequence?.length);
    console.log('emailSequence content:', JSON.stringify(emailSequence, null, 2));

    // Validate required fields
    if (!name || !emailSubject || !emailContent || !leadListId || !emailAccounts?.length) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        details: 'Campaign name, email subject, content, lead list, and at least one email account are required'
      });
    }

    // Validate minimum sending interval
    if (sendingInterval && sendingInterval < 5) {
      return res.status(400).json({
        success: false,
        error: 'Invalid sending interval',
        details: 'Sending interval must be at least 5 minutes for optimal deliverability'
      });
    }

    // Prepare campaign data for database
    const campaignConfig = {
      description: description || '',
      type: type || 'outbound',
      emailSubject,
      emailContent,
      emailSequence: emailSequence || [],
      leadListId,
      emailAccounts,
      scheduleType: scheduleType || 'immediate',
      scheduledDate: scheduledDate || null,
      emailsPerDay: emailsPerDay || 50,
      emailsPerHour: emailsPerHour || 5,
      sendingInterval: Math.max(5, sendingInterval || 15),
      activeDays: activeDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      sendingHours: sendingHours || { start: 9, end: 17 },
      timezone: timezone || 'UTC',
      // Advanced settings
      stopOnReply: stopOnReply !== undefined ? stopOnReply : true,
      stopOnClick: stopOnClick !== undefined ? stopOnClick : false,
      stopOnOpen: stopOnOpen !== undefined ? stopOnOpen : false,
      sendPlainText: sendPlainText !== undefined ? sendPlainText : false,
      trackOpens: trackOpens !== undefined ? trackOpens : true,
      trackClicks: trackClicks !== undefined ? trackClicks : true,
      companyLevelPause: companyLevelPause !== undefined ? companyLevelPause : true,
      domainLevelPause: domainLevelPause !== undefined ? domainLevelPause : false,
      aiEmailMatching: aiEmailMatching !== undefined ? aiEmailMatching : true,
      aiLeadCategorization: aiLeadCategorization !== undefined ? aiLeadCategorization : false,
      bounceProtection: bounceProtection !== undefined ? bounceProtection : true,
      domainRateLimit: domainRateLimit !== undefined ? domainRateLimit : false,
      includeUnsubscribe: includeUnsubscribe !== undefined ? includeUnsubscribe : true,
      // Human-like timing settings
      enableJitter: enableJitter !== undefined ? enableJitter : true,
      jitterMinutes: Math.min(3, Math.max(1, jitterMinutes || 3)),
      // 🔥 CRITICAL FIX: Auto-enable follow-ups when email sequence is configured
      followUpEnabled: (emailSequence && emailSequence.length > 0) ? true : false
    };

    // Insert campaign into database
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .insert({
        organization_id: req.user.organizationId,
        name,
        status: 'draft',
        config: campaignConfig,
        created_by: req.user.userId
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create campaign',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    console.log('✅ Campaign created successfully:', campaign.id);

    // 🔍 DEBUG: Log what was actually saved to database
    console.log('🔍 DEBUG - Campaign config saved to database:');
    console.log('Campaign ID:', campaign.id);
    console.log('Config emailSequence:', campaign.config?.emailSequence);
    console.log('Config emailSequence length:', campaign.config?.emailSequence?.length);

    res.json({
      success: true,
      campaign: campaign,
      message: 'Campaign created successfully'
    });

  } catch (error) {
    console.error('❌ Campaign creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create campaign',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/campaigns/:id - Get individual campaign
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    console.log('📋 GET /api/campaigns/:id called');
    console.log('👤 User:', req.user);
    console.log('📋 Campaign ID:', req.params.id);

    const campaignId = req.params.id;

    // Find campaign in database
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .eq('organization_id', req.user.organizationId)
      .single();

    if (error || !campaign) {
      console.error('❌ Campaign not found or database error:', error);
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    console.log('✅ Campaign found:', campaign.name);
    console.log('📋 Campaign config:', campaign.config);
    console.log('📋 Config type:', typeof campaign.config);
    console.log('📋 Config keys:', campaign.config ? Object.keys(campaign.config) : 'null/undefined');

    // Get actual lead count for this campaign
    const actualLeadCount = await getLeadCount(campaign.config?.leadListId, req.user.organizationId);
    
    // Get real campaign metrics from scheduled_emails table
    const metrics = await getCampaignMetrics(campaign.id, req.user.organizationId);
    
    // Expand config field for frontend compatibility
    const expandedCampaign = {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      organizationId: campaign.organization_id,
      createdBy: campaign.created_by,
      createdAt: campaign.created_at,
      updatedAt: campaign.updated_at,
      lastActivity: campaign.updated_at, // Use updated_at as last activity
      // Spread config fields to top level first
      ...(campaign.config || {}),
      // Then override with explicit values to ensure they exist
      type: campaign.config?.type || 'outbound',
      // Add metrics with real data
      leads: actualLeadCount,
      sent: metrics.sent,
      delivered: metrics.delivered,
      opened: metrics.opened,
      clicked: metrics.clicked,
      replied: metrics.replied,
      bounced: metrics.bounced,
      openRate: metrics.openRate,
      clickRate: metrics.clickRate,
      replyRate: metrics.replyRate,
      bounceRate: metrics.bounceRate,
      // Add sequence step breakdown
      initialEmails: metrics.initialEmails,
      followUpEmails: metrics.followUpEmails,
      // Add nightly reschedule tracking
      rescheduleCount: campaign.reschedule_count || 0,
      lastRescheduledAt: campaign.last_rescheduled_at || null,
      // Keep original config for reference
      _config: campaign.config
    };
    
    console.log(`📊 Campaign ${campaign.name}: ${actualLeadCount} actual leads, ${metrics.sent} sent from list ${campaign.config?.leadListId}`);
    
    console.log('📤 Sending campaign with type:', expandedCampaign.type);
    console.log('📊 Campaign metrics:', {
      leads: expandedCampaign.leads,
      sent: expandedCampaign.sent,
      opened: expandedCampaign.opened,
      openRate: expandedCampaign.openRate
    });
    console.log('📋 Sending _config:', expandedCampaign._config);
    console.log('📋 Sending emailSubject:', expandedCampaign.emailSubject);
    console.log('📋 Sending emailAccounts:', expandedCampaign.emailAccounts);
    console.log('📋 Sending leadListId:', expandedCampaign.leadListId);

    res.json({
      success: true,
      campaign: expandedCampaign
    });

  } catch (error) {
    console.error('❌ Campaign get error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaign',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/campaigns/:id/start - Start/launch campaign
router.post('/:id/start', authenticateToken, async (req, res) => {
  try {
    console.log('🚨🚨🚨 CRITICAL DEBUG: CAMPAIGN START ENDPOINT CALLED 🚨🚨🚨');
    console.log('🚨🚨🚨 CRITICAL DEBUG: Campaign ID:', req.params.id, '🚨🚨🚨');
    console.log('🚀 POST /api/campaigns/:id/start called');
    console.log('👤 User:', req.user);
    console.log('📋 Campaign ID:', req.params.id);

    const campaignId = req.params.id;

    // CRITICAL: Ensure cron processor is running - start automatically if needed
    console.log('🔍 Step 1: Checking cron processor health...');
    const cronRunning = await healthCheckService.isCronProcessorRunning();
    console.log('✅ Step 1 complete: Cron processor health check finished');
    
    if (!cronRunning) {
      console.log('⚡ Cron processor not running - starting automatically...');
      
      const startResult = await processManager.startCronProcessor();
      
      if (!startResult.success) {
        console.log('❌ Failed to auto-start cron processor');
        return res.status(503).json({
          success: false,
          error: 'Failed to start email processor',
          message: `Could not start the email processor automatically: ${startResult.message}`,
          code: 'CRON_PROCESSOR_START_FAILED'
        });
      }
      
      console.log('✅ Cron processor started automatically - campaign can start');
      
      // Wait a moment for the processor to fully initialize
      await new Promise(resolve => setTimeout(resolve, 3000));
      
    } else {
      console.log('✅ Cron processor already running - campaign can start');
    }

    // Get campaign details first  
    console.log('🔍 Step 2: Fetching campaign details...');
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .eq('organization_id', req.user.organizationId)
      .single();
    console.log('✅ Step 2 complete: Campaign details fetched');

    if (campaignError || !campaign) {
      console.error('❌ Campaign not found or database error:', campaignError);
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    // Prevent starting a campaign that's already active or completed
    if (campaign.status === 'active') {
      console.log(`⚠️ Campaign ${campaignId} is already active, ignoring duplicate start request`);
      return res.status(409).json({
        success: false,
        error: 'Campaign is already active',
        code: 'CAMPAIGN_ALREADY_ACTIVE',
        currentStatus: campaign.status
      });
    }

    // Allow restarting campaigns that are paused, stopped, or completed
    // Only prevent starting if already active (handled above)

    // 🔥 CRITICAL FIX: Immediately update status to 'active' to prevent race conditions
    // This atomic operation prevents duplicate starts by immediately claiming the campaign
    console.log(`🔍 Step 3: Atomically updating campaign ${campaignId} status to 'active' to prevent race conditions...`);
    const { data: statusUpdate, error: statusUpdateError } = await supabase
      .from('campaigns')
      .update({ 
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId)
      .eq('organization_id', req.user.organizationId)
      .eq('status', campaign.status) // Only update if status hasn't changed (prevents race condition)
      .select('status')
      .single();
    console.log('✅ Step 3 complete: Campaign status updated');

    if (statusUpdateError) {
      console.error('❌ Failed to update campaign status:', statusUpdateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to start campaign - database error',
        details: statusUpdateError.message
      });
    }

    if (!statusUpdate) {
      console.log(`⚠️ Campaign ${campaignId} status was changed by another request - aborting duplicate start`);
      return res.status(409).json({
        success: false,
        error: 'Campaign status was changed by another request',
        code: 'CAMPAIGN_STATUS_CHANGED',
        message: 'Another request is already processing this campaign'
      });
    }

    console.log(`✅ Campaign ${campaignId} status successfully updated to 'active' - proceeding with email scheduling`);
    
    // Now the campaign is marked as active, safe to proceed with email scheduling

    // 🔍 STEP 1: Check if campaign already has scheduled emails (prevent duplicates)
    console.log(`🔍 Checking for existing scheduled emails...`);
    const { data: existingEmails, error: existingError } = await supabase
      .from('scheduled_emails')
      .select('id, status, to_email')
      .eq('campaign_id', campaignId)
      .eq('organization_id', req.user.organizationId)
      .limit(5); // Just need to check if any exist
    
    if (existingError) {
      console.error('❌ Error checking for existing emails:', existingError);
      return res.status(500).json({
        success: false,
        error: 'Failed to check existing emails'
      });
    }

    if (existingEmails && existingEmails.length > 0) {
      console.log(`🔄 Campaign restart detected - found ${existingEmails.length} existing emails`);
      console.log(`📧 Sample existing emails:`, existingEmails.map(e => `${e.to_email} (${e.status})`));
      
      // This is a campaign restart - reschedule existing emails instead of creating new ones
      return await rescheduleExistingCampaign(campaignId, req.user.organizationId, campaign, res);
    } else {
      console.log(`🆕 First time campaign launch - no existing emails found`);
      console.log(`🚨 DEBUG: Taking NEW CAMPAIGN path - will call CampaignScheduler directly`);
    }

    // Get leads for this campaign - OPTIMIZED: No more 1000-row limit with pagination
    const leadListId = campaign.config?.leadListId;
    if (!leadListId) {
      return res.status(400).json({
        success: false,
        error: 'No lead list configured for this campaign'
      });
    }

    // OPTIMIZED: Fetch ALL leads with pagination to avoid 1000-row limit
    let allLeads = [];
    let hasMore = true;
    let offset = 0;
    const pageSize = 1000;

    console.log('📊 Fetching all leads for campaign with pagination...');
    while (hasMore) {
      const { data: leadsPage, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .eq('lead_list_id', leadListId)
        .eq('organization_id', req.user.organizationId)
        .eq('status', 'active')
        .range(offset, offset + pageSize - 1);

      if (leadsError) {
        console.error('❌ Error fetching leads:', leadsError);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch leads'
        });
      }

      if (leadsPage && leadsPage.length > 0) {
        allLeads = allLeads.concat(leadsPage);
        hasMore = leadsPage.length === pageSize;
        offset += pageSize;
        console.log(`📊 Fetched ${allLeads.length} leads so far...`);
      } else {
        hasMore = false;
      }
    }

    if (!allLeads || allLeads.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No active leads found for this campaign'
      });
    }

    console.log(`📊 Found ${allLeads.length} leads for campaign ${campaignId} (unlimited processing)`);
    
    // Use allLeads instead of leads from here on

    // Create scheduled emails
    const emailAccounts = campaign.config?.emailAccounts || [];
    if (emailAccounts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No email accounts configured for this campaign'
      });
    }

    // Initialize the comprehensive scheduler
    const scheduler = new CampaignScheduler({
      timezone: campaign.config?.timezone || 'UTC',
      emailsPerDay: campaign.config?.emailsPerDay || 100,
      emailsPerHour: campaign.config?.emailsPerHour || 10,
      sendingInterval: campaign.config?.sendingInterval || 15, // minutes
      sendingHours: campaign.config?.sendingHours || { start: 9, end: 17 },
      activeDays: campaign.config?.activeDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    });

    // Get email sequence (initial + follow-ups)
    const emailSequence = campaign.config?.emailSequence || [];
    const allEmails = [
      {
        id: 0,
        subject: campaign.config?.emailSubject || '',
        content: campaign.config?.emailContent || '',
        delay: 0,
        isInitial: true,
        replyToSameThread: false
      },
      ...emailSequence
    ];

    console.log(`📧 Email sequence: ${allEmails.length} emails (1 initial + ${emailSequence.length} follow-ups)`);

    // Generate schedule respecting ALL campaign rules
    console.log(`🚨 DEBUG: About to call CampaignScheduler.scheduleEmailsWithPerfectRotation() with ${allLeads.length} leads (NEW CAMPAIGN PATH)`);
    console.log(`🚨 DEBUG: Scheduler config:`, {
      timezone: campaign.config?.timezone,
      emailsPerDay: campaign.config?.emailsPerDay,
      emailsPerHour: campaign.config?.emailsPerHour,
      sendingInterval: campaign.config?.sendingInterval,
      sendingHours: campaign.config?.sendingHours
    });
    const schedules = scheduler.scheduleEmailsWithPerfectRotation(allLeads, emailAccounts);
    console.log(`🚨 DEBUG: CampaignScheduler returned ${schedules.length} schedules (NEW CAMPAIGN PATH)`);
    if (schedules.length > 0) {
      const first = schedules[0];
      const last = schedules[schedules.length - 1];
      console.log(`🚨 DEBUG: First email sendAt: ${first.sendAt?.toISOString()} (NEW CAMPAIGN PATH)`);
      console.log(`🚨 DEBUG: Last email sendAt: ${last.sendAt?.toISOString()} (NEW CAMPAIGN PATH)`);
      const timeDiff = last.sendAt - first.sendAt;
      console.log(`🚨 DEBUG: Total time span: ${Math.round(timeDiff / (1000 * 60))} minutes for ${schedules.length} emails (NEW CAMPAIGN PATH)`);
    }
    const scheduledEmails = [];

    schedules.forEach((schedule, scheduleIndex) => {
      const { lead, emailAccountId, sendAt } = schedule;
      
      // ONLY schedule the initial email (emailIndex 0) with proper timing
      // Follow-ups will be scheduled when the initial email is sent
      allEmails.forEach((email, emailIndex) => {
        // Skip follow-up emails for now - they'll be scheduled when initial email is sent
        if (emailIndex > 0) {
          return; // Skip follow-ups in the initial scheduling
        }
        
        // Determine subject - use initial email subject for replies to same thread
        let emailSubject = email.subject;
        if (email.replyToSameThread && emailIndex > 0) {
          emailSubject = `Re: ${allEmails[0].subject}`;
        }
        
        // Apply personalization tokens
        const replacements = {
          '{{firstName}}': lead.first_name || '',
          '{{lastName}}': lead.last_name || '',
          '{{fullName}}': lead.full_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
          '{{company}}': lead.company || '',
          '{{jobTitle}}': lead.job_title || '',
          '{{website}}': lead.website || '',
          '{{email}}': lead.email || '',
          '{firstName}': lead.first_name || '',
          '{lastName}': lead.last_name || '',
          '{fullName}': lead.full_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
          '{company}': lead.company || '',
          '{jobTitle}': lead.job_title || '',
          '{website}': lead.website || '',
          '{email}': lead.email || '',
          '{first_name}': lead.first_name || '',
          '{last_name}': lead.last_name || '',
          '{full_name}': lead.full_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
          '{job_title}': lead.job_title || ''
        };
        
        // Apply spintax first with lead email as seed for consistency
        let personalizedSubject = SpintaxParser.spinWithSeed(emailSubject, lead.email);
        let personalizedContent = SpintaxParser.spinWithSeed(email.content, lead.email);
        
        // Then apply personalization tokens
        Object.entries(replacements).forEach(([token, value]) => {
          personalizedSubject = personalizedSubject.replace(new RegExp(escapeRegExp(token), 'g'), value);
          personalizedContent = personalizedContent.replace(new RegExp(escapeRegExp(token), 'g'), value);
        });
        
        console.log(`📅 Scheduling email ${scheduleIndex + 1}/${schedules.length}: ${lead.email} at ${sendAt.toISOString()}`);
        
        // Generate tracking token if tracking is enabled
        const trackingEnabled = campaign.config?.trackOpens || campaign.config?.trackClicks;
        const trackingToken = trackingEnabled ? emailTrackingService.generateTrackingToken() : null;
        
        // Add tracking to email content if enabled
        let trackedContent = personalizedContent;
        if (trackingEnabled && trackingToken) {
          trackedContent = emailTrackingService.addTrackingToEmail(
            personalizedContent,
            trackingToken,
            campaign.config?.trackOpens || false,
            campaign.config?.trackClicks || false
          );
          console.log(`🔍 Added tracking to email for ${lead.email} with token: ${trackingToken.substring(0, 8)}...`);
        }
        
        scheduledEmails.push({
          campaign_id: campaignId,
          lead_id: lead.id,
          email_account_id: emailAccountId,
          provider: 'gmail', // Default to gmail, will be determined at send time
          from_email: '', // Will be fetched from email account when sending
          to_email: lead.email,
          subject: personalizedSubject,
          content: trackedContent,
          send_at: sendAt ? sendAt.toISOString() : new Date().toISOString(),
          status: 'scheduled',
          organization_id: req.user.organizationId,
          tracking_token: trackingToken,
          sequence_step: emailIndex,
          is_follow_up: emailIndex > 0,
          reply_to_same_thread: email.replyToSameThread || false,
          // New columns added for schema compatibility
          template_data: {
            originalSubject: email.subject,
            originalContent: email.content,
            emailIndex: emailIndex
          },
          email_data: {
            leadData: {
              first_name: lead.first_name,
              last_name: lead.last_name,
              company: lead.company,
              job_title: lead.job_title,
              email: lead.email,
              full_name: lead.full_name,
              website: lead.website
            }
          },
          personalization: replacements,
          variables: {
            spintaxSeed: lead.email,
            sequenceStep: emailIndex,
            campaignName: campaign.name
          }
        });
      });
    });

    // Helper function to escape special regex characters
    function escapeRegExp(string) {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Insert scheduled emails into database using batches to avoid Supabase 1000-row limit
    console.log(`🔍 Step 4: Creating ${scheduledEmails.length} scheduled email records in batches...`);
    console.log('📝 Sample scheduled email record:', JSON.stringify(scheduledEmails[0], null, 2));

    const BATCH_SIZE = 10; // Ultra-small batches to avoid production database timeout
    let totalInserted = 0;

    for (let i = 0; i < scheduledEmails.length; i += BATCH_SIZE) {
      const batch = scheduledEmails.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(scheduledEmails.length / BATCH_SIZE);

      console.log(`📦 Inserting batch ${batchNumber}/${totalBatches}: ${batch.length} emails`);

      const { error: batchError } = await supabase
        .from('scheduled_emails')
        .insert(batch);

      if (batchError) {
        console.error(`❌ Error inserting batch ${batchNumber}:`, batchError);
        return res.status(500).json({
          success: false,
          error: `Failed to schedule emails in batch ${batchNumber}`,
          details: batchError.message
        });
      }

      totalInserted += batch.length;
      console.log(`✅ Batch ${batchNumber} complete: ${batch.length} emails inserted (${totalInserted}/${scheduledEmails.length} total)`);

      // Add a longer delay between batches to reduce production database load
      if (batchNumber < totalBatches) {
        console.log('⏱️ Waiting 500ms before next batch...');
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log('✅ Step 4 complete: All scheduled emails inserted into database');

    // Campaign status was already atomically updated to 'active' earlier to prevent race conditions
    // No need to update status again here

    console.log('🎉 Campaign started successfully:', campaignId);
    console.log(`📧 Scheduled ${totalInserted} emails`);
    console.log(`⏰ First email will send at: ${scheduledEmails[0]?.send_at}`);
    console.log(`⏰ Last email will send at: ${scheduledEmails[scheduledEmails.length - 1]?.send_at}`);
    
    // Expand config field for frontend compatibility
    const expandedCampaign = {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      organizationId: campaign.organization_id,
      createdBy: campaign.created_by,
      createdAt: campaign.created_at,
      updatedAt: campaign.updated_at,
      lastActivity: campaign.updated_at, // Use updated_at as last activity
      // Spread config fields to top level
      ...(campaign.config || {}),
      // Ensure type field exists
      type: campaign.config?.type || 'outbound',
      // Keep original config for reference
      _config: campaign.config
    };
    
    // Use the scheduled emails count instead of separate lead count query
    expandedCampaign.leads = scheduledEmails.length;
    expandedCampaign.sent = 0;
    expandedCampaign.opened = 0;
    expandedCampaign.clicked = 0;
    expandedCampaign.replied = 0;
    expandedCampaign.bounced = 0;
    expandedCampaign.openRate = 0;
    expandedCampaign.clickRate = 0;
    expandedCampaign.replyRate = 0;
    expandedCampaign.bounceRate = 0;

    // Send webhook notification for campaign started
    try {
      await webhookService.sendEmailWebhook(
        req.user.organizationId,
        'campaign.started',
        {
          campaign_id: campaignId,
          name: campaign.name,
          lead_count: scheduledEmails.length,
          emails_scheduled: scheduledEmails.length,
          first_email_at: scheduledEmails[0]?.send_at,
          last_email_at: scheduledEmails[scheduledEmails.length - 1]?.send_at,
          started_at: new Date().toISOString()
        },
        { campaignId: campaignId }
      );
    } catch (webhookError) {
      console.error('⚠️ Failed to send campaign.started webhook:', webhookError);
    }

    res.json({
      success: true,
      campaignId: campaignId,
      status: 'active',
      message: 'Campaign launched successfully',
      emailsScheduled: scheduledEmails.length,
      firstEmailAt: scheduledEmails[0]?.send_at,
      lastEmailAt: scheduledEmails[scheduledEmails.length - 1]?.send_at,
      startedAt: new Date().toISOString(),
      campaign: expandedCampaign
    });

  } catch (error) {
    console.error('❌ Campaign start error:', error);
    console.error('❌ Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
      details: error.details || 'No details available'
    });
    
    // Determine appropriate status code based on error type
    let statusCode = 500;
    if (error.message && (
      error.message.includes('not found') ||
      error.message.includes('Missing required fields') ||
      error.message.includes('Invalid') ||
      error.message.includes('No active leads') ||
      error.message.includes('No email accounts')
    )) {
      statusCode = 400;
      console.error('❌ Treating as 400 Bad Request due to validation error');
    }
    
    res.status(statusCode).json({
      success: false,
      error: 'Failed to start campaign',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      errorType: error.name,
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/campaigns/:id/pause - Pause campaign
router.post('/:id/pause', authenticateToken, async (req, res) => {
  try {
    console.log('⏸️ POST /api/campaigns/:id/pause called');
    const campaignId = req.params.id;
    const organizationId = req.user.organizationId;

    console.log('🔍 Campaign ID:', campaignId);
    console.log('🏢 Organization:', organizationId);

    // First, get the current campaign status
    const { data: campaign, error: fetchError } = await supabase
      .from('campaigns')
      .select('status')
      .eq('id', campaignId)
      .eq('organization_id', organizationId)
      .single();

    if (fetchError || !campaign) {
      console.error('❌ Campaign not found:', fetchError);
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    // Only allow pausing active campaigns
    if (campaign.status !== 'active') {
      console.log(`⚠️ Cannot pause campaign with status: ${campaign.status}`);
      return res.status(400).json({
        success: false,
        error: `Cannot pause campaign with status: ${campaign.status}`,
        currentStatus: campaign.status
      });
    }

    // Update campaign status to paused
    const { data: updatedCampaign, error } = await supabase
      .from('campaigns')
      .update({ 
        status: 'paused',
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      console.error('❌ Database error pausing campaign:', error);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        details: error.message
      });
    }

    if (!updatedCampaign) {
      console.error('❌ Campaign not found:', campaignId);
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    console.log('✅ Campaign paused successfully:', campaignId);

    // Send webhook notification for campaign paused
    try {
      await webhookService.sendEmailWebhook(
        req.user.organizationId,
        'campaign.paused',
        {
          campaign_id: campaignId,
          name: updatedCampaign.name,
          paused_at: new Date().toISOString(),
          previous_status: campaign.status
        },
        { campaignId: campaignId }
      );
    } catch (webhookError) {
      console.error('⚠️ Failed to send campaign.paused webhook:', webhookError);
    }

    res.json({
      success: true,
      campaignId: campaignId,
      status: 'paused',
      message: 'Campaign paused successfully',
      pausedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Campaign pause error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to pause campaign',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/campaigns/:id/stop - Stop campaign
router.post('/:id/stop', authenticateToken, async (req, res) => {
  try {
    console.log('🛑 POST /api/campaigns/:id/stop called');
    const campaignId = req.params.id;
    const organizationId = req.user.organizationId;

    console.log('🔍 Campaign ID:', campaignId);
    console.log('🏢 Organization:', organizationId);

    // First, get the current campaign status
    const { data: campaign, error: fetchError } = await supabase
      .from('campaigns')
      .select('status')
      .eq('id', campaignId)
      .eq('organization_id', organizationId)
      .single();

    if (fetchError || !campaign) {
      console.error('❌ Campaign not found:', fetchError);
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    // Only allow stopping active or paused campaigns
    if (campaign.status !== 'active' && campaign.status !== 'paused') {
      console.log(`⚠️ Cannot stop campaign with status: ${campaign.status}`);
      return res.status(400).json({
        success: false,
        error: `Cannot stop campaign with status: ${campaign.status}`,
        currentStatus: campaign.status
      });
    }

    // Update campaign status to stopped and cancel pending scheduled emails
    const { data: updatedCampaign, error: campaignError } = await supabase
      .from('campaigns')
      .update({ 
        status: 'stopped',
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (campaignError) {
      console.error('❌ Database error stopping campaign:', campaignError);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        details: campaignError.message
      });
    }

    if (!updatedCampaign) {
      console.error('❌ Campaign not found:', campaignId);
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    // Cancel pending scheduled emails - use count query to handle large datasets
    // First, count how many emails will be cancelled
    const { count: cancelCount } = await supabase
      .from('scheduled_emails')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .eq('organization_id', organizationId)
      .eq('status', 'scheduled');

    // Then update them without returning rows (more efficient)
    const { error: cancelError } = await supabase
      .from('scheduled_emails')
      .update({
        status: 'skipped',
        updated_at: new Date().toISOString()
      })
      .eq('campaign_id', campaignId)
      .eq('organization_id', organizationId)
      .eq('status', 'scheduled');

    if (cancelError) {
      console.error('⚠️ Error cancelling scheduled emails:', cancelError);
      // Don't fail the request, just log the error
    } else {
      console.log(`📧 Cancelled ${cancelCount || 0} scheduled emails`);
    }

    console.log('✅ Campaign stopped successfully:', campaignId);

    res.json({
      success: true,
      campaignId: campaignId,
      status: 'completed',
      message: 'Campaign stopped successfully',
      stoppedAt: new Date().toISOString(),
      cancelledEmails: cancelledEmails?.length || 0
    });

  } catch (error) {
    console.error('❌ Campaign stop error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop campaign',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /campaigns/:id/activity - Get recent campaign activity
router.get('/:id/activity', authenticateToken, async (req, res) => {
  try {
    const campaignId = req.params.id;
    const organizationId = req.user.organizationId;

    // Get recent email activity for this campaign with account info
    const { data: emailActivity, error } = await supabase
      .from('scheduled_emails')
      .select(`
        id,
        to_email,
        from_email,
        subject,
        status,
        sent_at,
        created_at,
        error_message,
        email_account_id,
        sequence_step
      `)
      .eq('campaign_id', campaignId)
      .eq('organization_id', organizationId)
      .in('status', ['sent', 'failed', 'bounced'])
      .order('sent_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('❌ Error fetching campaign activity:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch campaign activity'
      });
    }

    // Get email accounts for sender names
    const accountIds = [...new Set((emailActivity || []).map(email => email.email_account_id).filter(Boolean))];
    let emailAccounts = [];
    let oauth2Accounts = [];
    
    if (accountIds.length > 0) {
      // Try email_accounts table first
      const { data: smtpAccounts } = await supabase
        .from('email_accounts')
        .select('id, email, provider')
        .in('id', accountIds)
        .eq('organization_id', organizationId);
      
      emailAccounts = smtpAccounts || [];
      
      // Try oauth2_tokens table for OAuth accounts
      const { data: oauthAccounts } = await supabase
        .from('oauth2_tokens')
        .select('id, email')
        .in('id', accountIds)
        .eq('organization_id', organizationId);
      
      oauth2Accounts = oauthAccounts || [];
    }

    // Create account lookup map
    const accountLookup = {};
    emailAccounts.forEach(account => {
      accountLookup[account.id] = account.email;
    });
    oauth2Accounts.forEach(account => {
      accountLookup[account.id] = account.email;
    });

    // Format activity data for frontend with proper sender email
    const activity = (emailActivity || []).map(email => {
      // Get actual sender email from account lookup
      let senderEmail = email.from_email;
      if (email.email_account_id && accountLookup[email.email_account_id]) {
        senderEmail = accountLookup[email.email_account_id];
      }

      return {
        id: email.id,
        time: email.sent_at || email.created_at,
        from: senderEmail || 'Unknown',
        to: email.to_email || 'Unknown',
        subject: email.subject || 'No subject',
        status: email.status,
        error: email.error_message,
        sequence_step: email.sequence_step || 0
      };
    });

    res.json({
      success: true,
      activity: activity
    });

  } catch (error) {
    console.error('❌ Campaign activity error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaign activity'
    });
  }
});

// GET /campaigns/:id/daily-stats - Get daily email sending and reply stats
router.get('/:id/daily-stats', authenticateToken, async (req, res) => {
  try {
    const campaignId = req.params.id;
    const organizationId = req.user.organizationId;

    console.log(`📊 Fetching daily stats for campaign ${campaignId}, org ${organizationId}`);

    // First, let's check ALL emails for this campaign to see what statuses exist
    const { data: allEmails, error: allError } = await supabase
      .from('scheduled_emails')
      .select('status, sent_at, created_at')
      .eq('campaign_id', campaignId)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (allEmails && allEmails.length > 0) {
      const statusCounts = {};
      allEmails.forEach(e => {
        statusCounts[e.status] = (statusCounts[e.status] || 0) + 1;
      });
      console.log('📧 Sample statuses in scheduled_emails:', statusCounts);
      console.log('📧 Sample email:', allEmails[0]);
    } else {
      console.log('⚠️ NO emails found in scheduled_emails for this campaign!');
    }

    // Get daily email sending stats for the last 30 days (sent emails) with pagination
    let emailStats = [];
    let emailError = null;
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // Count first
      const { count: emailCount } = await supabase
        .from('scheduled_emails')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaignId)
        .eq('organization_id', organizationId)
        .eq('status', 'sent')
        .gte('sent_at', thirtyDaysAgo);

      if (emailCount && emailCount > 0) {
        const pageSize = 1000;
        let page = 0;
        const allEmails = [];

        while (allEmails.length < emailCount) {
          const { data: pageData, error: pageError } = await supabase
            .from('scheduled_emails')
            .select('sent_at, status')
            .eq('campaign_id', campaignId)
            .eq('organization_id', organizationId)
            .eq('status', 'sent')
            .gte('sent_at', thirtyDaysAgo)
            .order('sent_at', { ascending: true })
            .range(page * pageSize, (page + 1) * pageSize - 1);

          if (pageError) throw pageError;
          if (!pageData || pageData.length === 0) break;

          allEmails.push(...pageData);
          page++;
        }

        emailStats = allEmails;
      }
    } catch (error) {
      emailError = error;
      console.error('❌ Error fetching email stats:', emailError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch email stats'
      });
    }

    console.log(`📧 Found ${emailStats?.length || 0} sent emails in last 30 days`);
    if (emailStats && emailStats.length > 0) {
      console.log(`📧 First sent email: ${emailStats[0].sent_at}`);
      console.log(`📧 Last sent email: ${emailStats[emailStats.length - 1].sent_at}`);
    }

    // Get daily bounce stats for the last 30 days with pagination
    let bounceStats = [];
    let bounceError = null;
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // Count first
      const { count: bounceCount } = await supabase
        .from('scheduled_emails')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaignId)
        .eq('organization_id', organizationId)
        .or('status.eq.bounced,and(status.eq.failed,error_message.ilike.%bounce%),and(status.eq.failed,error_message.ilike.%domain%),and(status.eq.failed,error_message.ilike.%nxdomain%)')
        .gte('sent_at', thirtyDaysAgo);

      if (bounceCount && bounceCount > 0) {
        const pageSize = 1000;
        let page = 0;
        const allBounces = [];

        while (allBounces.length < bounceCount) {
          const { data: pageData, error: pageError } = await supabase
            .from('scheduled_emails')
            .select('sent_at, status, error_message')
            .eq('campaign_id', campaignId)
            .eq('organization_id', organizationId)
            .or('status.eq.bounced,and(status.eq.failed,error_message.ilike.%bounce%),and(status.eq.failed,error_message.ilike.%domain%),and(status.eq.failed,error_message.ilike.%nxdomain%)')
            .gte('sent_at', thirtyDaysAgo)
            .order('sent_at', { ascending: true })
            .range(page * pageSize, (page + 1) * pageSize - 1);

          if (pageError) throw pageError;
          if (!pageData || pageData.length === 0) break;

          allBounces.push(...pageData);
          page++;
        }

        bounceStats = allBounces;
      }
    } catch (error) {
      bounceError = error;
      console.error('❌ Error fetching bounce stats:', bounceError);
    }

    if (!bounceError) {
      console.log(`📊 Found ${bounceStats?.length || 0} bounces for campaign ${campaignId}`);
    }

    // Get daily reply stats from unified inbox conversations with pagination
    let replyStats = [];
    let replyError = null;
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // Count first
      const { count: replyCount } = await supabase
        .from('conversation_messages')
        .select('*, conversations!inner(campaign_id, organization_id)', { count: 'exact', head: true })
        .eq('conversations.campaign_id', campaignId)
        .eq('conversations.organization_id', organizationId)
        .eq('direction', 'received')
        .gte('created_at', thirtyDaysAgo);

      if (replyCount && replyCount > 0) {
        const pageSize = 1000;
        let page = 0;
        const allReplies = [];

        while (allReplies.length < replyCount) {
          const { data: pageData, error: pageError } = await supabase
            .from('conversation_messages')
            .select(`
              created_at,
              conversations!inner(campaign_id, organization_id)
            `)
            .eq('conversations.campaign_id', campaignId)
            .eq('conversations.organization_id', organizationId)
            .eq('direction', 'received')
            .gte('created_at', thirtyDaysAgo)
            .order('created_at', { ascending: true })
            .range(page * pageSize, (page + 1) * pageSize - 1);

          if (pageError) throw pageError;
          if (!pageData || pageData.length === 0) break;

          allReplies.push(...pageData);
          page++;
        }

        replyStats = allReplies;
      }
    } catch (error) {
      replyError = error;
      console.error('❌ Error fetching reply stats:', replyError);
    }

    if (!replyError) {
      console.log(`📊 Found ${replyStats?.length || 0} replies for campaign ${campaignId}`);
    }

    // Get campaign timezone for date grouping
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('config')
      .eq('id', campaignId)
      .eq('organization_id', organizationId)
      .single();

    const campaignTimezone = campaign?.config?.timezone || 'UTC';

    // Group emails by date (timezone-aware)
    const emailsByDate = {};
    (emailStats || []).forEach(email => {
      if (email.sent_at) {
        // Convert to campaign timezone before extracting date
        const tzDate = formatCampaignDate(email.sent_at, campaignTimezone, 'yyyy-MM-dd');
        emailsByDate[tzDate] = (emailsByDate[tzDate] || 0) + 1;
      }
    });

    // Group bounces by date using sent_at (timezone-aware)
    const bouncesByDate = {};
    (bounceStats || []).forEach(bounce => {
      if (bounce.sent_at) {
        const tzDate = formatCampaignDate(bounce.sent_at, campaignTimezone, 'yyyy-MM-dd');
        bouncesByDate[tzDate] = (bouncesByDate[tzDate] || 0) + 1;
      }
    });

    // Group replies by date using created_at (timezone-aware)
    const repliesByDate = {};
    (replyStats || []).forEach(reply => {
      if (reply.created_at) {
        const tzDate = formatCampaignDate(reply.created_at, campaignTimezone, 'yyyy-MM-dd');
        repliesByDate[tzDate] = (repliesByDate[tzDate] || 0) + 1;
      }
    });

    // Create daily stats array (timezone-aware)
    const stats = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      // Use timezone-aware date formatting
      const dateStr = formatCampaignDate(date, campaignTimezone, 'yyyy-MM-dd');
      const displayDate = formatCampaignDate(date, campaignTimezone, 'MMM d');

      stats.push({
        date: displayDate,
        fullDate: dateStr,
        sent: emailsByDate[dateStr] || 0,
        bounced: bouncesByDate[dateStr] || 0,
        replies: repliesByDate[dateStr] || 0
      });
    }

    // Log summary
    const totalSent = Object.values(emailsByDate).reduce((a, b) => a + b, 0);
    const totalBounces = Object.values(bouncesByDate).reduce((a, b) => a + b, 0);
    const totalReplies = Object.values(repliesByDate).reduce((a, b) => a + b, 0);
    console.log(`📊 Stats summary - Sent: ${totalSent}, Bounces: ${totalBounces}, Replies: ${totalReplies}`);
    console.log(`📊 Returning ${stats.length} days of stats`);

    res.json({
      success: true,
      stats: stats
    });

  } catch (error) {
    console.error('❌ Campaign daily stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch daily stats'
    });
  }
});

// GET /campaigns/:id/scheduled-activity - Get scheduled emails for this campaign
router.get('/:id/scheduled-activity', authenticateToken, async (req, res) => {
  try {
    const campaignId = req.params.id;
    const organizationId = req.user.organizationId;

    // Get campaign timezone for proper time formatting
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('config')
      .eq('id', campaignId)
      .eq('organization_id', organizationId)
      .single();

    if (campaignError) {
      console.error('❌ Error fetching campaign for timezone:', campaignError);
    }

    const campaignTimezone = campaign?.config?.timezone || 'UTC';
    console.log('🕐 Campaign timezone for scheduled activity:', campaignTimezone, 'from campaign config:', campaign?.config);

    // Get scheduled emails with account info
    const { data: scheduledEmails, error } = await supabase
      .from('scheduled_emails')
      .select(`
        id,
        to_email,
        from_email,
        subject,
        status,
        send_at,
        created_at,
        error_message,
        email_account_id
      `)
      .eq('campaign_id', campaignId)
      .eq('organization_id', organizationId)
      .eq('status', 'scheduled')
      .order('send_at', { ascending: true })
      .limit(20);

    if (error) {
      console.error('❌ Error fetching scheduled activity:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch scheduled activity'
      });
    }

    // Get email accounts for sender names
    const accountIds = [...new Set((scheduledEmails || []).map(email => email.email_account_id).filter(Boolean))];
    let emailAccounts = [];
    let oauth2Accounts = [];
    
    if (accountIds.length > 0) {
      // Try email_accounts table first
      const { data: smtpAccounts } = await supabase
        .from('email_accounts')
        .select('id, email, provider')
        .in('id', accountIds)
        .eq('organization_id', organizationId);
      
      emailAccounts = smtpAccounts || [];
      
      // Try oauth2_tokens table for OAuth accounts
      const { data: oauthAccounts } = await supabase
        .from('oauth2_tokens')
        .select('id, email')
        .in('id', accountIds)
        .eq('organization_id', organizationId);
      
      oauth2Accounts = oauthAccounts || [];
    }

    // Create account lookup map
    const accountLookup = {};
    emailAccounts.forEach(account => {
      accountLookup[account.id] = account.email;
    });
    oauth2Accounts.forEach(account => {
      accountLookup[account.id] = account.email;
    });

    // Format scheduled activity data for frontend
    const activity = (scheduledEmails || []).map(email => {
      // Get actual sender email from account lookup
      let senderEmail = email.from_email;
      if (email.email_account_id && accountLookup[email.email_account_id]) {
        senderEmail = accountLookup[email.email_account_id];
      }

      // CRITICAL FIX: Format timestamp using TimezoneService with campaign timezone
      // This ensures the 'Z' suffix fix is applied before sending to frontend
      const formattedTime = TimezoneService.convertToUserTimezone(
        email.send_at,
        campaignTimezone,
        {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }
      );

      console.log('🕐 Timezone conversion for scheduled activity:', {
        rawTime: email.send_at,
        campaignTimezone,
        formattedTime
      });

      return {
        id: email.id,
        time: formattedTime, // Properly formatted timestamp with timezone conversion
        rawTime: email.send_at, // Keep raw for debugging
        from: senderEmail || 'Unknown',
        to: email.to_email || 'Unknown',
        subject: email.subject || 'No subject',
        status: email.status,
        error: email.error_message
      };
    });

    res.json({
      success: true,
      activity: activity
    });

  } catch (error) {
    console.error('❌ Scheduled activity error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch scheduled activity'
    });
  }
});

/**
 * 🔄 STEP 2: Reschedule existing campaign instead of creating duplicates
 * This function handles campaign restarts by cancelling old scheduled emails
 * and creating a fresh schedule starting from NOW
 */
async function rescheduleExistingCampaign(campaignId, organizationId, campaign, res) {
  console.log(`🔄 Starting campaign restart process for ${campaignId}`);
  console.log(`🚨 DEBUG: Taking RESTART CAMPAIGN path - will call CampaignScheduler from rescheduleExistingCampaign()`);
  
  try {
    // 🔒 CRITICAL: Add atomic protection to prevent concurrent reschedule operations
    // Check if another reschedule is already in progress by looking for a temporary status
    console.log(`🔍 Checking if another reschedule operation is in progress...`);
    const { data: statusCheck, error: statusError } = await supabase
      .from('campaigns')
      .select('status, updated_at')
      .eq('id', campaignId)
      .eq('organization_id', organizationId)
      .single();
      
    if (statusError) {
      console.error('❌ Error checking campaign status:', statusError);
      return res.status(500).json({
        success: false,
        error: 'Failed to check campaign status'
      });
    }
    
    // FIXED: Use a more specific check for actual reschedule operations
    // Instead of blocking on any update, check for concurrent reschedule operations
    // by looking for recent 'skipped' status updates which indicate active rescheduling
    console.log(`✅ Concurrent protection check passed - proceeding with reschedule`);

    // Check if there are any recent 'skipped' emails indicating active rescheduling
    const { data: recentSkipped, error: skipError } = await supabase
      .from('scheduled_emails')
      .select('updated_at')
      .eq('campaign_id', campaignId)
      .eq('organization_id', organizationId)
      .eq('status', 'skipped')
      .gte('updated_at', new Date(Date.now() - 30 * 1000).toISOString())
      .limit(1);

    if (skipError) {
      console.warn('⚠️ Could not check for concurrent reschedule, proceeding cautiously');
    } else if (recentSkipped && recentSkipped.length > 0) {
      const lastSkipped = new Date(recentSkipped[0].updated_at);
      const timeDiff = (Date.now() - lastSkipped.getTime()) / 1000;
      if (timeDiff < 30) {
        console.log(`⚠️ Recent reschedule detected ${timeDiff.toFixed(1)}s ago - potential concurrent operation`);
        console.log(`🛑 Aborting reschedule to prevent duplicates`);
        return res.status(409).json({
          success: false,
          error: 'Another reschedule operation is already in progress',
          code: 'RESCHEDULE_IN_PROGRESS',
          lastReschedule: recentSkipped[0].updated_at
        });
      }
    }
    
    // Step 2.1: Get existing scheduled_emails - separate 'sent' from others
    // CRITICAL: Never update 'sent' emails - they represent actual sent messages
    console.log(`🔄 Analyzing existing scheduled_emails...`);

    // Get all existing scheduled_emails for this campaign with pagination
    let allExistingEmails = [];
    let page = 0;
    const restartPageSize = 1000;

    while (true) {
      const { data: emailsPage } = await supabase
        .from('scheduled_emails')
        .select('id, lead_id, status')
        .eq('campaign_id', campaignId)
        .eq('organization_id', organizationId)
        .range(page * restartPageSize, (page + 1) * restartPageSize - 1);

      if (!emailsPage || emailsPage.length === 0) break;
      allExistingEmails = allExistingEmails.concat(emailsPage);
      if (emailsPage.length < restartPageSize) break;
      page++;
    }

    console.log(`📧 Found ${allExistingEmails.length} total existing scheduled_emails`);

    // Separate 'sent' emails (NEVER touch these) from updateable emails
    const sentEmails = new Set();
    const updateableEmailMap = new Map();

    allExistingEmails.forEach(email => {
      if (email.status === 'sent') {
        // CRITICAL: Preserve sent emails - they're conversation history!
        sentEmails.add(email.lead_id);
      } else if (email.status === 'scheduled' || email.status === 'failed' || email.status === 'skipped') {
        // These can be updated/rescheduled
        updateableEmailMap.set(email.lead_id, email);
      }
      // Note: 'sending' status emails are in-flight, skip them
    });

    console.log(`✅ Sent emails (preserved): ${sentEmails.size}`);
    console.log(`🔄 Updateable emails: ${updateableEmailMap.size}`);

    // Step 2.2: Get leads for rescheduling
    const leadListId = campaign.config?.leadListId;
    if (!leadListId) {
      return res.status(400).json({
        success: false,
        error: 'No lead list configured for this campaign'
      });
    }

    // OPTIMIZED: Fetch ALL leads with pagination for restart (no 1000-row limit)
    let allLeadsForRestart = [];
    let hasMore = true;
    let offset = 0;

    console.log('📊 Fetching all leads for restart with pagination...');
    while (hasMore) {
      const { data: leadsPage, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .eq('lead_list_id', leadListId)
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .range(offset, offset + restartPageSize - 1);

      if (leadsError) {
        console.error('❌ Error fetching leads for restart:', leadsError);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch leads for rescheduling'
        });
      }

      if (leadsPage && leadsPage.length > 0) {
        allLeadsForRestart = allLeadsForRestart.concat(leadsPage);
        hasMore = leadsPage.length === restartPageSize;
        offset += restartPageSize;
        console.log(`📊 Fetched ${allLeadsForRestart.length} leads for restart so far...`);
      } else {
        hasMore = false;
      }
    }

    if (!allLeadsForRestart || allLeadsForRestart.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No active leads found for rescheduling'
      });
    }

    console.log(`📊 Found ${allLeadsForRestart.length} leads for rescheduling (unlimited processing)`);

    // 🔥 CRITICAL FIX: Filter out already-sent leads BEFORE scheduling
    // Bug: Scheduling ALL leads then filtering creates massive time gaps
    // Fix: Only schedule leads that actually need scheduling
    const leadsToSchedule = allLeadsForRestart.filter(lead => !sentEmails.has(lead.id));
    console.log(`🔥 Filtered to ${leadsToSchedule.length} leads (excluding ${sentEmails.size} already sent)`);

    // Step 2.3: Create fresh schedule starting from NOW (reuse existing logic)
    const emailAccounts = campaign.config?.emailAccounts || [];
    if (emailAccounts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No email accounts configured for this campaign'
      });
    }

    // Use existing CampaignScheduler for proper timing
    const CampaignScheduler = require('../utils/CampaignScheduler');
    const scheduler = new CampaignScheduler({
      timezone: campaign.config?.timezone || 'UTC',
      emailsPerDay: campaign.config?.emailsPerDay || 100,
      emailsPerHour: campaign.config?.emailsPerHour || 10,
      sendingInterval: campaign.config?.sendingInterval || 15,
      sendingHours: campaign.config?.sendingHours || { start: 9, end: 17 },
      activeDays: campaign.config?.activeDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    });

    console.log(`📅 Creating fresh schedule with PERFECT ROTATION starting from NOW...`);
    // 🔥 CRITICAL FIX: Only schedule leads that need scheduling (not sent ones)
    const leadSchedules = scheduler.scheduleEmailsWithPerfectRotation(leadsToSchedule, emailAccounts);
    console.log(`✅ Generated ${leadSchedules.length} schedules with perfect rotation`);

    if (leadSchedules.length > 0) {
      const first = leadSchedules[0];
      const last = leadSchedules[leadSchedules.length - 1];
      console.log(`⏰ First email: ${first.sendAt?.toISOString()}`);
      console.log(`⏰ Last email: ${last.sendAt?.toISOString()}`);
    }

    // Step 2.4: Separate leads into categories
    const leadsAlreadySent = [];      // Already sent - SKIP (preserve conversation)
    const leadsToUpdate = [];         // Have updateable scheduled_emails - UPDATE
    const leadsToInsert = [];         // No scheduled_emails - INSERT

    leadSchedules.forEach(schedule => {
      const leadId = schedule.lead.id;

      if (sentEmails.has(leadId)) {
        // CRITICAL: Already sent to this lead - preserve conversation history
        leadsAlreadySent.push(schedule);
      } else if (updateableEmailMap.has(leadId)) {
        // Has a scheduled/failed/skipped email - update it
        leadsToUpdate.push(schedule);
      } else {
        // No scheduled_email at all - create new one
        leadsToInsert.push(schedule);
      }
    });

    console.log(`✅ Already sent (SKIP): ${leadsAlreadySent.length}`);
    console.log(`🔄 To update: ${leadsToUpdate.length}`);
    console.log(`➕ To insert: ${leadsToInsert.length}`);

    // Step 2.5: UPDATE existing scheduled_emails (scheduled/failed/skipped only)
    let totalUpdated = 0;
    const UPDATE_BATCH_SIZE = 50;

    for (let i = 0; i < leadsToUpdate.length; i += UPDATE_BATCH_SIZE) {
      const batch = leadsToUpdate.slice(i, i + UPDATE_BATCH_SIZE);

      for (const schedule of batch) {
        const existingEmail = updateableEmailMap.get(schedule.lead.id);
        const lead = schedule.lead;

        // 🔥 CRITICAL: Process spintax and personalization (same as createScheduledEmailRecord)
        const rawSubject = campaign.config.emailSubject;
        const rawContent = campaign.config.emailContent;

        // Apply spintax processing with lead email as seed for consistency
        let processedSubject = SpintaxParser.spinWithSeed(rawSubject, lead.email);
        let processedContent = SpintaxParser.spinWithSeed(rawContent, lead.email);

        // Define personalization tokens
        const replacements = {
          '{{firstName}}': lead.first_name || '',
          '{{lastName}}': lead.last_name || '',
          '{{fullName}}': lead.full_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
          '{{company}}': lead.company || '',
          '{{jobTitle}}': lead.job_title || '',
          '{{website}}': lead.website || '',
          '{{email}}': lead.email || '',
          '{firstName}': lead.first_name || '',
          '{lastName}': lead.last_name || '',
          '{fullName}': lead.full_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
          '{company}': lead.company || '',
          '{jobTitle}': lead.job_title || '',
          '{website}': lead.website || '',
          '{email}': lead.email || '',
          '{first_name}': lead.first_name || '',
          '{last_name}': lead.last_name || '',
          '{full_name}': lead.full_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
          '{job_title}': lead.job_title || ''
        };

        // Apply personalization tokens
        function escapeRegExp(string) {
          return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }

        Object.entries(replacements).forEach(([token, value]) => {
          processedSubject = processedSubject.replace(new RegExp(escapeRegExp(token), 'g'), value);
          processedContent = processedContent.replace(new RegExp(escapeRegExp(token), 'g'), value);
        });

        const { error: updateError } = await supabase
          .from('scheduled_emails')
          .update({
            send_at: schedule.sendAt.toISOString(),
            status: 'scheduled', // Reset to scheduled if was 'skipped' or 'failed'
            email_account_id: schedule.emailAccountId,
            subject: processedSubject, // 🔥 FIXED: Use processed subject with spintax + personalization
            content: processedContent, // 🔥 FIXED: Use processed content with spintax + personalization
            updated_at: new Date().toISOString(),
            error_message: null // Clear any previous errors
          })
          .eq('id', existingEmail.id);

        if (updateError) {
          console.error(`❌ Error updating scheduled_email ${existingEmail.id}:`, updateError);
        } else {
          totalUpdated++;
        }
      }

      console.log(`🔄 Updated ${totalUpdated}/${leadsToUpdate.length} existing emails...`);
    }

    console.log(`✅ Updated ${totalUpdated} existing scheduled_emails`);

    // Step 2.6: INSERT new scheduled_emails for leads WITHOUT existing records
    const INSERT_BATCH_SIZE = 100;
    let totalInserted = 0;

    for (let i = 0; i < leadsToInsert.length; i += INSERT_BATCH_SIZE) {
      const batch = leadsToInsert.slice(i, i + INSERT_BATCH_SIZE);

      const scheduledEmails = [];
      batch.forEach(schedule => {
        const lead = schedule.lead;
        const sendAt = schedule.sendAt;
        const emailAccountId = schedule.emailAccountId;

        // Create main email
        const mainEmail = createScheduledEmailRecord(
          campaignId,
          lead,
          emailAccountId,
          campaign,
          sendAt,
          organizationId,
          0 // sequence_step = 0 for main email
        );
        scheduledEmails.push(mainEmail);

        // Create follow-up emails if configured
        const emailSequence = campaign.config?.emailSequence || [];
        emailSequence.forEach((email, emailIndex) => {
          const followUpDelay = email.delay * 24 * 60 * 60 * 1000; // Convert days to milliseconds
          const followUpSendAt = new Date(sendAt.getTime() + followUpDelay);

          const followUpEmail = createScheduledEmailRecord(
            campaignId,
            lead,
            emailAccountId,
            campaign,
            followUpSendAt,
            organizationId,
            emailIndex + 1, // sequence_step starts from 1 for follow-ups
            email
          );
          scheduledEmails.push(followUpEmail);
        });
      });

      // Insert batch
      const { error: insertError } = await supabase
        .from('scheduled_emails')
        .insert(scheduledEmails);

      if (insertError) {
        console.error(`❌ Error inserting batch ${i / INSERT_BATCH_SIZE + 1}:`, insertError);
        return res.status(500).json({
          success: false,
          error: 'Failed to schedule emails during restart'
        });
      }

      totalInserted += scheduledEmails.length;
      console.log(`➕ Inserted batch ${Math.floor(i / INSERT_BATCH_SIZE) + 1}: ${scheduledEmails.length} emails (${totalInserted} total)`);
    }

    console.log(`✅ Inserted ${totalInserted} new scheduled_emails`);

    // 🔥 NEW: Rescue follow-ups stuck on inactive days or marked as skipped
    console.log(`\n🔧 Checking for stuck follow-ups to rescue...`);
    const CronEmailProcessor = require('../services/CronEmailProcessor');
    const cronProcessor = new CronEmailProcessor();
    await cronProcessor.rescueStuckFollowUps(organizationId, campaignId, campaign.config);

    console.log(`🎉 Campaign restart completed successfully!`);
    console.log(`🔄 Updated: ${totalUpdated} emails`);
    console.log(`➕ Inserted: ${totalInserted} emails`);
    console.log(`📧 Total processed: ${totalUpdated + totalInserted} emails`);
    console.log(`⏰ First email will send at: ${leadSchedules[0]?.sendAt}`);
    console.log(`⏰ Last email will send at: ${leadSchedules[leadSchedules.length - 1]?.sendAt}`);

    // Return success response
    res.json({
      success: true,
      campaignId: campaignId,
      status: 'active',
      message: 'Campaign restarted successfully - existing emails updated, no duplicates created',
      type: 'restart',
      emailsUpdated: totalUpdated,
      emailsInserted: totalInserted,
      totalProcessed: totalUpdated + totalInserted,
      firstEmailAt: leadSchedules[0]?.sendAt,
      lastEmailAt: leadSchedules[leadSchedules.length - 1]?.sendAt,
      restartedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Campaign restart error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to restart campaign',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Helper function to create scheduled email record
 * (reuse existing logic from campaign start)
 */
function createScheduledEmailRecord(campaignId, lead, emailAccountId, campaign, sendAt, organizationId, sequenceStep, emailConfig = null) {
  const isFollowUp = sequenceStep > 0;
  const rawEmailContent = isFollowUp ? emailConfig.content : campaign.config.emailContent;
  const rawEmailSubject = isFollowUp ? emailConfig.subject : campaign.config.emailSubject;

  // 🔥 CRITICAL FIX: Apply spintax processing and personalization
  // This was missing in campaign restarts, causing raw spintax to appear in emails

  // Define personalization tokens
  const replacements = {
    '{{firstName}}': lead.first_name || '',
    '{{lastName}}': lead.last_name || '',
    '{{fullName}}': lead.full_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
    '{{company}}': lead.company || '',
    '{{jobTitle}}': lead.job_title || '',
    '{{website}}': lead.website || '',
    '{{email}}': lead.email || '',
    '{firstName}': lead.first_name || '',
    '{lastName}': lead.last_name || '',
    '{fullName}': lead.full_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
    '{company}': lead.company || '',
    '{jobTitle}': lead.job_title || '',
    '{website}': lead.website || '',
    '{email}': lead.email || '',
    '{first_name}': lead.first_name || '',
    '{last_name}': lead.last_name || '',
    '{full_name}': lead.full_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
    '{job_title}': lead.job_title || ''
  };

  // Apply spintax processing first (using lead email as seed for consistency)
  let processedSubject = SpintaxParser.spinWithSeed(rawEmailSubject, lead.email);
  let processedContent = SpintaxParser.spinWithSeed(rawEmailContent, lead.email);

  // Apply personalization tokens
  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  Object.entries(replacements).forEach(([token, value]) => {
    processedSubject = processedSubject.replace(new RegExp(escapeRegExp(token), 'g'), value);
    processedContent = processedContent.replace(new RegExp(escapeRegExp(token), 'g'), value);
  });

  // Determine subject - use initial email subject for replies to same thread
  if (emailConfig?.replyToSameThread && isFollowUp) {
    // For replies, use "Re:" prefix with the original initial email subject
    const initialSubject = campaign.config?.emailSubject || '';
    processedSubject = `Re: ${SpintaxParser.spinWithSeed(initialSubject, lead.email)}`;
    // Apply personalization to the reply subject too
    Object.entries(replacements).forEach(([token, value]) => {
      processedSubject = processedSubject.replace(new RegExp(escapeRegExp(token), 'g'), value);
    });
  }

  console.log(`✅ Processed spintax and personalization for ${lead.email}: "${processedSubject.substring(0, 50)}..."`);

  // Generate unique Message-ID
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const messageId = `<${campaignId}-${lead.id}-${sequenceStep}-${timestamp}-${random}@mailsender.local>`;

  // Generate tracking token if tracking is enabled
  const trackingEnabled = campaign.config?.trackOpens || campaign.config?.trackClicks;
  const trackingToken = trackingEnabled ? emailTrackingService.generateTrackingToken() : null;

  // Add tracking to email content if enabled
  let trackedContent = processedContent;
  if (trackingEnabled && trackingToken) {
    trackedContent = emailTrackingService.addTrackingToEmail(
      processedContent,
      trackingToken,
      campaign.config?.trackOpens || false,
      campaign.config?.trackClicks || false
    );
  }

  return {
    id: require('crypto').randomUUID(),
    campaign_id: campaignId,
    lead_id: lead.id,
    email_account_id: emailAccountId,
    to_email: lead.email,
    from_email: '', // Will be set by email processor
    subject: processedSubject,
    content: trackedContent,
    send_at: sendAt ? sendAt.toISOString() : new Date().toISOString(),
    status: 'scheduled',
    organization_id: organizationId,
    tracking_token: trackingToken,
    message_id_header: messageId,
    sequence_step: sequenceStep,
    is_follow_up: isFollowUp,
    reply_to_same_thread: emailConfig?.replyToSameThread || false,
    created_at: toLocalTimestamp(new Date()),
    // Store original content for debugging
    template_data: {
      originalSubject: rawEmailSubject,
      originalContent: rawEmailContent,
      emailIndex: sequenceStep
    },
    email_data: {
      leadData: {
        first_name: lead.first_name,
        last_name: lead.last_name,
        company: lead.company,
        job_title: lead.job_title,
        email: lead.email,
        full_name: lead.full_name,
        website: lead.website
      }
    },
    personalization: replacements,
    variables: {
      spintaxSeed: lead.email,
      sequenceStep: sequenceStep,
      campaignName: campaign.name
    }
  };
}

// PUT /api/campaigns/:id - Update existing campaign
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const campaignId = req.params.id;
    const organizationId = req.user.organizationId;

    console.log('✏️ PUT /api/campaigns/:id called for campaign:', campaignId);

    // Validate campaign ownership and status - FETCH FULL CAMPAIGN INCLUDING CONFIG
    const { data: existingCampaign, error: fetchError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .eq('organization_id', organizationId)
      .single();

    if (fetchError || !existingCampaign) {
      console.error('❌ Campaign not found:', fetchError);
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    // Prevent editing active campaigns
    if (existingCampaign.status === 'active') {
      return res.status(400).json({
        success: false,
        error: 'Cannot edit active campaigns. Please pause the campaign first.'
      });
    }

    // DEBUG: Log the entire request body to see what frontend is sending
    console.log('\n\n' + '='.repeat(80));
    console.log('🚨🚨🚨 CAMPAIGN UPDATE REQUEST RECEIVED 🚨🚨🚨');
    console.log('='.repeat(80));
    console.log('Campaign ID:', req.params.id);
    console.log('Request Body:', JSON.stringify(req.body, null, 2));
    console.log('='.repeat(80) + '\n\n');

    // CRITICAL FIX: Frontend sends data nested in config object
    // Extract name from root level, everything else from config
    const { name, config: frontendConfig = {} } = req.body;

    const {
      description,
      emailSubject,
      emailContent,
      followUpEnabled,
      emailSequence,
      selectedLeads,
      leadListId: selectedLeadListId,
      leadListName: selectedLeadListName,
      leadListCount: selectedLeadListCount,
      emailAccounts,
      selectedAccountIds,
      emailsPerDay,
      emailsPerHour,
      sendingInterval,
      trackOpens,
      trackClicks,
      stopOnReply,
      activeDays,
      sendingHours,
      enableJitter,
      jitterMinutes,
      timezone
    } = frontendConfig;

    // CRITICAL FIX: Merge with existing config to prevent data loss
    const existingConfig = existingCampaign.config || {};

    // Helper function to check if a value should be considered "empty" and not overwrite existing config
    const isEmptyValue = (value) => {
      if (value === undefined || value === null) return true;
      if (value === '') return true;
      if (Array.isArray(value) && value.length === 0) return true;
      return false;
    };

    // Helper function to get value or fallback to existing
    const getValueOrExisting = (newValue, existingValue, defaultValue = undefined) => {
      if (!isEmptyValue(newValue)) return newValue;
      if (!isEmptyValue(existingValue)) return existingValue;
      return defaultValue;
    };

    // 🔥 CRITICAL FIX: Determine final email sequence value
    const finalEmailSequence = getValueOrExisting(emailSequence, existingConfig.emailSequence, []);

    // 🔥 CRITICAL FIX: Auto-enable follow-ups when email sequence is configured
    // Priority: 1) Explicit followUpEnabled from frontend, 2) Auto-detect from sequence, 3) Existing config
    let finalFollowUpEnabled;
    if (followUpEnabled !== undefined) {
      // Frontend explicitly set the value
      finalFollowUpEnabled = followUpEnabled;
    } else if (finalEmailSequence && finalEmailSequence.length > 0) {
      // Auto-enable if sequence has items
      finalFollowUpEnabled = true;
    } else {
      // Fallback to existing config or false
      finalFollowUpEnabled = existingConfig.followUpEnabled || false;
    }

    // Build campaign config - preserve existing values if new values are empty
    const campaignConfig = {
      description: getValueOrExisting(description, existingConfig.description, ''),
      emailSubject: getValueOrExisting(emailSubject, existingConfig.emailSubject),
      emailContent: getValueOrExisting(emailContent, existingConfig.emailContent),
      followUpEnabled: finalFollowUpEnabled,
      emailSequence: finalEmailSequence,
      leadListId: getValueOrExisting(selectedLeadListId, existingConfig.leadListId),
      leadListName: getValueOrExisting(selectedLeadListName, existingConfig.leadListName),
      leadCount: selectedLeadListCount !== undefined ? selectedLeadListCount : existingConfig.leadCount,
      emailAccounts: getValueOrExisting(selectedAccountIds || emailAccounts, existingConfig.emailAccounts, []),
      emailsPerDay: emailsPerDay !== undefined ? emailsPerDay : (existingConfig.emailsPerDay || 50),
      emailsPerHour: emailsPerHour !== undefined ? emailsPerHour : (existingConfig.emailsPerHour || 10),
      sendingInterval: sendingInterval !== undefined ? Math.max(5, sendingInterval) : (existingConfig.sendingInterval || 15),
      trackOpens: trackOpens !== undefined ? trackOpens : (existingConfig.trackOpens !== undefined ? existingConfig.trackOpens : false),
      trackClicks: trackClicks !== undefined ? trackClicks : (existingConfig.trackClicks !== undefined ? existingConfig.trackClicks : false),
      stopOnReply: stopOnReply !== undefined ? stopOnReply : (existingConfig.stopOnReply !== undefined ? existingConfig.stopOnReply : false),
      activeDays: getValueOrExisting(activeDays, existingConfig.activeDays, ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']),
      sendingHours: sendingHours !== undefined ? sendingHours : (existingConfig.sendingHours || { start: 9, end: 17 }),
      enableJitter: enableJitter !== undefined ? enableJitter : (existingConfig.enableJitter !== undefined ? existingConfig.enableJitter : false),
      jitterMinutes: jitterMinutes !== undefined ? jitterMinutes : (existingConfig.jitterMinutes || 2),
      timezone: getValueOrExisting(timezone, existingConfig.timezone, 'UTC')
    };

    console.log('\n' + '='.repeat(80));
    console.log('💾💾💾 BUILT CONFIG TO SAVE 💾💾💾');
    console.log('='.repeat(80));
    console.log('Existing Config:', JSON.stringify(existingConfig, null, 2));
    console.log('New Config:', JSON.stringify(campaignConfig, null, 2));
    console.log('='.repeat(80) + '\n');

    // Update campaign (description is in config, not a separate column)
    const { data: updatedCampaign, error: updateError } = await supabase
      .from('campaigns')
      .update({
        name: name,
        config: campaignConfig,
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId)
      .eq('organization_id', organizationId)
      .select('*')
      .single();

    if (updateError || !updatedCampaign) {
      console.error('❌ Error updating campaign:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to update campaign'
      });
    }

    // CRITICAL FIX: Only clear PENDING/SCHEDULED emails, preserve sent/failed/skipped history
    // This prevents data loss when updating campaign settings
    console.log('🧹 Clearing pending scheduled emails (preserving sent/failed history)');
    const { error: deleteError } = await supabase
      .from('scheduled_emails')
      .delete()
      .eq('campaign_id', campaignId)
      .eq('organization_id', organizationId)
      .in('status', ['scheduled', 'pending']);

    if (deleteError) {
      console.warn('⚠️ Error clearing scheduled emails:', deleteError);
    } else {
      console.log('✅ Cleared pending scheduled emails (sent/failed/skipped history preserved)');
    }

    // Return updated campaign with expanded config
    const responseData = {
      id: updatedCampaign.id,
      name: updatedCampaign.name,
      description: updatedCampaign.description,
      status: updatedCampaign.status,
      organizationId: updatedCampaign.organization_id,
      createdAt: updatedCampaign.created_at,
      updatedAt: updatedCampaign.updated_at,

      // Expand config for frontend
      ...campaignConfig,

      // Legacy support
      selectedLeads: selectedLeads || [],
      selectedLeadListId,
      selectedLeadListName,
      selectedLeadListCount,
      selectedAccountIds: campaignConfig.emailAccounts
    };

    console.log('✅ Campaign updated successfully:', updatedCampaign.id);
    res.json({
      success: true,
      campaign: responseData
    });

  } catch (error) {
    console.error('❌ Error in PUT /campaigns/:id:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});


// POST /api/campaigns/:id/duplicate - Duplicate a campaign
router.post('/:id/duplicate', authenticateToken, async (req, res) => {
  try {
    console.log('📋 POST /api/campaigns/:id/duplicate called');
    console.log('👤 User:', req.user);
    console.log('📋 Campaign ID:', req.params.id);

    const campaignId = req.params.id;
    const organizationId = req.user.organizationId;

    // Find campaign in database
    const { data: originalCampaign, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .eq('organization_id', organizationId)
      .single();

    if (error || !originalCampaign) {
      console.error('❌ Campaign not found or database error:', error);
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    console.log('✅ Original campaign found:', originalCampaign.name);

    // Create new campaign config without lead list
    const newConfig = {
      ...originalCampaign.config,
      leadListId: null,
      leadListName: null,
      leadCount: 0
    };

    // Create new campaign with " (copy)" suffix
    const newCampaignName = `${originalCampaign.name} (copy)`;

    const { data: newCampaign, error: createError } = await supabase
      .from('campaigns')
      .insert({
        name: newCampaignName,
        status: 'stopped',
        organization_id: organizationId,
        created_by: req.user.id,
        config: newConfig,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (createError || !newCampaign) {
      console.error('❌ Error creating duplicate campaign:', createError);
      return res.status(500).json({
        success: false,
        error: 'Failed to create duplicate campaign'
      });
    }

    console.log('✅ Campaign duplicated successfully:', newCampaign.id);

    // Return the new campaign with expanded config
    const responseData = {
      id: newCampaign.id,
      name: newCampaign.name,
      status: newCampaign.status,
      organizationId: newCampaign.organization_id,
      createdBy: newCampaign.created_by,
      createdAt: newCampaign.created_at,
      updatedAt: newCampaign.updated_at,
      ...newConfig,
      leads: 0,
      sent: 0,
      opened: 0,
      clicked: 0,
      replied: 0,
      bounced: 0,
      openRate: 0,
      clickRate: 0,
      replyRate: 0,
      bounceRate: 0
    };

    res.json({
      success: true,
      campaign: responseData
    });

  } catch (error) {
    console.error('❌ Error in POST /campaigns/:id/duplicate:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
