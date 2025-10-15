const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://rhhzxmppkmcxnwqaxeeb.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoaHp4bXBwa21jeG53cWF4ZWViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTgxNTM3OCwiZXhwIjoyMDQ1MzkxMzc4fQ.yJlJGYmGxlLqQNkxiQF3h2AhPKGhEOb3WJGjGNxX3hE');

async function checkCampaign() {
  const campaignId = 'b101fd87-9382-4fd3-8de0-1fe56938ed92';
  console.log('🔍 Checking recent email activity and campaign timing...');
  
  try {
    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();
    
    if (campaignError) {
      console.log('❌ Campaign error:', campaignError.message);
      
      // Check if ANY campaigns exist
      const { data: allCampaigns } = await supabase
        .from('campaigns')
        .select('id, name, status, created_at')
        .limit(10);
        
      console.log(`\n📋 Found ${allCampaigns?.length || 0} campaigns in system:`);
      if (allCampaigns && allCampaigns.length > 0) {
        allCampaigns.forEach(c => {
          console.log(`   🎯 ${c.name} - ${c.status} - ${c.id}`);
        });
      }
      return;
    }
    
    if (!campaign) {
      console.log('❌ Campaign not found');
      return;
    }
    
    console.log('\n🎯 Campaign Details:');
    console.log('   📝 Name:', campaign.name || 'Untitled');
    console.log('   📊 Status:', campaign.status);
    console.log('   🏢 Organization:', campaign.organization_id);
    console.log('   📅 Created:', campaign.created_at);
    console.log('   📅 Updated:', campaign.updated_at);
    
    if (campaign.config) {
      console.log('\n⚙️ Campaign Configuration:');
      console.log('   ⏱️ Sending Interval:', campaign.config.sendingInterval || 'Not set', 'minutes');
      console.log('   📧 Emails per Day:', campaign.config.emailsPerDay || 'Not set');
      console.log('   📋 Lead List ID:', campaign.config.leadListId || 'Not set');
      console.log('   📧 Email Subject:', campaign.config.emailSubject || 'Not set');
      console.log('   📧 Email Accounts:', campaign.config.emailAccounts?.length || 0);
      console.log('   🎯 Track Opens:', campaign.config.trackOpens || false);
      console.log('   🛑 Stop on Reply:', campaign.config.stopOnReply || false);
      
      if (campaign.config.emailSequence && campaign.config.emailSequence.length > 0) {
        console.log('   📬 Email Sequence:', campaign.config.emailSequence.length, 'follow-up emails');
        campaign.config.emailSequence.forEach((email, index) => {
          console.log(`      ${index + 1}. Subject: "${email.subject || 'Same as main'}" - Delay: ${email.delay} days`);
        });
      }
      
      if (campaign.config.activeDays) {
        console.log('   📅 Active Days:', campaign.config.activeDays.join(', '));
      }
      
      if (campaign.config.sendingHours) {
        console.log('   🕐 Sending Hours:', campaign.config.sendingHours.start + ':00 - ' + campaign.config.sendingHours.end + ':00');
      }
    }
    
    // Get lead list info
    if (campaign.config?.leadListId) {
      const { data: leadList } = await supabase
        .from('lead_lists')
        .select('name, created_at')
        .eq('id', campaign.config.leadListId)
        .single();
        
      if (leadList) {
        console.log('   📋 Lead List:', leadList.name, '(created:', leadList.created_at + ')');
      }
      
      // Get lead count
      const { data: leads } = await supabase
        .from('leads')
        .select('id')
        .eq('lead_list_id', campaign.config.leadListId);
        
      console.log('   👥 Total Leads:', leads?.length || 0);
    }
    
    // Get recent scheduled emails across all campaigns to check timing
    console.log('\n📬 Checking recent email activity across all campaigns...');
    const { data: recentActivity } = await supabase
      .from('scheduled_emails')
      .select('id, status, send_at, to_email, from_email, subject, sent_at, campaign_id')
      .not('sent_at', 'is', null)
      .order('sent_at', { ascending: false })
      .limit(10);
    
    if (recentActivity && recentActivity.length > 0) {
      console.log('\n⏱️ Recent email timing analysis:');
      recentActivity.forEach((email, index) => {
        const sentTime = new Date(email.sent_at);
        const campaignShort = email.campaign_id?.slice(0, 8) + '...';
        console.log(`   ${index + 1}. ${sentTime.toISOString()} - ${email.to_email} (${campaignShort})`);
      });
      
      // Check timing between consecutive emails
      console.log('\n🕐 Time intervals between consecutive emails:');
      for (let i = 0; i < Math.min(recentActivity.length - 1, 5); i++) {
        const current = recentActivity[i];
        const next = recentActivity[i + 1];
        
        if (current.sent_at && next.sent_at) {
          const timeDiff = (new Date(current.sent_at) - new Date(next.sent_at)) / (1000 * 60);
          const sameCampaign = current.campaign_id === next.campaign_id;
          console.log(`   Email ${i+1} to ${i+2}: ${Math.abs(timeDiff).toFixed(1)} minutes apart ${sameCampaign ? '(same campaign)' : '(different campaigns)'}`);
        }
      }
    }

    // Get scheduled emails for this campaign
    const { data: scheduledEmails } = await supabase
      .from('scheduled_emails')
      .select('id, status, send_at, to_email, from_email, subject, attempts, error_message, created_at, sent_at')
      .eq('campaign_id', campaignId)
      .order('send_at', { ascending: true });
    
    console.log('\n📬 Scheduled Emails Status:');
    console.log('   📊 Total emails:', scheduledEmails?.length || 0);
    
    if (scheduledEmails && scheduledEmails.length > 0) {
      const now = new Date();
      const byStatus = scheduledEmails.reduce((acc, email) => {
        acc[email.status] = (acc[email.status] || 0) + 1;
        return acc;
      }, {});
      
      console.log('\n📊 Email breakdown by status:');
      Object.entries(byStatus).forEach(([status, count]) => {
        console.log('   ', status + ':', count);
      });
      
      // Show recent sent emails
      const recentSent = scheduledEmails
        .filter(e => e.sent_at)
        .sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at))
        .slice(0, 5);
        
      if (recentSent.length > 0) {
        console.log('\n📈 Recently sent emails:');
        recentSent.forEach(email => {
          const sentTime = new Date(email.sent_at);
          const minutesAgo = Math.round((now - sentTime) / 60000);
          console.log(`   📧 ${email.to_email} - ${sentTime.toISOString()} (${minutesAgo}min ago)`);
        });
      }
      
      // Show upcoming emails
      const upcoming = scheduledEmails
        .filter(e => e.status === 'scheduled' && new Date(e.send_at) > now)
        .slice(0, 5);
        
      if (upcoming.length > 0) {
        console.log('\n⏳ Next emails to send:');
        upcoming.forEach(email => {
          const sendTime = new Date(email.send_at);
          const minutesUntil = Math.round((sendTime - now) / 60000);
          console.log(`   📧 ${email.to_email} - ${sendTime.toISOString()} (in ${minutesUntil}min)`);
        });
      }
      
      // Show overdue emails (should have been sent but status is still 'scheduled')
      const overdue = scheduledEmails.filter(e => 
        e.status === 'scheduled' && new Date(e.send_at) <= now
      );
      
      if (overdue.length > 0) {
        console.log('\n🚨 OVERDUE emails (ready to send NOW):');
        overdue.slice(0, 5).forEach(email => {
          const sendTime = new Date(email.send_at);
          const minutesLate = Math.round((now - sendTime) / 60000);
          console.log(`   📧 ${email.to_email} - ${sendTime.toISOString()} (${minutesLate}min late)`);
        });
        
        if (overdue.length > 5) {
          console.log(`   ... and ${overdue.length - 5} more overdue emails`);
        }
      }
      
      // Show failed emails
      const failed = scheduledEmails.filter(e => e.status === 'failed');
      if (failed.length > 0) {
        console.log('\n❌ Failed emails:');
        failed.slice(0, 3).forEach(email => {
          console.log(`   📧 ${email.to_email} - Error: ${email.error_message || 'Unknown error'}`);
        });
      }
    }
    
    // Check email accounts
    if (campaign.config?.emailAccounts && campaign.config.emailAccounts.length > 0) {
      console.log('\n📧 Email Accounts Status:');
      for (const accountId of campaign.config.emailAccounts) {
        // Check OAuth2 accounts first
        const { data: oauth2Account } = await supabase
          .from('oauth2_tokens')
          .select('email, status')
          .eq('id', accountId)
          .eq('organization_id', campaign.organization_id)
          .single();
          
        if (oauth2Account) {
          console.log(`   📧 ${oauth2Account.email} (OAuth2) - Status: ${oauth2Account.status}`);
        } else {
          // Check SMTP accounts
          const { data: smtpAccount } = await supabase
            .from('email_accounts')
            .select('email')
            .eq('id', accountId)
            .eq('organization_id', campaign.organization_id)
            .single();
            
          if (smtpAccount) {
            console.log(`   📧 ${smtpAccount.email} (SMTP)`);
          } else {
            console.log(`   ❌ Account ${accountId} not found`);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking campaign:', error.message);
  }
}

checkCampaign();