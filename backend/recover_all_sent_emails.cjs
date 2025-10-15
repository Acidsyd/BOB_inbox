/**
 * Improved Recovery Script: Restore ALL Sent Email Statuses
 *
 * This version handles cases where:
 * 1. Email was sent but scheduled_email was recreated later
 * 2. Multiple scheduled_emails exist for same lead (follow-ups)
 * 3. Case-sensitivity mismatches in email addresses
 *
 * Usage: node recover_all_sent_emails.cjs <campaign_id>
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function recoverAllSentEmails(campaignId) {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🔄 COMPREHENSIVE EMAIL STATUS RECOVERY');
    console.log('='.repeat(80));
    console.log('Campaign ID:', campaignId);
    console.log('Started:', new Date().toISOString());
    console.log('='.repeat(80) + '\n');

    // 1. Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('name, organization_id, config, created_at')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      console.error('❌ Campaign not found:', campaignError);
      process.exit(1);
    }

    console.log('Campaign:', campaign.name);
    console.log('Organization ID:', campaign.organization_id);
    console.log('Lead List ID:', campaign.config.leadListId);
    console.log('Campaign created:', campaign.created_at);

    // 2. Get all leads from this campaign's list
    const { data: leads, count: leadCount } = await supabase
      .from('leads')
      .select('email, id', { count: 'exact' })
      .eq('lead_list_id', campaign.config.leadListId);

    console.log('\n📊 Lead List:');
    console.log('Total leads:', leadCount);

    // Create a map of email -> lead_id (case-insensitive)
    const emailToLeadMap = new Map();
    leads.forEach(lead => {
      emailToLeadMap.set(lead.email.toLowerCase().trim(), lead.id);
    });

    // 3. Get ALL scheduled emails for this campaign (any status)
    const { data: scheduledEmails, count: totalScheduled } = await supabase
      .from('scheduled_emails')
      .select('id, to_email, lead_id, status, sent_at, created_at')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: true });

    console.log('\n📧 Scheduled Emails:');
    console.log('Total scheduled emails:', totalScheduled);

    const statusBreakdown = {};
    scheduledEmails.forEach(email => {
      statusBreakdown[email.status] = (statusBreakdown[email.status] || 0) + 1;
    });
    console.log('Status breakdown:', statusBreakdown);

    // 4. Get ALL sent messages to campaign leads since campaign creation
    const { data: allSentMessages } = await supabase
      .from('conversation_messages')
      .select('to_email, sent_at, from_email, subject')
      .eq('organization_id', campaign.organization_id)
      .eq('direction', 'sent')
      .gte('sent_at', campaign.created_at)
      .order('sent_at', { ascending: true });

    // Filter to only messages sent to campaign leads
    const sentToLeads = allSentMessages.filter(msg =>
      emailToLeadMap.has(msg.to_email.toLowerCase().trim())
    );

    console.log('\n📤 Sent Messages:');
    console.log('Total sent to campaign leads:', sentToLeads.length);

    // 5. Create comprehensive matching strategy
    console.log('\n🔍 Matching sent messages to scheduled emails...');

    // Strategy: For each sent message, find the corresponding scheduled_email
    // Match by: to_email (case-insensitive) + closest creation time before sent_at
    const updates = [];
    const unmatched = [];

    sentToLeads.forEach(sent => {
      const toEmail = sent.to_email.toLowerCase().trim();
      const leadId = emailToLeadMap.get(toEmail);

      // Find scheduled email for this lead that:
      // 1. Has status 'skipped'
      // 2. Was created before the message was sent
      // 3. Is the closest match by creation time
      const candidates = scheduledEmails.filter(scheduled =>
        scheduled.to_email.toLowerCase().trim() === toEmail &&
        scheduled.status === 'skipped' &&
        scheduled.lead_id === leadId &&
        new Date(scheduled.created_at) <= new Date(sent.sent_at)
      );

      if (candidates.length > 0) {
        // Sort by creation time (closest to sent_at)
        candidates.sort((a, b) =>
          Math.abs(new Date(sent.sent_at) - new Date(a.created_at)) -
          Math.abs(new Date(sent.sent_at) - new Date(b.created_at))
        );

        const match = candidates[0];
        updates.push({
          scheduledId: match.id,
          toEmail: sent.to_email,
          sentAt: sent.sent_at,
          fromEmail: sent.from_email,
          subject: sent.subject
        });
      } else {
        // No matching scheduled_email found
        unmatched.push({
          toEmail: sent.to_email,
          sentAt: sent.sent_at,
          subject: sent.subject,
          reason: candidates.length === 0 ? 'no_scheduled_email' : 'wrong_status'
        });
      }
    });

    console.log('\n📈 Match Results:');
    console.log('Matched (to be updated):', updates.length);
    console.log('Unmatched:', unmatched.length);

    if (unmatched.length > 0) {
      console.log('\nUnmatched reasons:');
      const reasons = {};
      unmatched.forEach(u => {
        reasons[u.reason] = (reasons[u.reason] || 0) + 1;
      });
      console.log(reasons);

      if (unmatched.length <= 10) {
        console.log('\nSample unmatched:');
        unmatched.slice(0, 10).forEach(u => {
          console.log(`  - ${u.toEmail} (${u.reason}) - ${u.sentAt}`);
        });
      }
    }

    if (updates.length === 0) {
      console.log('\n✅ No updates needed - all emails already have correct status');
      return;
    }

    // 6. Confirmation
    console.log('\n⚠️  CONFIRMATION REQUIRED');
    console.log('This will update', updates.length, 'scheduled_emails records');
    console.log('from status "skipped" to status "sent"');
    console.log('\nPress Ctrl+C to cancel, or wait 5 seconds to continue...');

    await new Promise(resolve => setTimeout(resolve, 5000));

    // 7. Update in batches
    console.log('\n🔄 Updating email statuses...');

    let updated = 0;
    let failed = 0;

    for (const email of updates) {
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

      if ((updated + failed) % 10 === 0) {
        console.log(`Progress: ${updated + failed}/${updates.length} (${Math.round((updated + failed) / updates.length * 100)}%)`);
      }
    }

    // 8. Verify final status
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
    console.log('Still unmatched:', unmatched.length);
    console.log('\nFinal status breakdown:');
    console.log(JSON.stringify(finalBreakdown, null, 2));
    console.log('\nExpected sent count:', sentToLeads.length);
    console.log('Actual sent count:', finalBreakdown.sent || 0);
    console.log('Difference:', sentToLeads.length - (finalBreakdown.sent || 0));
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error);
    process.exit(1);
  }
}

// Get campaign ID from command line
const campaignId = process.argv[2];

if (!campaignId) {
  console.error('Usage: node recover_all_sent_emails.cjs <campaign_id>');
  process.exit(1);
}

recoverAllSentEmails(campaignId);
