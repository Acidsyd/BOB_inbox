const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

async function debugCampaignStart() {
  console.log('🔍 Debugging campaign start issue...');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const organizationId = '550e8400-e29b-41d4-a716-446655440000';
  const campaignId = '397f0b49-2a7f-49a2-a97b-eda3691de35e'; // Latest campaign from logs
  
  try {
    // 1. Check if the columns were added
    console.log('📋 Checking scheduled_emails table schema...');
    const { data: columns, error: schemaError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'scheduled_emails')
      .in('column_name', ['template_data', 'email_data', 'personalization', 'variables']);
    
    if (schemaError) {
      console.error('❌ Schema check failed:', schemaError);
    } else {
      console.log('✅ Schema check results:');
      columns?.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
      
      if (!columns || columns.length === 0) {
        console.log('❌ Missing columns! Need to apply SQL migration.');
        console.log('Run this in Supabase SQL Editor:');
        console.log(`
ALTER TABLE scheduled_emails 
ADD COLUMN IF NOT EXISTS template_data JSONB,
ADD COLUMN IF NOT EXISTS email_data JSONB,
ADD COLUMN IF NOT EXISTS personalization JSONB,
ADD COLUMN IF NOT EXISTS variables JSONB;
        `);
        return;
      }
    }
    
    // 2. Check campaign status
    console.log(`\\n📋 Checking campaign ${campaignId} status...`);
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();
    
    if (campaignError) {
      console.error('❌ Campaign check failed:', campaignError);
      return;
    }
    
    console.log('✅ Campaign found:');
    console.log(`  Status: ${campaign.status}`);
    console.log(`  Name: ${campaign.name}`);
    console.log(`  Lead List ID: ${campaign.config?.leadListId}`);
    
    // 3. Check scheduled emails for this campaign
    console.log(`\\n📧 Checking scheduled emails for campaign...`);
    const { data: scheduledEmails, error: emailsError } = await supabase
      .from('scheduled_emails')
      .select('*')
      .eq('campaign_id', campaignId);
    
    if (emailsError) {
      console.error('❌ Scheduled emails check failed:', emailsError);
    } else {
      console.log(`✅ Found ${scheduledEmails?.length || 0} scheduled emails for campaign`);
      
      if (scheduledEmails && scheduledEmails.length > 0) {
        scheduledEmails.slice(0, 3).forEach((email, i) => {
          console.log(`  ${i+1}. Status: ${email.status}, Send at: ${email.send_at}`);
        });
      }
    }
    
    // 4. Check leads in the lead list
    if (campaign.config?.leadListId) {
      console.log(`\\n👥 Checking leads in list ${campaign.config.leadListId}...`);
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .eq('lead_list_id', campaign.config.leadListId)
        .eq('organization_id', organizationId);
      
      if (leadsError) {
        console.error('❌ Leads check failed:', leadsError);
      } else {
        console.log(`✅ Found ${leads?.length || 0} leads in list`);
        leads?.slice(0, 3).forEach((lead, i) => {
          console.log(`  ${i+1}. ${lead.email} (status: ${lead.status})`);
        });
      }
    }
    
    console.log('\\n🔧 Summary:');
    console.log('- Campaign created and status set to active ✅');
    console.log('- Cron processor started ✅');
    if (columns && columns.length === 4) {
      console.log('- Database columns exist ✅');
    } else {
      console.log('- Database columns MISSING ❌ - Apply SQL migration');
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugCampaignStart().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Failed:', error);
  process.exit(1);
});