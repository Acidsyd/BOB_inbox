// Test email worker directly
require('dotenv').config();
const emailWorker = require('./src/workers/EmailWorker');

async function testEmailWorker() {
  console.log('🧪 Testing Email Worker...');
  
  try {
    // Initialize worker
    await emailWorker.initialize();
    console.log('✅ Email Worker initialized');
    
    // Manually trigger email processing
    const testJob = {
      data: {
        id: '791d88ef-dd43-4268-b1bd-ff76ca02bd79',
        campaignId: '1953bccc-475e-4f26-a03b-c3dcb17570ef',
        leadId: '5d4a49b9-4ded-497b-9514-4a70b7286e23',
        emailAccountId: '4dca7f76-08b9-477a-aadc-cb13b173ff53',
        subject: 'Test Email Subject',
        body: 'Test email body',
        organizationId: '550e8400-e29b-41d4-a716-446655440000'
      },
      progress: async (percent) => console.log(`📈 Progress: ${percent}%`)
    };
    
    console.log('🚀 Manually triggering email processing...');
    const result = await emailWorker.processEmailJob(testJob);
    console.log('✅ Email processing result:', result);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testEmailWorker();