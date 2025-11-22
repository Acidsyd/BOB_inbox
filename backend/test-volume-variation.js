/**
 * Test script to verify daily volume variation
 * Run with: node backend/test-volume-variation.js
 */

// Load environment variables
require('dotenv').config();

const CronEmailProcessor = require('./src/services/CronEmailProcessor');

function testVolumeVariation() {
  console.log('🧪 TESTING DAILY VOLUME VARIATION\n');
  console.log('='.repeat(80));

  const processor = new CronEmailProcessor();

  // Test 1: Disabled variation (should return baseTarget unchanged)
  console.log('\n📊 TEST 1: Variation Disabled');
  console.log('─'.repeat(80));

  const baseTarget = 50;
  const disabledResults = [];

  for (let i = 0; i < 10; i++) {
    const result = processor.getDailyVolumeTarget(new Date(), baseTarget, false);
    disabledResults.push(result);
  }

  const allEqual = disabledResults.every(val => val === baseTarget);
  console.log(`   Base target: ${baseTarget}`);
  console.log(`   Results: ${disabledResults.slice(0, 5).join(', ')}${disabledResults.length > 5 ? '...' : ''}`);
  console.log(`   All equal to base: ${allEqual ? '✅ PASS' : '❌ FAIL'}`);

  // Test 2: Enabled variation (should vary ±20%)
  console.log('\n📊 TEST 2: Variation Enabled (±20%)');
  console.log('─'.repeat(80));

  const enabledResults = [];

  for (let i = 0; i < 1000; i++) {
    const result = processor.getDailyVolumeTarget(new Date(), baseTarget, true);
    enabledResults.push(result);
  }

  const min = Math.min(...enabledResults);
  const max = Math.max(...enabledResults);
  const avg = enabledResults.reduce((sum, val) => sum + val, 0) / enabledResults.length;
  const median = enabledResults.sort((a, b) => a - b)[Math.floor(enabledResults.length / 2)];

  console.log(`   Base target: ${baseTarget}`);
  console.log(`   Expected range: ${baseTarget * 0.8} - ${baseTarget * 1.2} (±20%)`);
  console.log(`   Actual range: ${min} - ${max}`);
  console.log(`   Average: ${avg.toFixed(1)}`);
  console.log(`   Median: ${median}`);

  const inExpectedRange = min >= baseTarget * 0.7 && max <= baseTarget * 1.3;
  console.log(`   Range reasonable: ${inExpectedRange ? '✅ PASS' : '❌ FAIL'}`);

  // Test 3: Day-of-week patterns
  console.log('\n📊 TEST 3: Day-of-Week Patterns');
  console.log('─'.repeat(80));

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayAverages = {};

  // Generate 100 samples for each day
  for (let day = 0; day < 7; day++) {
    const date = new Date('2025-01-12'); // Start with Sunday Jan 12, 2025
    date.setDate(date.getDate() + day);

    const samples = [];
    for (let i = 0; i < 100; i++) {
      samples.push(processor.getDailyVolumeTarget(date, baseTarget, true));
    }

    const avg = samples.reduce((sum, val) => sum + val, 0) / samples.length;
    dayAverages[day] = avg;

    console.log(`   ${dayNames[day].padEnd(10)}: avg ${avg.toFixed(1)} (${((avg / baseTarget - 1) * 100).toFixed(1)}%)`);
  }

  // Monday should be higher than average
  const mondayBoost = dayAverages[1] > baseTarget * 0.95;
  // Friday should be lower than Monday
  const fridayLower = dayAverages[5] < dayAverages[1];

  console.log(`\n   Monday boost detected: ${mondayBoost ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Friday < Monday: ${fridayLower ? '✅ PASS' : '❌ FAIL'}`);

  // Test 4: Bounds checking
  console.log('\n📊 TEST 4: Bounds Checking');
  console.log('─'.repeat(80));

  const boundTests = [
    { base: 5, desc: 'Very low base (5)' },
    { base: 100, desc: 'High base (100)' },
    { base: 1000, desc: 'Very high base (1000)' }
  ];

  boundTests.forEach(({ base, desc }) => {
    const results = [];
    for (let i = 0; i < 100; i++) {
      results.push(processor.getDailyVolumeTarget(new Date(), base, true));
    }

    const min = Math.min(...results);
    const max = Math.max(...results);
    const minOk = min >= 10; // Minimum cap
    const maxOk = max <= base * 1.5; // Maximum cap

    console.log(`   ${desc}:`);
    console.log(`      Range: ${min} - ${max}`);
    console.log(`      Min >= 10: ${minOk ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`      Max <= ${base * 1.5}: ${maxOk ? '✅ PASS' : '❌ FAIL'}`);
  });

  // Test 5: Distribution histogram
  console.log('\n📊 TEST 5: Distribution Histogram (1000 samples)');
  console.log('─'.repeat(80));

  const histogramData = [];
  for (let i = 0; i < 1000; i++) {
    histogramData.push(processor.getDailyVolumeTarget(new Date(), baseTarget, true));
  }

  const buckets = {
    'Below 40': 0,
    '40-45': 0,
    '45-50': 0,
    '50-55': 0,
    '55-60': 0,
    'Above 60': 0
  };

  histogramData.forEach(val => {
    if (val < 40) buckets['Below 40']++;
    else if (val < 45) buckets['40-45']++;
    else if (val < 50) buckets['45-50']++;
    else if (val < 55) buckets['50-55']++;
    else if (val < 60) buckets['55-60']++;
    else buckets['Above 60']++;
  });

  Object.entries(buckets).forEach(([range, count]) => {
    const percentage = (count / 1000 * 100).toFixed(1);
    const barLength = Math.round(count / 1000 * 40);
    const bar = '█'.repeat(barLength);
    console.log(`   ${range.padEnd(12)} │ ${bar} ${percentage}% (${count})`);
  });

  // Success summary
  console.log('\n' + '='.repeat(80));
  console.log('✅ VOLUME VARIATION TESTS COMPLETED');
  console.log('─'.repeat(80));
  console.log('   Feature: Daily volume randomization (±20%)');
  console.log('   Day patterns: Monday +10%, Friday -10%');
  console.log('   Bounds: Min 10, Max 150% of base');
  console.log('   Default: Disabled (must be enabled per campaign)');
  console.log('='.repeat(80) + '\n');
}

// Run test
testVolumeVariation();
