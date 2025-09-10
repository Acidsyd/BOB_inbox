#!/usr/bin/env node

// Test the CORRECT scheduling logic
function testCorrectLogic() {
  console.log('🔧 Testing CORRECT Scheduling Logic\n');
  
  console.log('CORRECT UNDERSTANDING:');
  console.log('- sendingInterval = time between emails from SAME account');
  console.log('- NOT time between consecutive emails from different accounts\n');
  
  // Test case 1: 2 accounts, 2-minute interval
  console.log('TEST CASE 1: 2 accounts, 2-minute interval');
  console.log('CORRECT: Account A sends every 2 minutes, Account B sends every 2 minutes');
  console.log('Timeline: A@0min, B@0min, A@2min, B@2min, A@4min, B@4min');
  console.log('OR staggered: A@0min, B@1min, A@2min, B@3min (1min stagger)\n');
  
  testAlgorithm(2, 2, 6, 'staggered');
  
  console.log('\n' + '='.repeat(50));
  
  // Test case 2: 3 accounts, 15-minute interval
  console.log('TEST CASE 2: 3 accounts, 15-minute interval');
  console.log('CORRECT: Each account sends every 15 minutes');
  console.log('Timeline: A@0min, B@5min, C@10min, A@15min, B@20min, C@25min\n');
  
  testAlgorithm(3, 15, 6, 'staggered');
}

function testAlgorithm(accountCount, sendingInterval, leadCount, mode) {
  const baseTime = new Date('2025-09-01T10:00:00.000Z');
  
  console.log(`Accounts: ${accountCount}, Interval: ${sendingInterval} min, Leads: ${leadCount}`);
  
  if (mode === 'staggered') {
    // STAGGERED: Distribute accounts within the interval
    const accountStagger = sendingInterval / accountCount;
    console.log(`Account stagger: ${accountStagger} min\n`);
    
    for (let leadIndex = 0; leadIndex < leadCount; leadIndex++) {
      const accountIndex = leadIndex % accountCount;
      const roundNumber = Math.floor(leadIndex / accountCount);
      
      // Each round starts after sendingInterval, accounts staggered within
      const baseDelay = roundNumber * sendingInterval; // Full interval between rounds
      const accountDelay = accountIndex * accountStagger; // Stagger within round
      const totalDelayMinutes = baseDelay + accountDelay;
      
      const sendTime = new Date(baseTime.getTime() + (totalDelayMinutes * 60 * 1000));
      
      console.log(`Lead ${leadIndex}: Account ${accountIndex+1}, Round ${roundNumber} → ${totalDelayMinutes}min (${sendTime.toISOString()})`);
      
      if (leadIndex > 0) {
        const prevLeadIndex = leadIndex - 1;
        const prevAccountIndex = prevLeadIndex % accountCount;
        const prevRoundNumber = Math.floor(prevLeadIndex / accountCount);
        const prevBaseDelay = prevRoundNumber * sendingInterval;
        const prevAccountDelay = prevAccountIndex * accountStagger;
        const prevTotalDelayMinutes = prevBaseDelay + prevAccountDelay;
        
        const gap = totalDelayMinutes - prevTotalDelayMinutes;
        console.log(`  Gap from previous: ${gap} minutes`);
      }
    }
  }
}

testCorrectLogic();