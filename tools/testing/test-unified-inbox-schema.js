// Simple test to check if unified inbox tables exist
import { createClient } from '@supabase/supabase-js';

// Get credentials from env file
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

async function checkTables() {
  try {
    console.log('🔍 Checking if unified inbox tables exist...');
    
    // Try to query conversations table
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .limit(1);
    
    if (convError) {
      console.log('❌ conversations table does not exist:', convError.message);
      return false;
    }
    
    // Try to query conversation_messages table
    const { data: messages, error: msgError } = await supabase
      .from('conversation_messages')
      .select('id')
      .limit(1);
      
    if (msgError) {
      console.log('❌ conversation_messages table does not exist:', msgError.message);
      return false;
    }
    
    console.log('✅ Both unified inbox tables exist');
    return true;
    
  } catch (error) {
    console.error('❌ Error checking tables:', error.message);
    return false;
  }
}

checkTables();
