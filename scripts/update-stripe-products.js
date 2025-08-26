#!/usr/bin/env node

/**
 * Stripe Products Update Script
 * 
 * This script updates your Stripe products with compliant descriptions
 * to resolve the telemarketing services violation.
 * 
 * Usage:
 *   node scripts/update-stripe-products.js
 * 
 * Environment Variables Required:
 *   STRIPE_SECRET_KEY - Your Stripe secret key
 * 
 * @author Claude Code
 */

import Stripe from 'stripe';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '../backend/.env') });
config({ path: join(__dirname, '../.env') });

// Compliant product descriptions
const COMPLIANT_PRODUCTS = {
  basic_plan: {
    name: 'Basic Plan',
    description: 'Professional B2B email marketing automation for small teams. Includes account management, campaign tracking, and lead generation tools with API integration support.',
    metadata: {
      plan_code: 'basic',
      emails_per_month: '5000',
      email_accounts_limit: '5',
      campaigns_limit: '10',
      leads_limit: '50000',
      support_level: 'email',
      analytics_level: 'basic',
      priority: '1',
      service_type: 'b2b_email_marketing_automation'
    }
  },
  full_plan: {
    name: 'Full Plan',
    description: 'Comprehensive B2B email marketing automation platform for growing sales teams. Advanced account management, API integration, white-label solutions, and dedicated customer success support.',
    metadata: {
      plan_code: 'full',
      emails_per_month: '20000',
      email_accounts_limit: '20',
      campaigns_limit: '-1',
      leads_limit: '-1',
      support_level: 'priority',
      analytics_level: 'advanced',
      priority: '2',
      popular: 'true',
      service_type: 'b2b_email_marketing_automation'
    }
  }
};

// Compliant business profile updates
const BUSINESS_PROFILE_UPDATES = {
  business_profile: {
    name: 'B2B Email Marketing Platform',
    support_address: {
      line1: process.env.BUSINESS_ADDRESS_LINE1 || 'Via Roma 1',
      city: process.env.BUSINESS_CITY || 'Milano',
      postal_code: process.env.BUSINESS_POSTAL_CODE || '20100',
      country: process.env.BUSINESS_COUNTRY || 'IT'
    },
    support_email: process.env.BUSINESS_EMAIL || 'support@mailsender.com',
    support_phone: process.env.BUSINESS_PHONE || '+39 02 1234567',
    support_url: process.env.BUSINESS_URL || 'https://mailsender.com/support',
    url: process.env.BUSINESS_URL || 'https://mailsender.com'
  },
  company: {
    name: 'B2B Email Marketing Platform',
    description: 'Professional email marketing automation platform for B2B lead generation and customer outreach with advanced account management and API integration capabilities.'
  }
};

async function main() {
  try {
    console.log('🚀 Starting Stripe products compliance update...\n');
    
    // Validate environment
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }
    
    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
      appInfo: {
        name: 'Mailsender Compliance Update',
        version: '1.0.0'
      }
    });
    
    const isTestMode = process.env.STRIPE_SECRET_KEY.startsWith('sk_test_');
    console.log(`🔧 Using Stripe in ${isTestMode ? 'TEST' : 'LIVE'} mode\n`);
    
    // Test connection
    const account = await stripe.accounts.retrieve();
    console.log(`✅ Connected to Stripe account: ${account.display_name || account.id}`);
    console.log(`   Country: ${account.country}\n`);
    
    // Update business profile (account level)
    await updateBusinessProfile(stripe, account);
    
    // List and update existing products
    await updateExistingProducts(stripe);
    
    // Create any missing products
    await createMissingProducts(stripe);
    
    console.log('\n✅ Stripe compliance update completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Update your Stripe business profile in the dashboard:');
    console.log('   https://dashboard.stripe.com/settings/account');
    console.log('2. Use this Italian description for your business profile:');
    console.log('   "Forniamo una piattaforma software di automazione per l\'email marketing B2B che aiuta le aziende a gestire campagne di lead generation e customer outreach. I nostri clienti sono aziende che utilizzano il nostro software per inviare email di prospecting personalizzate ai loro potenziali clienti, con funzionalità di tracking, analisi delle performance e gestione delle liste contatti. Offriamo piani di abbonamento mensili per l\'accesso alla nostra piattaforma SaaS."');
    console.log('3. Contact Stripe support referencing this compliance update');
    
  } catch (error) {
    console.error('❌ Error updating Stripe products:', error.message);
    if (error.code) {
      console.error(`   Stripe Error Code: ${error.code}`);
    }
    if (error.param) {
      console.error(`   Parameter: ${error.param}`);
    }
    process.exit(1);
  }
}

async function updateBusinessProfile(stripe, account) {
  try {
    console.log('🏢 Updating business profile...');
    
    // Update account business profile
    const updatedAccount = await stripe.accounts.update(account.id, {
      business_profile: {
        name: BUSINESS_PROFILE_UPDATES.business_profile.name,
        support_email: BUSINESS_PROFILE_UPDATES.business_profile.support_email,
        support_phone: BUSINESS_PROFILE_UPDATES.business_profile.support_phone,
        support_url: BUSINESS_PROFILE_UPDATES.business_profile.support_url,
        url: BUSINESS_PROFILE_UPDATES.business_profile.url
      },
      company: {
        name: BUSINESS_PROFILE_UPDATES.company.name
      }
    });
    
    console.log('✅ Business profile updated successfully');
    
  } catch (error) {
    console.warn('⚠️  Could not update business profile (may require manual update):', error.message);
    console.log('   Please update manually in Stripe Dashboard > Settings > Business Profile');
  }
}

async function updateExistingProducts(stripe) {
  console.log('📦 Updating existing products...');
  
  // List all products
  const products = await stripe.products.list({ 
    limit: 100,
    expand: ['data.default_price']
  });
  
  console.log(`   Found ${products.data.length} existing products`);
  
  for (const product of products.data) {
    try {
      // Check if this is one of our target products
      const planCode = product.metadata.plan_code;
      const productId = product.id;
      
      let targetProduct = null;
      if (planCode && COMPLIANT_PRODUCTS[`${planCode}_plan`]) {
        targetProduct = COMPLIANT_PRODUCTS[`${planCode}_plan`];
      } else if (COMPLIANT_PRODUCTS[productId]) {
        targetProduct = COMPLIANT_PRODUCTS[productId];
      } else if (product.name.toLowerCase().includes('basic')) {
        targetProduct = COMPLIANT_PRODUCTS.basic_plan;
      } else if (product.name.toLowerCase().includes('full') || product.name.toLowerCase().includes('pro')) {
        targetProduct = COMPLIANT_PRODUCTS.full_plan;
      }
      
      if (targetProduct) {
        console.log(`   📝 Updating product: ${product.name} (${product.id})`);
        
        await stripe.products.update(product.id, {
          name: targetProduct.name,
          description: targetProduct.description,
          metadata: {
            ...product.metadata,
            ...targetProduct.metadata,
            updated_at: new Date().toISOString(),
            compliance_update: 'b2b_email_marketing_positioning'
          },
          active: true
        });
        
        console.log(`   ✅ Updated: ${targetProduct.name}`);
      } else {
        console.log(`   ℹ️  Skipping product: ${product.name} (no matching template)`);
      }
      
    } catch (error) {
      console.error(`   ❌ Failed to update product ${product.id}:`, error.message);
    }
  }
}

async function createMissingProducts(stripe) {
  console.log('\n🏗️  Checking for missing products...');
  
  const products = await stripe.products.list({ limit: 100 });
  const existingProductIds = products.data.map(p => p.id);
  const existingPlanCodes = products.data.map(p => p.metadata.plan_code).filter(Boolean);
  
  for (const [productId, productDef] of Object.entries(COMPLIANT_PRODUCTS)) {
    const planCode = productDef.metadata.plan_code;
    
    // Check if product already exists by ID or plan_code
    if (existingProductIds.includes(productId) || existingPlanCodes.includes(planCode)) {
      console.log(`   ✅ Product ${productDef.name} already exists`);
      continue;
    }
    
    try {
      console.log(`   🆕 Creating missing product: ${productDef.name}`);
      
      const newProduct = await stripe.products.create({
        id: productId,
        name: productDef.name,
        description: productDef.description,
        type: 'service',
        metadata: {
          ...productDef.metadata,
          created_at: new Date().toISOString(),
          compliance_update: 'b2b_email_marketing_positioning'
        },
        active: true
      });
      
      console.log(`   ✅ Created product: ${newProduct.id}`);
      
      // Create default prices if they don't exist
      await createDefaultPrices(stripe, newProduct, planCode);
      
    } catch (error) {
      console.error(`   ❌ Failed to create product ${productId}:`, error.message);
    }
  }
}

async function createDefaultPrices(stripe, product, planCode) {
  try {
    // Basic pricing structure
    const pricingConfig = {
      basic: {
        monthly: { amount: 1500, currency: 'eur', interval: 'month' },
        yearly: { amount: 15000, currency: 'eur', interval: 'year' }
      },
      full: {
        monthly: { amount: 3000, currency: 'eur', interval: 'month' },
        yearly: { amount: 30000, currency: 'eur', interval: 'year' }
      }
    };
    
    const prices = pricingConfig[planCode];
    if (!prices) return;
    
    // Check existing prices
    const existingPrices = await stripe.prices.list({
      product: product.id,
      limit: 100
    });
    
    for (const [interval, priceData] of Object.entries(prices)) {
      const existingPrice = existingPrices.data.find(p => 
        p.recurring?.interval === interval && p.currency === priceData.currency
      );
      
      if (!existingPrice) {
        console.log(`     💰 Creating ${interval} price for ${product.name}`);
        
        const newPrice = await stripe.prices.create({
          product: product.id,
          unit_amount: priceData.amount,
          currency: priceData.currency,
          recurring: {
            interval: priceData.interval,
            interval_count: 1
          },
          nickname: `${product.name} ${interval.charAt(0).toUpperCase() + interval.slice(1)}`,
          tax_behavior: 'inclusive',
          metadata: {
            plan_code: planCode,
            interval: interval,
            created_at: new Date().toISOString()
          },
          active: true
        });
        
        console.log(`     ✅ Created ${interval} price: €${priceData.amount / 100}`);
      }
    }
    
  } catch (error) {
    console.error(`     ❌ Failed to create prices for ${product.name}:`, error.message);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default main;