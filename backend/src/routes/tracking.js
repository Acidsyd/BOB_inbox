const express = require('express');
const router = express.Router();
const EmailTrackingService = require('../services/EmailTrackingService');

const trackingService = new EmailTrackingService();

/**
 * GET /api/track/open/:token.png
 * Tracking pixel endpoint for email opens
 */
router.get('/open/:token.png', async (req, res) => {
  try {
    const { token } = req.params;
    
    // Extract metadata from request
    const metadata = {
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      referer: req.headers['referer'],
      country: req.headers['cf-ipcountry'] || null, // Cloudflare header
      city: req.headers['cf-ipcity'] || null // Cloudflare header
    };
    
    // Record the open event (async, don't wait)
    trackingService.recordOpen(token.replace('.png', ''), metadata)
      .then(result => {
        if (result.success && !result.bot && !result.duplicate) {
          console.log(`📧 Email open tracked: ${result.emailId}`);
        }
      })
      .catch(err => {
        console.error('Error tracking open:', err);
      });
    
    // Always return the tracking pixel immediately
    res.set({
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Content-Type-Options': 'nosniff'
    });
    
    res.send(trackingService.trackingPixel);
    
  } catch (error) {
    console.error('Error in open tracking:', error);
    // Still return a pixel even on error
    res.set('Content-Type', 'image/png');
    res.send(trackingService.trackingPixel);
  }
});

/**
 * GET /api/track/click/:token/:linkIndex/:encodedUrl
 * Click tracking endpoint with redirect
 */
router.get('/click/:token/:linkIndex/:encodedUrl', async (req, res) => {
  try {
    const { token, linkIndex, encodedUrl } = req.params;
    
    // Extract metadata from request
    const metadata = {
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      referer: req.headers['referer'],
      country: req.headers['cf-ipcountry'] || null,
      city: req.headers['cf-ipcity'] || null
    };
    
    // Record the click and get redirect URL
    const result = await trackingService.recordClick(
      token,
      parseInt(linkIndex, 10),
      encodedUrl,
      metadata
    );
    
    if (result.success && !result.bot) {
      console.log(`🔗 Link click tracked: ${result.emailId} -> ${result.redirectUrl}`);
    }
    
    // Redirect to the original URL
    if (result.redirectUrl) {
      res.redirect(302, result.redirectUrl);
    } else {
      // Fallback to home page if URL decoding fails
      res.redirect(302, '/');
    }
    
  } catch (error) {
    console.error('Error in click tracking:', error);
    
    // Try to decode and redirect anyway
    try {
      const { encodedUrl } = req.params;
      const originalUrl = Buffer.from(encodedUrl, 'base64url').toString('utf-8');
      res.redirect(302, originalUrl);
    } catch {
      // Final fallback
      res.redirect(302, '/');
    }
  }
});

/**
 * GET /api/track/stats/:campaignId
 * Get tracking statistics for a campaign
 * (Protected endpoint - requires authentication)
 */
router.get('/stats/:campaignId', async (req, res) => {
  try {
    // Note: In production, you should add authentication middleware here
    // For now, we'll get organizationId from query params
    const { campaignId } = req.params;
    const { organizationId } = req.query;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: 'organizationId is required'
      });
    }
    
    const stats = await trackingService.getCampaignTrackingStats(
      campaignId,
      organizationId
    );
    
    res.json({
      success: true,
      stats
    });
    
  } catch (error) {
    console.error('Error fetching tracking stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tracking statistics'
    });
  }
});

/**
 * POST /api/track/test-pixel
 * Test endpoint to verify tracking pixel generation
 */
router.post('/test-pixel', async (req, res) => {
  try {
    const { html } = req.body;
    
    if (!html) {
      return res.status(400).json({
        success: false,
        error: 'HTML content is required'
      });
    }
    
    // Generate a test tracking token
    const testToken = trackingService.generateTrackingToken();
    
    // Add tracking to the HTML
    const trackedHtml = trackingService.addTrackingToEmail(
      html,
      testToken,
      true, // trackOpens
      true  // trackClicks
    );
    
    res.json({
      success: true,
      originalLength: html.length,
      trackedLength: trackedHtml.length,
      trackingToken: testToken,
      trackedHtml,
      pixelUrl: `${process.env.BASE_URL || 'http://localhost:4000'}/api/track/open/${testToken}.png`
    });
    
  } catch (error) {
    console.error('Error in test pixel:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/track/events/:emailId
 * Get all tracking events for a specific email
 * (Protected endpoint - requires authentication)
 */
router.get('/events/:emailId', async (req, res) => {
  try {
    const { emailId } = req.params;
    const { organizationId } = req.query;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: 'organizationId is required'
      });
    }
    
    // Get tracking events from database
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    const { data: events, error } = await supabase
      .from('email_tracking_events')
      .select('*')
      .eq('scheduled_email_id', emailId)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    res.json({
      success: true,
      events: events || []
    });
    
  } catch (error) {
    console.error('Error fetching email events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch email events'
    });
  }
});

module.exports = router;