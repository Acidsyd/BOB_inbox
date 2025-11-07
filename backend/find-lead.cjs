#!/usr/bin/env node

/**
 * Search for leads matching "difelice" or "wise-glow"
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function findLead() {
  console.log('🔍 Searching for leads with "difelice" or "wise-glow"...\n');

  try {
    // Search for leads with difelice
    const { data: leads1 } = await supabase
      .from('leads')
      .select('id, email, first_name, last_name')
      .ilike('email', '%difelice%');

    // Search for leads with wise-glow
    const { data: leads2 } = await supabase
      .from('leads')
      .select('id, email, first_name, last_name')
      .ilike('email', '%wise-glow%');

    const allLeads = [...(leads1 || []), ...(leads2 || [])];

    if (allLeads.length === 0) {
      console.log('❌ No matching leads found!');
      return;
    }

    console.log(`✅ Found ${allLeads.length} matching leads:\n`);

    allLeads.forEach((lead, index) => {
      console.log(`${index + 1}. ${lead.first_name} ${lead.last_name}`);
      console.log(`   Email: ${lead.email}`);
      console.log(`   ID: ${lead.id}\n`);
    });

  } catch (error) {
    console.error('\n❌ Search failed:', error.message);
    process.exit(1);
  }
}

findLead()
  .then(() => {
    console.log('✅ Search complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
