const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkSpecificLead() {
  const leadListId = 'f9ed0ba1-4ca1-4e42-8e99-4bcf863d4439';
  const emailToCheck = 'l.tonelli@vega.com';

  console.log('\n=== Checking Specific Lead ===\n');
  console.log('Email:', emailToCheck);
  console.log('Lead List ID:', leadListId);

  // Check if lead exists in the list
  const { data: lead, error } = await supabase
    .from('leads')
    .select('id, email, first_name, last_name, company, lead_list_id')
    .eq('email', emailToCheck)
    .eq('lead_list_id', leadListId)
    .maybeSingle();

  if (error) {
    console.error('Error checking lead:', error.message);
    return;
  }

  if (!lead) {
    console.log('\n❌ Lead NOT found in list');
    console.log('This lead has been removed or never existed in this list.');

    // Check if it exists in any other list for this org
    const campaignId = 'eb5d10e4-1a5b-4979-acd6-ae9d8252933e';
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('organization_id')
      .eq('id', campaignId)
      .single();

    const { data: otherLeads } = await supabase
      .from('leads')
      .select('id, lead_list_id, email, first_name, last_name')
      .eq('email', emailToCheck)
      .eq('organization_id', campaign.organization_id);

    if (otherLeads && otherLeads.length > 0) {
      console.log('\nFound in other lists:');
      otherLeads.forEach((l, i) => {
        console.log(`${i+1}. List ID: ${l.lead_list_id}`);
        console.log(`   Name: ${l.first_name} ${l.last_name}`);
      });
    } else {
      console.log('\nNot found in any other lists either.');
    }

    // Check if this lead received an email from the campaign
    const { data: sentEmail } = await supabase
      .from('scheduled_emails')
      .select('id, status, sent_at, lead_id, leads(email, first_name, last_name)')
      .eq('campaign_id', campaignId)
      .eq('status', 'sent');

    const matchingEmail = sentEmail?.find(e => e.leads?.email === emailToCheck);

    if (matchingEmail) {
      console.log('\n✓ This lead WAS sent an email:');
      console.log('  Sent at:', matchingEmail.sent_at);
      console.log('  Status:', matchingEmail.status);
      console.log('  Lead was removed because email was already sent');
    }

  } else {
    console.log('\n✅ Lead FOUND in list');
    console.log('\nLead details:');
    console.log('  ID:', lead.id);
    console.log('  Email:', lead.email);
    console.log('  Name:', lead.first_name, lead.last_name);
    console.log('  Company:', lead.company || 'N/A');
    console.log('\nThis lead is still in the list and has NOT been removed.');
  }
}

checkSpecificLead().catch(console.error);
