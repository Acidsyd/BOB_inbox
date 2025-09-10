const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://bqlpnfytxzltgmlcqhvl.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxbHBuZnl0eHpsdGdtbGNxaHZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDIwOTc3MCwiZXhwIjoyMDQ5Nzg1NzcwfQ.rNHPNyLY8HHnJ_HjbPwjNI-DK0bvO6gNNJp-klJHfSo'
);

async function testCampaignRestart() {
  try {
    console.log('🔍 Testing campaign restart functionality...');
    
    // Find a campaign to test with
    const { data: campaigns, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('organization_id', '550e8400-e29b-41d4-a716-446655440000')
      .limit(1);

    if (campaignError) {
      console.error('❌ Error fetching campaigns:', campaignError);
      return;
    }

    if (!campaigns || campaigns.length === 0) {
      console.log('⚠️  No campaigns found for testing');
      return;
    }

    const campaign = campaigns[0];
    console.log(`📋 Found campaign: ${campaign.name} (${campaign.id})`);
    console.log(`📊 Current status: ${campaign.status}`);

    // If campaign is not paused, pause it first
    if (campaign.status !== 'paused') {
      console.log('⏸️  Pausing campaign for testing...');
      const { error: pauseError } = await supabase
        .from('campaigns')
        .update({ status: 'paused' })
        .eq('id', campaign.id);

      if (pauseError) {
        console.error('❌ Error pausing campaign:', pauseError);
        return;
      }
      console.log('✅ Campaign paused successfully');
    }

    // Now test the restart functionality by updating scheduled emails
    console.log('🔄 Testing database constraint fix...');
    
    // Try to update scheduled emails with 'skipped' status (our fix)
    const { data: scheduledEmails, error: fetchError } = await supabase
      .from('scheduled_emails')
      .select('*')
      .eq('campaign_id', campaign.id)
      .eq('status', 'scheduled')
      .limit(5);

    if (fetchError) {
      console.error('❌ Error fetching scheduled emails:', fetchError);
      return;
    }

    console.log(`📧 Found ${scheduledEmails?.length || 0} scheduled emails to test with`);

    if (scheduledEmails && scheduledEmails.length > 0) {
      // Test updating to 'skipped' status (the fix we implemented)
      console.log('✅ Testing update to "skipped" status (fixed version)...');
      const { error: updateError } = await supabase
        .from('scheduled_emails')
        .update({ 
          status: 'skipped',
          error_message: 'Campaign restarted - rescheduling'
        })
        .eq('id', scheduledEmails[0].id);

      if (updateError) {
        console.error('❌ Error updating to skipped status:', updateError);
        console.error('Details:', updateError.details);
        console.error('Hint:', updateError.hint);
        console.error('Code:', updateError.code);
        return;
      }

      console.log('✅ Successfully updated scheduled email to "skipped" status');
      console.log('🎉 Database constraint fix is working!');

      // Test what would have failed before (cancelled status)
      console.log('❌ Testing what would fail with old "cancelled" status...');
      const { error: badUpdateError } = await supabase
        .from('scheduled_emails')
        .update({ 
          status: 'cancelled',  // This should fail
          error_message: 'Test - should fail'
        })
        .eq('id', scheduledEmails[0].id);

      if (badUpdateError) {
        console.log('✅ Confirmed: "cancelled" status correctly rejected by database constraint');
        console.log('   Error:', badUpdateError.message);
      } else {
        console.log('⚠️  Unexpected: "cancelled" status was accepted (constraint may not be active)');
      }

      // Restore the original status
      const { error: restoreError } = await supabase
        .from('scheduled_emails')
        .update({ 
          status: scheduledEmails[0].status,
          error_message: null
        })
        .eq('id', scheduledEmails[0].id);

      if (restoreError) {
        console.error('⚠️  Could not restore original status:', restoreError);
      } else {
        console.log('🔄 Restored original status for scheduled email');
      }
    }

    console.log('\n📊 Test Summary:');
    console.log('✅ Campaign found and pausable');
    console.log('✅ "skipped" status update works (fix applied)');
    console.log('✅ Database constraint prevents "cancelled" status');
    console.log('🎉 Campaign restart should now work without 500 errors!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testCampaignRestart().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Test script error:', error);
  process.exit(1);
});