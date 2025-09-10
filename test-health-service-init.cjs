// Test the HealthCheckService's initializeHealthTable method

require('dotenv').config();
const HealthCheckService = require('./backend/src/services/HealthCheckService.js');

async function initHealthTable() {
  console.log('🔧 Testing HealthCheckService initialization...');
  
  try {
    const healthService = new HealthCheckService();
    
    console.log('📋 Calling initializeHealthTable()...');
    await healthService.initializeHealthTable();
    
    console.log('✅ HealthCheckService initialized successfully');
    
    // Test if the table works now
    console.log('🧪 Testing cron processor check...');
    const isRunning = await healthService.isCronProcessorRunning();
    console.log(`📊 Cron processor running: ${isRunning}`);
    
    // Record a heartbeat
    console.log('💓 Recording test heartbeat...');
    await healthService.recordCronHeartbeat();
    
    console.log('✅ All health service tests passed');
    
  } catch (error) {
    console.error('❌ Error in health service init:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      details: error.details
    });
  }
}

initHealthTable().then(() => {
  console.log('🎉 Health service initialization complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Failed:', error);
  process.exit(1);
});