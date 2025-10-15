const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ohrxrbxugdhozrwbccnn.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ocnhyYnh1Z2Rob3pyd2JjY25uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTI5NTI3MSwiZXhwIjoyMDUwODcxMjcxfQ.AjBDN6SqEJNTKu-v8Fj5wqP-SJ1-TjNg8Q-BqKFCVvA'
);

async function fixConversationTimestamps() {
  console.log('🔧 Fixing conversation timestamps directly...');
  
  try {
    // Run a direct SQL update to fix all conversation timestamps
    const updateSQL = `
      UPDATE conversations SET
        last_activity_at = (
          SELECT MAX(COALESCE(cm.sent_at, cm.received_at)) 
          FROM conversation_messages cm 
          WHERE cm.conversation_id = conversations.id
          AND COALESCE(cm.sent_at, cm.received_at) IS NOT NULL
        )
      WHERE EXISTS (
        SELECT 1 FROM conversation_messages cm2 
        WHERE cm2.conversation_id = conversations.id
        AND COALESCE(cm2.sent_at, cm2.received_at) IS NOT NULL
      );
    `;
    
    // Use the postgres function to execute raw SQL
    const { data, error } = await supabase.rpc('sql', { query: updateSQL });
    
    if (error) {
      console.log('❌ Direct SQL failed, trying individual updates...');
      
      // Fallback: Update each conversation individually
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id, subject, last_activity_at');
      
      if (!conversations) return;
      
      let updated = 0;
      for (const conv of conversations) {
        // Get the latest message timestamp for this conversation
        const { data: messages } = await supabase
          .from('conversation_messages')
          .select('sent_at, received_at')
          .eq('conversation_id', conv.id)
          .not('sent_at', 'is', null)
          .or('sent_at.not.is.null,received_at.not.is.null')
          .order('sent_at', { ascending: false, nullsFirst: false })
          .order('received_at', { ascending: false, nullsFirst: false })
          .limit(1);
        
        if (messages && messages.length > 0) {
          const latestTimestamp = messages[0].sent_at || messages[0].received_at;
          
          if (latestTimestamp) {
            const { error } = await supabase
              .from('conversations')
              .update({ last_activity_at: latestTimestamp })
              .eq('id', conv.id);
            
            if (!error) {
              updated++;
              const oldTime = new Date(conv.last_activity_at).toLocaleTimeString();
              const newTime = new Date(latestTimestamp).toLocaleTimeString();
              console.log(`✅ ${conv.subject?.substring(0, 30)}... ${oldTime} -> ${newTime}`);
            }
          }
        }
      }
      
      console.log(`🎉 Updated ${updated} conversation timestamps`);
    } else {
      console.log('✅ SQL update completed successfully');
    }
    
    // Show sample results
    const { data: sample } = await supabase
      .from('conversations')
      .select('id, subject, last_activity_at')
      .limit(5);
    
    if (sample) {
      console.log('\n📊 Sample conversation timestamps after fix:');
      sample.forEach(conv => {
        const timeStr = new Date(conv.last_activity_at).toLocaleString();
        console.log(`  ${conv.subject?.substring(0, 30)}... -> ${timeStr}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixConversationTimestamps();