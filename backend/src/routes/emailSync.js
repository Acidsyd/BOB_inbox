const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const EmailSyncService = require('../services/EmailSyncService');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize EmailSyncService
const emailSyncService = new EmailSyncService();

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

// ====================================
// MANUAL SYNC ENDPOINTS
// ====================================

/**
 * POST /api/email-sync/account/:accountId
 * Manually sync a specific email account
 */
router.post('/account/:accountId', authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { organizationId } = req.user;
    const {
      syncSent = true,
      syncReceived = true,
      maxMessages = 50,
      since = null
    } = req.body;

    console.log('📧 Manual sync request for account:', accountId);

    // Validate account access
    const account = await emailSyncService.getEmailAccount(accountId, organizationId);
    if (!account) {
      return res.status(404).json({
        error: 'Email account not found or access denied'
      });
    }

    // Perform sync
    const syncResult = await emailSyncService.syncAccount(accountId, organizationId, {
      syncSent,
      syncReceived,
      maxMessages,
      since
    });

    console.log('✅ Manual sync completed:', syncResult);

    res.json({
      success: true,
      syncResult: {
        account: syncResult.account,
        provider: syncResult.provider,
        syncedSent: syncResult.syncedSent,
        syncedReceived: syncResult.syncedReceived,
        totalProcessed: syncResult.totalProcessed,
        errors: syncResult.errors || [],
        duration: syncResult.endTime - syncResult.startTime
      }
    });

  } catch (error) {
    console.error('❌ Manual sync error:', error);
    res.status(500).json({
      error: 'Email sync failed',
      details: error.message
    });
  }
});

/**
 * POST /api/email-sync/all-accounts
 * Sync all accounts for the organization
 */
router.post('/all-accounts', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.user;
    const {
      syncSent = true,
      syncReceived = true,
      maxMessages = 25, // Lower limit for bulk sync
      since = null
    } = req.body;

    console.log('📧 Bulk sync request for organization:', organizationId);

    // Get all email accounts for the organization
    const { data: emailAccounts } = await supabase
      .from('email_accounts')
      .select('id, email, provider')
      .eq('organization_id', organizationId);

    const { data: oauthAccounts } = await supabase
      .from('oauth2_tokens')
      .select('id, email, provider')
      .eq('organization_id', organizationId)
      .eq('status', 'linked_to_account');

    const allAccounts = [
      ...(emailAccounts || []),
      ...(oauthAccounts || [])
    ];

    if (allAccounts.length === 0) {
      return res.json({
        success: true,
        message: 'No email accounts found to sync',
        results: []
      });
    }

    // Sync each account
    const results = [];
    for (const account of allAccounts) {
      try {
        const syncResult = await emailSyncService.syncAccount(account.id, organizationId, {
          syncSent,
          syncReceived,
          maxMessages,
          since
        });
        results.push(syncResult);
      } catch (accountError) {
        console.error(`❌ Failed to sync account ${account.email}:`, accountError.message);
        results.push({
          account: account.email,
          provider: account.provider,
          syncedSent: 0,
          syncedReceived: 0,
          totalProcessed: 0,
          errors: [{ error: accountError.message }]
        });
      }
    }

    const totalSynced = results.reduce((sum, r) => sum + r.totalProcessed, 0);
    const totalErrors = results.reduce((sum, r) => sum + (r.errors?.length || 0), 0);

    console.log('✅ Bulk sync completed:', { totalAccounts: allAccounts.length, totalSynced, totalErrors });

    res.json({
      success: true,
      summary: {
        totalAccounts: allAccounts.length,
        totalSynced,
        totalErrors
      },
      results
    });

  } catch (error) {
    console.error('❌ Bulk sync error:', error);
    res.status(500).json({
      error: 'Bulk email sync failed',
      details: error.message
    });
  }
});

// ====================================
// READ STATUS SYNC ENDPOINTS
// ====================================

/**
 * PUT /api/email-sync/message/:messageId/read-status
 * Sync read/unread status for a message
 */
router.put('/message/:messageId/read-status', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { organizationId } = req.user;
    const { isRead, provider } = req.body;

    console.log('📖 Read status sync request:', { messageId, isRead, provider });

    if (typeof isRead !== 'boolean') {
      return res.status(400).json({
        error: 'isRead must be a boolean value'
      });
    }

    await emailSyncService.syncMessageReadStatus(messageId, isRead, provider, organizationId);

    console.log('✅ Read status synced successfully');

    res.json({
      success: true,
      message: `Message marked as ${isRead ? 'read' : 'unread'}`
    });

  } catch (error) {
    console.error('❌ Read status sync error:', error);
    res.status(500).json({
      error: 'Read status sync failed',
      details: error.message
    });
  }
});

// ====================================
// SYNC STATISTICS ENDPOINTS
// ====================================

/**
 * GET /api/email-sync/stats
 * Get sync statistics for the organization
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.user;

    console.log('📊 Sync stats request for organization:', organizationId);

    const stats = await emailSyncService.getSyncStats(organizationId);

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('❌ Sync stats error:', error);
    res.status(500).json({
      error: 'Failed to get sync statistics',
      details: error.message
    });
  }
});

// ====================================
// RETRY FAILED SYNCS ENDPOINT
// ====================================

/**
 * POST /api/email-sync/retry-failed
 * Retry failed sync operations
 */
router.post('/retry-failed', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { maxRetries = 3 } = req.body;

    console.log('🔄 Retry failed syncs request for organization:', organizationId);

    const retryResult = await emailSyncService.retryFailedSyncs(organizationId, maxRetries);

    console.log('✅ Retry completed:', retryResult);

    res.json({
      success: true,
      retryResult: {
        retried: retryResult.retried,
        stillFailed: retryResult.stillFailed,
        errors: retryResult.errors || []
      }
    });

  } catch (error) {
    console.error('❌ Retry failed syncs error:', error);
    res.status(500).json({
      error: 'Retry failed syncs failed',
      details: error.message
    });
  }
});

// ====================================
// ACCOUNT STATUS ENDPOINT
// ====================================

/**
 * GET /api/email-sync/accounts
 * Get all syncable accounts with their sync status
 */
router.get('/accounts', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.user;

    console.log('📧 Sync accounts request for organization:', organizationId);

    // Get email accounts
    const { data: emailAccounts } = await supabase
      .from('email_accounts')
      .select('id, email, provider, created_at, updated_at')
      .eq('organization_id', organizationId);

    // Get OAuth2 accounts
    const { data: oauthAccounts } = await supabase
      .from('oauth2_tokens')
      .select('id, email, provider, created_at, updated_at, status')
      .eq('organization_id', organizationId)
      .eq('status', 'linked_to_account');

    // Get sync stats for each account
    const accounts = [];

    for (const account of emailAccounts || []) {
      const { data: syncStats } = await supabase
        .from('conversation_messages')
        .select('sync_status, provider_type, direction')
        .eq('organization_id', organizationId)
        .eq('email_account_id', account.id);

      accounts.push({
        ...account,
        type: 'smtp',
        syncable: account.provider === 'gmail', // Only Gmail SMTP might be syncable via IMAP
        messages: {
          total: syncStats?.length || 0,
          synced: syncStats?.filter(s => s.sync_status === 'synced').length || 0,
          pending: syncStats?.filter(s => s.sync_status === 'pending').length || 0,
          failed: syncStats?.filter(s => s.sync_status === 'failed').length || 0
        }
      });
    }

    for (const account of oauthAccounts || []) {
      const { data: syncStats } = await supabase
        .from('conversation_messages')
        .select('sync_status, provider_type, direction, gmail_message_id, outlook_message_id')
        .eq('organization_id', organizationId)
        .eq('from_email', account.email);

      accounts.push({
        ...account,
        type: 'oauth2',
        syncable: true, // OAuth2 accounts are always syncable
        messages: {
          total: syncStats?.length || 0,
          synced: syncStats?.filter(s => s.sync_status === 'synced').length || 0,
          pending: syncStats?.filter(s => s.sync_status === 'pending').length || 0,
          failed: syncStats?.filter(s => s.sync_status === 'failed').length || 0,
          withGmailId: syncStats?.filter(s => s.gmail_message_id).length || 0,
          withOutlookId: syncStats?.filter(s => s.outlook_message_id).length || 0
        }
      });
    }

    console.log(`✅ Found ${accounts.length} syncable accounts`);

    res.json({
      success: true,
      accounts
    });

  } catch (error) {
    console.error('❌ Sync accounts error:', error);
    res.status(500).json({
      error: 'Failed to get sync accounts',
      details: error.message
    });
  }
});

module.exports = router;