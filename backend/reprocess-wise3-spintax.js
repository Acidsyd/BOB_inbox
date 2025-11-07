const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { createClient } = require('@supabase/supabase-js');
const SpintaxParser = require('./src/utils/spintax');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function reprocessSpintax() {
  try {
    console.log('\n🔧 REPROCESSING WISE 3 SPINTAX + PERSONALIZATION\n');
    console.log('='.repeat(80));

    const campaignId = '006fcfbc-37b6-4c0e-af47-5eabb00d7b58';

    // Get campaign config
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (!campaign) {
      console.log('❌ Campaign not found');
      return;
    }

    console.log(`📋 Campaign: ${campaign.name}`);

    const rawSubject = campaign.config.emailSubject;
    const rawContent = campaign.config.emailContent;

    console.log(`\n📝 Raw Subject (spintax):`);
    console.log(`   ${rawSubject.substring(0, 100)}...`);

    // Get all scheduled emails with lead data (paginated)
    console.log('\n📊 Fetching scheduled emails with lead data...');

    let allEmails = [];
    let page = 0;
    const pageSize = 1000;

    while (true) {
      const { data: emailsPage, error } = await supabase
        .from('scheduled_emails')
        .select(`
          id,
          lead_id,
          subject,
          is_follow_up,
          leads!scheduled_emails_lead_id_fkey (
            id,
            email,
            first_name,
            last_name,
            company,
            data
          )
        `)
        .eq('campaign_id', campaignId)
        .in('status', ['scheduled', 'skipped'])
        .eq('is_follow_up', false)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.error('❌ Error fetching emails:', error);
        return;
      }

      if (!emailsPage || emailsPage.length === 0) break;

      allEmails = allEmails.concat(emailsPage);
      console.log(`   Fetched ${allEmails.length} emails...`);

      if (emailsPage.length < pageSize) break;
      page++;
    }

    console.log(`\n✅ Found ${allEmails.length} initial emails (scheduled + skipped) to reprocess`);

    // Process in batches
    const BATCH_SIZE = 50;
    let totalUpdated = 0;
    let totalErrors = 0;

    console.log(`\n🔄 Processing in batches of ${BATCH_SIZE}...\n`);

    for (let i = 0; i < allEmails.length; i += BATCH_SIZE) {
      const batch = allEmails.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(allEmails.length / BATCH_SIZE);

      console.log(`📦 Batch ${batchNum}/${totalBatches} (${batch.length} emails)`);

      for (const email of batch) {
        const lead = email.leads;

        if (!lead) {
          console.log(`   ⚠️  No lead data for email ${email.id}, skipping`);
          totalErrors++;
          continue;
        }

        // Process spintax with seed
        let processedSubject = SpintaxParser.spinWithSeed(rawSubject, lead.email);
        let processedContent = SpintaxParser.spinWithSeed(rawContent, lead.email);

        // Extract additional data from JSON field
        const leadData = lead.data || {};
        const fullName = `${lead.first_name || ''} ${lead.last_name || ''}`.trim();

        // Define personalization tokens
        const replacements = {
          '{{firstName}}': lead.first_name || '',
          '{{lastName}}': lead.last_name || '',
          '{{fullName}}': fullName,
          '{{company}}': lead.company || '',
          '{{jobTitle}}': leadData.job_title || leadData.jobTitle || '',
          '{{website}}': leadData.website || '',
          '{{email}}': lead.email || '',
          '{firstName}': lead.first_name || '',
          '{lastName}': lead.last_name || '',
          '{fullName}': fullName,
          '{company}': lead.company || '',
          '{jobTitle}': leadData.job_title || leadData.jobTitle || '',
          '{website}': leadData.website || '',
          '{email}': lead.email || '',
          '{first_name}': lead.first_name || '',
          '{last_name}': lead.last_name || '',
          '{full_name}': fullName,
          '{job_title}': leadData.job_title || leadData.jobTitle || ''
        };

        // Apply personalization
        function escapeRegExp(string) {
          return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }

        Object.entries(replacements).forEach(([token, value]) => {
          processedSubject = processedSubject.replace(new RegExp(escapeRegExp(token), 'g'), value);
          processedContent = processedContent.replace(new RegExp(escapeRegExp(token), 'g'), value);
        });

        // Update email (also reset status to scheduled if it was skipped)
        const { error: updateError } = await supabase
          .from('scheduled_emails')
          .update({
            subject: processedSubject,
            content: processedContent,
            status: 'scheduled', // Reset to scheduled if was skipped
            updated_at: new Date().toISOString()
          })
          .eq('id', email.id);

        if (updateError) {
          console.log(`   ❌ Error updating ${email.id}:`, updateError.message);
          totalErrors++;
        } else {
          totalUpdated++;
        }
      }

      console.log(`   ✅ Batch complete: ${totalUpdated} updated, ${totalErrors} errors\n`);
    }

    console.log('\n' + '='.repeat(80));
    console.log(`\n✅ Reprocessing complete!`);
    console.log(`   Updated: ${totalUpdated}`);
    console.log(`   Errors: ${totalErrors}`);
    console.log(`   Total: ${allEmails.length}`);

    // Show sample
    const { data: sample } = await supabase
      .from('scheduled_emails')
      .select('to_email, subject')
      .eq('campaign_id', campaignId)
      .eq('status', 'scheduled')
      .eq('is_follow_up', false)
      .limit(3);

    if (sample && sample.length > 0) {
      console.log('\n📧 Sample Reprocessed Emails:');
      sample.forEach((email, i) => {
        console.log(`\n${i + 1}. ${email.to_email}`);
        console.log(`   Subject: ${email.subject}`);
      });
    }

    console.log('\n✅ Done! All emails now have properly formatted content.\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  }
}

reprocessSpintax();
