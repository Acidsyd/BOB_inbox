// Test worker connection and manually trigger campaign processing
require('dotenv').config();
const campaignWorker = require('./src/workers/CampaignWorker');

async function testWorker() {
  console.log('🧪 Testing Campaign Worker...');
  
  try {
    // Initialize worker
    await campaignWorker.initialize();
    
    // Manually trigger campaign processing
    const testJob = {
      data: {
        campaignId: '8b874b63-35e4-48a0-bfee-f5f064898696',
        organizationId: '550e8400-e29b-41d4-a716-446655440000'
      },
      progress: async (percent) => console.log(`📈 Progress: ${percent}%`)
    };
    
    console.log('🚀 Manually triggering campaign processing...');
    const result = await campaignWorker.processCampaignLaunch(testJob);
    
    console.log('✅ Campaign processing result:', result);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testWorker();