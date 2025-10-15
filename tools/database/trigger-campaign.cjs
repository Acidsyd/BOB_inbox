const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();

async function triggerCampaign() {
  try {
    console.log('🔐 Creating authenticated request to trigger campaign start...');
    
    // Create a JWT token with user/organization info (based on the logs I saw earlier)
    const payload = {
      userId: 'd489a529-fe5a-40d5-bd9b-ec4ded63f87c',
      organizationId: 'e0007877-cbc8-43ef-b306-31b99b0a5cf8',
      email: 'gianpiero.difelice@gmail.com'
    };
    
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    console.log('🚀 Calling campaign start endpoint...');
    const response = await axios.post(
      'http://localhost:4000/api/campaigns/59c83ca2-3b46-4323-a78f-a43d6ba6ab27/start',
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Campaign start response:', response.data);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

triggerCampaign();
