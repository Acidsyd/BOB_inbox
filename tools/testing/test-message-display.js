// Test what message data looks like
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

// Helper function to parse email
function parseEmailField(emailField) {
  if (!emailField) return { name: null, email: null };
  
  // Check if it's in "Name <email>" format
  const match = emailField.match(/^([^<]+)<([^>]+)>$/);
  if (match) {
    return {
      name: match[1].trim(),
      email: match[2].trim()
    };
  }
  
  // Otherwise just return the email
  return {
    name: null,
    email: emailField.trim()
  };
}

async function testMessageDisplay() {
  try {
    const conversationId = 'ee0b2208-a543-49a9-bb9c-fc20ac476634';
    
    const { data: messages, error } = await supabase
      .from('conversation_messages')
      .select('*')
      .eq('conversation_id', conversationId);
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    console.log('\n📬 Messages in conversation:\n');
    messages.forEach(msg => {
      const fromParsed = parseEmailField(msg.from_email);
      const toParsed = parseEmailField(msg.to_email);
      
      console.log(`Message ID: ${msg.id}`);
      console.log(`Direction: ${msg.direction}`);
      console.log(`Raw from_email: "${msg.from_email}"`);
      console.log(`Raw from_name: "${msg.from_name}"`);
      console.log(`Parsed from name: "${fromParsed.name}"`);
      console.log(`Parsed from email: "${fromParsed.email}"`);
      console.log(`Display name should be: "${fromParsed.name || fromParsed.email || 'Unknown sender'}"`);
      console.log('---\n');
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testMessageDisplay();