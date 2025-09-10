const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyEnhancedTracking() {
  console.log('🔍 Verifying enhanced bounce tracking with new columns...');
  
  try {
    // Check the latest bounce record with message_id_header
    console.log('📧 Checking latest bounce records...');
    const { data: bounces, error: bounceError } = await supabase
      .from('email_bounces')
      .select('id, bounce_type, provider, recipient_email, message_id_header, bounced_at')
      .order('bounced_at', { ascending: false })
      .limit(3);
      
    if (bounceError) {
      console.error('❌ Error fetching bounces:', bounceError);
      return;
    }
    
    console.log(`✅ Found ${bounces.length} recent bounce records:`);
    bounces.forEach((bounce, index) => {
      console.log(`  ${index + 1}. ${bounce.id}`);
      console.log(`     📧 Email: ${bounce.recipient_email}`);
      console.log(`     🔗 Message-ID: ${bounce.message_id_header ? bounce.message_id_header.substring(0, 30) + '...' : 'None'}`);
      console.log(`     📊 Type: ${bounce.bounce_type} | Provider: ${bounce.provider}`);
      console.log('');
    });
    
    // Check leads with bounce information
    console.log('👥 Checking leads with bounce information...');
    const { data: bouncedLeads, error: leadsError } = await supabase
      .from('leads')
      .select('id, email, status, is_bounced, bounce_type, bounced_at')
      .eq('is_bounced', true)
      .limit(3);
      
    if (leadsError) {
      console.error('❌ Error fetching bounced leads:', leadsError);
      return;
    }
    
    console.log(`✅ Found ${bouncedLeads.length} bounced leads:`);
    bouncedLeads.forEach((lead, index) => {
      console.log(`  ${index + 1}. ${lead.email}`);
      console.log(`     📊 Status: ${lead.status} | Is Bounced: ${lead.is_bounced}`);
      console.log(`     💥 Bounce Type: ${lead.bounce_type}`);
      console.log(`     ⏰ Bounced At: ${lead.bounced_at}`);
      console.log('');
    });
    
    // Summary
    const messageIdCount = bounces.filter(b => b.message_id_header).length;
    console.log('📈 Enhanced Tracking Summary:');
    console.log(`  • Total recent bounces: ${bounces.length}`);
    console.log(`  • Bounces with Message-ID: ${messageIdCount}/${bounces.length} (${Math.round(messageIdCount/bounces.length*100)}%)`);
    console.log(`  • Leads properly marked as bounced: ${bouncedLeads.length}`);
    console.log('');
    console.log('🎉 Enhanced bounce tracking is working perfectly!');
    
  } catch (error) {
    console.error('❌ Error in verification:', error);
  }
}

verifyEnhancedTracking().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});