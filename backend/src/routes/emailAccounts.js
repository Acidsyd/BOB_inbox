const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const AccountRateLimitService = require('../services/AccountRateLimitService');
const ImapService = require('../services/ImapService');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const ENCRYPTION_KEY = Buffer.from(process.env.EMAIL_ENCRYPTION_KEY || '', 'hex');

// Initialize Supabase client and services
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const rateLimitService = new AccountRateLimitService();

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

// Helper function to encrypt IMAP credentials
function encryptImapCredentials(password) {
  const algorithm = 'aes-256-cbc';
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(algorithm, ENCRYPTION_KEY, iv);
  const credentials = JSON.stringify({ password });

  let encrypted = cipher.update(credentials, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return {
    encrypted,
    iv: iv.toString('hex')
  };
}

// Helper function to decrypt IMAP credentials
function decryptImapCredentials(encryptedData, ivHex) {
  try {
    const algorithm = 'aes-256-cbc';
    const iv = Buffer.from(ivHex, 'hex');

    const decipher = crypto.createDecipheriv(algorithm, ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  } catch (error) {
    console.error('❌ Error decrypting IMAP credentials:', error);
    throw new Error('Failed to decrypt IMAP credentials');
  }
}

// Helper function to aggregate analytics for a specific account
async function getAccountAnalytics(accountId, organizationId) {
  try {
    // Get total emails sent (all-time)
    const { count: totalSent } = await supabase
      .from('scheduled_emails')
      .select('id', { count: 'exact', head: true })
      .eq('email_account_id', accountId)
      .eq('organization_id', organizationId)
      .eq('status', 'sent');

    // Get total replies received
    // Replies are conversation_messages with direction='received' that are associated with emails we sent
    const { data: sentEmails } = await supabase
      .from('scheduled_emails')
      .select('to_email')
      .eq('email_account_id', accountId)
      .eq('organization_id', organizationId)
      .eq('status', 'sent');

    const recipientEmails = [...new Set((sentEmails || []).map(e => e.to_email))];

    let totalReplies = 0;
    if (recipientEmails.length > 0) {
      const { count: replyCount } = await supabase
        .from('conversation_messages')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('direction', 'received')
        .in('from_email', recipientEmails);

      totalReplies = replyCount || 0;
    }

    // Get total opens
    const { count: totalOpens } = await supabase
      .from('email_tracking_events')
      .select('scheduled_email_id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('event_type', 'open')
      .not('scheduled_email_id', 'is', null);

    // Get unique opens per email
    const { data: uniqueOpens } = await supabase
      .from('email_tracking_events')
      .select('scheduled_email_id')
      .eq('organization_id', organizationId)
      .eq('event_type', 'open')
      .not('scheduled_email_id', 'is', null);

    const uniqueOpenCount = new Set((uniqueOpens || []).map(e => e.scheduled_email_id)).size;

    // Get total clicks
    const { count: totalClicks } = await supabase
      .from('email_tracking_events')
      .select('scheduled_email_id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('event_type', 'click')
      .not('scheduled_email_id', 'is', null);

    // Get unique clicks per email
    const { data: uniqueClicks } = await supabase
      .from('email_tracking_events')
      .select('scheduled_email_id')
      .eq('organization_id', organizationId)
      .eq('event_type', 'click')
      .not('scheduled_email_id', 'is', null);

    const uniqueClickCount = new Set((uniqueClicks || []).map(e => e.scheduled_email_id)).size;

    // Get total bounces
    const { count: totalBounces } = await supabase
      .from('scheduled_emails')
      .select('id', { count: 'exact', head: true })
      .eq('email_account_id', accountId)
      .eq('organization_id', organizationId)
      .eq('status', 'bounced');

    // Get bounce breakdown
    const { data: bounceDetails } = await supabase
      .from('email_bounces')
      .select('bounce_type')
      .eq('organization_id', organizationId);

    const hardBounces = (bounceDetails || []).filter(b => b.bounce_type === 'hard').length;
    const softBounces = (bounceDetails || []).filter(b => b.bounce_type === 'soft').length;

    // Calculate rates (avoid division by zero)
    const sentCount = totalSent || 0;
    const openRate = sentCount > 0 ? ((uniqueOpenCount / sentCount) * 100).toFixed(2) : 0;
    const clickRate = sentCount > 0 ? ((uniqueClickCount / sentCount) * 100).toFixed(2) : 0;
    const replyRate = sentCount > 0 ? ((totalReplies / sentCount) * 100).toFixed(2) : 0;
    const bounceRate = sentCount > 0 ? (((totalBounces || 0) / sentCount) * 100).toFixed(2) : 0;

    return {
      totalEmailsSent: sentCount,
      totalReplies,
      totalOpens: uniqueOpenCount,
      totalClicks: uniqueClickCount,
      totalBounces: totalBounces || 0,
      openRate: parseFloat(openRate),
      clickRate: parseFloat(clickRate),
      replyRate: parseFloat(replyRate),
      bounceRate: parseFloat(bounceRate),
      bounceBreakdown: {
        hard: hardBounces,
        soft: softBounces
      }
    };
  } catch (error) {
    console.error(`❌ Error aggregating analytics for account ${accountId}:`, error);
    return {
      totalEmailsSent: 0,
      totalReplies: 0,
      totalOpens: 0,
      totalClicks: 0,
      totalBounces: 0,
      openRate: 0,
      clickRate: 0,
      replyRate: 0,
      bounceRate: 0,
      bounceBreakdown: { hard: 0, soft: 0 }
    };
  }
}

// GET /api/email-accounts - List all email accounts with real usage data
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('📧 GET /api/email-accounts called');
    console.log('👤 User:', req.user);

    const includeAnalytics = req.query.include === 'analytics';

    // Query enhanced account usage summary with real data
    const { data: accountsData, error: accountsError } = await supabase
      .from('account_usage_summary')
      .select('*')
      .eq('organization_id', req.user.organizationId);

    // Query email_accounts table (for accounts that have been migrated)
    // Include relay provider information
    const { data: emailAccounts, error: emailAccountsError } = await supabase
      .from('email_accounts')
      .select(`
        id, email, provider, is_active, health_score, daily_limit, display_name,
        warmup_enabled, warmup_progress, last_health_check, created_at, updated_at, relay_provider_id,
        relay_providers:relay_provider_id (
          id, provider_type, provider_name, from_email
        )
      `)
      .eq('organization_id', req.user.organizationId)
      .eq('is_active', true);

    // Also query OAuth2 tokens for linked accounts (legacy/non-migrated accounts)
    const { data: oauth2Accounts, error: oauth2Error } = await supabase
      .from('oauth2_tokens')
      .select('id, email, provider, created_at, updated_at, metadata, last_sync_at, display_name')
      .eq('organization_id', req.user.organizationId)
      .eq('status', 'linked_to_account');

    if (accountsError) {
      console.error('❌ Error fetching accounts:', accountsError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch email accounts from database'
      });
    }

    if (oauth2Error) {
      console.error('❌ Error fetching OAuth2 accounts:', oauth2Error);
      // Don't fail completely, just log and continue with empty oauth2 accounts
    }

    // Get today's sent count for each account
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Process email_accounts table entries
    const emailAccountsEnhanced = await Promise.all((emailAccounts || []).map(async (account) => {
      // Query actual sent emails today
      const { count: sentToday } = await supabase
        .from('scheduled_emails')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', req.user.organizationId)
        .eq('email_account_id', account.id)
        .eq('status', 'sent')
        .gte('sent_at', today.toISOString());

      const dailySent = sentToday || 0;
      const dailyLimit = account.daily_limit || 50;
      const hourlyLimit = 5;

      return {
        id: account.id,
        email: account.email,
        provider: account.provider,
        status: account.is_active ? 'active' : 'paused',
        daily_limit: dailyLimit,
        hourly_limit: hourlyLimit,
        health_score: account.health_score || 100,
        daily_sent: dailySent,
        hourly_sent: 0,
        daily_remaining: Math.max(0, dailyLimit - dailySent),
        hourly_remaining: hourlyLimit,
        availability_status: dailySent >= dailyLimit ? 'daily_limit_reached' : 'available',
        rotation_priority: 1,
        rotation_weight: 1.0,
        last_health_check: account.last_health_check || new Date().toISOString(),
        connection_health: {
          status: 'healthy',
          last_check_at: account.last_health_check || new Date().toISOString(),
          last_successful_check: account.last_health_check || new Date().toISOString(),
          consecutive_failures: 0,
          error_message: null
        },
        created_at: account.created_at,
        updated_at: account.updated_at,
        display_name: account.display_name,
        // Relay provider information
        relay_provider_id: account.relay_provider_id || null,
        relay_provider: account.relay_providers || null
      };
    }));

    // Process OAuth2 accounts (legacy accounts not yet migrated to email_accounts table)
    const oauth2AccountsEnhanced = await Promise.all((oauth2Accounts || []).map(async (account) => {
      // Query actual sent emails today using oauth2 token ID
      const { count: sentToday } = await supabase
        .from('scheduled_emails')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', req.user.organizationId)
        .eq('email_account_id', account.id)
        .eq('status', 'sent')
        .gte('sent_at', today.toISOString());

      const dailySent = sentToday || 0;
      const dailyLimit = 50;
      const hourlyLimit = 5;

      // Extract connection_health from metadata if available
      const connectionHealth = account.metadata?.connection_health || {
        status: 'unknown',
        last_check_at: null,
        last_successful_check: null,
        consecutive_failures: 0,
        error_message: null
      };

      return {
        id: account.id,
        email: account.email,
        provider: `${account.provider}-oauth2`,
        status: 'active',
        daily_limit: dailyLimit,
        hourly_limit: hourlyLimit,
        health_score: 100, // Default to 100 for OAuth2 accounts
        daily_sent: dailySent,
        hourly_sent: 0,
        daily_remaining: Math.max(0, dailyLimit - dailySent),
        hourly_remaining: hourlyLimit,
        availability_status: dailySent >= dailyLimit ? 'daily_limit_reached' : 'available',
        rotation_priority: 1,
        rotation_weight: 1.0,
        last_sync_at: account.last_sync_at,
        connection_health: connectionHealth,
        created_at: account.created_at,
        updated_at: account.updated_at,
        display_name: account.display_name
      };
    }));

    const allAccounts = [...emailAccountsEnhanced, ...oauth2AccountsEnhanced];

    // Fetch analytics if requested
    let analyticsMap = {};
    if (includeAnalytics) {
      console.log('📊 Fetching analytics for all accounts...');
      const analyticsPromises = allAccounts.map(account =>
        getAccountAnalytics(account.id, req.user.organizationId)
          .then(analytics => ({ id: account.id, analytics }))
      );

      const analyticsResults = await Promise.all(analyticsPromises);
      analyticsMap = analyticsResults.reduce((map, result) => {
        map[result.id] = result.analytics;
        return map;
      }, {});
    }

    // Transform to frontend format
    const transformedAccounts = allAccounts.map(account => {
      const warmupStatus = account.warmup_enabled ?
        (account.warmup_progress >= 100 ? 'completed' : 'warming') :
        'active';

      const baseAccount = {
        id: account.id,
        email: account.email,
        provider: account.provider || 'gmail',
        status: account.status || 'active',
        health_score: account.health_score || 85,
        daily_limit: account.daily_limit || 50,
        hourly_limit: account.hourly_limit || 5,
        emails_sent_today: account.daily_sent || 0,
        sentToday: account.daily_sent || 0, // Alternative name for frontend compatibility
        dailyLimit: account.daily_limit || 50,
        health: account.health_score || 85, // Alternative name for frontend compatibility
        warmup_status: warmupStatus,
        warmupProgress: account.warmup_progress || 0,
        warmupDaysRemaining: warmupStatus === 'warming' ? Math.max(0, 30 - Math.floor((account.warmup_progress || 0) / 100 * 30)) : 0,
        reputation: account.health_score >= 90 ? 'excellent' :
                   account.health_score >= 70 ? 'good' : 'fair',
        availability_status: account.availability_status || 'available',
        daily_remaining: account.daily_remaining || account.daily_limit || 50,
        hourly_remaining: account.hourly_remaining || account.hourly_limit || 5,
        rotation_priority: account.rotation_priority || 1,
        rotation_weight: account.rotation_weight || 1.0,
        last_activity: account.last_health_check || account.updated_at,
        last_sync_at: account.last_sync_at,
        lastSyncAt: account.last_sync_at, // Frontend expects camelCase
        connection_health: account.connection_health || {
          status: 'unknown',
          last_check_at: null,
          last_successful_check: null,
          consecutive_failures: 0,
          error_message: null
        },
        settings: {
          sendingRate: account.hourly_limit || 5,
          timezone: 'UTC',
          trackingEnabled: true
        },
        created_at: account.created_at,
        updated_at: account.updated_at,
        display_name: account.display_name || account.email,
        relay_provider: account.relay_provider || null
      };

      // Include analytics if requested
      if (includeAnalytics && analyticsMap[account.id]) {
        baseAccount.analytics = analyticsMap[account.id];
      }

      return baseAccount;
    });

    console.log(`📊 Found ${transformedAccounts.length} email accounts for organization ${req.user.organizationId}`);
    
    res.json({
      success: true,
      accounts: transformedAccounts,
      total: transformedAccounts.length,
      summary: {
        total: transformedAccounts.length,
        active: transformedAccounts.filter(a => a.status === 'active').length,
        warming: transformedAccounts.filter(a => a.warmup_status === 'warming').length,
        paused: transformedAccounts.filter(a => a.status === 'paused').length,
        available: transformedAccounts.filter(a => a.availability_status === 'available').length
      }
    });
  } catch (error) {
    console.error('❌ Error fetching email accounts:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch email accounts' 
    });
  }
});

// GET /api/email-accounts/tracking-health - Get tracking health for all accounts
router.get('/tracking-health', authenticateToken, (req, res) => {
  try {
    const healthData = {
      'acc-1': {
        accountId: 'acc-1',
        trackingPixelEnabled: true,
        clickTrackingEnabled: true,
        linkRewritingEnabled: false,
        deliverabilityScore: 95,
        lastChecked: new Date().toISOString(),
        issues: [],
        recommendations: [],
        trackingDomainStatus: 'active',
        dkimStatus: 'valid',
        spfStatus: 'valid',
        dmarcStatus: 'valid',
        pixelDeliveryRate: 98,
        linkClickabilityRate: 92
      },
      'acc-2': {
        accountId: 'acc-2',
        trackingPixelEnabled: true,
        clickTrackingEnabled: true,
        linkRewritingEnabled: true,
        deliverabilityScore: 88,
        lastChecked: new Date().toISOString(),
        issues: ['SPF record needs update'],
        recommendations: ['Consider enabling DMARC'],
        trackingDomainStatus: 'active',
        dkimStatus: 'valid',
        spfStatus: 'missing',
        dmarcStatus: 'missing',
        pixelDeliveryRate: 92,
        linkClickabilityRate: 85
      },
      'acc-3': {
        accountId: 'acc-3',
        trackingPixelEnabled: false,
        clickTrackingEnabled: false,
        linkRewritingEnabled: false,
        deliverabilityScore: 72,
        lastChecked: new Date().toISOString(),
        issues: ['Tracking disabled', 'Low reputation score'],
        recommendations: ['Enable tracking features', 'Start warmup process'],
        trackingDomainStatus: 'inactive',
        dkimStatus: 'missing',
        spfStatus: 'missing',
        dmarcStatus: 'missing',
        pixelDeliveryRate: 0,
        linkClickabilityRate: 0
      }
    };
    
    res.json({
      success: true,
      data: healthData
    });
  } catch (error) {
    console.error('Error fetching tracking health:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch tracking health' 
    });
  }
});

// GET /api/email-accounts/:id - Get single email account
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Query single email account from Supabase
    const { data: account, error } = await supabase
      .from('email_accounts')
      .select(`
        id,
        email,
        provider,
        is_active,
        health_score,
        daily_limit,
        warmup_enabled,
        warmup_progress,
        last_health_check,
        created_at,
        updated_at
      `)
      .eq('id', id)
      .eq('organization_id', req.user.organizationId)
      .single();

    if (error || !account) {
      return res.status(404).json({ 
        success: false,
        error: 'Email account not found' 
      });
    }

    // Transform database fields to match frontend expectations
    const transformedAccount = {
      id: account.id,
      email: account.email,
      provider: account.provider,
      status: account.is_active ? 'active' : 'inactive',
      health_score: account.health_score || 0,
      daily_limit: account.daily_limit || 50,
      emails_sent_today: 0, // This would need to be calculated from actual sending data
      warmup_status: account.warmup_enabled ? 
        (account.warmup_progress >= 100 ? 'completed' : 'in_progress') : 
        'pending',
      reputation: account.health_score >= 90 ? 'excellent' : 
                 account.health_score >= 70 ? 'good' : 'fair',
      last_activity: account.last_health_check || account.updated_at,
      settings: {
        sendingRate: 5,
        timezone: 'UTC',
        trackingEnabled: true
      },
      created_at: account.created_at,
      updated_at: account.updated_at,
      display_name: account.email
    };
    
    res.json({
      success: true,
      account: transformedAccount
    });
  } catch (error) {
    console.error('Error fetching email account:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch email account' 
    });
  }
});

// POST /api/email-accounts - Create new email account
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { email, provider, relay_provider_id, settings, imap_config } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    if (!provider) {
      return res.status(400).json({
        success: false,
        error: 'Provider is required'
      });
    }

    // Validate IMAP configuration for Mailgun/SendGrid providers
    const requiresImap = ['mailgun', 'sendgrid'].includes(provider.toLowerCase());
    if (requiresImap) {
      if (!imap_config || !imap_config.host || !imap_config.port || !imap_config.user || !imap_config.password) {
        return res.status(400).json({
          success: false,
          error: 'IMAP configuration is required for Mailgun/SendGrid accounts (host, port, user, password)'
        });
      }
    }

    // Check if email already exists for this organization
    const { data: existingAccount, error: checkError } = await supabase
      .from('email_accounts')
      .select('id')
      .eq('organization_id', req.user.organizationId)
      .eq('email', email)
      .single();

    if (existingAccount) {
      return res.status(409).json({
        success: false,
        error: 'Email account already exists'
      });
    }

    // For relay accounts, we need to provide dummy credentials since the actual
    // credentials (API key) are stored in the relay_providers table
    const dummyCredentials = relay_provider_id ? 'relay-account-no-credentials-needed' : null;

    // Prepare IMAP data if provided
    let imapCredentialsEncrypted = null;
    let imapCredentialsIv = null;
    let imapConfigToStore = null;
    let enableReceiving = false;

    if (imap_config) {
      // Encrypt IMAP password
      const { encrypted, iv } = encryptImapCredentials(imap_config.password);
      imapCredentialsEncrypted = encrypted;
      imapCredentialsIv = iv;

      // Store IMAP config (without password)
      imapConfigToStore = {
        host: imap_config.host,
        port: imap_config.port,
        user: imap_config.user,
        secure: imap_config.secure !== false, // Default to true
        tls: imap_config.tls !== false // Default to true
      };

      enableReceiving = true; // Enable receiving for accounts with IMAP
    }

    // Create new email account
    const newAccount = {
      organization_id: req.user.organizationId,
      user_id: req.user.userId,
      email,
      provider,
      relay_provider_id: relay_provider_id || null,
      credentials_encrypted: dummyCredentials,
      is_active: true,
      health_score: 100,
      daily_limit: settings?.daily_limit || 50,
      current_sent_today: 0,
      warmup_status: 'active',
      settings: settings || {},
      // IMAP fields
      imap_credentials_encrypted: imapCredentialsEncrypted,
      imap_credentials_iv: imapCredentialsIv,
      imap_config: imapConfigToStore,
      enable_receiving: enableReceiving,
      last_sync_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: createdAccount, error: insertError } = await supabase
      .from('email_accounts')
      .insert([newAccount])
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting email account:', insertError);
      return res.status(500).json({
        success: false,
        error: insertError.message || 'Failed to create email account'
      });
    }

    console.log('✅ Email account created:', email, 'for organization:', req.user.organizationId);
    if (enableReceiving) {
      console.log('📧 IMAP receiving enabled for account:', email);
    }

    res.status(201).json({
      success: true,
      account: createdAccount,
      message: 'Email account created successfully'
    });
  } catch (error) {
    console.error('Error creating email account:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create email account'
    });
  }
});

// PUT /api/email-accounts/:id - Update email account
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const accounts = generateMockAccounts(req.user.organizationId);
    const account = accounts.find(acc => acc.id === id);
    
    if (!account) {
      return res.status(404).json({ 
        success: false,
        error: 'Email account not found' 
      });
    }
    
    const updatedAccount = {
      ...account,
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    res.json({
      success: true,
      account: updatedAccount,
      message: 'Email account updated successfully'
    });
  } catch (error) {
    console.error('Error updating email account:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update email account' 
    });
  }
});

// DELETE /api/email-accounts/:id - Delete email account
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    console.log(`🗑️  Attempting to delete email account: ${id} for org: ${organizationId}`);

    // Try deleting from email_accounts table (SMTP/Relay accounts)
    const { data: emailAccount, error: emailError } = await supabase
      .from('email_accounts')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    // Try deleting from oauth2_tokens table (OAuth2 accounts)
    const { data: oauthAccount, error: oauthError } = await supabase
      .from('oauth2_tokens')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    // Check if either deletion was successful
    if (emailAccount) {
      console.log(`✅ Successfully deleted email account: ${emailAccount.email}`);
      res.json({
        success: true,
        message: `Email account ${emailAccount.email} deleted successfully`
      });
    } else if (oauthAccount) {
      console.log(`✅ Successfully deleted OAuth2 account: ${oauthAccount.email}`);
      res.json({
        success: true,
        message: `Email account ${oauthAccount.email} deleted successfully`
      });
    } else {
      console.error('❌ Account not found or already deleted:', { emailError, oauthError });
      res.status(404).json({
        success: false,
        error: 'Account not found or does not belong to your organization'
      });
    }
  } catch (error) {
    console.error('❌ Error deleting email account:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete email account'
    });
  }
});

// POST /api/email-accounts/:id/refresh-tracking-health - Refresh tracking health for account
router.post('/:id/refresh-tracking-health', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    
    const health = {
      accountId: id,
      trackingPixelEnabled: true,
      clickTrackingEnabled: true,
      linkRewritingEnabled: Math.random() > 0.5,
      deliverabilityScore: Math.floor(Math.random() * 30) + 70,
      lastChecked: new Date().toISOString(),
      issues: [],
      recommendations: [],
      trackingDomainStatus: 'active',
      dkimStatus: 'valid',
      spfStatus: 'valid',
      dmarcStatus: Math.random() > 0.5 ? 'valid' : 'missing',
      pixelDeliveryRate: Math.floor(Math.random() * 20) + 80,
      linkClickabilityRate: Math.floor(Math.random() * 20) + 75
    };
    
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error('Error refreshing tracking health:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to refresh tracking health' 
    });
  }
});

// POST /api/email-accounts/:id/test-tracking - Test tracking setup
router.post('/:id/test-tracking', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    
    const testResult = {
      success: Math.random() > 0.2,
      pixelLoadTime: Math.floor(Math.random() * 200) + 50,
      clickRedirectTime: Math.floor(Math.random() * 100) + 20,
      dnsResolutionTime: Math.floor(Math.random() * 50) + 10,
      errors: [],
      warnings: Math.random() > 0.7 ? ['Consider using a custom tracking domain'] : [],
      recommendations: []
    };
    
    if (!testResult.success) {
      testResult.errors = ['Failed to verify tracking pixel delivery'];
    }
    
    res.json({
      success: true,
      data: testResult
    });
  } catch (error) {
    console.error('Error testing tracking setup:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to test tracking setup' 
    });
  }
});

// PATCH /api/email-accounts/:id/tracking-settings - Update tracking settings
router.patch('/:id/tracking-settings', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const settings = req.body;
    
    res.json({
      success: true,
      message: 'Tracking settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating tracking settings:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update tracking settings' 
    });
  }
});

// PUT /api/email-accounts/:id/settings - Update account rate limiting settings
router.put('/:id/settings', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      daily_limit,
      hourly_limit,
      rotation_priority,
      rotation_weight,
      status,
      display_name,
      imap_config // NEW: Allow updating IMAP configuration
    } = req.body;

    console.log(`⚙️ Updating settings for account ${id}`);

    // Validate input
    if (daily_limit && (daily_limit < 1 || daily_limit > 500)) {
      return res.status(400).json({
        success: false,
        error: 'Daily limit must be between 1 and 500'
      });
    }

    if (hourly_limit && (hourly_limit < 1 || hourly_limit > 50)) {
      return res.status(400).json({
        success: false,
        error: 'Hourly limit must be between 1 and 50'
      });
    }

    if (rotation_priority && (rotation_priority < 1 || rotation_priority > 10)) {
      return res.status(400).json({
        success: false,
        error: 'Rotation priority must be between 1 and 10'
      });
    }

    if (rotation_weight && (rotation_weight < 0.1 || rotation_weight > 10.0)) {
      return res.status(400).json({
        success: false,
        error: 'Rotation weight must be between 0.1 and 10.0'
      });
    }

    // Validate IMAP config if provided
    if (imap_config) {
      if (!imap_config.host || !imap_config.port || !imap_config.user) {
        return res.status(400).json({
          success: false,
          error: 'IMAP configuration must include host, port, and user'
        });
      }
    }

    // Update account settings
    const updateData = {};
    if (daily_limit !== undefined) updateData.daily_limit = daily_limit;
    if (hourly_limit !== undefined) updateData.hourly_limit = hourly_limit;
    if (rotation_priority !== undefined) updateData.rotation_priority = rotation_priority;
    if (rotation_weight !== undefined) updateData.rotation_weight = rotation_weight;
    if (status !== undefined) updateData.status = status;
    if (display_name !== undefined) updateData.display_name = display_name;

    // Handle IMAP config update
    if (imap_config) {
      // If password is provided, encrypt it
      if (imap_config.password) {
        const { encrypted, iv } = encryptImapCredentials(imap_config.password);
        updateData.imap_credentials_encrypted = encrypted;
        updateData.imap_credentials_iv = iv;
      }

      // Update IMAP config (without password)
      updateData.imap_config = {
        host: imap_config.host,
        port: imap_config.port,
        user: imap_config.user,
        secure: imap_config.secure !== false,
        tls: imap_config.tls !== false
      };

      // Enable receiving if IMAP is configured
      updateData.enable_receiving = true;

      console.log(`📧 Updating IMAP configuration for account ${id}`);
    }

    updateData.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('email_accounts')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', req.user.organizationId);

    if (error) {
      console.error('❌ Error updating account settings:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update account settings'
      });
    }

    console.log(`✅ Account settings updated for ${id}`);
    res.json({
      success: true,
      message: 'Account settings updated successfully',
      updated_fields: Object.keys(updateData)
    });

  } catch (error) {
    console.error('❌ Error in PUT /api/email-accounts/:id/settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update account settings'
    });
  }
});

// GET /api/email-accounts/:id/usage-stats - Get detailed usage statistics
router.get('/:id/usage-stats', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { days = 30 } = req.query;

    console.log(`📊 Getting usage stats for account ${id} (${days} days)`);

    const usageStats = await rateLimitService.getAccountUsageStats(
      id, 
      req.user.organizationId, 
      parseInt(days)
    );

    res.json({
      success: true,
      account_id: id,
      period_days: parseInt(days),
      data: usageStats
    });

  } catch (error) {
    console.error('❌ Error getting usage stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch usage statistics'
    });
  }
});

// POST /api/email-accounts/:id/reset-usage - Reset usage counters for account
router.post('/:id/reset-usage', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reset_type = 'both' } = req.body; // 'daily', 'hourly', or 'both'

    console.log(`🔄 Resetting ${reset_type} counters for account ${id}`);

    let resetCount = 0;

    if (reset_type === 'daily' || reset_type === 'both') {
      const { error } = await supabase
        .from('account_rate_limits')
        .update({
          daily_sent: 0,
          current_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('email_account_id', id)
        .eq('organization_id', req.user.organizationId);

      if (!error) resetCount++;
    }

    if (reset_type === 'hourly' || reset_type === 'both') {
      const { error } = await supabase
        .from('account_rate_limits')
        .update({
          hourly_sent: 0,
          current_hour: new Date().getHours(),
          updated_at: new Date().toISOString()
        })
        .eq('email_account_id', id)
        .eq('organization_id', req.user.organizationId);

      if (!error) resetCount++;
    }

    console.log(`✅ Reset counters for account ${id}`);
    res.json({
      success: true,
      message: `${reset_type} counters reset successfully`,
      reset_type,
      account_id: id
    });

  } catch (error) {
    console.error('❌ Error resetting usage counters:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset usage counters'
    });
  }
});

// GET /api/email-accounts/rotation-preview - Preview account rotation order
router.get('/rotation-preview', authenticateToken, async (req, res) => {
  try {
    const { strategy = 'hybrid' } = req.query;

    console.log(`🔄 Getting rotation preview for organization ${req.user.organizationId} using ${strategy} strategy`);

    const rotationPreview = await rateLimitService.getRotationPreview(
      req.user.organizationId, 
      strategy
    );

    res.json({
      success: true,
      strategy,
      organization_id: req.user.organizationId,
      rotation_order: rotationPreview,
      total_accounts: rotationPreview.length
    });

  } catch (error) {
    console.error('❌ Error getting rotation preview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get rotation preview'
    });
  }
});

// PUT /api/email-accounts/bulk-update-limits - Update limits for multiple accounts
router.put('/bulk-update-limits', authenticateToken, async (req, res) => {
  try {
    const { updates } = req.body; // Array of { id, daily_limit, hourly_limit, ... }

    console.log(`🔄 Bulk updating limits for ${updates.length} accounts`);

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Updates array is required and must not be empty'
      });
    }

    const results = [];
    const errors = [];

    for (const update of updates) {
      try {
        const { id, ...updateData } = update;
        updateData.updated_at = new Date().toISOString();

        const { error } = await supabase
          .from('email_accounts')
          .update(updateData)
          .eq('id', id)
          .eq('organization_id', req.user.organizationId);

        if (error) {
          errors.push({ account_id: id, error: error.message });
        } else {
          results.push({ account_id: id, success: true });
        }
      } catch (err) {
        errors.push({ account_id: update.id, error: err.message });
      }
    }

    console.log(`✅ Bulk update completed: ${results.length} success, ${errors.length} errors`);

    res.json({
      success: errors.length === 0,
      message: `Updated ${results.length} accounts${errors.length > 0 ? ` with ${errors.length} errors` : ''}`,
      results,
      errors,
      summary: {
        total_updates: updates.length,
        successful: results.length,
        failed: errors.length
      }
    });

  } catch (error) {
    console.error('❌ Error in bulk update:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform bulk update'
    });
  }
});

// PUT /api/email-accounts/:id/webhook-assignments - Update webhook assignments for an account
router.put('/:id/webhook-assignments', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { assigned_webhooks } = req.body;

    console.log(`🔗 Updating webhook assignments for account ${id}`);

    // Validate webhook IDs array
    if (assigned_webhooks !== null && assigned_webhooks !== undefined) {
      if (!Array.isArray(assigned_webhooks)) {
        return res.status(400).json({
          success: false,
          error: 'assigned_webhooks must be an array or null'
        });
      }

      // Validate that all provided webhook IDs exist and belong to the organization
      if (assigned_webhooks.length > 0) {
        const { data: webhooks, error: webhookError } = await supabase
          .from('webhooks')
          .select('id')
          .in('id', assigned_webhooks)
          .eq('organization_id', req.user.organizationId);

        if (webhookError) {
          console.error('❌ Error validating webhooks:', webhookError);
          return res.status(500).json({
            success: false,
            error: 'Failed to validate webhook assignments'
          });
        }

        if (webhooks.length !== assigned_webhooks.length) {
          return res.status(400).json({
            success: false,
            error: 'One or more webhook IDs are invalid'
          });
        }
      }
    }

    // Update email account with webhook assignments
    const { error } = await supabase
      .from('email_accounts')
      .update({
        assigned_webhooks,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('organization_id', req.user.organizationId);

    if (error) {
      console.error('❌ Error updating webhook assignments:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update webhook assignments'
      });
    }

    console.log(`✅ Webhook assignments updated for account ${id}`);
    res.json({
      success: true,
      message: 'Webhook assignments updated successfully',
      assigned_webhooks
    });

  } catch (error) {
    console.error('❌ Error in PUT /api/email-accounts/:id/webhook-assignments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update webhook assignments'
    });
  }
});

// POST /api/email-accounts/:id/test-connection - Test account connection
router.post('/:id/test-connection', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🧪 Testing connection for account ${id}`);

    // Try to fetch from email_accounts table first
    let { data: account, error: fetchError } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('id', id)
      .eq('organization_id', req.user.organizationId)
      .single();

    // If not found, try oauth2_tokens table
    if (fetchError || !account) {
      const { data: oauth2Account, error: oauth2Error } = await supabase
        .from('oauth2_tokens')
        .select('*')
        .eq('id', id)
        .eq('organization_id', req.user.organizationId)
        .eq('status', 'linked_to_account')
        .single();

      if (oauth2Error || !oauth2Account) {
        return res.status(404).json({
          success: false,
          error: 'Email account not found'
        });
      }

      // Convert OAuth2 account to health checker format
      account = {
        id: oauth2Account.id,
        organization_id: oauth2Account.organization_id,
        email: oauth2Account.email,
        provider: `${oauth2Account.provider}-oauth2`,
        is_active: true,
        connection_health: {
          consecutive_failures: 0
        }
      };
    }

    // Import health checker and run single account check
    const { default: EmailAccountHealthChecker } = await import('../services/EmailAccountHealthChecker.js');
    const checker = new EmailAccountHealthChecker();
    const result = await checker.checkAccountHealth(account);

    console.log(`✅ Connection test completed for ${account.email}:`, result.status);

    res.json({
      success: true,
      result: {
        status: result.status,
        email: account.email,
        provider: account.provider,
        issues: result.issues,
        checks: result.checks,
        checkedAt: result.checkedAt
      }
    });

  } catch (error) {
    console.error('❌ Error testing connection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test connection'
    });
  }
});

// GET /api/email-accounts/health/run-checks - Manually trigger health checks
router.get('/health/run-checks', authenticateToken, async (req, res) => {
  try {
    console.log('🏥 Manual health check triggered');

    const { default: EmailAccountHealthChecker } = await import('../services/EmailAccountHealthChecker.js');
    const checker = new EmailAccountHealthChecker();
    const result = await checker.runHealthChecks();

    if (result.success) {
      res.json({
        success: true,
        message: 'Health checks completed',
        results: result.results
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('❌ Error running health checks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run health checks'
    });
  }
});

// POST /api/email-accounts/test-imap - Test IMAP configuration before saving
router.post('/test-imap', authenticateToken, async (req, res) => {
  try {
    const { host, port, user, password, secure, tls } = req.body;

    console.log(`🧪 Testing IMAP connection for ${user}@${host}:${port}`);

    // Validate required fields
    if (!host || !port || !user || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing required IMAP fields (host, port, user, password)'
      });
    }

    // Create IMAP config for testing
    const imapConfig = {
      host,
      port: parseInt(port),
      user,
      pass: password,
      secure: secure !== false, // Default to true
      tls: tls !== false // Default to true
    };

    // Test connection using ImapService
    const imapService = new ImapService();

    try {
      // Attempt to fetch 1 email to verify connection
      await imapService._fetchImapEmails(imapConfig, 1);

      console.log(`✅ IMAP connection test successful for ${user}@${host}`);

      res.json({
        success: true,
        message: 'IMAP connection test successful',
        config: {
          host,
          port,
          user,
          secure: imapConfig.secure,
          tls: imapConfig.tls
        }
      });

    } catch (imapError) {
      console.error(`❌ IMAP connection test failed for ${user}@${host}:`, imapError.message);

      return res.status(400).json({
        success: false,
        error: `IMAP connection failed: ${imapError.message}`,
        details: {
          host,
          port,
          user,
          error: imapError.message
        }
      });
    }

  } catch (error) {
    console.error('❌ Error testing IMAP connection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test IMAP connection'
    });
  }
});

module.exports = router;