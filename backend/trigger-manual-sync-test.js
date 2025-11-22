const { createClient } = require('@supabase/supabase-js');
const BackgroundSyncService = require('./src/services/BackgroundSyncService');
require('dotenv').config();

async function testSync() {
  console.log('🧪 Testing manual sync for relay IMAP account gianpiero@gkt-group.it...\n');
  
  try {
    await BackgroundSyncService.triggerManualBackgroundSync();
    console.log('\n✅ Manual sync completed successfully');
  } catch (error) {
    console.error('\n❌ Manual sync failed:', error.message);
  }
}

testSync();
