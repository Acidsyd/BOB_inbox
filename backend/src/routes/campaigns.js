const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const EmailService = require('../services/EmailService');
const EmailTrackingService = require('../services/EmailTrackingService');
const HealthCheckService = require('../services/HealthCheckService');
const ProcessManagerService = require('../services/ProcessManagerService');
const SpintaxParser = require('../utils/spintax');
const { toLocalTimestamp } = require('../utils/dateUtils.cjs');
const CampaignScheduler = require('../utils/CampaignScheduler');
const emailService = new EmailService();
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
    // Get all scheduled emails for this campaign (skip bounce stats for now)
    const { data: scheduledEmails, error } = await supabase
      .from('scheduled_emails')
      .select('status, sent_at, error_message')
      .eq('campaign_id', campaignId)
      .eq('organization_id', organizationId);
      
    if (error) {
      console.error('❌ Error fetching campaign metrics:', error);
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
        softBounces: 0
      };
    }

    // Calculate metrics from scheduled emails
    // Count bounces first: either status='bounced' OR status='failed' with bounce in error message
    const bounced = scheduledEmails.filter(email => 
      email.status === 'bounced' || 
      (email.status === 'failed' && email.error_message && 
       (email.error_message.toLowerCase().includes('bounce') || 
        email.error_message.toLowerCase().includes('domain') ||
        email.error_message.toLowerCase().includes('nxdomain')))
    ).length;
    
    // Successfully sent emails (delivered)
    const delivered = scheduledEmails.filter(email => email.status === 'sent').length;
    
    // Total attempted includes both delivered and bounced
    const sent = delivered + bounced;
    
    // Failed emails (non-bounce failures)
    const failed = scheduledEmails.filter(email => 
      email.status === 'failed' && 
      (!email.error_message || !email.error_message.toLowerCase().includes('bounce'))
    ).length;
    
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
      softBounces
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
      softBounces: 0
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
      website: sampleData.website
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
    
    // Replace personalization tokens
    const replacements = {
      '{{firstName}}': personalization.firstName || '',
      '{{lastName}}': personalization.lastName || '',
      '{{fullName}}': personalization.fullName || '',
      '{{company}}': personalization.company || '',
      '{{jobTitle}}': personalization.jobTitle || '',
      '{{website}}': personalization.website || ''
    };
    
    Object.entries(replacements).forEach(([token, value]) => {
      if (value) {
        personalizedSubject = personalizedSubject.replace(new RegExp(token, 'g'), value);
        personalizedContent = personalizedContent.replace(new RegExp(token, 'g'), value);
      }
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

    // PERFORMANCE OPTIMIZATION: Return campaigns with basic data only
    // Individual metrics will be fetched on-demand when viewing specific campaign
    const expandedCampaigns = (userCampaigns || []).map(campaign => {
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
        // Set default metrics (will be loaded on demand)
        leads: 0,
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        replied: 0,
        bounced: 0,
        openRate: 0,
        clickRate: 0,
        replyRate: 0,
        bounceRate: 0
      };
      
      console.log(`📊 Campaign ${campaign.name}: metrics will load on demand`);
      
      return expanded;
    });

    console.log(`⚡ OPTIMIZED: Returned ${expandedCampaigns.length} campaigns in minimal time (no individual DB calls)`);

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
      jitterMinutes: Math.min(3, Math.max(1, jitterMinutes || 3))
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
        updated_at: toLocalTimestamp()
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
    console.log(`🚨 DEBUG: About to call CampaignScheduler.scheduleEmails() with ${allLeads.length} leads (NEW CAMPAIGN PATH)`);
    console.log(`🚨 DEBUG: Scheduler config:`, {
      timezone: campaign.config?.timezone,
      emailsPerDay: campaign.config?.emailsPerDay,
      emailsPerHour: campaign.config?.emailsPerHour,
      sendingInterval: campaign.config?.sendingInterval,
      sendingHours: campaign.config?.sendingHours
    });
    const schedules = scheduler.scheduleEmails(allLeads, emailAccounts);
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

    res.json({
      success: true,
      campaignId: campaignId,
      status: 'active',
      message: 'Campaign launched successfully',
      emailsScheduled: scheduledEmails.length,
      firstEmailAt: scheduledEmails[0]?.send_at,
      lastEmailAt: scheduledEmails[scheduledEmails.length - 1]?.send_at,
      startedAt: toLocalTimestamp(),
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
        updated_at: toLocalTimestamp()
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

    res.json({
      success: true,
      campaignId: campaignId,
      status: 'paused',
      message: 'Campaign paused successfully',
      pausedAt: toLocalTimestamp()
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
        updated_at: toLocalTimestamp()
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

    // Cancel pending scheduled emails
    const { data: cancelledEmails, error: cancelError } = await supabase
      .from('scheduled_emails')
      .update({ 
        status: 'skipped',
        updated_at: toLocalTimestamp()
      })
      .eq('campaign_id', campaignId)
      .eq('organization_id', organizationId)
      .eq('status', 'scheduled')
      .select();

    if (cancelError) {
      console.error('⚠️ Error cancelling scheduled emails:', cancelError);
      // Don't fail the request, just log the error
    } else {
      console.log(`📧 Cancelled ${cancelledEmails?.length || 0} scheduled emails`);
    }

    console.log('✅ Campaign stopped successfully:', campaignId);

    res.json({
      success: true,
      campaignId: campaignId,
      status: 'completed',
      message: 'Campaign stopped successfully',
      stoppedAt: toLocalTimestamp(),
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
        email_account_id
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
        error: email.error_message
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

    // Get daily email sending stats for the last 30 days (sent emails)
    const { data: emailStats, error: emailError } = await supabase
      .from('scheduled_emails')
      .select(`
        sent_at,
        status
      `)
      .eq('campaign_id', campaignId)
      .eq('organization_id', organizationId)
      .eq('status', 'sent')
      .gte('sent_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('sent_at', { ascending: true });

    if (emailError) {
      console.error('❌ Error fetching email stats:', emailError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch email stats'
      });
    }

    // Get daily bounce stats for the last 30 days
    const { data: bounceStats, error: bounceError } = await supabase
      .from('scheduled_emails')
      .select(`
        sent_at,
        status,
        error_message
      `)
      .eq('campaign_id', campaignId)
      .eq('organization_id', organizationId)
      .or('status.eq.bounced,and(status.eq.failed,error_message.ilike.%bounce%),and(status.eq.failed,error_message.ilike.%domain%),and(status.eq.failed,error_message.ilike.%nxdomain%)')
      .gte('sent_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('sent_at', { ascending: true });

    if (bounceError) {
      console.error('❌ Error fetching bounce stats:', bounceError);
    } else {
      console.log(`📊 Found ${bounceStats?.length || 0} bounces for campaign ${campaignId}`);
    }

    // Get daily reply stats from unified inbox conversations
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

    if (replyError) {
      console.error('❌ Error fetching reply stats:', replyError);
    } else {
      console.log(`📊 Found ${replyStats?.length || 0} replies for campaign ${campaignId}`);
    }

    // Group emails by date
    const emailsByDate = {};
    (emailStats || []).forEach(email => {
      if (email.sent_at) {
        const date = new Date(email.sent_at).toISOString().split('T')[0];
        emailsByDate[date] = (emailsByDate[date] || 0) + 1;
      }
    });

    // Group bounces by date using sent_at
    const bouncesByDate = {};
    (bounceStats || []).forEach(bounce => {
      if (bounce.sent_at) {
        const date = new Date(bounce.sent_at).toISOString().split('T')[0];
        bouncesByDate[date] = (bouncesByDate[date] || 0) + 1;
      }
    });

    // Group replies by date using created_at
    const repliesByDate = {};
    (replyStats || []).forEach(reply => {
      if (reply.created_at) {
        const date = new Date(reply.created_at).toISOString().split('T')[0];
        repliesByDate[date] = (repliesByDate[date] || 0) + 1;
      }
    });

    // Create daily stats array
    const stats = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const displayDate = date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      
      stats.push({
        date: displayDate,
        fullDate: dateStr,
        sent: emailsByDate[dateStr] || 0,
        bounced: bouncesByDate[dateStr] || 0,
        replies: repliesByDate[dateStr] || 0
      });
    }

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

      // Convert time to campaign timezone for display
      const sendAtDate = new Date(email.send_at);
      const formattedTime = sendAtDate.toLocaleString('en-US', {
        timeZone: campaignTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      return {
        id: email.id,
        time: formattedTime,
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
    
    // Step 2.1: Cancel ALL pending emails (scheduled + sending) to prevent duplicates
    console.log(`🗑️ Cancelling ALL pending emails (scheduled + sending)...`);
    const { data: cancelledEmails, error: cancelError } = await supabase
      .from('scheduled_emails')
      .update({ 
        status: 'skipped', 
        updated_at: toLocalTimestamp(),
        error_message: 'Campaign restarted - rescheduling'
      })
      .eq('campaign_id', campaignId)
      .eq('organization_id', organizationId)
      .in('status', ['scheduled', 'sending']) // Cancel both scheduled AND sending emails
      .select('id, to_email, status');

    if (cancelError) {
      console.error('❌ Error cancelling existing emails:', cancelError);
      return res.status(500).json({
        success: false,
        error: 'Failed to cancel existing scheduled emails'
      });
    }

    console.log(`✅ Cancelled ${cancelledEmails?.length || 0} existing scheduled emails`);

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
    const pageSize = 1000;

    console.log('📊 Fetching all leads for restart with pagination...');
    while (hasMore) {
      const { data: leadsPage, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .eq('lead_list_id', leadListId)
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .range(offset, offset + pageSize - 1);

      if (leadsError) {
        console.error('❌ Error fetching leads for restart:', leadsError);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch leads for rescheduling'
        });
      }

      if (leadsPage && leadsPage.length > 0) {
        allLeadsForRestart = allLeadsForRestart.concat(leadsPage);
        hasMore = leadsPage.length === pageSize;
        offset += pageSize;
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

    console.log(`📅 Creating fresh schedule starting from NOW...`);
    console.log(`🚨 DEBUG: About to call CampaignScheduler.scheduleEmails() with ${allLeadsForRestart.length} leads`);
    console.log(`🚨 DEBUG: Scheduler config:`, {
      timezone: campaign.config?.timezone,
      emailsPerDay: campaign.config?.emailsPerDay,
      emailsPerHour: campaign.config?.emailsPerHour,
      sendingInterval: campaign.config?.sendingInterval,
      sendingHours: campaign.config?.sendingHours
    });
    const leadSchedules = scheduler.scheduleEmails(allLeadsForRestart, emailAccounts);
    console.log(`🚨 DEBUG: CampaignScheduler returned ${leadSchedules.length} schedules`);
    if (leadSchedules.length > 0) {
      const first = leadSchedules[0];
      const last = leadSchedules[leadSchedules.length - 1];
      console.log(`🚨 DEBUG: First email sendAt: ${first.sendAt?.toISOString()}`);
      console.log(`🚨 DEBUG: Last email sendAt: ${last.sendAt?.toISOString()}`);
      const timeDiff = last.sendAt - first.sendAt;
      console.log(`🚨 DEBUG: Total time span: ${Math.round(timeDiff / (1000 * 60))} minutes for ${leadSchedules.length} emails`);
    }
    
    // Step 2.4: Process in batches to handle large campaigns
    const BATCH_SIZE = 100;
    let totalScheduled = 0;
    
    for (let i = 0; i < leadSchedules.length; i += BATCH_SIZE) {
      const batch = leadSchedules.slice(i, i + BATCH_SIZE);
      
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
        console.error(`❌ Error inserting batch ${i / BATCH_SIZE + 1}:`, insertError);
        return res.status(500).json({
          success: false,
          error: 'Failed to schedule emails during restart'
        });
      }

      totalScheduled += scheduledEmails.length;
      console.log(`📧 Scheduled batch ${Math.floor(i / BATCH_SIZE) + 1}: ${scheduledEmails.length} emails (${totalScheduled} total)`);
    }

    console.log(`🎉 Campaign restart completed successfully!`);
    console.log(`📧 Rescheduled ${totalScheduled} emails`);
    console.log(`⏰ First email will send at: ${leadSchedules[0]?.sendAt}`);
    console.log(`⏰ Last email will send at: ${leadSchedules[leadSchedules.length - 1]?.sendAt}`);

    // Return success response
    res.json({
      success: true,
      campaignId: campaignId,
      status: 'active',
      message: 'Campaign restarted successfully - existing emails rescheduled',
      type: 'restart',
      emailsScheduled: totalScheduled,
      emailsCancelled: cancelledEmails?.length || 0,
      firstEmailAt: leadSchedules[0]?.sendAt,
      lastEmailAt: leadSchedules[leadSchedules.length - 1]?.sendAt,
      restartedAt: toLocalTimestamp()
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
  const emailContent = isFollowUp ? emailConfig.content : campaign.config.emailContent;
  const emailSubject = isFollowUp ? emailConfig.subject : campaign.config.emailSubject;

  // Generate unique Message-ID
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const messageId = `<${campaignId}-${lead.id}-${sequenceStep}-${timestamp}-${random}@mailsender.local>`;

  // Generate tracking token if tracking is enabled
  const trackingEnabled = campaign.config?.trackOpens || campaign.config?.trackClicks;
  const trackingToken = trackingEnabled ? emailTrackingService.generateTrackingToken() : null;
  
  // Add tracking to email content if enabled
  let trackedContent = emailContent;
  if (trackingEnabled && trackingToken) {
    trackedContent = emailTrackingService.addTrackingToEmail(
      emailContent,
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
    subject: emailSubject,
    content: trackedContent,
    send_at: sendAt ? sendAt.toISOString() : new Date().toISOString(),
    status: 'scheduled',
    organization_id: organizationId,
    tracking_token: trackingToken,
    message_id_header: messageId,
    sequence_step: sequenceStep,
    is_follow_up: isFollowUp,
    reply_to_same_thread: emailConfig?.replyToSameThread || false,
    created_at: toLocalTimestamp(new Date())
  };
}

// PUT /api/campaigns/:id - Update existing campaign
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const campaignId = req.params.id;
    const organizationId = req.user.organizationId;

    console.log('✏️ PUT /api/campaigns/:id called for campaign:', campaignId);

    // Validate campaign ownership and status
    const { data: existingCampaign, error: fetchError } = await supabase
      .from('campaigns')
      .select('id, status, organization_id')
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

    const {
      name,
      description,
      emailSubject,
      emailContent,
      followUpEnabled,
      emailSequence,
      selectedLeads,
      selectedLeadListId,
      selectedLeadListName,
      selectedLeadListCount,
      emailAccounts,
      selectedAccountIds,
      emailsPerDay,
      sendingInterval,
      trackOpens,
      trackClicks,
      stopOnReply,
      activeDays,
      sendingHours,
      enableJitter,
      jitterMinutes
    } = req.body;

    // Build campaign config
    const campaignConfig = {
      emailSubject,
      emailContent,
      followUpEnabled,
      emailSequence: emailSequence || [],
      leadListId: selectedLeadListId,
      leadListName: selectedLeadListName,
      leadCount: selectedLeadListCount,
      emailAccounts: selectedAccountIds || emailAccounts || [],
      emailsPerDay: emailsPerDay || 50,
      sendingInterval: Math.max(5, sendingInterval || 15), // Minimum 5 minutes
      trackOpens: trackOpens || false,
      trackClicks: trackClicks || false,
      stopOnReply: stopOnReply || false,
      activeDays: activeDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      sendingHours: sendingHours || { start: 9, end: 17 },
      enableJitter: enableJitter || false,
      jitterMinutes: jitterMinutes || 2
    };

    console.log('🔧 Updating campaign with config:', {
      campaignId,
      name,
      leadCount: selectedLeadListCount,
      emailAccountsCount: campaignConfig.emailAccounts.length,
      sendingInterval: campaignConfig.sendingInterval,
      emailsPerDay: campaignConfig.emailsPerDay
    });

    // Update campaign
    const { data: updatedCampaign, error: updateError } = await supabase
      .from('campaigns')
      .update({
        name: name,
        description: description,
        config: campaignConfig,
        updated_at: toLocalTimestamp()
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

    // Clear any existing scheduled emails for this campaign since settings changed
    console.log('🧹 Clearing existing scheduled emails due to campaign update');
    const { error: deleteError } = await supabase
      .from('scheduled_emails')
      .delete()
      .eq('campaign_id', campaignId)
      .eq('organization_id', organizationId);

    if (deleteError) {
      console.warn('⚠️ Error clearing scheduled emails:', deleteError);
    } else {
      console.log('✅ Cleared existing scheduled emails');
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

module.exports = router;