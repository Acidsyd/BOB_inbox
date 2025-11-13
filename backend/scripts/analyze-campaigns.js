require('dotenv').config({ path: require('path').join(__dirname, '../../backend/.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Analyze Campaigns
 * Check what old campaigns exist and can be cleaned
 */

async function analyzeCampaigns() {
  console.log('🔍 Analyzing campaigns...\n');

  try {
    // Count by status
    console.log('📊 CAMPAIGNS BY STATUS');
    console.log('─'.repeat(60));

    const statuses = ['draft', 'active', 'paused', 'completed', 'stopped', 'cancelled'];

    for (const status of statuses) {
      const { count } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('status', status);

      console.log(`${status.padEnd(15)}: ${(count || 0).toLocaleString()} campaigns`);
    }

    // Total count
    const { count: totalCount } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true });

    console.log('─'.repeat(60));
    console.log(`${'TOTAL'.padEnd(15)}: ${(totalCount || 0).toLocaleString()} campaigns`);
    console.log('\n');

    // Check old completed/stopped campaigns
    const oldDate30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const oldDate60 = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const oldDate90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    const { count: old30Count } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .in('status', ['completed', 'stopped', 'cancelled'])
      .lt('updated_at', oldDate30);

    const { count: old60Count } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .in('status', ['completed', 'stopped', 'cancelled'])
      .lt('updated_at', oldDate60);

    const { count: old90Count } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .in('status', ['completed', 'stopped', 'cancelled'])
      .lt('updated_at', oldDate90);

    console.log('💡 OLD CAMPAIGNS (by last update)');
    console.log('─'.repeat(60));
    console.log(`Completed/stopped/cancelled older than 30 days: ${(old30Count || 0).toLocaleString()}`);
    console.log(`Completed/stopped/cancelled older than 60 days: ${(old60Count || 0).toLocaleString()}`);
    console.log(`Completed/stopped/cancelled older than 90 days: ${(old90Count || 0).toLocaleString()}`);
    console.log('');

    // Check if campaigns have related data
    console.log('🔗 RELATED DATA CHECK');
    console.log('─'.repeat(60));

    // Get a sample old campaign
    const { data: sampleCampaign } = await supabase
      .from('campaigns')
      .select('id, name, status, updated_at')
      .in('status', ['completed', 'stopped', 'cancelled'])
      .lt('updated_at', oldDate90)
      .limit(1)
      .single();

    if (sampleCampaign) {
      console.log(`Sample campaign: "${sampleCampaign.name}" (${sampleCampaign.status})`);
      console.log(`Last updated: ${new Date(sampleCampaign.updated_at).toLocaleDateString()}\n`);

      // Check scheduled_emails
      const { count: scheduledCount } = await supabase
        .from('scheduled_emails')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', sampleCampaign.id);

      console.log(`Related scheduled_emails: ${scheduledCount || 0}`);
    }

    console.log('─'.repeat(60));
    console.log('\n');

    // Sample some campaigns
    const { data: samples } = await supabase
      .from('campaigns')
      .select('id, name, status, config, created_at, updated_at')
      .in('status', ['completed', 'stopped', 'cancelled'])
      .lt('updated_at', oldDate30)
      .order('updated_at', { ascending: true })
      .limit(5);

    if (samples && samples.length > 0) {
      console.log('📝 SAMPLE OLD CAMPAIGNS');
      console.log('─'.repeat(60));

      for (const campaign of samples) {
        const configSize = JSON.stringify(campaign.config).length / 1024;
        const daysSinceUpdate = Math.floor((Date.now() - new Date(campaign.updated_at).getTime()) / (24 * 60 * 60 * 1000));

        console.log(`${campaign.name}`);
        console.log(`  Status: ${campaign.status} | Config: ${configSize.toFixed(1)} KB | ${daysSinceUpdate} days old`);
      }
      console.log('─'.repeat(60));
    }

    console.log('\n');
    console.log('💾 ESTIMATED SPACE SAVINGS');
    console.log('─'.repeat(60));

    const avgConfigSize = 50; // KB average per campaign with config
    const estimatedSize90 = ((old90Count || 0) * avgConfigSize / 1024).toFixed(0);
    const estimatedSize60 = ((old60Count || 0) * avgConfigSize / 1024).toFixed(0);
    const estimatedSize30 = ((old30Count || 0) * avgConfigSize / 1024).toFixed(0);

    console.log(`Delete campaigns >90 days: ~${estimatedSize90} MB (${old90Count || 0} campaigns)`);
    console.log(`Delete campaigns >60 days: ~${estimatedSize60} MB (${old60Count || 0} campaigns)`);
    console.log(`Delete campaigns >30 days: ~${estimatedSize30} MB (${old30Count || 0} campaigns)`);
    console.log('─'.repeat(60));

    console.log('\n');
    console.log('⚠️  IMPORTANT NOTES');
    console.log('─'.repeat(60));
    console.log('1. Deleting campaigns will also delete their scheduled_emails');
    console.log('2. Conversation history is preserved (conversation_messages table)');
    console.log('3. This is irreversible - campaign configs will be lost');
    console.log('4. Consider keeping campaigns from last 60 days for reference');
    console.log('─'.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

analyzeCampaigns();
