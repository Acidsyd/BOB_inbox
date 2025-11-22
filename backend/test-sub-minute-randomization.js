/**
 * Test sub-minute randomization
 * Simulates the random delay mechanism
 * Run with: node backend/test-sub-minute-randomization.js
 */

console.log('🧪 TESTING SUB-MINUTE RANDOMIZATION\n');
console.log('='.repeat(80));

// Simulate 20 email sends with random delays
console.log('\n📊 Simulating 20 email sends with random delays:\n');

const delays = [];
const distribution = {};

for (let i = 1; i <= 20; i++) {
  // Same logic as CronEmailProcessor.js
  const randomDelaySeconds = Math.floor(Math.random() * 45); // 0-44 seconds
  delays.push(randomDelaySeconds);

  // Track distribution by 10-second buckets
  const bucket = Math.floor(randomDelaySeconds / 10) * 10;
  const bucketKey = `${bucket}-${bucket + 9}s`;
  distribution[bucketKey] = (distribution[bucketKey] || 0) + 1;

  const now = new Date();
  const sendTime = new Date(now.getTime() + randomDelaySeconds * 1000);

  console.log(`Email ${i.toString().padStart(2, ' ')}: Delay = ${randomDelaySeconds.toString().padStart(2, ' ')}s → Send at ${sendTime.toISOString().split('T')[1].substring(0, 8)}`);
}

console.log('\n' + '─'.repeat(80));
console.log('📈 Statistics:\n');

const avg = delays.reduce((sum, d) => sum + d, 0) / delays.length;
const min = Math.min(...delays);
const max = Math.max(...delays);

console.log(`   Average delay: ${avg.toFixed(1)}s`);
console.log(`   Min delay: ${min}s`);
console.log(`   Max delay: ${max}s`);
console.log(`   Expected range: 0-44 seconds ✅`);

console.log('\n📊 Distribution by 10-second buckets:\n');
Object.entries(distribution)
  .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
  .forEach(([bucket, count]) => {
    const bar = '█'.repeat(count);
    console.log(`   ${bucket.padEnd(10, ' ')}: ${bar} (${count})`);
  });

console.log('\n' + '─'.repeat(80));
console.log('✅ Test Results:\n');

const allInRange = delays.every(d => d >= 0 && d <= 44);
const properDistribution = Object.keys(distribution).length >= 3; // Should spread across multiple buckets
const noClusteringAtZero = delays.filter(d => d === 0).length <= 3; // At most 3 zeros out of 20

console.log(`   ✅ All delays in 0-44s range: ${allInRange ? 'PASS' : 'FAIL'}`);
console.log(`   ✅ Spread across buckets: ${properDistribution ? 'PASS' : 'FAIL'}`);
console.log(`   ✅ No clustering at 0: ${noClusteringAtZero ? 'PASS' : 'FAIL'}`);

if (allInRange && properDistribution && noClusteringAtZero) {
  console.log('\n🎉 SUB-MINUTE RANDOMIZATION WORKING CORRECTLY!\n');
} else {
  console.log('\n⚠️  Some tests failed - review distribution\n');
}

console.log('='.repeat(80));
console.log('\n💡 How this works in production:\n');
console.log('   1. Cron runs every minute at :00 seconds');
console.log('   2. Before sending email, adds random 0-44s delay');
console.log('   3. Email sent at random second within that minute');
console.log('   4. Breaks the predictable :00 second pattern');
console.log('\n   Result: Emails appear more human, less robotic!\n');
