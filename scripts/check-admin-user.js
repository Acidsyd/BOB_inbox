import { supabase } from './backend/src/database/supabase.js';
import { createLogger } from './backend/src/utils/logger.js';

const logger = createLogger();

async function checkAdminUser() {
  try {
    logger.info('🔍 Checking for admin@demo.com user...');

    // Check if admin@demo.com exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'admin@demo.com')
      .single();

    if (userError) {
      if (userError.code === 'PGRST116') {
        logger.info('❌ admin@demo.com user does not exist');
        return null;
      }
      throw userError;
    }

    logger.info('✅ Found admin@demo.com user:');
    logger.info(`   ID: ${user.id}`);
    logger.info(`   Name: ${user.first_name} ${user.last_name}`);
    logger.info(`   Organization ID: ${user.organization_id}`);
    logger.info(`   Role: ${user.role}`);

    // Check existing email accounts
    const { data: emailAccounts, error: emailError } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('organization_id', user.organization_id);

    if (emailError) {
      throw emailError;
    }

    logger.info(`📧 Found ${emailAccounts.length} email accounts:`);
    emailAccounts.forEach(account => {
      logger.info(`   - ${account.email} (${account.provider}) - Status: ${account.warmup_status || 'unknown'}`);
    });

    return { user, emailAccounts };
  } catch (error) {
    logger.error('❌ Error checking admin user:', error);
    return null;
  }
}

// Run the check
checkAdminUser()
  .then(result => {
    if (result) {
      logger.info('✅ Check completed successfully!');
    } else {
      logger.error('❌ Check failed');
    }
    process.exit(0);
  })
  .catch(error => {
    logger.error('❌ Check script error:', error);
    process.exit(1);
  });