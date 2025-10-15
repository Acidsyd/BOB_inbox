import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

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

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testSync() {
  try {
    console.log('🔍 Checking OAuth2 accounts...')
    
    const { data: accounts, error } = await supabase
      .from('oauth2_tokens')
      .select('id, email, provider, status, organization_id')
      .eq('status', 'linked_to_account')
      .limit(5)
    
    if (error) {
      console.error('❌ Error fetching accounts:', error)
      return
    }
    
    console.log('✅ Found OAuth2 accounts:', accounts?.length || 0)
    
    if (accounts && accounts.length > 0) {
      console.log('📧 OAuth2 accounts:')
      accounts.forEach(acc => {
        console.log(`  - ${acc.email} (${acc.provider}) - ${acc.id}`)
        console.log(`    Organization: ${acc.organization_id}`)
      })
      
      // Now trigger manual sync for the test organization
      const orgId = '550e8400-e29b-41d4-a716-446655440000'
      console.log(`🔄 Triggering manual sync for organization: ${orgId}`)
      
      const response = await fetch('http://localhost:4000/api/inbox/sync/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJlbWFpbCI6InRlc3RAdGVzdC5jb20iLCJvcmdhbml6YXRpb25JZCI6IjU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMCIsImlhdCI6MTc1NjU0MDA5MH0.fake-signature-for-test`
        },
        body: JSON.stringify({})
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('✅ Sync response:', result)
      } else {
        console.log('❌ Sync failed:', response.status, await response.text())
      }
    } else {
      console.log('⚠️ No OAuth2 accounts found with linked_to_account status')
    }
    
  } catch (error) {
    console.error('❌ Test sync failed:', error.message)
  }
}

testSync()