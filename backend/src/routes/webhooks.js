const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

/**
 * GET /api/webhooks
 * Get all webhooks for the authenticated user's organization
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.user;

    const { data: webhooks, error } = await supabase
      .from('webhooks')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch webhooks:', error);
      return res.status(500).json({ error: 'Failed to fetch webhooks' });
    }

    res.json(webhooks);
  } catch (error) {
    console.error('Error fetching webhooks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/webhooks
 * Create a new webhook
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { organizationId, userId } = req.user;
    const { name, url, secret, events, is_active = true } = req.body;

    // Validate required fields
    if (!name || !url) {
      return res.status(400).json({ error: 'Name and URL are required' });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Validate events array
    const validEvents = [
      'label.assigned',
      'label.removed',
      'label.created',
      'email.sent',
      'email.delivered',
      'email.bounced',
      'reply.received',
      'lead_list.created',
      'lead_list.updated',
      'follow_up.sent',
      'campaign.started',
      'campaign.paused'
    ];
    const webhookEvents = events || validEvents;

    const invalidEvents = webhookEvents.filter(event => !validEvents.includes(event));
    if (invalidEvents.length > 0) {
      return res.status(400).json({
        error: `Invalid events: ${invalidEvents.join(', ')}. Valid events are: ${validEvents.join(', ')}`
      });
    }

    console.log(`🎯 Creating webhook "${name}" for organization ${organizationId}`);

    const { data: webhook, error } = await supabase
      .from('webhooks')
      .insert([{
        organization_id: organizationId,
        name: name.trim(),
        url: url.trim(),
        secret: secret?.trim() || null,
        events: webhookEvents,
        is_active
      }])
      .select()
      .single();

    if (error) {
      console.error('Failed to create webhook:', error);

      if (error.code === '23505') { // Unique constraint violation
        return res.status(409).json({ error: 'Webhook name already exists' });
      }

      return res.status(500).json({ error: 'Failed to create webhook' });
    }

    console.log(`✅ Webhook created successfully: ${webhook.id}`);
    res.status(201).json({ webhook });

  } catch (error) {
    console.error('Error creating webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/webhooks/:id
 * Update a webhook
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { id } = req.params;
    const { name, url, secret, events, is_active } = req.body;

    // Validate webhook exists and belongs to organization
    const { data: existingWebhook, error: fetchError } = await supabase
      .from('webhooks')
      .select('id')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (fetchError || !existingWebhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    // Build update object
    const updateData = {};

    if (name !== undefined) updateData.name = name.trim();
    if (url !== undefined) {
      try {
        new URL(url);
        updateData.url = url.trim();
      } catch {
        return res.status(400).json({ error: 'Invalid URL format' });
      }
    }
    if (secret !== undefined) updateData.secret = secret?.trim() || null;
    if (is_active !== undefined) updateData.is_active = is_active;

    if (events !== undefined) {
      const validEvents = [
        'label.assigned',
        'label.removed',
        'label.created',
        'email.sent',
        'email.delivered',
        'email.bounced',
        'reply.received',
        'lead_list.created',
        'lead_list.updated',
        'follow_up.sent',
        'campaign.started',
        'campaign.paused'
      ];
      const invalidEvents = events.filter(event => !validEvents.includes(event));
      if (invalidEvents.length > 0) {
        return res.status(400).json({
          error: `Invalid events: ${invalidEvents.join(', ')}. Valid events are: ${validEvents.join(', ')}`
        });
      }
      updateData.events = events;
    }

    console.log(`📝 Updating webhook ${id}`);

    const { data: webhook, error } = await supabase
      .from('webhooks')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update webhook:', error);

      if (error.code === '23505') { // Unique constraint violation
        return res.status(409).json({ error: 'Webhook name already exists' });
      }

      return res.status(500).json({ error: 'Failed to update webhook' });
    }

    res.json({ webhook });

  } catch (error) {
    console.error('Error updating webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/webhooks/:id
 * Delete a webhook
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { id } = req.params;

    console.log(`🗑️ Deleting webhook ${id}`);

    const { error } = await supabase
      .from('webhooks')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      console.error('Failed to delete webhook:', error);
      return res.status(500).json({ error: 'Failed to delete webhook' });
    }

    res.json({ message: 'Webhook deleted successfully' });

  } catch (error) {
    console.error('Error deleting webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/webhooks/deliveries
 * Get all webhook deliveries for the organization
 */
router.get('/deliveries', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { limit = 50 } = req.query;

    // Get all webhook deliveries for the organization
    const { data: deliveries, error } = await supabase
      .from('webhook_deliveries')
      .select(`
        *,
        webhooks!inner(organization_id)
      `)
      .eq('webhooks.organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (error) {
      console.error('Failed to fetch webhook deliveries:', error);
      return res.status(500).json({ error: 'Failed to fetch deliveries' });
    }

    res.json(deliveries || []);

  } catch (error) {
    console.error('Error fetching webhook deliveries:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/webhooks/test
 * Test a webhook with form data (for new webhooks)
 */
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { url, secret, events } = req.body;

    // Validate required fields
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Create temporary webhook config for testing
    const crypto = require('crypto');
    const testWebhook = {
      id: crypto.randomUUID(),
      organization_id: organizationId,
      name: 'Test Webhook',
      url: url.trim(),
      secret: secret?.trim() || null,
      events: events || ['label.assigned'], // Default to a valid event
      is_active: true
    };

    // Create enriched test payload with example data
    const testPayload = {
      message: 'This is a test webhook delivery from form data',
      webhook_url: testWebhook.url,
      test_timestamp: new Date().toISOString(),

      // Example label event data (for label.assigned, label.removed)
      label_id: 'example-label-uuid-12345',
      label_name: 'Interested',
      conversation_id: 'example-conversation-uuid-67890',
      action: 'assigned', // or 'removed'
      assigned_by: 'user@example.com',

      // Example lead list event data (for lead_list.created, lead_list.updated)
      lead_list_id: 'example-list-uuid-33333',
      name: 'Tech Industry Leads Q1 2025',
      lead_count: 125,
      leads_added: 25,
      total_leads: 150,
      duplicates: 5,
      created_by: 'user-uuid-44444',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),

      // Example email/follow-up event data (for email.sent, follow_up.sent)
      email_id: 'example-email-uuid-88888',
      to_email: 'lead@company.com',
      from_email: 'user@example.com',
      subject: 'Partnership Opportunity with Tech Solutions',
      campaign_id: 'example-campaign-uuid-22222',
      lead_id: 'example-lead-uuid-11111',
      is_follow_up: true,
      sequence_step: 2,
      sent_at: new Date().toISOString(),
      message_id: '<example-message-id@gmail.com>',
      thread_id: 'example-thread-12345',

      // Example campaign event data (for campaign.started, campaign.paused)
      emails_scheduled: 1250,
      first_email_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      last_email_at: new Date(Date.now() + 86400000 * 7).toISOString(), // 7 days from now
      started_at: new Date().toISOString(),
      paused_at: new Date().toISOString(),
      previous_status: 'active',

      // Example conversation data
      conversation: {
        id: 'example-conversation-uuid-67890',
        organization_id: organizationId,
        conversation_type: 'email',
        participants: ['lead@company.com', 'user@example.com'],
        subject: 'Re: Partnership Opportunity',
        last_message_at: new Date().toISOString(),
        message_count: 3,
        status: 'active',
        created_at: new Date(Date.now() - 86400000).toISOString() // 1 day ago
      },

      // Example lead data
      leads: [
        {
          id: 'example-lead-uuid-11111',
          organization_id: organizationId,
          email: 'lead@company.com',
          first_name: 'John',
          last_name: 'Smith',
          company: 'Tech Solutions Inc',
          position: 'Marketing Director',
          phone: '+1-555-0123',
          linkedin_url: 'https://linkedin.com/in/johnsmith',
          website: 'https://techsolutions.com',
          industry: 'Technology',
          employee_count: '50-100',
          location: 'San Francisco, CA',
          lead_status: 'qualified',
          lead_score: 85,
          last_contacted: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
          campaign_id: 'example-campaign-uuid-22222',
          lead_list_id: 'example-list-uuid-33333',
          custom_fields: {
            budget: '$50,000',
            timeline: 'Q1 2025',
            pain_point: 'Manual processes'
          },
          created_at: new Date(Date.now() - 604800000).toISOString() // 1 week ago
        }
      ],

      // Example campaign data
      campaigns: [
        {
          id: 'example-campaign-uuid-22222',
          organization_id: organizationId,
          name: 'Tech Industry Outreach Q4 2024',
          status: 'active',
          campaign_type: 'cold_outreach',
          total_leads: 1250,
          emails_sent: 890,
          replies_received: 67,
          open_rate: 0.34,
          reply_rate: 0.075,
          bounce_rate: 0.02,
          config: {
            emailSubject: 'Partnership Opportunity with {{company}}',
            emailsPerDay: 50,
            sendingInterval: 15,
            sendingHours: { start: 9, end: 17 },
            activeDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
            enableJitter: true,
            trackOpens: true,
            trackClicks: true,
            stopOnReply: true
          },
          created_at: new Date(Date.now() - 2592000000).toISOString(), // 30 days ago
          updated_at: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
        }
      ],

      // Example organization data
      organization: {
        id: organizationId,
        name: 'Example Organization',
        domain: 'example.com',
        industry: 'Software',
        employee_count: '11-50',
        plan_type: 'professional',
        webhook_quota: 10000,
        webhooks_used: 1250,
        created_at: new Date(Date.now() - 7776000000).toISOString() // 90 days ago
      },

      // Example user data
      user: {
        id: 'example-user-uuid-44444',
        email: 'user@example.com',
        first_name: 'Jane',
        last_name: 'Doe',
        role: 'Sales Manager',
        timezone: 'America/New_York',
        last_login: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
        preferences: {
          email_notifications: true,
          webhook_notifications: true,
          daily_summary: true
        }
      },

      // Example email accounts
      email_accounts: [
        {
          id: 'example-account-uuid-55555',
          organization_id: organizationId,
          email: 'user@example.com',
          provider: 'gmail',
          status: 'active',
          daily_quota: 500,
          emails_sent_today: 23,
          last_sync: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
          oauth2_status: 'linked_to_account',
          created_at: new Date(Date.now() - 5184000000).toISOString() // 60 days ago
        }
      ]
    };

    console.log(`🧪 Testing webhook form data at ${testWebhook.url} with enriched example data`);

    // Use the first event type from the selected events, or default to label.assigned
    const testEventType = (events && events.length > 0) ? events[0] : 'label.assigned';
    console.log(`📋 Using event type for test: ${testEventType}`);

    // Send test webhook directly without creating delivery record
    const payload = {
      event: testEventType,
      timestamp: new Date().toISOString(),
      organization_id: organizationId,
      data: testPayload
    };

    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Mailsender-Webhooks/1.0'
    };

    // Add HMAC signature if secret is configured
    if (testWebhook.secret) {
      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', testWebhook.secret)
        .update(JSON.stringify(payload), 'utf8')
        .digest('hex');
      headers['X-Webhook-Signature'] = signature;
    }

    console.log(`🚀 Sending test webhook to ${testWebhook.url}`);

    const response = await fetch(testWebhook.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      timeout: 10000
    });

    console.log(`📡 Webhook response: ${response.status} ${response.statusText}`);

    res.json({
      message: 'Test webhook sent successfully',
      url: testWebhook.url
    });

  } catch (error) {
    console.error('Error testing webhook with form data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/webhooks/:id/test
 * Test a webhook by sending a sample payload
 */
router.post('/:id/test', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { id } = req.params;

    // Get webhook configuration
    const { data: webhook, error: fetchError } = await supabase
      .from('webhooks')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (fetchError || !webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    // Use the first event from the webhook's configured events
    const testEventType = (webhook.events && webhook.events.length > 0) ? webhook.events[0] : 'label.assigned';
    console.log(`📋 Using event type for test: ${testEventType}`);

    // Create test payload with comprehensive example data (same as /test endpoint)
    const testPayload = {
      event: testEventType,
      timestamp: new Date().toISOString(),
      organization_id: organizationId,
      data: {
        message: 'This is a test webhook delivery',
        webhook_id: webhook.id,
        webhook_name: webhook.name,
        test_timestamp: new Date().toISOString(),

        // Include example data for all event types (same as POST /test)
        label_id: 'example-label-uuid-12345',
        label_name: 'Interested',
        conversation_id: 'example-conversation-uuid-67890',
        action: 'assigned',
        assigned_by: 'user@example.com',

        lead_list_id: 'example-list-uuid-33333',
        name: 'Tech Industry Leads Q1 2025',
        lead_count: 125,
        created_by: 'user-uuid-44444',

        email_id: 'example-email-uuid-88888',
        to_email: 'lead@company.com',
        from_email: 'user@example.com',
        subject: 'Partnership Opportunity',
        campaign_id: 'example-campaign-uuid-22222',
        is_follow_up: true,
        sequence_step: 2,
        sent_at: new Date().toISOString()
      }
    };

    console.log(`🧪 Testing webhook ${id} at ${webhook.url} with event: ${testEventType}`);

    // Send test webhook
    const WebhookService = require('../services/WebhookService');
    const webhookService = new WebhookService();

    await webhookService.deliverWebhook(webhook, testEventType, testPayload.data);

    res.json({
      message: 'Test webhook sent successfully',
      payload: testPayload
    });

  } catch (error) {
    console.error('Error testing webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/webhooks/:id/deliveries
 * Get delivery history for a webhook
 */
router.get('/:id/deliveries', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Verify webhook belongs to organization
    const { data: webhook, error: webhookError } = await supabase
      .from('webhooks')
      .select('id')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (webhookError || !webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    const { data: deliveries, error } = await supabase
      .from('webhook_deliveries')
      .select('*')
      .eq('webhook_id', id)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit))
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (error) {
      console.error('Failed to fetch webhook deliveries:', error);
      return res.status(500).json({ error: 'Failed to fetch deliveries' });
    }

    res.json({ deliveries });

  } catch (error) {
    console.error('Error fetching webhook deliveries:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;