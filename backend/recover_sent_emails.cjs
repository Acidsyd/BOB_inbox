/**
 * Recovery Script: Restore Sent Email Statuses
 *
 * This script recovers sent email statuses that were lost when the campaign
 * was updated. It matches conversation_messages with scheduled_emails to
 * restore the correct status.
 *
 * Usage: node recover_sent_emails.cjs <campaign_id>
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function recoverSentEmails(campaignId) {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🔄 EMAIL STATUS RECOVERY SCRIPT');
    console.log('='.repeat(80));
    console.log('Campaign ID:', campaignId);
    console.log('Started:', new Date().toISOString());
    console.log('='.repeat(80) + '\n');

    // 1. Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('name, organization_id, config')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      console.error('❌ Campaign not found:', campaignError);
      process.exit(1);
    }

    console.log('Campaign:', campaign.name);
    console.log('Organization ID:', campaign.organization_id);
    console.log('Lead List ID:', campaign.config.leadListId);

    // 2. Get all scheduled emails for this campaign
    const { data: scheduledEmails, count: totalScheduled } = await supabase
      .from('scheduled_emails')
      .select('id, to_email, status, sent_at', { count: 'exact' })
      .eq('campaign_id', campaignId);

    console.log('\n📊 Current Status:');
    console.log('Total scheduled emails:', totalScheduled);

    const statusBreakdown = {};
    scheduledEmails.forEach(email => {
      statusBreakdown[email.status] = (statusBreakdown[email.status] || 0) + 1;
    });
    console.log('Status breakdown:', statusBreakdown);

    // 3. Get all sent messages from conversation_messages
    const { data: sentMessages, count: totalSent } = await supabase
      .from('conversation_messages')
      .select('to_email, sent_at, from_email', { count: 'exact' })
      .eq('organization_id', campaign.organization_id)
      .eq('direction', 'sent')
      .order('sent_at', { ascending: true });

    console.log('\n📧 Sent Messages in Inbox:');
    console.log('Total sent messages:', totalSent);

    // 4. Match scheduled emails with sent messages by email address
    console.log('\n🔍 Matching scheduled emails with sent messages...');

    const emailToScheduledMap = new Map();
    scheduledEmails.forEach(scheduled => {
      emailToScheduledMap.set(scheduled.to_email.toLowerCase(), scheduled);
    });

    const matchedEmails = [];
    const unmatchedSent = [];

    sentMessages.forEach(sent => {
      const toEmail = sent.to_email.toLowerCase();
      const scheduled = emailToScheduledMap.get(toEmail);

      if (scheduled && scheduled.status === 'skipped') {
        matchedEmails.push({
          scheduledId: scheduled.id,
          toEmail: sent.to_email,
          sentAt: sent.sent_at,
          fromEmail: sent.from_email
        });
      } else if (!scheduled) {
        unmatchedSent.push(sent.to_email);
      }
    });

    console.log('\n📈 Match Results:');
    console.log('Matched (to be updated):', matchedEmails.length);
    console.log('Unmatched sent messages:', unmatchedSent.length);

    if (unmatchedSent.length > 0 && unmatchedSent.length <= 10) {
      console.log('\nSample unmatched emails:');
      unmatchedSent.slice(0, 10).forEach(email => console.log('  -', email));
    }

    // 5. Ask for confirmation
    console.log('\n⚠️  CONFIRMATION REQUIRED');
    console.log('This will update', matchedEmails.length, 'scheduled_emails records');
    console.log('from status "skipped" to status "sent"');
    console.log('\nPress Ctrl+C to cancel, or wait 5 seconds to continue...');

    await new Promise(resolve => setTimeout(resolve, 5000));

    // 6. Update scheduled emails in batches
    console.log('\n🔄 Updating email statuses...');

    const batchSize = 100;
    let updated = 0;
    let failed = 0;

    for (let i = 0; i < matchedEmails.length; i += batchSize) {
      const batch = matchedEmails.slice(i, i + batchSize);

      for (const email of batch) {
        const { error } = await supabase
          .from('scheduled_emails')
          .update({
            status: 'sent',
            sent_at: email.sentAt,
            updated_at: new Date().toISOString()
          })
          .eq('id', email.scheduledId);

        if (error) {
          console.error(`❌ Failed to update ${email.toEmail}:`, error.message);
          failed++;
        } else {
          updated++;
        }
      }

      console.log(`Progress: ${updated + failed}/${matchedEmails.length} (${Math.round((updated + failed) / matchedEmails.length * 100)}%)`);
    }

    // 7. Verify final status
    const { data: finalEmails } = await supabase
      .from('scheduled_emails')
      .select('status')
      .eq('campaign_id', campaignId);

    const finalBreakdown = {};
    finalEmails.forEach(email => {
      finalBreakdown[email.status] = (finalBreakdown[email.status] || 0) + 1;
    });

    console.log('\n' + '='.repeat(80));
    console.log('✅ RECOVERY COMPLETE');
    console.log('='.repeat(80));
    console.log('Successfully updated:', updated);
    console.log('Failed updates:', failed);
    console.log('\nFinal status breakdown:');
    console.log(JSON.stringify(finalBreakdown, null, 2));
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error);
    process.exit(1);
  }
}

// Get campaign ID from command line
const campaignId = process.argv[2];

if (!campaignId) {
  console.error('Usage: node recover_sent_emails.cjs <campaign_id>');
  process.exit(1);
}

recoverSentEmails(campaignId);
