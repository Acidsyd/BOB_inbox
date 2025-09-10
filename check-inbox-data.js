// Check inbox message data
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('./backend/.env', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  if (line.includes('=')) {
    const [key, value] = line.split('=');
    envVars[key.trim()] = value.trim();
  }
});

const supabase = createClient(envVars.SUPABASE_URL, envVars.SUPABASE_SERVICE_KEY);

async function checkInboxData() {
  try {
    console.log('📬 Checking conversation messages...\n');
    
    // Get a few messages to check their structure
    const { data: messages, error } = await supabase
      .from('conversation_messages')
      .select('id, from_email, from_name, to_email, to_name, subject, direction, conversation_id')
      .limit(5)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Error fetching messages:', error.message);
      return;
    }
    
    if (!messages || messages.length === 0) {
      console.log('📭 No messages found');
    } else {
      console.log(`✅ Found ${messages.length} messages:\n`);
      messages.forEach(msg => {
        console.log(`ID: ${msg.id}`);
        console.log(`From: ${msg.from_name || 'NO NAME'} <${msg.from_email}>`);
        console.log(`To: ${msg.to_name || 'NO NAME'} <${msg.to_email}>`);
        console.log(`Subject: ${msg.subject}`);
        console.log(`Direction: ${msg.direction}`);
        console.log(`Has from_name: ${msg.from_name ? 'YES' : 'NO'}`);
        console.log('---');
      });
    }
    
    // Check a specific conversation
    const conversationId = 'ee0b2208-a543-49a9-bb9c-fc20ac476634';
    console.log(`\n📬 Checking specific conversation: ${conversationId}\n`);
    
    const { data: convMessages, error: convError } = await supabase
      .from('conversation_messages')
      .select('*')
      .eq('conversation_id', conversationId);
    
    if (convError) {
      console.error('❌ Error:', convError.message);
    } else if (convMessages && convMessages.length > 0) {
      console.log(`Found ${convMessages.length} messages in conversation`);
      convMessages.forEach(msg => {
        console.log(`\nMessage ${msg.id}:`);
        console.log(`- from_email: ${msg.from_email}`);
        console.log(`- from_name: ${msg.from_name || 'NULL'}`);
        console.log(`- to_email: ${msg.to_email}`);
        console.log(`- to_name: ${msg.to_name || 'NULL'}`);
        console.log(`- direction: ${msg.direction}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkInboxData();