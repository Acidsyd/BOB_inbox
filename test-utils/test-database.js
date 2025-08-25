/**
 * Test Database Setup and Teardown Utilities
 * Handles database and Redis setup for testing
 */

import { createConnection } from '../backend/src/database/connectionManager.js';
import { logger } from '../backend/src/utils/logger.js';

let testDbConnection = null;
let testRedisClient = null;

/**
 * Setup test database
 */
export async function setupDatabase() {
  try {
    // Create test database connection
    testDbConnection = await createConnection({
      host: process.env.TEST_DB_HOST || 'localhost',
      port: process.env.TEST_DB_PORT || 5432,
      database: process.env.TEST_DB_NAME || 'mailsender_test',
      user: process.env.TEST_DB_USER || 'postgres',
      password: process.env.TEST_DB_PASSWORD || 'postgres'
    });
    
    // Run migrations for test database
    const { execSync } = await import('child_process');
    execSync('npm run db:migrate', { 
      cwd: './backend',
      env: { 
        ...process.env, 
        DATABASE_URL: `postgresql://${process.env.TEST_DB_USER || 'postgres'}:${process.env.TEST_DB_PASSWORD || 'postgres'}@${process.env.TEST_DB_HOST || 'localhost'}:${process.env.TEST_DB_PORT || 5432}/${process.env.TEST_DB_NAME || 'mailsender_test'}`
      },
      stdio: 'inherit'
    });
    
    // Seed test data
    await seedTestData();
    
    logger.info('Test database setup completed');
    return testDbConnection;
    
  } catch (error) {
    logger.error('Test database setup failed', { error: error.message });
    throw error;
  }
}

/**
 * Teardown test database
 */
export async function teardownDatabase() {
  try {
    if (testDbConnection) {
      // Clean test data
      await testDbConnection.query('TRUNCATE TABLE leads, lead_imports, email_accounts, campaigns CASCADE');
      await testDbConnection.end();
      testDbConnection = null;
    }
    
    logger.info('Test database teardown completed');
    
  } catch (error) {
    logger.error('Test database teardown failed', { error: error.message });
    throw error;
  }
}

/**
 * Setup Redis for testing
 */
export async function setupRedis() {
  try {
    const Redis = await import('ioredis');
    
    testRedisClient = new Redis.default({
      host: process.env.TEST_REDIS_HOST || 'localhost',
      port: process.env.TEST_REDIS_PORT || 6379,
      db: process.env.TEST_REDIS_DB || 1, // Use different DB for tests
      maxRetriesPerRequest: 3,
      retryDelayOnFailure: 100
    });
    
    // Clear test Redis DB
    await testRedisClient.flushdb();
    
    logger.info('Test Redis setup completed');
    return testRedisClient;
    
  } catch (error) {
    logger.error('Test Redis setup failed', { error: error.message });
    throw error;
  }
}

/**
 * Teardown Redis
 */
export async function teardownRedis() {
  try {
    if (testRedisClient) {
      await testRedisClient.flushdb();
      await testRedisClient.quit();
      testRedisClient = null;
    }
    
    logger.info('Test Redis teardown completed');
    
  } catch (error) {
    logger.error('Test Redis teardown failed', { error: error.message });
    throw error;
  }
}

/**
 * Seed test data
 */
async function seedTestData() {
  if (!testDbConnection) return;
  
  try {
    // Create test email accounts
    await testDbConnection.query(`
      INSERT INTO email_accounts (id, email, provider, status, created_at, updated_at)
      VALUES 
        ('test-account-1', 'test1@example.com', 'gmail', 'active', NOW(), NOW()),
        ('test-account-2', 'test2@example.com', 'gmail', 'active', NOW(), NOW()),
        ('test-account-3', 'test3@example.com', 'gmail', 'inactive', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `);
    
    // Create test leads
    await testDbConnection.query(`
      INSERT INTO leads (id, email, first_name, last_name, company, status, created_at, updated_at)
      VALUES 
        ('test-lead-1', 'lead1@example.com', 'John', 'Doe', 'Acme Corp', 'new', NOW(), NOW()),
        ('test-lead-2', 'lead2@example.com', 'Jane', 'Smith', 'Tech Inc', 'contacted', NOW(), NOW()),
        ('test-lead-3', 'lead3@example.com', 'Bob', 'Johnson', 'StartupXYZ', 'replied', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `);
    
    // Create test campaigns
    await testDbConnection.query(`
      INSERT INTO campaigns (id, name, subject, template, status, created_at, updated_at)
      VALUES 
        ('test-campaign-1', 'Test Campaign 1', 'Test Subject 1', 'Hello {{first_name}}', 'draft', NOW(), NOW()),
        ('test-campaign-2', 'Test Campaign 2', 'Test Subject 2', 'Hi {{first_name}} from {{company}}', 'active', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `);
    
    logger.info('Test data seeded successfully');
    
  } catch (error) {
    logger.error('Test data seeding failed', { error: error.message });
    throw error;
  }
}

/**
 * Get test database connection
 */
export function getTestDbConnection() {
  return testDbConnection;
}

/**
 * Get test Redis client
 */
export function getTestRedisClient() {
  return testRedisClient;
}

/**
 * Create large dataset for performance testing
 */
export async function createPerformanceTestData(recordCount = 100000) {
  if (!testDbConnection) throw new Error('Test database not initialized');
  
  try {
    logger.info(`Creating ${recordCount} test records for performance testing...`);
    
    // Generate batch inserts for better performance
    const batchSize = 1000;
    const batches = Math.ceil(recordCount / batchSize);
    
    for (let batch = 0; batch < batches; batch++) {
      const values = [];
      const currentBatchSize = Math.min(batchSize, recordCount - (batch * batchSize));
      
      for (let i = 0; i < currentBatchSize; i++) {
        const index = (batch * batchSize) + i;
        values.push(
          `('perf-lead-${index}', 'perf${index}@example.com', 'User${index}', 'Test${index}', 'Company${index % 100}', 'new', NOW(), NOW())`
        );
      }
      
      if (values.length > 0) {
        const query = `
          INSERT INTO leads (id, email, first_name, last_name, company, status, created_at, updated_at)
          VALUES ${values.join(', ')}
          ON CONFLICT (id) DO NOTHING
        `;
        
        await testDbConnection.query(query);
      }
      
      // Progress logging
      if (batch % 10 === 0) {
        logger.info(`Performance test data: ${Math.min((batch + 1) * batchSize, recordCount)}/${recordCount} records created`);
      }
    }
    
    logger.info(`Performance test data creation completed: ${recordCount} records`);
    
  } catch (error) {
    logger.error('Performance test data creation failed', { error: error.message });
    throw error;
  }
}

/**
 * Clean performance test data
 */
export async function cleanPerformanceTestData() {
  if (!testDbConnection) return;
  
  try {
    await testDbConnection.query("DELETE FROM leads WHERE id LIKE 'perf-lead-%'");
    logger.info('Performance test data cleaned');
    
  } catch (error) {
    logger.error('Performance test data cleanup failed', { error: error.message });
    throw error;
  }
}