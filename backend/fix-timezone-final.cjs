require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function fixTimezoneFinal() {
  console.log('🔧 FINAL timezone fix - adding proper UTC indicators...');
  console.log('Current time in Europe/Rome:', new Date().toLocaleString('en-US', {timeZone: 'Europe/Rome'}));
  console.log('');
  
  try {
    // Get recent messages that need UTC indicators
    const today = new Date().toISOString().split('T')[0];
    
    const { data: messages, error } = await supabase
      .from('conversation_messages')
      .select('id, sent_at, received_at, content_preview')
      .gte('created_at', today + 'T00:00:00')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (error) {
      console.error('❌ Error fetching messages:', error);
      return;
    }
    
    console.log(`📧 Found ${messages.length} messages from today to fix`);
    
    let fixed = 0;
    for (const message of messages) {
      const updates = {};
      
      if (message.sent_at && !message.sent_at.endsWith('Z')) {
        console.log(`\nFixing: ${message.content_preview?.substring(0, 30)}...`);
        console.log(`Current: ${message.sent_at}`);
        
        // Add UTC indicator if missing
        const utcTimestamp = message.sent_at.endsWith('Z') ? message.sent_at : message.sent_at + 'Z';
        updates.sent_at = utcTimestamp;
        
        console.log(`Fixed to: ${updates.sent_at}`);
        console.log(`Will display: ${new Date(updates.sent_at).toLocaleString('en-US', {timeZone: 'Europe/Rome'})}`);
      }
      
      if (message.received_at && !message.received_at.endsWith('Z')) {
        const utcTimestamp = message.received_at.endsWith('Z') ? message.received_at : message.received_at + 'Z';
        updates.received_at = utcTimestamp;
      }
      
      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('conversation_messages')
          .update(updates)
          .eq('id', message.id);
          
        if (updateError) {
          console.error(`❌ Error updating message ${message.id}:`, updateError);
        } else {
          fixed++;
          console.log(`✅ Fixed message ${message.id}`);
        }
      }
    }
    
    console.log(`\n🎉 Successfully fixed ${fixed} message timestamps with UTC indicators`);
    console.log('\nNow refresh your browser - timestamps should show correct local time!');
    
  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

fixTimezoneFinal();