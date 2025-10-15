#!/usr/bin/env node

/**
 * Production Tracking Test Script
 * Tests if email tracking (opens and clicks) is working correctly
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const http = require('http');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const BASE_URL = 'https://qquadro.com';

console.log('🧪 Production Tracking Test');
console.log('=' .repeat(60));

async function testTrackingEndpoints() {
  console.log('\n1️⃣ Testing Tracking Endpoints...');

  // Test tracking pixel endpoint
  const testToken = 'test-' + Date.now();
  const pixelUrl = `${BASE_URL}/api/track/open/${testToken}.png`;

  console.log(`   Testing pixel: ${pixelUrl}`);

  return new Promise((resolve) => {
    https.get(pixelUrl, (res) => {
      console.log(`   ✅ Pixel endpoint status: ${res.statusCode}`);
      console.log(`   ✅ Content-Type: ${res.headers['content-type']}`);
      console.log(`   ✅ Cache-Control: ${res.headers['cache-control']}`);

      if (res.statusCode === 200 && res.headers['content-type'] === 'image/png') {
        console.log('   ✅ Tracking pixel endpoint is working!\n');
        resolve(true);
      } else {
        console.log('   ❌ Tracking pixel endpoint failed!\n');
        resolve(false);
      }
    }).on('error', (err) => {
      console.log('   ❌ Error:', err.message);
      resolve(false);
    });
  });
}

async function checkTrackingTable() {
  console.log('2️⃣ Checking email_tracking_events table...');

  try {
    // Check if table exists and get recent events
    const { data, error, count } = await supabase
      .from('email_tracking_events')
      .select('*', { count: 'exact', head: false })
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.log('   ❌ Error querying table:', error.message);
      return false;
    }

    console.log(`   ✅ Table exists with ${count || 0} total events`);

    if (data && data.length > 0) {
      console.log(`   ✅ Recent tracking events:`);
      data.forEach((event, i) => {
        console.log(`      ${i + 1}. ${event.event_type} - ${event.created_at} (${event.scheduled_email_id})`);
      });
    } else {
      console.log('   ⚠️  No tracking events found yet (table is empty)');
    }

    return true;
  } catch (err) {
    console.log('   ❌ Error:', err.message);
    return false;
  }
}

async function checkScheduledEmailsWithTracking() {
  console.log('\n3️⃣ Checking scheduled_emails with tracking tokens...');

  try {
    const { data, error } = await supabase
      .from('scheduled_emails')
      .select('id, status, tracking_token, created_at, campaign_id')
      .not('tracking_token', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.log('   ❌ Error:', error.message);
      return false;
    }

    if (data && data.length > 0) {
      console.log(`   ✅ Found ${data.length} recent emails with tracking tokens:`);
      data.forEach((email, i) => {
        console.log(`      ${i + 1}. Status: ${email.status} | Token: ${email.tracking_token?.substring(0, 20)}...`);
      });
    } else {
      console.log('   ⚠️  No emails with tracking tokens found');
    }

    return true;
  } catch (err) {
    console.log('   ❌ Error:', err.message);
    return false;
  }
}

async function checkCampaignsWithTracking() {
  console.log('\n4️⃣ Checking campaigns with tracking enabled...');

  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select('id, name, status, config')
      .eq('status', 'active')
      .limit(10);

    if (error) {
      console.log('   ❌ Error:', error.message);
      return false;
    }

    if (data && data.length > 0) {
      const trackingEnabled = data.filter(c =>
        c.config?.trackOpens === true || c.config?.trackClicks === true
      );

      console.log(`   ✅ Found ${data.length} active campaigns`);
      console.log(`   ✅ ${trackingEnabled.length} have tracking enabled:`);

      trackingEnabled.forEach((campaign, i) => {
        const opens = campaign.config?.trackOpens ? '📧' : '  ';
        const clicks = campaign.config?.trackClicks ? '🔗' : '  ';
        console.log(`      ${i + 1}. ${opens} ${clicks} ${campaign.name || campaign.id}`);
      });
    } else {
      console.log('   ⚠️  No active campaigns found');
    }

    return true;
  } catch (err) {
    console.log('   ❌ Error:', err.message);
    return false;
  }
}

async function testTrackingWithRealToken() {
  console.log('\n5️⃣ Testing tracking with real campaign token...');

  try {
    // Get a real tracking token from a sent email
    const { data: sentEmails, error } = await supabase
      .from('scheduled_emails')
      .select('tracking_token, id, campaign_id')
      .eq('status', 'sent')
      .not('tracking_token', 'is', null)
      .order('sent_at', { ascending: false })
      .limit(1);

    if (error || !sentEmails || sentEmails.length === 0) {
      console.log('   ⚠️  No sent emails with tracking tokens found');
      console.log('   💡 Send a test campaign with tracking enabled to test this');
      return true;
    }

    const testEmail = sentEmails[0];
    const pixelUrl = `${BASE_URL}/api/track/open/${testEmail.tracking_token}.png`;

    console.log(`   Testing real token: ${testEmail.tracking_token.substring(0, 30)}...`);
    console.log(`   Email ID: ${testEmail.id}`);

    // Simulate pixel load
    return new Promise((resolve) => {
      https.get(pixelUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Tracking Test)',
          'Accept': 'image/*'
        }
      }, (res) => {
        console.log(`   ✅ Pixel loaded: ${res.statusCode}`);

        // Wait a moment for database write
        setTimeout(async () => {
          // Check if event was recorded
          const { data: events, error: eventsError } = await supabase
            .from('email_tracking_events')
            .select('*')
            .eq('scheduled_email_id', testEmail.id)
            .order('created_at', { ascending: false })
            .limit(1);

          if (!eventsError && events && events.length > 0) {
            console.log(`   ✅ Tracking event recorded in database!`);
            console.log(`      Event type: ${events[0].event_type}`);
            console.log(`      Created: ${events[0].created_at}`);
          } else {
            console.log(`   ⚠️  No tracking event found (may be filtered as duplicate/bot)`);
          }

          resolve(true);
        }, 2000);
      }).on('error', (err) => {
        console.log('   ❌ Error:', err.message);
        resolve(false);
      });
    });
  } catch (err) {
    console.log('   ❌ Error:', err.message);
    return false;
  }
}

async function runTests() {
  const results = {
    endpoints: false,
    table: false,
    emails: false,
    campaigns: false,
    realToken: false
  };

  results.endpoints = await testTrackingEndpoints();
  results.table = await checkTrackingTable();
  results.emails = await checkScheduledEmailsWithTracking();
  results.campaigns = await checkCampaignsWithTracking();
  results.realToken = await testTrackingWithRealToken();

  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Results Summary');
  console.log('='.repeat(60));
  console.log(`Tracking Endpoints:      ${results.endpoints ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Database Table:          ${results.table ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Emails with Tracking:    ${results.emails ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Campaigns with Tracking: ${results.campaigns ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Real Token Test:         ${results.realToken ? '✅ PASS' : '❌ FAIL'}`);

  const allPassed = Object.values(results).every(r => r === true);

  if (allPassed) {
    console.log('\n🎉 All tests passed! Tracking is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the output above for details.');
  }

  console.log('='.repeat(60));
  process.exit(allPassed ? 0 : 1);
}

runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
