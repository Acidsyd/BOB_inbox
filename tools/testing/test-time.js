import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load production environment
config({ path: './.env.production' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkCampaignStart() {
  const campaignId = '4bcbf4fe-2a72-4115-b506-23758ed33965';

  // Check campaign details
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  console.log('📋 Campaign Analysis:');
  console.log('  ID:', campaign.id);
  console.log('  Status:', campaign.status);
  console.log('  Created:', campaign.created_at);
  console.log('  Updated:', campaign.updated_at);
  console.log('  Config Lead List ID:', campaign.config?.leadListId);
  console.log('  Config Email Accounts:', campaign.config?.emailAccounts?.length || 0);

  // Check if lead list exists and has leads
  if (campaign.config?.leadListId) {
    const { count: leadCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('lead_list_id', campaign.config.leadListId)
      .eq('organization_id', campaign.organization_id)
      .eq('status', 'active');

    console.log('\\n👥 Lead List Analysis:');
    console.log('  Lead List ID:', campaign.config.leadListId);
    console.log('  Active Leads Count:', leadCount);

    if (leadCount === 0) {
      console.log('  🚨 PROBLEM: No active leads found!');
    }
  }

  // Check email accounts
  if (campaign.config?.emailAccounts?.length > 0) {
    console.log('\\n📧 Email Accounts Analysis:');
    for (const accountId of campaign.config.emailAccounts) {
      const { data: account } = await supabase
        .from('oauth2_tokens')
        .select('email, status')
        .eq('id', accountId)
        .single();

      if (account) {
        console.log('  Account:', account.email, '- Status:', account.status);
        if (account.status !== 'linked_to_account') {
          console.log('    🚨 PROBLEM: Account not properly linked!');
        }
      } else {
        console.log('  Account ID:', accountId, '- NOT FOUND!');
      }
    }
  }

  // Check any scheduled emails that might exist (even if 0)
  const { data: scheduledEmails, count: scheduledCount } = await supabase
    .from('scheduled_emails')
    .select('*', { count: 'exact' })
    .eq('campaign_id', campaignId);

  console.log('\\n📅 Scheduled Emails:');
  console.log('  Total Count:', scheduledCount);

  if (scheduledCount === 0) {
    console.log('  🚨 PROBLEM: No scheduled emails created during campaign start!');
    console.log('  🔍 This means the campaign start process failed silently');
  }
}

checkCampaignStart().catch(console.error);