const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const CAMPAIGN_ID = '55205d7b-9ebf-414a-84bc-52c8b724dd30';

async function checkEmailFollowUp() {
  console.log('\n📧 CHECKING EMAIL AND FOLLOW-UP STATUS');
  console.log('='.repeat(80));

  // Find the specific email sent to massimiliano.bellino@nextind.eu
  const { data: sentEmail, error: sentError } = await supabase
    .from('scheduled_emails')
    .select('id, to_email, from_email, status, sent_at, sequence_step, created_at, updated_at')
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('to_email', 'massimiliano.bellino@nextind.eu')
    .eq('status', 'sent')
    .order('sent_at', { ascending: false })
    .limit(1)
    .single();

  if (sentError) {
    console.log('❌ Error finding sent email:', sentError.message);
    return;
  }

  if (!sentEmail) {
    console.log('❌ Email not found');
    return;
  }

  console.log('\n📬 SENT EMAIL FOUND:');
  console.log(`   ID: ${sentEmail.id}`);
  console.log(`   To: ${sentEmail.to_email}`);
  console.log(`   From: ${sentEmail.from_email}`);
  console.log(`   Status: ${sentEmail.status}`);
  console.log(`   Sent at: ${sentEmail.sent_at}`);
  console.log(`   Sequence step: ${sentEmail.sequence_step}`);
  console.log(`   Updated: ${sentEmail.updated_at}`);

  // Check for follow-ups - this will fail if parent_email_id column doesn't exist
  console.log('\n🔍 CHECKING FOR FOLLOW-UPS:');

  try {
    const { data: followUps, error: followUpError } = await supabase
      .from('scheduled_emails')
      .select('id, to_email, status, send_at, sequence_step, parent_email_id')
      .eq('campaign_id', CAMPAIGN_ID)
      .eq('to_email', 'massimiliano.bellino@nextind.eu')
      .eq('sequence_step', 1);

    if (followUpError) {
      console.log('❌ Error checking follow-ups:', followUpError.message);

      if (followUpError.message.includes('parent_email_id')) {
        console.log('\n⚠️ DATABASE MIGRATION REQUIRED!');
        console.log('   The parent_email_id column does not exist in scheduled_emails table.');
        console.log('   Follow-ups CANNOT be created until the migration is run.');
        console.log('\n   Migration file: database_migrations/add_parent_email_id_to_scheduled_emails.sql');
        console.log('\n   Run this SQL in Supabase SQL Editor:');
        console.log('   ---');
        console.log('   ALTER TABLE scheduled_emails');
        console.log('   ADD COLUMN IF NOT EXISTS parent_email_id UUID REFERENCES scheduled_emails(id) ON DELETE SET NULL;');
        console.log('   ---');
      }
      return;
    }

    if (!followUps || followUps.length === 0) {
      console.log('❌ NO FOLLOW-UPS SCHEDULED for this email');
      console.log('\n   Possible reasons:');
      console.log('   1. Migration not run (parent_email_id column missing)');
      console.log('   2. Follow-up scheduling failed during email send');
      console.log('   3. Campaign followUpEnabled is false');
    } else {
      console.log(`✅ FOUND ${followUps.length} FOLLOW-UP(S):`);
      followUps.forEach((f, i) => {
        console.log(`\n   Follow-up ${i + 1}:`);
        console.log(`   ID: ${f.id}`);
        console.log(`   To: ${f.to_email}`);
        console.log(`   Status: ${f.status}`);
        console.log(`   Send at: ${f.send_at}`);
        console.log(`   Sequence step: ${f.sequence_step}`);
        console.log(`   Parent ID: ${f.parent_email_id}`);
      });
    }
  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }

  // Check all follow-ups for this email address (any sequence_step > 0)
  console.log('\n🔍 CHECKING ALL EMAILS FOR THIS ADDRESS:');
  const { data: allEmails, error: allError } = await supabase
    .from('scheduled_emails')
    .select('id, to_email, status, send_at, sent_at, sequence_step, created_at')
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('to_email', 'massimiliano.bellino@nextind.eu')
    .order('created_at', { ascending: false });

  if (allError) {
    console.log('❌ Error:', allError.message);
  } else {
    console.log(`\n   Found ${allEmails.length} total email(s) for this address:`);
    allEmails.forEach((e, i) => {
      console.log(`   ${i + 1}. [Step ${e.sequence_step}] ${e.status} - ${e.sent_at || e.send_at}`);
    });
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

checkEmailFollowUp().catch(console.error);
