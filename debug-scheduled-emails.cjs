#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production' });

async function debugScheduledEmails() {
  try {
    console.log('🔍 Checking scheduled emails in database...');

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Get all scheduled emails for the test campaign
    const campaignId = '59c83ca2-3b46-4323-a78f-a43d6ba6ab27';

    console.log('\n📊 All scheduled emails for campaign:', campaignId);
    const { data: allEmails, error } = await supabase
      .from('scheduled_emails')
      .select('id, send_at, status, to_email')
      .eq('campaign_id', campaignId)
      .order('send_at', { ascending: true });

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log('Current UTC time:', new Date().toISOString());
    console.log('Current Europe/Rome time:', new Date().toLocaleString('en-US', { timeZone: 'Europe/Rome' }));

    allEmails.forEach((email, index) => {
      const sendAt = new Date(email.send_at);
      const now = new Date();
      const isFuture = sendAt > now;

      console.log(`${index + 1}. ${email.send_at} → ${sendAt.toLocaleString('en-US', { timeZone: 'Europe/Rome' })} (${isFuture ? 'FUTURE' : 'PAST'}) [${email.status}] → ${email.to_email}`);
    });

    console.log('\n📅 Only FUTURE scheduled emails:');
    const { data: futureEmails, error: futureError } = await supabase
      .from('scheduled_emails')
      .select('id, send_at, status, to_email')
      .eq('campaign_id', campaignId)
      .eq('status', 'scheduled')
      .gt('send_at', 'now()')
      .order('send_at', { ascending: true });

    if (futureError) {
      console.error('❌ Future emails error:', futureError);
      return;
    }

    futureEmails.forEach((email, index) => {
      const sendAt = new Date(email.send_at);
      console.log(`${index + 1}. ${email.send_at} → ${sendAt.toLocaleString('en-US', { timeZone: 'Europe/Rome' })} → ${email.to_email}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugScheduledEmails();