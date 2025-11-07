const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const OAuth2Service = require('./OAuth2Service');
const BounceTrackingService = require('./BounceTrackingService');
const EmailTrackingService = require('./EmailTrackingService');
const { generateUnsubscribeToken } = require('../routes/unsubscribe');
const { toLocalTimestamp } = require('../utils/dateUtils.cjs');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Encryption key for decrypting stored credentials
const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY || 'your-32-char-encryption-key-here';

class EmailService {
  constructor() {
    this.oauth2Service = new OAuth2Service();
    this.trackingService = new EmailTrackingService();
    // Initialize EmailSyncService lazily to avoid circular dependency
    this.emailSyncService = null;
  }

  /**
   * Get EmailSyncService instance (lazy loading)
   */
  getEmailSyncService() {
    if (!this.emailSyncService) {
      const EmailSyncService = require('./EmailSyncService');
      this.emailSyncService = new EmailSyncService();
    }
    return this.emailSyncService;
  }
  /**
   * Decrypt encrypted credentials
   */
  static decrypt(text) {
    try {
      const parts = text.split(':');
      const iv = Buffer.from(parts.shift(), 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
      let decrypted = decipher.update(parts.join(':'), 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error('🔐 Decryption error:', error.message);
      throw new Error('Failed to decrypt credentials');
    }
  }

  /**
   * Get email account credentials from database
   */
  static async getEmailAccount(accountId, organizationId) {
    try {
      console.log('📧 Getting email account:', accountId, 'for org:', organizationId);

      // Try email_accounts table first
      const { data: emailAccount, error: emailError } = await supabase
        .from('email_accounts')
        .select('id, email, provider, created_at, updated_at')
        .eq('id', accountId)
        .eq('organization_id', organizationId)
        .single();

      if (emailAccount) {
        console.log('✅ Found email account:', emailAccount.email, '- Provider:', emailAccount.provider);
        return { ...emailAccount, type: 'smtp' };
      }

      // Try oauth2_tokens table if not found in email_accounts
      const { data: oauthAccount, error: oauthError } = await supabase
        .from('oauth2_tokens')
        .select('id, email, provider, encrypted_tokens, created_at, updated_at, status')
        .eq('id', accountId)
        .eq('organization_id', organizationId)
        .eq('status', 'linked_to_account')
        .single();

      if (oauthAccount) {
        console.log('✅ Found account in oauth2_tokens:', oauthAccount.email, '- Provider:', oauthAccount.provider);

        // Check if this is an SMTP account (stored in oauth2_tokens with provider='smtp')
        if (oauthAccount.provider === 'smtp') {
          console.log('🔐 Decrypting SMTP credentials from oauth2_tokens');

          // Decrypt SMTP credentials
          const tokensData = JSON.parse(oauthAccount.encrypted_tokens);
          const decrypted = this.decryptCredentials(tokensData.encrypted, tokensData.iv);

          return {
            ...oauthAccount,
            type: 'smtp',
            credentials: decrypted
          };
        }

        // Otherwise it's an OAuth2 account (Gmail/Microsoft)
        return { ...oauthAccount, type: 'oauth2' };
      }

      console.error('❌ Account not found in either table:', { emailError, oauthError });
      throw new Error('Email account not found or access denied');
    } catch (error) {
      console.error('❌ Database error getting email account:', error);
      throw error;
    }
  }

  /**
   * Decrypt SMTP credentials from oauth2_tokens table
   */
  static decryptCredentials(encryptedData, iv) {
    try {
      const algorithm = 'aes-256-cbc';
      const key = Buffer.from(process.env.EMAIL_ENCRYPTION_KEY, 'hex');
      const ivBuffer = Buffer.from(iv, 'hex');

      const decipher = crypto.createDecipheriv(algorithm, key, ivBuffer);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted);
    } catch (error) {
      console.error('🔐 Decryption error:', error.message);
      throw new Error('Failed to decrypt SMTP credentials');
    }
  }

  /**
   * Create nodemailer transporter from account credentials
   */
  static async createTransporter(account) {
    try {
      console.log('🚀 Creating transporter for:', account.email);

      let credentials = account.credentials;
      
      // Handle encrypted credentials (if credentials is a string, it's encrypted)
      if (typeof credentials === 'string') {
        credentials = JSON.parse(this.decrypt(credentials));
      }

      console.log('🔧 Credentials structure:', Object.keys(credentials));

      // Create transporter based on provider and available credentials
      let transportConfig;

      if (credentials.oauth2) {
        // OAuth2 configuration (Gmail)
        console.log('🔐 Using OAuth2 configuration');
        transportConfig = {
          service: 'gmail',
          auth: {
            type: 'OAuth2',
            user: credentials.oauth2.user || account.email,
            clientId: credentials.oauth2.clientId,
            clientSecret: credentials.oauth2.clientSecret,
            refreshToken: credentials.oauth2.refreshToken
          }
        };
      } else if (credentials.smtp) {
        // SMTP configuration
        console.log('📨 Using SMTP configuration');
        transportConfig = {
          host: credentials.smtp.host,
          port: credentials.smtp.port || 587,
          secure: credentials.smtp.secure || false,
          auth: {
            user: credentials.smtp.user || account.email,
            pass: credentials.smtp.pass
          }
        };
      } else {
        throw new Error('No valid credentials found (missing oauth2 or smtp configuration)');
      }

      console.log('⚙️ Transport config:', {
        ...transportConfig,
        auth: { ...transportConfig.auth, pass: '***', clientSecret: '***', refreshToken: '***' }
      });

      const transporter = nodemailer.createTransport(transportConfig);

      // Verify transporter
      console.log('🔍 Verifying transporter...');
      await transporter.verify();
      console.log('✅ Transporter verified successfully');

      return transporter;
    } catch (error) {
      console.error('❌ Failed to create transporter:', error.message);
      throw new Error(`Failed to setup email sending: ${error.message}`);
    }
  }

  /**
   * Determine if account should use OAuth2 or SMTP
   */
  static async shouldUseOAuth2(account, organizationId) {
    try {
      // If account provider is 'smtp', always use SMTP
      if (account.provider === 'smtp') {
        console.log('📨 Account provider is SMTP, using SMTP transport');
        return false;
      }

      // If account was found in oauth2_tokens table with OAuth2 provider, use OAuth2
      if (account.type === 'oauth2') {
        console.log('🔐 Account is OAuth2 type, using OAuth2');
        return true;
      }

      // Check if OAuth2 tokens exist for this account email
      const { data: tokenData, error } = await supabase
        .from('oauth2_tokens')
        .select('id, status, provider')
        .eq('email', account.email)
        .eq('organization_id', organizationId)
        .eq('provider', 'gmail')
        .eq('status', 'linked_to_account')
        .single();

      if (!error && tokenData) {
        console.log('🔐 Found OAuth2 tokens for account, using OAuth2');
        return true;
      }

      console.log('🔍 No OAuth2 tokens found, falling back to SMTP');
      return false;
    } catch (error) {
      console.log('🔍 No OAuth2 tokens found, falling back to SMTP');
      return false;
    }
  }

  /**
   * Send a reply email with proper threading headers
   */
  async sendReply({
    accountId,
    organizationId,
    to,
    subject,
    html,
    text = null,
    inReplyTo = null,
    references = null,
    threadId = null,
    conversationId = null,
    attachments = []
  }) {
    try {
      console.log('📤 === SENDING REPLY EMAIL ===');
      console.log('📧 From account ID:', accountId);
      console.log('📭 To:', to);
      console.log('📄 Subject:', subject);
      console.log('🔗 In-Reply-To:', inReplyTo);
      console.log('🔗 References:', references);
      console.log('🧵 Thread ID:', threadId);
      console.log('💬 Conversation ID:', conversationId);
      console.log('📎 Attachments:', attachments.length, attachments.map(a => `${a.name} (${a.size} bytes)`));
      console.log('🏢 Organization:', organizationId);

      // Get email account
      const account = await EmailService.getEmailAccount(accountId, organizationId);
      
      // Check if OAuth2 is available
      const useOAuth2 = await EmailService.shouldUseOAuth2(account, organizationId);
      
      let result;
      if (useOAuth2) {
        console.log('📧 Using OAuth2 for reply');
        result = await this.oauth2Service.sendEmail({
          fromEmail: account.email,
          toEmail: to,
          subject,
          htmlBody: html,
          textBody: text,
          inReplyTo,
          references,
          threadId,
          organizationId,
          attachments
        });
      } else {
        console.log('📧 Using SMTP for reply');
        result = await this.sendReplyViaSmtp({
          account,
          to,
          subject,
          html,
          text,
          inReplyTo,
          references
        });
      }

      // Ingest the sent reply into the unified inbox
      if (conversationId && result.messageId) {
        const UnifiedInboxService = require('./UnifiedInboxService');
        const unifiedInboxService = new UnifiedInboxService();
        
        await unifiedInboxService.ingestEmail({
          message_id_header: result.messageId,
          in_reply_to: inReplyTo,
          message_references: references,
          subject,
          from_email: account.email,
          to_email: to,
          content_html: html,
          content_plain: text,
          organization_id: organizationId,
          email_account_id: accountId
        }, 'sent');
      }

      // Auto-sync the sent message
      try {
        const emailSyncService = this.getEmailSyncService();
        await emailSyncService.syncSentMessage(result, account, organizationId);
        console.log('🔄 Auto-sync completed for sent reply');
      } catch (syncError) {
        console.error('⚠️ Auto-sync failed (non-critical):', syncError.message);
        // Don't fail the email send if sync fails
      }

      console.log('✅ Reply sent successfully');
      return result;

    } catch (error) {
      console.error('❌ Error sending reply:', error);
      throw error;
    }
  }

  /**
   * Send a single email (prioritizes OAuth2 over SMTP)
   */
  async sendEmail({
    accountId,
    organizationId,
    to,
    cc = null,
    bcc = null,
    subject,
    html,
    text = null,
    attachments = [],
    campaignId = null,
    includeUnsubscribe = false,
    trackOpens = false,
    trackClicks = false,
    trackingToken = null,
    scheduledEmailId = null,
    inReplyTo = null,
    references = null,
    threadId = null
  }) {
    try {
      console.log('📤 === SENDING EMAIL ===');
      console.log('📧 From account ID:', accountId);
      console.log('📭 To:', to);
      console.log('📄 Subject:', subject);
      console.log('🏢 Organization:', organizationId);
      if (cc) console.log('📮 CC:', cc);
      if (bcc) console.log('📩 BCC:', bcc);
      console.log('📊 Tracking:', { trackOpens, trackClicks, trackingToken });
      if (inReplyTo) console.log('🔗 In-Reply-To:', inReplyTo);
      if (references) console.log('🔗 References:', references);
      if (threadId) console.log('🧵 Thread-ID:', threadId);

      // Get email account
      const account = await EmailService.getEmailAccount(accountId, organizationId);
      
      // Add tracking to email HTML if enabled
      let trackedHtml = html;
      if ((trackOpens || trackClicks) && trackingToken) {
        console.log('🔍 Adding tracking to email with token:', trackingToken);
        trackedHtml = this.trackingService.addTrackingToEmail(
          html,
          trackingToken,
          trackOpens,
          trackClicks
        );
        console.log('✅ Tracking added to email content');
      }
      
      // Check if OAuth2 is available
      const useOAuth2 = await EmailService.shouldUseOAuth2(account, organizationId);
      
      let result;
      if (useOAuth2) {
        console.log('🔐 Using OAuth2 Gmail API for sending');
        result = await this.oauth2Service.sendEmail({
          fromEmail: account.email,
          toEmail: to,
          cc: cc,
          bcc: bcc,
          subject: subject,
          htmlBody: trackedHtml,  // Use tracked HTML
          textBody: text,
          organizationId: organizationId,
          attachments,
          campaignId,
          includeUnsubscribe,
          inReplyTo,
          references,
          threadId
        });
      } else {
        console.log('📨 Using SMTP for sending');
        result = await this.sendViaSmtp({
          account,
          to,
          cc,
          bcc,
          subject,
          html: trackedHtml,  // Use tracked HTML
          text,
          campaignId,
          includeUnsubscribe,
          organizationId,
          inReplyTo,
          references,
          threadId
        });
      }

      // Auto-sync the sent message
      if (result && result.success) {
        try {
          const emailSyncService = this.getEmailSyncService();
          await emailSyncService.syncSentMessage(result, account, organizationId);
          console.log('🔄 Auto-sync completed for sent email');
        } catch (syncError) {
          console.error('⚠️ Auto-sync failed (non-critical):', syncError.message);
          // Don't fail the email send if sync fails
        }
      }

      return result;

    } catch (error) {
      console.error('❌ Email sending failed:', error.message);
      console.error('🔍 Error details:', error);
      
      return {
        success: false,
        error: error.message,
        from: accountId,
        to: to,
        subject: subject,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Send email via SMTP (fallback method)
   */
  async sendViaSmtp({ account, to, cc = null, bcc = null, subject, html, text, campaignId = null, includeUnsubscribe = false, organizationId = null }) {
    try {
      // Create transporter
      const transporter = await EmailService.createTransporter(account);

      // Add unsubscribe link if enabled
      let finalHtml = html;
      let finalText = text;
      
      if (includeUnsubscribe && campaignId && organizationId) {
        console.log('🚫 Adding unsubscribe link to SMTP email');
        try {
          const unsubscribeToken = generateUnsubscribeToken(to, campaignId, organizationId);
          const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
          const unsubscribeUrl = `${baseUrl}/unsubscribe?token=${unsubscribeToken}`;
          
          // Add unsubscribe link to HTML content
          const unsubscribeHtml = `
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center;">
              <p>If you no longer wish to receive these emails, you can <a href="${unsubscribeUrl}" style="color: #666; text-decoration: underline;">unsubscribe here</a>.</p>
            </div>
          `;
          
          // Insert before closing body tag if it exists, otherwise append
          if (finalHtml && finalHtml.includes('</body>')) {
            finalHtml = finalHtml.replace('</body>', unsubscribeHtml + '</body>');
          } else {
            finalHtml = (finalHtml || '') + unsubscribeHtml;
          }
          
          // Add unsubscribe link to text content
          const unsubscribeText = `\n\n---\nIf you no longer wish to receive these emails, you can unsubscribe here: ${unsubscribeUrl}`;
          finalText = (finalText || finalHtml?.replace(/<[^>]*>/g, '') || '') + unsubscribeText;
          
        } catch (unsubscribeError) {
          console.error('⚠️ Failed to generate unsubscribe link for SMTP:', unsubscribeError.message);
          // Continue without unsubscribe link if generation fails
        }
      }

      // Prepare email options
      const mailOptions = {
        from: {
          name: account.display_name || account.email.split('@')[0],
          address: account.email
        },
        to: to,
        subject: subject,
        html: finalHtml,
        text: finalText || finalHtml?.replace(/<[^>]*>/g, '') || '' // Strip HTML for text version
      };

      // Add CC and BCC if provided
      if (cc && cc.length > 0) {
        mailOptions.cc = cc;
      }
      if (bcc && bcc.length > 0) {
        mailOptions.bcc = bcc;
      }

      console.log('📬 SMTP mail options prepared:', {
        from: mailOptions.from,
        to: mailOptions.to,
        cc: mailOptions.cc,
        bcc: mailOptions.bcc,
        subject: mailOptions.subject
      });

      // Send email
      console.log('🚀 Sending via SMTP...');
      const result = await transporter.sendMail(mailOptions);

      console.log('✅ SMTP email sent successfully!');
      console.log('📬 Message ID:', result.messageId);
      console.log('📨 Response:', result.response);

      return {
        success: true,
        messageId: result.messageId,
        response: result.response,
        from: account.email,
        to: to,
        subject: subject,
        timestamp: new Date().toISOString(),
        provider: 'smtp'
      };

    } catch (error) {
      console.error('❌ SMTP sending failed:', error.message);
      
      // Check if the error indicates a bounce
      const bounceInfo = BounceTrackingService.parseBounceFromError(error, 'smtp');
      
      return {
        success: false,
        error: error.message,
        provider: 'smtp',
        bounceInfo: bounceInfo, // Add bounce information for caller
        from: account.email,
        to: to,
        subject: subject,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Send reply email via SMTP with threading headers
   * @param {Object} params - Reply email parameters
   * @param {Object} params.account - Email account object
   * @param {string} params.to - Recipient email address
   * @param {string} params.subject - Email subject
   * @param {string} params.html - HTML email content
   * @param {string} params.text - Plain text email content (optional)
   * @param {string} params.inReplyTo - Message-ID of the email being replied to
   * @param {string} params.references - References header for threading
   * @returns {Object} Send result with success status and metadata
   */
  async sendReplyViaSmtp({ account, to, subject, html, text, inReplyTo, references }) {
    try {
      console.log('📬 === SENDING SMTP REPLY EMAIL ===');
      console.log('From:', account.email);
      console.log('To:', to);
      console.log('Subject:', subject);
      console.log('In-Reply-To:', inReplyTo);

      // Create SMTP transporter
      const transporter = await EmailService.createTransporter(account);
      if (!transporter) {
        throw new Error('Failed to create SMTP transporter');
      }

      // Prepare email with RFC-compliant threading headers
      const mailOptions = {
        from: {
          name: account.display_name || account.email.split('@')[0],
          address: account.email
        },
        to: to,
        subject: subject,
        html: html,
        text: text || html?.replace(/<[^>]*>/g, '') || '',
        // Threading headers for proper conversation threading
        inReplyTo: inReplyTo,
        references: references,
        // Standard email headers
        headers: {
          'X-Mailer': 'Mailsender SMTP',
          'X-Priority': '3'
        }
      };

      console.log('📧 SMTP reply options prepared with threading headers');

      // Send email via SMTP
      const result = await transporter.sendMail(mailOptions);

      console.log('✅ SMTP reply sent successfully!');
      console.log('Message-ID:', result.messageId);
      console.log('Response:', result.response);

      return {
        success: true,
        messageId: result.messageId,
        response: result.response,
        from: account.email,
        to: to,
        subject: subject,
        timestamp: new Date().toISOString(),
        provider: 'smtp',
        threadingHeaders: {
          inReplyTo: inReplyTo,
          references: references
        }
      };

    } catch (error) {
      console.error('❌ SMTP reply failed:', error.message);
      console.error('Error details:', error);

      // Parse bounce information from error
      const bounceInfo = BounceTrackingService.parseBounceFromError(error, 'smtp');

      return {
        success: false,
        error: error.message,
        errorCode: error.code,
        provider: 'smtp',
        bounceInfo: bounceInfo,
        from: account.email,
        to: to,
        subject: subject,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Send test email with personalization
   */
  async sendTestEmail({
    accountId,
    organizationId,
    recipientEmail,
    subject,
    content,
    personalization = {}
  }) {
    try {
      console.log('🧪 === SENDING TEST EMAIL ===');

      // Apply personalization with support for multiple token styles
      let personalizedSubject = subject || '';
      let personalizedContent = content || '';

      // Ensure email available for substitutions
      const enrichedPersonalization = {
        ...personalization,
        email: personalization.email || recipientEmail
      };

      // Helper to convert camelCase to snake_case
      const toSnake = (str) => str
        ? str.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase()
        : str;

      // Replace tokens like:
      //  - {{firstName}}, {firstName}
      //  - {{first_name}}, {first_name}
      //  - {{company}}, {company}, etc.
      Object.entries(enrichedPersonalization).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        const snake = toSnake(key);
        const variants = [
          `{{${key}}}`, `{${key}}`,
          `{{${snake}}}`, `{${snake}}`
        ];
        variants.forEach((placeholder) => {
          const re = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
          personalizedSubject = personalizedSubject.replace(re, String(value));
          personalizedContent = personalizedContent.replace(re, String(value));
        });
      });

      console.log('✨ Personalization applied:');
      console.log('📄 Original subject:', subject);
      console.log('📄 Personalized subject:', personalizedSubject);

      // Convert content to HTML if it's plain text
      let htmlContent = personalizedContent;
      if (!htmlContent.includes('<')) {
        htmlContent = personalizedContent.replace(/\n/g, '<br>');
      }

      // Send the email
      return await this.sendEmail({
        accountId,
        organizationId,
        to: recipientEmail,
        subject: personalizedSubject,
        html: htmlContent,
        text: personalizedContent
      });

    } catch (error) {
      console.error('❌ Test email failed:', error.message);
      throw error;
    }
  }
}

module.exports = EmailService;
