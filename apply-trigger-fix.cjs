const { readFileSync } = require('fs');

// Read the Supabase connection details from backend/.env
console.log('🔧 Reading Supabase configuration...');

let supabaseUrl, supabaseServiceKey;
try {
  const envContent = readFileSync('./backend/.env', 'utf8');
  const envLines = envContent.split('\n');
  for (const line of envLines) {
    const [key, value] = line.split('=');
    if (key === 'SUPABASE_URL') supabaseUrl = value;
    if (key === 'SUPABASE_SERVICE_KEY') supabaseServiceKey = value;
  }
} catch (error) {
  console.error('❌ Could not read backend/.env file:', error.message);
  process.exit(1);
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables in backend/.env');
  console.error('Required: SUPABASE_URL and SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyTriggerFix() {
  console.log('🔧 Applying database trigger fix for conversation timestamps...');
  
  const triggerSQL = `
    CREATE OR REPLACE FUNCTION update_conversation_metadata()
    RETURNS TRIGGER AS $$
    BEGIN
        -- Update conversation stats and preview
        UPDATE conversations SET
            message_count = (
                SELECT COUNT(*) FROM conversation_messages 
                WHERE conversation_id = COALESCE(NEW.conversation_id, OLD.conversation_id)
            ),
            unread_count = (
                SELECT COUNT(*) FROM conversation_messages 
                WHERE conversation_id = COALESCE(NEW.conversation_id, OLD.conversation_id)
                AND direction = 'received' 
                AND is_read = false
            ),
            -- FIXED: Use only the actual email timestamp, not GREATEST with sync time
            last_activity_at = (
                SELECT MAX(COALESCE(sent_at, received_at)) FROM conversation_messages 
                WHERE conversation_id = COALESCE(NEW.conversation_id, OLD.conversation_id)
                AND COALESCE(sent_at, received_at) IS NOT NULL
            ),
            last_message_preview = (
                SELECT content_preview FROM conversation_messages 
                WHERE conversation_id = COALESCE(NEW.conversation_id, OLD.conversation_id)
                ORDER BY COALESCE(sent_at, received_at) DESC NULLS LAST
                LIMIT 1
            ),
            updated_at = now()
        WHERE id = COALESCE(NEW.conversation_id, OLD.conversation_id);
        
        RETURN COALESCE(NEW, OLD);
    END;
    $$ LANGUAGE plpgsql;
  `;
  
  try {
    console.log('📊 Executing trigger update...');
    
    // Try multiple methods to execute the SQL
    let success = false;
    
    // Method 1: Try rpc with 'sql' function
    try {
      const { error: rpcError } = await supabase.rpc('sql', { query: triggerSQL });
      if (!rpcError) {
        success = true;
        console.log('✅ Method 1: RPC sql() succeeded');
      }
    } catch (e) {
      console.log('❌ Method 1: RPC sql() failed');
    }
    
    // Method 2: Try rpc with 'exec_sql' function
    if (!success) {
      try {
        const { error: execError } = await supabase.rpc('exec_sql', { sql_query: triggerSQL });
        if (!execError) {
          success = true;
          console.log('✅ Method 2: RPC exec_sql() succeeded');
        }
      } catch (e) {
        console.log('❌ Method 2: RPC exec_sql() failed');
      }
    }
    
    // Method 3: Try direct query
    if (!success) {
      try {
        const { error: queryError } = await supabase.query(triggerSQL);
        if (!queryError) {
          success = true;
          console.log('✅ Method 3: Direct query() succeeded');
        }
      } catch (e) {
        console.log('❌ Method 3: Direct query() failed');
      }
    }
    
    if (!success) {
      console.log('❌ All methods failed. Please apply this SQL manually in Supabase dashboard:');
      console.log('=====================================');
      console.log(triggerSQL);
      console.log('=====================================');
      return;
    }
    
    console.log('🎉 Database trigger fix applied successfully!');
    console.log('📌 Future sync operations will now preserve email timestamps');
    
  } catch (error) {
    console.error('❌ Error applying trigger fix:', error.message);
    console.log('\n📋 Please apply this SQL manually in Supabase dashboard:');
    console.log('=====================================');
    console.log(triggerSQL);
    console.log('=====================================');
  }
}

applyTriggerFix();