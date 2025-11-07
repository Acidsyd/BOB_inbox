const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const Imap = require('imap');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Encryption key from environment
const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY;

// Authentication middleware
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

/**
 * Encrypt SMTP credentials
 */
function encryptCredentials(credentials) {
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(JSON.stringify(credentials), 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return {
    encryptedData: encrypted,
    iv: iv.toString('hex')
  };
}

/**
 * Decrypt SMTP credentials
 */
function decryptCredentials(encryptedData, iv) {
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const ivBuffer = Buffer.from(iv, 'hex');

  const decipher = crypto.createDecipheriv(algorithm, key, ivBuffer);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return JSON.parse(decrypted);
}

/**
 * Test SMTP connection
 */
async function testSmtpConnection(smtpConfig) {
  return new Promise((resolve, reject) => {
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure || false,
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.pass
      },
      connectionTimeout: 10000,
      greetingTimeout: 5000
    });

    transporter.verify((error, success) => {
      if (error) {
        reject(error);
      } else {
        resolve(success);
      }
      transporter.close();
    });
  });
}

/**
 * Test IMAP connection
 */
async function testImapConnection(imapConfig) {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: imapConfig.user,
      password: imapConfig.pass,
      host: imapConfig.host,
      port: imapConfig.port,
      tls: imapConfig.secure !== false,
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 10000,
      authTimeout: 5000
    });

    let connectionSuccessful = false;

    imap.once('ready', () => {
      connectionSuccessful = true;
      imap.end();
      resolve(true);
    });

    imap.once('error', (err) => {
      imap.end();
      reject(err);
    });

    imap.once('end', () => {
      if (!connectionSuccessful) {
        reject(new Error('IMAP connection ended before ready'));
      }
    });

    try {
      imap.connect();
    } catch (err) {
      reject(err);
    }
  });
}

// Rate limiting for test-connection endpoint
const testConnectionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // limit each user to 10 requests per minute
  message: { error: 'Too many connection tests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user.userId // Rate limit per user, not IP
});

/**
 * GET /api/smtp/providers
 * List pre-configured SMTP providers with connection details
 */
router.get('/providers', authenticateToken, (req, res) => {
  const providers = [
    {
      id: 'gmail',
      name: 'Gmail',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      requiresAppPassword: true,
      setupUrl: 'https://support.google.com/accounts/answer/185833',
      instructions: 'Use an App Password instead of your regular Gmail password. Enable 2-factor authentication first.'
    },
    {
      id: 'outlook',
      name: 'Outlook / Office 365',
      host: 'smtp-mail.outlook.com',
      port: 587,
      secure: false,
      requiresAppPassword: false,
      setupUrl: 'https://support.microsoft.com/en-us/office/pop-imap-and-smtp-settings-8361e398-8af4-4e97-b147-6c6c4ac95353',
      instructions: 'Use your regular Outlook password. Enable SMTP in account settings if not working.'
    },
    {
      id: 'yahoo',
      name: 'Yahoo Mail',
      host: 'smtp.mail.yahoo.com',
      port: 587,
      secure: false,
      requiresAppPassword: true,
      setupUrl: 'https://help.yahoo.com/kb/SLN4075.html',
      instructions: 'Generate an App Password from Yahoo Account Security settings.'
    },
    {
      id: 'protonmail',
      name: 'ProtonMail',
      host: 'smtp.protonmail.ch',
      port: 587,
      secure: false,
      requiresAppPassword: false,
      setupUrl: 'https://proton.me/support/smtp-submission',
      instructions: 'Requires ProtonMail Bridge for SMTP access. Download and install the Bridge app first.'
    },
    {
      id: 'custom',
      name: 'Custom SMTP Server',
      host: '',
      port: 587,
      secure: false,
      requiresAppPassword: false,
      setupUrl: null,
      instructions: 'Enter your custom SMTP server details. Contact your email provider for SMTP settings.'
    }
  ];

  res.json({ providers });
});

/**
 * POST /api/smtp/test-connection
 * Test both SMTP and IMAP connections without saving credentials
 */
router.post('/test-connection', authenticateToken, testConnectionLimiter, async (req, res) => {
  try {
    const { host, port, secure, user, pass, imapHost, imapPort, imapSecure } = req.body;

    // Validate required SMTP fields
    if (!host || !port || !user || !pass) {
      return res.status(400).json({
        error: 'Missing required SMTP fields',
        required: ['host', 'port', 'user', 'pass']
      });
    }

    // Validate required IMAP fields
    if (!imapHost || !imapPort) {
      return res.status(400).json({
        error: 'Missing required IMAP fields',
        required: ['imapHost', 'imapPort'],
        message: 'IMAP settings are required for inbox sync and reply detection'
      });
    }

    // Validate port numbers
    if (isNaN(port) || port < 1 || port > 65535) {
      return res.status(400).json({
        error: 'Invalid SMTP port number',
        message: 'Port must be between 1 and 65535'
      });
    }

    if (isNaN(imapPort) || imapPort < 1 || imapPort > 65535) {
      return res.status(400).json({
        error: 'Invalid IMAP port number',
        message: 'Port must be between 1 and 65535'
      });
    }

    // Validate email format for user
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user)) {
      return res.status(400).json({
        error: 'Invalid email address',
        field: 'user'
      });
    }

    console.log('🧪 Testing SMTP connection:', { host, port, user });

    // Test SMTP connection
    await testSmtpConnection({
      host,
      port: parseInt(port),
      secure: secure === true || secure === 'true',
      user,
      pass
    });

    console.log('✅ SMTP connection successful');

    console.log('🧪 Testing IMAP connection:', { host: imapHost, port: imapPort, user });

    // Test IMAP connection
    await testImapConnection({
      host: imapHost,
      port: parseInt(imapPort),
      secure: imapSecure === true || imapSecure === 'true',
      user,
      pass
    });

    console.log('✅ IMAP connection successful');

    res.json({
      success: true,
      message: 'Both SMTP and IMAP connections successful',
      config: {
        smtp: { host, port: parseInt(port), user },
        imap: { host: imapHost, port: parseInt(imapPort), user }
      }
    });

  } catch (error) {
    console.error('❌ Connection test failed:', error.message);

    // Provide user-friendly error messages
    let errorMessage = error.message;
    let errorCode = error.code;
    let suggestions = [];

    if (error.code === 'EAUTH' || error.code === 'AUTHENTICATIONFAILED') {
      errorMessage = 'Authentication failed';
      suggestions.push('Verify your email and password are correct');
      suggestions.push('Check if you need an App Password instead of regular password');
      suggestions.push('Ensure SMTP/IMAP access is enabled in your email account settings');
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      errorMessage = 'Connection timeout or refused';
      suggestions.push('Verify the server host and port are correct');
      suggestions.push('Check your firewall or network settings');
      suggestions.push('For SMTP, try port 465 (SSL) or 587 (TLS)');
      suggestions.push('For IMAP, try port 993 (SSL) or 143 (TLS)');
    } else if (error.code === 'ESOCKET') {
      errorMessage = 'Socket error';
      suggestions.push('Check if the mail server is reachable');
      suggestions.push('Verify SSL/TLS settings');
    }

    res.status(400).json({
      success: false,
      error: errorMessage,
      errorCode: errorCode,
      suggestions: suggestions,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/smtp/credentials
 * Save SMTP and IMAP credentials for an email account
 */
router.post('/credentials', authenticateToken, async (req, res) => {
  try {
    const { email, displayName, host, port, secure, user, pass, providerId, imapHost, imapPort, imapSecure } = req.body;

    // Validate required SMTP fields
    if (!email || !host || !port || !user || !pass) {
      return res.status(400).json({
        error: 'Missing required SMTP fields',
        required: ['email', 'host', 'port', 'user', 'pass']
      });
    }

    // Validate required IMAP fields
    if (!imapHost || !imapPort) {
      return res.status(400).json({
        error: 'Missing required IMAP fields',
        required: ['imapHost', 'imapPort'],
        message: 'IMAP settings are required for inbox sync and reply detection'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email address',
        field: 'email'
      });
    }

    // Test SMTP connection first
    console.log('🧪 Testing SMTP connection before saving...');
    await testSmtpConnection({
      host,
      port: parseInt(port),
      secure: secure === true || secure === 'true',
      user,
      pass
    });

    console.log('✅ SMTP connection test passed');

    // Test IMAP connection
    console.log('🧪 Testing IMAP connection before saving...');
    await testImapConnection({
      host: imapHost,
      port: parseInt(imapPort),
      secure: imapSecure === true || imapSecure === 'true',
      user,
      pass
    });

    console.log('✅ IMAP connection test passed, saving credentials...');

    // Prepare credentials for encryption (both SMTP and IMAP)
    const emailCredentials = {
      smtp: {
        host,
        port: parseInt(port),
        secure: secure === true || secure === 'true',
        user,
        pass
      },
      imap: {
        host: imapHost,
        port: parseInt(imapPort),
        secure: imapSecure === true || imapSecure === 'true',
        user,
        pass
      }
    };

    // Encrypt credentials
    const { encryptedData, iv } = encryptCredentials(emailCredentials);

    // Create encrypted tokens structure (similar to OAuth2 format)
    const encryptedTokens = JSON.stringify({
      encrypted: encryptedData,
      iv: iv,
      smtp: emailCredentials.smtp,
      imap: emailCredentials.imap
    });

    // Save to oauth2_tokens table (SMTP accounts use this table for credential storage)
    const { data: newAccount, error: insertError } = await supabase
      .from('oauth2_tokens')
      .insert({
        organization_id: req.user.organizationId,
        email: email.toLowerCase().trim(),
        provider: 'smtp',
        encrypted_tokens: encryptedTokens,
        status: 'linked_to_account',
        scopes: ['smtp', 'imap']
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error saving SMTP/IMAP account:', insertError);

      if (insertError.code === '23505') {
        return res.status(409).json({
          error: 'Email account already exists',
          message: 'An account with this email already exists in your organization.'
        });
      }

      throw insertError;
    }

    console.log('✅ SMTP/IMAP account saved successfully:', newAccount.id);

    // Return account without encrypted tokens
    const { encrypted_tokens, ...accountWithoutCredentials } = newAccount;

    res.status(201).json({
      success: true,
      message: 'SMTP/IMAP account added successfully with full inbox support',
      account: accountWithoutCredentials
    });

  } catch (error) {
    console.error('Error saving SMTP/IMAP credentials:', error);

    // If it's a connection error, return 400
    if (error.code === 'EAUTH' || error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT' || error.code === 'AUTHENTICATIONFAILED') {
      return res.status(400).json({
        error: 'Connection test failed',
        message: 'Could not connect to SMTP or IMAP server. Please verify your credentials and settings.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    res.status(500).json({
      error: 'Failed to save credentials',
      message: 'An internal error occurred. Please try again later.'
    });
  }
});

/**
 * PUT /api/smtp/credentials/:accountId
 * Update SMTP credentials for an existing account
 */
router.put('/credentials/:accountId', authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { displayName, host, port, secure, user, pass } = req.body;

    // Verify account exists and belongs to user's organization
    const { data: existingAccount, error: fetchError } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('organization_id', req.user.organizationId)
      .eq('provider', 'smtp')
      .single();

    if (fetchError || !existingAccount) {
      return res.status(404).json({
        error: 'SMTP account not found',
        message: 'The specified SMTP account does not exist or does not belong to your organization.'
      });
    }

    // If credentials are being updated, test connection first
    if (host && port && user && pass) {
      console.log('🧪 Testing new SMTP connection before updating...');
      await testSmtpConnection({
        host,
        port: parseInt(port),
        secure: secure === true || secure === 'true',
        user,
        pass
      });

      console.log('✅ SMTP connection test passed, updating credentials...');

      // Encrypt new credentials
      const smtpCredentials = {
        smtp: {
          host,
          port: parseInt(port),
          secure: secure === true || secure === 'true',
          user,
          pass
        }
      };

      const { encryptedData, iv } = encryptCredentials(smtpCredentials);

      // Update account
      const { data: updatedAccount, error: updateError } = await supabase
        .from('email_accounts')
        .update({
          display_name: displayName || existingAccount.display_name,
          credentials: {
            encrypted: encryptedData,
            iv: iv
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', accountId)
        .eq('organization_id', req.user.organizationId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      const { credentials, ...accountWithoutCredentials } = updatedAccount;

      res.json({
        message: 'SMTP credentials updated successfully',
        account: accountWithoutCredentials
      });

    } else {
      // Only update display name
      const { data: updatedAccount, error: updateError } = await supabase
        .from('email_accounts')
        .update({
          display_name: displayName,
          updated_at: new Date().toISOString()
        })
        .eq('id', accountId)
        .eq('organization_id', req.user.organizationId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      const { credentials, ...accountWithoutCredentials } = updatedAccount;

      res.json({
        message: 'SMTP account updated successfully',
        account: accountWithoutCredentials
      });
    }

  } catch (error) {
    console.error('Error updating SMTP credentials:', error);

    if (error.code === 'EAUTH' || error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      return res.status(400).json({
        error: 'SMTP connection failed',
        message: 'Could not connect to SMTP server with new credentials.'
      });
    }

    res.status(500).json({
      error: 'Failed to update SMTP credentials',
      message: 'An internal error occurred. Please try again later.'
    });
  }
});

/**
 * DELETE /api/smtp/credentials/:accountId
 * Remove SMTP account (soft delete)
 */
router.delete('/credentials/:accountId', authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;

    // Verify account exists and belongs to user's organization
    const { data: existingAccount, error: fetchError } = await supabase
      .from('email_accounts')
      .select('id, email, status')
      .eq('id', accountId)
      .eq('organization_id', req.user.organizationId)
      .eq('provider', 'smtp')
      .single();

    if (fetchError || !existingAccount) {
      return res.status(404).json({
        error: 'SMTP account not found',
        message: 'The specified SMTP account does not exist or does not belong to your organization.'
      });
    }

    // Soft delete - mark as inactive
    const { error: updateError } = await supabase
      .from('email_accounts')
      .update({
        status: 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('id', accountId)
      .eq('organization_id', req.user.organizationId);

    if (updateError) {
      throw updateError;
    }

    console.log('✅ SMTP account deleted:', accountId);

    res.json({
      message: 'SMTP account removed successfully',
      accountId: accountId
    });

  } catch (error) {
    console.error('Error deleting SMTP account:', error);
    res.status(500).json({
      error: 'Failed to remove SMTP account',
      message: 'An internal error occurred. Please try again later.'
    });
  }
});

module.exports = router;
