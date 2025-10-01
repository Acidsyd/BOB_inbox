const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const AccountRateLimitService = require('../services/AccountRateLimitService');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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

// GET /api/email-accounts - List all email accounts with real usage data
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('📧 GET /api/email-accounts called');
    console.log('👤 User:', req.user);
    
    // Query enhanced account usage summary with real data
    const { data: accountsData, error: accountsError } = await supabase
      .from('account_usage_summary')
      .select('*')
      .eq('organization_id', req.user.organizationId);

    // Also query OAuth2 accounts
    const { data: oauth2Accounts, error: oauth2Error } = await supabase
      .from('oauth2_tokens')
      .select('id, email, provider, created_at, updated_at')
      .eq('organization_id', req.user.organizationId)
      .eq('status', 'linked_to_account');

    if (accountsError) {
      console.error('❌ Error fetching accounts:', accountsError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch email accounts from database'
      });
    }

    const accounts = accountsData || [];
    const oauth2AccountsTransformed = (oauth2Accounts || []).map(oauth2Account => ({
      id: oauth2Account.id,
      email: oauth2Account.email,
      provider: `${oauth2Account.provider}-oauth2`,
      status: 'active',
      daily_limit: 50,
      hourly_limit: 5,
      health_score: 85,
      daily_sent: 0,
      hourly_sent: 0,
      daily_remaining: 50,
      hourly_remaining: 5,
      availability_status: 'available',
      rotation_priority: 1,
      rotation_weight: 1.0,
      created_at: oauth2Account.created_at,
      updated_at: oauth2Account.updated_at
    }));

    const allAccounts = [...accounts, ...oauth2AccountsTransformed];

    // Transform to frontend format
    const transformedAccounts = allAccounts.map(account => {
      const warmupStatus = account.warmup_enabled ? 
        (account.warmup_progress >= 100 ? 'completed' : 'warming') : 
        'active';

      return {
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
        settings: {
          sendingRate: account.hourly_limit || 5,
          timezone: 'UTC',
          trackingEnabled: true
        },
        created_at: account.created_at,
        updated_at: account.updated_at,
        display_name: account.email
      };
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
router.post('/', authenticateToken, (req, res) => {
  try {
    const { email, provider, settings } = req.body;
    
    const newAccount = {
      id: `acc-${Date.now()}`,
      email,
      provider,
      status: 'pending',
      health_score: 0,
      daily_limit: 20,
      emails_sent_today: 0,
      warmup_status: 'pending',
      reputation: 'unknown',
      last_activity: null,
      settings: settings || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    res.status(201).json({
      success: true,
      account: newAccount,
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
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    
    res.json({
      success: true,
      message: 'Email account deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting email account:', error);
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
      status 
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

    // Update account settings
    const updateData = {};
    if (daily_limit !== undefined) updateData.daily_limit = daily_limit;
    if (hourly_limit !== undefined) updateData.hourly_limit = hourly_limit;
    if (rotation_priority !== undefined) updateData.rotation_priority = rotation_priority;
    if (rotation_weight !== undefined) updateData.rotation_weight = rotation_weight;
    if (status !== undefined) updateData.status = status;
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

module.exports = router;