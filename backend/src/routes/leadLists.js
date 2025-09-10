const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}-${originalName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Get all lead lists for organization
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('📋 GET /api/leads/lists called');
    console.log('👤 User:', req.user);
    
    const { data: lists, error } = await supabase
      .from('lead_lists')
      .select('*')
      .eq('organization_id', req.user.organizationId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    // Get lead counts for each list
    const enhancedLists = await Promise.all(
      (lists || []).map(async (list) => {
        const { data: leads, error: leadsError } = await supabase
          .from('leads')
          .select('status')
          .eq('lead_list_id', list.id);
        
        const totalLeads = leads?.length || 0;
        const activeLeads = leads?.filter(lead => lead.status === 'active').length || 0;
        
        // Get last lead added date
        const { data: lastLead } = await supabase
          .from('leads')
          .select('created_at')
          .eq('lead_list_id', list.id)
          .order('created_at', { ascending: false })
          .limit(1);
        
        return {
          id: list.id,
          name: list.name,
          description: list.description || '',
          totalLeads,
          activeLeads,
          createdAt: list.created_at,
          updatedAt: list.updated_at,
          lastLeadAdded: lastLead?.[0]?.created_at || null
        };
      })
    );

    console.log('📋 Found', enhancedLists?.length || 0, 'lead lists');
    console.log('📋 Enhanced Lists sample:', enhancedLists?.[0] || 'None');

    res.json(enhancedLists || []);
  } catch (error) {
    console.error('Error fetching lead lists:', error);
    res.status(500).json({ error: 'Failed to fetch lead lists' });
  }
});

// Create a new lead list
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'List name is required' });
    }

    const { data: newList, error } = await supabase
      .from('lead_lists')
      .insert({
        name,
        organization_id: req.user.organizationId,
        created_by: req.user.userId
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(newList);
  } catch (error) {
    console.error('Error creating lead list:', error);
    res.status(500).json({ error: 'Failed to create lead list' });
  }
});

// Upload CSV to lead list with duplicate checking
router.post('/:id/upload-csv', authenticateToken, upload.single('csvFile'), async (req, res) => {
  try {
    const { id: leadListId } = req.params;
    const { allowDuplicates } = req.body;
    const csvFile = req.file;

    if (!csvFile) {
      return res.status(400).json({ error: 'CSV file is required' });
    }

    // Verify lead list ownership
    const { data: leadList, error: listError } = await supabase
      .from('lead_lists')
      .select('*')
      .eq('id', leadListId)
      .eq('organization_id', req.user.organizationId)
      .single();

    if (listError || !leadList) {
      return res.status(404).json({ error: 'Lead list not found' });
    }

    const results = [];
    const errors = [];
    let processedCount = 0;

    // Parse CSV
    const parsePromise = new Promise((resolve, reject) => {
      const stream = fs.createReadStream(csvFile.path)
        .pipe(csv());

      stream.on('data', (row) => {
        processedCount++;
        
        // Basic email validation
        const email = row.email || row.Email || row.EMAIL;
        if (!email || !email.includes('@')) {
          errors.push(`Row ${processedCount}: Invalid or missing email`);
          return;
        }

        results.push({
          email: email.toLowerCase().trim(),
          first_name: row.first_name || row.First_Name || row.firstName || row['First Name'] || '',
          last_name: row.last_name || row.Last_Name || row.lastName || row['Last Name'] || '',
          company: row.company || row.Company || row.COMPANY || ''
        });
      });

      stream.on('end', resolve);
      stream.on('error', reject);
    });

    await parsePromise;

    if (results.length === 0) {
      return res.status(400).json({ 
        error: 'No valid leads found in CSV file',
        details: errors
      });
    }

    let duplicateCount = 0;
    let insertedCount = 0;
    let duplicateLeads = [];

    if (allowDuplicates === 'true') {
      // Insert all leads without duplicate checking
      for (const lead of results) {
        try {
          const { data, error } = await supabase
            .from('leads')
            .insert({
              ...lead,
              lead_list_id: leadListId,
              organization_id: req.user.organizationId,
              created_by: req.user.userId
            })
            .select()
            .single();

          if (error) {
            if (error.code === '23505') {
              // Duplicate key constraint violation - this lead already exists
              duplicateCount++;
              duplicateLeads.push(lead);
            } else {
              console.error('Error inserting lead:', error);
            }
          } else {
            insertedCount++;
          }
        } catch (err) {
          console.error('Error processing lead:', err);
        }
      }
    } else {
      // Check for duplicates before inserting
      for (const lead of results) {
        try {
          // Check if email already exists in ANY of the user's lists in this organization
          const { data: existingLeads, error: checkError } = await supabase
            .from('leads')
            .select(`
              *,
              lead_lists:lead_list_id (
                id,
                name
              )
            `)
            .eq('email', lead.email)
            .eq('organization_id', req.user.organizationId);

          if (checkError) {
            throw checkError;
          }

          if (existingLeads && existingLeads.length > 0) {
            // Lead already exists in one or more lists
            duplicateCount++;
            const duplicateInfo = {
              ...lead,
              existingInLists: existingLeads.map(existingLead => ({
                listId: existingLead.lead_list_id,
                listName: existingLead.lead_lists?.name || 'Unknown List'
              }))
            };
            duplicateLeads.push(duplicateInfo);
          } else {
            // Insert new lead
            const { data, error } = await supabase
              .from('leads')
              .insert({
                ...lead,
                lead_list_id: leadListId,
                organization_id: req.user.organizationId,
                created_by: req.user.userId
              })
              .select()
              .single();

            if (error) {
              if (error.code === '23505') {
                // Duplicate key constraint violation - this lead already exists
                duplicateCount++;
                duplicateLeads.push(lead);
              } else {
                console.error('Error inserting lead:', error);
              }
            } else {
              insertedCount++;
            }
          }
        } catch (err) {
          console.error('Error processing lead:', err);
          // Individual errors logged to console, summary will be provided to user
        }
      }
    }

    // Clean up uploaded file
    try {
      fs.unlinkSync(csvFile.path);
    } catch (cleanupError) {
      console.error('Error cleaning up file:', cleanupError);
    }

    const failedCount = results.length - insertedCount - duplicateCount;
    const summaryErrors = [];
    
    res.json({
      message: 'CSV processing completed',
      total: results.length,
      inserted: insertedCount,
      duplicates: duplicateCount,
      duplicateLeads: duplicateLeads,
      failed: failedCount,
      errors: summaryErrors
    });

  } catch (error) {
    console.error('CSV upload error:', error);
    
    // Clean up file if it exists
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }

    res.status(500).json({ error: 'Failed to process CSV file' });
  }
});

// Import duplicates endpoint - the main functionality that was working
router.post('/:id/import-duplicates', authenticateToken, async (req, res) => {
  try {
    const { id: leadListId } = req.params;
    const { duplicateLeads } = req.body;

    if (!duplicateLeads || !Array.isArray(duplicateLeads)) {
      return res.status(400).json({ error: 'duplicateLeads array is required' });
    }

    // Verify lead list ownership
    const { data: leadList, error: listError } = await supabase
      .from('lead_lists')
      .select('*')
      .eq('id', leadListId)
      .eq('organization_id', req.user.organizationId)
      .single();

    if (listError || !leadList) {
      return res.status(404).json({ error: 'Lead list not found' });
    }

    let insertedCount = 0;
    const errors = [];

    // Insert each duplicate lead
    for (const lead of duplicateLeads) {
      try {
        const { data, error } = await supabase
          .from('leads')
          .insert({
            email: lead.email,
            first_name: lead.first_name || '',
            last_name: lead.last_name || '',
            company: lead.company || '',
            lead_list_id: leadListId,
            organization_id: req.user.organizationId,
            created_by: req.user.userId
          })
          .select()
          .single();

        if (error) {
          console.error('Error inserting duplicate lead:', error);
          errors.push(`Failed to insert ${lead.email}: ${error.message}`);
        } else {
          insertedCount++;
        }
      } catch (err) {
        console.error('Error processing duplicate lead:', err);
        errors.push(`Failed to process ${lead.email}: ${err.message}`);
      }
    }

    res.json({
      message: `Successfully imported ${insertedCount} duplicate leads`,
      inserted: insertedCount,
      total: duplicateLeads.length,
      errors: errors
    });

  } catch (error) {
    console.error('Import duplicates error:', error);
    res.status(500).json({ error: 'Failed to import duplicate leads' });
  }
});

// Get a specific lead list with pagination and search
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id: leadListId } = req.params;
    
    // Extract query parameters
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const search = req.query.search?.trim() || '';
    
    console.log(`📋 GET /api/leads/lists/${leadListId} - Page: ${page}, Limit: ${limit}, Search: "${search}"`);

    // First, verify lead list ownership and get lead list metadata
    const { data: leadList, error: listError } = await supabase
      .from('lead_lists')
      .select('*')
      .eq('id', leadListId)
      .eq('organization_id', req.user.organizationId)
      .single();

    if (listError || !leadList) {
      return res.status(404).json({ error: 'Lead list not found' });
    }

    // Build leads query with search
    let leadsQuery = supabase
      .from('leads')
      .select('*')
      .eq('lead_list_id', leadListId)
      .eq('organization_id', req.user.organizationId);

    // Add search functionality
    if (search) {
      leadsQuery = leadsQuery.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,company.ilike.%${search}%`);
    }

    // Get total count for pagination
    const { count: totalCount, error: countError } = await leadsQuery
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Error getting total count:', countError);
      throw countError;
    }

    // Get paginated leads
    const offset = (page - 1) * limit;
    const { data: leads, error: leadsError } = await leadsQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (leadsError) {
      console.error('Error fetching leads:', leadsError);
      throw leadsError;
    }

    // Calculate pagination metadata
    const total = totalCount || 0;
    const totalPages = Math.ceil(total / limit);

    const response = {
      leadList,
      leads: leads || [],
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };

    console.log(`📋 Returning ${leads?.length || 0} leads (${total} total)`);
    res.json(response);
  } catch (error) {
    console.error('Error fetching lead list:', error);
    res.status(500).json({ error: 'Failed to fetch lead list' });
  }
});

// Get leads for a specific list
router.get('/:id/leads', authenticateToken, async (req, res) => {
  try {
    const { id: leadListId } = req.params;

    // Verify lead list ownership
    const { data: leadList, error: listError } = await supabase
      .from('lead_lists')
      .select('*')
      .eq('id', leadListId)
      .eq('organization_id', req.user.organizationId)
      .single();

    if (listError || !leadList) {
      return res.status(404).json({ error: 'Lead list not found' });
    }

    const { data: leads, error } = await supabase
      .from('leads')
      .select('*')
      .eq('lead_list_id', leadListId)
      .eq('organization_id', req.user.organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(leads || []);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// Check duplicates endpoint - used by frontend to check emails from parsed CSV
router.post('/check-duplicates', authenticateToken, async (req, res) => {
  try {
    const { emails } = req.body;

    if (!emails || !Array.isArray(emails)) {
      return res.status(400).json({ error: 'emails array is required' });
    }

    console.log('🔍 Checking duplicates for emails:', emails);
    console.log('📊 Email analysis:');
    emails.forEach((email, index) => {
      console.log(`  ${index + 1}. "${email}" (length: ${email.length}, has checkmark: ${email.includes('✅')})`);
    });

    const existingInDatabase = [];
    const duplicateDetails = [];

    // Check each email against the database
    for (const email of emails) {
      try {
        // Clean email by removing any emoji/special characters and trim
        const cleanEmail = email.replace(/[^\w@.-]/g, '').toLowerCase().trim()
        console.log(`🧹 Cleaned email: "${email}" -> "${cleanEmail}"`);
        
        const { data: existingLeads, error: checkError } = await supabase
          .from('leads')
          .select(`
            *,
            lead_lists:lead_list_id (
              id,
              name
            )
          `)
          .eq('email', cleanEmail)
          .eq('organization_id', req.user.organizationId);

        if (checkError) {
          console.error('Error checking email:', checkError);
          continue;
        }

        if (existingLeads && existingLeads.length > 0) {
          existingInDatabase.push(cleanEmail);
          duplicateDetails.push({
            email: email,
            existing: existingLeads,
            existingInLists: existingLeads.map(existingLead => ({
              listId: existingLead.lead_list_id,
              listName: existingLead.lead_lists?.name || 'Unknown List'
            }))
          });
        }
      } catch (err) {
        console.error('Error processing email:', err);
      }
    }

    console.log('📊 Found duplicates:', existingInDatabase);

    res.json({
      total: emails.length,
      existingInDatabase: existingInDatabase.length,
      duplicateDetails: duplicateDetails,
      emails: existingInDatabase
    });

  } catch (error) {
    console.error('Check duplicates error:', error);
    res.status(500).json({ error: 'Failed to check duplicates' });
  }
});

// Check duplicates from CSV file - used by frontend to analyze CSV before upload
router.post('/check-duplicates-csv', authenticateToken, upload.single('csvFile'), async (req, res) => {
  try {
    const csvFile = req.file;
    
    if (!csvFile) {
      return res.status(400).json({ error: 'CSV file is required' });
    }

    const results = [];
    const errors = [];
    let processedCount = 0;

    // Parse CSV
    const parsePromise = new Promise((resolve, reject) => {
      const stream = fs.createReadStream(csvFile.path)
        .pipe(csv());

      stream.on('data', (row) => {
        processedCount++;
        
        const email = row.email || row.Email || row.EMAIL;
        if (!email || !email.includes('@')) {
          errors.push(`Row ${processedCount}: Invalid or missing email`);
          return;
        }

        results.push({
          email: email.toLowerCase().trim(),
          first_name: row.first_name || row.First_Name || row.firstName || row['First Name'] || '',
          last_name: row.last_name || row.Last_Name || row.lastName || row['Last Name'] || '',
          company: row.company || row.Company || row.COMPANY || ''
        });
      });

      stream.on('end', resolve);
      stream.on('error', reject);
    });

    await parsePromise;

    // Check for duplicates across all lists in the organization
    let duplicateCount = 0;
    let duplicateLeads = [];

    for (const lead of results) {
      try {
        const { data: existingLead, error: checkError } = await supabase
          .from('leads')
          .select('*')
          .eq('email', lead.email)
          .eq('organization_id', req.user.organizationId)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          throw checkError;
        }

        if (existingLead) {
          duplicateCount++;
          duplicateLeads.push(lead);
        }
      } catch (err) {
        console.error('Error checking duplicate:', err);
      }
    }

    // Clean up uploaded file
    try {
      fs.unlinkSync(csvFile.path);
    } catch (cleanupError) {
      console.error('Error cleaning up file:', cleanupError);
    }

    res.json({
      total: results.length,
      duplicates: duplicateCount,
      new_leads: results.length - duplicateCount,
      duplicate_leads: duplicateLeads,
      errors: errors,
      preview: results.slice(0, 5) // Show first 5 leads as preview
    });

  } catch (error) {
    console.error('Check duplicates error:', error);
    
    // Clean up file if it exists
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }

    res.status(500).json({ error: 'Failed to check duplicates' });
  }
});

// Upload endpoint that creates a new list or uploads to existing one
router.post('/upload', authenticateToken, upload.single('csvFile'), async (req, res) => {
  try {
    console.log('🚀 Upload endpoint called');
    console.log('📁 Request body:', req.body);
    console.log('📎 File:', req.file ? req.file.filename : 'No file');
    console.log('👤 User:', req.user);
    
    const { listName, allowDuplicates, fieldMapping } = req.body;
    const csvFile = req.file;

    if (!csvFile) {
      return res.status(400).json({ error: 'CSV file is required' });
    }

    if (!listName) {
      return res.status(400).json({ error: 'List name is required' });
    }

    // Create new lead list
    console.log('📋 Creating new lead list:', { name: listName, organization_id: req.user.organizationId, created_by: req.user.userId });
    
    const { data: newList, error: listError } = await supabase
      .from('lead_lists')
      .insert({
        name: listName,
        organization_id: req.user.organizationId,
        created_by: req.user.userId
      })
      .select()
      .single();
      
    console.log('📋 Lead list creation result:', { newList, listError });

    if (listError) {
      console.error('Error creating lead list:', listError);
      return res.status(500).json({ error: 'Failed to create lead list' });
    }

    // Now process the CSV upload for this new list
    const results = [];
    const errors = [];
    let processedCount = 0;

    // Parse CSV
    const parsePromise = new Promise((resolve, reject) => {
      const stream = fs.createReadStream(csvFile.path)
        .pipe(csv());

      stream.on('data', (row) => {
        processedCount++;
        
        // Basic email validation
        const email = row.email || row.Email || row.EMAIL;
        if (!email || !email.includes('@')) {
          errors.push(`Row ${processedCount}: Invalid or missing email`);
          return;
        }

        results.push({
          email: email.toLowerCase().trim(),
          first_name: row.first_name || row.First_Name || row.firstName || row['First Name'] || '',
          last_name: row.last_name || row.Last_Name || row.lastName || row['Last Name'] || '',
          company: row.company || row.Company || row.COMPANY || ''
        });
      });

      stream.on('end', resolve);
      stream.on('error', reject);
    });

    await parsePromise;

    if (results.length === 0) {
      return res.status(400).json({ 
        error: 'No valid leads found in CSV file',
        details: errors
      });
    }

    let duplicateCount = 0;
    let insertedCount = 0;
    let duplicateLeads = [];

    if (allowDuplicates === 'true') {
      // Insert all leads without duplicate checking
      for (const lead of results) {
        try {
          const { data, error } = await supabase
            .from('leads')
            .insert({
              ...lead,
              lead_list_id: newList.id,
              organization_id: req.user.organizationId,
              created_by: req.user.userId
            })
            .select()
            .single();

          if (error) {
            if (error.code === '23505') {
              // Duplicate key constraint violation
              duplicateCount++;
              duplicateLeads.push(lead);
            } else {
              console.error('Error inserting lead:', error);
            }
          } else {
            insertedCount++;
          }
        } catch (err) {
          console.error('Error processing lead:', err);
        }
      }
    } else {
      // Check for duplicates before inserting
      for (const lead of results) {
        try {
          // Check if email already exists in ANY of the user's lists in this organization
          const { data: existingLeads, error: checkError } = await supabase
            .from('leads')
            .select(`
              *,
              lead_lists:lead_list_id (
                id,
                name
              )
            `)
            .eq('email', lead.email)
            .eq('organization_id', req.user.organizationId);

          if (checkError) {
            throw checkError;
          }

          if (existingLeads && existingLeads.length > 0) {
            // Lead already exists in one or more lists
            duplicateCount++;
            const duplicateInfo = {
              ...lead,
              existingInLists: existingLeads.map(existingLead => ({
                listId: existingLead.lead_list_id,
                listName: existingLead.lead_lists?.name || 'Unknown List'
              }))
            };
            duplicateLeads.push(duplicateInfo);
          } else {
            // Insert new lead
            const { data, error } = await supabase
              .from('leads')
              .insert({
                ...lead,
                lead_list_id: newList.id,
                organization_id: req.user.organizationId,
                created_by: req.user.userId
              })
              .select()
              .single();

            if (error) {
              if (error.code === '23505') {
                // Duplicate key constraint violation
                duplicateCount++;
                duplicateLeads.push(lead);
              } else {
                console.error('Error inserting lead:', error);
              }
            } else {
              insertedCount++;
            }
          }
        } catch (err) {
          console.error('Error processing lead:', err);
          // Individual errors logged to console, summary will be provided to user
        }
      }
    }

    // Clean up uploaded file
    try {
      fs.unlinkSync(csvFile.path);
    } catch (cleanupError) {
      console.error('Error cleaning up file:', cleanupError);
    }

    const failedCount = results.length - insertedCount - duplicateCount;
    const summaryErrors = [];
    
    const responseData = {
      message: 'CSV processing completed',
      listId: newList.id,
      listName: newList.name,
      total: results.length,
      inserted: insertedCount,
      duplicates: duplicateCount,
      duplicate_leads: duplicateLeads,
      failed: failedCount,
      errors: summaryErrors
    };
    
    console.log('📤 Final response:', responseData);
    res.json(responseData);

  } catch (error) {
    console.error('CSV upload error:', error);
    
    // Clean up file if it exists
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }

    res.status(500).json({ error: 'Failed to process CSV file' });
  }
});

// Delete a specific lead
router.delete('/:listId/leads/:leadId', authenticateToken, async (req, res) => {
  try {
    const { listId, leadId } = req.params;
    
    console.log(`🗑️ DELETE /api/leads/lists/${listId}/leads/${leadId}`);
    console.log('👤 User:', req.user);

    // First verify the lead list ownership
    const { data: leadList, error: listError } = await supabase
      .from('lead_lists')
      .select('id')
      .eq('id', listId)
      .eq('organization_id', req.user.organizationId)
      .single();

    if (listError || !leadList) {
      return res.status(404).json({ error: 'Lead list not found' });
    }

    // Verify the lead exists and belongs to this organization and list
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id, email')
      .eq('id', leadId)
      .eq('lead_list_id', listId)
      .eq('organization_id', req.user.organizationId)
      .single();

    if (leadError || !lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Delete the lead
    const { error: deleteError } = await supabase
      .from('leads')
      .delete()
      .eq('id', leadId)
      .eq('organization_id', req.user.organizationId);

    if (deleteError) {
      console.error('Error deleting lead:', deleteError);
      throw deleteError;
    }

    console.log(`🗑️ Successfully deleted lead: ${lead.email}`);
    res.json({ success: true, message: 'Lead deleted successfully' });

  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

// DELETE /api/leads/lists/:id - Delete a lead list
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id: listId } = req.params;

    console.log('🗑️ DELETE lead list request:', {
      listId,
      organizationId: req.user.organizationId
    });

    // First verify the lead list exists and belongs to the user
    const { data: leadList, error: listError } = await supabase
      .from('lead_lists')
      .select('id, name, organization_id')
      .eq('id', listId)
      .eq('organization_id', req.user.organizationId)
      .single();

    if (listError || !leadList) {
      console.log('❌ Lead list not found or access denied');
      return res.status(404).json({ error: 'Lead list not found' });
    }

    // Delete all leads in the list first
    const { error: deleteLeadsError } = await supabase
      .from('leads')
      .delete()
      .eq('lead_list_id', listId)
      .eq('organization_id', req.user.organizationId);

    if (deleteLeadsError) {
      console.error('Error deleting leads from list:', deleteLeadsError);
      return res.status(500).json({ error: 'Failed to delete leads from list' });
    }

    // Then delete the lead list itself
    const { error: deleteListError } = await supabase
      .from('lead_lists')
      .delete()
      .eq('id', listId)
      .eq('organization_id', req.user.organizationId);

    if (deleteListError) {
      console.error('Error deleting lead list:', deleteListError);
      return res.status(500).json({ error: 'Failed to delete lead list' });
    }

    console.log(`🗑️ Successfully deleted lead list: ${leadList.name}`);
    res.json({ 
      success: true, 
      message: 'Lead list deleted successfully',
      deletedList: {
        id: leadList.id,
        name: leadList.name
      }
    });

  } catch (error) {
    console.error('Error deleting lead list:', error);
    res.status(500).json({ error: 'Failed to delete lead list' });
  }
});

module.exports = router;