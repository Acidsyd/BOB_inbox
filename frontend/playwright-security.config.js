import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './__tests__/security',
  timeout: 120000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 1,
  reporter: [
    ['html', { outputFolder: 'security-reports/html' }],
    ['json', { outputFile: 'security-reports/results.json' }],
    ['junit', { outputFile: 'security-reports/junit.xml' }]
  ],
  outputDir: 'security-test-results/',
  
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 30000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'security-tests',
      use: { 
        ...devices['Desktop Chrome'],
        // Security-focused settings
        contextOptions: {
          // Disable web security for security testing scenarios
          ignoreHTTPSErrors: true,
          // Enable request/response interception for security testing
          extraHTTPHeaders: {
            'X-Test-Security': 'enabled'
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