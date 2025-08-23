import { supabase } from './backend/src/database/supabase.js';
import { createLogger } from './backend/src/utils/logger.js';
import crypto from 'crypto';

const logger = createLogger();

// Encryption function (same as in emailAccounts.js)
const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY || 'your-32-char-encryption-key-here';

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

async function setupAdminDemoUser() {
  try {
    logger.info('🔧 Setting up admin@demo.com user and email accounts...');

    // 1. Create or verify organization
    logger.info('📋 Creating Demo Organization...');
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .upsert([
        {
          id: '550e8400-e29b-41d4-a716-446655440100',
          name: 'Demo Admin Organization'
        }
      ])
      .select()
      .single();

    if (orgError) {
      logger.error('Organization creation error:', orgError);
      throw orgError;
    }
    logger.info('✅ Organization created/verified:', org.name);

    // 2. Create admin@demo.com user (password: Demo123456!)
    logger.info('👤 Creating admin@demo.com user...');
    const { data: user, error: userError } = await supabase
      .from('users')
      .upsert([
        {
          id: '550e8400-e29b-41d4-a716-446655440101',
          email: 'admin@demo.com',
          first_name: 'Admin',
          last_name: 'Demo',
          password_hash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewthXDfYhPT9XVTi', // Demo123456!
          role: 'admin',
          organization_id: '550e8400-e29b-41d4-a716-446655440100'
        }
      ])
      .select()
      .single();

    if (userError) {
      logger.error('User creation error:', userError);
      throw userError;
    }
    logger.info('✅ User created/verified:', user.email);

    // 3. Create email accounts for admin@demo.com
    logger.info('📧 Creating email accounts...');

    const emailAccounts = [
      {
        id: '550e8400-e29b-41d4-a716-446655440110',
        organization_id: '550e8400-e29b-41d4-a716-446655440100',
        user_id: '550e8400-e29b-41d4-a716-446655440101',
        email: 'sender.demo1@gmail.com',
        provider: 'gmail',
        credentials_encrypted: encrypt(JSON.stringify({
          smtp: {
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            user: 'sender.demo1@gmail.com',
            pass: 'your-app-password-here'
          },
          oauth2: {
            type: 'OAuth2',
            user: 'sender.demo1@gmail.com',
            clientId: 'your-gmail-client-id',
            clientSecret: 'your-gmail-client-secret',
            refreshToken: 'your-gmail-refresh-token',
            accessToken: 'your-gmail-access-token'
          }
        })),
        settings: JSON.stringify({
          dailyLimit: 50,
          signature: 'Best regards,\\nDemo Team',
          sendingHours: { start: 9, end: 17 },
          timeZone: 'UTC'
        }),
        warmup_status: 'active',
        health_score: 95,
        daily_limit: 50,
        current_sent_today: 0
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440111',
        organization_id: '550e8400-e29b-41d4-a716-446655440100',
        user_id: '550e8400-e29b-41d4-a716-446655440101',
        email: 'sender.demo2@outlook.com',
        provider: 'outlook',
        credentials_encrypted: encrypt(JSON.stringify({
          smtp: {
            host: 'smtp-mail.outlook.com',
            port: 587,
            secure: false,
            user: 'sender.demo2@outlook.com',
            pass: 'your-outlook-password-here'
          },
          oauth2: {
            type: 'OAuth2',
            user: 'sender.demo2@outlook.com',
            clientId: 'your-outlook-client-id',
            clientSecret: 'your-outlook-client-secret',
            refreshToken: 'your-outlook-refresh-token',
            accessToken: 'your-outlook-access-token'
          }
        })),
        settings: JSON.stringify({
          dailyLimit: 40,
          signature: 'Kind regards,\\nDemo Support',
          sendingHours: { start: 8, end: 18 },
          timeZone: 'UTC'
        }),
        warmup_status: 'active',
        health_score: 88,
        daily_limit: 40,
        current_sent_today: 0
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440112',
        organization_id: '550e8400-e29b-41d4-a716-446655440100',
        user_id: '550e8400-e29b-41d4-a716-446655440101',
        email: 'demo.smtp@custom.com',
        provider: 'smtp',
        credentials_encrypted: encrypt(JSON.stringify({
          smtp: {
            host: 'mail.your-domain.com',
            port: 587,
            secure: false,
            user: 'demo.smtp@custom.com',
            pass: 'your-smtp-password-here'
          }
        })),
        settings: JSON.stringify({
          dailyLimit: 30,
          signature: 'Thanks,\\nCustom Demo',
          sendingHours: { start: 10, end: 16 },
          timeZone: 'UTC'
        }),
        warmup_status: 'active',
        health_score: 92,
        daily_limit: 30,
        current_sent_today: 0
      }
    ];

    const { error: emailError } = await supabase
      .from('email_accounts')
      .upsert(emailAccounts);

    if (emailError) {
      logger.error('Email accounts creation error:', emailError);
      throw emailError;
    }

    logger.info('✅ Created 3 email accounts:');
    emailAccounts.forEach(account => {
      logger.info(`  - ${account.email} (${account.provider}) - Limit: ${account.daily_limit}/day`);
    });

    // 4. Create a sample campaign
    logger.info('📢 Creating sample campaign...');
    const { error: campaignError } = await supabase
      .from('campaigns')
      .upsert([
        {
          id: '550e8400-e29b-41d4-a716-446655440120',
          organization_id: '550e8400-e29b-41d4-a716-446655440100',
          name: 'Admin Demo Cold Outreach',
          subject: 'Partnership opportunity with {{company}}',
          content: `Hi {{firstName}},

I hope this email finds you well. I've been following {{company}}'s work in {{primaryIndustry}} and I'm really impressed with your recent achievements.

We've been helping companies like {{company}} streamline their email operations and increase engagement rates by up to 35%.

Would you be open to a brief 15-minute conversation to explore how we might be able to support {{company}}'s goals?

Best regards,
Admin Demo Team`,
          status: 'draft',
          emails_per_day: 30,
          emails_per_hour: 4,
          emails_per_minute: 1,
          sending_interval: 15,
          active_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          sending_hours: JSON.stringify({ start: 9, end: 17 }),
          created_by: '550e8400-e29b-41d4-a716-446655440101'
        }
      ]);

    if (campaignError) {
      logger.error('Campaign creation error:', campaignError);
      throw campaignError;
    }

    logger.info('✅ Sample campaign created');

    // 5. Verify setup
    logger.info('🔍 Verifying setup...');
    const { data: verifyUser } = await supabase
      .from('users')
      .select('id, email, organization_id')
      .eq('email', 'admin@demo.com')
      .single();

    const { data: verifyAccounts } = await supabase
      .from('email_accounts')
      .select('id, email, provider, warmup_status, health_score')
      .eq('organization_id', '550e8400-e29b-41d4-a716-446655440100');

    logger.info('✅ Setup verification:');
    logger.info(`   User: ${verifyUser.email} (ID: ${verifyUser.id})`);
    logger.info(`   Organization: ${verifyUser.organization_id}`);
    logger.info(`   Email Accounts: ${verifyAccounts.length}`);
    verifyAccounts.forEach(account => {
      logger.info(`   - ${account.email} (${account.provider}) - Status: ${account.warmup_status} - Health: ${account.health_score}`);
    });

    logger.info('');
    logger.info('🎉 Setup completed successfully!');
    logger.info('');
    logger.info('📋 Login credentials:');
    logger.info('   Email: admin@demo.com');
    logger.info('   Password: Demo123456!');
    logger.info('');
    logger.info('⚠️  Important: Update the email credentials in the database with real SMTP/OAuth settings before using.');
    logger.info('   You can do this via the frontend at http://localhost:3001/settings/email-accounts');

    return true;
  } catch (error) {
    logger.error('❌ Setup failed:', error);
    return false;
  }
}

// Run the setup
setupAdminDemoUser()
  .then(success => {
    if (success) {
      logger.info('✅ Admin demo user setup completed successfully!');
      process.exit(0);
    } else {
      logger.error('❌ Setup failed');
      process.exit(1);
    }
  })
  .catch(error => {
    logger.error('❌ Setup script error:', error);
    process.exit(1);
  });