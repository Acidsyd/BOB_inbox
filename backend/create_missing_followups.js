const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const CAMPAIGN_ID = '6e2a8bda-00a7-4615-a4db-289c29a86afb';

/**
 * Check if a time is within sending hours
 */
function isWithinSendingHours(date, sendingHours, timezone) {
  const hour = parseInt(date.toLocaleString('en-US', {
    timeZone: timezone,
    hour12: false,
    hour: 'numeric'
  }));

  return hour >= sendingHours.start && hour < sendingHours.end;
}

/**
 * Check if a date is on an active day
 */
function isActiveDay(date, activeDays, timezone) {
  const dayName = date.toLocaleDateString('en-US', {
    timeZone: timezone,
    weekday: 'long'
  }).toLowerCase();

  return activeDays.includes(dayName);
}

/**
 * Get next valid send time respecting sending hours and active days
 */
function getNextValidSendTime(startTime, sendingHours, activeDays, timezone) {
  let currentTime = new Date(startTime);
  const maxIterations = 1000;
  let iterations = 0;

  while (iterations < maxIterations) {
    if (isActiveDay(currentTime, activeDays, timezone) &&
        isWithinSendingHours(currentTime, sendingHours, timezone)) {
      return currentTime;
    }

    const currentHour = parseInt(currentTime.toLocaleString('en-US', {
      timeZone: timezone,
      hour12: false,
      hour: 'numeric'
    }));

    if (currentHour >= sendingHours.end) {
      currentTime.setDate(currentTime.getDate() + 1);
      currentTime.setHours(sendingHours.start, 0, 0, 0);
    } else if (currentHour < sendingHours.start) {
      currentTime.setHours(sendingHours.start, 0, 0, 0);
    } else {
      currentTime.setDate(currentTime.getDate() + 1);
      currentTime.setHours(sendingHours.start, 0, 0, 0);
    }

    iterations++;
  }

  throw new Error('Could not find valid send time after 1000 iterations');
}

async function createMissingFollowups() {
  console.log('='.repeat(80));
  console.log('CREATE MISSING FOLLOW-UP EMAILS');
  console.log('='.repeat(80));
  console.log(`Campaign ID: ${CAMPAIGN_ID}\n`);

  // Step 1: Get campaign configuration
  console.log('📊 Step 1: Fetching campaign configuration...');
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('config, organization_id, status')
    .eq('id', CAMPAIGN_ID)
    .single();

  if (campaignError || !campaign) {
    console.error('❌ Failed to fetch campaign:', campaignError);
    return;
  }

  const config = campaign.config;
  const sendingInterval = config.sendingInterval || 5;
  const emailsPerHour = config.emailsPerHour || 10;
  const sendingHours = config.sendingHours || { start: 9, end: 17 };
  const activeDays = config.activeDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const timezone = config.timezone || 'Europe/Rome';
  const emailAccounts = config.emailAccounts || [];
  const emailSequence = config.emailSequence || [];

  console.log('✅ Campaign Configuration:');
  console.log(`   Status: ${campaign.status}`);
  console.log(`   Sending Interval: ${sendingInterval} minutes`);
  console.log(`   Emails Per Hour: ${emailsPerHour}`);
  console.log(`   Follow-ups configured: ${emailSequence.length}`);
  console.log(`   Email Accounts: ${emailAccounts.length}`);
  console.log(`   Timezone: ${timezone}\n`);

  // Fetch email account details for from_email
  console.log('📧 Fetching email account details...');
  const { data: accountDetails } = await supabase
    .from('email_accounts')
    .select('id, email')
    .in('id', emailAccounts);

  const accountEmailMap = {};
  accountDetails?.forEach(acc => {
    accountEmailMap[acc.id] = acc.email;
  });

  console.log(`   Found ${Object.keys(accountEmailMap).length} account email addresses\n`);

  if (emailSequence.length === 0) {
    console.log('❌ No follow-ups configured in campaign. Exiting.');
    return;
  }

  // Calculate actual interval
  const minIntervalMinutes = Math.ceil(60 / emailsPerHour);
  const actualInterval = Math.max(sendingInterval, minIntervalMinutes);
  console.log(`   Actual Interval: ${actualInterval} minutes\n`);

  // Step 2: Get all initial emails (these have leads associated) - including sent ones
  console.log('📧 Step 2: Fetching all initial emails (including sent)...');

  // Get total count first
  const { count: totalInitialCount } = await supabase
    .from('scheduled_emails')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('is_follow_up', false)
    .in('status', ['scheduled', 'sent', 'sending']);

  console.log(`   Total initial emails: ${totalInitialCount}`);

  // Fetch all initial emails with pagination
  let initialEmails = [];
  const emailPageSize = 1000;
  let emailPage = 0;

  while (initialEmails.length < totalInitialCount) {
    const { data: pageEmails, error: emailsError } = await supabase
      .from('scheduled_emails')
      .select('id, lead_id, email_account_id, send_at, status')
      .eq('campaign_id', CAMPAIGN_ID)
      .eq('is_follow_up', false)
      .in('status', ['scheduled', 'sent', 'sending'])
      .range(emailPage * emailPageSize, (emailPage + 1) * emailPageSize - 1)
      .order('send_at', { ascending: true });

    if (emailsError) {
      console.error('❌ Failed to fetch initial emails:', emailsError);
      return;
    }

    if (!pageEmails || pageEmails.length === 0) break;

    initialEmails = initialEmails.concat(pageEmails);
    emailPage++;

    if (emailPage > 1) {
      console.log(`   Fetched page ${emailPage}: ${initialEmails.length}/${totalInitialCount} emails`);
    }
  }

  console.log(`✅ Found ${initialEmails.length} initial emails (including ${initialEmails.filter(e => e.status === 'sent').length} sent)\n`);

  // Step 3: Check which leads already have follow-ups
  console.log('🔍 Step 3: Checking existing follow-ups...');
  const { data: existingFollowups } = await supabase
    .from('scheduled_emails')
    .select('lead_id')
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('is_follow_up', true);

  const leadsWithFollowups = new Set(existingFollowups?.map(f => f.lead_id) || []);
  console.log(`   Leads with follow-ups: ${leadsWithFollowups.size}`);
  console.log(`   Leads needing follow-ups: ${initialEmails.length - leadsWithFollowups.size}\n`);

  // Step 4: Get the first follow-up configuration
  const firstFollowup = emailSequence[0];
  console.log('📋 Step 4: Follow-up configuration:');
  console.log(`   Subject: ${firstFollowup.subject}`);
  console.log(`   Delay: ${firstFollowup.delay} days`);
  console.log(`   Reply to same thread: ${firstFollowup.replyToSameThread}\n`);

  // Step 5: Find the last scheduled email time to continue from there
  console.log('⏰ Step 5: Finding last scheduled email time...');
  const { data: lastScheduled } = await supabase
    .from('scheduled_emails')
    .select('send_at')
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('status', 'scheduled')
    .order('send_at', { ascending: false })
    .limit(1);

  let currentScheduleTime;
  if (lastScheduled && lastScheduled.length > 0) {
    // Start from the last scheduled email + interval
    const lastTime = new Date(lastScheduled[0].send_at);
    currentScheduleTime = new Date(lastTime.getTime() + (actualInterval * 60 * 1000));
    console.log(`   Last scheduled: ${lastTime.toISOString()}`);
    console.log(`   Starting from: ${currentScheduleTime.toISOString()}\n`);
  } else {
    // No scheduled emails, start from now
    currentScheduleTime = getNextValidSendTime(
      new Date(),
      sendingHours,
      activeDays,
      timezone
    );
    console.log(`   Starting from now: ${currentScheduleTime.toISOString()}\n`);
  }

  // Ensure we start at a valid time
  currentScheduleTime = getNextValidSendTime(
    currentScheduleTime,
    sendingHours,
    activeDays,
    timezone
  );

  // Step 6: Prepare follow-up emails for leads that need them
  console.log('✨ Step 6: Preparing follow-up emails...');
  const followupsToCreate = [];
  let accountIndex = 0;

  // Filter out leads that already have follow-ups
  const leadsNeedingFollowups = initialEmails.filter(email =>
    !leadsWithFollowups.has(email.lead_id)
  );

  console.log(`   Creating ${leadsNeedingFollowups.length} follow-up emails\n`);

  // Fetch all leads from the lead list (with higher limit to get all 1627 leads)
  console.log(`   Fetching all leads from lead list ${config.leadListId}...`);

  // First get the total count
  const { count: totalLeadsCount } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('lead_list_id', config.leadListId);

  console.log(`   Total leads in list: ${totalLeadsCount}`);

  // Fetch all leads with pagination if needed
  let allLeads = [];
  const pageSize = 1000;
  let page = 0;

  while (allLeads.length < totalLeadsCount) {
    const { data: pageLeads, error: leadsError } = await supabase
      .from('leads')
      .select('id, email, first_name, last_name, company')
      .eq('lead_list_id', config.leadListId)
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (leadsError) {
      console.error(`   ❌ Error fetching leads page ${page + 1}:`, leadsError);
      return;
    }

    if (!pageLeads || pageLeads.length === 0) break;

    allLeads = allLeads.concat(pageLeads);
    page++;

    if (page > 1) {
      console.log(`   Fetched page ${page}: ${allLeads.length}/${totalLeadsCount} leads`);
    }
  }

  const leadsError = null; // Clear error for the next check

  if (leadsError) {
    console.error(`   ❌ Error fetching leads:`, leadsError);
    return;
  }

  // Create a map for quick lookup
  const leadsMap = {};
  allLeads.forEach(lead => {
    leadsMap[lead.id] = lead;
  });

  console.log(`   Fetched ${Object.keys(leadsMap).length} lead records\n`);

  for (const initialEmail of leadsNeedingFollowups) {
    const lead = leadsMap[initialEmail.lead_id];
    if (!lead) continue;

    // Rotate through accounts
    const accountId = emailAccounts[accountIndex % emailAccounts.length];
    accountIndex++;

    // Calculate follow-up send time (delay days after initial email)
    const initialSendTime = new Date(initialEmail.send_at);
    const followupBaseTime = new Date(initialSendTime);
    followupBaseTime.setDate(followupBaseTime.getDate() + firstFollowup.delay);

    // But don't schedule before the current schedule time
    const followupSendTime = followupBaseTime > currentScheduleTime ?
      getNextValidSendTime(followupBaseTime, sendingHours, activeDays, timezone) :
      getNextValidSendTime(currentScheduleTime, sendingHours, activeDays, timezone);

    followupsToCreate.push({
      campaign_id: CAMPAIGN_ID,
      organization_id: campaign.organization_id,
      lead_id: initialEmail.lead_id,
      to_email: lead.email,
      from_email: accountEmailMap[accountId] || '',
      subject: firstFollowup.subject
        .replace('{{firstName}}', lead.first_name || '')
        .replace('{{lastName}}', lead.last_name || '')
        .replace('{{company}}', lead.company || ''),
      content: firstFollowup.content,
      send_at: followupSendTime.toISOString(),
      email_account_id: accountId,
      is_follow_up: true,
      reply_to_same_thread: firstFollowup.replyToSameThread,
      sequence_step: 1,
      status: 'scheduled',
      template_data: {
        emailIndex: 1,
        originalContent: firstFollowup.content,
        originalSubject: firstFollowup.subject
      },
      email_data: {
        leadData: {
          email: lead.email,
          first_name: lead.first_name,
          last_name: lead.last_name,
          company: lead.company
        }
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Update current schedule time for next email
    currentScheduleTime = new Date(followupSendTime.getTime() + (actualInterval * 60 * 1000));
    currentScheduleTime = getNextValidSendTime(currentScheduleTime, sendingHours, activeDays, timezone);

    // Log first 10 for verification
    if (followupsToCreate.length <= 10) {
      console.log(`[${followupsToCreate.length}] ${followupSendTime.toISOString()} -> ...${accountId.substring(0, 8)} | ${lead.email}`);
    }
  }

  if (followupsToCreate.length > 10) {
    console.log(`... (${followupsToCreate.length - 10} more follow-ups) ...\n`);
  }

  console.log(`✅ Prepared ${followupsToCreate.length} follow-up emails\n`);

  // Step 7: Insert follow-ups in batches
  console.log('💾 Step 7: Creating follow-up emails in database...');

  const insertBatchSize = 100;
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < followupsToCreate.length; i += insertBatchSize) {
    const batch = followupsToCreate.slice(i, Math.min(i + insertBatchSize, followupsToCreate.length));

    console.log(`Processing batch ${Math.floor(i / insertBatchSize) + 1}/${Math.ceil(followupsToCreate.length / insertBatchSize)}...`);

    const { error } = await supabase
      .from('scheduled_emails')
      .insert(batch);

    if (error) {
      console.error(`❌ Failed to insert batch:`, error.message);
      failCount += batch.length;
    } else {
      successCount += batch.length;
    }
  }

  console.log('');
  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Successfully created: ${successCount} follow-up emails`);
  console.log(`❌ Failed: ${failCount} follow-up emails`);
  console.log(`📊 Total processed: ${followupsToCreate.length} follow-up emails`);
  console.log('');

  // Step 8: Verify final state
  console.log('🔍 Step 8: Verifying final state...\n');

  const { count: totalEmails } = await supabase
    .from('scheduled_emails')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', CAMPAIGN_ID);

  const { count: scheduledCount } = await supabase
    .from('scheduled_emails')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('status', 'scheduled');

  const { count: sentCount } = await supabase
    .from('scheduled_emails')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('status', 'sent');

  const { count: followupCount } = await supabase
    .from('scheduled_emails')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('is_follow_up', true);

  console.log('📊 Final Campaign State:');
  console.log(`   Total emails: ${totalEmails}`);
  console.log(`   Scheduled: ${scheduledCount}`);
  console.log(`   Sent: ${sentCount}`);
  console.log(`   Follow-ups: ${followupCount}`);
  console.log('');

  // Expected calculation
  const { count: totalLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('lead_list_id', config.leadListId);

  const expectedTotal = totalLeads * (1 + emailSequence.length);
  console.log('📈 Expected vs Actual:');
  console.log(`   Total leads: ${totalLeads}`);
  console.log(`   Follow-ups per lead: ${emailSequence.length}`);
  console.log(`   Expected total: ${expectedTotal}`);
  console.log(`   Actual total: ${totalEmails}`);
  console.log(`   Match: ${totalEmails === expectedTotal ? '✅' : '❌'}`);
  console.log('');

  console.log('='.repeat(80));
  console.log('✅ Follow-up creation complete!');
  console.log('='.repeat(80));
}

// Run the script
createMissingFollowups().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
