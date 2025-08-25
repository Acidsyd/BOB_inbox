import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './__tests__/performance',
  timeout: 300000, // 5 minutes for performance tests
  fullyParallel: false, // Run performance tests sequentially to avoid resource conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for consistent performance measurements
  reporter: [
    ['html', { outputFolder: 'performance-reports/html' }],
    ['json', { outputFile: 'performance-reports/results.json' }],
    ['junit', { outputFile: 'performance-reports/junit.xml' }]
  ],
  outputDir: 'performance-test-results/',
  
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 60000,
    navigationTimeout: 60000,
    // Collect performance metrics
    extraHTTPHeaders: {
      'Accept': 'application/json',
    },
  },

  projects: [
    {
      name: 'chromium-performance',
      use: { 
        ...devices['Desktop Chrome'],
        // Enable performance monitoring
        contextOptions: {
          recordVideo: {
            dir: 'performance-test-results/videos',
            size: { width: 1920, height: 1080 }
          }
        }
      },
    },
  ],

  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});