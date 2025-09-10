require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function fixTimezoneCorrectly() {
  console.log('🔧 CORRECTLY fixing timezone issues...');
  console.log('Current time in Europe/Rome:', new Date().toLocaleString('en-US', {timeZone: 'Europe/Rome'}));
  console.log('Current UTC time:', new Date().toISOString());
  console.log('');
  
  try {
    // Get all messages from the last 24 hours that have wrong timestamps
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const { data: messages, error } = await supabase
      .from('conversation_messages')
      .select('id, sent_at, received_at, content_preview, created_at')
      .gte('created_at', oneDayAgo.toISOString())
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('❌ Error fetching messages:', error);
      return;
    }
    
    console.log(`📧 Found ${messages.length} recent messages to check`);
    
    let fixed = 0;
    for (const message of messages) {
      const updates = {};
      
      // The problem: when you sent at 11:52 AM local, it should store as 09:52 UTC
      // But it's storing as various wrong times
      // We need to add 2 hours to get from the wrong stored time to correct UTC
      
      if (message.sent_at) {
        const wrongTime = new Date(message.sent_at);
        // Add 2 hours to correct the timezone error
        const correctUTC = new Date(wrongTime.getTime() + (2 * 60 * 60 * 1000));
        updates.sent_at = correctUTC.toISOString();
        
        console.log(`Fixing sent_at: ${message.sent_at} -> ${updates.sent_at}`);
        console.log(`  Content: ${message.content_preview?.substring(0, 30)}...`);
      }
      
      if (message.received_at) {
        const wrongTime = new Date(message.received_at);
        const correctUTC = new Date(wrongTime.getTime() + (2 * 60 * 60 * 1000));
        updates.received_at = correctUTC.toISOString();
        
        console.log(`Fixing received_at: ${message.received_at} -> ${updates.received_at}`);
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
    
    console.log(`\\n🎉 Successfully fixed ${fixed} message timestamps`);
    
    // Test what the corrected time will show
    console.log('\\n📱 After fix, your recent messages will show:');
    const testUTC = new Date().toISOString();
    const browserTime = new Date(testUTC).toLocaleString('en-US', {timeZone: 'Europe/Rome'});
    console.log(`UTC stored: ${testUTC}`);
    console.log(`Browser shows: ${browserTime} ← This should match your actual time!`);
    
  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

fixTimezoneCorrectly();