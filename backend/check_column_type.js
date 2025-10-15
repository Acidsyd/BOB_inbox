const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkColumnType() {
  console.log('\n🔍 CHECKING scheduled_emails.send_at COLUMN TYPE');
  console.log('='.repeat(80));

  const { data, error } = await supabase
    .rpc('exec_sql', {
      sql: `
        SELECT
          column_name,
          data_type,
          udt_name,
          datetime_precision
        FROM information_schema.columns
        WHERE table_name = 'scheduled_emails'
          AND column_name IN ('send_at', 'sent_at', 'created_at')
        ORDER BY column_name;
      `
    });

  if (error) {
    console.log('❌ Error (RPC not available, try manual query in Supabase SQL Editor):', error.message);
    console.log('\n💡 Manual query:');
    console.log(`
SELECT
  column_name,
  data_type,
  udt_name,
  datetime_precision
FROM information_schema.columns
WHERE table_name = 'scheduled_emails'
  AND column_name IN ('send_at', 'sent_at', 'created_at')
ORDER BY column_name;
    `);
  } else {
    console.log('\n📊 Column Information:');
    console.table(data);

    const sendAtColumn = data.find(col => col.column_name === 'send_at');
    if (sendAtColumn) {
      console.log(`\n🎯 send_at column:`);
      console.log(`   Data type: ${sendAtColumn.data_type}`);
      console.log(`   UDT name: ${sendAtColumn.udt_name}`);
      console.log(`   Datetime precision: ${sendAtColumn.datetime_precision || 'N/A'}`);

      if (sendAtColumn.data_type === 'timestamp without time zone') {
        console.log('\n⚠️  WARNING: Column is "timestamp without time zone"');
        console.log('   This strips timezone information when storing!');
        console.log('   Should be "timestamp with time zone" (timestamptz)');
      } else if (sendAtColumn.data_type === 'timestamp with time zone') {
        console.log('\n✅ Column is "timestamp with time zone" (correct)');
      }
    }
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

checkColumnType().catch(console.error);
