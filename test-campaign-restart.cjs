#!/usr/bin/env node
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config({ path: '.env.production' });

async function testCampaignRestart() {
  try {
    console.log('🔐 Creating authenticated request...');

    // Create a JWT token with user/organization info from production
    const payload = {
      userId: 'd489a529-fe5a-40d5-bd9b-ec4ded63f87c',
      organizationId: 'e0007877-cbc8-43ef-b306-31b99b0a5cf8',
      email: 'gianpiero.difelice@gmail.com'
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    const campaignId = '59c83ca2-3b46-4323-a78f-a43d6ba6ab27';
    const baseUrl = 'http://104.131.93.55';

    // Step 1: Pause the campaign
    console.log('⏸️ Pausing campaign...');
    const pauseResponse = await axios.post(
      `${baseUrl}/api/campaigns/${campaignId}/pause`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log('✅ Campaign paused:', pauseResponse.data);

    // Wait a moment for the pause to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 2: Restart the campaign
    console.log('🚀 Restarting campaign...');
    const startResponse = await axios.post(
      `${baseUrl}/api/campaigns/${campaignId}/start`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log('✅ Campaign restarted:', startResponse.data);
    console.log('🔍 Campaign should now use corrected CampaignScheduler logic with proper 15-minute intervals');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testCampaignRestart();
