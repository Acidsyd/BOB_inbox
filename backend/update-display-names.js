const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!');
  console.error('SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('SUPABASE_SERVICE_KEY:', supabaseServiceKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateDisplayNames() {
  try {
    console.log('📝 === UPDATING DISPLAY NAMES ===\n');
    
    // 0. First, add display_name column to oauth2_tokens if it doesn't exist
    console.log('0️⃣ Adding display_name column to oauth2_tokens table (if not exists)...');
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'oauth2_tokens' AND column_name = 'display_name'
          ) THEN
            ALTER TABLE oauth2_tokens ADD COLUMN display_name VARCHAR(255);
          END IF;
        END $$;
      `
    });
    
    if (alterError) {
      console.log('   ⚠️ Could not add column via RPC, will try direct SQL...');
    } else {
      console.log('   ✅ Column added successfully\n');
    }
    
    // 1. Update all OAuth2 accounts
    console.log('1️⃣ Updating OAuth2 (Gmail) accounts...');
    const { data: oauth2Accounts, error: oauth2Error } = await supabase
      .from('oauth2_tokens')
      .select('id, email')
      .eq('organization_id', 'e0007877-cbc8-43ef-b306-31b99b0a5cf8');
    
    if (oauth2Error) {
      console.error('❌ Error fetching OAuth2 accounts:', oauth2Error);
      return;
    }
    
    console.log(`   Found ${oauth2Accounts.length} OAuth2 accounts\n`);
    
    for (const account of oauth2Accounts) {
      const { error: updateError } = await supabase
        .from('oauth2_tokens')
        .update({ display_name: 'Gianpiero Di Felice' })
        .eq('id', account.id);
      
      if (updateError) {
        console.error(`   ❌ Failed to update ${account.email}:`, updateError.message);
      } else {
        console.log(`   ✅ Updated ${account.email}`);
      }
    }
    
    console.log('\n2️⃣ Updating Mailgun/Relay accounts...');
    const { data: mailgunAccounts, error: mailgunError } = await supabase
      .from('email_accounts')
      .select('id, email')
      .eq('organization_id', 'e0007877-cbc8-43ef-b306-31b99b0a5cf8');
    
    if (mailgunError) {
      console.error('❌ Error fetching Mailgun accounts:', mailgunError);
      return;
    }
    
    console.log(`   Found ${mailgunAccounts.length} email accounts\n`);
    
    for (const account of mailgunAccounts) {
      const { error: updateError } = await supabase
        .from('email_accounts')
        .update({ display_name: 'Gianpiero Di Felice' })
        .eq('id', account.id);
      
      if (updateError) {
        console.error(`   ❌ Failed to update ${account.email}:`, updateError.message);
      } else {
        console.log(`   ✅ Updated ${account.email}`);
      }
    }
    
    console.log('\n✅ === ALL DISPLAY NAMES UPDATED ===');
    console.log('   All email accounts now have display_name: "Gianpiero Di Felice"');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

updateDisplayNames();
