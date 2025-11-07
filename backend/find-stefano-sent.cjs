require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function findStefanoSent() {
  try {
    // Find ALL emails to stefano (including sent)
    const { data: emails, error } = await supabase
      .from('scheduled_emails')
      .select('*')
      .eq('to_email', 'stefano.sala@automacengineering.it')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log(`\n📧 Found ${emails.length} emails to stefano.sala@automacengineering.it\n`);

    for (const email of emails) {
      console.log(`Email ID: ${email.id}`);
      console.log(`  Status: ${email.status}`);
      console.log(`  Subject: ${email.subject || 'N/A'}`);
      console.log(`  Is follow-up: ${email.is_follow_up}`);
      console.log(`  Sent at: ${email.sent_at || 'Not sent'}`);
      console.log(`  Message-ID: ${email.message_id_header || 'N/A'}`);
      console.log(`  Thread ID: ${email.thread_id || 'N/A'}`);
      console.log(`  Parent ID: ${email.parent_email_id || 'N/A'}`);
      console.log('');
    }

    // Find the specific sent follow-up from our earlier report
    const sentFollowUp = emails.find(e =>
      e.status === 'sent' &&
      e.is_follow_up &&
      e.sent_at &&
      e.sent_at.includes('2025-10-23T12:14')
    );

    if (sentFollowUp) {
      console.log('\n✅ FOUND THE SENT FOLLOW-UP FROM SCREENSHOT:');
      console.log('='.repeat(100));
      console.log(`ID: ${sentFollowUp.id}`);
      console.log(`Sent at: ${sentFollowUp.sent_at}`);
      console.log(`Message-ID header: ${sentFollowUp.message_id_header}`);
      console.log(`Thread ID: ${sentFollowUp.thread_id}`);
      console.log(`Parent email ID: ${sentFollowUp.parent_email_id}`);

      if (sentFollowUp.parent_email_id) {
        const { data: parent } = await supabase
          .from('scheduled_emails')
          .select('message_id_header, thread_id, subject, sent_at')
          .eq('id', sentFollowUp.parent_email_id)
          .single();

        if (parent) {
          console.log(`\nParent email:`);
          console.log(`  Subject: ${parent.subject}`);
          console.log(`  Sent at: ${parent.sent_at}`);
          console.log(`  Message-ID: ${parent.message_id_header}`);
          console.log(`  Thread ID: ${parent.thread_id}`);

          console.log(`\n🔍 TIMING ANALYSIS:`);
          const sentTime = new Date(sentFollowUp.sent_at);
          const fixTime = new Date('2025-10-23T15:00:00Z'); // When we committed the fix

          console.log(`  Follow-up sent: ${sentTime.toISOString()}`);
          console.log(`  Fix committed:  ${fixTime.toISOString()}`);

          if (sentTime < fixTime) {
            console.log(`\n  ❌ EMAIL WAS SENT **BEFORE** THE FIX (${Math.round((fixTime - sentTime) / 1000 / 60)} minutes before)`);
            console.log(`\n  This is why threading doesn't work in Gmail!`);
            console.log(`  Even though database NOW shows correct Message-IDs,`);
            console.log(`  the email was sent WITH THE BUG (wrong In-Reply-To header).`);
          } else {
            console.log(`\n  ✅ EMAIL WAS SENT **AFTER** THE FIX`);
            console.log(`\n  This means we have a different problem - OAuth2Service`);
            console.log(`  might not be sending the In-Reply-To header correctly.`);
          }
        }
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

findStefanoSent();
