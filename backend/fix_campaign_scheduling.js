const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Campaign ID to fix
const CAMPAIGN_ID = '6e2a8bda-00a7-4615-a4db-289c29a86afb';

/**
 * Check if a time is within sending hours
 */
function isWithinSendingHours(date, sendingHours, timezone) {
  // Get the hour in the campaign's timezone
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
  const maxIterations = 1000; // Safety limit
  let iterations = 0;

  while (iterations < maxIterations) {
    // Check if current time is valid
    if (isActiveDay(currentTime, activeDays, timezone) &&
        isWithinSendingHours(currentTime, sendingHours, timezone)) {
      return currentTime;
    }

    // Check if we're outside sending hours today
    const currentHour = parseInt(currentTime.toLocaleString('en-US', {
      timeZone: timezone,
      hour12: false,
      hour: 'numeric'
    }));

    if (currentHour >= sendingHours.end) {
      // Move to start of next day
      currentTime.setDate(currentTime.getDate() + 1);
      currentTime.setHours(sendingHours.start, 0, 0, 0);
    } else if (currentHour < sendingHours.start) {
      // Move to start of sending hours today
      currentTime.setHours(sendingHours.start, 0, 0, 0);
    } else {
      // Not an active day, move to next day
      currentTime.setDate(currentTime.getDate() + 1);
      currentTime.setHours(sendingHours.start, 0, 0, 0);
    }

    iterations++;
  }

  throw new Error('Could not find valid send time after 1000 iterations');
}

async function fixCampaignScheduling() {
  console.log('='.repeat(80));
  console.log('FIX CAMPAIGN SCHEDULING WITH PERFECT ROTATION');
  console.log('='.repeat(80));
  console.log(`Campaign ID: ${CAMPAIGN_ID}\n`);

  // Step 1: Get campaign configuration
  console.log('📊 Step 1: Fetching campaign configuration...');
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('config, status')
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

  console.log('✅ Campaign Configuration:');
  console.log(`   Status: ${campaign.status}`);
  console.log(`   Sending Interval: ${sendingInterval} minutes`);
  console.log(`   Emails Per Hour: ${emailsPerHour}`);
  console.log(`   Sending Hours: ${sendingHours.start}:00 - ${sendingHours.end}:00`);
  console.log(`   Active Days: ${activeDays.join(', ')}`);
  console.log(`   Timezone: ${timezone}`);
  console.log(`   Email Accounts: ${emailAccounts.length}`);

  // Calculate actual interval (respecting emailsPerHour limit)
  const minIntervalMinutes = Math.ceil(60 / emailsPerHour);
  const actualInterval = Math.max(sendingInterval, minIntervalMinutes);
  console.log(`   Actual Interval: ${actualInterval} minutes (enforced by ${emailsPerHour} emails/hour limit)\n`);

  // Step 2: Fetch all scheduled emails (with pagination)
  console.log('📧 Step 2: Fetching all scheduled emails...');

  // First, get the total count
  const { count: totalScheduledCount, error: countError } = await supabase
    .from('scheduled_emails')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('status', 'scheduled');

  if (countError) {
    console.error('❌ Failed to count emails:', countError);
    return;
  }

  console.log(`📊 Total scheduled emails to fetch: ${totalScheduledCount}`);

  // Fetch all emails with pagination
  let allEmails = [];
  const pageSize = 1000;
  let page = 0;

  while (allEmails.length < totalScheduledCount) {
    console.log(`   Fetching page ${page + 1}... (${allEmails.length}/${totalScheduledCount})`);

    const { data: pageEmails, error: emailsError } = await supabase
      .from('scheduled_emails')
      .select('id, email_account_id, to_email, send_at, created_at')
      .eq('campaign_id', CAMPAIGN_ID)
      .eq('status', 'scheduled')
      .range(page * pageSize, (page + 1) * pageSize - 1)
      .order('send_at', { ascending: true });

    if (emailsError) {
      console.error('❌ Failed to fetch emails page:', emailsError);
      return;
    }

    if (!pageEmails || pageEmails.length === 0) break;

    allEmails = allEmails.concat(pageEmails);
    page++;
  }

  console.log(`✅ Found ${allEmails.length} scheduled emails\n`);

  // Step 3: Group emails by account
  console.log('🔄 Step 3: Organizing emails by account...');
  const emailsByAccount = {};
  emailAccounts.forEach(accountId => {
    emailsByAccount[accountId] = [];
  });

  allEmails.forEach(email => {
    if (emailsByAccount[email.email_account_id]) {
      emailsByAccount[email.email_account_id].push(email);
    }
  });

  console.log('📊 Current distribution:');
  Object.entries(emailsByAccount).forEach(([accountId, emails]) => {
    console.log(`   ...${accountId.substring(0, 8)}: ${emails.length} emails`);
  });
  console.log('');

  // Step 4: Create perfect rotation schedule
  console.log('✨ Step 4: Creating perfect rotation schedule...');
  console.log(`Starting from: ${new Date().toISOString()}`);
  console.log(`Timezone: ${timezone}\n`);

  // Start scheduling from next valid time slot
  let currentScheduleTime = getNextValidSendTime(
    new Date(),
    sendingHours,
    activeDays,
    timezone
  );

  console.log(`First email will be scheduled at: ${currentScheduleTime.toISOString()}\n`);

  // Create round-robin schedule
  const updates = [];
  let accountIndex = 0;
  let emailIndex = 0;
  const maxEmailsPerAccount = Math.max(...Object.values(emailsByAccount).map(arr => arr.length));

  console.log('🔄 Generating schedule with perfect rotation...\n');

  // Round-robin through all accounts until all emails are scheduled
  for (let round = 0; round < maxEmailsPerAccount; round++) {
    for (let accIdx = 0; accIdx < emailAccounts.length; accIdx++) {
      const accountId = emailAccounts[accIdx];
      const accountEmails = emailsByAccount[accountId];

      if (round < accountEmails.length) {
        const email = accountEmails[round];

        updates.push({
          id: email.id,
          send_at: currentScheduleTime.toISOString(),
          email_account_id: accountId
        });

        // Log first 20 for verification
        if (updates.length <= 20) {
          console.log(`[${updates.length}] ${currentScheduleTime.toISOString()} -> Account ...${accountId.substring(0, 8)} | ${email.to_email}`);
        }

        // Move to next time slot
        let nextTime = new Date(currentScheduleTime.getTime() + (actualInterval * 60 * 1000));
        currentScheduleTime = getNextValidSendTime(nextTime, sendingHours, activeDays, timezone);

        // If we jumped more than 24 hours, we skipped to next week
        if (currentScheduleTime.getTime() - nextTime.getTime() > 24 * 60 * 60 * 1000) {
          console.log(`⏭️  Skipping to next valid day: ${currentScheduleTime.toISOString()}`);
        }
      }
    }
  }

  if (updates.length > 20) {
    console.log(`... (${updates.length - 20} more emails) ...\n`);
  }

  console.log(`✅ Generated ${updates.length} schedules\n`);

  // Step 5: Apply updates
  console.log('💾 Step 5: Applying updates to database...');

  let successCount = 0;
  let failCount = 0;
  const batchSize = 50;

  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, Math.min(i + batchSize, updates.length));

    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(updates.length / batchSize)}...`);

    for (const update of batch) {
      const { error } = await supabase
        .from('scheduled_emails')
        .update({
          send_at: update.send_at,
          updated_at: new Date().toISOString()
        })
        .eq('id', update.id);

      if (error) {
        console.error(`❌ Failed to update ${update.id}:`, error.message);
        failCount++;
      } else {
        successCount++;
      }
    }
  }

  console.log('');
  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Successfully updated: ${successCount} emails`);
  console.log(`❌ Failed: ${failCount} emails`);
  console.log(`📊 Total processed: ${updates.length} emails`);
  console.log('');

  // Step 6: Verify the fix
  console.log('🔍 Step 6: Verifying the fix...\n');

  const { data: verifyEmails } = await supabase
    .from('scheduled_emails')
    .select('id, send_at, email_account_id')
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('status', 'scheduled')
    .order('send_at', { ascending: true })
    .limit(50);

  console.log('First 50 scheduled emails after fix:');
  const accountSequence = [];

  for (let i = 0; i < Math.min(50, verifyEmails.length); i++) {
    const email = verifyEmails[i];
    const accountShort = email.email_account_id.substring(0, 8);
    accountSequence.push(accountShort);

    let interval = '';
    if (i > 0) {
      const prevTime = new Date(verifyEmails[i - 1].send_at);
      const currTime = new Date(email.send_at);
      const diffMin = Math.round((currTime - prevTime) / 60000);
      interval = ` (${diffMin} min)`;
    }

    const isDuplicate = i > 0 && accountSequence[i] === accountSequence[i - 1] ? ' 🔁' : '';

    if (i < 25) {
      console.log(`[${String(i + 1).padStart(2)}] ${email.send_at} | ...${accountShort}${interval}${isDuplicate}`);
    }
  }

  if (verifyEmails.length > 25) {
    console.log(`... (${verifyEmails.length - 25} more) ...\n`);
  }

  // Check for account rotation quality
  console.log('\n📊 Rotation Quality Check (first 24 emails):');
  const first24 = accountSequence.slice(0, 24);
  const uniqueAccounts = new Set(first24).size;
  console.log(`   Unique accounts in sequence: ${uniqueAccounts}/${emailAccounts.length}`);

  let consecutiveCount = 1;
  let maxConsecutive = 1;
  for (let i = 1; i < first24.length; i++) {
    if (first24[i] === first24[i - 1]) {
      consecutiveCount++;
      maxConsecutive = Math.max(maxConsecutive, consecutiveCount);
    } else {
      consecutiveCount = 1;
    }
  }

  console.log(`   Max consecutive emails from same account: ${maxConsecutive}`);

  if (maxConsecutive === 1 && uniqueAccounts === emailAccounts.length) {
    console.log('   ✅ PERFECT ROTATION ACHIEVED!\n');
  } else {
    console.log('   ⚠️  Rotation could be improved\n');
  }

  console.log('='.repeat(80));
  console.log('✅ Campaign scheduling fix complete!');
  console.log('='.repeat(80));
}

// Run the fix
fixCampaignScheduling().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
