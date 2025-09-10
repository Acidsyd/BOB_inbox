#!/usr/bin/env node

// Debug the campaign scheduling algorithm
function debugSchedulingAlgorithm() {
  console.log('🔍 Debugging Campaign Scheduling Algorithm\n');
  
  // Test case: 2 accounts, 2-minute interval, 4 leads
  const emailAccounts = ['account1', 'account2'];
  const sendingInterval = 2; // minutes
  const leadCount = 4;
  
  console.log(`Test case: ${emailAccounts.length} accounts, ${sendingInterval} min interval, ${leadCount} leads`);
  console.log('Expected: Account rotation every 1 minute (2min / 2 accounts)\n');
  
  console.log('CURRENT BROKEN ALGORITHM:');
  const baseTime = new Date('2025-09-01T10:00:00.000Z');
  
  for (let leadIndex = 0; leadIndex < leadCount; leadIndex++) {
    const accountIndex = leadIndex % emailAccounts.length;
    const batchNumber = Math.floor(leadIndex / emailAccounts.length);
    const accountStagger = Math.floor((sendingInterval * 60 * 1000) / emailAccounts.length);
    const baseDelay = (batchNumber * sendingInterval * 60 * 1000) + (accountIndex * accountStagger);
    
    const sendTime = new Date(baseTime.getTime() + baseDelay);
    
    console.log(`Lead ${leadIndex}: Account ${accountIndex}, Batch ${batchNumber}`);
    console.log(`  accountStagger: ${accountStagger}ms = ${accountStagger/1000/60} min`);
    console.log(`  baseDelay: ${baseDelay}ms = ${baseDelay/1000/60} min`);
    console.log(`  sendTime: ${sendTime.toISOString()}\n`);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('CORRECT ALGORITHM SHOULD BE:');
  
  for (let leadIndex = 0; leadIndex < leadCount; leadIndex++) {
    const accountIndex = leadIndex % emailAccounts.length;
    const timeSlot = Math.floor(leadIndex / emailAccounts.length);
    const accountStagger = Math.floor((sendingInterval * 60 * 1000) / emailAccounts.length);
    const baseDelay = (timeSlot * sendingInterval * 60 * 1000) + (accountIndex * accountStagger);
    
    const sendTime = new Date(baseTime.getTime() + baseDelay);
    
    console.log(`Lead ${leadIndex}: Account ${accountIndex}, TimeSlot ${timeSlot}`);
    console.log(`  accountStagger: ${accountStagger}ms = ${accountStagger/1000/60} min`);
    console.log(`  baseDelay: ${baseDelay}ms = ${baseDelay/1000/60} min`);
    console.log(`  sendTime: ${sendTime.toISOString()}`);
    
    if (leadIndex > 0) {
      const prevLeadIndex = leadIndex - 1;
      const prevAccountIndex = prevLeadIndex % emailAccounts.length;
      const prevTimeSlot = Math.floor(prevLeadIndex / emailAccounts.length);
      const prevBaseDelay = (prevTimeSlot * sendingInterval * 60 * 1000) + (prevAccountIndex * accountStagger);
      const prevSendTime = new Date(baseTime.getTime() + prevBaseDelay);
      
      const gapMinutes = (sendTime.getTime() - prevSendTime.getTime()) / (1000 * 60);
      console.log(`  Gap from previous: ${gapMinutes} minutes`);
    }
    console.log();
  }
}

debugSchedulingAlgorithm();