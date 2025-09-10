const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkCampaignConfig() {
  try {
    console.log('🔍 Checking campaign configuration for: e0076927-6f62-4937-8c03-2109c0e0a460');
    
    // Query the specific campaign
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', 'e0076927-6f62-4937-8c03-2109c0e0a460')
      .single();

    if (error) {
      console.error('❌ Error querying campaign:', error);
      return;
    }

    if (!campaign) {
      console.log('❌ Campaign not found');
      return;
    }

    console.log('\n📋 Campaign Details:');
    console.log('ID:', campaign.id);
    console.log('Name:', campaign.name);
    console.log('Status:', campaign.status);
    console.log('Organization ID:', campaign.organization_id);
    console.log('Created:', campaign.created_at);
    console.log('Updated:', campaign.updated_at);

    console.log('\n⚙️ Campaign Config:');
    const config = campaign.config;
    console.log('Sending Interval:', config.sendingInterval, 'minutes');
    console.log('Sending Hours:', config.sendingHours);
    console.log('Emails Per Day:', config.emailsPerDay);
    console.log('Emails Per Hour:', config.emailsPerHour);
    console.log('Schedule Type:', config.scheduleType);
    console.log('Timezone:', config.timezone);
    
    console.log('\n📧 Email Accounts:');
    if (config.emailAccounts && config.emailAccounts.length > 0) {
      console.log('Assigned accounts:', config.emailAccounts);
      
      // Query email account details
      const { data: accounts, error: accountsError } = await supabase
        .from('email_accounts')
        .select('id, email, provider, status')
        .in('id', config.emailAccounts);
        
      if (accountsError) {
        console.error('Error querying email accounts:', accountsError);
      } else {
        accounts.forEach(account => {
          console.log(`- ${account.email} (${account.provider}, status: ${account.status})`);
        });
      }
    } else {
      console.log('No email accounts assigned');
    }

    console.log('\n📈 Lead List Info:');
    if (config.leadListId) {
      const { data: leadList, error: leadListError } = await supabase
        .from('lead_lists')
        .select('id, name, total_leads')
        .eq('id', config.leadListId)
        .single();
        
      if (leadListError) {
        console.error('Error querying lead list:', leadListError);
      } else {
        console.log(`Lead List: ${leadList.name} (${leadList.total_leads} leads)`);
      }
    }

    // Check scheduled emails for this campaign
    const { data: scheduledEmails, error: scheduledError } = await supabase
      .from('scheduled_emails')
      .select('status, send_at, created_at')
      .eq('campaign_id', campaign.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (scheduledError) {
      console.error('Error querying scheduled emails:', scheduledError);
    } else {
      console.log(`\n📬 Scheduled Emails (last 10):`);
      console.log(`Total scheduled emails: ${scheduledEmails.length}`);
      scheduledEmails.forEach((email, index) => {
        console.log(`${index + 1}. Status: ${email.status}, Send at: ${email.send_at}, Created: ${email.created_at}`);
      });
    }

    // If the interval is not 15 minutes, highlight the issue
    if (config.sendingInterval !== 15) {
      console.log('\n🚨 ISSUE FOUND:');
      console.log(`Expected sending interval: 15 minutes`);
      console.log(`Actual sending interval: ${config.sendingInterval} minutes`);
      console.log('This explains why emails are being sent every 2-5 minutes instead of 15 minutes.');
    } else {
      console.log('\n✅ Sending interval is correctly set to 15 minutes');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkCampaignConfig();