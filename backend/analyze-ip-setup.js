require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function analyzeIPSituation() {
  console.log('🔍 ANALYZING YOUR CURRENT IP SITUATION');
  console.log('='.repeat(80));

  // Check email accounts breakdown
  const { data: emailAccounts } = await supabase
    .from('email_accounts')
    .select('provider, relay_provider_id');

  const { data: oauth2Accounts } = await supabase
    .from('oauth2_tokens')
    .select('provider')
    .eq('status', 'linked_to_account');

  console.log('\n📧 EMAIL ACCOUNT BREAKDOWN:');

  // OAuth2 (Gmail)
  const gmailCount = oauth2Accounts?.filter(a => a.provider === 'gmail').length || 0;
  console.log(`   Gmail OAuth2: ${gmailCount} accounts`);
  console.log(`      → Uses Google's IPs (shared pool)`);
  console.log(`      → Already has excellent IP reputation`);
  console.log(`      → No proxies needed or possible`);

  // Relay providers
  const relayCount = emailAccounts?.filter(a => a.relay_provider_id).length || 0;
  console.log(`\n   Relay Providers (Mailgun/SendGrid): ${relayCount} accounts`);
  console.log(`      → Uses their shared IP pools`);
  console.log(`      → Professional infrastructure`);
  console.log(`      → Pre-warmed IPs with good reputation`);

  // SMTP (direct)
  const smtpCount = emailAccounts?.filter(a => !a.relay_provider_id).length || 0;
  console.log(`\n   Direct SMTP: ${smtpCount} accounts`);
  console.log(`      → Sends from your server's IP`);
  console.log(`      → This is where proxies MIGHT help`);

  console.log('\n\n📊 SUMMARY:');
  console.log(`   Total accounts: ${gmailCount + relayCount + smtpCount}`);
  console.log(`   Using professional IPs: ${gmailCount + relayCount}`);
  console.log(`   Using server IP: ${smtpCount}`);

  console.log('\n\n🎯 PROXY RECOMMENDATION:');
  if (smtpCount === 0) {
    console.log('   ❌ DO NOT ADD PROXIES');
    console.log('   Reason: All accounts use professional email services');
    console.log('   (Gmail OAuth2 + Mailgun/SendGrid have excellent IPs)');
    console.log('   Proxies would add cost/complexity with ZERO benefit');
  } else if (smtpCount < 5) {
    console.log('   ⚠️  MAYBE - Low priority');
    console.log(`   You have ${smtpCount} direct SMTP accounts`);
    console.log('   Consider switching to relay providers instead');
  } else {
    console.log('   ✅ YES - Worth considering');
    console.log(`   You have ${smtpCount} direct SMTP accounts`);
    console.log('   Residential proxies could improve deliverability');
  }
}

analyzeIPSituation()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
