const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

async function checkBounceStatus() {
  console.log('🔍 Checking current bounce message status...');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const organizationId = '550e8400-e29b-41d4-a716-446655440000';
  
  try {
    // 1. Check bounce records in email_bounces table
    console.log('📧 Checking email_bounces table...');
    const { data: bounces, error: bounceError } = await supabase
      .from('email_bounces')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    
    if (bounceError) {
      console.error('❌ Error fetching bounces:', bounceError);
    } else {
      console.log(`✅ Found ${bounces.length} bounce records:`);
      bounces.slice(0, 3).forEach((bounce, i) => {
        console.log(`  ${i+1}. ${bounce.recipient_email} - ${bounce.bounce_type} (${bounce.created_at})`);
      });
    }
    
    // 2. Check conversation_messages for bounce messages
    console.log('\n💬 Checking conversation_messages for bounce patterns...');
    const { data: messages, error: msgError } = await supabase
      .from('conversation_messages')
      .select(`
        id, conversation_id, from_email, to_email, subject, direction,
        received_at, content_preview,
        conversations!inner(organization_id, conversation_type)
      `)
      .eq('conversations.organization_id', organizationId)
      .eq('direction', 'received');
    
    if (!msgError && messages) {
      // Filter messages that look like bounces
      const bounceMessages = messages.filter(msg => {
        const fromBounce = msg.from_email?.toLowerCase().includes('daemon') ||
                          msg.from_email?.toLowerCase().includes('delivery') ||
                          msg.from_email?.toLowerCase().includes('mailer-daemon');
        const subjectBounce = msg.subject?.toLowerCase().includes('bounce') ||
                             msg.subject?.toLowerCase().includes('delivery') ||
                             msg.subject?.toLowerCase().includes('undelivered') ||
                             msg.subject?.toLowerCase().includes('failure');
        return fromBounce || subjectBounce;
      });
      
      console.log(`📨 Found ${bounceMessages.length} messages matching bounce patterns:`);
      bounceMessages.slice(0, 3).forEach((msg, i) => {
        console.log(`  ${i+1}. From: ${msg.from_email}`);
        console.log(`     Subject: ${msg.subject}`);
        console.log(`     Received: ${msg.received_at}`);
        console.log('');
      });
      
      if (bounceMessages.length > 0) {
        console.log('🎯 DIAGNOSIS:');
        console.log('  ✅ Bounce messages exist in conversation_messages');
        console.log('  ❌ But bounces folder shows 0 conversations');
        console.log('  💡 Issue: Folder filtering logic not matching bounce messages');
        console.log('');
        console.log('🔍 NEXT STEPS:');
        console.log('  1. Check folder filtering query in FolderService');
        console.log('  2. Verify bounce detection criteria');
        console.log('  3. Test manual bounce message creation');
      } else {
        console.log('❌ No bounce messages found in conversation_messages');
        console.log('💡 Bounce messages may not be in unified inbox system');
      }
    }
    
    // 3. Check folders configuration
    console.log('\n📁 Checking inbox_folders configuration...');
    const { data: folders, error: folderError } = await supabase
      .from('inbox_folders')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('type', 'bounces');
    
    if (!folderError && folders?.length > 0) {
      const bounceFolder = folders[0];
      console.log('✅ Bounces folder configuration:');
      console.log(`  Name: ${bounceFolder.name}`);
      console.log(`  Type: ${bounceFolder.type}`);
      console.log(`  Filter: ${bounceFolder.filter_query || 'No filter query'}`);
    } else {
      console.log('❌ No bounces folder found in inbox_folders');
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

checkBounceStatus().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Failed:', error);
  process.exit(1);
});