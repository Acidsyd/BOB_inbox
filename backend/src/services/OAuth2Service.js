const { google } = require('googleapis');
const { createClient } = require('@supabase/supabase-js');
const BounceTrackingService = require('./BounceTrackingService');
const { generateUnsubscribeToken } = require('../routes/unsubscribe');
const { toLocalTimestamp } = require('../utils/dateUtils.cjs');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * OAuth2Service for Gmail API integration
 * Based on the OAuth2 setup guide with production-ready implementation
 */
class OAuth2Service {
  constructor() {
    // OAuth2 Configuration from environment
    this.clientId = process.env.GOOGLE_OAUTH2_CLIENT_ID || '529213249799-ivupsm6s63trnjp08klvii1gq4a8eqqi.apps.googleusercontent.com';
    this.clientSecret = process.env.GOOGLE_OAUTH2_CLIENT_SECRET;
    this.projectId = process.env.GOOGLE_PROJECT_ID || 'bobinbox-469910';
    this.redirectUri = process.env.GOOGLE_OAUTH2_REDIRECT_URI || 'http://localhost:4000/api/oauth2/auth/callback';

    // Gmail API Scopes
    this.scopes = [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify'
    ];

    // Initialize bounce tracking service
    this.bounceTracker = new BounceTrackingService();

    console.log('🔧 OAuth2Service initialized');
    console.log('📋 Client ID:', this.clientId);
    console.log('📋 Project ID:', this.projectId);
    console.log('📋 Redirect URI:', this.redirectUri);
  }

  // Helper method to create proper sender names from email addresses
  createProperName(email) {
    if (!email) return 'Unknown';
    
    // Known mappings for specific users
    const nameMap = {
      'gianpiero.difelice@gmail.com': 'Gianpiero Di Felice',
      'difelice@qquadro.com': 'Gianpiero Di Felice',
      'gianpierodfg@bobinbox.com': 'Gianpiero Di Felice',
      'gianpiero@vnext-it.com': 'Gianpiero Di Felice',
      'g.impact@fieraimpact.it': 'Gianpiero Impact',
      'gpr.impact@fieraimpact.com': 'Gianpiero Impact'
    };
    
    // Check if we have a specific mapping
    if (nameMap[email.toLowerCase()]) {
      return nameMap[email.toLowerCase()];
    }
    
    // Extract and format name from email
    const emailPrefix = email.split('@')[0];
    
    // Handle common patterns
    if (emailPrefix.includes('.')) {
      // "gianpiero.difelice" -> "Gianpiero Di Felice"
      return emailPrefix
        .split('.')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
    }
    
    // Single word: "gianpiero" -> "Gianpiero"
    return emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1).toLowerCase();
  }

  /**
   * Create OAuth2 client
   */
  createOAuth2Client() {
    return new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      this.redirectUri
    );
  }

  /**
   * Get authorization URL for user consent
   */
  getAuthorizationUrl(state = null) {
    const oauth2Client = this.createOAuth2Client();
    
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.scopes,
      prompt: 'consent', // Force consent to get refresh token
      state: state || Date.now().toString()
    });

    console.log('🔗 Generated auth URL:', authUrl);
    return authUrl;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code) {
    try {
      console.log('🔄 Exchanging code for tokens...');
      const oauth2Client = this.createOAuth2Client();
      
      const { tokens } = await oauth2Client.getToken(code);
      console.log('✅ Tokens received:', {
        has_access_token: !!tokens.access_token,
        has_refresh_token: !!tokens.refresh_token,
        expires_at: tokens.expiry_date
      });

      return tokens;
    } catch (error) {
      console.error('❌ Token exchange failed:', error.message);
      throw new Error(`OAuth2 token exchange failed: ${error.message}`);
    }
  }

  /**
   * Get Gmail client with user authentication
   */
  async getGmailClient(userEmail, organizationId) {
    try {
      console.log('📧 Getting Gmail client for:', userEmail);
      
      // Get tokens from database
      const { data: tokenData, error } = await supabase
        .from('oauth2_tokens')
        .select('encrypted_tokens, expires_at, status')
        .eq('email', userEmail)
        .eq('organization_id', organizationId)
        .eq('provider', 'gmail')
        .eq('status', 'linked_to_account')
        .single();

      if (error || !tokenData) {
        throw new Error(`No valid OAuth2 tokens found for ${userEmail}. User needs to re-authenticate.`);
      }

      // Create OAuth2 client with tokens
      const oauth2Client = this.createOAuth2Client();
      
      // Parse tokens (assuming they're stored as JSON string for now)
      let tokens;
      try {
        tokens = typeof tokenData.encrypted_tokens === 'string' 
          ? JSON.parse(tokenData.encrypted_tokens)
          : tokenData.encrypted_tokens;
      } catch (parseError) {
        console.error('❌ Token parsing failed:', parseError);
        throw new Error('Invalid token format. User needs to re-authenticate.');
      }

      oauth2Client.setCredentials(tokens);

      // Check if token needs refresh
      const now = new Date();
      const expiryDate = new Date(tokens.expiry_date || tokenData.expires_at);
      
      if (expiryDate <= now) {
        console.log('🔄 Token expired, refreshing...');
        const refreshedTokens = await this.refreshAccessToken(oauth2Client, userEmail, organizationId);
        oauth2Client.setCredentials(refreshedTokens);
      }

      // Create Gmail client
      const gmail = google.gmail({
        version: 'v1',
        auth: oauth2Client
      });

      console.log('✅ Gmail client ready for:', userEmail);
      return gmail;

    } catch (error) {
      console.error('❌ Failed to get Gmail client:', error.message);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(oauth2Client, userEmail, organizationId) {
    try {
      console.log('🔄 Refreshing access token for:', userEmail);
      
      const { credentials } = await oauth2Client.refreshAccessToken();
      
      // Update database with new tokens
      const { error } = await supabase
        .from('oauth2_tokens')
        .update({
          encrypted_tokens: JSON.stringify(credentials),
          expires_at: new Date(credentials.expiry_date),
          updated_at: new Date().toISOString()
        })
        .eq('email', userEmail)
        .eq('organization_id', organizationId)
        .eq('provider', 'gmail');

      if (error) {
        console.error('❌ Failed to update refreshed tokens:', error);
        throw new Error('Failed to save refreshed tokens');
      }

      console.log('✅ Token refreshed and saved for:', userEmail);
      return credentials;

    } catch (error) {
      console.error('❌ Token refresh failed:', error.message);
      
      // Mark tokens as invalid if refresh fails
      await supabase
        .from('oauth2_tokens')
        .update({ status: 'invalid' })
        .eq('email', userEmail)
        .eq('organization_id', organizationId)
        .eq('provider', 'gmail');

      throw new Error('Token refresh failed. User needs to re-authenticate.');
    }
  }

  /**
   * Send email via Gmail API
   */
  async sendEmail({
    fromEmail,
    toEmail,
    cc = null,
    bcc = null,
    subject,
    htmlBody,
    textBody = null,
    inReplyTo = null,
    references = null,
    threadId = null,
    organizationId,
    attachments = [],
    campaignId = null,
    includeUnsubscribe = false
  }) {
    try {
      console.log('📤 === SENDING EMAIL VIA GMAIL API ===');
      console.log('📧 From:', fromEmail);
      console.log('📭 To:', toEmail);
      if (cc) console.log('📮 CC:', cc);
      if (bcc) console.log('📩 BCC:', bcc);
      console.log('📄 Subject:', subject);
      console.log('🔗 In-Reply-To:', inReplyTo || 'none');
      console.log('🔗 References:', references || 'none');
      console.log('🧵 Thread ID:', threadId || 'none');
      console.log('📎 Attachments:', attachments.length, attachments.map(a => `${a.name} (${a.size} bytes)`));

      // Get Gmail client for the user
      const gmail = await this.getGmailClient(fromEmail, organizationId);

      // Add unsubscribe link if enabled
      let finalHtmlBody = htmlBody;
      let finalTextBody = textBody;
      
      if (includeUnsubscribe && campaignId) {
        console.log('🚫 Adding unsubscribe link to email');
        try {
          const unsubscribeToken = generateUnsubscribeToken(toEmail, campaignId, organizationId);
          const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
          const unsubscribeUrl = `${baseUrl}/unsubscribe?token=${unsubscribeToken}`;
          
          // Add unsubscribe link to HTML content
          const unsubscribeHtml = `
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center;">
              <p>If you no longer wish to receive these emails, you can <a href="${unsubscribeUrl}" style="color: #666; text-decoration: underline;">unsubscribe here</a>.</p>
            </div>
          `;
          
          // Insert before closing body tag if it exists, otherwise append
          if (finalHtmlBody.includes('</body>')) {
            finalHtmlBody = finalHtmlBody.replace('</body>', unsubscribeHtml + '</body>');
          } else {
            finalHtmlBody += unsubscribeHtml;
          }
          
          // Add unsubscribe link to text content
          const unsubscribeText = `\n\n---\nIf you no longer wish to receive these emails, you can unsubscribe here: ${unsubscribeUrl}`;
          finalTextBody = (finalTextBody || this.htmlToText(htmlBody)) + unsubscribeText;
          
        } catch (unsubscribeError) {
          console.error('⚠️ Failed to generate unsubscribe link:', unsubscribeError.message);
          // Continue without unsubscribe link if generation fails
        }
      }

      // Create email message with threading headers and proper sender name
      const senderName = this.createProperName(fromEmail);
      const emailMessage = this.createEmailMessage(fromEmail, toEmail, cc, bcc, subject, finalHtmlBody, finalTextBody, inReplyTo, references, senderName, attachments);
      
      // Send email via Gmail API with proper threading
      const requestBody = {
        raw: Buffer.from(emailMessage).toString('base64url')
      };
      
      // Add threadId for replies to ensure proper Gmail threading
      if (threadId) {
        requestBody.threadId = threadId;
      }
      
      const result = await gmail.users.messages.send({
        userId: 'me',
        requestBody
      });

      console.log('🎉 Email sent via Gmail API!');
      console.log('📬 Message ID:', result.data.id);
      console.log('🧵 Thread ID:', result.data.threadId);

      // Fetch the actual Message-ID header for reply tracking
      let actualMessageId = null;
      try {
        const messageData = await gmail.users.messages.get({
          userId: 'me',
          id: result.data.id,
          format: 'full'
        });
        
        const headers = messageData.data.payload.headers;
        actualMessageId = headers.find(h => h.name.toLowerCase() === 'message-id')?.value;
        console.log('📧 Actual Message-ID header:', actualMessageId);
      } catch (headerError) {
        console.error('⚠️ Could not fetch Message-ID header:', headerError.message);
      }

      return {
        success: true,
        messageId: result.data.id,
        actualMessageId: actualMessageId,
        threadId: result.data.threadId,
        from: fromEmail,
        to: toEmail,
        subject: subject,
        timestamp: new Date().toISOString(),
        provider: 'gmail-api'
      };

    } catch (error) {
      console.error('❌ Gmail API send failed:', error.message);
      
      // Check if the error indicates a bounce
      const bounceInfo = BounceTrackingService.parseBounceFromError(error, 'gmail');
      
      return {
        success: false,
        error: error.message,
        from: fromEmail,
        to: toEmail,
        subject: subject,
        timestamp: new Date().toISOString(),
        provider: 'gmail-api',
        bounceInfo: bounceInfo // Add bounce information for caller
      };
    }
  }

  /**
   * Create RFC 2822 compliant email message with attachment support
   */
  createEmailMessage(from, to, cc = null, bcc = null, subject, htmlBody, textBody, inReplyTo = null, references = null, fromName = null, attachments = []) {
    const boundary = 'boundary_' + Date.now();
    
    // Format sender with name if provided
    const fromHeader = fromName ? `"${fromName}" <${from}>` : from;
    
    // Determine content type based on whether we have attachments
    const contentType = attachments.length > 0 
      ? `multipart/mixed; boundary="${boundary}"` 
      : `multipart/alternative; boundary="${boundary}"`;
    
    // Create multipart email with threading headers
    const emailParts = [
      `From: ${fromHeader}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      `Content-Type: ${contentType}`,
    ];

    // Add CC and BCC headers if provided
    if (cc && cc.length > 0) {
      emailParts.splice(2, 0, `Cc: ${Array.isArray(cc) ? cc.join(', ') : cc}`);
    }
    if (bcc && bcc.length > 0) {
      emailParts.splice(cc && cc.length > 0 ? 3 : 2, 0, `Bcc: ${Array.isArray(bcc) ? bcc.join(', ') : bcc}`);
    }

    // Add threading headers for replies
    if (inReplyTo) {
      emailParts.push(`In-Reply-To: ${inReplyTo}`);
    }
    if (references) {
      emailParts.push(`References: ${references}`);
    }

    const messageParts = [''];
    
    if (attachments.length > 0) {
      // With attachments: create a nested multipart/alternative for text/html content
      const contentBoundary = 'content_boundary_' + Date.now();
      
      messageParts.push(
        `--${boundary}`,
        `Content-Type: multipart/alternative; boundary="${contentBoundary}"`,
        '',
        `--${contentBoundary}`,
        'Content-Type: text/plain; charset=UTF-8',
        '',
        textBody || this.htmlToText(htmlBody),
        '',
        `--${contentBoundary}`,
        'Content-Type: text/html; charset=UTF-8',
        '',
        htmlBody,
        '',
        `--${contentBoundary}--`
      );
      
      // Add each attachment
      attachments.forEach(attachment => {
        if (attachment.url && attachment.url.startsWith('data:')) {
          // Extract base64 data from data URL
          const [mimeType, base64Data] = attachment.url.split(',');
          const cleanMimeType = mimeType.replace('data:', '').replace(';base64', '');
          
          messageParts.push(
            '',
            `--${boundary}`,
            `Content-Type: ${cleanMimeType}; name="${attachment.name}"`,
            'Content-Transfer-Encoding: base64',
            `Content-Disposition: attachment; filename="${attachment.name}"`,
            '',
            base64Data
          );
        }
      });
      
      messageParts.push(
        '',
        `--${boundary}--`
      );
    } else {
      // No attachments: use simple multipart/alternative
      messageParts.push(
        `--${boundary}`,
        'Content-Type: text/plain; charset=UTF-8',
        '',
        textBody || this.htmlToText(htmlBody),
        '',
        `--${boundary}`,
        'Content-Type: text/html; charset=UTF-8',
        '',
        htmlBody,
        '',
        `--${boundary}--`
      );
    }

    // Combine headers and message body
    return [...emailParts, ...messageParts].join('\r\n');
  }

  /**
   * Convert HTML to plain text (simple implementation)
   */
  htmlToText(html) {
    if (!html) return '';
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }

  /**
   * Get user's email address from OAuth2 tokens
   */
  async getEmailFromTokens(tokens) {
    try {
      console.log('📧 Getting email from OAuth2 tokens...');
      
      // Create OAuth2 client with tokens
      const oauth2Client = this.createOAuth2Client();
      oauth2Client.setCredentials(tokens);

      // Create Gmail client to get user profile
      const gmail = google.gmail({
        version: 'v1',
        auth: oauth2Client
      });

      // Get user profile to extract email
      const profile = await gmail.users.getProfile({ userId: 'me' });
      const email = profile.data.emailAddress;

      console.log('✅ Email extracted from tokens:', email);
      return email;

    } catch (error) {
      console.error('❌ Failed to get email from tokens:', error.message);
      throw new Error(`Failed to get email from OAuth2 tokens: ${error.message}`);
    }
  }

  /**
   * Store OAuth2 tokens in database
   */
  async storeTokens(email, organizationId, tokens) {
    try {
      console.log('💾 Storing OAuth2 tokens for:', email);

      const { data, error } = await supabase
        .from('oauth2_tokens')
        .upsert({
          email: email,
          organization_id: organizationId,
          provider: 'gmail',
          encrypted_tokens: JSON.stringify(tokens),
          expires_at: new Date(tokens.expiry_date),
          scopes: this.scopes,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'email,organization_id,provider'
        });

      if (error) {
        console.error('❌ Failed to store tokens:', error);
        throw new Error('Failed to store OAuth2 tokens');
      }

      console.log('✅ Tokens stored successfully for:', email);
      return data;

    } catch (error) {
      console.error('❌ Token storage failed:', error.message);
      throw error;
    }
  }

  /**
   * Test Gmail API connection
   */
  async testConnection(userEmail, organizationId) {
    try {
      console.log('🧪 Testing Gmail API connection for:', userEmail);
      
      const gmail = await this.getGmailClient(userEmail, organizationId);
      const profile = await gmail.users.getProfile({ userId: 'me' });
      
      console.log('✅ Gmail API test successful');
      console.log('📧 Profile:', profile.data.emailAddress);
      console.log('📬 Messages total:', profile.data.messagesTotal);
      
      return {
        success: true,
        emailAddress: profile.data.emailAddress,
        messagesTotal: profile.data.messagesTotal,
        threadsTotal: profile.data.threadsTotal
      };

    } catch (error) {
      console.error('❌ Gmail API test failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = OAuth2Service;