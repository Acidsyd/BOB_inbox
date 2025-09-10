const BounceDetectionService = require('./src/cron/bounceDetection');

require('dotenv').config();

async function triggerBounceDetection() {
  console.log('🚀 Manually triggering bounce detection...');
  
  const bounceService = new BounceDetectionService();
  
  try {
    // Run bounce detection immediately
    await bounceService.runBounceDetection();
    
    console.log('✅ Manual bounce detection completed');
    console.log('🔍 Check your inbox for the bounce messages now!');
    
  } catch (error) {
    console.error('❌ Manual bounce detection failed:', error);
  }
}

triggerBounceDetection().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Failed:', error);
  process.exit(1);
});