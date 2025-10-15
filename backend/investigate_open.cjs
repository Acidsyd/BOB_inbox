require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const campaignId = '3afa6a78-2101-404c-a911-13e36eeb5298';

async function investigateOpen() {
  console.log('🔍 Investigating open event for campaign:', campaignId);

  // Get the open event
  const { data: openEvents, error: openError } = await supabase
    .from('email_tracking_events')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('event_type', 'open');

  if (openError) {
    console.error('❌ Error fetching open events:', openError);
    return;
  }

  console.log(`\n📧 Found ${openEvents?.length || 0} open event(s)`);

  if (openEvents && openEvents.length > 0) {
    openEvents.forEach((event, i) => {
      console.log(`\n--- Open Event #${i + 1} ---`);
      console.log('Event ID:', event.id);
      console.log('Scheduled Email ID:', event.scheduled_email_id);
      console.log('Tracking Token:', event.tracking_token);
      console.log('Event Type:', event.event_type);
      console.log('Created At:', event.created_at);
      console.log('IP Address:', event.ip_address);
      console.log('User Agent:', event.user_agent);
      console.log('Campaign ID:', event.campaign_id);
      console.log('Organization ID:', event.organization_id);
    });

    // Get the actual email that was opened
    console.log('\n📨 Fetching the email that was opened...');

    const scheduledEmailId = openEvents[0].scheduled_email_id;

    const { data: email, error: emailError } = await supabase
      .from('scheduled_emails')
      .select('*')
      .eq('id', scheduledEmailId)
      .single();

    if (emailError) {
      console.error('❌ Error fetching email:', emailError);
      return;
    }

    if (email) {
      console.log('\n📧 Email Details:');
      console.log('To Email:', email.to_email);
      console.log('From Email:', email.from_email);
      console.log('Subject:', email.subject);
      console.log('Status:', email.status);
      console.log('Sent At:', email.sent_at);
      console.log('Tracking Token:', email.tracking_token);
      console.log('Message ID:', email.message_id_header);

      // Check if content has tracking pixel
      if (email.content) {
        const hasTrackingPixel = email.content.includes('tracking/open');
        console.log('Has Tracking Pixel:', hasTrackingPixel);

        if (hasTrackingPixel) {
          // Extract tracking pixel URL
          const pixelMatch = email.content.match(/src="([^"]*tracking\/open[^"]*)"/);
          if (pixelMatch) {
            console.log('Tracking Pixel URL:', pixelMatch[1]);
          }
        }
      }

      // Get lead info
      if (email.lead_id) {
        const { data: lead } = await supabase
          .from('leads')
          .select('email, first_name, last_name, company')
          .eq('id', email.lead_id)
          .single();

        if (lead) {
          console.log('\n👤 Lead Details:');
          console.log('Name:', lead.first_name, lead.last_name);
          console.log('Email:', lead.email);
          console.log('Company:', lead.company);
        }
      }
    }
  }
}

investigateOpen().catch(console.error);
