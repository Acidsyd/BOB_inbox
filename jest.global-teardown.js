/**
 * Jest Global Teardown
 * Runs once after all test suites complete
 */

import { teardownDatabase, teardownRedis } from './test-utils/test-database.js';
import { logger } from './backend/src/utils/logger.js';

export default async function globalTeardown() {
  console.log('🧹 Starting global test teardown...');

  try {
    // Cleanup test database
    console.log('🗃️ Cleaning up test database...');
    await teardownDatabase();
    
    // Cleanup Redis
    console.log('🔴 Cleaning up Redis...');
    await teardownRedis();
    
    // Clean up test files
    console.log('📁 Cleaning up test files...');
    const fs = await import('fs');
    const path = await import('path');
    
    // Remove test uploads
    const uploadsDir = path.resolve('test-uploads');
    if (fs.existsSync(uploadsDir)) {
      fs.rmSync(uploadsDir, { recursive: true, force: true });
    }
    
    // Generate final test summary
    console.log('📊 Generating test summary...');
    const coverageDir = path.resolve('coverage');
    if (fs.existsSync(coverageDir)) {
      const summaryPath = path.join(coverageDir, 'test-summary.json');
      const summary = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        totalTestSuites: [
          'Backend Unit Tests',
          'Backend Integration Tests', 
          'Frontend Component Tests',
          'End-to-End Tests',
          'Performance Tests',
          'Security Tests',
          'Accessibility Tests'
        ],
        coverageThresholds: {
          global: {
            branches: 80,
            functions: 80,
            lines: 85,
            statements: 85
          }
        }
      };
      
      fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    }
    
    console.log('✅ Global test teardown completed successfully!');
    
  } catch (error) {
    console.error('❌ Global test teardown failed:', error);
    logger.error('Global test teardown failed', { error: error.message, stack: error.stack });
    // Don't exit with error as tests may have completed successfully
  }
}