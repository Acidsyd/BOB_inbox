#!/usr/bin/env node

/**
 * Fix conversation timestamps that were incorrectly stored as sync times
 * instead of original Gmail email times
 */

// Simple fix script using environment variables from .env
const SUPABASE_URL = 'https://qqalaelzfdiytrcdmbfw.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxYWxhZWx6ZmRpeXRyY2RtYmZ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTA5NzQ4NSwiZXhwIjoyMDcwNjczNDg1fQ.gP0oksvvc71hBjfBjrC6GvEMm59-mqJ4eQZk4T7Fhu0';

// Simple HTTP client for Supabase
async function supabaseQuery(table, options = {}) {
  const { select, eq, limit, order, single } = options;
  
  let url = `${SUPABASE_URL}/rest/v1/${table}`;
  const params = new URLSearchParams();
  
  if (select) params.append('select', select);
  if (eq) {
    for (const [key, value] of Object.entries(eq)) {
      params.append(key, `eq.${value}`);
    }
  }
  if (limit) params.append('limit', limit);
  if (order) params.append('order', order);
  
  if (params.toString()) url += `?${params}`;
  
  const response = await fetch(url, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    return { data: null, error: data };
  }
  
  return { 
    data: single ? (data.length > 0 ? data[0] : null) : data, 
    error: null 
  };
}

async function supabaseUpdate(table, updates, eq) {
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  const params = new URLSearchParams();
  
  for (const [key, value] of Object.entries(eq)) {
    params.append(key, `eq.${value}`);
  }
  
  const response = await fetch(`${url}?${params}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  });
  
  const data = await response.json();
  
  return {
    data: response.ok ? data : null,
    error: response.ok ? null : data
  };
}

const supabase = {
  from: (table) => ({
    select: (select) => ({
      eq: (key, value) => ({
        order: (field, opts) => ({
          limit: (num) => supabaseQuery(table, { 
            select, 
            eq: { [key]: value }, 
            order: `${field}.${opts.ascending ? 'asc' : 'desc'}`, 
            limit: num 
          })
        })
      }),
      order: (field, opts) => ({
        limit: (num) => supabaseQuery(table, { 
          select, 
          order: `${field}.${opts.ascending ? 'asc' : 'desc'}`, 
          limit: num 
        })
      }),
      limit: (num) => supabaseQuery(table, { select, limit: num })
    }),
    update: (updates) => ({
      eq: (key, value) => supabaseUpdate(table, updates, { [key]: value })
    })
  })
};

async function fixConversationTimestamps() {
  console.log('🔧 Starting timestamp fix for conversations...');
  
  try {
    // Get all conversations that might have incorrect timestamps
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id, subject, last_activity_at, organization_id')
      .order('last_activity_at', { ascending: false })
      .limit(100);

    if (convError) throw convError;

    console.log(`📬 Found ${conversations.length} conversations to check`);

    let fixedCount = 0;
    let checkedCount = 0;

    for (const conversation of conversations) {
      checkedCount++;
      
      // Get the actual latest message timestamp from messages
      const { data: latestMessage } = await supabase
        .from('conversation_messages')
        .select('sent_at, received_at, created_at, subject')
        .eq('conversation_id', conversation.id)
        .not('sent_at', 'is', null)
        .or('sent_at.not.is.null,received_at.not.is.null')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (latestMessage) {
        const messageTimestamp = latestMessage.sent_at || latestMessage.received_at;
        const messageTime = new Date(messageTimestamp);
        const conversationTime = new Date(conversation.last_activity_at);
        const createdTime = new Date(latestMessage.created_at);
        
        // Calculate time differences
        const timeDiffHours = Math.abs(conversationTime.getTime() - messageTime.getTime()) / (1000 * 60 * 60);
        const syncDiffHours = Math.abs(createdTime.getTime() - conversationTime.getTime()) / (1000 * 60 * 60);
        
        console.log(`\n📧 Checking "${conversation.subject?.substring(0, 30)}..."`);
        console.log(`   Conversation time: ${conversationTime.toLocaleString()}`);
        console.log(`   Message time:      ${messageTime.toLocaleString()}`);
        console.log(`   Created time:      ${createdTime.toLocaleString()}`);
        console.log(`   Time diff:         ${timeDiffHours.toFixed(1)} hours`);
        console.log(`   Sync diff:         ${syncDiffHours.toFixed(1)} hours`);
        
        // If conversation timestamp is very close to created timestamp (sync time)
        // but different from message timestamp, it's likely incorrect
        if (syncDiffHours < 0.1 && timeDiffHours > 0.5) {
          console.log(`   🔄 FIXING: Using message timestamp instead of sync timestamp`);
          
          // Update conversation timestamp to use message timestamp
          const { error: updateError } = await supabase
            .from('conversations')
            .update({ 
              last_activity_at: messageTimestamp,
              updated_at: new Date().toISOString()
            })
            .eq('id', conversation.id);

          if (updateError) {
            console.error(`   ❌ Error updating conversation ${conversation.id}:`, updateError);
          } else {
            console.log(`   ✅ Fixed conversation timestamp`);
            fixedCount++;
          }
        } else {
          console.log(`   ✅ Timestamp looks correct`);
        }
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Checked: ${checkedCount} conversations`);
    console.log(`   Fixed: ${fixedCount} conversations`);
    console.log(`\n🎉 Timestamp fix completed!`);

  } catch (error) {
    console.error('❌ Error fixing timestamps:', error);
    process.exit(1);
  }
}

// Run the fix
if (require.main === module) {
  fixConversationTimestamps();
}

module.exports = { fixConversationTimestamps };