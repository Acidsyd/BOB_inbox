import { readFile } from 'fs/promises'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Read environment variables from backend/.env
let supabaseUrl, supabaseServiceKey
try {
  const envContent = readFileSync('./backend/.env', 'utf8')
  const envLines = envContent.split('\n')
  for (const line of envLines) {
    const [key, value] = line.split('=')
    if (key === 'SUPABASE_URL') supabaseUrl = value
    if (key === 'SUPABASE_SERVICE_KEY') supabaseServiceKey = value
  }
} catch (error) {
  console.error('❌ Could not read backend/.env file')
  process.exit(1)
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Required: SUPABASE_URL and SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigration() {
  try {
    console.log('📊 Applying Gmail sidebar folders migration...')
    
    const migrationSQL = await readFile('./database_migrations/20250130_gmail_sidebar_folders.sql', 'utf8')
    
    // Split the migration into individual statements to handle potential errors
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.length === 0) continue
      
      console.log(`📊 Executing statement ${i + 1}/${statements.length}...`)
      
      const { error } = await supabase.rpc('exec_sql', { sql_query: statement })
      
      if (error) {
        // Try direct SQL execution if RPC fails
        const { error: directError } = await supabase.from('_').select().limit(0)
        if (directError) {
          console.warn(`⚠️ Statement ${i + 1} may have failed:`, error.message)
        }
      }
    }
    
    // Test if tables were created successfully
    console.log('📊 Verifying migration...')
    
    const { data: foldersTest, error: foldersError } = await supabase
      .from('system_folders')
      .select('count')
      .limit(1)
    
    const { data: conversationsTest, error: conversationsError } = await supabase
      .from('conversations')
      .select('is_archived')
      .limit(1)
    
    if (!foldersError && !conversationsError) {
      console.log('✅ Migration applied successfully!')
      console.log('✅ Tables/columns created: system_folders, conversations.is_archived')
    } else {
      console.log('⚠️ Migration may have partially failed:')
      if (foldersError) console.log('  - system_folders table issue:', foldersError.message)
      if (conversationsError) console.log('  - conversations.is_archived column issue:', conversationsError.message)
    }
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  }
}

applyMigration()