const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './backend/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixReplyStatus() {
  const email = 'emanuele.canetti@indico.srl';
  const campaignId = '958ea778-928e-41f2-99c0-053b65b5ee4b';

  console.log('=== FIXING REPLY STATUS FOR:', email, '===\n');

  // 1. Get the message details
  const { data: message, error: msgErr } = await supabase
    .from('conversation_messages')
    .select('*')
    .eq('from_email', email)
    .single();

  if (!message) {
    console.log('No message found!');
    return;
  }

  console.log('1. Found message:', message.id);
  console.log('   Conversation ID:', message.conversation_id);
  console.log('   Organization ID:', message.organization_id);

  // 2. Check if conversation exists
  if (message.conversation_id) {
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', message.conversation_id)
      .single();

    console.log('\n2. Conversation exists:', conv ? 'YES' : 'NO');
    if (conv) {
      console.log('   Participants:', conv.participants);
    }
  }

  // 3. Update lead status to 'replied'
  console.log('\n3. Updating lead status to "replied"...');
  const { data: updatedLead, error: leadErr } = await supabase
    .from('leads')
    .update({
      status: 'replied',
      updated_at: new Date().toISOString()
    })
    .eq('email', email)
    .select();

  if (leadErr) {
    console.log('   Error updating lead:', leadErr);
  } else {
    console.log('   Lead updated:', updatedLead?.length, 'records');
  }

  // 4. Cancel the follow-up email
  console.log('\n4. Cancelling follow-up email...');
  const { data: cancelledEmails, error: cancelErr } = await supabase
    .from('scheduled_emails')
    .update({
      status: 'skipped',
      updated_at: new Date().toISOString()
    })
    .eq('campaign_id', campaignId)
    .eq('to_email', email)
    .eq('status', 'scheduled')
    .gt('sequence_step', 0)
    .select();

  if (cancelErr) {
    console.log('   Error cancelling:', cancelErr);
  } else {
    console.log('   Cancelled follow-ups:', cancelledEmails?.length, 'emails');
    if (cancelledEmails) {
      cancelledEmails.forEach(e => {
        console.log('   - Step', e.sequence_step, '| Was scheduled for:', e.send_at);
      });
    }
  }

  console.log('\n=== DONE ===');
}

fixReplyStatus().catch(console.error);
