#!/usr/bin/env node

/**
 * Comprehensive Test Suite Runner
 * 
 * Runs all the newly created test suites for the critical user workflows
 * and generates comprehensive coverage reports.
 * 
 * Test Suites:
 * 1. OAuth2 Account Addition Flow Integration Tests
 * 2. Campaign Creation Workflow Tests
 * 3. Database Tracking Integration Tests
 * 4. Navigation Context Provider Tests (Frontend)
 * 5. Authentication Context Integration Tests (Frontend)
 * 6. Playwright End-to-End Critical Journey Tests
 * 7. Error Recovery Scenarios Tests
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Test configuration
const TEST_CONFIG = {
  backend: {
    testDir: path.join(__dirname, 'backend', 'tests'),
    coverageDir: path.join(__dirname, 'backend', 'coverage'),
    packageDir: path.join(__dirname, 'backend'),
    testFiles: [
      'integration/oauth2-account-addition-flow.test.js',
      'integration/campaign-creation-workflow.test.js', 
      'integration/database-tracking-integration.test.js',
      'integration/error-recovery-scenarios.test.js'
    ]
  },
  frontend: {
    testDir: path.join(__dirname, 'frontend', '__tests__'),
    coverageDir: path.join(__dirname, 'frontend', 'coverage'),
    packageDir: path.join(__dirname, 'frontend'),
    testFiles: [
      'lib/navigation-context.test.tsx',
      'lib/auth-context.test.tsx'
    ]
  },
  playwright: {
    testDir: path.join(__dirname, 'backend', 'tests', 'playwright'),
    reportDir: path.join(__dirname, 'backend', 'playwright-report'),
    packageDir: path.join(__dirname, 'backend'),
    testFiles: [
      'critical-workflow-journeys.spec.js'
    ]
  }
};

// Utility functions
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logHeader(message) {
  const separator = '='.repeat(60);
  log('\n' + separator, colors.blue);
  log(`${colors.bold}${message}${colors.reset}`, colors.blue);
  log(separator, colors.blue);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'pipe',
      shell: true,
      ...options
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      if (options.showOutput) {
        process.stdout.write(output);
      }
    });

    child.stderr?.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      if (options.showOutput) {
        process.stderr.write(output);
      }
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr, code });
      } else {
        reject(new Error(`Command failed with code ${code}\nstdout: ${stdout}\nstderr: ${stderr}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

// Test runners
async function runBackendTests() {
  logHeader('Running Backend Integration Tests');
  
  const { packageDir, testFiles, coverageDir } = TEST_CONFIG.backend;
  
  try {
    // Check if test files exist
    for (const testFile of testFiles) {
      const fullPath = path.join(TEST_CONFIG.backend.testDir, testFile);
      try {
        await fs.access(fullPath);
        logSuccess(`Test file found: ${testFile}`);
      } catch (error) {
        logWarning(`Test file not found: ${testFile}`);
      }
    }

    // Run tests with coverage
    log('\nRunning Jest tests with coverage...');
    
    const jestArgs = [
      '--testMatch=**/oauth2-account-addition-flow.test.js',
      '--testMatch=**/campaign-creation-workflow.test.js',
      '--testMatch=**/database-tracking-integration.test.js',
      '--testMatch=**/error-recovery-scenarios.test.js',
      '--coverage',
      '--coverageDirectory=' + coverageDir,
      '--coverageReporters=text',
      '--coverageReporters=html',
      '--coverageReporters=json',
      '--collectCoverageFrom=src/**/*.js',
      '--collectCoverageFrom=!src/index.js',
      '--collectCoverageFrom=!src/scripts/**',
      '--verbose'
    ];

    const result = await runCommand('npx', ['jest', ...jestArgs], {
      cwd: packageDir,
      showOutput: true
    });

    logSuccess('Backend tests completed successfully');
    return { success: true, details: result };

  } catch (error) {
    logError(`Backend tests failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runFrontendTests() {
  logHeader('Running Frontend React Tests');
  
  const { packageDir, testFiles, coverageDir } = TEST_CONFIG.frontend;
  
  try {
    // Check if test files exist
    for (const testFile of testFiles) {
      const fullPath = path.join(TEST_CONFIG.frontend.testDir, testFile);
      try {
        await fs.access(fullPath);
        logSuccess(`Test file found: ${testFile}`);
      } catch (error) {
        logWarning(`Test file not found: ${testFile}`);
      }
    }

    // Run Jest tests for frontend
    log('\nRunning Jest tests for React components...');
    
    const jestArgs = [
      '--testMatch=**/__tests__/lib/navigation-context.test.tsx',
      '--testMatch=**/__tests__/lib/auth-context.test.tsx',
      '--coverage',
      '--coverageDirectory=' + coverageDir,
      '--coverageReporters=text',
      '--coverageReporters=html',
      '--collectCoverageFrom=lib/**/*.{ts,tsx}',
      '--collectCoverageFrom=components/**/*.{ts,tsx}',
      '--collectCoverageFrom=!**/*.d.ts',
      '--verbose'
    ];

    const result = await runCommand('npx', ['jest', ...jestArgs], {
      cwd: packageDir,
      showOutput: true
    });

    logSuccess('Frontend tests completed successfully');
    return { success: true, details: result };

  } catch (error) {
    logError(`Frontend tests failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runPlaywrightTests() {
  logHeader('Running Playwright End-to-End Tests');
  
  const { packageDir, testFiles, reportDir } = TEST_CONFIG.playwright;
  
  try {
    // Check if test files exist
    for (const testFile of testFiles) {
      const fullPath = path.join(TEST_CONFIG.playwright.testDir, testFile);
      try {
        await fs.access(fullPath);
        logSuccess(`Test file found: ${testFile}`);
      } catch (error) {
        logWarning(`Test file not found: ${testFile}`);
      }
    }

    // Run Playwright tests
    log('\nRunning Playwright E2E tests...');
    
    const playwrightArgs = [
      'test',
      'tests/playwright/critical-workflow-journeys.spec.js',
      '--reporter=html',
      '--output=' + reportDir
    ];

    const result = await runCommand('npx', ['playwright', ...playwrightArgs], {
      cwd: packageDir,
      showOutput: true,
      env: {
        ...process.env,
        CI: 'true' // Enable CI mode for consistent behavior
      }
    });

    logSuccess('Playwright tests completed successfully');
    return { success: true, details: result };

  } catch (error) {
    logError(`Playwright tests failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function generateSummaryReport(results) {
  logHeader('Test Execution Summary');
  
  const summary = {
    totalSuites: results.length,
    passed: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    timestamp: new Date().toISOString()
  };

  log(`\n📊 Test Suite Summary:`);
  log(`   Total Suites: ${summary.totalSuites}`);
  logSuccess(`   Passed: ${summary.passed}`);
  if (summary.failed > 0) {
    logError(`   Failed: ${summary.failed}`);
  }

  results.forEach((result, index) => {
    const suiteName = ['Backend Integration', 'Frontend React', 'Playwright E2E'][index];
    if (result.success) {
      logSuccess(`   ✅ ${suiteName}: PASSED`);
    } else {
      logError(`   ❌ ${suiteName}: FAILED`);
      log(`      Error: ${result.error}`, colors.red);
    }
  });

  // Generate coverage summary
  log(`\n📈 Coverage Reports Generated:`);
  log(`   Backend: ${TEST_CONFIG.backend.coverageDir}/index.html`);
  log(`   Frontend: ${TEST_CONFIG.frontend.coverageDir}/index.html`);
  log(`   Playwright: ${TEST_CONFIG.playwright.reportDir}/index.html`);

  // Save summary to file
  const summaryPath = path.join(__dirname, 'test-summary.json');
  await fs.writeFile(summaryPath, JSON.stringify({
    summary,
    results,
    coverageLocations: {
      backend: TEST_CONFIG.backend.coverageDir,
      frontend: TEST_CONFIG.frontend.coverageDir,
      playwright: TEST_CONFIG.playwright.reportDir
    }
  }, null, 2));

  logSuccess(`Test summary saved to: ${summaryPath}`);
  
  return summary;
}

// Main execution function
async function main() {
  const startTime = Date.now();
  
  logHeader('Comprehensive Test Suite Execution');
  log('Testing critical user workflows fixed in previous phases:');
  log('1. OAuth2 Account Addition Flow');
  log('2. Campaign Creation Workflow'); 
  log('3. Database Schema Tracking Fixes');
  log('4. Navigation Context Preservation');
  log('5. Authentication Flow Integration');
  log('6. End-to-End User Journeys');
  log('7. Error Recovery Scenarios\n');

  const results = [];

  try {
    // Run all test suites
    log('Starting test execution...\n');

    // Backend integration tests
    const backendResult = await runBackendTests();
    results.push(backendResult);

    // Frontend React tests  
    const frontendResult = await runFrontendTests();
    results.push(frontendResult);

    // Playwright E2E tests (may skip if no browser setup)
    try {
      const playwrightResult = await runPlaywrightTests();
      results.push(playwrightResult);
    } catch (error) {
      logWarning('Playwright tests skipped (browser setup may be required)');
      results.push({ 
        success: false, 
        error: 'Skipped - browser setup required',
        skipped: true 
      });
    }

    // Generate summary report
    const summary = await generateSummaryReport(results);

    const duration = Math.round((Date.now() - startTime) / 1000);
    logHeader(`Test Execution Complete (${duration}s)`);

    if (summary.failed === 0) {
      logSuccess('🎉 All test suites passed successfully!');
      logSuccess('Critical user workflows are comprehensively tested and protected against regressions.');
      process.exit(0);
    } else {
      logError(`${summary.failed} test suite(s) failed. Please review the errors above.`);
      process.exit(1);
    }

  } catch (error) {
    logError(`Test execution failed: ${error.message}`);
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  log('\n\nTest execution interrupted by user');
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  logError(`Unhandled rejection: ${error.message}`);
  process.exit(1);
});

// Run the test suite
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}