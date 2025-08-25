/**
 * Global Test Setup
 * Runs once before all tests to prepare the test environment
 */

import { execSync } from 'child_process'
import { createConnection } from 'mysql2/promise'
import { createClient } from '@supabase/supabase-js'

export default async function globalSetup() {
  console.log('🚀 Setting up global test environment...')

  try {
    // 1. Set test environment variables
    process.env.NODE_ENV = 'test'
    process.env.PORT = '4001' // Use different port for tests
    process.env.FRONTEND_PORT = '3002'
    
    // 2. Setup test database
    await setupTestDatabase()
    
    // 3. Start test servers if needed
    if (process.env.START_TEST_SERVERS === 'true') {
      await startTestServers()
    }

    console.log('✅ Global test setup completed successfully')
  } catch (error) {
    console.error('❌ Global test setup failed:', error)
    throw error
  }
}

async function setupTestDatabase() {
  console.log('📦 Setting up test database...')
  
  try {
    // Check if we're using Supabase or local PostgreSQL
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      await setupSupabaseTestDatabase()
    } else if (process.env.DATABASE_URL) {
      await setupLocalTestDatabase()
    } else {
      console.log('⚠️  No database configuration found, skipping database setup')
    }
  } catch (error) {
    console.error('Failed to setup test database:', error)
    throw error
  }
}

async function setupSupabaseTestDatabase() {
  console.log('🗃️  Setting up Supabase test database...')
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
  )

  // Clean test data (be very careful with this)
  if (process.env.SUPABASE_URL.includes('localhost') || 
      process.env.SUPABASE_URL.includes('test') ||
      process.env.NODE_ENV === 'test') {
    
    try {
      // Clean test tables in safe order (respecting foreign keys)
      const tablesToClean = [
        'campaign_leads',
        'campaigns', 
        'email_accounts',
        'oauth2_tokens',
        'subscriptions',
        'organizations'
      ]

      for (const table of tablesToClean) {
        const { error } = await supabase
          .from(table)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all except impossible UUID

        if (error && !error.message.includes('relation') && !error.message.includes('does not exist')) {
          console.warn(`Warning cleaning table ${table}:`, error.message)
        }
      }

      // Verify connection
      const { data, error } = await supabase
        .from('users')
        .select('count(*)')
        .limit(1)

      if (!error) {
        console.log('✅ Supabase test database setup complete')
      }
    } catch (error) {
      console.warn('Warning during Supabase cleanup:', error.message)
    }
  }
}

async function setupLocalTestDatabase() {
  console.log('🗃️  Setting up local test database...')
  
  // Parse database URL for connection
  const dbUrl = new URL(process.env.DATABASE_URL)
  const connectionConfig = {
    host: dbUrl.hostname,
    port: dbUrl.port || 5432,
    user: dbUrl.username,
    password: dbUrl.password,
    database: dbUrl.pathname.slice(1) // Remove leading slash
  }

  try {
    // Create database connection
    const connection = await createConnection(connectionConfig)
    
    // Run test schema setup if exists
    try {
      if (process.env.TEST_SCHEMA_PATH) {
        const schemaSQL = await import(process.env.TEST_SCHEMA_PATH)
        await connection.execute(schemaSQL.default)
      }
    } catch (error) {
      console.log('No test schema found, using existing schema')
    }

    // Clean test data
    const tablesToClean = [
      'campaign_leads',
      'campaigns',
      'email_accounts', 
      'oauth2_tokens',
      'subscriptions',
      'organizations'
    ]

    for (const table of tablesToClean) {
      try {
        await connection.execute(`DELETE FROM ${table} WHERE 1=1`)
      } catch (error) {
        // Table might not exist, that's okay
        console.log(`Table ${table} not found or already clean`)
      }
    }

    await connection.end()
    console.log('✅ Local test database setup complete')
  } catch (error) {
    console.warn('Warning setting up local test database:', error.message)
  }
}

async function startTestServers() {
  console.log('🖥️  Starting test servers...')

  try {
    // Start backend test server
    if (process.env.START_BACKEND_SERVER === 'true') {
      console.log('Starting backend test server on port 4001...')
      execSync('cd backend && npm run dev &', { 
        stdio: 'ignore',
        detached: true
      })
    }

    // Start frontend test server  
    if (process.env.START_FRONTEND_SERVER === 'true') {
      console.log('Starting frontend test server on port 3002...')
      execSync('cd frontend && PORT=3002 npm run dev &', {
        stdio: 'ignore', 
        detached: true
      })
    }

    // Wait for servers to start
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    console.log('✅ Test servers started successfully')
  } catch (error) {
    console.warn('Warning starting test servers:', error.message)
  }
}

// Utility functions for tests
export const testHelpers = {
  // Create test user
  createTestUser: async (userData = {}) => {
    const defaultUser = {
      email: `test.${Date.now()}@example.com`,
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
      organizationName: 'Test Corp'
    }
    
    return { ...defaultUser, ...userData }
  },

  // Generate test data
  generateTestData: {
    email: () => `test.${Date.now()}@example.com`,
    password: () => 'TestPassword123!',
    company: () => `Test Corp ${Date.now()}`,
    campaign: () => ({
      name: `Test Campaign ${Date.now()}`,
      subject: 'Test Subject',
      content: '<p>Test email content</p>',
      leads: [
        {
          email: `lead1.${Date.now()}@example.com`,
          firstName: 'Lead',
          lastName: 'One'
        }
      ]
    })
  },

  // Wait for condition
  waitFor: async (condition, timeout = 5000, interval = 100) => {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return true
      }
      await new Promise(resolve => setTimeout(resolve, interval))
    }
    
    throw new Error(`Condition not met within ${timeout}ms`)
  },

  // Retry function
  retry: async (fn, maxRetries = 3, delay = 1000) => {
    let lastError
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    throw lastError
  }
}