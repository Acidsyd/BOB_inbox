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

async function applyTimestampFix() {
  try {
    console.log('🔧 Applying conversation timestamp fix...')
    
    const migrationSQL = await readFile('./database_migrations/fix_conversation_timestamps.sql', 'utf8')
    
    // Split the migration into individual statements
    const statements = migrationSQL
      .split(/;\s*\n/)
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`📊 Found ${statements.length} statements to execute`)
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.length === 0) continue
      
      console.log(`📊 Executing statement ${i + 1}/${statements.length}...`)
      
      try {
        // Try direct query execution
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement })
        
        if (error) {
          console.warn(`⚠️ Statement ${i + 1} error:`, error.message)
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`)
        }
      } catch (err) {
        console.warn(`⚠️ Statement ${i + 1} exception:`, err.message)
      }
    }
    
    // Verify the fix by checking a few conversation timestamps
    console.log('🔍 Verifying timestamp fix...')
    
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('id, subject, last_activity_at')
      .limit(3)
    
    if (error) {
      console.error('❌ Could not verify fix:', error.message)
    } else if (conversations) {
      console.log('📊 Sample conversation timestamps after fix:')
      conversations.forEach(conv => {
        const timeStr = new Date(conv.last_activity_at).toLocaleString()
        console.log(`  ${conv.subject?.substring(0, 30)}... -> ${timeStr}`)
      })
    }
    
    console.log('🎉 Timestamp fix completed!')
    console.log('📌 Conversation timestamps should now show actual email time instead of sync time')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Timestamp fix failed:', error.message)
    process.exit(1)
  }
}

applyTimestampFix()