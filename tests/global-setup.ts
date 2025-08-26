import { FullConfig } from '@playwright/test';
import { execSync } from 'child_process';

/**
 * Global Setup for Playwright Tests
 * Initializes test environment with MCP integration
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Setting up Playwright test environment...');
  
  try {
    // Setup test database with known data
    console.log('📊 Setting up test database state...');
    
    // Ensure backend and frontend are running
    console.log('🔍 Checking server status...');
    
    // Wait for services to be ready
    await waitForService('http://localhost:4000/health', 30000);
    await waitForService('http://localhost:3001', 30000);
    
    console.log('✅ Test environment ready');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    process.exit(1);
  }
}

async function waitForService(url: string, timeout: number): Promise<void> {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    try {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(url);
      if (response.ok) {
        console.log(`✅ Service ${url} is ready`);
        return;
      }
    } catch (error) {
      // Service not ready, continue waiting
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw new Error(`Service ${url} did not become ready within ${timeout}ms`);
}

export default globalSetup;