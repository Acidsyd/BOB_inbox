require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

(async () => {
  const campaignId = 'eb5d10e4-1a5b-4979-acd6-ae9d8252933e';

  console.log('🔧 Campaign Config Restoration Script');
  console.log('=' .repeat(60));

  // Get campaign
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  console.log('📋 Campaign:', campaign.name);
  console.log('🏢 Organization ID:', campaign.organization_id);
  console.log('\n📋 Current Config (CORRUPTED):');
  console.log(JSON.stringify(campaign.config, null, 2));
  console.log('');

  // Get lead lists
  const { data: leadLists } = await supabase
    .from('lead_lists')
    .select('id, name, lead_count')
    .eq('organization_id', campaign.organization_id)
    .order('created_at', { ascending: false });

  console.log('📝 Available Lead Lists:');
  leadLists?.forEach((list, idx) => {
    console.log(`  ${idx + 1}. ${list.name} (ID: ${list.id})`);
  });
  console.log('');

  // Get email accounts  const { data: accounts } = await supabase
    .from('oauth2_tokens')
    .select('id, email')
    .eq('organization_id', campaign.organization_id)
    .eq('status', 'linked_to_account');

  console.log('📧 Available Email Accounts:');
  accounts?.forEach((acc, idx) => {
    console.log(`  ${idx + 1}. ${acc.email} (ID: ${acc.id})`);
  });
  console.log('\n' + '='.repeat(60));
  console.log('');

  // Ask user for restoration values
  const leadListId = await question('Enter Lead List ID to use: ');
  const leadListName = leadLists?.find(l => l.id === leadListId)?.name || 'Unknown';

  const accountIdsStr = await question('Enter Email Account IDs (comma-separated): ');
  const accountIds = accountIdsStr.split(',').map(id => id.trim());

  const emailSubject = await question('Enter Email Subject: ');
  const emailContent = await question('Enter Email Content: ');

  console.log('\n🔍 Restoration Preview:');
  console.log('  Lead List:', leadListName, `(${leadListId})`);
  console.log('  Email Accounts:', accountIds.length, 'accounts');
  console.log('  Subject:', emailSubject);
  console.log('  Content:', emailContent.substring(0, 50) + '...');
  console.log('');

  const confirm = await question('Apply this restoration? (yes/no): ');

  if (confirm.toLowerCase() !== 'yes') {
    console.log('❌ Restoration cancelled.');
    rl.close();
    return;
  }

  // Build new config preserving existing settings
  const newConfig = {
    ...campaign.config, // Keep existing settings like activeDays, trackOpens, etc.
    leadListId: leadListId,
    leadListName: leadListName,
    emailSubject: emailSubject,
    emailContent: emailContent,
    emailAccounts: accountIds,
    emailSequence: campaign.config.emailSequence || []
  };

  console.log('\n🔧 Applying restoration...');

  // Update campaign
  const { data: updated, error } = await supabase
    .from('campaigns')
    .update({
      config: newConfig,
      updated_at: new Date().toISOString()
    })
    .eq('id', campaignId)
    .select()
    .single();

  if (error) {
    console.error('❌ Restoration failed:', error);
  } else {
    console.log('✅ Campaign restored successfully!');
    console.log('\n📋 New Config:');
    console.log(JSON.stringify(updated.config, null, 2));
  }

  rl.close();
})();
