import { FullConfig } from '@playwright/test';

/**
 * Global Teardown for Playwright Tests
 * Cleans up test environment
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up test environment...');
  
  try {
    // Clean up any test data if needed
    console.log('📊 Test cleanup completed');
    
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
  }
}

export default globalTeardown;