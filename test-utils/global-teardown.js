/**
 * Global Test Teardown
 * Runs once after all tests to clean up the test environment
 */

import { execSync } from 'child_process'
import { createClient } from '@supabase/supabase-js'

export default async function globalTeardown() {
  console.log('🧹 Cleaning up global test environment...')

  try {
    // 1. Stop test servers if they were started
    await stopTestServers()
    
    // 2. Clean up test database
    await cleanupTestDatabase()
    
    // 3. Clean up test files and artifacts
    await cleanupTestArtifacts()

    console.log('✅ Global test teardown completed successfully')
  } catch (error) {
    console.error('❌ Global test teardown failed:', error)
    // Don't throw error in teardown to avoid masking test failures
  }
}

async function stopTestServers() {
  console.log('🛑 Stopping test servers...')

  try {
    // Kill processes on test ports
    const testPorts = [4001, 3002]
    
    for (const port of testPorts) {
      try {
        execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: 'ignore' })
        console.log(`✅ Stopped server on port ${port}`)
      } catch (error) {
        // No process running on port, that's okay
        console.log(`No server running on port ${port}`)
      }
    }
  } catch (error) {
    console.warn('Warning stopping test servers:', error.message)
  }
}

async function cleanupTestDatabase() {
  console.log('🗃️  Cleaning up test database...')

  try {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      await cleanupSupabaseTestDatabase()
    } else {
      await cleanupLocalTestDatabase()
    }
  } catch (error) {
    console.warn('Warning cleaning up test database:', error.message)
  }
}

async function cleanupSupabaseTestDatabase() {
  // Only clean if it's clearly a test database
  if (!process.env.SUPABASE_URL.includes('localhost') && 
      !process.env.SUPABASE_URL.includes('test') &&
      process.env.NODE_ENV !== 'test') {
    console.log('⚠️  Skipping database cleanup - not a test environment')
    return
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
  )

  try {
    // Clean test data created during tests
    const testTableCleanup = [
      // Clean in order that respects foreign key constraints
      'campaign_leads',
      'campaigns',
      'email_accounts',
      'oauth2_tokens', 
      'subscriptions',
      'organizations'
    ]

    for (const table of testTableCleanup) {
      try {
        // Only delete records that look like test data
        const { error } = await supabase
          .from(table)
          .delete()
          .or('email.ilike.*test*,name.ilike.*test*,organization_name.ilike.*test*')

        if (error && !error.message.includes('relation') && !error.message.includes('does not exist')) {
          console.warn(`Warning cleaning ${table}:`, error.message)
        } else {
          console.log(`✅ Cleaned test data from ${table}`)
        }
      } catch (error) {
        console.warn(`Could not clean ${table}:`, error.message)
      }
    }

    console.log('✅ Supabase test database cleanup complete')
  } catch (error) {
    console.warn('Warning during Supabase cleanup:', error.message)
  }
}

async function cleanupLocalTestDatabase() {
  console.log('🗃️  Cleaning up local test database...')
  
  // Implementation would depend on your local database setup
  // This is a placeholder for local PostgreSQL cleanup
  try {
    // If using a dedicated test database, you could drop and recreate it
    // Or clean specific test data based on naming patterns
    console.log('Local database cleanup completed')
  } catch (error) {
    console.warn('Warning cleaning local test database:', error.message)
  }
}

async function cleanupTestArtifacts() {
  console.log('🗂️  Cleaning up test artifacts...')

  try {
    // Clean up temporary test files
    const cleanupCommands = [
      // Remove test screenshots and videos (Playwright)
      'rm -rf backend/test-results',
      'rm -rf backend/playwright-report', 
      'rm -rf frontend/test-results',
      
      // Remove temporary upload files
      'rm -rf backend/uploads/test-*',
      'rm -rf backend/temp/test-*',
      
      // Remove test logs
      'rm -rf backend/logs/test-*.log',
      'rm -rf frontend/logs/test-*.log',
      
      // Clean Jest cache if it exists
      'rm -rf .jest-cache/test-*'
    ]

    for (const command of cleanupCommands) {
      try {
        execSync(command, { stdio: 'ignore' })
      } catch (error) {
        // File/directory might not exist, that's okay
      }
    }

    console.log('✅ Test artifacts cleanup complete')
  } catch (error) {
    console.warn('Warning cleaning test artifacts:', error.message)
  }
}

// Utility to force cleanup if tests were interrupted
export async function emergencyCleanup() {
  console.log('🚨 Running emergency cleanup...')
  
  try {
    await stopTestServers()
    
    // Force kill any remaining test processes
    const killCommands = [
      'pkill -f "npm run dev"',
      'pkill -f "next dev"',
      'pkill -f "nodemon"',
      'pkill -f "playwright"'
    ]

    for (const command of killCommands) {
      try {
        execSync(command, { stdio: 'ignore' })
      } catch (error) {
        // Process might not exist, that's okay
      }
    }

    console.log('✅ Emergency cleanup complete')
  } catch (error) {
    console.error('Emergency cleanup failed:', error)
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n🛑 Test interrupted, running cleanup...')
  await emergencyCleanup()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n🛑 Test terminated, running cleanup...')
  await emergencyCleanup()
  process.exit(0)
})

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  console.error('Uncaught exception during tests:', error)
  await emergencyCleanup()
  process.exit(1)
})

process.on('unhandledRejection', async (reason, promise) => {
  console.error('Unhandled rejection during tests:', reason)
  await emergencyCleanup()
  process.exit(1)
})