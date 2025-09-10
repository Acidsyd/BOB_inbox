const crypto = require('crypto');

// Copy of the generateUnsubscribeToken function from the backend
function generateUnsubscribeToken(email, campaignId, organizationId) {
  const data = `${email}:${campaignId}:${organizationId}:${Date.now()}`;
  const encryptionKey = process.env.EMAIL_ENCRYPTION_KEY || 'fallback-key-for-testing-only!!';
  
  const cipher = crypto.createCipher('aes-256-cbc', encryptionKey);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return encrypted;
}

// Test data
const testEmail = 'user@example.com';
const testCampaignId = 'campaign-123';
const testOrganizationId = 'org-456';

// Generate token
const token = generateUnsubscribeToken(testEmail, testCampaignId, testOrganizationId);
const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
const unsubscribeUrl = `${baseUrl}/unsubscribe?token=${token}`;

console.log('Test Unsubscribe Link Generation:');
console.log('================================');
console.log('Email:', testEmail);
console.log('Campaign ID:', testCampaignId);
console.log('Organization ID:', testOrganizationId);
console.log('Generated Token:', token);
console.log('Full URL:', unsubscribeUrl);

// Test HTML
const htmlBody = '<html><body><h1>Test Email</h1><p>This is a test.</p></body></html>';
const unsubscribeHtml = `
  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center;">
    <p>If you no longer wish to receive these emails, you can <a href="${unsubscribeUrl}" style="color: #666; text-decoration: underline;">unsubscribe here</a>.</p>
  </div>
`;

const finalHtml = htmlBody.replace('</body>', unsubscribeHtml + '</body>');

console.log('\nFinal HTML with unsubscribe link:');
console.log('==================================');
console.log(finalHtml);

// Check conditions that might prevent unsubscribe link
console.log('\n⚠️  Common Issues:');
console.log('==================');
console.log('1. includeUnsubscribe flag:', true, '✅');
console.log('2. campaignId present:', !!testCampaignId, testCampaignId ? '✅' : '❌ MISSING!');
console.log('3. Both conditions met:', true && !!testCampaignId, (true && !!testCampaignId) ? '✅' : '❌');

console.log('\n💡 If unsubscribe link is not appearing:');
console.log('- Check that campaignId is being passed when sending emails');
console.log('- Verify includeUnsubscribe is true in campaign config');
console.log('- Look for "🚫 Adding unsubscribe link to email" in server logs');