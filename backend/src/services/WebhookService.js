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
   */
  async sendLabelWebhook(organizationId, eventType, data) {
    try {
      // Get active webhooks for the organization that listen to this event
      const { data: webhooks, error: webhookError } = await this.supabase
        .from('webhooks')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .contains('events', [eventType]);

      if (webhookError) {
        console.error('❌ Failed to fetch webhooks:', webhookError);
        return;
      }

      if (!webhooks || webhooks.length === 0) {
        console.log(`📭 No active webhooks found for event "${eventType}" in organization ${organizationId}`);
        return;
      }

      // Send webhook to each configured endpoint
      for (const webhook of webhooks) {
        await this.deliverWebhook(webhook, eventType, data);
      }

    } catch (error) {
      console.error('❌ Error in sendLabelWebhook:', error);
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