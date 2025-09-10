#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function findCurrentTimeEmails() {
  try {
    console.log('🔍 Looking for emails that should actually be sending now...\n');
    
    const now = new Date();
    console.log(`⏰ Current UTC time: ${now.toISOString()}`);
    
    // Look for emails scheduled for today (not tomorrow)
    const todayStr = now.toISOString().split('T')[0]; // "2025-09-01"
    console.log(`📅 Looking for emails on: ${todayStr}`);
    
    const { data: todayEmails, error } = await supabase
      .from('scheduled_emails')
      .select('id, send_at, status, campaign_id, to_email')
      .eq('status', 'scheduled')
      .like('send_at', `${todayStr}%`)
      .order('send_at', { ascending: true });
    
    if (error) {
      console.error('❌ Error:', error);
      return;
    }
    
    console.log(`📧 Found ${todayEmails?.length || 0} emails scheduled for today`);
    
    if (todayEmails?.length > 0) {
      console.log('\nToday\'s emails:');
      todayEmails.forEach(email => {
        const sendTime = new Date(email.send_at);
        const minutesUntil = Math.ceil((sendTime.getTime() - now.getTime()) / (1000 * 60));
        const status = minutesUntil <= 0 ? '🔥 OVERDUE' : `⏰ ${minutesUntil}m`;
        
        console.log(`  ${status} ${email.id}: ${email.send_at} → ${email.to_email}`);
      });
      
      // Find overdue emails
      const overdue = todayEmails.filter(email => new Date(email.send_at) <= now);
      console.log(`\n🚨 ${overdue.length} emails are overdue and should have been sent!`);
    }
    
    // Also check for any emails in the current hour
    const currentHour = now.toISOString().substring(0, 13); // "2025-09-01T22"
    console.log(`\n🕐 Checking current hour: ${currentHour}:xx`);
    
    const { data: currentHourEmails } = await supabase
      .from('scheduled_emails')
      .select('id, send_at, status, to_email')
      .eq('status', 'scheduled')
      .like('send_at', `${currentHour}%`)
      .order('send_at', { ascending: true });
    
    console.log(`📧 Found ${currentHourEmails?.length || 0} emails scheduled for current hour`);
    currentHourEmails?.forEach(email => {
      const sendTime = new Date(email.send_at);
      const minutesUntil = Math.ceil((sendTime.getTime() - now.getTime()) / (1000 * 60));
      const status = minutesUntil <= 0 ? '🔥 OVERDUE' : `⏰ ${minutesUntil}m`;
      
      console.log(`  ${status} ${email.id}: ${email.send_at} → ${email.to_email}`);
    });
    
    // Check for emails in next 30 minutes specifically
    const thirtyMin = new Date(now.getTime() + 30 * 60 * 1000);
    console.log(`\n📅 Checking next 30 minutes: ${now.toISOString()} to ${thirtyMin.toISOString()}`);
    
    const { data: next30 } = await supabase
      .from('scheduled_emails')
      .select('id, send_at, status, to_email')
      .eq('status', 'scheduled')
      .gte('send_at', now.toISOString())
      .lte('send_at', thirtyMin.toISOString())
      .order('send_at', { ascending: true });
    
    console.log(`📧 Found ${next30?.length || 0} emails in next 30 minutes`);
    
    if (next30?.length === 0) {
      console.log('\n💡 No emails found in the next 30 minutes.');
      console.log('   The sequential processing fix will be testable when campaigns create new scheduled emails.');
      console.log('   Current scheduled emails seem to be for future dates.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

findCurrentTimeEmails();
