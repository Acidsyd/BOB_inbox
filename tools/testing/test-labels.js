const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testLabelTables() {
  try {
    console.log('🔍 Testing conversation_labels table...');
    
    // Test if the table exists and get its structure
    const { data: labelsData, error: labelsError } = await supabase
      .from('conversation_labels')
      .select('*')
      .limit(1);
      
    if (labelsError) {
      console.error('❌ conversation_labels table error:', labelsError);
    } else {
      console.log('✅ conversation_labels table exists');
      console.log('🔍 Sample data structure:', labelsData);
    }

    console.log('🔍 Testing conversation_label_assignments table...');
    
    // Test if the table exists and get its structure
    const { data: assignmentsData, error: assignmentsError } = await supabase
      .from('conversation_label_assignments')
      .select('*')
      .limit(1);
      
    if (assignmentsError) {
      console.error('❌ conversation_label_assignments table error:', assignmentsError);
    } else {
      console.log('✅ conversation_label_assignments table exists');
      console.log('🔍 Sample data structure:', assignmentsData);
    }

    // Test the specific query that's failing
    console.log('🔍 Testing the failing query pattern...');
    const testOrgId = '123e4567-e89b-12d3-a456-426614174000'; // Dummy UUID
    const testLabelIds = ['123e4567-e89b-12d3-a456-426614174001'];
    
    const { data: queryTest, error: queryError } = await supabase
      .from('conversation_label_assignments')
      .select('conversation_id')
      .eq('organization_id', testOrgId)
      .in('label_id', testLabelIds);
      
    if (queryError) {
      console.error('❌ Test query failed:', queryError);
      console.error('❌ Error details:', JSON.stringify(queryError, null, 2));
    } else {
      console.log('✅ Test query succeeded');
      console.log('🔍 Query result:', queryTest);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testLabelTables();