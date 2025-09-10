#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugTimezone() {
  try {
    console.log('🔍 Debug timezone and time comparison...\n');
    
    const now = new Date();
    console.log(`⏰ Current JS time: ${now.toISOString()}`);
    console.log(`⏰ Current JS local: ${now.toString()}`);
    
    // Get one scheduled email to check format
    const { data: emails, error } = await supabase
      .from('scheduled_emails')
      .select('id, send_at, status')
      .eq('status', 'scheduled')
      .limit(3);
    
    if (emails?.length > 0) {
      console.log('\n📧 Sample scheduled emails:');
      emails.forEach(email => {
        const sendTime = new Date(email.send_at);
        console.log(`  - ${email.id}`);
        console.log(`    send_at (raw): ${email.send_at}`);
        console.log(`    send_at (parsed): ${sendTime.toISOString()}`);
        console.log(`    send_at (local): ${sendTime.toString()}`);
        console.log(`    Is in past? ${sendTime <= now}`);
        console.log(`    Minutes until: ${Math.ceil((sendTime.getTime() - now.getTime()) / (1000 * 60))}`);
      });
    }
    
    // Test different time formats
    console.log('\n🧪 Testing time comparisons:');
    
    // Test with string comparison
    const { data: stringComp } = await supabase
      .from('scheduled_emails')
      .select('id, send_at')
      .eq('status', 'scheduled')
      .lte('send_at', now.toISOString())
      .limit(5);
    
    console.log(`String comparison (lte now): ${stringComp?.length || 0} results`);
    
    // Test with greater than
    const { data: futureEmails } = await supabase
      .from('scheduled_emails')
      .select('id, send_at')
      .eq('status', 'scheduled')
      .gte('send_at', now.toISOString())
      .limit(5);
    
    console.log(`Future emails (gte now): ${futureEmails?.length || 0} results`);
    
    // Get all and compare manually
    const { data: allEmails } = await supabase
      .from('scheduled_emails')
      .select('id, send_at')
      .eq('status', 'scheduled');
    
    if (allEmails) {
      const pastDue = allEmails.filter(email => new Date(email.send_at) <= now);
      const future = allEmails.filter(email => new Date(email.send_at) > now);
      
      console.log(`Manual comparison - Past due: ${pastDue.length}, Future: ${future.length}`);
      
      if (pastDue.length > 0) {
        console.log('\nPast due emails:');
        pastDue.forEach(email => {
          const sendTime = new Date(email.send_at);
          const minutesPast = Math.ceil((now.getTime() - sendTime.getTime()) / (1000 * 60));
          console.log(`  - ${email.id}: ${minutesPast} minutes overdue`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugTimezone();
