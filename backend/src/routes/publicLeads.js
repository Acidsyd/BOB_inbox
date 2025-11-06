const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const rateLimit = require('express-rate-limit');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Rate limiting: 100 requests per IP per hour
const addLeadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * POST /api/public/leads/lists/:id/add
 * Public endpoint to add a single lead to a lead list
 * No authentication required - useful for webhooks, forms, and integrations
 */
router.post('/lists/:id/add', addLeadLimiter, async (req, res) => {
  try {
    const { id: leadListId } = req.params;
    const { email, first_name, last_name, company } = req.body;

    // Validate email
    if (!email || typeof email !== 'string' || !isValidEmail(email)) {
      return res.status(400).json({
        error: 'Valid email is required',
        field: 'email'
      });
    }

    // Verify lead list exists and get organization_id
    const { data: leadList, error: listError } = await supabase
      .from('lead_lists')
      .select('id, name, organization_id')
      .eq('id', leadListId)
      .single();

    if (listError || !leadList) {
      return res.status(404).json({
        error: 'Lead list not found',
        message: 'The specified lead list does not exist or is not accessible.'
      });
    }

    // Prepare lead data
    const leadData = {
      email: email.toLowerCase().trim(),
      first_name: first_name?.trim() || '',
      last_name: last_name?.trim() || '',
      company: company?.trim() || '',
      lead_list_id: leadListId,
      organization_id: leadList.organization_id,
      status: 'active'
    };

    // Insert the lead
    const { data: newLead, error: insertError } = await supabase
      .from('leads')
      .insert(leadData)
      .select('id, email, first_name, last_name, company, created_at')
      .single();

    if (insertError) {
      // Handle duplicate email (unique constraint violation)
      if (insertError.code === '23505') {
        return res.status(409).json({
          error: 'Lead already exists',
          message: 'A lead with this email already exists in this organization.',
          field: 'email'
        });
      }

      console.error('Error inserting lead:', insertError);
      throw insertError;
    }

    // Success response
    res.status(201).json({
      message: 'Lead added successfully',
      lead: newLead
    });

  } catch (error) {
    console.error('Error adding lead via public API:', error);
    res.status(500).json({
      error: 'Failed to add lead',
      message: 'An internal error occurred. Please try again later.'
    });
  }
});

/**
 * GET /api/public/leads/lists/:id/verify
 * Verify that a lead list exists (optional utility endpoint)
 */
router.get('/lists/:id/verify', addLeadLimiter, async (req, res) => {
  try {
    const { id: leadListId } = req.params;

    const { data: leadList, error } = await supabase
      .from('lead_lists')
      .select('id, name')
      .eq('id', leadListId)
      .single();

    if (error || !leadList) {
      return res.status(404).json({
        exists: false,
        message: 'Lead list not found'
      });
    }

    res.json({
      exists: true,
      leadList: {
        id: leadList.id,
        name: leadList.name
      }
    });

  } catch (error) {
    console.error('Error verifying lead list:', error);
    res.status(500).json({
      error: 'Failed to verify lead list'
    });
  }
});

module.exports = router;
