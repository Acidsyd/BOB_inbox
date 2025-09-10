#!/usr/bin/env node

/**
 * Quick System Status Check for Rate Limiting System
 * 
 * This script performs a rapid health check of all components
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

async function checkSystemStatus() {
  console.log(`${colors.cyan}🔍 Email Rate Limiting System - Quick Status Check${colors.reset}`);
  console.log(`${colors.cyan}================================================${colors.reset}\n`);

  // 1. Environment Check
  console.log(`${colors.blue}📋 Environment Check:${colors.reset}`);
  
  const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
  let envOk = true;
  
  requiredEnvVars.forEach(varName => {
    if (process.env[varName]) {
      console.log(`   ✅ ${varName}: Set`);
    } else {
      console.log(`   ❌ ${varName}: Missing`);
      envOk = false;
    }
  });
  
  if (!envOk) {
    console.log(`\n${colors.red}❌ Missing environment variables. Please set them and try again.${colors.reset}`);
    return;
  }

  // 2. Database Connection Check
  console.log(`\n${colors.blue}🗄️  Database Connection Check:${colors.reset}`);
  
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    
    // Test basic connection
    const { data: testData, error: testError } = await supabase
      .from('email_accounts')
      .select('count')
      .limit(0);
    
    if (testError && testError.code === '42P01') {
      console.log(`   ❌ Database connection failed: email_accounts table not found`);
      console.log(`   💡 Run the database migration first: database_migrations/20250131_rate_limiting_schema.sql`);
      return;
    } else if (testError) {
      console.log(`   ❌ Database connection failed: ${testError.message}`);
      return;
    } else {
      console.log(`   ✅ Database connection successful`);
    }

    // Check rate limiting tables
    const { error: rateLimitError } = await supabase
      .from('account_rate_limits')
      .select('count')
      .limit(0);
    
    if (rateLimitError && rateLimitError.code === '42P01') {
      console.log(`   ❌ Rate limiting tables not found`);
      console.log(`   💡 Apply the database migration: database_migrations/20250131_rate_limiting_schema.sql`);
      return;
    } else {
      console.log(`   ✅ Rate limiting tables exist`);
    }

    // Test account usage summary view
    const { error: viewError } = await supabase
      .from('account_usage_summary')
      .select('*')
      .limit(1);
    
    if (viewError && viewError.code === '42P01') {
      console.log(`   ❌ account_usage_summary view not found`);
      console.log(`   💡 The database migration may not have completed successfully`);
    } else {
      console.log(`   ✅ Account usage summary view exists`);
    }

  } catch (error) {
    console.log(`   ❌ Database check failed: ${error.message}`);
    return;
  }

  // 3. Service Files Check
  console.log(`\n${colors.blue}⚙️  Service Files Check:${colors.reset}`);
  
  const fs = require('fs');
  const requiredFiles = [
    { path: 'backend/src/services/AccountRateLimitService.js', name: 'AccountRateLimitService' },
    { path: 'backend/src/services/CronEmailProcessor.js', name: 'Updated CronEmailProcessor' },
    { path: 'backend/src/cron/dailyReset.js', name: 'Daily Reset Cron Job' },
    { path: 'backend/src/routes/emailAccounts.js', name: 'Enhanced Email Accounts API' },
    { path: 'frontend/hooks/useEmailAccounts.ts', name: 'Enhanced useEmailAccounts Hook' }
  ];
  
  let allFilesExist = true;
  
  requiredFiles.forEach(file => {
    const fullPath = path.join(process.cwd(), file.path);
    if (fs.existsSync(fullPath)) {
      console.log(`   ✅ ${file.name}: Found`);
    } else {
      console.log(`   ❌ ${file.name}: Missing (${file.path})`);
      allFilesExist = false;
    }
  });

  // 4. Service Integration Check
  console.log(`\n${colors.blue}🔗 Service Integration Check:${colors.reset}`);
  
  try {
    const cronFile = path.join(process.cwd(), 'backend/src/services/CronEmailProcessor.js');
    const cronContent = fs.readFileSync(cronFile, 'utf8');
    
    if (cronContent.includes('AccountRateLimitService')) {
      console.log(`   ✅ CronEmailProcessor integrated with AccountRateLimitService`);
    } else {
      console.log(`   ❌ CronEmailProcessor not integrated with AccountRateLimitService`);
      allFilesExist = false;
    }
    
    if (cronContent.includes('processOrganizationEmails')) {
      console.log(`   ✅ Smart account rotation implemented`);
    } else {
      console.log(`   ❌ Smart account rotation not implemented`);
      allFilesExist = false;
    }

    const routeFile = path.join(process.cwd(), 'backend/src/routes/emailAccounts.js');
    const routeContent = fs.readFileSync(routeFile, 'utf8');
    
    if (routeContent.includes('PUT.*/:id/settings') || routeContent.includes("/settings'")) {
      console.log(`   ✅ Enhanced API endpoints implemented`);
    } else {
      console.log(`   ❌ Enhanced API endpoints not implemented`);
      allFilesExist = false;
    }

  } catch (error) {
    console.log(`   ❌ Integration check failed: ${error.message}`);
    allFilesExist = false;
  }

  // 5. Test Service Instantiation
  console.log(`\n${colors.blue}🧪 Service Test:${colors.reset}`);
  
  try {
    const AccountRateLimitService = require(path.join(process.cwd(), 'backend/src/services/AccountRateLimitService.js'));
    const service = new AccountRateLimitService();
    
    if (service && service.rotationStrategies) {
      console.log(`   ✅ AccountRateLimitService instantiated successfully`);
      console.log(`   ✅ Rotation strategies available: ${Object.keys(service.rotationStrategies).join(', ')}`);
    } else {
      console.log(`   ❌ AccountRateLimitService instantiation failed`);
    }
  } catch (error) {
    console.log(`   ❌ Service test failed: ${error.message}`);
  }

  // 6. Overall Status
  console.log(`\n${colors.cyan}📊 Overall System Status:${colors.reset}`);
  
  if (envOk && allFilesExist) {
    console.log(`   ${colors.green}🟢 System Status: READY${colors.reset}`);
    console.log(`\n${colors.green}✅ Your Email Rate Limiting System appears to be properly installed!${colors.reset}`);
    
    console.log(`\n${colors.blue}🚀 Next Steps to Test:${colors.reset}`);
    console.log(`   1. Run the comprehensive test: node test-rate-limiting-system.js`);
    console.log(`   2. Check your email accounts: Visit /settings/email-accounts in your app`);
    console.log(`   3. Create a test campaign with multiple emails`);
    console.log(`   4. Monitor the cron processor: npm run cron:dev`);
    console.log(`   5. Check database for usage tracking: SELECT * FROM account_rate_limits;`);
    
  } else {
    console.log(`   ${colors.red}🔴 System Status: INCOMPLETE${colors.reset}`);
    console.log(`\n${colors.yellow}⚠️  Some components are missing or not properly configured.${colors.reset}`);
    console.log(`   Please review the errors above and complete the installation.`);
  }
}

// Run the check
if (require.main === module) {
  checkSystemStatus().catch(error => {
    console.error(`${colors.red}💥 Status check failed: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = { checkSystemStatus };