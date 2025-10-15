#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function debugEmails() {
  console.log('🔍 Debugging Scheduled Emails');
  console.log('=============================');
  console.log('Current UTC time:', new Date().toISOString());
  console.log('Current CEST time:', new Date().toLocaleString('en-US', { timeZone: 'Europe/Rome' }));
  console.log('');

  // Check emails that should be sending now
  const now = new Date().toISOString();
  const { data: readyEmails, error } = await supabase
    .from('scheduled_emails')
    .select('id, send_at, status, campaign_id')
    .eq('status', 'scheduled')
    .lte('send_at', now)
    .limit(10);

  console.log('📧 Emails ready to send now:', readyEmails?.length || 0);
  if (readyEmails && readyEmails.length > 0) {
    readyEmails.forEach(email => {
      const sendTime = new Date(email.send_at);
      console.log(`- Campaign ${email.campaign_id}: ${sendTime.toLocaleString('en-US', { timeZone: 'Europe/Rome' })} CEST`);
    });
  }
  console.log('');

  // Check future scheduled emails
  const { data: futureEmails } = await supabase
    .from('scheduled_emails')
    .select('id, send_at, status')
    .eq('status', 'scheduled')
    .gt('send_at', now)
    .order('send_at', { ascending: true })
    .limit(5);

  console.log('📅 Next scheduled emails:');
  if (futureEmails && futureEmails.length > 0) {
    futureEmails.forEach(email => {
      const sendTime = new Date(email.send_at);
      console.log(`- ${sendTime.toLocaleString('en-US', { timeZone: 'Europe/Rome' })} CEST`);
    });
  } else {
    console.log('- No future scheduled emails found');
  }
  console.log('');

  // Check for very old scheduled emails (might be stuck)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: oldEmails } = await supabase
    .from('scheduled_emails')
    .select('id, send_at, status')
    .eq('status', 'scheduled')
    .lt('send_at', oneHourAgo)
    .limit(5);

  console.log('⏰ Old scheduled emails (>1 hour ago):', oldEmails?.length || 0);
  if (oldEmails && oldEmails.length > 0) {
    oldEmails.forEach(email => {
      const sendTime = new Date(email.send_at);
      console.log(`- ${sendTime.toLocaleString('en-US', { timeZone: 'Europe/Rome' })} CEST`);
    });
  }
  console.log('');

  // Check active campaigns with sending hours
  const { data: activeCampaigns } = await supabase
    .from('campaigns')
    .select('id, name, status, config')
    .eq('status', 'active')
    .limit(5);

  console.log('🎯 Active campaigns:');
  if (activeCampaigns && activeCampaigns.length > 0) {
    activeCampaigns.forEach(campaign => {
      const sendingHours = campaign.config?.sendingHours || { start: 9, end: 17 };
      const timezone = campaign.config?.timezone || 'UTC';
      console.log(`- ${campaign.name}: ${sendingHours.start}:00-${sendingHours.end}:00 ${timezone}`);
    });
  }

  // Current hour in CEST for sending hours check
  const currentHourCEST = new Date().toLocaleString('en-US', {
    timeZone: 'Europe/Rome',
    hour: 'numeric',
    hour12: false
  });
  console.log('');
  console.log('⏰ Current hour in CEST:', currentHourCEST);
  console.log('✅ Campaigns should be sending if current hour is within their sending window');
}

debugEmails();