require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const campaignId = '3afa6a78-2101-404c-a911-13e36eeb5298';

async function checkMetrics() {
  console.log('🔍 Checking all metrics for campaign:', campaignId);

  // Check email_tracking_events table for opens and clicks
  const { data: trackingEvents, count: trackingCount } = await supabase
    .from('email_tracking_events')
    .select('event_type', { count: 'exact' })
    .eq('campaign_id', campaignId);

  console.log(`\n📊 Total tracking events: ${trackingCount}`);

  if (trackingEvents && trackingEvents.length > 0) {
    const eventCounts = {};
    trackingEvents.forEach(e => {
      eventCounts[e.event_type] = (eventCounts[e.event_type] || 0) + 1;
    });
    console.log('📊 Event breakdown:', eventCounts);
  }

  // Check conversation_messages for replies
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id')
    .eq('campaign_id', campaignId);

  console.log(`\n💬 Conversations for this campaign: ${conversations?.length || 0}`);

  if (conversations && conversations.length > 0) {
    const conversationIds = conversations.map(c => c.id);

    const { data: replies, count: replyCount } = await supabase
      .from('conversation_messages')
      .select('*', { count: 'exact' })
      .in('conversation_id', conversationIds)
      .eq('direction', 'received');

    console.log(`💬 Replies (received messages): ${replyCount}`);

    if (replies && replies.length > 0) {
      console.log('\n📧 Sample replies:');
      replies.slice(0, 3).forEach((r, i) => {
        console.log(`  ${i + 1}. From: ${r.from_email}, Subject: ${r.subject?.substring(0, 50)}`);
      });
    }
  }

  // Check what tables exist for tracking
  console.log('\n📋 Checking table structures...');

  // Try to get sample from scheduled_emails to see available columns
  const { data: sampleEmail } = await supabase
    .from('scheduled_emails')
    .select('*')
    .eq('campaign_id', campaignId)
    .limit(1)
    .single();

  if (sampleEmail) {
    console.log('\n📧 Columns in scheduled_emails:', Object.keys(sampleEmail).join(', '));
  }
}

checkMetrics().catch(console.error);
