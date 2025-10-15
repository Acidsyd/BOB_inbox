const { readFileSync } = require('fs');

// Read the Supabase connection details from backend/.env
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

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function refreshConversationData() {
  console.log('🔄 Forcing refresh of conversation data...');
  
  try {
    // Force recalculation by updating a dummy field on all conversations
    const updateSQL = `
      UPDATE conversations SET
        last_activity_at = (
          SELECT MAX(COALESCE(cm.sent_at, cm.received_at)) 
          FROM conversation_messages cm 
          WHERE cm.conversation_id = conversations.id
          AND COALESCE(cm.sent_at, cm.received_at) IS NOT NULL
        ),
        updated_at = now()
      WHERE EXISTS (
        SELECT 1 FROM conversation_messages cm2 
        WHERE cm2.conversation_id = conversations.id
        AND COALESCE(cm2.sent_at, cm2.received_at) IS NOT NULL
      );
    `;
    
    console.log('📊 Executing conversation data refresh...');
    
    // Manual update since RPC doesn't work
    const { data: conversations, error: fetchError } = await supabase
      .from('conversations')
      .select('id, subject, last_activity_at');
    
    if (fetchError) {
      console.error('❌ Could not fetch conversations:', fetchError.message);
      return;
    }
    
    if (!conversations || conversations.length === 0) {
      console.log('ℹ️ No conversations found to update');
      return;
    }
    
    console.log(`📋 Found ${conversations.length} conversations to refresh`);
    
    let updated = 0;
    for (const conv of conversations) {
      // Get the latest message timestamp for this conversation
      const { data: messages, error: msgError } = await supabase
        .from('conversation_messages')
        .select('sent_at, received_at')
        .eq('conversation_id', conv.id)
        .not('sent_at', 'is', null)
        .or('sent_at.not.is.null,received_at.not.is.null')
        .order('sent_at', { ascending: false, nullsFirst: false })
        .order('received_at', { ascending: false, nullsFirst: false })
        .limit(1);
      
      if (!msgError && messages && messages.length > 0) {
        const latestTimestamp = messages[0].sent_at || messages[0].received_at;
        
        if (latestTimestamp && latestTimestamp !== conv.last_activity_at) {
          const { error: updateError } = await supabase
            .from('conversations')
            .update({ 
              last_activity_at: latestTimestamp,
              updated_at: new Date().toISOString()
            })
            .eq('id', conv.id);
          
          if (!updateError) {
            updated++;
            const oldTime = new Date(conv.last_activity_at).toLocaleTimeString();
            const newTime = new Date(latestTimestamp).toLocaleTimeString();
            console.log(`✅ ${conv.subject?.substring(0, 30)}... ${oldTime} → ${newTime}`);
          } else {
            console.log(`❌ Failed to update ${conv.subject?.substring(0, 30)}...`);
          }
        }
      }
    }
    
    console.log(`🎉 Updated ${updated} conversation timestamps`);
    
    // Show sample results
    const { data: sample, error: sampleError } = await supabase
      .from('conversations')
      .select('subject, last_activity_at')
      .order('last_activity_at', { ascending: false })
      .limit(5);
    
    if (!sampleError && sample) {
      console.log('\n📊 Sample conversation timestamps after refresh:');
      sample.forEach((conv, i) => {
        const timeStr = new Date(conv.last_activity_at).toLocaleTimeString();
        console.log(`  ${i+1}. ${conv.subject?.substring(0, 30)}... → ${timeStr}`);
      });
    }
    
    console.log('\n🔄 Please refresh your browser to see the updated timestamps');
    
  } catch (error) {
    console.error('❌ Error refreshing conversation data:', error.message);
  }
}

refreshConversationData();