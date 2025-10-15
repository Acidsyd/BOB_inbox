#!/usr/bin/env node

/**
 * Rate Limiting System Testing Script
 * Tests the new email account rotation and rate limiting functionality
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testRateLimitingSystem() {
  console.log('🔍 Testing Rate Limiting System...\n');

  try {
    // Test 1: Check if migration was applied
    console.log('1️⃣ Checking database schema...');
    const { data: tables } = await supabase
      .rpc('exec', {
        query: `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
            AND table_name IN ('account_rate_limits', 'account_usage_history', 'account_rotation_log')
        `
      });

    if (!tables || tables.length === 0) {
      console.error('❌ Required tables not found. Please apply the migration first.');
      return;
    }

    console.log('✅ Found tables:', tables.map(t => t.table_name).join(', '));

    // Test 2: Check enhanced email_accounts columns
    console.log('\n2️⃣ Checking enhanced email_accounts table...');
    const { data: accounts, error: accountsError } = await supabase
      .from('email_accounts')
      .select('email, daily_limit, hourly_limit, rotation_priority, health_score, status')
      .limit(3);

    if (accountsError) {
      console.error('❌ Enhanced columns check failed:', accountsError.message);
      console.log('💡 Make sure the migration was applied correctly');
      return;
    }

    console.log('✅ Enhanced accounts found:', accounts.length);
    if (accounts.length > 0) {
      console.log('Sample account:', {
        email: accounts[0].email,
        dailyLimit: accounts[0].daily_limit,
        hourlyLimit: accounts[0].hourly_limit,
        priority: accounts[0].rotation_priority,
        health: accounts[0].health_score
      });
    }

    // Test 3: Test database functions
    console.log('\n3️⃣ Testing database functions...');
    const { data: resetResult, error: resetError } = await supabase
      .rpc('reset_daily_rate_limits');
    
    if (resetError) {
      console.error('❌ Reset function failed:', resetError.message);
    } else {
      console.log('✅ Daily reset function works, affected:', resetResult, 'records');
    }

    // Test 4: Check rate limits initialization
    console.log('\n4️⃣ Checking rate limits initialization...');
    const { data: rateLimits, error: rateLimitsError } = await supabase
      .from('account_rate_limits')
      .select('*')
      .limit(5);

    if (rateLimitsError) {
      console.error('❌ Rate limits check failed:', rateLimitsError.message);
    } else {
      console.log('✅ Rate limit records found:', rateLimits.length);
      if (rateLimits.length > 0) {
        console.log('Sample rate limit:', {
          accountId: rateLimits[0].email_account_id.slice(0, 8) + '...',
          dailySent: rateLimits[0].daily_sent,
          hourlySent: rateLimits[0].hourly_sent,
          currentDate: rateLimits[0].current_date
        });
      }
    }

    // Test 5: Test get_available_accounts function
    if (accounts.length > 0) {
      console.log('\n5️⃣ Testing account availability function...');
      const orgId = accounts[0].organization_id || '00000000-0000-0000-0000-000000000000';
      
      const { data: availableAccounts, error: availableError } = await supabase
        .rpc('get_available_accounts', { org_id: orgId, required_count: 5 });

      if (availableError) {
        console.error('❌ Available accounts function failed:', availableError.message);
      } else {
        console.log('✅ Available accounts function works, found:', availableAccounts.length, 'accounts');
        availableAccounts.forEach((account, i) => {
          console.log(`  Account ${i + 1}:`, {
            email: account.email,
            dailyRemaining: account.daily_remaining,
            hourlyRemaining: account.hourly_remaining,
            healthScore: account.health_score
          });
        });
      }
    }

    // Test 6: Test record_email_sent function
    if (accounts.length > 0) {
      console.log('\n6️⃣ Testing email recording function...');
      const testAccountId = accounts[0].id;
      const testOrgId = accounts[0].organization_id || '00000000-0000-0000-0000-000000000000';
      
      const { data: recordResult, error: recordError } = await supabase
        .rpc('record_email_sent', {
          account_id: testAccountId,
          org_id: testOrgId,
          emails_count: 1
        });

      if (recordError) {
        console.error('❌ Email recording function failed:', recordError.message);
      } else {
        console.log('✅ Email recording function works, result:', recordResult);
        
        // Check if the counter was updated
        const { data: updatedLimit, error: updateError } = await supabase
          .from('account_rate_limits')
          .select('daily_sent, hourly_sent')
          .eq('email_account_id', testAccountId)
          .single();

        if (!updateError && updatedLimit) {
          console.log('✅ Counter updated - Daily:', updatedLimit.daily_sent, 'Hourly:', updatedLimit.hourly_sent);
        }
      }
    }

    console.log('\n🎉 Rate Limiting System Test Complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Start the backend: npm run dev:backend');
    console.log('2. Test email sending with rotation: npm run cron:dev');
    console.log('3. Monitor usage: npm run rate-limit:monitor');

  } catch (error) {
    console.error('❌ Test script failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testRateLimitingSystem();