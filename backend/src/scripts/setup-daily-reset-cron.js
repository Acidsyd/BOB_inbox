#!/usr/bin/env node

/**
 * Setup Daily Reset Cron Job Script
 * 
 * This script helps set up the daily reset cron job for rate limiting.
 * It provides instructions and can optionally set up PM2 scheduling.
 */

const path = require('path');
const fs = require('fs');

console.log('🕒 Setting up Daily Reset Cron Job for Email Rate Limiting');
console.log('='.repeat(60));

const scriptPath = path.join(__dirname, '../cron/dailyReset.js');
const projectRoot = path.resolve(__dirname, '../../../');

console.log(`\n📂 Project root: ${projectRoot}`);
console.log(`📂 Daily reset script: ${scriptPath}`);

// Check if the daily reset script exists
if (!fs.existsSync(scriptPath)) {
  console.error('❌ Daily reset script not found!');
  console.error(`Expected: ${scriptPath}`);
  process.exit(1);
}

console.log('\n✅ Daily reset script found and ready to use');

console.log('\n🛠️ Setup Options:');
console.log('\n1. Manual Crontab Setup (Recommended for production)');
console.log('   Add this line to your crontab (crontab -e):');
console.log(`   0 0 * * * cd ${projectRoot} && node ${scriptPath}`);

console.log('\n2. PM2 Scheduled Job (Good for development/testing)');
console.log('   Run this command:');
console.log(`   pm2 start ${scriptPath} --cron="0 0 * * *" --name="daily-reset" --no-autorestart`);

console.log('\n3. Manual Testing');
console.log('   Test the daily reset job manually:');
console.log(`   cd ${projectRoot} && node ${scriptPath}`);

console.log('\n📋 Environment Variables Required:');
console.log('   - SUPABASE_URL');
console.log('   - SUPABASE_SERVICE_KEY');

console.log('\n⚠️  Important Notes:');
console.log('   - The job runs at midnight (00:00) every day');
console.log('   - Make sure your environment variables are available');
console.log('   - The job will reset daily email counters for all accounts');
console.log('   - Check logs to ensure the job runs successfully');

console.log('\n🔍 Testing the Setup:');
console.log('   1. Run the manual test command above');
console.log('   2. Check the output for successful reset');
console.log('   3. Verify in your database that daily_sent counters are reset');

console.log('\n📊 Monitoring:');
console.log('   - Check daily logs for job execution');
console.log('   - Monitor the account_rate_limits table');
console.log('   - Set up alerts for job failures');

// Ask if user wants to test the job now
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('\n❓ Would you like to test the daily reset job now? (y/n): ', (answer) => {
  if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
    console.log('\n🧪 Running daily reset job test...');
    
    // Change to project root and run the script
    process.chdir(projectRoot);
    
    const { spawn } = require('child_process');
    const testProcess = spawn('node', [scriptPath], { stdio: 'inherit' });
    
    testProcess.on('close', (code) => {
      if (code === 0) {
        console.log('\n✅ Daily reset job test completed successfully!');
      } else {
        console.log(`\n❌ Daily reset job test failed with exit code ${code}`);
      }
      rl.close();
    });
    
    testProcess.on('error', (error) => {
      console.error('\n❌ Failed to run daily reset job test:', error);
      rl.close();
    });
  } else {
    console.log('\n👍 Setup complete! Remember to set up the cron job using one of the methods above.');
    rl.close();
  }
});

// Add package.json script suggestions
console.log('\n📦 Suggested package.json scripts to add:');
console.log(`
"scripts": {
  "reset:daily": "node backend/src/cron/dailyReset.js",
  "cron:setup": "node backend/src/scripts/setup-daily-reset-cron.js"
}
`);

process.on('exit', () => {
  console.log('\n🎯 Daily reset cron job setup complete!');
});