/**
 * Trace exactly what happens during campaign creation to identify where
 * the correct schedule.sendAt values get corrupted into far-future dates
 */

require('dotenv').config({ path: './backend/.env' });
const CampaignScheduler = require('./backend/src/utils/CampaignScheduler');
const { toLocalTimestamp } = require('./backend/src/utils/dateUtils.cjs');

console.log('🔍 Tracing campaign creation process step-by-step...\n');

// Mock the exact data from the real campaign
const campaign = {
  id: 'b230ec50-07e3-4445-8c67-029977d9f576',
  config: {
    timezone: 'UTC',
    emailsPerDay: 50,
    emailsPerHour: 5,
    sendingInterval: 15,
    sendingHours: { start: 9, end: 17 },
    activeDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    emailSubject: 'Test Subject',
    emailContent: 'Test Content'
  }
};

const leads = [
  { id: 'lead1', email: 'test1@example.com' },
  { id: 'lead2', email: 'test2@example.com' },
  { id: 'lead3', email: 'test3@example.com' }
];

const emailAccounts = ['account1'];
const organizationId = 'org123';

console.log('📋 Step 1: Initialize CampaignScheduler');
const scheduler = new CampaignScheduler(campaign.config);
console.log(`   sendingInterval: ${scheduler.sendingInterval}`);
console.log(`   emailsPerHour: ${scheduler.emailsPerHour}`);

console.log('\n📋 Step 2: Generate schedules');
const schedules = scheduler.scheduleEmails(leads, emailAccounts);

console.log(`   Generated ${schedules.length} schedules:`);
schedules.forEach((schedule, index) => {
  console.log(`   ${index + 1}. ${schedule.lead.email}`);
  console.log(`      sendAt: ${schedule.sendAt.toISOString()}`);
  console.log(`      sendAt getTime(): ${schedule.sendAt.getTime()}`);
  console.log(`      sendAt type: ${typeof schedule.sendAt}`);
  console.log(`      sendAt instanceof Date: ${schedule.sendAt instanceof Date}`);
});

console.log('\n📋 Step 3: Create scheduled email records');

// Mock the createScheduledEmailRecord function
function createScheduledEmailRecord(campaignId, lead, emailAccountId, campaign, sendAt, organizationId, sequenceStep, emailConfig = null) {
  console.log(`\n   Processing lead ${lead.email}:`);
  console.log(`     Input sendAt: ${sendAt.toISOString()}`);
  console.log(`     Input sendAt getTime(): ${sendAt.getTime()}`);
  console.log(`     Input sendAt type: ${typeof sendAt}`);
  
  // Test toLocalTimestamp conversion
  const convertedTimestamp = toLocalTimestamp(sendAt);
  console.log(`     toLocalTimestamp result: ${convertedTimestamp}`);
  console.log(`     toLocalTimestamp type: ${typeof convertedTimestamp}`);
  
  // Test what happens when we create a new Date from this timestamp
  const reconvertedDate = new Date(convertedTimestamp);
  console.log(`     new Date(convertedTimestamp): ${reconvertedDate.toISOString()}`);
  console.log(`     reconvertedDate getTime(): ${reconvertedDate.getTime()}`);
  
  // Check the difference
  const originalTime = sendAt.getTime();
  const finalTime = reconvertedDate.getTime();
  const diffMs = finalTime - originalTime;
  const diffMinutes = diffMs / (60 * 1000);
  const diffHours = diffMinutes / 60;
  const diffDays = diffHours / 24;
  const diffYears = diffDays / 365;
  
  console.log(`     Time difference: ${diffYears.toFixed(3)} years`);
  
  if (Math.abs(diffYears) > 0.1) {
    console.log(`     🚨 MAJOR TIME CORRUPTION DETECTED!`);
    
    // Debug the conversion process step by step
    console.log(`\n     🔍 Debugging conversion step by step:`);
    console.log(`       1. Original Date: ${sendAt.toISOString()} (${sendAt.getTime()})`);
    
    // Test each part of toLocalTimestamp
    const year = sendAt.getFullYear();
    const month = sendAt.getMonth() + 1;
    const date = sendAt.getDate();
    const hours = sendAt.getHours();
    const minutes = sendAt.getMinutes();
    const seconds = sendAt.getSeconds();
    
    console.log(`       2. Date parts: ${year}-${month}-${date} ${hours}:${minutes}:${seconds}`);
    
    // Manual timestamp creation
    const manualTimestamp = year + '-' + 
      String(month).padStart(2, '0') + '-' + 
      String(date).padStart(2, '0') + 'T' + 
      String(hours).padStart(2, '0') + ':' + 
      String(minutes).padStart(2, '0') + ':' + 
      String(seconds).padStart(2, '0');
    
    console.log(`       3. Manual timestamp: ${manualTimestamp}`);
    console.log(`       4. new Date(manual): ${new Date(manualTimestamp).toISOString()}`);
    console.log(`       5. toLocalTimestamp(): ${convertedTimestamp}`);
  }
  
  return {
    send_at: convertedTimestamp,
    original_sendAt: sendAt.toISOString(),
    lead_email: lead.email
  };
}

const scheduledEmails = [];
schedules.forEach(schedule => {
  const emailRecord = createScheduledEmailRecord(
    campaign.id, 
    schedule.lead, 
    schedule.emailAccountId, 
    campaign, 
    schedule.sendAt, 
    organizationId, 
    0 // sequence_step
  );
  scheduledEmails.push(emailRecord);
});

console.log('\n📊 Final Results:');
scheduledEmails.forEach((email, index) => {
  console.log(`   ${index + 1}. ${email.lead_email}`);
  console.log(`      Original: ${email.original_sendAt}`);
  console.log(`      Stored: ${email.send_at}`);
});

console.log('\n✅ Campaign creation trace complete');