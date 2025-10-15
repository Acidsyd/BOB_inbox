#!/usr/bin/env node
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config({ path: '.env.production' });

async function testNewCampaign() {
  try {
    console.log('🔐 Creating authenticated request...');

    const payload = {
      userId: 'd489a529-fe5a-40d5-bd9b-ec4ded63f87c',
      organizationId: 'e0007877-cbc8-43ef-b306-31b99b0a5cf8',
      email: 'gianpiero.difelice@gmail.com'
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    const campaignId = '5f5a7d51-01cb-4e7b-a0fb-3bb32f424d4a'; // From user URL
    const baseUrl = 'http://localhost:4000';

    console.log('📅 Testing scheduled-activity endpoint for campaign:', campaignId);
    const response = await axios.get(
      `${baseUrl}/api/campaigns/${campaignId}/scheduled-activity`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log('✅ Scheduled activity response:');
    console.log(JSON.stringify(response.data, null, 2));

    // Also test with the previous campaign that has the test data
    console.log('\n📅 Testing with test campaign (has future emails)...');
    const testCampaignId = '59c83ca2-3b46-4323-a78f-a43d6ba6ab27';
    const testResponse = await axios.get(
      `${baseUrl}/api/campaigns/${testCampaignId}/scheduled-activity`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log('✅ Test campaign scheduled activity response:');
    console.log(JSON.stringify(testResponse.data, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testNewCampaign();
