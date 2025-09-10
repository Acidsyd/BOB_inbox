require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function fixDatabaseUTCDirect() {
  console.log('🔧 DIRECT DATABASE UTC FIX');
  console.log('===========================');
  
  try {
    // Get all messages that need UTC indicators
    const { data: messages, error } = await supabase
      .from('conversation_messages')
      .select('id, sent_at, received_at, content_preview')
      .order('created_at', { ascending: false })
      .limit(20); // Process more messages
      
    if (error) {
      console.error('❌ Error fetching messages:', error);
      return;
    }
    
    console.log(`📧 Found ${messages.length} messages to check`);
    
    let fixed = 0;
    
    // Process each message individually
    for (const message of messages) {
      const updates = {};
      let needsUpdate = false;
      
      // Fix sent_at timestamp
      if (message.sent_at && !message.sent_at.endsWith('Z')) {
        const currentTime = message.sent_at;
        
        // Add Z suffix to make it proper UTC
        updates.sent_at = currentTime.endsWith('Z') ? currentTime : currentTime + 'Z';
        needsUpdate = true;
        
        console.log(`📤 ${message.content_preview?.substring(0, 25)}...`);
        console.log(`   From: ${currentTime}`);
        console.log(`   To:   ${updates.sent_at}`);
        console.log(`   Will display: ${new Date(updates.sent_at).toLocaleString('en-US', {timeZone: 'Europe/Rome'})}`);
      }
      
      // Fix received_at timestamp  
      if (message.received_at && !message.received_at.endsWith('Z')) {
        updates.received_at = message.received_at.endsWith('Z') ? message.received_at : message.received_at + 'Z';
        needsUpdate = true;
      }
      
      // Update this message if needed
      if (needsUpdate) {
        const { error: updateError } = await supabase
          .from('conversation_messages')
          .update(updates)
          .eq('id', message.id);
          
        if (updateError) {
          console.error(`❌ Failed to update ${message.id}:`, updateError);
        } else {
          fixed++;
          console.log(`✅ Fixed message ${message.id}`);
        }
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`\n🎉 Successfully fixed ${fixed} messages`);
    
    // Verify the fix worked
    console.log('\n📋 VERIFICATION - Latest 3 messages:');
    const { data: verification } = await supabase
      .from('conversation_messages')
      .select('content_preview, sent_at')
      .order('created_at', { ascending: false })
      .limit(3);
      
    verification?.forEach((msg, i) => {
      console.log(`${i+1}. ${msg.content_preview?.substring(0, 20)}...`);
      console.log(`   Database: ${msg.sent_at}`);
      console.log(`   Browser shows: ${new Date(msg.sent_at).toLocaleString('en-US', {timeZone: 'Europe/Rome'})}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

fixDatabaseUTCDirect();