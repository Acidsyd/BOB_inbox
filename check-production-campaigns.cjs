const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.production' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkCampaigns() {
  try {
    console.log('🔍 Checking production campaigns and scheduled emails...\n');

    // Check active campaigns
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('id, organization_id, status, config')
      .eq('status', 'active');

    console.log(`🎯 Active campaigns: ${campaigns?.length || 0}`);
    campaigns?.forEach(c => {
      console.log(`Campaign ${c.id}: ${c.status}, interval: ${c.config?.sendingInterval || 'not set'} min`);
    });

    console.log('');

    // Check scheduled emails
    const { data: scheduled, count } = await supabase
      .from('scheduled_emails')
      .select('*', { count: 'exact' })
      .eq('status', 'scheduled')
      .order('send_at', { ascending: true });

    console.log(`📧 Total scheduled emails: ${count || 0}`);

    if (count > 0) {
      console.log('\nNext 5 scheduled emails:');
      scheduled?.slice(0, 5).forEach(email => {
        const sendTime = new Date(email.send_at);
        const timeFromNow = Math.round((sendTime - new Date()) / 1000 / 60);
        console.log(`- ${sendTime.toLocaleString('it-IT', { timeZone: 'Europe/Rome' })} (in ${timeFromNow} min) | Campaign: ${email.campaign_id}`);
      });
    }

    // Check if campaign 59c83ca2 has any scheduled emails
    console.log('\n🔍 Checking specific campaign 59c83ca2-3b46-4323-a78f-a43d6ba6ab27...');
    const { data: specificEmails, count: specificCount } = await supabase
      .from('scheduled_emails')
      .select('*', { count: 'exact' })
      .eq('campaign_id', '59c83ca2-3b46-4323-a78f-a43d6ba6ab27')
      .eq('status', 'scheduled')
      .order('send_at', { ascending: true });

    console.log(`📧 Campaign 59c83ca2 scheduled emails: ${specificCount || 0}`);

    if (specificCount > 0) {
      console.log('Next 3 emails for this campaign:');
      specificEmails?.slice(0, 3).forEach(email => {
        const sendTime = new Date(email.send_at);
        const timeFromNow = Math.round((sendTime - new Date()) / 1000 / 60);
        console.log(`- ${sendTime.toLocaleString('it-IT', { timeZone: 'Europe/Rome' })} (in ${timeFromNow} min)`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking campaigns:', error);
  }
}

checkCampaigns();