#!/usr/bin/env node

// Trace the exact algorithm that's causing the massive gaps
function traceAlgorithmBug() {
  console.log('🐛 Tracing the Algorithm Bug\n');
  
  // Real case: 2 accounts, 2-minute interval, 10 leads
  const emailAccounts = ['d6a06ee3-68a4-4ac2-ac54-7dee98f8c8cd', '4dca7f76-08b9-477a-aadc-cb13b173ff53'];
  const sendingInterval = 2; // minutes
  const leadCount = 10;
  
  console.log(`Real case: ${emailAccounts.length} accounts, ${sendingInterval} min interval, ${leadCount} leads`);
  console.log('Expected: 1 minute between emails (2min / 2 accounts)\n');
  
  const baseTime = new Date('2025-09-01T20:51:39.992Z'); // Real creation time
  
  console.log('CURRENT ALGORITHM TRACE:');
  for (let leadIndex = 0; leadIndex < leadCount; leadIndex++) {
    const accountIndex = leadIndex % emailAccounts.length;
    const batchNumber = Math.floor(leadIndex / emailAccounts.length);
    
    // This is the current algorithm from campaigns.js line 753-754
    const accountStagger = Math.floor((sendingInterval * 60 * 1000) / emailAccounts.length); 
    const baseDelay = (batchNumber * sendingInterval * 60 * 1000) + (accountIndex * accountStagger);
    
    const sendTime = new Date(baseTime.getTime() + baseDelay);
    
    console.log(`Lead ${leadIndex}:`);
    console.log(`  accountIndex: ${accountIndex}`);
    console.log(`  batchNumber: ${batchNumber}`);
    console.log(`  accountStagger: ${accountStagger}ms = ${accountStagger/1000/60} minutes`);
    console.log(`  baseDelay: ${baseDelay}ms = ${baseDelay/1000/60} minutes`);
    console.log(`  sendTime: ${sendTime.toISOString()}`);
    
    if (leadIndex > 0) {
      const prevLeadIndex = leadIndex - 1;
      const prevAccountIndex = prevLeadIndex % emailAccounts.length;
      const prevBatchNumber = Math.floor(prevLeadIndex / emailAccounts.length);
      const prevAccountStagger = Math.floor((sendingInterval * 60 * 1000) / emailAccounts.length);
      const prevBaseDelay = (prevBatchNumber * sendingInterval * 60 * 1000) + (prevAccountIndex * prevAccountStagger);
      const prevSendTime = new Date(baseTime.getTime() + prevBaseDelay);
      
      const gapMinutes = (sendTime.getTime() - prevSendTime.getTime()) / (1000 * 60);
      console.log(`  Gap from previous: ${gapMinutes} minutes`);
      
      // Check for the massive gap issue
      if (gapMinutes > 100) {
        console.log(`  🚨 MASSIVE GAP DETECTED: ${gapMinutes} minutes!`);
        console.log(`  🔍 Analysis:`);
        console.log(`     Current: batchNumber=${batchNumber}, accountIndex=${accountIndex}`);
        console.log(`     Previous: batchNumber=${prevBatchNumber}, accountIndex=${prevAccountIndex}`);
        console.log(`     Batch multiplier: ${batchNumber} * ${sendingInterval} min = ${batchNumber * sendingInterval} min`);
        console.log(`     Account stagger: ${accountIndex} * ${accountStagger/1000/60} min = ${accountIndex * accountStagger/1000/60} min`);
      }
    }
    console.log();
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('🔧 ROOT CAUSE ANALYSIS:');
  console.log('The issue is that batchNumber increments too quickly!');
  console.log('For 2 accounts:');
  console.log('  Lead 0: batchNumber=0, accountIndex=0 → delay = 0 * 2min + 0 * 1min = 0 min');
  console.log('  Lead 1: batchNumber=0, accountIndex=1 → delay = 0 * 2min + 1 * 1min = 1 min');
  console.log('  Lead 2: batchNumber=1, accountIndex=0 → delay = 1 * 2min + 0 * 1min = 2 min ✅ CORRECT');
  console.log('  Lead 3: batchNumber=1, accountIndex=1 → delay = 1 * 2min + 1 * 1min = 3 min ✅ CORRECT');
  console.log('\nSo the algorithm is actually RIGHT for this simple case...');
  console.log('\nLet me check what might be different in the real data...');
}

traceAlgorithmBug();