/**
 * Debug script to check actual database timestamp values
 * Looking for scheduled_emails with future dates indicating factor-of-1000 errors
 */

require('dotenv').config({ path: './backend/.env' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugDatabaseTimestamps() {
  console.log('🔍 Checking database for timestamp anomalies...\n');
  
  try {
    // Get recent scheduled_emails with their send_at timestamps
    const { data: emails, error } = await supabase
      .from('scheduled_emails')
      .select(`
        id,
        send_at,
        created_at,
        updated_at,
        status,
        campaign_id,
        to_email
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('❌ Database query failed:', error);
      return;
    }

    if (!emails || emails.length === 0) {
      console.log('📭 No scheduled_emails found in database');
      return;
    }

    console.log(`📧 Found ${emails.length} recent scheduled emails:\n`);
    
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    
    let normalCount = 0;
    let futureCount = 0;
    let farFutureCount = 0;
    
    emails.forEach((email, index) => {
      const sendAt = new Date(email.send_at);
      const createdAt = new Date(email.created_at);
      
      // Calculate time difference
      const diffMs = sendAt.getTime() - now.getTime();
      const diffMinutes = diffMs / (1000 * 60);
      const diffHours = diffMinutes / 60;
      const diffDays = diffHours / 24;
      const diffYears = diffDays / 365;
      
      let status = '';
      if (sendAt < oneWeekFromNow) {
        status = '✅ Normal';
        normalCount++;
      } else if (sendAt < oneYearFromNow) {
        status = '⚠️ Future (weeks/months)';
        futureCount++;
      } else {
        status = '🚨 FAR FUTURE (years)';
        farFutureCount++;
      }
      
      console.log(`${index + 1}. Email ${email.id.substring(0, 8)}... to ${email.to_email}`);
      console.log(`   Status: ${email.status}`);
      console.log(`   Created: ${createdAt.toISOString()}`);
      console.log(`   Send at: ${sendAt.toISOString()} ${status}`);
      console.log(`   Time diff: ${diffYears > 1 ? `${diffYears.toFixed(1)} years` : 
                                   diffDays > 1 ? `${diffDays.toFixed(1)} days` :
                                   diffHours > 1 ? `${diffHours.toFixed(1)} hours` :
                                   `${diffMinutes.toFixed(1)} minutes`} from now`);
      console.log('');
    });
    
    console.log('📊 SUMMARY:');
    console.log(`   ✅ Normal timing (< 1 week): ${normalCount}`);
    console.log(`   ⚠️ Future timing (weeks/months): ${futureCount}`);
    console.log(`   🚨 Far future timing (years): ${farFutureCount}`);
    
    if (farFutureCount > 0) {
      console.log('\n🚨 FOUND TIMESTAMP ISSUE!');
      console.log('   Far future timestamps indicate a factor-of-1000 calculation error.');
      
      // Show the most extreme example
      const extremeExample = emails.reduce((max, email) => {
        const sendAt = new Date(email.send_at);
        const maxSendAt = new Date(max.send_at);
        return sendAt > maxSendAt ? email : max;
      });
      
      const extremeSendAt = new Date(extremeExample.send_at);
      const extremeYears = (extremeSendAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 365);
      
      console.log(`   Most extreme: ${extremeSendAt.toISOString()} (${extremeYears.toFixed(1)} years from now)`);
    }
    
    // Check for campaigns that might have this issue
    const campaignIds = [...new Set(emails.map(e => e.campaign_id).filter(Boolean))];
    
    if (campaignIds.length > 0) {
      console.log(`\n📋 Found ${campaignIds.length} campaigns with scheduled emails:`);
      
      for (const campaignId of campaignIds.slice(0, 5)) {
        const { data: campaign } = await supabase
          .from('campaigns')
          .select('id, config, status, created_at')
          .eq('id', campaignId)
          .single();
          
        if (campaign) {
          const config = campaign.config || {};
          console.log(`   Campaign ${campaignId.substring(0, 8)}... (${campaign.status})`);
          console.log(`     Sending interval: ${config.sendingInterval || 'not set'} minutes`);
          console.log(`     Emails per hour: ${config.emailsPerHour || 'not set'}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error debugging timestamps:', error);
  }
}

// Run the debug function
debugDatabaseTimestamps()
  .then(() => {
    console.log('\n✅ Database timestamp debug complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  });