require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkSentEmail() {
  // Get the bounce record for Martina
  const { data: bounce } = await supabase
    .from('email_bounces')
    .select('*')
    .eq('recipient_email', 'm.gjorgjievska@vicariavvocati.com')
    .single();

  if (!bounce) {
    console.log('❌ No bounce found for m.gjorgjievska@vicariavvocati.com');
    return;
  }

  console.log('✅ Bounce found:', {
    id: bounce.id,
    scheduled_email_id: bounce.scheduled_email_id,
    campaign_id: bounce.campaign_id,
    bounced_at: bounce.bounced_at
  });

  // Check the scheduled email
  if (bounce.scheduled_email_id) {
    const { data: scheduledEmail } = await supabase
      .from('scheduled_emails')
      .select('*')
      .eq('id', bounce.scheduled_email_id)
      .single();

    console.log('\n📧 Scheduled email:', {
      id: scheduledEmail.id,
      status: scheduledEmail.status,
      to_email: scheduledEmail.to_email,
      subject: scheduledEmail.subject,
      sent_at: scheduledEmail.sent_at
    });

    // Check if there's a conversation message for this
    const { data: messages } = await supabase
      .from('conversation_messages')
      .select('*')
      .eq('scheduled_email_id', bounce.scheduled_email_id);

    console.log('\n💬 Conversation messages:', messages?.length || 0);
    if (messages && messages.length > 0) {
      messages.forEach(msg => {
        console.log('  -', {
          id: msg.id,
          conversation_id: msg.conversation_id,
          direction: msg.direction,
          from_email: msg.from_email,
          to_email: msg.to_email
        });
      });
    } else {
      console.log('❌ No conversation messages found - email was not recorded in inbox');
    }
  }
}

checkSentEmail().catch(console.error);
