const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

async function testCampaignStartWithHealthTable() {
  console.log('🔍 Testing campaign start with system_health table...');
  
  const supabaseUrl = 'https://zwfgwdykyghpbwqawkdw.supabase.co';
  const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3Zmd3ZHlreWdocGJ3cWF3a2R3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNDA5ODIwNiwiZXhwIjoyMDM5Njc0MjA2fQ.7U__FdBM2ivAo5Lwa9PJJS7Wjko_VdONfDfFOEWAFCI';
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const organizationId = '550e8400-e29b-41d4-a716-446655440000';
  
  try {
    // 1. Check if system_health table exists and is queryable
    console.log('📋 Checking system_health table...');
    const { data: healthData, error: healthError } = await supabase
      .from('system_health')
      .select('service, status, last_heartbeat')
      .limit(5);
    
    if (healthError) {
      console.error('❌ system_health table query failed:', healthError);
      return;
    } else {
      console.log('✅ system_health table exists and is queryable');
      console.log('📊 Current health records:');
      healthData?.forEach(record => {
        console.log(`  ${record.service}: ${record.status} (${record.last_heartbeat})`);
      });
    }
    
    // 2. Find the most recent campaign
    const { data: campaigns, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, name, status')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (campaignError || !campaigns || campaigns.length === 0) {
      console.error('❌ No campaigns found:', campaignError?.message || 'No campaigns');
      return;
    }
    
    const campaignId = campaigns[0].id;
    console.log(`✅ Found campaign: ${campaigns[0].name} (${campaignId})`);
    
    // 3. Generate JWT token
    const token = jwt.sign({
      userId: '550e8400-e29b-41d4-a716-446655440001',
      organizationId: '550e8400-e29b-41d4-a716-446655440000',
      email: 'test@example.com'
    }, 'your-super-secret-jwt-key-here', { expiresIn: '24h' });
    
    console.log('🔑 Generated JWT token for API call');
    
    // 4. Test campaign start API
    console.log(`🚀 Testing campaign start API...`);
    
    const response = await fetch(`http://localhost:4000/api/campaigns/${campaignId}/start`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`📊 Response status: ${response.status} ${response.statusText}`);
    const responseText = await response.text();
    
    if (!response.ok) {
      console.error(`❌ Campaign start failed with ${response.status}:`);
      try {
        const errorJson = JSON.parse(responseText);
        console.error('📋 Error details:', JSON.stringify(errorJson, null, 2));
      } catch (e) {
        console.error('📋 Raw error response:', responseText);
      }
    } else {
      console.log('✅ Campaign start successful!');
      try {
        const successJson = JSON.parse(responseText);
        console.log('📋 Success response:', JSON.stringify(successJson, null, 2));
      } catch (e) {
        console.log('📋 Success response (raw):', responseText);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('📋 Error stack:', error.stack);
  }
}

testCampaignStartWithHealthTable().then(() => {
  console.log('🎉 Test complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});