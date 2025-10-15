require('dotenv').config();
const TimezoneService = require('./src/services/TimezoneService');

// NEW Helper function from campaigns.js
function formatCampaignDate(date, timezone = 'UTC', format = 'MMM d, yyyy h:mm a') {
  if (!date) return null;

  // Convert string dates to Date objects
  let dateObj;
  if (date instanceof Date) {
    dateObj = date;
  } else {
    const dateStr = date.toString();
    // Handle timestamps without timezone suffix
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/) && !dateStr.endsWith('Z')) {
      dateObj = new Date(dateStr + 'Z');
    } else {
      dateObj = new Date(dateStr);
    }
  }

  // For yyyy-MM-dd format, we need to extract the date parts in the target timezone
  if (format === 'yyyy-MM-dd') {
    try {
      const tzDate = new Date(dateObj.toLocaleString('en-US', { timeZone: timezone }));
      const year = tzDate.getFullYear();
      const month = String(tzDate.getMonth() + 1).padStart(2, '0');
      const day = String(tzDate.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error formatting date to yyyy-MM-dd:', error);
      // Fallback to UTC
      const year = dateObj.getUTCFullYear();
      const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  // For other formats, use TimezoneService
  let options = {};

  if (format === 'MMM d') {
    options = {
      month: 'short',
      day: 'numeric'
    };
  } else {
    // Default format: 'MMM d, yyyy h:mm a'
    options = {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
  }

  return TimezoneService.convertToUserTimezone(date, timezone, options);
}

// Test with actual sent_at timestamp from the campaign
const testDate = '2025-09-26T07:00:12';
const campaignTimezone = 'UTC'; // Or whatever timezone the campaign uses

console.log('Testing NEW date formatting:');
console.log('Input:', testDate);
console.log('Timezone:', campaignTimezone);
console.log('Format yyyy-MM-dd:', formatCampaignDate(testDate, campaignTimezone, 'yyyy-MM-dd'));
console.log('Format MMM d:', formatCampaignDate(testDate, campaignTimezone, 'MMM d'));
console.log('Format default:', formatCampaignDate(testDate, campaignTimezone));

// Test with Europe/Rome timezone
console.log('\nWith Europe/Rome timezone:');
console.log('Format yyyy-MM-dd:', formatCampaignDate(testDate, 'Europe/Rome', 'yyyy-MM-dd'));

// Test multiple dates
console.log('\nTesting multiple dates:');
const testDates = [
  '2025-09-26T07:00:12',
  '2025-09-27T15:30:00',
  '2025-10-01T08:00:00'
];

testDates.forEach(d => {
  console.log(`${d} => ${formatCampaignDate(d, 'UTC', 'yyyy-MM-dd')}`);
});
