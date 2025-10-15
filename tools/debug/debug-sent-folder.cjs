require('dotenv').config({ path: './backend/.env' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

console.log('🔧 Environment check:');
console.log('  - SUPABASE_URL:', supabaseUrl ? 'loaded' : 'missing');
console.log('  - SUPABASE_SERVICE_KEY:', supabaseServiceKey ? 'loaded' : 'missing');
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugSentFolder() {
  const organizationId = '550e8400-e29b-41d4-a716-446655440000';
  
  try {
    console.log('🔍 Testing sent folder query...');
    console.log('🔍 Organization ID:', organizationId);
    
    // Step 1: Test the first query that gets conversation IDs with sent messages
    console.log('\n🔍 STEP 1: Getting sent conversation IDs...');
    const { data: sentConvIds, error: sentError } = await supabase
      .from('conversation_messages')
      .select('conversation_id')
      .eq('organization_id', organizationId)
      .eq('direction', 'sent');

    console.log('🔍 First query result:');
    console.log('  - Data count:', sentConvIds?.length || 0);
    console.log('  - Error:', sentError);
    
    if (sentError) {
      console.error('❌ First query failed:', JSON.stringify(sentError, null, 2));
      return;
    }
    
    if (!sentConvIds || sentConvIds.length === 0) {
      console.log('ℹ️ No sent conversation IDs found');
      return;
    }
    
    // Step 2: Get unique IDs and test the main query
    const uniqueIds = [...new Set(sentConvIds.map(c => c.conversation_id))];
    console.log('\n🔍 STEP 2: Testing main conversations query...');
    console.log('  - Unique conversation IDs:', uniqueIds.length);
    console.log('  - Sample IDs:', uniqueIds.slice(0, 3));
    
    // This is the query that's likely failing
    let query = supabase
      .from('conversations')
      .select(`
        id,
        subject,
        participants,
        conversation_type,
        status,
        message_count,
        unread_count,
        last_activity_at,
        last_message_preview,
        created_at,
        conversation_label_assignments (
          conversation_labels (
            id,
            name,
            color,
            description
          )
        )
      `)
      .eq('organization_id', organizationId)
      .order('last_activity_at', { ascending: false })
      .in('id', uniqueIds)
      .eq('status', 'active')
      .range(0, 49);

    console.log('🔍 Executing main query...');
    const { data: conversations, error: mainError } = await query;
    
    console.log('🔍 Main query result:');
    console.log('  - Data count:', conversations?.length || 0);
    console.log('  - Error:', mainError);
    
    if (mainError) {
      console.error('❌ Main query failed:', JSON.stringify(mainError, null, 2));
      return;
    }
    
    console.log('✅ Sent folder query completed successfully!');
    console.log('  - Found', conversations?.length || 0, 'conversations');
    
  } catch (error) {
    console.error('❌ Script error:', error);
    console.error('❌ Error details:', JSON.stringify(error, null, 2));
  }
}

debugSentFolder().then(() => {
  console.log('🏁 Debug completed');
  process.exit(0);
}).catch(err => {
  console.error('💥 Script failed:', err);
  process.exit(1);
});