const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function deleteContactedLeads() {
  try {
    console.log('Reading CSV file...');

    // Read the CSV file
    const csvPath = path.join(__dirname, 'contacted_leads_6e2a8bda_2025-10-14T19-24-17.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');

    // Parse CSV - split by lines and extract Lead IDs
    const lines = csvContent.split('\n');
    const leadIds = [];

    // Skip header (line 0) and parse data lines
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Extract Lead ID from the last column
      // CSV format: "email","firstName","lastName","company","title","sentFrom","subject","sentAt","isFollowup","messageId","leadId"
      const match = line.match(/"([^"]+)"\s*$/);
      if (match && match[1]) {
        leadIds.push(match[1]);
      }
    }

    console.log(`Found ${leadIds.length} lead IDs to delete`);
    console.log('Lead IDs:', leadIds.slice(0, 5), '...');

    // Delete leads in batches of 50
    const batchSize = 50;
    let deletedCount = 0;

    for (let i = 0; i < leadIds.length; i += batchSize) {
      const batch = leadIds.slice(i, i + batchSize);

      const { error, count } = await supabase
        .from('leads')
        .delete({ count: 'exact' })
        .in('id', batch);

      if (error) {
        console.error(`Error deleting batch ${i / batchSize + 1}:`, error);
        throw error;
      }

      deletedCount += batch.length;
      console.log(`Deleted batch ${i / batchSize + 1}: ${batch.length} leads (Total: ${deletedCount}/${leadIds.length})`);
    }

    console.log(`\n✓ Successfully deleted ${deletedCount} leads from database`);

    // Verify deletion
    const { data: remainingLeads, error: verifyError } = await supabase
      .from('leads')
      .select('id')
      .in('id', leadIds);

    if (verifyError) {
      console.error('Error verifying deletion:', verifyError);
    } else {
      console.log(`Verification: ${remainingLeads.length} leads still exist (should be 0)`);
      if (remainingLeads.length > 0) {
        console.log('Remaining lead IDs:', remainingLeads.map(l => l.id));
      }
    }

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

deleteContactedLeads();
