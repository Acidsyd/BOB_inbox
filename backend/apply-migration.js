const { readFile } = require('fs/promises')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Required: SUPABASE_URL and SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigration() {
  try {
    console.log('📊 Applying conversation labels migration...')
    
    const migrationSQL = await readFile('../database_migrations/create_conversation_labels.sql', 'utf8')
    
    // Execute the full migration as one query
    const { data, error } = await supabase.rpc('exec_sql', { 
      query: migrationSQL 
    })
    
    if (error) {
      console.error('Migration RPC failed, trying direct table creation...')
      
      // Try creating tables directly
      const createLabelsTable = `
        CREATE TABLE IF NOT EXISTS conversation_labels (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID NOT NULL,
          name VARCHAR(50) NOT NULL,
          color VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(name, organization_id)
        );
      `
      
      const createAssignmentsTable = `
        CREATE TABLE IF NOT EXISTS conversation_label_assignments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          conversation_id UUID NOT NULL,
          label_id UUID NOT NULL,
          organization_id UUID NOT NULL,
          assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          assigned_by UUID,
          UNIQUE(conversation_id, label_id)
        );
      `
      
      // Try table creation using the database interface
      console.log('📊 Creating conversation_labels table...')
      const { error: table1Error } = await supabase.from('conversation_labels').select().limit(0)
      
      console.log('📊 Creating conversation_label_assignments table...')
      const { error: table2Error } = await supabase.from('conversation_label_assignments').select().limit(0)
      
      if (table1Error || table2Error) {
        console.error('❌ Direct table creation failed')
        console.error('Table 1 error:', table1Error?.message)
        console.error('Table 2 error:', table2Error?.message)
        console.log('\n📝 Manual migration required:')
        console.log('Please run the following SQL in your Supabase dashboard:\n')
        console.log(migrationSQL)
        process.exit(1)
      }
    }
    
    // Test if tables were created successfully
    console.log('📊 Verifying migration...')
    
    const { data: labelsTest, error: labelsError } = await supabase
      .from('conversation_labels')
      .select('count')
      .limit(1)
    
    const { data: assignmentsTest, error: assignmentsError } = await supabase
      .from('conversation_label_assignments')
      .select('count')
      .limit(1)
    
    if (!labelsError && !assignmentsError) {
      console.log('✅ Migration applied successfully!')
      console.log('✅ Tables created: conversation_labels, conversation_label_assignments')
    } else {
      console.log('⚠️ Tables may need to be created manually in Supabase dashboard')
      console.log('\n📝 Please run this SQL:')
      console.log(migrationSQL)
    }
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.log('\n📝 Please run the following SQL manually in your Supabase dashboard:')
    
    try {
      const migrationSQL = await readFile('../database_migrations/create_conversation_labels.sql', 'utf8')
      console.log(migrationSQL)
    } catch (readError) {
      console.error('Could not read migration file:', readError.message)
    }
    
    process.exit(1)
  }
}

applyMigration()