const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const sgMail = require('@sendgrid/mail');
const formData = require('form-data');
const Mailgun = require('mailgun.js');

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Encryption key
const ENCRYPTION_KEY = Buffer.from(process.env.EMAIL_ENCRYPTION_KEY || 'your-32-char-encryption-key-here', 'hex');

/**
 * RelayProviderService
 * Handles sending emails through SMTP relay services (SendGrid, Mailgun, AWS SES, Postmark)
 * using user-provided API keys.
 */
class RelayProviderService {
  constructor() {
    this.mailgun = new Mailgun(formData);
  }

  /**
   * Encrypt API key for secure storage
   */
  static encryptApiKey(apiKey) {
    const algorithm = 'aes-256-cbc';
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      encrypted,
      iv: iv.toString('hex')
    };
  }

  /**
   * Decrypt API key from storage
   */
  static decryptApiKey(encryptedData, ivHex) {
    try {
      const algorithm = 'aes-256-cbc';
      const iv = Buffer.from(ivHex, 'hex');

      const decipher = crypto.createDecipheriv(algorithm, ENCRYPTION_KEY, iv);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('🔐 Decryption error:', error.message);
      throw new Error('Failed to decrypt API key');
    }
  }

  /**
   * Get relay provider by ID
   */
  async getProvider(providerId, organizationId) {
    try {
      const { data: provider, error } = await supabase
        .from('relay_providers')
        .select('*')
        .eq('id', providerId)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .single();

      if (error || !provider) {
        throw new Error('Relay provider not found or inactive');
      }

      // Decrypt API key
      provider.api_key = RelayProviderService.decryptApiKey(
        provider.api_key_encrypted,
        provider.api_key_iv
      );

      return provider;
    } catch (error) {
      console.error('❌ Error getting relay provider:', error);
      throw error;
    }
  }

  /**
   * Send email via SendGrid
   */
  async sendViaSendGrid(provider, emailData) {
    try {
      console.log('📧 Sending via SendGrid');

      // Set API key
      sgMail.setApiKey(provider.api_key);

      // Prepare email
      const message = {
        from: {
          email: emailData.from || provider.from_email,
          name: emailData.fromName || provider.from_name || ''
        },
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text || emailData.html?.replace(/<[^>]*>/g, '') || '',
        ...(emailData.cc && { cc: emailData.cc }),
        ...(emailData.bcc && { bcc: emailData.bcc }),
        ...(emailData.replyTo && { replyTo: emailData.replyTo }),
        // Threading headers for replies
        ...(emailData.inReplyTo && {
          headers: {
            'In-Reply-To': emailData.inReplyTo,
            'References': emailData.references || emailData.inReplyTo
          }
        }),
        // Tracking settings (SendGrid-specific)
        trackingSettings: {
          clickTracking: { enable: emailData.trackClicks || false },
          openTracking: { enable: emailData.trackOpens || false }
        }
      };

      // Add attachments if provided
      if (emailData.attachments && emailData.attachments.length > 0) {
        message.attachments = emailData.attachments.map(att => ({
          content: att.content, // Base64 encoded
          filename: att.filename,
          type: att.type || 'application/octet-stream',
          disposition: att.disposition || 'attachment'
        }));
      }

      // Send email
      const [response] = await sgMail.send(message);

      console.log('✅ SendGrid email sent successfully');
      console.log('📬 Status:', response.statusCode);
      console.log('📬 Message ID:', response.headers['x-message-id']);

      // Update usage stats
      await this.updateProviderUsage(provider.id);

      return {
        success: true,
        messageId: response.headers['x-message-id'],
        provider: 'sendgrid',
        from: message.from.email,
        to: emailData.to,
        subject: emailData.subject,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ SendGrid error:', error.message);

      // Parse SendGrid error
      const errorMessage = error.response?.body?.errors?.[0]?.message || error.message;

      return {
        success: false,
        error: errorMessage,
        provider: 'sendgrid',
        from: emailData.from || provider.from_email,
        to: emailData.to,
        subject: emailData.subject,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Send email via Mailgun
   */
  async sendViaMailgun(provider, emailData) {
    try {
      console.log('📧 Sending via Mailgun');

      // Get Mailgun domain from config
      const domain = provider.config?.domain;
      if (!domain) {
        throw new Error('Mailgun domain not configured');
      }

      // Initialize Mailgun client
      const mg = this.mailgun.client({
        username: 'api',
        key: provider.api_key,
        url: provider.config?.region === 'eu' ? 'https://api.eu.mailgun.net' : 'https://api.mailgun.net'
      });

      // Prepare email data
      const messageData = {
        from: emailData.fromName
          ? `${emailData.fromName} <${emailData.from || provider.from_email}>`
          : emailData.from || provider.from_email,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text || emailData.html?.replace(/<[^>]*>/g, '') || '',
        ...(emailData.cc && { cc: emailData.cc }),
        ...(emailData.bcc && { bcc: emailData.bcc }),
        ...(emailData.replyTo && { 'h:Reply-To': emailData.replyTo }),
        // Threading headers
        ...(emailData.inReplyTo && { 'h:In-Reply-To': emailData.inReplyTo }),
        ...(emailData.references && { 'h:References': emailData.references }),
        // Mailgun tracking
        'o:tracking': emailData.trackOpens ? 'yes' : 'no',
        'o:tracking-clicks': emailData.trackClicks ? 'yes' : 'no'
      };

      // Add attachments if provided
      if (emailData.attachments && emailData.attachments.length > 0) {
        const attachments = emailData.attachments.map(att => ({
          filename: att.filename,
          data: Buffer.from(att.content, 'base64')
        }));
        messageData.attachment = attachments;
      }

      // Send email
      const response = await mg.messages.create(domain, messageData);

      console.log('✅ Mailgun email sent successfully');
      console.log('📬 Message ID:', response.id);

      // Update usage stats
      await this.updateProviderUsage(provider.id);

      return {
        success: true,
        messageId: response.id,
        provider: 'mailgun',
        from: emailData.from || provider.from_email,
        to: emailData.to,
        subject: emailData.subject,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Mailgun error:', error.message);

      return {
        success: false,
        error: error.message,
        provider: 'mailgun',
        from: emailData.from || provider.from_email,
        to: emailData.to,
        subject: emailData.subject,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Route email through appropriate relay provider
   */
  async sendEmail(providerId, organizationId, emailData) {
    try {
      console.log('📤 === SENDING EMAIL VIA RELAY PROVIDER ===');
      console.log('🔌 Provider ID:', providerId);
      console.log('📧 To:', emailData.to);
      console.log('📄 Subject:', emailData.subject);

      // Get provider
      const provider = await this.getProvider(providerId, organizationId);

      // Route based on provider type
      switch (provider.provider_type) {
        case 'sendgrid':
          return await this.sendViaSendGrid(provider, emailData);

        case 'mailgun':
          return await this.sendViaMailgun(provider, emailData);

        default:
          throw new Error(`Unsupported relay provider: ${provider.provider_type}`);
      }

    } catch (error) {
      console.error('❌ Relay provider send failed:', error.message);

      return {
        success: false,
        error: error.message,
        provider: 'relay',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Update provider usage statistics
   */
  async updateProviderUsage(providerId) {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Get current provider data
      const { data: provider } = await supabase
        .from('relay_providers')
        .select('last_reset_date, emails_sent_today, emails_sent_this_month')
        .eq('id', providerId)
        .single();

      if (!provider) return;

      // Reset counters if new day
      const resetNeeded = provider.last_reset_date !== today;

      await supabase
        .from('relay_providers')
        .update({
          emails_sent_today: resetNeeded ? 1 : (provider.emails_sent_today || 0) + 1,
          emails_sent_this_month: (provider.emails_sent_this_month || 0) + 1,
          last_used_at: new Date().toISOString(),
          last_reset_date: today,
          updated_at: new Date().toISOString()
        })
        .eq('id', providerId);

      console.log('📊 Provider usage updated');

    } catch (error) {
      console.error('⚠️ Failed to update provider usage:', error.message);
      // Don't throw - usage tracking failure shouldn't fail email send
    }
  }

  /**
   * Validate API key by sending test request
   */
  async validateApiKey(providerType, apiKey, config = {}) {
    try {
      console.log(`🧪 Validating ${providerType} API key`);

      switch (providerType) {
        case 'sendgrid':
          sgMail.setApiKey(apiKey);
          // SendGrid: Test by fetching API key details
          await sgMail.send({
            from: config.from_email || 'test@example.com',
            to: config.from_email || 'test@example.com',
            subject: 'SendGrid API Key Validation',
            text: 'This is a test',
            mailSettings: {
              sandboxMode: { enable: true } // Sandbox mode - doesn't actually send
            }
          });
          return { valid: true, provider: 'sendgrid' };

        case 'mailgun':
          if (!config.domain) {
            throw new Error('Mailgun domain is required for validation');
          }
          const mg = this.mailgun.client({
            username: 'api',
            key: apiKey,
            url: config.region === 'eu' ? 'https://api.eu.mailgun.net' : 'https://api.mailgun.net'
          });
          // Test by validating domain
          await mg.domains.get(config.domain);
          return { valid: true, provider: 'mailgun' };

        default:
          throw new Error(`Validation not implemented for ${providerType}`);
      }

    } catch (error) {
      console.error(`❌ ${providerType} validation failed:`, error.message);

      // Log more details for debugging
      if (error.response) {
        console.error('📋 Response status:', error.response.status);
        console.error('📋 Response body:', JSON.stringify(error.response.body, null, 2));
      }

      return {
        valid: false,
        provider: providerType,
        error: error.message,
        details: error.response?.body
      };
    }
  }
}

module.exports = RelayProviderService;
