#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: './backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeSQLFile(filePath) {
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    console.log('Executing SQL from:', filePath);
    
    // Split SQL into individual statements and execute them
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: statement });
          if (error) {
            console.error(`Error in statement ${i + 1}:`, error);
          } else {
            console.log(`✅ Statement ${i + 1} completed successfully`);
          }
        } catch (err) {
          console.error(`Error executing statement ${i + 1}:`, err.message);
        }
      }
    }
    
    console.log('✅ SQL execution completed');
    
  } catch (error) {
    console.error('❌ Failed to execute SQL:', error);
  }
}

// Execute the OAuth2 tables creation
executeSQLFile('./create-oauth2-tables.sql');