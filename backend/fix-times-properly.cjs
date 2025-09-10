require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function fixTimesProperly() {
  console.log('🔧 PROPERLY correcting recent message timestamps...');
  console.log('Current time in Europe/Rome:', new Date().toLocaleString('en-US', {timeZone: 'Europe/Rome'}));
  console.log('');
  
  try {
    // Get your most recent messages from today that have wrong timestamps  
    const today = new Date().toISOString().split('T')[0];
    
    const { data: messages, error } = await supabase
      .from('conversation_messages')
      .select('id, sent_at, received_at, content_preview, created_at')
      .gte('created_at', today + 'T00:00:00')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (error) {
      console.error('❌ Error fetching messages:', error);
      return;
    }
    
    console.log(`📧 Found ${messages.length} messages from today to check`);
    
    let fixed = 0;
    for (const message of messages) {
      const updates = {};
      
      if (message.sent_at) {
        console.log(`\\nMessage: ${message.content_preview?.substring(0, 30)}...`);
        console.log(`Current DB time: ${message.sent_at}`);
        
        // Parse the wrong time and figure out what the correct time should be
        const wrongDate = new Date(message.sent_at);
        const currentHour = wrongDate.getHours();
        
        // If the time shows early morning (3-6 AM) but you sent it around 11 AM
        // We need to add the correct offset
        let correctedDate;
        if (currentHour >= 1 && currentHour <= 6) {
          // Add 8-9 hours to get from early morning to late morning
          correctedDate = new Date(wrongDate.getTime() + (8 * 60 * 60 * 1000));
        } else if (currentHour >= 7 && currentHour <= 10) {
          // Add 2-4 hours to get to late morning
          correctedDate = new Date(wrongDate.getTime() + (2 * 60 * 60 * 1000));
        } else {
          // Time might already be correct, just add timezone
          correctedDate = wrongDate;
        }
        
        updates.sent_at = correctedDate.toISOString();
        console.log(`Corrected to: ${updates.sent_at}`);
        console.log(`Browser will show: ${correctedDate.toLocaleString('en-US', {timeZone: 'Europe/Rome'})}`);
      }
      
      if (message.received_at) {
        const wrongDate = new Date(message.received_at);
        const currentHour = wrongDate.getHours();
        
        let correctedDate;
        if (currentHour >= 1 && currentHour <= 6) {
          correctedDate = new Date(wrongDate.getTime() + (8 * 60 * 60 * 1000));
        } else if (currentHour >= 7 && currentHour <= 10) {
          correctedDate = new Date(wrongDate.getTime() + (2 * 60 * 60 * 1000));
        } else {
          correctedDate = wrongDate;
        }
        
        updates.received_at = correctedDate.toISOString();
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
    
    console.log(`\\n🎉 Successfully corrected ${fixed} message timestamps`);
    
  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

fixTimesProperly();