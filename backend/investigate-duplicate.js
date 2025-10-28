const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function investigateDuplicate() {
  const campaignId = '006fcfbc-37b6-4c0e-af47-5eabb00d7b58';

  console.log('\n🔍 INVESTIGATING DUPLICATE EMAIL TO MASSIMILIANO REALE\n');
  console.log('='.repeat(70));

  // Search for emails with similar name
  const { data: emails } = await supabase
    .from('scheduled_emails')
    .select('id, to_email, subject, status, sent_at, created_at, lead_id, is_follow_up')
    .eq('campaign_id', campaignId)
    .ilike('to_email', '%massimiliano%')
    .order('sent_at', { ascending: true });

  if (!emails || emails.length === 0) {
    console.log('No emails found for Massimiliano');
    return;
  }

  console.log(`\nFound ${emails.length} emails for Massimiliano:\n`);

  emails.forEach((email, i) => {
    const type = email.is_follow_up ? 'FOLLOW-UP' : 'INITIAL';
    console.log(`${i + 1}. [${type}] Email ID: ${email.id.substring(0, 8)}...`);
    console.log(`   To: ${email.to_email}`);
    console.log(`   Lead ID: ${email.lead_id.substring(0, 8)}...`);
    console.log(`   Subject: ${email.subject}`);
    console.log(`   Status: ${email.status}`);
    console.log(`   Created: ${new Date(email.created_at).toLocaleString()}`);
    if (email.sent_at) {
      console.log(`   Sent: ${new Date(email.sent_at).toLocaleString()}`);
    }
    console.log('');
  });

  // Filter only initial emails
  const initialEmails = emails.filter(e => !e.is_follow_up);

  console.log(`\n📊 Analysis:`);
  console.log(`   Total emails: ${emails.length}`);
  console.log(`   Initial emails: ${initialEmails.length}`);
  console.log(`   Follow-ups: ${emails.length - initialEmails.length}`);

  if (initialEmails.length > 1) {
    console.log('\n🚨 PROBLEM: Multiple INITIAL emails sent to same person!');
    console.log('   Expected: 1 initial email per person');
    console.log(`   Actual: ${initialEmails.length} initial emails`);
  }

  // Check if same lead_id
  const uniqueLeadIds = new Set(initialEmails.map(e => e.lead_id));
  console.log(`\n🔍 Unique lead IDs for initial emails: ${uniqueLeadIds.size}`);

  if (uniqueLeadIds.size === 1) {
    console.log('\n⚠️  ROOT CAUSE: DUPLICATE SCHEDULED_EMAILS FOR SAME LEAD');
    console.log('   This means the same lead_id has multiple scheduled_emails records.');
    console.log('   This should NOT happen with perfect rotation algorithm.');
    console.log('\n   Possible causes:');
    console.log('   1. Campaign was restarted multiple times without cleanup');
    console.log('   2. Race condition during campaign start');
    console.log('   3. Manual database manipulation');
  } else {
    console.log('\n⚠️  ROOT CAUSE: DUPLICATE LEADS IN LEAD LIST');
    console.log('   This means the same email address exists MULTIPLE TIMES in the lead list.');
    console.log('   Each duplicate lead gets its own scheduled email.');
    console.log('\n   Possible causes:');
    console.log('   1. Lead was imported multiple times');
    console.log('   2. Duplicate detection failed during import');
    console.log('   3. Lead list contains duplicates');
  }

  // Get lead details
  const leadIds = Array.from(uniqueLeadIds);
  const { data: leads } = await supabase
    .from('leads')
    .select('id, email, first_name, last_name, company, created_at, lead_list_id')
    .in('id', leadIds);

  if (leads && leads.length > 0) {
    console.log('\n📋 Lead Details:\n');
    leads.forEach((lead, i) => {
      console.log(`Lead ${i + 1}:`);
      console.log(`   ID: ${lead.id.substring(0, 8)}...`);
      console.log(`   Email: ${lead.email}`);
      console.log(`   Name: ${lead.first_name} ${lead.last_name}`);
      console.log(`   Company: ${lead.company || 'N/A'}`);
      console.log(`   Created: ${new Date(lead.created_at).toLocaleString()}`);
      console.log(`   Lead List: ${lead.lead_list_id.substring(0, 8)}...`);
      console.log('');
    });
  }

  // Check if there are other duplicate leads in the same list
  if (leads && leads.length > 0) {
    const leadListId = leads[0].lead_list_id;
    const email = leads[0].email;

    const { count: duplicateCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('lead_list_id', leadListId)
      .eq('email', email);

    console.log(`\n🔍 Checking entire lead list for duplicates:`);
    console.log(`   Email "${email}" appears ${duplicateCount} times in lead list`);

    if (duplicateCount > 1) {
      console.log(`   ⚠️  CONFIRMED: This email has ${duplicateCount} duplicate entries in lead list!`);
    } else {
      console.log(`   ✅ No duplicates in lead list - problem was during scheduling`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n📝 SUMMARY:\n');

  if (uniqueLeadIds.size > 1) {
    console.log('The recipient received multiple emails because their email address');
    console.log('exists MULTIPLE TIMES in the lead list as separate lead records.');
    console.log('\nEach lead record = 1 scheduled email.');
    console.log('Solution: Remove duplicate leads from the lead list.');
  } else {
    console.log('The recipient received multiple emails because MULTIPLE scheduled_emails');
    console.log('records were created for the SAME lead (same lead_id).');
    console.log('\nThis violates the "1 email per lead" rule of the scheduler.');
    console.log('Solution: Investigate campaign restart history and ensure cleanup.');
  }

  console.log('\n' + '='.repeat(70) + '\n');
}

investigateDuplicate();
