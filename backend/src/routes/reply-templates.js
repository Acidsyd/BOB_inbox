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
 * GET /api/reply-templates
 * Get all reply templates for the authenticated user's organization
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { category = null, active_only = 'true' } = req.query;

    console.log(`📝 Fetching reply templates for organization: ${organizationId}`);

    let query = supabase
      .from('reply_templates')
      .select('*')
      .eq('organization_id', organizationId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    if (active_only === 'true') {
      query = query.eq('is_active', true);
    }

    const { data: templates, error } = await query;

    if (error) {
      console.error('❌ Error fetching reply templates:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch reply templates',
        details: error.message 
      });
    }

    console.log(`✅ Retrieved ${templates?.length || 0} reply templates`);
    res.json({ templates: templates || [] });

  } catch (error) {
    console.error('❌ Error in reply templates GET:', error);
    res.status(500).json({ 
      error: 'Failed to fetch reply templates',
      details: error.message 
    });
  }
});

/**
 * POST /api/reply-templates
 * Create a new reply template
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { 
      name, 
      subject, 
      content_html, 
      content_plain, 
      category = 'general',
      sort_order = 0 
    } = req.body;

    if (!name || !content_html) {
      return res.status(400).json({ 
        error: 'Missing required fields: name and content_html are required' 
      });
    }

    console.log(`📝 Creating reply template: ${name} for organization: ${organizationId}`);

    const templateData = {
      organization_id: organizationId,
      name: name.trim(),
      subject: subject?.trim() || null,
      content_html: content_html.trim(),
      content_plain: content_plain?.trim() || stripHtml(content_html.trim()),
      category: category.trim(),
      sort_order: parseInt(sort_order) || 0,
      is_active: true
    };

    const { data: template, error } = await supabase
      .from('reply_templates')
      .insert(templateData)
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating reply template:', error);
      
      if (error.code === '23505') { // Unique constraint violation
        return res.status(409).json({ 
          error: 'A template with this name already exists',
          details: error.message 
        });
      }
      
      return res.status(500).json({ 
        error: 'Failed to create reply template',
        details: error.message 
      });
    }

    console.log(`✅ Created reply template: ${template.id}`);
    res.status(201).json({ template });

  } catch (error) {
    console.error('❌ Error in reply templates POST:', error);
    res.status(500).json({ 
      error: 'Failed to create reply template',
      details: error.message 
    });
  }
});

/**
 * PUT /api/reply-templates/:id
 * Update a reply template
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { id } = req.params;
    const { 
      name, 
      subject, 
      content_html, 
      content_plain, 
      category,
      sort_order,
      is_active 
    } = req.body;

    console.log(`📝 Updating reply template: ${id}`);

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (subject !== undefined) updateData.subject = subject?.trim() || null;
    if (content_html !== undefined) {
      updateData.content_html = content_html.trim();
      if (!content_plain) {
        updateData.content_plain = stripHtml(content_html.trim());
      }
    }
    if (content_plain !== undefined) updateData.content_plain = content_plain?.trim() || null;
    if (category !== undefined) updateData.category = category.trim();
    if (sort_order !== undefined) updateData.sort_order = parseInt(sort_order) || 0;
    if (is_active !== undefined) updateData.is_active = Boolean(is_active);

    const { data: template, error } = await supabase
      .from('reply_templates')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating reply template:', error);
      
      if (error.code === '23505') { // Unique constraint violation
        return res.status(409).json({ 
          error: 'A template with this name already exists',
          details: error.message 
        });
      }
      
      return res.status(500).json({ 
        error: 'Failed to update reply template',
        details: error.message 
      });
    }

    if (!template) {
      return res.status(404).json({ error: 'Reply template not found' });
    }

    console.log(`✅ Updated reply template: ${template.id}`);
    res.json({ template });

  } catch (error) {
    console.error('❌ Error in reply templates PUT:', error);
    res.status(500).json({ 
      error: 'Failed to update reply template',
      details: error.message 
    });
  }
});

/**
 * DELETE /api/reply-templates/:id
 * Delete a reply template
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { id } = req.params;

    console.log(`📝 Deleting reply template: ${id}`);

    const { data: template, error } = await supabase
      .from('reply_templates')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error deleting reply template:', error);
      return res.status(500).json({ 
        error: 'Failed to delete reply template',
        details: error.message 
      });
    }

    if (!template) {
      return res.status(404).json({ error: 'Reply template not found' });
    }

    console.log(`✅ Deleted reply template: ${template.id}`);
    res.json({ message: 'Reply template deleted successfully', template });

  } catch (error) {
    console.error('❌ Error in reply templates DELETE:', error);
    res.status(500).json({ 
      error: 'Failed to delete reply template',
      details: error.message 
    });
  }
});

/**
 * GET /api/reply-templates/:id/preview
 * Preview a reply template with variable substitution
 */
router.get('/:id/preview', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { id } = req.params;
    const {
      recipient_name = 'John Doe',
      sender_name = 'Your Name',
      topic = 'our conversation',
      availability = 'next week'
    } = req.query;

    console.log(`📝 Generating preview for template: ${id}`);

    const { data: template, error } = await supabase
      .from('reply_templates')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      console.error('❌ Error fetching template for preview:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch template',
        details: error.message 
      });
    }

    if (!template) {
      return res.status(404).json({ error: 'Reply template not found' });
    }

    // Simple variable substitution
    const variables = {
      '{{recipient_name}}': recipient_name,
      '{{sender_name}}': sender_name,
      '{{topic}}': topic,
      '{{availability}}': availability
    };

    let previewSubject = template.subject || '';
    let previewContentHtml = template.content_html || '';
    let previewContentPlain = template.content_plain || '';

    Object.entries(variables).forEach(([placeholder, value]) => {
      const regex = new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g');
      previewSubject = previewSubject.replace(regex, value);
      previewContentHtml = previewContentHtml.replace(regex, value);
      previewContentPlain = previewContentPlain.replace(regex, value);
    });

    console.log(`✅ Generated preview for template: ${template.id}`);
    res.json({
      template: {
        ...template,
        preview_subject: previewSubject,
        preview_content_html: previewContentHtml,
        preview_content_plain: previewContentPlain
      },
      variables_used: variables
    });

  } catch (error) {
    console.error('❌ Error in template preview:', error);
    res.status(500).json({ 
      error: 'Failed to generate template preview',
      details: error.message 
    });
  }
});

/**
 * Utility function to strip HTML tags
 */
function stripHtml(html) {
  if (!html) return '';
  
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
    .replace(/&amp;/g, '&') // Replace &amp; with &
    .replace(/&lt;/g, '<') // Replace &lt; with <
    .replace(/&gt;/g, '>') // Replace &gt; with >
    .replace(/&quot;/g, '"') // Replace &quot; with "
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

module.exports = router;