#!/usr/bin/env node

// Test the EXACT algorithm from the actual code
function testDirectAlgorithm() {
  console.log('🧪 Testing EXACT Algorithm from campaigns.js\n');
  
  // Simulate the exact code flow
  const sendingInterval = 4; // 4 minutes
  const emailAccounts = ['acc1', 'acc2']; // 2 accounts
  const leadCount = 5;
  
  console.log(`Settings: ${sendingInterval} min interval, ${emailAccounts.length} accounts, ${leadCount} leads\n`);
  
  // This is the EXACT code from campaigns.js lines 750-752
  for (let leadIndex = 0; leadIndex < leadCount; leadIndex++) {
    const accountIndex = leadIndex % emailAccounts.length;
    // Each lead gets sent at interval * leadIndex (one email per interval for the campaign)
    const baseDelay = leadIndex * sendingInterval * 60 * 1000; // Convert minutes to milliseconds
    
    let cumulativeDelay = baseDelay; // Start with base delay for the lead
    
    // Simulate the allEmails.forEach loop (line 758)
    const allEmails = [{subject: 'Initial email'}]; // Only initial email after fix
    
    allEmails.forEach((email, emailIndex) => {
      // Skip follow-up emails for now - they'll be scheduled when initial email is sent
      if (emailIndex > 0) {
        return; // Skip follow-ups in the initial scheduling
      }
      
      const scheduledAt = new Date(Date.now() + cumulativeDelay);
      
      console.log(`Lead ${leadIndex}:`);
      console.log(`  Account: ${emailAccounts[accountIndex]}`);
      console.log(`  baseDelay: ${baseDelay}ms = ${baseDelay/1000/60} minutes`);
      console.log(`  cumulativeDelay: ${cumulativeDelay}ms = ${cumulativeDelay/1000/60} minutes`);  
      console.log(`  scheduledAt: ${scheduledAt.toISOString()}`);
      
      if (leadIndex > 0) {
        const prevDelay = (leadIndex - 1) * sendingInterval * 60 * 1000;
        const gap = (cumulativeDelay - prevDelay) / (1000 * 60);
        console.log(`  Gap from previous: ${gap} minutes`);
        
        if (gap === sendingInterval) {
          console.log(`  ✅ CORRECT: Gap matches interval`);
        } else {
          console.log(`  ❌ WRONG: Expected ${sendingInterval} minutes`);
        }
      }
      console.log();
    });
  }
  
  console.log('🔍 Analysis:');
  console.log('If this shows correct gaps, then the issue is old data in the database');
  console.log('If this shows wrong gaps, then there\'s still a bug in the algorithm');
}

testDirectAlgorithm();