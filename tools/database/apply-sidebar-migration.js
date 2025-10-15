import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'your-service-key';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applySidebarMigration() {
  try {
    console.log('📊 Applying Gmail sidebar folders migration...');
    
    // Read the migration file
    const migrationSQL = fs.readFileSync('./database_migrations/20250130_gmail_sidebar_folders.sql', 'utf8');
    console.log('📄 Migration loaded, size:', migrationSQL.length, 'characters');
    
    // Create system_folders table
    console.log('1. Creating system_folders table...');
    const { error: tableError } = await supabase.from('system_folders').select('id').limit(1);
    if (tableError && tableError.code === 'PGRST116') {
      // Table doesn't exist, create it
      await supabase.rpc('exec_sql', {
        sql_query: `
          CREATE TABLE system_folders (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id UUID NOT NULL,
            name VARCHAR(50) NOT NULL,
            icon VARCHAR(50) NOT NULL,
            type VARCHAR(30) NOT NULL CHECK (type IN ('inbox', 'sent', 'untracked_replies')),
            sort_order INTEGER NOT NULL DEFAULT 0,
            is_system BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      });
    }
    
    // Add sync columns to conversation_messages
    console.log('2. Adding sync columns to conversation_messages...');
    await supabase.rpc('exec_sql', {
      sql_query: `
        ALTER TABLE conversation_messages 
        ADD COLUMN IF NOT EXISTS gmail_message_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS outlook_message_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS provider_type VARCHAR(20) DEFAULT 'smtp',
        ADD COLUMN IF NOT EXISTS sync_status VARCHAR(20) DEFAULT 'local',
        ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;
      `
    });
    
    // Add is_archived to conversations
    console.log('3. Adding is_archived to conversations...');
    await supabase.rpc('exec_sql', {
      sql_query: `
        ALTER TABLE conversations 
        ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
      `
    });
    
    // Create folder creation function
    console.log('4. Creating folder functions...');
    await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE OR REPLACE FUNCTION create_system_folders_for_org(org_id UUID)
        RETURNS VOID AS $$
        BEGIN
          INSERT INTO system_folders (organization_id, name, icon, type, sort_order) VALUES
            (org_id, 'Inbox', 'Inbox', 'inbox', 1),
            (org_id, 'Sent', 'Send', 'sent', 2),
            (org_id, 'Untracked Replies', 'MessageCircle', 'untracked_replies', 3)
          ON CONFLICT DO NOTHING;
        END;
        $$ LANGUAGE plpgsql;
      `
    });
    
    // Create folders for existing organizations
    console.log('5. Creating folders for existing organizations...');
    const { data: orgs } = await supabase.from('organizations').select('id');
    
    if (orgs && orgs.length > 0) {
      for (const org of orgs) {
        await supabase.rpc('create_system_folders_for_org', { org_id: org.id });
      }
      console.log(`   Created folders for ${orgs.length} organizations`);
    }
    
    // Create folder_counts view
    console.log('6. Creating folder_counts view...');
    await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE OR REPLACE VIEW folder_counts AS
        SELECT 
          sf.organization_id,
          sf.type,
          sf.name,
          sf.icon,
          sf.sort_order,
          CASE 
            WHEN sf.type = 'inbox' THEN (
              SELECT COUNT(*) 
              FROM conversations c 
              WHERE c.organization_id = sf.organization_id 
                AND c.conversation_type = 'campaign'
                AND c.status = 'active'
                AND c.is_archived = false
            )
            WHEN sf.type = 'sent' THEN (
              SELECT COUNT(DISTINCT c.id)
              FROM conversations c
              JOIN conversation_messages cm ON c.id = cm.conversation_id
              WHERE c.organization_id = sf.organization_id 
                AND cm.direction = 'sent'
                AND c.status = 'active'
            )
            WHEN sf.type = 'untracked_replies' THEN (
              SELECT COUNT(*)
              FROM conversations c
              WHERE c.organization_id = sf.organization_id
                AND c.conversation_type = 'organic'
                AND c.status = 'active'
                AND c.is_archived = false
            )
            ELSE 0
          END as count
        FROM system_folders sf
        ORDER BY sf.organization_id, sf.sort_order;
      `
    });
    
    console.log('✅ Migration completed successfully!');
    
    // Verify the results
    const { data: folders, error: folderError } = await supabase
      .from('system_folders')
      .select('name, type, organization_id')
      .order('sort_order');
      
    if (folders && !folderError) {
      console.log('📁 Verified folders created:', folders.length);
      console.log('   Types:', [...new Set(folders.map(f => f.type))].join(', '));
    }
    
    // Test the view
    const { data: counts, error: countError } = await supabase
      .from('folder_counts')
      .select('*')
      .limit(5);
      
    if (counts && !countError) {
      console.log('📊 Folder counts view working:', counts.length, 'sample results');
      counts.forEach(c => console.log(`   ${c.name}: ${c.count} items`));
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

applySidebarMigration();