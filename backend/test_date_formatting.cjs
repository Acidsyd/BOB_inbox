require('dotenv').config();
const TimezoneService = require('./src/services/TimezoneService');

// Helper function from campaigns.js
function formatCampaignDate(date, timezone = 'UTC', format = 'MMM d, yyyy h:mm a') {
  if (!date) return null;

  // Convert format string to Intl.DateTimeFormat options (without timeZone property)
  let options = {};

  if (format === 'yyyy-MM-dd') {
    options = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    };
  } else if (format === 'MMM d') {
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

console.log('Testing date formatting:');
console.log('Input:', testDate);
console.log('Timezone:', campaignTimezone);
console.log('Format yyyy-MM-dd:', formatCampaignDate(testDate, campaignTimezone, 'yyyy-MM-dd'));
console.log('Format MMM d:', formatCampaignDate(testDate, campaignTimezone, 'MMM d'));
console.log('Format default:', formatCampaignDate(testDate, campaignTimezone));

// Test with Europe/Rome timezone
console.log('\nWith Europe/Rome timezone:');
console.log('Format yyyy-MM-dd:', formatCampaignDate(testDate, 'Europe/Rome', 'yyyy-MM-dd'));
