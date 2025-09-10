const http = require('http');

function makeAuthenticatedRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        // Use a token that matches the one from the logs
        'Authorization': token ? `Bearer ${token}` : 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDEiLCJvcmdhbml6YXRpb25JZCI6IjU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMCIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsImlhdCI6MTc1NjgxNzQwMywiZXhwIjoxNzU2OTAzODAzfQ'
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({ 
            statusCode: res.statusCode, 
            data: parsedData,
            headers: res.headers
          });
        } catch (error) {
          resolve({ 
            statusCode: res.statusCode, 
            data: responseData,
            error: 'Failed to parse JSON response'
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function testCampaignStart() {
  console.log('🔍 Testing Campaign Start Request...');
  
  try {
    const campaignId = '459a1261-6271-4bca-b694-f598ae061c3f';
    
    console.log(`\n🚀 Testing campaign start for: ${campaignId}`);
    const startResult = await makeAuthenticatedRequest('POST', `/api/campaigns/${campaignId}/start`);
    
    console.log(`Status: ${startResult.statusCode}`);
    console.log(`Response:`, JSON.stringify(startResult.data, null, 2));
    
    if (startResult.statusCode === 500) {
      console.log('\n❌ 500 ERROR DETAILS:');
      if (startResult.data && startResult.data.error) {
        console.log('Error:', startResult.data.error);
      }
      if (startResult.data && startResult.data.details) {
        console.log('Details:', startResult.data.details);
      }
      
      // Check if it's the database constraint error
      const errorString = JSON.stringify(startResult.data).toLowerCase();
      if (errorString.includes('cancelled') || errorString.includes('check constraint') || errorString.includes('violates check')) {
        console.log('\n🚨 ANALYSIS: Database constraint error detected!');
        console.log('   This suggests the fix may not have been applied correctly.');
      } else {
        console.log('\n🔍 ANALYSIS: Different error - investigating...');
      }
    } else if (startResult.statusCode === 200) {
      console.log('\n✅ SUCCESS: Campaign start worked!');
    } else if (startResult.statusCode === 401 || startResult.statusCode === 403) {
      console.log('\n🔑 AUTH ERROR: Token issue');
    }

  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

// Run the test
testCampaignStart().catch(console.error);