const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkCurrentScheduling() {
  const campaignId = '6e2a8bda-00a7-4615-a4db-289c29a86afb';

  const { data: emails } = await supabase
    .from('scheduled_emails')
    .select('id, send_at, email_account_id, status')
    .eq('campaign_id', campaignId)
    .eq('status', 'scheduled')
    .order('send_at', { ascending: true })
    .limit(100);

  console.log('📊 CURRENT SCHEDULED EMAILS ANALYSIS\n');

  // Check for duplicates
  const sendTimeMap = {};
  emails.forEach(e => {
    if (!sendTimeMap[e.send_at]) {
      sendTimeMap[e.send_at] = [];
    }
    sendTimeMap[e.send_at].push(e);
  });

  const duplicates = Object.entries(sendTimeMap).filter(([_, list]) => list.length > 1);

  console.log('🚨 Duplicate Analysis (First 100 emails):');
  console.log('   Unique time slots:', Object.keys(sendTimeMap).length);
  console.log('   Time slots with duplicates:', duplicates.length);
  console.log('   Total emails:', emails.length);

  if (duplicates.length > 0) {
    console.log('\n   First 3 duplicate time slots:');
    duplicates.slice(0, 3).forEach(([time, list]) => {
      console.log(`   ${time} -> ${list.length} emails`);
    });
  }

  console.log('\n⏱️  First 50 Scheduled Emails:');

  for (let i = 0; i < Math.min(50, emails.length); i++) {
    const e = emails[i];
    const sendAt = new Date(e.send_at);
    const account = e.email_account_id.substring(0, 8);

    let intervalInfo = '';
    let isDuplicate = '';

    if (i > 0) {
      const prev = new Date(emails[i-1].send_at);
      const diff = Math.round((sendAt - prev) / 60000);
      intervalInfo = ` (${diff} min)`;

      if (diff === 0) {
        isDuplicate = ' 🚨 DUPLICATE';
      }
    }

    console.log(`[${String(i+1).padStart(2)}] ${sendAt.toISOString().substring(11, 19)} | ...${account}${intervalInfo}${isDuplicate}`);
  }

  // Account rotation analysis
  console.log('\n🔄 Account Rotation (First 24):');
  const first24 = emails.slice(0, 24);
  const accountSequence = first24.map(e => e.email_account_id.substring(0, 8));

  accountSequence.forEach((acc, i) => {
    const prevAcc = i > 0 ? accountSequence[i - 1] : null;
    const repeat = prevAcc === acc ? '🔁' : '';
    console.log(`   [${String(i + 1).padStart(2)}] ...${acc} ${repeat}`);
  });
}

checkCurrentScheduling().catch(console.error);
