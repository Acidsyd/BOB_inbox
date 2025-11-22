/**
 * Test script to verify Gaussian jitter distribution
 * Run with: node backend/test-jitter-distribution.js
 */

const CampaignScheduler = require('./src/utils/CampaignScheduler');

function testJitterDistribution() {
  console.log('🧪 TESTING GAUSSIAN JITTER DISTRIBUTION\n');
  console.log('='.repeat(80));

  // Create scheduler with jitter enabled
  const scheduler = new CampaignScheduler({
    timezone: 'UTC',
    enableJitter: true,
    jitterMinutes: 3,
    emailsPerDay: 100,
    sendingInterval: 15,
    sendingHours: { start: 9, end: 17 },
    activeDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
  });

  // Generate 10,000 samples
  const sampleSize = 10000;
  const baseTime = new Date('2025-01-15T10:00:00Z');
  const offsets = [];

  console.log(`\n📊 Generating ${sampleSize.toLocaleString()} jitter samples...\n`);

  for (let i = 0; i < sampleSize; i++) {
    const jitteredTime = scheduler.applyJitter(baseTime, `test${i}@example.com`);
    const offsetMinutes = (jitteredTime - baseTime) / (60 * 1000);
    offsets.push(offsetMinutes);
  }

  // Calculate statistics
  const mean = offsets.reduce((sum, val) => sum + val, 0) / offsets.length;
  const variance = offsets.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / offsets.length;
  const stdDev = Math.sqrt(variance);
  const min = Math.min(...offsets);
  const max = Math.max(...offsets);

  console.log('📈 DISTRIBUTION STATISTICS:');
  console.log('─'.repeat(80));
  console.log(`   Mean:               ${mean.toFixed(3)} minutes (should be ~0)`);
  console.log(`   Standard Deviation: ${stdDev.toFixed(3)} minutes (should be ~3)`);
  console.log(`   Min offset:         ${min.toFixed(3)} minutes`);
  console.log(`   Max offset:         ${max.toFixed(3)} minutes`);
  console.log(`   Range:              ${(max - min).toFixed(3)} minutes\n`);

  // Create histogram buckets
  const buckets = {
    'Below -10': 0,
    '-10 to -6': 0,
    '-6 to -3': 0,
    '-3 to -1': 0,
    '-1 to +1': 0,
    '+1 to +3': 0,
    '+3 to +6': 0,
    '+6 to +10': 0,
    'Above +10': 0
  };

  offsets.forEach(offset => {
    if (offset < -10) buckets['Below -10']++;
    else if (offset < -6) buckets['-10 to -6']++;
    else if (offset < -3) buckets['-6 to -3']++;
    else if (offset < -1) buckets['-3 to -1']++;
    else if (offset < 1) buckets['-1 to +1']++;
    else if (offset < 3) buckets['+1 to +3']++;
    else if (offset < 6) buckets['+3 to +6']++;
    else if (offset < 10) buckets['+6 to +10']++;
    else buckets['Above +10']++;
  });

  console.log('📊 HISTOGRAM (Gaussian bell curve expected):');
  console.log('─'.repeat(80));

  Object.entries(buckets).forEach(([range, count]) => {
    const percentage = (count / sampleSize * 100).toFixed(1);
    const barLength = Math.round(count / sampleSize * 50);
    const bar = '█'.repeat(barLength);
    console.log(`   ${range.padEnd(12)} │ ${bar} ${percentage}% (${count.toLocaleString()})`);
  });

  console.log('\n📋 EXPECTED GAUSSIAN DISTRIBUTION:');
  console.log('─'.repeat(80));
  console.log('   -1 to +1 min:  ~38% (most emails cluster near base time)');
  console.log('   -3 to +3 min:  ~68% (1 standard deviation)');
  console.log('   -6 to +6 min:  ~95% (2 standard deviations)');
  console.log('   -9 to +9 min:  ~99.7% (3 standard deviations)');

  // Validate actual distribution
  const within1Min = offsets.filter(o => Math.abs(o) <= 1).length / sampleSize * 100;
  const within3Min = offsets.filter(o => Math.abs(o) <= 3).length / sampleSize * 100;
  const within6Min = offsets.filter(o => Math.abs(o) <= 6).length / sampleSize * 100;

  console.log('\n✅ ACTUAL DISTRIBUTION:');
  console.log('─'.repeat(80));
  console.log(`   Within ±1 min: ${within1Min.toFixed(1)}% (expect ~38%)`);
  console.log(`   Within ±3 min: ${within3Min.toFixed(1)}% (expect ~68%)`);
  console.log(`   Within ±6 min: ${within6Min.toFixed(1)}% (expect ~95%)`);

  // Test for human-like patterns
  console.log('\n🎯 HUMAN-LIKE PATTERN ANALYSIS:');
  console.log('─'.repeat(80));

  const negative = offsets.filter(o => o < 0).length / sampleSize * 100;
  const positive = offsets.filter(o => o > 0).length / sampleSize * 100;
  const nearZero = offsets.filter(o => Math.abs(o) < 0.5).length / sampleSize * 100;

  console.log(`   Negative offsets: ${negative.toFixed(1)}% (should be ~50%)`);
  console.log(`   Positive offsets: ${positive.toFixed(1)}% (should be ~50%)`);
  console.log(`   Near zero (±30s): ${nearZero.toFixed(1)}% (should be ~15-20%)`);

  // Success criteria
  console.log('\n🏆 SUCCESS CRITERIA:');
  console.log('─'.repeat(80));

  const meanOk = Math.abs(mean) < 0.2;
  const stdDevOk = Math.abs(stdDev - 3) < 0.5;
  const balancedOk = Math.abs(negative - positive) < 5;
  const bellCurveOk = within1Min >= 30 && within1Min <= 45 && within3Min >= 60 && within3Min <= 75;

  console.log(`   ✓ Mean near 0:              ${meanOk ? '✅ PASS' : '❌ FAIL'} (${mean.toFixed(3)})`);
  console.log(`   ✓ Std dev near 3:           ${stdDevOk ? '✅ PASS' : '❌ FAIL'} (${stdDev.toFixed(3)})`);
  console.log(`   ✓ Balanced pos/neg:         ${balancedOk ? '✅ PASS' : '❌ FAIL'} (${Math.abs(negative - positive).toFixed(1)}% diff)`);
  console.log(`   ✓ Bell curve shape:         ${bellCurveOk ? '✅ PASS' : '❌ FAIL'}`);

  const allPassed = meanOk && stdDevOk && balancedOk && bellCurveOk;

  console.log('\n' + '='.repeat(80));
  if (allPassed) {
    console.log('🎉 ALL TESTS PASSED - Gaussian jitter distribution is working correctly!');
  } else {
    console.log('⚠️  SOME TESTS FAILED - Review distribution statistics above');
  }
  console.log('='.repeat(80) + '\n');

  return allPassed;
}

// Run test
testJitterDistribution();
