const { createClient } = require('@supabase/supabase-js');
const FolderService = require('./src/services/FolderService');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugLabelFiltering() {
  try {
    console.log('🔍 Starting label filtering debug...');
    
    const folderService = new FolderService();
    
    // Get the organization ID and label ID from the test data we saw earlier
    const testOrgId = '550e8400-e29b-41d4-a716-446655440000';
    const testLabelId = 'fed61dbc-74df-4486-a6b4-b26cb367ea1a';
    
    console.log(`🔍 Testing with orgId: ${testOrgId}`);
    console.log(`🔍 Testing with labelId: ${testLabelId}`);
    
    // Test the exact call that's failing
    const options = {
      limit: 50,
      offset: 0,
      labelIds: [testLabelId]
    };
    
    console.log('🔍 Calling getConversationsForFolder with label filter...');
    const result = await folderService.getConversationsForFolder(testOrgId, 'inbox', options);
    
    console.log('✅ Success! Results:', result);
    
  } catch (error) {
    console.error('❌ Debug test failed:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
  }
}

debugLabelFiltering();