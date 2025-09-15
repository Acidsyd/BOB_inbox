#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkScheduledEmails() {
  console.log('🔍 Checking scheduled emails after campaign restart...');
  
  const { data: emails, error } = await supabase
    .from('scheduled_emails')
    .select('send_at')
    .eq('campaign_id', '59c83ca2-3b46-4323-a78f-a43d6ba6ab27')
    .eq('status', 'scheduled')
    .order('send_at', { ascending: true })
    .limit(15);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!emails || emails.length === 0) {
    console.log('❌ No scheduled emails found');
    return;
  }

  console.log('📧 First 15 scheduled emails after restart with corrected CampaignScheduler:');
  let previousTime = null;
  
  emails.forEach((email, index) => {
    const sendTime = new Date(email.send_at);
    const timeStr = sendTime.toLocaleString('en-US', { 
      timeZone: 'Europe/Rome',
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    let intervalInfo = '';
    if (previousTime) {
      const intervalMs = sendTime.getTime() - previousTime.getTime();
      const intervalMinutes = Math.round(intervalMs / (1000 * 60));
      intervalInfo = ` (interval: ${intervalMinutes} minutes)`;
    }
    
    console.log(`${index + 1}. ${timeStr}${intervalInfo}`);
    previousTime = sendTime;
  });
}

checkScheduledEmails();
