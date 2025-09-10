const { createClient } = require('@supabase/supabase-js');

async function testCampaignStart() {
  console.log('🔍 Testing campaign start API directly...');
  
  // Use hardcoded values from the backend logs we saw
  const supabaseUrl = 'https://zwfgwdykyghpbwqawkdw.supabase.co';
  const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3Zmd3ZHlreWdocGJ3cWF3a2R3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNDA5ODIwNiwiZXhwIjoyMDM5Njc0MjA2fQ.7U__FdBM2ivAo5Lwa9PJJS7Wjko_VdONfDfFOEWAFCI';
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const organizationId = '550e8400-e29b-41d4-a716-446655440000';
  const campaignId = '397f0b49-2a7f-49a2-a97b-eda3691de35e';
  
  try {
    // 1. Check if the required columns exist
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
        return;
      }
    }
    
    // 2. Test API call directly to localhost:4000
    console.log(`\n🚀 Testing API call to campaign start...`);
    
    // Get proper JWT token first
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({
      id: '53344df4-3a6b-4bd4-95a0-c754d31af3c8',
      username: 'gianpiero',
      email: 'g.difelice@gmail.com',
      organizationId: '550e8400-e29b-41d4-a716-446655440000'
    }, 'your-super-secret-jwt-key-here', { expiresIn: '24h' });
    
    console.log('🔑 Generated JWT token for API call');
    
    // Make API call
    const fetch = require('node-fetch');
    const response = await fetch(`http://localhost:4000/api/campaigns/${campaignId}/start`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`📊 Response status: ${response.status} ${response.statusText}`);
    const responseText = await response.text();
    console.log(`📄 Response body: ${responseText}`);
    
    if (!response.ok) {
      console.error(`❌ Campaign start failed with ${response.status}:`);
      try {
        const errorJson = JSON.parse(responseText);
        console.error('Error details:', errorJson);
      } catch (e) {
        console.error('Raw error:', responseText);
      }
    } else {
      console.log('✅ Campaign start successful!');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCampaignStart().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Failed:', error);
  process.exit(1);
});