const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://rhhzxmppkmcxnwqaxeeb.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoaHp4bXBwa21jeG53cWF4ZWViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTgxNTM3OCwiZXhwIjoyMDQ1MzkxMzc4fQ.yJlJGYmGxlLqQNkxiQF3h2AhPKGhEOb3WJGjGNxX3hE'
);

async function checkActivity() {
  try {
    console.log('🔍 Checking recent email activity...\n');

    // Get recent scheduled emails
    const { data: recentEmails, error } = await supabase
      .from('scheduled_emails')
      .select('id, status, send_at, to_email, from_email, sent_at, campaign_id')
      .not('sent_at', 'is', null)
      .order('sent_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Error fetching emails:', error.message);
      return;
    }

    console.log(`📧 Recent ${recentEmails?.length || 0} sent emails:`);
    
    if (recentEmails && recentEmails.length > 0) {
      recentEmails.forEach((email, index) => {
        const sentTime = new Date(email.sent_at);
        const campaignShort = email.campaign_id?.slice(0, 8) + '...';
        console.log(`   ${index + 1}. ${sentTime.toISOString()} - From: ${email.from_email} To: ${email.to_email} (${campaignShort})`);
      });

      // Check timing intervals
      console.log('\n⏱️ Time intervals between consecutive emails:');
      for (let i = 0; i < Math.min(recentEmails.length - 1, 5); i++) {
        const current = recentEmails[i];
        const next = recentEmails[i + 1];
        
        if (current.sent_at && next.sent_at) {
          const timeDiff = (new Date(current.sent_at) - new Date(next.sent_at)) / (1000 * 60);
          const sameCampaign = current.campaign_id === next.campaign_id;
          console.log(`   Email ${i+1} to ${i+2}: ${Math.abs(timeDiff).toFixed(1)} minutes apart ${sameCampaign ? '(same campaign)' : '(different campaigns)'}`);
        }
      }
    }

    // Get scheduled emails waiting
    const { data: scheduledEmails } = await supabase
      .from('scheduled_emails')
      .select('id, status, send_at, to_email, from_email, campaign_id')
      .eq('status', 'scheduled')
      .lte('send_at', new Date().toISOString())
      .order('send_at', { ascending: true })
      .limit(5);

    console.log(`\n🕒 Overdue emails (should be sending now): ${scheduledEmails?.length || 0}`);
    if (scheduledEmails && scheduledEmails.length > 0) {
      scheduledEmails.forEach((email, index) => {
        const sendTime = new Date(email.send_at);
        const minutesLate = Math.round((Date.now() - sendTime.getTime()) / 60000);
        const campaignShort = email.campaign_id?.slice(0, 8) + '...';
        console.log(`   ${index + 1}. ${sendTime.toISOString()} (${minutesLate}min late) - To: ${email.to_email} (${campaignShort})`);
      });
    }

    // Get upcoming emails
    const { data: upcomingEmails } = await supabase
      .from('scheduled_emails')
      .select('id, status, send_at, to_email, from_email, campaign_id')
      .eq('status', 'scheduled')
      .gt('send_at', new Date().toISOString())
      .order('send_at', { ascending: true })
      .limit(5);

    console.log(`\n⏳ Next emails to send: ${upcomingEmails?.length || 0}`);
    if (upcomingEmails && upcomingEmails.length > 0) {
      upcomingEmails.forEach((email, index) => {
        const sendTime = new Date(email.send_at);
        const minutesUntil = Math.round((sendTime.getTime() - Date.now()) / 60000);
        const campaignShort = email.campaign_id?.slice(0, 8) + '...';
        console.log(`   ${index + 1}. ${sendTime.toISOString()} (in ${minutesUntil}min) - To: ${email.to_email} (${campaignShort})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkActivity();