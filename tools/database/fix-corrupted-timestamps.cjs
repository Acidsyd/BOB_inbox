/**
 * Fix corrupted scheduled_emails timestamps by:
 * 1. Identifying all corrupted records (dates > 1 month in future)
 * 2. Deleting corrupted records 
 * 3. Regenerating proper schedules using fixed CampaignScheduler
 */

require('dotenv').config({ path: './backend/.env' });
const { createClient } = require('@supabase/supabase-js');
const CampaignScheduler = require('./backend/src/utils/CampaignScheduler');
const { toLocalTimestamp } = require('./backend/src/utils/dateUtils.cjs');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixCorruptedTimestamps() {
  console.log('🔧 Starting timestamp corruption fix...\n');
  
  try {
    // Step 1: Identify corrupted scheduled_emails
    console.log('🔍 Step 1: Identifying corrupted scheduled_emails...');
    
    const now = new Date();
    const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const { data: corruptedEmails, error } = await supabase
      .from('scheduled_emails')
      .select(`
        id, campaign_id, lead_id, email_account_id, to_email, subject, content,
        send_at, sequence_step, organization_id, status, created_at
      `)
      .gt('send_at', oneMonthFromNow.toISOString())
      .eq('status', 'scheduled');

    if (error) {
      console.error('❌ Failed to fetch corrupted emails:', error);
      return;
    }

    if (!corruptedEmails || corruptedEmails.length === 0) {
      console.log('✅ No corrupted emails found (system appears healthy)');
      return;
    }

    console.log(`🚨 Found ${corruptedEmails.length} corrupted scheduled emails`);
    
    // Group by campaign for processing
    const campaignGroups = {};
    corruptedEmails.forEach(email => {
      if (!campaignGroups[email.campaign_id]) {
        campaignGroups[email.campaign_id] = [];
      }
      campaignGroups[email.campaign_id].push(email);
    });

    console.log(`📋 Affecting ${Object.keys(campaignGroups).length} campaigns`);

    // Step 2: Get campaign configurations
    console.log('\n🔍 Step 2: Fetching campaign configurations...');
    
    const campaignIds = Object.keys(campaignGroups);
    const { data: campaigns, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, config, status')
      .in('id', campaignIds);

    if (campaignError) {
      console.error('❌ Failed to fetch campaigns:', campaignError);
      return;
    }

    // Step 3: Get leads for regeneration
    console.log('\n🔍 Step 3: Fetching leads for regeneration...');
    
    const allLeadIds = [...new Set(corruptedEmails.map(e => e.lead_id))];
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, email')
      .in('id', allLeadIds);

    if (leadsError) {
      console.error('❌ Failed to fetch leads:', leadsError);
      return;
    }

    // Create lookup maps
    const campaignMap = new Map(campaigns.map(c => [c.id, c]));
    const leadsMap = new Map(leads.map(l => [l.id, l]));

    console.log(`📊 Processing ${campaignIds.length} campaigns...`);

    let totalDeleted = 0;
    let totalRegenerated = 0;

    // Step 4: Process each campaign
    for (const campaignId of campaignIds) {
      const campaign = campaignMap.get(campaignId);
      const corruptedForCampaign = campaignGroups[campaignId];
      
      console.log(`\n📋 Campaign ${campaignId.substring(0, 8)}... (${corruptedForCampaign.length} corrupted emails)`);
      
      if (!campaign) {
        console.log('   ⚠️ Campaign not found, skipping...');
        continue;
      }

      if (campaign.status !== 'active') {
        console.log(`   ℹ️ Campaign is ${campaign.status}, cleaning up without regeneration...`);
        
        // Just delete corrupted emails for inactive campaigns
        const emailIds = corruptedForCampaign.map(e => e.id);
        const { error: deleteError } = await supabase
          .from('scheduled_emails')
          .delete()
          .in('id', emailIds);
          
        if (deleteError) {
          console.error('   ❌ Failed to delete emails:', deleteError);
          continue;
        }
        
        totalDeleted += emailIds.length;
        console.log(`   ✅ Deleted ${emailIds.length} corrupted emails`);
        continue;
      }

      // Step 4a: Get unique leads for this campaign
      const campaignLeadIds = [...new Set(corruptedForCampaign.map(e => e.lead_id))];
      const campaignLeads = campaignLeadIds.map(id => leadsMap.get(id)).filter(Boolean);
      
      if (campaignLeads.length === 0) {
        console.log('   ⚠️ No leads found for campaign, skipping...');
        continue;
      }

      // Step 4b: Get email accounts for this campaign
      const emailAccountIds = [...new Set(corruptedForCampaign.map(e => e.email_account_id))];
      
      console.log(`   📧 Regenerating schedule for ${campaignLeads.length} leads with ${emailAccountIds.length} email accounts`);

      // Step 4c: Initialize scheduler with campaign config
      const config = campaign.config || {};
      const scheduler = new CampaignScheduler({
        timezone: config.timezone || 'UTC',
        emailsPerDay: config.emailsPerDay || 100,
        emailsPerHour: config.emailsPerHour || 10,
        sendingInterval: config.sendingInterval || 15,
        sendingHours: config.sendingHours || { start: 9, end: 17 },
        activeDays: config.activeDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        enableJitter: config.enableJitter !== undefined ? config.enableJitter : true,
        jitterMinutes: config.jitterMinutes || 3
      });

      // Step 4d: Generate new schedule
      const schedules = scheduler.scheduleEmails(campaignLeads, emailAccountIds);
      console.log(`   📅 Generated ${schedules.length} new schedules`);

      // Step 4e: Delete corrupted emails
      const corruptedIds = corruptedForCampaign.map(e => e.id);
      const { error: deleteError } = await supabase
        .from('scheduled_emails')
        .delete()
        .in('id', corruptedIds);
        
      if (deleteError) {
        console.error('   ❌ Failed to delete corrupted emails:', deleteError);
        continue;
      }
      
      totalDeleted += corruptedIds.length;
      console.log(`   🗑️ Deleted ${corruptedIds.length} corrupted emails`);

      // Step 4f: Create new scheduled_email records
      const newEmails = schedules.map(schedule => {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        const messageId = `<${campaignId}-${schedule.lead.id}-0-${timestamp}-${random}@mailsender.local>`;

        return {
          id: require('crypto').randomUUID(),
          campaign_id: campaignId,
          lead_id: schedule.lead.id,
          email_account_id: schedule.emailAccountId,
          to_email: schedule.lead.email,
          from_email: '',
          subject: config.emailSubject || 'Test Subject',
          content: config.emailContent || 'Test Content',
          send_at: toLocalTimestamp(schedule.sendAt),
          status: 'scheduled',
          organization_id: corruptedForCampaign[0].organization_id, // Same org as original
          message_id_header: messageId,
          sequence_step: 0,
          is_follow_up: false,
          reply_to_same_thread: false,
          created_at: toLocalTimestamp(new Date())
        };
      });

      // Step 4g: Insert new emails
      const { error: insertError } = await supabase
        .from('scheduled_emails')
        .insert(newEmails);
        
      if (insertError) {
        console.error('   ❌ Failed to insert new emails:', insertError);
        continue;
      }
      
      totalRegenerated += newEmails.length;
      console.log(`   ✅ Created ${newEmails.length} new properly scheduled emails`);
      
      // Show sample of new schedule
      const firstSchedule = schedules[0];
      const lastSchedule = schedules[schedules.length - 1];
      const timeSpan = (lastSchedule.sendAt.getTime() - firstSchedule.sendAt.getTime()) / (60 * 1000);
      
      console.log(`   📊 New schedule span: ${timeSpan.toFixed(1)} minutes`);
      console.log(`   📅 First email: ${firstSchedule.sendAt.toISOString()}`);
      console.log(`   📅 Last email: ${lastSchedule.sendAt.toISOString()}`);
    }

    // Step 5: Final report
    console.log('\n✅ TIMESTAMP CORRUPTION FIX COMPLETE');
    console.log(`📊 Summary:`);
    console.log(`   • Corrupted emails deleted: ${totalDeleted}`);
    console.log(`   • New emails created: ${totalRegenerated}`);
    console.log(`   • Campaigns processed: ${Object.keys(campaignGroups).length}`);
    
    // Verification
    console.log('\n🔍 Verification: Checking for remaining corruption...');
    const { data: remainingCorrupted, error: verifyError } = await supabase
      .from('scheduled_emails')
      .select('id')
      .gt('send_at', oneMonthFromNow.toISOString())
      .eq('status', 'scheduled');
      
    if (verifyError) {
      console.log('   ⚠️ Could not verify fix');
    } else {
      console.log(`   ${remainingCorrupted?.length || 0} corrupted emails remain`);
      if ((remainingCorrupted?.length || 0) === 0) {
        console.log('   🎉 ALL CORRUPTION FIXED!');
      }
    }

  } catch (error) {
    console.error('❌ Error during fix:', error);
  }
}

fixCorruptedTimestamps()
  .then(() => {
    console.log('\n✅ Fix process complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  });