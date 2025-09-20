const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with optimized configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing required Supabase environment variables');
}

// Create a single Supabase client instance with connection pooling optimization
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false
  },
  global: {
    headers: {
      'X-Client-Info': 'mailsender-backend'
    }
  },
  db: {
    schema: 'public'
  }
});

console.log('🔗 Centralized Supabase client initialized:', supabaseUrl);

module.exports = supabase;