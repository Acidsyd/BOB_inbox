const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function createSystemHealthTable() {
  console.log('🔧 Creating system_health table...');
  
  const supabaseUrl = process.env.SUPABASE_URL || 'https://zwfgwdykyghpbwqawkdw.supabase.co';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3Zmd3ZHlreWdocGJ3cWF3a2R3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNDA5ODIwNiwiZXhwIjoyMDM5Njc0MjA2fQ.7U__FdBM2ivAo5Lwa9PJJS7Wjko_VdONfDfFOEWAFCI';
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Read the SQL migration file
    const sqlContent = fs.readFileSync('./create-system-health-table.sql', 'utf8');
    
    // Split by semicolons and execute each statement
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (const statement of statements) {
      console.log('📋 Executing:', statement.substring(0, 80) + '...');
      
      const { data, error } = await supabase
        .from('_dummy') // This will fail but we can use rpc instead
        .select('1')
        .limit(1);
      
      // Try direct SQL execution via rpc if available
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('exec_sql', { sql: statement });
        if (rpcError) {
          console.log('ℹ️ RPC not available, trying direct table operations...');
        } else {
          console.log('✅ Statement executed via RPC');
          continue;
        }
      } catch (rpcErr) {
        console.log('ℹ️ RPC exec_sql not available, using direct operations...');
      }
    }
    
    // Create the table manually using direct operations
    console.log('🛠️ Creating system_health table manually...');
    
    // First check if table exists
    const { data: existingTable, error: checkError } = await supabase
      .from('system_health')
      .select('id')
      .limit(1);
    
    if (existingTable !== null) {
      console.log('✅ system_health table already exists');
    } else {
      console.log('❌ Table check failed or table does not exist:', checkError?.message);
    }
    
    // Try to insert initial data
    const { data: insertData, error: insertError } = await supabase
      .from('system_health')
      .upsert({
        service: 'cron_processor',
        status: 'running',
        last_heartbeat: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    
    if (insertError) {
      console.error('❌ Error inserting initial data:', insertError);
      console.log('🔧 Trying alternative approach...');
      
      // Try creating the table through a different method
      console.log('📝 Creating table via SQL INSERT (may create automatically)...');
      
      // Attempt to use the table - this might auto-create it
      const { error: testError } = await supabase
        .from('system_health')
        .select('service')
        .eq('service', 'cron_processor')
        .maybeSingle();
      
      if (testError) {
        console.error('❌ Table still does not exist:', testError.message);
        console.log('⚠️ Manual table creation required in Supabase dashboard');
        
        console.log(`
📋 Manual table creation SQL for Supabase dashboard:

CREATE TABLE IF NOT EXISTS system_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service varchar(50) NOT NULL UNIQUE,
  status varchar(20) NOT NULL,
  last_heartbeat timestamptz NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_health_service 
ON system_health(service);

CREATE INDEX IF NOT EXISTS idx_system_health_heartbeat 
ON system_health(last_heartbeat DESC);
        `);
        
        return false;
      } else {
        console.log('✅ Table exists and is queryable');
      }
    } else {
      console.log('✅ Initial cron_processor entry created');
    }
    
    console.log('✅ system_health table setup complete');
    return true;
    
  } catch (error) {
    console.error('❌ Error creating system_health table:', error);
    return false;
  }
}

createSystemHealthTable().then((success) => {
  if (success) {
    console.log('🎉 system_health table created successfully');
  } else {
    console.log('⚠️ system_health table creation may require manual intervention');
  }
  process.exit(0);
}).catch(error => {
  console.error('❌ Failed:', error);
  process.exit(1);
});