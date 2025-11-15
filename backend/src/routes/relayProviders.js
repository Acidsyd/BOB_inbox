const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const RelayProviderService = require('../services/RelayProviderService');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const relayProviderService = new RelayProviderService();

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

// GET /api/relay-providers - List all relay providers for organization
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('📋 GET /api/relay-providers called for org:', req.user.organizationId);

    const { data: providers, error } = await supabase
      .from('relay_provider_usage_summary')
      .select('*')
      .eq('organization_id', req.user.organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching relay providers:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch relay providers'
      });
    }

    console.log(`✅ Found ${providers.length} relay providers`);

    res.json({
      success: true,
      providers,
      total: providers.length
    });

  } catch (error) {
    console.error('❌ Error in GET /api/relay-providers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch relay providers'
    });
  }
});

// POST /api/relay-providers - Add new relay provider
router.post('/', authenticateToken, async (req, res) => {
  try {
    console.log('➕ POST /api/relay-providers called');

    const {
      provider_type,
      provider_name,
      api_key,
      config,
      daily_limit
    } = req.body;

    // Validate required fields
    if (!provider_type || !provider_name || !api_key) {
      return res.status(400).json({
        success: false,
        error: 'provider_type, provider_name, and api_key are required'
      });
    }

    // Validate provider type
    const validProviders = ['sendgrid', 'mailgun', 'aws_ses', 'postmark'];
    if (!validProviders.includes(provider_type)) {
      return res.status(400).json({
        success: false,
        error: `provider_type must be one of: ${validProviders.join(', ')}`
      });
    }

    // Additional validation for Mailgun (requires domain)
    if (provider_type === 'mailgun' && !config?.domain) {
      return res.status(400).json({
        success: false,
        error: 'Mailgun requires config.domain to be specified'
      });
    }

    // Validate API key before saving
    console.log(`🧪 Validating ${provider_type} API key...`);
    const validation = await relayProviderService.validateApiKey(provider_type, api_key, {
      domain: config?.domain,
      region: config?.region
    });

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: `API key validation failed: ${validation.error}`
      });
    }

    console.log('✅ API key validated successfully');

    // Encrypt API key
    const { encrypted, iv } = RelayProviderService.encryptApiKey(api_key);

    // Insert into database
    const { data: provider, error } = await supabase
      .from('relay_providers')
      .insert({
        organization_id: req.user.organizationId,
        provider_type,
        provider_name,
        api_key_encrypted: encrypted,
        api_key_iv: iv,
        config: config || {},
        daily_limit: daily_limit || 100,
        is_active: true,
        health_score: 100
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating relay provider:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create relay provider'
      });
    }

    console.log('✅ Relay provider created:', provider.id);

    // Remove sensitive data before sending response
    const safeProvider = { ...provider };
    delete safeProvider.api_key_encrypted;
    delete safeProvider.api_key_iv;

    res.status(201).json({
      success: true,
      provider: safeProvider,
      message: 'Relay provider added successfully'
    });

  } catch (error) {
    console.error('❌ Error in POST /api/relay-providers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create relay provider'
    });
  }
});

// PUT /api/relay-providers/:id - Update relay provider
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      provider_name,
      api_key, // Optional - only if user wants to update it
      config,
      daily_limit,
      is_active
    } = req.body;

    console.log('✏️ PUT /api/relay-providers/:id called for:', id);

    // Build update object
    const updates = {
      updated_at: new Date().toISOString()
    };

    if (provider_name) updates.provider_name = provider_name;
    if (config) updates.config = config;
    if (daily_limit !== undefined) updates.daily_limit = daily_limit;
    if (is_active !== undefined) updates.is_active = is_active;

    // If API key is being updated, validate and encrypt it
    if (api_key) {
      // Get provider type for validation
      const { data: existingProvider } = await supabase
        .from('relay_providers')
        .select('provider_type, config')
        .eq('id', id)
        .eq('organization_id', req.user.organizationId)
        .single();

      if (!existingProvider) {
        return res.status(404).json({
          success: false,
          error: 'Relay provider not found'
        });
      }

      // Validate new API key
      const validation = await relayProviderService.validateApiKey(
        existingProvider.provider_type,
        api_key,
        { ...existingProvider.config, ...config }
      );

      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: `API key validation failed: ${validation.error}`
        });
      }

      // Encrypt new API key
      const { encrypted, iv } = RelayProviderService.encryptApiKey(api_key);
      updates.api_key_encrypted = encrypted;
      updates.api_key_iv = iv;
    }

    // Update provider
    const { data: provider, error } = await supabase
      .from('relay_providers')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', req.user.organizationId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating relay provider:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update relay provider'
      });
    }

    console.log('✅ Relay provider updated:', id);

    // Remove sensitive data
    const safeProvider = { ...provider };
    delete safeProvider.api_key_encrypted;
    delete safeProvider.api_key_iv;

    res.json({
      success: true,
      provider: safeProvider,
      message: 'Relay provider updated successfully'
    });

  } catch (error) {
    console.error('❌ Error in PUT /api/relay-providers/:id:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update relay provider'
    });
  }
});

// DELETE /api/relay-providers/:id - Delete relay provider
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🗑️ DELETE /api/relay-providers/:id called for:', id);

    // Check if any email accounts are using this provider
    const { data: connectedAccounts, error: checkError } = await supabase
      .from('email_accounts')
      .select('id, email')
      .eq('relay_provider_id', id)
      .eq('organization_id', req.user.organizationId);

    if (checkError) {
      console.error('❌ Error checking connected accounts:', checkError);
      return res.status(500).json({
        success: false,
        error: 'Failed to check connected accounts'
      });
    }

    if (connectedAccounts && connectedAccounts.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete relay provider. ${connectedAccounts.length} email account(s) are still using it.`,
        connected_accounts: connectedAccounts
      });
    }

    // Delete provider
    const { error } = await supabase
      .from('relay_providers')
      .delete()
      .eq('id', id)
      .eq('organization_id', req.user.organizationId);

    if (error) {
      console.error('❌ Error deleting relay provider:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete relay provider'
      });
    }

    console.log('✅ Relay provider deleted:', id);

    res.json({
      success: true,
      message: 'Relay provider deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error in DELETE /api/relay-providers/:id:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete relay provider'
    });
  }
});

// POST /api/relay-providers/:id/test - Test relay provider connection
router.post('/:id/test', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { test_email } = req.body;

    console.log('🧪 POST /api/relay-providers/:id/test called for:', id);

    // Validate test_email is provided
    if (!test_email) {
      return res.status(400).json({
        success: false,
        error: 'test_email is required for testing relay provider'
      });
    }

    // Get provider
    const { data: provider, error } = await supabase
      .from('relay_providers')
      .select('*')
      .eq('id', id)
      .eq('organization_id', req.user.organizationId)
      .single();

    if (error || !provider) {
      return res.status(404).json({
        success: false,
        error: 'Relay provider not found'
      });
    }

    // Send test email
    const result = await relayProviderService.sendEmail(
      id,
      req.user.organizationId,
      {
        to: test_email,
        subject: `Test Email from ${provider.provider_name}`,
        html: `
          <h2>Test Email</h2>
          <p>This is a test email sent through your <strong>${provider.provider_type}</strong> relay provider.</p>
          <p>Provider: ${provider.provider_name}</p>
          <p>Sent at: ${new Date().toISOString()}</p>
        `,
        text: `Test Email\n\nThis is a test email sent through your ${provider.provider_type} relay provider.\n\nProvider: ${provider.provider_name}\nSent at: ${new Date().toISOString()}`
      }
    );

    if (result.success) {
      console.log('✅ Test email sent successfully');
      res.json({
        success: true,
        message: 'Test email sent successfully',
        result: {
          messageId: result.messageId,
          provider: result.provider,
          to: test_email
        }
      });
    } else {
      console.log('❌ Test email failed:', result.error);
      res.status(400).json({
        success: false,
        error: `Test email failed: ${result.error}`,
        result
      });
    }

  } catch (error) {
    console.error('❌ Error in POST /api/relay-providers/:id/test:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test relay provider'
    });
  }
});

// GET /api/relay-providers/:id/usage - Get usage statistics
router.get('/:id/usage', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { days = 30 } = req.query;

    console.log(`📊 GET /api/relay-providers/:id/usage for ${days} days`);

    // Get provider with usage summary
    const { data: provider, error } = await supabase
      .from('relay_provider_usage_summary')
      .select('*')
      .eq('id', id)
      .eq('organization_id', req.user.organizationId)
      .single();

    if (error || !provider) {
      return res.status(404).json({
        success: false,
        error: 'Relay provider not found'
      });
    }

    // Get daily usage for the past N days (would need separate tracking table for this)
    // For now, return current usage
    res.json({
      success: true,
      provider_id: id,
      provider_name: provider.provider_name,
      usage: {
        today: provider.emails_sent_today,
        this_month: provider.emails_sent_this_month,
        daily_limit: provider.daily_limit,
        daily_remaining: Math.max(0, provider.daily_limit - provider.emails_sent_today),
        daily_usage_percent: provider.daily_usage_percent,
        last_used_at: provider.last_used_at
      },
      connected_accounts: provider.connected_accounts
    });

  } catch (error) {
    console.error('❌ Error in GET /api/relay-providers/:id/usage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch usage statistics'
    });
  }
});

// POST /api/relay-providers/:id/link-account - Link an email account to relay provider
router.post('/:id/link-account', authenticateToken, async (req, res) => {
  try {
    const { id: providerId } = req.params;
    const { email_account_id, from_email, from_name } = req.body;

    console.log('🔗 POST /api/relay-providers/:id/link-account called');
    console.log('Provider ID:', providerId);
    console.log('Email Account ID:', email_account_id);

    // Validate required fields
    if (!email_account_id || !from_email) {
      return res.status(400).json({
        success: false,
        error: 'email_account_id and from_email are required'
      });
    }

    // Verify provider exists and belongs to organization
    const { data: provider, error: providerError } = await supabase
      .from('relay_providers')
      .select('id, provider_name, provider_type')
      .eq('id', providerId)
      .eq('organization_id', req.user.organizationId)
      .single();

    if (providerError || !provider) {
      return res.status(404).json({
        success: false,
        error: 'Relay provider not found'
      });
    }

    // Verify email account exists and belongs to organization
    const { data: account, error: accountError } = await supabase
      .from('email_accounts')
      .select('id, email, relay_provider_id')
      .eq('id', email_account_id)
      .eq('organization_id', req.user.organizationId)
      .single();

    if (accountError || !account) {
      return res.status(404).json({
        success: false,
        error: 'Email account not found'
      });
    }

    // Check if account is already linked to another provider
    if (account.relay_provider_id && account.relay_provider_id !== providerId) {
      return res.status(400).json({
        success: false,
        error: 'Email account is already linked to another relay provider. Please unlink it first.'
      });
    }

    // Update email account to link to relay provider
    const { data: updatedAccount, error: updateError } = await supabase
      .from('email_accounts')
      .update({
        relay_provider_id: providerId,
        updated_at: new Date().toISOString()
      })
      .eq('id', email_account_id)
      .eq('organization_id', req.user.organizationId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error linking account to provider:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to link email account to relay provider'
      });
    }

    console.log('✅ Email account linked to relay provider');

    res.json({
      success: true,
      message: 'Email account linked successfully',
      account: {
        id: updatedAccount.id,
        email: updatedAccount.email,
        relay_provider_id: updatedAccount.relay_provider_id,
        provider_name: provider.provider_name,
        provider_type: provider.provider_type
      }
    });

  } catch (error) {
    console.error('❌ Error in POST /api/relay-providers/:id/link-account:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to link email account'
    });
  }
});

// POST /api/relay-providers/:id/unlink-account - Unlink an email account from relay provider
router.post('/:id/unlink-account', authenticateToken, async (req, res) => {
  try {
    const { id: providerId } = req.params;
    const { email_account_id } = req.body;

    console.log('🔓 POST /api/relay-providers/:id/unlink-account called');

    // Validate required field
    if (!email_account_id) {
      return res.status(400).json({
        success: false,
        error: 'email_account_id is required'
      });
    }

    // Verify provider exists and belongs to organization
    const { data: provider, error: providerError } = await supabase
      .from('relay_providers')
      .select('id')
      .eq('id', providerId)
      .eq('organization_id', req.user.organizationId)
      .single();

    if (providerError || !provider) {
      return res.status(404).json({
        success: false,
        error: 'Relay provider not found'
      });
    }

    // Update email account to unlink from relay provider
    const { data: updatedAccount, error: updateError } = await supabase
      .from('email_accounts')
      .update({
        relay_provider_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', email_account_id)
      .eq('organization_id', req.user.organizationId)
      .eq('relay_provider_id', providerId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error unlinking account from provider:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to unlink email account from relay provider'
      });
    }

    if (!updatedAccount) {
      return res.status(404).json({
        success: false,
        error: 'Email account not found or not linked to this provider'
      });
    }

    console.log('✅ Email account unlinked from relay provider');

    res.json({
      success: true,
      message: 'Email account unlinked successfully',
      account: {
        id: updatedAccount.id,
        email: updatedAccount.email,
        relay_provider_id: null
      }
    });

  } catch (error) {
    console.error('❌ Error in POST /api/relay-providers/:id/unlink-account:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unlink email account'
    });
  }
});

// GET /api/relay-providers/:id/linked-accounts - Get all accounts linked to a provider
router.get('/:id/linked-accounts', authenticateToken, async (req, res) => {
  try {
    const { id: providerId } = req.params;

    console.log('📋 GET /api/relay-providers/:id/linked-accounts called');

    // Verify provider exists and belongs to organization
    const { data: provider, error: providerError } = await supabase
      .from('relay_providers')
      .select('id, provider_name, provider_type')
      .eq('id', providerId)
      .eq('organization_id', req.user.organizationId)
      .single();

    if (providerError || !provider) {
      return res.status(404).json({
        success: false,
        error: 'Relay provider not found'
      });
    }

    // Get all linked email accounts
    const { data: linkedAccounts, error: accountsError } = await supabase
      .from('email_accounts')
      .select('id, email, is_active, health_score, daily_limit, created_at')
      .eq('relay_provider_id', providerId)
      .eq('organization_id', req.user.organizationId)
      .order('created_at', { ascending: false });

    if (accountsError) {
      console.error('❌ Error fetching linked accounts:', accountsError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch linked accounts'
      });
    }

    console.log(`✅ Found ${linkedAccounts?.length || 0} linked accounts`);

    res.json({
      success: true,
      provider: {
        id: provider.id,
        name: provider.provider_name,
        type: provider.provider_type
      },
      accounts: linkedAccounts || [],
      total: linkedAccounts?.length || 0
    });

  } catch (error) {
    console.error('❌ Error in GET /api/relay-providers/:id/linked-accounts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch linked accounts'
    });
  }
});

module.exports = router;
