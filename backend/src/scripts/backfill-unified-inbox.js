#!/usr/bin/env node

// Backfill existing sent emails into unified inbox
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const UnifiedInboxService = require('../services/UnifiedInboxService');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function backfillUnifiedInbox() {
  console.log('🔄 Starting unified inbox backfill...');
  
  const unifiedInboxService = new UnifiedInboxService();
  
  try {
    // Get all sent emails that don't have a conversation yet
    const { data: sentEmails, error } = await supabase
      .from('scheduled_emails')
      .select(`
        id,
        campaign_id,
        lead_id,
        email_account_id,
        from_email,
        to_email,
        subject,
        content,
        sent_at,
        message_id,
        message_id_header,
        thread_id,
        organization_id
      `)
      .eq('status', 'sent')
      .not('sent_at', 'is', null)
      .order('sent_at', { ascending: true });

    if (error) {
      throw error;
    }

    console.log(`📧 Found ${sentEmails.length} sent emails to process`);

    let processed = 0;
    let skipped = 0;
    let failed = 0;

    for (const email of sentEmails) {
      try {
        console.log(`📤 Processing email: ${email.subject} to ${email.to_email}`);

        // Check if this email is already in the unified inbox
        const { data: existingMessage } = await supabase
          .from('conversation_messages')
          .select('id')
          .eq('scheduled_email_id', email.id)
          .single();

        if (existingMessage) {
          console.log(`⏭️  Email already in unified inbox, skipping`);
          skipped++;
          continue;
        }

        // Prepare email data for unified inbox
        const emailData = {
          message_id_header: email.message_id_header || email.message_id || `<${email.id}@mailsender.local>`,
          thread_id: email.thread_id,
          from_email: email.from_email,
          to_email: email.to_email,
          subject: email.subject,
          content_html: email.content,
          content_plain: email.content, // TODO: Strip HTML tags
          sent_at: new Date(email.sent_at),
          campaign_id: email.campaign_id,
          lead_id: email.lead_id,
          scheduled_email_id: email.id,
          email_account_id: email.email_account_id,
          organization_id: email.organization_id,
          provider: 'gmail'
        };

        // Ingest as sent email
        const result = await unifiedInboxService.ingestEmail(emailData, 'sent');
        
        console.log(`✅ Ingested email into conversation: ${result.conversation.id}`);
        processed++;

      } catch (emailError) {
        console.error(`❌ Failed to process email ${email.id}:`, emailError.message);
        failed++;
      }
    }

    console.log('\n📊 Backfill Results:');
    console.log(`✅ Processed: ${processed}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📧 Total: ${sentEmails.length}`);

    // Show final stats
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id')
      .eq('conversation_type', 'sent');

    const { data: messages } = await supabase
      .from('conversation_messages')
      .select('id')
      .eq('direction', 'sent');

    console.log('\n📈 Final Stats:');
    console.log(`💬 Total conversations: ${conversations?.length || 0}`);
    console.log(`📨 Total messages: ${messages?.length || 0}`);

  } catch (error) {
    console.error('❌ Backfill failed:', error);
    process.exit(1);
  }
}

// Run the backfill
backfillUnifiedInbox().then(() => {
  console.log('🎉 Unified inbox backfill completed!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Backfill error:', error);
  process.exit(1);
});