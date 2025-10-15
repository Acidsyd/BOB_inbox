#!/usr/bin/env node

/**
 * Fix the incorrectly migrated email timestamp
 *
 * The email sent at 16:06 CEST (14:06 UTC) was incorrectly migrated to 12:06 UTC
 * Gmail shows it as "16:06 (2 ore fa)" confirming it should be 14:06 UTC
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixTimestamp() {
  console.log('🔧 Fixing incorrectly migrated email timestamp...\n');

  const emailId = '43cba600-9ded-4b90-984d-f44a9364bac3';

  // Gmail shows: 16:06 (2 ore fa) = 4:06 PM CEST = 14:06 UTC
  // But we need to verify what time it actually is now to calculate "2 ore fa"
  const correctUtcTimestamp = '2025-10-01T14:06:38';

  console.log('📧 Email ID:', emailId);
  console.log('🕐 Correct timestamp (UTC):', correctUtcTimestamp);
  console.log('🇮🇹 Should display as: Oct 1, 2025 4:06 PM (CEST)');
  console.log('📱 Gmail shows: 16:06 (2 ore fa)\n');

  try {
    // First check current state
    const { data: before, error: fetchError } = await supabase
      .from('conversation_messages')
      .select('id, sent_at, from_email, to_email')
      .eq('id', emailId)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching email:', fetchError);
      return;
    }

    console.log('📊 Current state:');
    console.log('   sent_at:', before.sent_at);
    console.log('   from:', before.from_email);
    console.log('   to:', before.to_email);
    console.log();

    // Update to correct timestamp
    const { error: updateError } = await supabase
      .from('conversation_messages')
      .update({ sent_at: correctUtcTimestamp })
      .eq('id', emailId);

    if (updateError) {
      console.error('❌ Error updating timestamp:', updateError);
      return;
    }

    // Verify the update
    const { data: after, error: verifyError } = await supabase
      .from('conversation_messages')
      .select('id, sent_at, from_email, to_email')
      .eq('id', emailId)
      .single();

    if (verifyError) {
      console.error('❌ Error verifying update:', verifyError);
      return;
    }

    console.log('✅ Timestamp updated successfully!');
    console.log('📊 New state:');
    console.log('   sent_at:', after.sent_at);
    console.log();
    console.log('🧪 Frontend should now display:');
    console.log('   - With Z suffix: 2025-10-01T14:06:38Z');
    console.log('   - In Rome timezone (UTC+2): Oct 1, 2025 4:06 PM');
    console.log();
    console.log('💡 Please refresh your browser to see the updated timestamp');

  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

fixTimestamp();
