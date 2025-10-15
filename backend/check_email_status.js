const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Check status of specific emails we know were sent
const EMAIL_IDS = [
  'de7d2053-357a-4e07-b99a-5ab934e0677d',
  '66d7cdca-0dbf-403b-a3fe-605ef735bf2d',
  'ad8fc05a-5948-4b47-8918-a3838084c619'
];

async function checkEmailStatus() {
  console.log('\n📧 CHECKING EMAIL STATUS IN DATABASE:');
  console.log('='.repeat(80));

  for (const emailId of EMAIL_IDS) {
    const { data: email, error } = await supabase
      .from('scheduled_emails')
      .select('id, to_email, status, sent_at, message_id, updated_at')
      .eq('id', emailId)
      .single();

    if (error) {
      console.log(`\n❌ Email ${emailId.substring(0, 8)}...`);
      console.log(`   Error: ${error.message}`);
    } else if (email) {
      console.log(`\n📬 Email ${emailId.substring(0, 8)}...`);
      console.log(`   To: ${email.to_email}`);
      console.log(`   Status: ${email.status}`);
      console.log(`   Sent at: ${email.sent_at || 'NULL'}`);
      console.log(`   Message ID: ${email.message_id || 'NULL'}`);
      console.log(`   Updated: ${email.updated_at}`);
    }
  }

  console.log('\n' + '='.repeat(80));
}

checkEmailStatus().catch(console.error);
