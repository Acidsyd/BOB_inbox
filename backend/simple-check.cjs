#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDatabase() {
  try {
    console.log('🔍 Checking database structure and scheduled emails...\n');
    
    // Check scheduled_emails table columns
    console.log('📋 Checking scheduled_emails table:');
    const { data: scheduledEmails, error: scheduledError } = await supabase
      .from('scheduled_emails')
      .select('*')
      .eq('status', 'scheduled')
      .limit(5);
    
    if (scheduledError) {
      console.error('❌ Error querying scheduled_emails:', scheduledError);
    } else {
      console.log(`✅ Found ${scheduledEmails?.length || 0} scheduled emails`);
      if (scheduledEmails?.length > 0) {
        console.log('First email:', JSON.stringify(scheduledEmails[0], null, 2));
      }
    }
    
    // Check email_accounts table
    console.log('\n📋 Checking email_accounts table:');
    const { data: emailAccounts, error: accountsError } = await supabase
      .from('email_accounts')
      .select('*')
      .limit(3);
    
    if (accountsError) {
      console.error('❌ Error querying email_accounts:', accountsError);
    } else {
      console.log(`✅ Found ${emailAccounts?.length || 0} email accounts`);
      if (emailAccounts?.length > 0) {
        console.log('First account:', {
          id: emailAccounts[0].id,
          email: emailAccounts[0].email,
          status: emailAccounts[0].status
        });
      }
    }
    
    // Check campaigns table
    console.log('\n📋 Checking campaigns table:');
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('id, name, status, organization_id')
      .eq('status', 'running')
      .limit(3);
    
    if (campaignsError) {
      console.error('❌ Error querying campaigns:', campaignsError);
    } else {
      console.log(`✅ Found ${campaigns?.length || 0} running campaigns`);
      campaigns?.forEach(campaign => {
        console.log(`  - ${campaign.name} (${campaign.id})`);
      });
    }
    
    // Get current time
    const now = new Date();
    console.log(`\n⏰ Current time: ${now.toISOString()}`);
    
    // Check scheduled emails with simple query
    const { data: upcoming, error: upcomingError } = await supabase
      .from('scheduled_emails')
      .select('id, campaign_id, email_account_id, send_at, status')
      .eq('status', 'scheduled')
      .gte('send_at', now.toISOString())
      .order('send_at', { ascending: true })
      .limit(10);
    
    if (upcomingError) {
      console.error('❌ Error querying upcoming emails:', upcomingError);
    } else {
      console.log(`\n📧 Found ${upcoming?.length || 0} upcoming scheduled emails:`);
      upcoming?.forEach((email, i) => {
        const sendTime = new Date(email.send_at);
        const minutesUntil = Math.ceil((sendTime.getTime() - now.getTime()) / (1000 * 60));
        console.log(`  ${i+1}. ID: ${email.id}, Send in: ${minutesUntil} mins (${sendTime.toISOString()})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkDatabase();
