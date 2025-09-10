const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

async function testCampaignStart() {
  console.log('🔍 Testing campaign start API directly...');
  
  // Use hardcoded values from the backend logs we saw
  const supabaseUrl = 'https://zwfgwdykyghpbwqawkdw.supabase.co';
  const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3Zmd3ZHlreWdocGJ3cWF3a2R3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNDA5ODIwNiwiZXhwIjoyMDM5Njc0MjA2fQ.7U__FdBM2ivAo5Lwa9PJJS7Wjko_VdONfDfFOEWAFCI';
  
  const organizationId = '550e8400-e29b-41d4-a716-446655440000';
  const campaignId = '397f0b49-2a7f-49a2-a97b-eda3691de35e';
  
  try {
    // Generate proper JWT token
    console.log('🔑 Generating JWT token for API call');
    const token = jwt.sign({
      userId: '550e8400-e29b-41d4-a716-446655440001',
      organizationId: '550e8400-e29b-41d4-a716-446655440000',
      email: 'test@example.com'
    }, 'your-secret-key-change-in-production', { expiresIn: '24h' });
    
    // Make API call using curl
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);
    
    console.log('🚀 Testing API call to campaign start...');
    
    const curlCommand = `curl -X POST "http://localhost:4000/api/campaigns/${campaignId}/start" \\
      -H "Authorization: Bearer ${token}" \\
      -H "Content-Type: application/json" \\
      -v -s -w "\\nHTTP_CODE:%{http_code}\\n"`;
    
    const { stdout, stderr } = await execAsync(curlCommand);
    
    console.log('📊 Curl stdout:', stdout);
    console.log('📊 Curl stderr:', stderr);
    
    // Extract HTTP code
    const httpCodeMatch = stdout.match(/HTTP_CODE:(\d+)/);
    if (httpCodeMatch) {
      const httpCode = httpCodeMatch[1];
      console.log(`📊 Response status: ${httpCode}`);
      
      if (httpCode === '400') {
        console.error('❌ Campaign start failed with 400 Bad Request');
        // The error details should be in the JSON response
        const jsonStart = stdout.indexOf('{');
        const jsonEnd = stdout.lastIndexOf('}');
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
          const jsonResponse = stdout.substring(jsonStart, jsonEnd + 1);
          try {
            const errorObj = JSON.parse(jsonResponse);
            console.error('Error details:', JSON.stringify(errorObj, null, 2));
          } catch (e) {
            console.error('Raw response body:', jsonResponse);
          }
        }
      } else {
        console.log('✅ Campaign start API call completed');
      }
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