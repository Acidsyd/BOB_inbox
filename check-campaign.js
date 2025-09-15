const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkSpecificCampaign() {
  const campaignId = '4bcbf4fe-2a72-4115-b506-23758ed33965';
  console.log('🎯 Checking campaign:', campaignId);

  // Get campaign details
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  if (campaignError) {
    console.error('❌ Error fetching campaign:', campaignError);
    return;
  }

  if (!campaign) {
    console.log('❌ Campaign not found');
    return;
  }

  console.log('📋 Campaign Details:');
  console.log('  Name:', campaign.name);
  console.log('  Status:', campaign.status);
  console.log('  Created:', campaign.created_at);
  console.log('  Updated:', campaign.updated_at);

  const config = campaign.config || {};
  console.log('\n⚙️  Configuration:');
  console.log('  Lead List ID:', config.leadListId);
  console.log('  Email Accounts:', config.emailAccounts?.length || 0);
  console.log('  Sending Interval:', config.sendingInterval, 'minutes');
  console.log('  Emails Per Day:', config.emailsPerDay);
  console.log('  Active Days:', config.activeDays?.join(', '));
  if (config.sendingHours) {
    console.log('  Sending Hours:', config.sendingHours.start + ':00 - ' + config.sendingHours.end + ':00');
  }

  // Check scheduled emails for this campaign
  const { data: scheduledEmails, error: scheduledError } = await supabase
    .from('scheduled_emails')
    .select('id, status, send_at, created_at, lead_id')
    .eq('campaign_id', campaignId)
    .order('send_at', { ascending: true })
    .limit(10);

  if (scheduledError) {
    console.error('❌ Error fetching scheduled emails:', scheduledError);
    return;
  }

  console.log('\n📅 Scheduled Emails (' + (scheduledEmails?.length || 0) + ' total):');
  if (!scheduledEmails || scheduledEmails.length === 0) {
    console.log('  ⚠️  No scheduled emails found');

    if (campaign.status === 'draft') {
      console.log('  🔍 Reason: Campaign is in DRAFT status - needs to be STARTED');
    } else if (campaign.status === 'active') {
      console.log('  🔍 Reason: Campaign is ACTIVE but no scheduled emails created');
      console.log('     - Check if lead list has active leads');
      console.log('     - Check if email accounts are configured');
    }
  } else {
    console.log('  First few scheduled emails:');
    scheduledEmails.slice(0, 5).forEach(email => {
      console.log('    -', email.status, 'at', email.send_at);
    });
  }

  // Check if lead list has leads
  if (config.leadListId) {
    const { count: leadCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('lead_list_id', config.leadListId)
      .eq('organization_id', campaign.organization_id)
      .eq('status', 'active');

    console.log('\n👥 Lead List:');
    console.log('  Active Leads:', leadCount || 0);

    if (leadCount === 0) {
      console.log('  ⚠️  No active leads found - this explains why no emails are scheduled');
    }
  }

  // Final diagnosis
  console.log('\n🔍 Diagnosis:');
  if (campaign.status === 'draft') {
    console.log('  ✅ Action needed: START the campaign to create scheduled emails');
  } else if (campaign.status === 'active' && (!scheduledEmails || scheduledEmails.length === 0)) {
    console.log('  ⚠️  Campaign is active but no scheduled emails - check configuration');
  } else if (scheduledEmails && scheduledEmails.length > 0) {
    console.log('  ✅ Campaign has scheduled emails - system is working correctly');
  }
}

checkSpecificCampaign().catch(console.error);