const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './backend/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkReplyDeep() {
  const email = 'emanuele.canetti@indico.srl';
  const campaignId = '958ea778-928e-41f2-99c0-053b65b5ee4b';

  console.log('=== DEEP CHECK FOR REPLY FROM:', email, '===\n');

  // 1. Search in conversation_messages with ILIKE for partial match
  const { data: messages1, error: err1 } = await supabase
    .from('conversation_messages')
    .select('*')
    .ilike('from_email', '%canetti%');

  console.log('1. Messages FROM *canetti* (any):');
  if (messages1 && messages1.length > 0) {
    messages1.forEach(msg => {
      console.log('   ID:', msg.id);
      console.log('   From:', msg.from_email);
      console.log('   To:', msg.to_email);
      console.log('   Subject:', msg.subject);
      console.log('   Direction:', msg.direction);
      console.log('   Received:', msg.received_at);
      console.log('   ---');
    });
  } else {
    console.log('   None found');
  }

  // 2. Search in conversation_messages with ILIKE for indico
  const { data: messages2, error: err2 } = await supabase
    .from('conversation_messages')
    .select('*')
    .ilike('from_email', '%indico%');

  console.log('\n2. Messages FROM *indico* (any):');
  if (messages2 && messages2.length > 0) {
    messages2.forEach(msg => {
      console.log('   ID:', msg.id);
      console.log('   From:', msg.from_email);
      console.log('   Subject:', msg.subject);
      console.log('   Direction:', msg.direction);
      console.log('   ---');
    });
  } else {
    console.log('   None found');
  }

  // 3. Check conversations with this participant
  const { data: convos, error: err3 } = await supabase
    .from('conversations')
    .select('*')
    .or('participants.cs.{"' + email + '"},subject.ilike.%canetti%,subject.ilike.%indico%');

  console.log('\n3. Conversations with participant or subject match:');
  if (convos && convos.length > 0) {
    convos.forEach(conv => {
      console.log('   ID:', conv.id);
      console.log('   Participants:', conv.participants);
      console.log('   Subject:', conv.subject);
      console.log('   Last message:', conv.last_message_at);
      console.log('   ---');
    });
  } else {
    console.log('   None found');
  }

  // 4. Check leads table for replied status
  const { data: leads, error: err4 } = await supabase
    .from('leads')
    .select('*')
    .ilike('email', '%canetti%');

  console.log('\n4. Leads matching *canetti*:');
  if (leads && leads.length > 0) {
    leads.forEach(lead => {
      console.log('   Email:', lead.email);
      console.log('   Status:', lead.status);
      console.log('   Updated:', lead.updated_at);
      console.log('   ---');
    });
  } else {
    console.log('   None found');
  }

  // 5. Check ALL received messages in last 24 hours
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const { data: recentReceived, error: err5 } = await supabase
    .from('conversation_messages')
    .select('id, from_email, subject, direction, received_at')
    .eq('direction', 'received')
    .gte('received_at', yesterday.toISOString())
    .order('received_at', { ascending: false });

  console.log('\n5. ALL received messages in last 24 hours:');
  if (recentReceived && recentReceived.length > 0) {
    recentReceived.forEach(msg => {
      const isMatch = msg.from_email && (msg.from_email.toLowerCase().includes('canetti') || msg.from_email.toLowerCase().includes('indico'));
      const marker = isMatch ? '>>> ' : '    ';
      console.log(marker + msg.from_email + ' | ' + (msg.subject || '(no subject)').substring(0, 40));
    });
  } else {
    console.log('   None found');
  }

  // 6. Check the sent email to see which account sent it
  const { data: sentEmail, error: err6 } = await supabase
    .from('scheduled_emails')
    .select('id, from_email, to_email, subject, sent_at, email_account_id')
    .eq('campaign_id', campaignId)
    .eq('to_email', email)
    .eq('sequence_step', 0);

  console.log('\n6. Original sent email details:');
  if (sentEmail && sentEmail.length > 0) {
    sentEmail.forEach(se => {
      console.log('   From:', se.from_email);
      console.log('   To:', se.to_email);
      console.log('   Subject:', se.subject);
      console.log('   Sent at:', se.sent_at);
      console.log('   Account ID:', se.email_account_id);
    });
  } else {
    console.log('   None found');
  }

  // 7. Search by subject line pattern
  const { data: bySubject, error: err7 } = await supabase
    .from('conversation_messages')
    .select('*')
    .or('subject.ilike.%Emanuele%,subject.ilike.%indico%,subject.ilike.%canetti%');

  console.log('\n7. Messages with subject containing Emanuele/indico/canetti:');
  if (bySubject && bySubject.length > 0) {
    bySubject.forEach(msg => {
      console.log('   From:', msg.from_email);
      console.log('   Subject:', msg.subject);
      console.log('   Direction:', msg.direction);
      console.log('   ---');
    });
  } else {
    console.log('   None found');
  }
}

checkReplyDeep().catch(console.error);
