const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const ReplyMonitoringService = require('../services/ReplyMonitoringService');

// Initialize services
const replyMonitoringService = new ReplyMonitoringService();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Text sanitization utility to prevent JSON encoding errors
const sanitizeText = (text) => {
  if (!text || typeof text !== 'string') {
    return text;
  }

  try {
    return text
      // Remove null bytes and control characters (except \n, \r, \t)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
      // Replace lone surrogates (the source of the JSON error)
      .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '�')
      // Normalize line endings
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');
  } catch (error) {
    console.error('❌ Error sanitizing text:', error);
    return '[Error processing text content]';
  }
};

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// GET /api/replies/monitor - Manually trigger reply monitoring (for testing)
router.get('/monitor', authenticateToken, async (req, res) => {
  try {
    console.log('📬 Manual reply monitoring triggered by user:', req.user.email);
    
    await replyMonitoringService.monitorReplies();
    
    res.json({
      success: true,
      message: 'Reply monitoring completed successfully'
    });

  } catch (error) {
    console.error('❌ Error in manual reply monitoring:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run reply monitoring',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/replies/campaign/:campaignId - Get replies for a specific campaign
router.get('/campaign/:campaignId', authenticateToken, async (req, res) => {
  try {
    const campaignId = req.params.campaignId;
    console.log(`📬 Getting replies for campaign ${campaignId}`);

    const { data: replies, error } = await supabase
      .from('email_replies')
      .select(`
        id, from_email, to_email, subject, message_body,
        reply_received_at, thread_id, reply_message_id,
        leads(first_name, last_name, email, company)
      `)
      .eq('campaign_id', campaignId)
      .eq('organization_id', req.user.organizationId)
      .order('reply_received_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching campaign replies:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch replies'
      });
    }

    console.log(`✅ Found ${replies?.length || 0} replies for campaign ${campaignId}`);

    // Sanitize replies data to prevent JSON encoding errors
    const sanitizedReplies = (replies || []).map(reply => ({
      ...reply,
      message_body: sanitizeText(reply.message_body),
      subject: sanitizeText(reply.subject),
      from_email: sanitizeText(reply.from_email),
      to_email: sanitizeText(reply.to_email)
    }));

    res.json({
      success: true,
      replies: sanitizedReplies,
      total: sanitizedReplies.length
    });

  } catch (error) {
    console.error('❌ Error getting campaign replies:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaign replies',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/replies - Get all replies for organization
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('📬 Getting all replies for organization:', req.user.organizationId);

    const { data: replies, error } = await supabase
      .from('email_replies')
      .select(`
        id, from_email, to_email, subject, message_body,
        reply_received_at, thread_id, reply_message_id,
        campaigns(name),
        leads(first_name, last_name, email, company)
      `)
      .eq('organization_id', req.user.organizationId)
      .order('reply_received_at', { ascending: false })
      .limit(100); // Limit to last 100 replies

    if (error) {
      console.error('❌ Error fetching replies:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch replies'
      });
    }

    console.log(`✅ Found ${replies?.length || 0} replies`);

    // Sanitize replies data to prevent JSON encoding errors
    const sanitizedReplies = (replies || []).map(reply => ({
      ...reply,
      message_body: sanitizeText(reply.message_body),
      subject: sanitizeText(reply.subject),
      from_email: sanitizeText(reply.from_email),
      to_email: sanitizeText(reply.to_email)
    }));

    res.json({
      success: true,
      replies: sanitizedReplies,
      total: sanitizedReplies.length
    });

  } catch (error) {
    console.error('❌ Error getting replies:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch replies',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;