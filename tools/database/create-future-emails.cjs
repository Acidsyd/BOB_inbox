#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production' });

async function createFutureEmails() {
  try {
    console.log('🔍 Creating future scheduled emails for testing...');

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const campaignId = '59c83ca2-3b46-4323-a78f-a43d6ba6ab27';
    const organizationId = 'e0007877-cbc8-43ef-b306-31b99b0a5cf8';

    // Create future timestamps (today at various times)
    const now = new Date();
    
    // Create times that are clearly in the future for today (September 19, 2025)
    const futureEmails = [
      {
        send_at: '2025-09-19T18:00:00.000Z', // 6 PM UTC today = 8 PM CEST
        to_email: 'test1@example.com',
        from_email: 'gianpiero.difelice@gmail.com',
        subject: 'Test Future Email 1',
        content: 'Test content 1'
      },
      {
        send_at: '2025-09-19T20:00:00.000Z', // 8 PM UTC today = 10 PM CEST
        to_email: 'test2@example.com',
        from_email: 'gianpiero.difelice@gmail.com',
        subject: 'Test Future Email 2',
        content: 'Test content 2'
      },
      {
        send_at: '2025-09-20T08:00:00.000Z', // Tomorrow 8 AM UTC = 10 AM CEST
        to_email: 'test3@example.com',
        from_email: 'gianpiero.difelice@gmail.com',
        subject: 'Test Future Email 3',
        content: 'Test content 3'
      }
    ];

    console.log('Creating future scheduled emails...');
    for (const email of futureEmails) {
      const { error } = await supabase
        .from('scheduled_emails')
        .insert({
          campaign_id: campaignId,
          organization_id: organizationId,
          send_at: email.send_at,
          to_email: email.to_email,
          from_email: email.from_email,
          subject: email.subject,
          content: email.content,
          status: 'scheduled',
          provider: 'gmail'
        });

      if (error) {
        console.error('❌ Error creating email:', error);
      } else {
        console.log(`✅ Created scheduled email for ${email.to_email} at ${email.send_at}`);
      }
    }

    console.log('\n📊 Verifying future emails were created...');
    const { data: futureEmails2, error: futureError } = await supabase
      .from('scheduled_emails')
      .select('id, send_at, status, to_email')
      .eq('campaign_id', campaignId)
      .eq('status', 'scheduled')
      .gt('send_at', 'now()')
      .order('send_at', { ascending: true });

    if (futureError) {
      console.error('❌ Future emails error:', futureError);
      return;
    }

    console.log('Current UTC time:', new Date().toISOString());
    console.log('Current Europe/Rome time:', new Date().toLocaleString('en-US', { timeZone: 'Europe/Rome' }));

    futureEmails2.forEach((email, index) => {
      const sendAt = new Date(email.send_at);
      console.log(`${index + 1}. ${email.send_at} → ${sendAt.toLocaleString('en-US', { timeZone: 'Europe/Rome' })} → ${email.to_email}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createFutureEmails();
