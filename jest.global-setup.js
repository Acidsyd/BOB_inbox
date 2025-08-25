/**
 * Jest Global Setup
 * Runs once before all test suites
 */

import { setupDatabase, setupRedis } from './test-utils/test-database.js';
import { logger } from './backend/src/utils/logger.js';

export default async function globalSetup() {
  console.log('🚀 Starting global test setup...');

  try {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests
    
    // Setup test database
    console.log('📦 Setting up test database...');
    await setupDatabase();
    
    // Setup Redis for queue testing
    console.log('🔴 Setting up Redis for queue testing...');
    await setupRedis();
    
    // Setup test data directories
    console.log('📁 Creating test directories...');
    const fs = await import('fs');
    const path = await import('path');
    
    const testDirs = [
      'test-reports',
      'test-reports/html',
      'performance-reports',
      'security-reports',
      'accessibility-reports',
      'coverage-combined'
    ];
    
    for (const dir of testDirs) {
      const dirPath = path.resolve(dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    }
    
    // Set up test file uploads directory
    const uploadsDir = path.resolve('test-uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    console.log('✅ Global test setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Global test setup failed:', error);
    logger.error('Global test setup failed', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}