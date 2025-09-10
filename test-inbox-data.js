import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkInboxData() {
  try {
    console.log('🔍 Checking inbox data for organization...');
    
    const organizationId = '550e8400-e29b-41d4-a716-446655440000'; // From logs
    
    // Check conversations
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select(`
        id, subject, participants, conversation_type, status,
        message_count, unread_count, last_activity_at, last_message_preview
      `)
      .eq('organization_id', organizationId)
      .order('last_activity_at', { ascending: false })
      .limit(5);
    
    if (convError) {
      console.error('❌ Error fetching conversations:', convError);
      return;
    }
    
    console.log(`📬 Found ${conversations.length} recent conversations:`);
    conversations.forEach((conv, i) => {
      console.log(`${i + 1}. "${conv.subject}" (${conv.conversation_type})`);
      console.log(`   Messages: ${conv.message_count}, Unread: ${conv.unread_count}`);
      console.log(`   Participants: ${JSON.stringify(conv.participants)}`);
      console.log(`   Preview: ${conv.last_message_preview?.substring(0, 50)}...`);
      console.log(`   Last activity: ${conv.last_activity_at}`);
      console.log('');
    });
    
    // Check messages for recent conversations
    if (conversations.length > 0) {
      const firstConvId = conversations[0].id;
      console.log(`🔍 Checking messages for conversation: ${firstConvId}`);
      
      const { data: messages, error: msgError } = await supabase
        .from('conversation_messages')
        .select(`
          id, message_id_header, direction, from_email, to_email,
          subject, content_preview, sent_at, received_at, is_read
        `)
        .eq('conversation_id', firstConvId)
        .order('sent_at', { ascending: true });
      
      if (!msgError && messages.length > 0) {
        console.log(`📨 Messages in conversation:`);
        messages.forEach((msg, i) => {
          console.log(`${i + 1}. ${msg.direction.toUpperCase()}: ${msg.subject}`);
          console.log(`   From: ${msg.from_email} To: ${msg.to_email}`);
          console.log(`   Preview: ${msg.content_preview?.substring(0, 50)}...`);
          console.log(`   Date: ${msg.sent_at || msg.received_at}`);
          console.log('');
        });
      }
    }
    
    // Check system folders
    console.log('📂 Checking system folders...');
    const { data: folders, error: folderError } = await supabase
      .from('system_folders')
      .select('*')
      .eq('organization_id', organizationId);
    
    if (!folderError) {
      console.log('📋 System folders:');
      folders.forEach(folder => {
        console.log(`- ${folder.name} (${folder.type}): ${folder.count || 0} items`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkInboxData();