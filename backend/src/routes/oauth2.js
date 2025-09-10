const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const OAuth2Service = require('../services/OAuth2Service');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Helper function to update OAuth2 tokens with account linking info
async function linkOAuth2TokensToAccount(email, organizationId) {
  try {
    console.log('🔗 Linking OAuth2 tokens to account system for:', email);
    
    // Update oauth2_tokens table with account status
    const { data: updatedToken, error: updateError } = await supabase
      .from('oauth2_tokens')
      .update({
        status: 'linked_to_account',
        updated_at: new Date().toISOString()
      })
      .eq('email', email)
      .eq('organization_id', organizationId)
      .eq('provider', 'gmail')
      .select()
      .single();

    if (updateError) {
      console.error('❌ Failed to link OAuth2 tokens:', updateError);
      return;
    }

    console.log('✅ OAuth2 tokens linked to account system successfully');
    console.log('📧 Account:', email, 'is now ready for email sending via OAuth2');
    
  } catch (error) {
    console.error('❌ Error linking OAuth2 tokens:', error);
  }
}

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

// Initialize OAuth2Service
const oauth2Service = new OAuth2Service();

// POST /api/oauth2/auth/init - Initialize OAuth2 authentication
router.post('/auth/init', authenticateToken, async (req, res) => {
  try {
    console.log('🔐 POST /api/oauth2/auth/init called');
    console.log('👤 User:', req.user);
    console.log('📨 Request body:', req.body);

    // Generate OAuth2 authorization URL
    // Email will be determined during Google OAuth2 flow
    const state = `${req.user.organizationId}:${Date.now()}`;
    const authUrl = oauth2Service.getAuthorizationUrl(state);

    console.log('✅ OAuth2 authorization URL generated');
    console.log('🔗 Auth URL:', authUrl);

    res.json({
      success: true,
      authUrl: authUrl,
      message: 'OAuth2 authorization URL generated successfully'
    });

  } catch (error) {
    console.error('❌ OAuth2 init error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize OAuth2 authentication',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/oauth2/auth/callback - Handle OAuth2 callback
router.get('/auth/callback', async (req, res) => {
  try {
    console.log('🔄 GET /api/oauth2/auth/callback called');
    console.log('📝 Query params:', req.query);

    const { code, state, error } = req.query;

    // Check for OAuth2 errors
    if (error) {
      console.error('❌ OAuth2 callback error:', error);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3001'}/settings/email-accounts?error=oauth2_denied`);
    }

    // Validate required parameters
    if (!code || !state) {
      console.error('❌ Missing code or state parameter');
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3001'}/settings/email-accounts?error=invalid_callback`);
    }

    // Parse state parameter
    const [organizationId, timestamp] = state.split(':');
    
    if (!organizationId || !timestamp) {
      console.error('❌ Invalid state parameter format');
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3001'}/settings/email-accounts?error=invalid_state`);
    }

    console.log('🏢 Organization:', organizationId);

    // Exchange authorization code for tokens
    const tokens = await oauth2Service.exchangeCodeForTokens(code);

    // Get user's email from Google OAuth2 tokens
    const email = await oauth2Service.getEmailFromTokens(tokens);
    
    console.log('📧 Processing OAuth2 for:', email);

    // Store tokens in database
    await oauth2Service.storeTokens(email, organizationId, tokens);

    // Link OAuth2 tokens to account system first (updates status to 'linked_to_account')
    await linkOAuth2TokensToAccount(email, organizationId);

    // Test the connection (now that status is correct)
    const testResult = await oauth2Service.testConnection(email, organizationId);

    if (testResult.success) {
      console.log('🎉 OAuth2 setup completed successfully');
      console.log('✅ Gmail API connection verified');
      
      // Redirect to success page
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3001'}/settings/email-accounts?success=oauth2_connected&email=${encodeURIComponent(email)}`);
    } else {
      console.error('❌ OAuth2 connection test failed:', testResult.error);
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3001'}/settings/email-accounts?error=connection_test_failed`);
    }

  } catch (error) {
    console.error('❌ OAuth2 callback processing failed:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3001'}/settings/email-accounts?error=callback_failed`);
  }
});

// POST /api/oauth2/test-connection - Test OAuth2 connection
router.post('/test-connection', authenticateToken, async (req, res) => {
  try {
    console.log('🧪 POST /api/oauth2/test-connection called');
    console.log('👤 User:', req.user);

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Test OAuth2 connection
    const testResult = await oauth2Service.testConnection(email, req.user.organizationId);

    if (testResult.success) {
      console.log('✅ OAuth2 connection test successful');
      res.json({
        success: true,
        message: 'OAuth2 connection is working',
        data: {
          emailAddress: testResult.emailAddress,
          messagesTotal: testResult.messagesTotal,
          threadsTotal: testResult.threadsTotal
        }
      });
    } else {
      console.log('❌ OAuth2 connection test failed');
      res.status(400).json({
        success: false,
        error: 'OAuth2 connection test failed',
        details: testResult.error
      });
    }

  } catch (error) {
    console.error('❌ OAuth2 connection test error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test OAuth2 connection',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/oauth2/status/:email - Get OAuth2 status for an email
router.get('/status/:email', authenticateToken, async (req, res) => {
  try {
    console.log('📊 GET /api/oauth2/status called');
    console.log('👤 User:', req.user);
    console.log('📧 Email:', req.params.email);

    const { email } = req.params;

    // Check if OAuth2 tokens exist
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: tokenData, error } = await supabase
      .from('oauth2_tokens')
      .select('id, status, expires_at, created_at')
      .eq('email', email)
      .eq('organization_id', req.user.organizationId)
      .eq('provider', 'gmail')
      .single();

    if (error || !tokenData) {
      res.json({
        success: true,
        hasOAuth2: false,
        status: 'not_connected',
        message: 'No OAuth2 tokens found'
      });
    } else {
      const isExpired = new Date(tokenData.expires_at) <= new Date();
      
      res.json({
        success: true,
        hasOAuth2: true,
        status: tokenData.status,
        isExpired: isExpired,
        expiresAt: tokenData.expires_at,
        connectedAt: tokenData.created_at
      });
    }

  } catch (error) {
    console.error('❌ OAuth2 status check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check OAuth2 status'
    });
  }
});

// DELETE /api/oauth2/disconnect/:email - Disconnect OAuth2
router.delete('/disconnect/:email', authenticateToken, async (req, res) => {
  try {
    console.log('🔌 DELETE /api/oauth2/disconnect called');
    console.log('👤 User:', req.user);
    console.log('📧 Email:', req.params.email);

    const { email } = req.params;

    // Remove OAuth2 tokens from database
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error } = await supabase
      .from('oauth2_tokens')
      .delete()
      .eq('email', email)
      .eq('organization_id', req.user.organizationId)
      .eq('provider', 'gmail');

    if (error) {
      throw error;
    }

    console.log('✅ OAuth2 tokens removed successfully');

    res.json({
      success: true,
      message: 'OAuth2 connection disconnected successfully'
    });

  } catch (error) {
    console.error('❌ OAuth2 disconnect error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disconnect OAuth2'
    });
  }
});

module.exports = router;