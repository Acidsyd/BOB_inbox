import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './__tests__/accessibility',
  timeout: 60000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 1,
  reporter: [
    ['html', { outputFolder: 'accessibility-reports/html' }],
    ['json', { outputFile: 'accessibility-reports/results.json' }],
    ['junit', { outputFile: 'accessibility-reports/junit.xml' }]
  ],
  outputDir: 'accessibility-test-results/',
  
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
      name: 'accessibility-tests',
      use: { 
        ...devices['Desktop Chrome'],
        // Accessibility-focused settings
        contextOptions: {
          // Enable screen reader simulation
          extraHTTPHeaders: {
            'X-Test-Accessibility': 'enabled'
          }
        }
      },
    },
    // Test with different screen readers and assistive technologies
    {
      name: 'high-contrast',
      use: {
        ...devices['Desktop Chrome'],
        colorScheme: 'dark',
        contextOptions: {
          extraHTTPHeaders: {
            'X-Test-High-Contrast': 'enabled'
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