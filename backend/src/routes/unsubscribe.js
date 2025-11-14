const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const UNSUBSCRIBE_SECRET = process.env.EMAIL_ENCRYPTION_KEY || 'your-32-char-encryption-key-change-me!';

/**
 * Generate encrypted unsubscribe token
 * @param {string} email - Lead email address
 * @param {string} campaignId - Campaign ID
 * @param {string} organizationId - Organization ID
 * @returns {string} Encrypted token
 */
function generateUnsubscribeToken(email, campaignId, organizationId) {
  const payload = JSON.stringify({
    email,
    campaignId,
    organizationId,
    timestamp: Date.now()
  });

  // Generate a random IV (initialization vector)
  const iv = crypto.randomBytes(16);

  // Create key from secret (must be 32 bytes for aes-256)
  const key = crypto.createHash('sha256').update(UNSUBSCRIBE_SECRET).digest();

  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(payload, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Prepend IV to encrypted data (IV is not secret)
  const combined = iv.toString('hex') + encrypted;

  return Buffer.from(combined).toString('base64url');
}

/**
 * Decrypt unsubscribe token
 * @param {string} token - Encrypted token
 * @returns {Object|null} Decrypted payload or null if invalid
 */
function decryptUnsubscribeToken(token) {
  try {
    const combined = Buffer.from(token, 'base64url').toString();

    // Extract IV (first 32 hex characters = 16 bytes)
    const iv = Buffer.from(combined.slice(0, 32), 'hex');
    const encrypted = combined.slice(32);

    // Create key from secret (must be 32 bytes for aes-256)
    const key = crypto.createHash('sha256').update(UNSUBSCRIBE_SECRET).digest();

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    const payload = JSON.parse(decrypted);

    // Check if token is not too old (7 days max)
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    if (Date.now() - payload.timestamp > maxAge) {
      console.log('🚫 Unsubscribe token expired');
      return null;
    }

    return payload;
  } catch (error) {
    console.error('❌ Error decrypting unsubscribe token:', error);
    return null;
  }
}

// GET /api/unsubscribe?token=xxx - Unsubscribe confirmation page
router.get('/', async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Unsubscribe token is required'
      });
    }
    
    const payload = decryptUnsubscribeToken(token);
    if (!payload) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired unsubscribe token'
      });
    }
    
    const { email, campaignId, organizationId } = payload;
    
    // Check if already unsubscribed
    const { data: existingUnsubscribe } = await supabase
      .from('unsubscribes')
      .select('id')
      .eq('email', email)
      .eq('organization_id', organizationId)
      .single();
    
    if (existingUnsubscribe) {
      return res.json({
        success: true,
        message: 'You are already unsubscribed from this organization',
        email,
        alreadyUnsubscribed: true
      });
    }
    
    // Return unsubscribe confirmation data
    res.json({
      success: true,
      email,
      campaignId,
      organizationId,
      token,
      message: 'Ready to unsubscribe'
    });
    
  } catch (error) {
    console.error('❌ Error in GET unsubscribe:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// POST /api/unsubscribe - Process unsubscribe request
router.post('/', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Unsubscribe token is required'
      });
    }
    
    const payload = decryptUnsubscribeToken(token);
    if (!payload) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired unsubscribe token'
      });
    }
    
    const { email, campaignId, organizationId } = payload;
    
    console.log(`🚫 Processing unsubscribe request for ${email} from campaign ${campaignId}`);
    
    // Check if already unsubscribed
    const { data: existingUnsubscribe } = await supabase
      .from('unsubscribes')
      .select('id')
      .eq('email', email)
      .eq('organization_id', organizationId)
      .single();
    
    if (existingUnsubscribe) {
      return res.json({
        success: true,
        message: 'You were already unsubscribed',
        email,
        alreadyUnsubscribed: true
      });
    }
    
    // Add to unsubscribes table
    const { error: unsubscribeError } = await supabase
      .from('unsubscribes')
      .insert({
        email,
        campaign_id: campaignId,
        organization_id: organizationId,
        unsubscribed_at: new Date().toISOString(),
        source: 'email_link'
      });
    
    if (unsubscribeError) {
      console.error('❌ Error adding to unsubscribes:', unsubscribeError);
      return res.status(500).json({
        success: false,
        error: 'Failed to process unsubscribe request'
      });
    }
    
    // Update lead status to unsubscribed
    const { error: leadUpdateError } = await supabase
      .from('leads')
      .update({ 
        status: 'unsubscribed',
        updated_at: new Date().toISOString()
      })
      .eq('email', email)
      .eq('organization_id', organizationId);
    
    if (leadUpdateError) {
      console.error('❌ Error updating lead status:', leadUpdateError);
      // Don't return error - unsubscribe still worked
    }
    
    // Cancel any scheduled emails for this lead
    const { error: cancelError } = await supabase
      .from('scheduled_emails')
      .update({ 
        status: 'skipped',
        updated_at: new Date().toISOString()
      })
      .eq('to_email', email)
      .eq('organization_id', organizationId)
      .in('status', ['scheduled', 'sending']);
    
    if (cancelError) {
      console.error('❌ Error cancelling scheduled emails:', cancelError);
      // Don't return error - unsubscribe still worked
    }
    
    console.log(`✅ Successfully unsubscribed ${email} from organization ${organizationId}`);
    
    res.json({
      success: true,
      message: 'You have been successfully unsubscribed',
      email,
      unsubscribedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error in POST unsubscribe:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/unsubscribe/list/:organizationId - Get unsubscribe list (for admin)
router.get('/list/:organizationId', async (req, res) => {
  try {
    const { organizationId } = req.params;
    
    const { data: unsubscribes, error } = await supabase
      .from('unsubscribes')
      .select('*')
      .eq('organization_id', organizationId)
      .order('unsubscribed_at', { ascending: false });
    
    if (error) {
      console.error('❌ Error fetching unsubscribes:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch unsubscribes'
      });
    }
    
    res.json({
      success: true,
      unsubscribes: unsubscribes || [],
      total: unsubscribes?.length || 0
    });
    
  } catch (error) {
    console.error('❌ Error in GET unsubscribe list:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = {
  router,
  generateUnsubscribeToken,
  decryptUnsubscribeToken
};