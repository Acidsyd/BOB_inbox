require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const campaignId = '3afa6a78-2101-404c-a911-13e36eeb5298';

async function debugBounceConversations() {
  console.log('🔍 Debugging bounce conversations...\n');

  // 1. Get bounce records
  const { data: bounces } = await supabase
    .from('email_bounces')
    .select('*')
    .eq('campaign_id', campaignId);

  console.log(`📊 Found ${bounces?.length || 0} bounce records`);

  if (bounces && bounces.length > 0) {
    console.log('\n📧 Bounce details:');
    bounces.forEach((b, i) => {
      console.log(`  ${i + 1}. Campaign: ${b.campaign_id}, Lead: ${b.lead_id}, Email: ${b.recipient_email}`);
    });

    // 2. Get unique campaign and lead IDs
    const campaignIds = [...new Set(bounces.map(b => b.campaign_id).filter(Boolean))];
    const leadIds = [...new Set(bounces.map(b => b.lead_id).filter(Boolean))];

    console.log(`\n🔍 Unique Campaign IDs: ${campaignIds.length}`, campaignIds);
    console.log(`🔍 Unique Lead IDs: ${leadIds.length}`, leadIds);

    // 3. Check if conversations exist for these campaign/lead combinations
    if (campaignIds.length > 0 && leadIds.length > 0) {
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select('*')
        .in('campaign_id', campaignIds)
        .in('lead_id', leadIds);

      if (error) {
        console.error('\n❌ Error querying conversations:', error);
      } else {
        console.log(`\n📬 Found ${conversations?.length || 0} conversations for bounced emails`);

        if (conversations && conversations.length > 0) {
          console.log('\n📧 Conversation details:');
          conversations.forEach((c, i) => {
            console.log(`  ${i + 1}. ID: ${c.id}, Subject: ${c.subject}, Status: ${c.status}, Campaign: ${c.campaign_id}, Lead: ${c.lead_id}, Unread: ${c.unread_count}`);
          });
        }
      }
    } else {
      console.log('\n⚠️ Missing campaign or lead IDs in bounce records!');
    }

    // 4. Check scheduled emails for these bounces
    const scheduledEmailIds = bounces.map(b => b.scheduled_email_id).filter(Boolean);
    if (scheduledEmailIds.length > 0) {
      const { data: scheduledEmails } = await supabase
        .from('scheduled_emails')
        .select('id, campaign_id, lead_id, to_email, status')
        .in('id', scheduledEmailIds);

      console.log(`\n📧 Scheduled emails for bounces: ${scheduledEmails?.length || 0}`);
      if (scheduledEmails && scheduledEmails.length > 0) {
        scheduledEmails.forEach((se, i) => {
          console.log(`  ${i + 1}. To: ${se.to_email}, Status: ${se.status}, Campaign: ${se.campaign_id}, Lead: ${se.lead_id}`);
        });
      }
    }
  }
}

debugBounceConversations().catch(console.error);
