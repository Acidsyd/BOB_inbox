#!/usr/bin/env node
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config({ path: '.env.production' });

async function triggerProductionCampaign() {
  try {
    console.log('🔐 Creating authenticated request to trigger campaign start...');

    // Create a JWT token with user/organization info from production
    const payload = {
      userId: 'd489a529-fe5a-40d5-bd9b-ec4ded63f87c',
      organizationId: 'e0007877-cbc8-43ef-b306-31b99b0a5cf8',
      email: 'gianpiero.difelice@gmail.com'
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    console.log('🚀 Calling production campaign start endpoint...');
    const response = await axios.post(
      'http://104.131.93.55/api/campaigns/59c83ca2-3b46-4323-a78f-a43d6ba6ab27/start',
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log('✅ Campaign start response:', response.data);
    console.log('🔍 Now monitoring logs for debug output...');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);

    // If direct API call fails, try localhost (if backend is running locally on server)
    console.log('🔄 Trying localhost API call...');
    try {
      const localResponse = await axios.post(
        'http://localhost:4000/api/campaigns/59c83ca2-3b46-4323-a78f-a43d6ba6ab27/start',
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );
      console.log('✅ Localhost campaign start response:', localResponse.data);
    } catch (localError) {
      console.error('❌ Localhost error:', localError.response?.data || localError.message);
    }
  }
}

triggerProductionCampaign();