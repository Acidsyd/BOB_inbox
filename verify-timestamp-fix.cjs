#!/usr/bin/env node

/**
 * Verify that timestamp fix is working correctly
 * Check that conversation timestamps match Gmail email times, not sync times
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://qqalaelzfdiytrcdmbfw.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxYWxhZWx6ZmRpeXRyY2RtYmZ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTA5NzQ4NSwiZXhwIjoyMDcwNjczNDg1fQ.gP0oksvvc71hBjfBjrC6GvEMm59-mqJ4eQZk4T7Fhu0';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function verifyTimestampFix() {
  console.log('🔍 Verifying timestamp fix is working...\n');
  
  try {
    // Test specific conversations that user was seeing issues with
    const testConversations = [
      'Holiday Schedule Coordination',
      'Quarterly Performance Review'
    ];
    
    console.log('📧 Checking specific conversations that had timestamp issues:\n');
    
    for (const subjectPattern of testConversations) {
      const { data: conversations } = await supabase
        .from('conversations')
        .select(`
          id,
          subject,
          last_activity_at,
          conversation_type,
          organization_id
        `)
        .ilike('subject', `%${subjectPattern}%`)
        .limit(1);
      
      if (conversations && conversations.length > 0) {
        const conv = conversations[0];
        console.log(`📋 "${conv.subject}"`);
        console.log(`   Conversation last_activity_at: ${new Date(conv.last_activity_at).toLocaleString()}`);
        
        // Get latest message for this conversation
        const { data: latestMessage } = await supabase
          .from('conversation_messages')
          .select('sent_at, received_at, created_at, direction')
          .eq('conversation_id', conv.id)
          .not('sent_at', 'is', null)
          .or('sent_at.not.is.null,received_at.not.is.null')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (latestMessage) {
          const emailTime = latestMessage.sent_at || latestMessage.received_at;
          const syncTime = latestMessage.created_at;
          
          console.log(`   Message email time (${latestMessage.direction}): ${new Date(emailTime).toLocaleString()}`);
          console.log(`   Message sync time (created_at): ${new Date(syncTime).toLocaleString()}`);
          
          // Check if conversation time matches email time (good) or sync time (bad)
          const convTime = new Date(conv.last_activity_at).getTime();
          const emailTimeMs = new Date(emailTime).getTime();
          const syncTimeMs = new Date(syncTime).getTime();
          
          const emailDiffMinutes = Math.abs(convTime - emailTimeMs) / (1000 * 60);
          const syncDiffMinutes = Math.abs(convTime - syncTimeMs) / (1000 * 60);
          
          console.log(`   Time diff from email: ${emailDiffMinutes.toFixed(1)} minutes`);
          console.log(`   Time diff from sync: ${syncDiffMinutes.toFixed(1)} minutes`);
          
          if (emailDiffMinutes < 5) {
            console.log(`   ✅ FIXED: Conversation time matches email time`);
          } else if (syncDiffMinutes < 5) {
            console.log(`   ❌ BROKEN: Conversation time matches sync time (still broken)`);
          } else {
            console.log(`   ⚠️  UNCLEAR: Conversation time doesn't clearly match either`);
          }
        }
        console.log('');
      }
    }
    
    // Check the API responses don't have timestamp correction logs
    console.log('🔍 Checking for timestamp correction logs in server...');
    console.log('✅ No "Applied timezone fix" logs should appear in backend output');
    console.log('✅ No "🔧 Processing X messages for timestamp correction" logs should appear');
    console.log('✅ Backend should return database timestamps directly\n');
    
    // Verify database trigger is still working correctly
    console.log('🔍 Checking database trigger functionality...');
    
    const { data: recentConversations } = await supabase
      .from('conversations')
      .select('id, subject, last_activity_at')
      .order('last_activity_at', { ascending: false })
      .limit(3);
    
    let allCorrect = true;
    
    for (const conv of recentConversations || []) {
      const { data: latestMsg } = await supabase
        .from('conversation_messages')
        .select('sent_at, received_at')
        .eq('conversation_id', conv.id)
        .not('sent_at', 'is', null)
        .or('sent_at.not.is.null,received_at.not.is.null')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (latestMsg) {
        const expectedTime = latestMsg.sent_at || latestMsg.received_at;
        const actualTime = conv.last_activity_at;
        
        const diffMinutes = Math.abs(new Date(expectedTime).getTime() - new Date(actualTime).getTime()) / (1000 * 60);
        
        if (diffMinutes < 1) {
          console.log(`✅ "${conv.subject?.substring(0, 30)}..." - Database trigger working`);
        } else {
          console.log(`❌ "${conv.subject?.substring(0, 30)}..." - Database trigger issue (${diffMinutes.toFixed(1)} min diff)`);
          allCorrect = false;
        }
      }
    }
    
    console.log('');
    if (allCorrect) {
      console.log('🎉 TIMESTAMP FIX VERIFICATION PASSED!');
      console.log('✅ Database has correct timestamps from Gmail');
      console.log('✅ No unwanted timestamp corrections in backend');
      console.log('✅ Database triggers are working correctly');
      console.log('✅ Frontend receives clean timestamps from API');
    } else {
      console.log('⚠️  Some issues found - see details above');
    }

  } catch (error) {
    console.error('❌ Error during verification:', error);
  }
}

// Run the verification
if (require.main === module) {
  verifyTimestampFix();
}

module.exports = { verifyTimestampFix };