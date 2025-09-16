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
    const validEvents = ['label.assigned', 'label.removed', 'label.created'];
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
      const validEvents = ['label.assigned', 'label.removed', 'label.created'];
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

    // Create test payload
    const testPayload = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      organization_id: organizationId,
      data: {
        message: 'This is a test webhook delivery',
        webhook_id: webhook.id,
        webhook_name: webhook.name
      }
    };

    console.log(`🧪 Testing webhook ${id} at ${webhook.url}`);

    // Send test webhook
    const WebhookService = require('../services/WebhookService');
    const webhookService = new WebhookService();

    await webhookService.deliverWebhook(webhook, 'webhook.test', testPayload.data);

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