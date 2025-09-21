const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

class WebhookService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  }

  /**
   * Send webhook notification for label events
   * @param {string} organizationId - Organization ID
   * @param {string} eventType - Event type (e.g., 'label.assigned', 'label.removed')
   * @param {object} data - Event data payload
   * @param {object} options - Additional options (campaignId, emailAccountId)
   */
  async sendLabelWebhook(organizationId, eventType, data, options = {}) {
    try {
      const webhooks = await this.getWebhooksForEvent(organizationId, eventType, options);

      if (!webhooks || webhooks.length === 0) {
        console.log(`📭 No active webhooks found for event "${eventType}" in organization ${organizationId}`);
        return;
      }

      // Enrich the payload with comprehensive data
      const enrichedData = await this.enrichLabelEventData(organizationId, data, options);

      // Send webhook to each configured endpoint
      for (const webhook of webhooks) {
        await this.deliverWebhook(webhook, eventType, enrichedData);
      }

    } catch (error) {
      console.error('❌ Error in sendLabelWebhook:', error);
    }
  }

  /**
   * Send webhook notification for email events
   * @param {string} organizationId - Organization ID
   * @param {string} eventType - Event type (e.g., 'email.sent', 'email.delivered', 'reply.received')
   * @param {object} data - Event data payload
   * @param {object} options - Additional options (campaignId, emailAccountId)
   */
  async sendEmailWebhook(organizationId, eventType, data, options = {}) {
    try {
      const webhooks = await this.getWebhooksForEvent(organizationId, eventType, options);

      if (!webhooks || webhooks.length === 0) {
        console.log(`📭 No active webhooks found for event "${eventType}" in organization ${organizationId}`);
        return;
      }

      // Send webhook to each configured endpoint
      for (const webhook of webhooks) {
        await this.deliverWebhook(webhook, eventType, data);
      }

    } catch (error) {
      console.error('❌ Error in sendEmailWebhook:', error);
    }
  }

  /**
   * Get webhooks for a specific event, considering campaign and account assignments
   * @param {string} organizationId - Organization ID
   * @param {string} eventType - Event type
   * @param {object} options - Additional options (campaignId, emailAccountId)
   * @returns {Array} Array of webhook configurations
   */
  async getWebhooksForEvent(organizationId, eventType, options = {}) {
    try {
      let assignedWebhookIds = [];

      // Check for campaign-specific webhooks first
      if (options.campaignId) {
        const { data: campaign, error: campaignError } = await this.supabase
          .from('campaigns')
          .select('assigned_webhooks')
          .eq('id', options.campaignId)
          .eq('organization_id', organizationId)
          .single();

        if (!campaignError && campaign?.assigned_webhooks?.length > 0) {
          assignedWebhookIds = campaign.assigned_webhooks;
          console.log(`🎯 Using campaign-assigned webhooks for campaign ${options.campaignId}`);
        }
      }

      // Check for email account-specific webhooks if no campaign webhooks found
      if (assignedWebhookIds.length === 0 && options.emailAccountId) {
        const { data: emailAccount, error: accountError } = await this.supabase
          .from('email_accounts')
          .select('assigned_webhooks')
          .eq('id', options.emailAccountId)
          .eq('organization_id', organizationId)
          .single();

        if (!accountError && emailAccount?.assigned_webhooks?.length > 0) {
          assignedWebhookIds = emailAccount.assigned_webhooks;
          console.log(`📧 Using account-assigned webhooks for account ${options.emailAccountId}`);
        }
      }

      let webhooks;
      let webhookError;

      if (assignedWebhookIds.length > 0) {
        // Get specific assigned webhooks
        ({ data: webhooks, error: webhookError } = await this.supabase
          .from('webhooks')
          .select('*')
          .in('id', assignedWebhookIds)
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .contains('events', [eventType]));
      } else {
        // Get all organization webhooks (default behavior)
        ({ data: webhooks, error: webhookError } = await this.supabase
          .from('webhooks')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .contains('events', [eventType]));

        console.log(`🏢 Using organization-level webhooks for event "${eventType}"`);
      }

      if (webhookError) {
        console.error('❌ Failed to fetch webhooks:', webhookError);
        return [];
      }

      return webhooks || [];

    } catch (error) {
      console.error('❌ Error in getWebhooksForEvent:', error);
      return [];
    }
  }

  /**
   * Deliver webhook to a specific endpoint
   * @param {object} webhook - Webhook configuration
   * @param {string} eventType - Event type
   * @param {object} data - Event data
   */
  async deliverWebhook(webhook, eventType, data) {
    const payload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      organization_id: webhook.organization_id,
      data
    };

    // Create delivery record
    const { data: delivery, error: deliveryError } = await this.supabase
      .from('webhook_deliveries')
      .insert([{
        webhook_id: webhook.id,
        event_type: eventType,
        payload,
        status: 'pending',
        attempts: 0
      }])
      .select()
      .single();

    if (deliveryError) {
      console.error('❌ Failed to create webhook delivery record:', deliveryError);
      return;
    }

    // Attempt delivery
    await this.attemptDelivery(webhook, delivery, payload);
  }

  /**
   * Attempt to deliver webhook with retry logic
   * @param {object} webhook - Webhook configuration
   * @param {object} delivery - Delivery record
   * @param {object} payload - Webhook payload
   */
  async attemptDelivery(webhook, delivery, payload) {
    try {
      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'Mailsender-Webhooks/1.0'
      };

      // Add HMAC signature if secret is configured
      if (webhook.secret) {
        const signature = this.generateSignature(JSON.stringify(payload), webhook.secret);
        headers['X-Webhook-Signature'] = signature;
      }

      console.log(`🚀 Delivering webhook ${delivery.id} to ${webhook.url}`);

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        timeout: 10000 // 10 second timeout
      });

      const responseBody = await response.text().catch(() => '');

      // Update delivery record with success/failure
      const updateData = {
        attempts: delivery.attempts + 1,
        response_code: response.status,
        response_body: responseBody.substring(0, 1000), // Limit response body size
      };

      if (response.ok) {
        updateData.status = 'delivered';
        updateData.delivered_at = new Date().toISOString();
        console.log(`✅ Webhook ${delivery.id} delivered successfully (${response.status})`);
      } else {
        updateData.status = 'failed';
        updateData.error_message = `HTTP ${response.status}: ${responseBody}`.substring(0, 500);
        console.log(`❌ Webhook ${delivery.id} failed with status ${response.status}`);

        // Schedule retry if we haven't exceeded max attempts
        if (delivery.attempts < delivery.max_attempts) {
          const retryDelay = Math.min(1000 * Math.pow(2, delivery.attempts), 300000); // Exponential backoff, max 5 minutes
          updateData.next_retry_at = new Date(Date.now() + retryDelay).toISOString();
        }
      }

      await this.supabase
        .from('webhook_deliveries')
        .update(updateData)
        .eq('id', delivery.id);

    } catch (error) {
      console.error(`❌ Webhook delivery error for ${delivery.id}:`, error);

      // Update delivery record with error
      await this.supabase
        .from('webhook_deliveries')
        .update({
          attempts: delivery.attempts + 1,
          status: 'failed',
          error_message: error.message.substring(0, 500),
          next_retry_at: delivery.attempts < delivery.max_attempts
            ? new Date(Date.now() + Math.min(1000 * Math.pow(2, delivery.attempts), 300000)).toISOString()
            : null
        })
        .eq('id', delivery.id);
    }
  }

  /**
   * Generate HMAC signature for webhook verification
   * @param {string} payload - JSON string payload
   * @param {string} secret - Webhook secret
   * @returns {string} HMAC signature
   */
  generateSignature(payload, secret) {
    return crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');
  }

  /**
   * Verify webhook signature
   * @param {string} payload - JSON string payload
   * @param {string} signature - Received signature
   * @param {string} secret - Webhook secret
   * @returns {boolean} Whether signature is valid
   */
  verifySignature(payload, signature, secret) {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * Enrich label event data with comprehensive context for n8n processing
   * @param {string} organizationId - Organization ID
   * @param {object} data - Original event data
   * @param {object} options - Additional options
   * @returns {object} Enriched data payload
   */
  async enrichLabelEventData(organizationId, data, options = {}) {
    try {
      const enrichedData = { ...data };

      // Get conversation details if conversation_id is provided
      if (data.conversation_id) {
        const conversation = await this.getConversationDetails(organizationId, data.conversation_id);
        if (conversation) {
          enrichedData.conversation = conversation;

          // Extract lead information from conversation participants
          if (conversation.participants && conversation.participants.length > 0) {
            const leadEmails = conversation.participants.filter(p => !p.includes('@gmail.com') && !p.includes('@outlook.com'));
            if (leadEmails.length > 0) {
              const leads = await this.getLeadDetails(organizationId, leadEmails);
              enrichedData.leads = leads;
            }
          }
        }
      }

      // Get conversation details for multiple conversation_ids
      if (data.conversation_ids && Array.isArray(data.conversation_ids)) {
        const conversations = await this.getMultipleConversationDetails(organizationId, data.conversation_ids);
        if (conversations.length > 0) {
          enrichedData.conversations = conversations;

          // Extract all unique lead emails from conversations
          const allLeadEmails = new Set();
          conversations.forEach(conv => {
            if (conv.participants) {
              conv.participants.forEach(p => {
                if (!p.includes('@gmail.com') && !p.includes('@outlook.com')) {
                  allLeadEmails.add(p);
                }
              });
            }
          });

          if (allLeadEmails.size > 0) {
            const leads = await this.getLeadDetails(organizationId, Array.from(allLeadEmails));
            enrichedData.leads = leads;
          }
        }
      }

      // Get organization details
      const organization = await this.getOrganizationDetails(organizationId);
      if (organization) {
        enrichedData.organization = organization;
      }

      // Get user details if assigned_by or removed_by is provided
      if (data.assigned_by || data.removed_by || data.created_by) {
        const userId = data.assigned_by || data.removed_by || data.created_by;
        const user = await this.getUserDetails(organizationId, userId);
        if (user) {
          enrichedData.user = user;
        }
      }

      // Add campaign information if leads are found
      if (enrichedData.leads && enrichedData.leads.length > 0) {
        const campaignIds = [...new Set(enrichedData.leads.map(lead => lead.campaign_id).filter(Boolean))];
        if (campaignIds.length > 0) {
          const campaigns = await this.getCampaignDetails(organizationId, campaignIds);
          enrichedData.campaigns = campaigns;
        }
      }

      // Add email accounts information
      const emailAccounts = await this.getEmailAccountsForOrganization(organizationId);
      if (emailAccounts.length > 0) {
        enrichedData.email_accounts = emailAccounts;
      }

      // Add timestamp and metadata
      enrichedData.enriched_at = new Date().toISOString();
      enrichedData.enrichment_version = '1.0';

      console.log(`📊 Enriched ${data.conversation_id ? 'single' : 'multiple'} conversation webhook data with ${enrichedData.leads ? enrichedData.leads.length : 0} leads and ${enrichedData.campaigns ? enrichedData.campaigns.length : 0} campaigns`);

      return enrichedData;

    } catch (error) {
      console.error('❌ Error enriching label event data:', error);
      // Return original data if enrichment fails
      return data;
    }
  }

  /**
   * Get detailed conversation information
   */
  async getConversationDetails(organizationId, conversationId) {
    try {
      const { data: conversation, error } = await this.supabase
        .from('conversations')
        .select(`
          *,
          conversation_messages (
            id,
            direction,
            subject,
            from_email,
            to_emails,
            sent_at,
            received_at,
            message_id_header
          )
        `)
        .eq('id', conversationId)
        .eq('organization_id', organizationId)
        .single();

      if (error) {
        console.error('Failed to fetch conversation details:', error);
        return null;
      }

      return conversation;
    } catch (error) {
      console.error('Error fetching conversation details:', error);
      return null;
    }
  }

  /**
   * Get details for multiple conversations
   */
  async getMultipleConversationDetails(organizationId, conversationIds) {
    try {
      const { data: conversations, error } = await this.supabase
        .from('conversations')
        .select(`
          *,
          conversation_messages (
            id,
            direction,
            subject,
            from_email,
            to_emails,
            sent_at,
            received_at,
            message_id_header
          )
        `)
        .in('id', conversationIds)
        .eq('organization_id', organizationId);

      if (error) {
        console.error('Failed to fetch multiple conversations:', error);
        return [];
      }

      return conversations || [];
    } catch (error) {
      console.error('Error fetching multiple conversations:', error);
      return [];
    }
  }

  /**
   * Get detailed lead information
   */
  async getLeadDetails(organizationId, emails) {
    try {
      const { data: leads, error } = await this.supabase
        .from('leads')
        .select(`
          *,
          lead_lists (
            id,
            name,
            description
          )
        `)
        .in('email', emails)
        .eq('organization_id', organizationId);

      if (error) {
        console.error('Failed to fetch lead details:', error);
        return [];
      }

      return leads || [];
    } catch (error) {
      console.error('Error fetching lead details:', error);
      return [];
    }
  }

  /**
   * Get campaign details
   */
  async getCampaignDetails(organizationId, campaignIds) {
    try {
      const { data: campaigns, error } = await this.supabase
        .from('campaigns')
        .select(`
          id,
          name,
          subject,
          status,
          emails_per_day,
          emails_per_hour,
          sending_interval,
          active_days,
          sending_hours,
          config,
          created_at,
          updated_at
        `)
        .in('id', campaignIds)
        .eq('organization_id', organizationId);

      if (error) {
        console.error('Failed to fetch campaign details:', error);
        return [];
      }

      return campaigns || [];
    } catch (error) {
      console.error('Error fetching campaign details:', error);
      return [];
    }
  }

  /**
   * Get organization details
   */
  async getOrganizationDetails(organizationId) {
    try {
      const { data: organization, error } = await this.supabase
        .from('organizations')
        .select('id, name, created_at, updated_at')
        .eq('id', organizationId)
        .single();

      if (error) {
        console.error('Failed to fetch organization details:', error);
        return null;
      }

      return organization;
    } catch (error) {
      console.error('Error fetching organization details:', error);
      return null;
    }
  }

  /**
   * Get user details
   */
  async getUserDetails(organizationId, userId) {
    try {
      const { data: user, error } = await this.supabase
        .from('users')
        .select('id, email, first_name, last_name, role, created_at')
        .eq('id', userId)
        .eq('organization_id', organizationId)
        .single();

      if (error) {
        console.error('Failed to fetch user details:', error);
        return null;
      }

      return user;
    } catch (error) {
      console.error('Error fetching user details:', error);
      return null;
    }
  }

  /**
   * Get email accounts for organization
   */
  async getEmailAccountsForOrganization(organizationId) {
    try {
      const { data: emailAccounts, error } = await this.supabase
        .from('email_accounts')
        .select(`
          id,
          email,
          provider,
          display_name,
          is_active,
          health_score,
          daily_limit,
          warmup_enabled,
          warmup_progress
        `)
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      if (error) {
        console.error('Failed to fetch email accounts:', error);
        return [];
      }

      return emailAccounts || [];
    } catch (error) {
      console.error('Error fetching email accounts:', error);
      return [];
    }
  }

  /**
   * Retry failed webhook deliveries
   * Called by cron job or background process
   */
  async retryFailedDeliveries() {
    try {
      const { data: failedDeliveries, error } = await this.supabase
        .from('webhook_deliveries')
        .select(`
          *,
          webhooks (*)
        `)
        .eq('status', 'failed')
        .lt('attempts', 3) // max_attempts
        .not('next_retry_at', 'is', null)
        .lte('next_retry_at', new Date().toISOString());

      if (error) {
        console.error('❌ Failed to fetch failed deliveries:', error);
        return;
      }

      for (const delivery of failedDeliveries) {
        console.log(`🔄 Retrying webhook delivery ${delivery.id} (attempt ${delivery.attempts + 1})`);
        await this.attemptDelivery(delivery.webhooks, delivery, delivery.payload);
      }

    } catch (error) {
      console.error('❌ Error in retryFailedDeliveries:', error);
    }
  }
}

module.exports = WebhookService;