const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.production' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function fixCampaignIntervals() {
  try {
    console.log('🚀 Starting campaign interval fix...\n');

    // Specific campaign that was having issues
    const campaignId = '59c83ca2-3b46-4323-a78f-a43d6ba6ab27';

    console.log(`📋 Fixing campaign: ${campaignId}`);

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('config, organization_id')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      console.error('❌ Campaign not found:', campaignError);
      return;
    }

    const sendingIntervalMinutes = campaign.config?.sendingInterval || 15;
    console.log(`⏱️ Campaign interval: ${sendingIntervalMinutes} minutes`);
    console.log(`🏢 Organization ID: ${campaign.organization_id}`);

    // Get all scheduled emails for this campaign
    const { data: emails, error: emailsError } = await supabase
      .from('scheduled_emails')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('status', 'scheduled')
      .order('send_at', { ascending: true });

    if (emailsError) {
      console.error('❌ Error fetching emails:', emailsError);
      return;
    }

    console.log(`📧 Found ${emails?.length || 0} scheduled emails`);

    if (!emails || emails.length === 0) {
      console.log('✅ No emails to reschedule');
      return;
    }

    // Calculate proper intervals starting from now
    const now = new Date();
    const startTime = new Date(now.getTime() + 5 * 60 * 1000); // Start in 5 minutes
    const intervalMs = sendingIntervalMinutes * 60 * 1000;

    console.log(`🕒 Rescheduling ${emails.length} emails starting from ${startTime.toLocaleString('it-IT', { timeZone: 'Europe/Rome' })}`);
    console.log(`⏱️ Using ${sendingIntervalMinutes}-minute intervals`);

    // Reschedule emails with proper intervals
    const updates = [];
    let currentTime = new Date(startTime);

    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];

      updates.push({
        id: email.id,
        send_at: currentTime.toISOString()
      });

      // Add interval for next email
      currentTime = new Date(currentTime.getTime() + intervalMs);

      // Log progress every 100 emails
      if ((i + 1) % 100 === 0) {
        console.log(`📊 Processed ${i + 1}/${emails.length} emails`);
      }
    }

    console.log(`\n🔄 Updating ${updates.length} emails with proper intervals...`);
    console.log(`📅 Last email will be sent at: ${new Date(updates[updates.length - 1].send_at).toLocaleString('it-IT', { timeZone: 'Europe/Rome' })}`);

    // Batch update in chunks of 100
    const chunkSize = 100;
    let updatedCount = 0;

    for (let i = 0; i < updates.length; i += chunkSize) {
      const chunk = updates.slice(i, i + chunkSize);

      for (const update of chunk) {
        const { error: updateError } = await supabase
          .from('scheduled_emails')
          .update({ send_at: update.send_at })
          .eq('id', update.id);

        if (updateError) {
          console.error(`❌ Error updating email ${update.id}:`, updateError);
        } else {
          updatedCount++;
        }
      }

      console.log(`✅ Updated ${Math.min(i + chunkSize, updates.length)}/${updates.length} emails`);
    }

    console.log(`\n🎉 Successfully rescheduled ${updatedCount} emails!`);

    // Verify the fix
    console.log('\n🔍 Verifying intervals...');
    const { data: verifyEmails } = await supabase
      .from('scheduled_emails')
      .select('send_at')
      .eq('campaign_id', campaignId)
      .eq('status', 'scheduled')
      .order('send_at', { ascending: true })
      .limit(5);

    if (verifyEmails && verifyEmails.length > 1) {
      console.log('📊 First 5 rescheduled emails:');
      const currentTime = new Date();
      verifyEmails.forEach((email, index) => {
        const sendTime = new Date(email.send_at);
        const timeFromNow = Math.round((sendTime - currentTime) / 1000 / 60);
        const romeTime = sendTime.toLocaleString('it-IT', { timeZone: 'Europe/Rome' });
        const status = timeFromNow > 0 ? `in ${timeFromNow} min` : `${Math.abs(timeFromNow)} min ago`;
        console.log(`${index + 1}. ${romeTime} (${status})`);

        if (index > 0) {
          const prevTime = new Date(verifyEmails[index - 1].send_at);
          const interval = Math.round((sendTime - prevTime) / 1000 / 60);
          console.log(`   ⏱️ Interval from previous: ${interval} minutes`);
        }
      });
    }

  } catch (error) {
    console.error('❌ Error fixing campaign intervals:', error);
  }
}

fixCampaignIntervals();