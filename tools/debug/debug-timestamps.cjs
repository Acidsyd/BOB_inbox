#!/usr/bin/env node

/**
 * Debug script to check actual timestamps in database vs what should be there
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://qqalaelzfdiytrcdmbfw.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxYWxhZWx6ZmRpeXRyY2RtYmZ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTA5NzQ4NSwiZXhwIjoyMDcwNjczNDg1fQ.gP0oksvvc71hBjfBjrC6GvEMm59-mqJ4eQZk4T7Fhu0';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function debugTimestamps() {
  console.log('🔍 Analyzing conversation timestamps in database...\n');
  
  try {
    // Get recent conversation messages with timestamps
    const { data: messages, error } = await supabase
      .from('conversation_messages')
      .select(`
        id,
        subject,
        from_email,
        direction,
        sent_at,
        received_at,
        created_at,
        message_id_header,
        conversations!inner(id, subject, last_activity_at, organization_id)
      `)
      .not('sent_at', 'is', null)
      .or('sent_at.not.is.null,received_at.not.is.null')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    console.log(`📧 Found ${messages.length} messages to analyze:\n`);

    messages.forEach((msg, index) => {
      const emailTimestamp = msg.sent_at || msg.received_at;
      const syncTimestamp = msg.created_at;
      const conversationTimestamp = msg.conversations.last_activity_at;
      
      const emailTime = new Date(emailTimestamp);
      const syncTime = new Date(syncTimestamp);
      const convTime = new Date(conversationTimestamp);
      
      console.log(`${index + 1}. "${msg.subject?.substring(0, 40)}..."`);
      console.log(`   Direction: ${msg.direction}`);
      console.log(`   From: ${msg.from_email}`);
      console.log(`   Email timestamp (${msg.direction === 'sent' ? 'sent_at' : 'received_at'}):     ${emailTime.toLocaleString()} (${emailTimestamp})`);
      console.log(`   Sync timestamp (created_at):      ${syncTime.toLocaleString()} (${syncTimestamp})`);
      console.log(`   Conversation (last_activity_at):  ${convTime.toLocaleString()} (${conversationTimestamp})`);
      
      // Calculate differences
      const syncDiffMinutes = Math.abs(emailTime.getTime() - syncTime.getTime()) / (1000 * 60);
      const convDiffMinutes = Math.abs(emailTime.getTime() - convTime.getTime()) / (1000 * 60);
      
      console.log(`   Time diff email→sync: ${syncDiffMinutes.toFixed(1)} minutes`);
      console.log(`   Time diff email→conv: ${convDiffMinutes.toFixed(1)} minutes`);
      
      // Flag potential issues
      if (syncDiffMinutes < 5) {
        console.log(`   🚨 ISSUE: Email timestamp appears to be sync time (< 5 min diff)`);
      }
      if (convDiffMinutes > 30) {
        console.log(`   ⚠️  WARNING: Conversation timestamp differs significantly`);
      } else {
        console.log(`   ✅ Conversation timestamp looks correct`);
      }
      
      console.log('');
    });

    // Also check what the FolderService would return
    console.log('🗂️ Testing what FolderService returns for conversations...\n');
    
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id, subject, last_activity_at, organization_id')
      .order('last_activity_at', { ascending: false })
      .limit(5);
    
    if (conversations) {
      for (const conv of conversations) {
        console.log(`📋 Conversation: "${conv.subject?.substring(0, 40)}..."`);
        console.log(`   DB last_activity_at: ${new Date(conv.last_activity_at).toLocaleString()}`);
        
        // Get latest message timestamp for comparison
        const { data: latestMsg } = await supabase
          .from('conversation_messages')
          .select('sent_at, received_at, created_at')
          .eq('conversation_id', conv.id)
          .not('sent_at', 'is', null)
          .or('sent_at.not.is.null,received_at.not.is.null')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (latestMsg) {
          const latestTimestamp = latestMsg.sent_at || latestMsg.received_at;
          console.log(`   Latest msg timestamp:  ${new Date(latestTimestamp).toLocaleString()}`);
          
          const diffMinutes = Math.abs(new Date(conv.last_activity_at).getTime() - new Date(latestTimestamp).getTime()) / (1000 * 60);
          console.log(`   Difference: ${diffMinutes.toFixed(1)} minutes`);
          
          if (diffMinutes > 5) {
            console.log(`   🚨 MISMATCH: Conversation timestamp not matching latest message`);
          } else {
            console.log(`   ✅ Timestamps match correctly`);
          }
        }
        console.log('');
      }
    }

  } catch (error) {
    console.error('❌ Error debugging timestamps:', error);
  }
}

// Run the debug
if (require.main === module) {
  debugTimestamps();
}

module.exports = { debugTimestamps };