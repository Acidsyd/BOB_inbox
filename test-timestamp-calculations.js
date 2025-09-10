/**
 * Test script to identify timestamp calculation issues
 * Looking for factor-of-1000 errors in time calculations
 */

console.log('🔍 Testing timestamp calculations for factor-of-1000 errors...\n');

// Test current time
const now = new Date();
console.log(`Current time: ${now.toISOString()}`);

// Test 1: CampaignScheduler line 103 - sendingInterval calculation
console.log('\n📊 Test 1: CampaignScheduler sendingInterval calculation');
const sendingInterval = 5; // 5 minutes
const correctInterval = sendingInterval * 60 * 1000; // Should be 300,000ms = 5 minutes
const wrongInterval1 = sendingInterval * 1000; // Would be 5,000ms = 5 seconds
const wrongInterval2 = sendingInterval * 60 * 60 * 1000; // Would be 18,000,000ms = 5 hours

console.log(`  5 minutes should be: ${correctInterval}ms (${correctInterval/1000/60} minutes)`);
console.log(`  Wrong calc (no *60): ${wrongInterval1}ms (${wrongInterval1/1000} seconds)`);
console.log(`  Wrong calc (*60*60): ${wrongInterval2}ms (${wrongInterval2/1000/60/60} hours)`);

const futureTime1 = new Date(now.getTime() + correctInterval);
const futureTime2 = new Date(now.getTime() + wrongInterval2);

console.log(`  Current + 5min (correct): ${futureTime1.toISOString()}`);
console.log(`  Current + wrong calc: ${futureTime2.toISOString()}`);
console.log(`  Difference: ${(futureTime2.getTime() - futureTime1.getTime()) / 1000 / 60 / 60} hours`);

// Test 2: CampaignScheduler line 228 - jitter offset calculation  
console.log('\n📊 Test 2: CampaignScheduler jitter offset calculation');
const jitterMinutes = 3;
const offsetMinutes = 2.5; // Example offset
const correctOffset = offsetMinutes * 60 * 1000;
const wrongOffset = offsetMinutes * 1000;

console.log(`  Jitter offset ${offsetMinutes} minutes should be: ${correctOffset}ms`);
console.log(`  Wrong jitter calc: ${wrongOffset}ms`);

const jitteredTime1 = new Date(now.getTime() + correctOffset);
const jitteredTime2 = new Date(now.getTime() + wrongOffset);

console.log(`  Current + correct jitter: ${jitteredTime1.toISOString()}`);
console.log(`  Current + wrong jitter: ${jitteredTime2.toISOString()}`);

// Test 3: CronEmailProcessor reschedule calculations
console.log('\n📊 Test 3: CronEmailProcessor reschedule calculations');
const intervalMinutes = 15;
const startIndex = 0;
const emailIndex = 5; // 6th email in sequence

// Line 974 & 1004: rescheduleTime calculation
const baseTime = new Date();
const correctReschedule = new Date(baseTime.getTime() + ((startIndex + emailIndex) * intervalMinutes * 60 * 1000));
const wrongReschedule1 = new Date(baseTime.getTime() + ((startIndex + emailIndex) * intervalMinutes * 1000));
const wrongReschedule2 = new Date(baseTime.getTime() + ((startIndex + emailIndex) * intervalMinutes * 60 * 60 * 1000));

console.log(`  Email #${emailIndex + 1} reschedule calculation:`);
console.log(`  Base time: ${baseTime.toISOString()}`);
console.log(`  Correct (+${emailIndex * intervalMinutes}min): ${correctReschedule.toISOString()}`);
console.log(`  Wrong (no *60): ${wrongReschedule1.toISOString()}`);
console.log(`  Wrong (*60*60): ${wrongReschedule2.toISOString()}`);

const yearsDiff = (wrongReschedule2.getTime() - correctReschedule.getTime()) / (1000 * 60 * 60 * 24 * 365);
console.log(`  Wrong calc is ${yearsDiff.toFixed(1)} years ahead!`);

// Test 4: Check for potential seconds vs milliseconds confusion
console.log('\n📊 Test 4: Seconds vs Milliseconds confusion');
const delayDays = 3; // Follow-up email delay
const correctFollowUpDelay = delayDays * 24 * 60 * 60 * 1000; // Days to milliseconds
const wrongFollowUpDelay = delayDays * 24 * 60 * 60; // Days to seconds (missing *1000)

console.log(`  ${delayDays} days should be: ${correctFollowUpDelay}ms (${correctFollowUpDelay/1000/60/60/24} days)`);
console.log(`  Wrong calc (seconds): ${wrongFollowUpDelay}ms (${wrongFollowUpDelay/1000/60/60/24} days)`);

const followUpTime1 = new Date(now.getTime() + correctFollowUpDelay);
const followUpTime2 = new Date(now.getTime() + wrongFollowUpDelay);

console.log(`  Current + 3 days (correct): ${followUpTime1.toISOString()}`);  
console.log(`  Current + wrong calc: ${followUpTime2.toISOString()}`);

// Test 5: Edge case - what if intervalMinutes is accidentally in seconds?
console.log('\n📊 Test 5: Edge case - intervalMinutes value confusion');
const supposedMinutes = 300; // What if this is actually seconds (5 minutes)?
const actualMinutes = 5;

const timeIfMinutes = new Date(now.getTime() + (supposedMinutes * 60 * 1000));
const timeIfSeconds = new Date(now.getTime() + (supposedMinutes * 1000));

console.log(`  If ${supposedMinutes} is minutes: ${timeIfMinutes.toISOString()}`);
console.log(`  If ${supposedMinutes} is seconds: ${timeIfSeconds.toISOString()}`);
console.log(`  Years difference: ${((timeIfMinutes.getTime() - timeIfSeconds.getTime()) / (1000 * 60 * 60 * 24 * 365)).toFixed(1)} years`);

console.log('\n✅ Timestamp calculation test complete');