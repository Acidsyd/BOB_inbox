#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugCronQuery() {
  try {
    console.log('🔍 Debug: Why is cron processor not finding emails?\n');
    
    const now = new Date();
    console.log(`⏰ Current time: ${now.toISOString()}\n`);
    
    // Check all scheduled emails regardless of time
    console.log('📋 ALL scheduled emails:');
    const { data: allScheduled, error: allError } = await supabase
      .from('scheduled_emails')
      .select('id, send_at, status, campaign_id')
      .eq('status', 'scheduled')
      .order('send_at', { ascending: true })
      .limit(10);
    
    if (allError) {
      console.error('❌ Error:', allError);
    } else {
      console.log(`Found ${allScheduled?.length || 0} total scheduled emails`);
      allScheduled?.forEach(email => {
        const sendTime = new Date(email.send_at);
        const minutesUntil = Math.ceil((sendTime.getTime() - now.getTime()) / (1000 * 60));
        console.log(`  - ${email.id}: ${email.send_at} (${minutesUntil} mins until)`);
      });
    }
    
    // Check campaigns status
    console.log('\n📋 Campaign status:');
    const campaignIds = [...new Set(allScheduled?.map(e => e.campaign_id) || [])];
    if (campaignIds.length > 0) {
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, name, status')
        .in('id', campaignIds);
      
      campaigns?.forEach(campaign => {
        console.log(`  - ${campaign.name}: ${campaign.status} (${campaign.id})`);
      });
    }
    
    // Check the exact query the cron processor would use
    console.log('\n📋 Simulating cron processor query:');
    const { data: cronEmails, error: cronError } = await supabase
      .from('scheduled_emails')
      .select(`
        id,
        campaign_id,
        email_account_id,
        send_at,
        status,
        campaigns!inner(status)
      `)
      .eq('status', 'scheduled')
      .eq('campaigns.status', 'running')
      .lte('send_at', now.toISOString())
      .order('send_at', { ascending: true })
      .limit(5);
    
    if (cronError) {
      console.error('❌ Cron query error:', cronError);
    } else {
      console.log(`Found ${cronEmails?.length || 0} emails that cron should process`);
      cronEmails?.forEach(email => {
        console.log(`  - ${email.id}: ${email.send_at}`);
      });
    }
    
    // Check without campaign filter
    console.log('\n📋 Query without campaign status filter:');
    const { data: noCampaignFilter, error: noFilterError } = await supabase
      .from('scheduled_emails')
      .select('id, campaign_id, send_at, status')
      .eq('status', 'scheduled')
      .lte('send_at', now.toISOString())
      .order('send_at', { ascending: true })
      .limit(5);
    
    if (noFilterError) {
      console.error('❌ No filter query error:', noFilterError);
    } else {
      console.log(`Found ${noCampaignFilter?.length || 0} emails without campaign filter`);
      noCampaignFilter?.forEach(email => {
        console.log(`  - ${email.id}: ${email.send_at}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugCronQuery();
