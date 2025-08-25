/**
 * Jest Configuration for Mailsender Test Suite
 * Supports both backend (Node.js) and frontend (Next.js) testing
 */

export default {
  // Test environments for different parts of the application
  projects: [
    // Backend API Tests
    {
      displayName: 'Backend API Tests',
      testMatch: ['<rootDir>/backend/tests/**/*.test.js'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/backend/tests/setup.cjs'],
      moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/backend/src/$1'
      },
      collectCoverageFrom: [
        'backend/src/**/*.js',
        '!backend/src/index.js',
        '!backend/src/**/*.test.js',
        '!backend/src/database/migrate.js'
      ],
      coverageDirectory: '<rootDir>/coverage/backend',
      coverageReporters: ['text', 'lcov', 'html'],
      transform: {},
      extensionsToTreatAsEsm: ['.js'],
      globals: {
        'ts-jest': {
          useESM: true
        }
      }
    },
    
    // Frontend Component Tests
    {
      displayName: 'Frontend Components',
      testMatch: ['<rootDir>/frontend/**/*.test.{js,jsx,ts,tsx}'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: [
        '<rootDir>/frontend/jest.setup.js'
      ],
      moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/frontend/$1',
        '^@/components/(.*)$': '<rootDir>/frontend/components/$1',
        '^@/lib/(.*)$': '<rootDir>/frontend/lib/$1',
        '^@/hooks/(.*)$': '<rootDir>/frontend/hooks/$1',
        '^@/app/(.*)$': '<rootDir>/frontend/app/$1'
      },
      transform: {
        '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
          presets: [
            ['next/babel', { 'preset-env': { modules: 'commonjs' } }]
          ]
        }]
      },
      collectCoverageFrom: [
        'frontend/**/*.{js,jsx,ts,tsx}',
        '!frontend/**/*.d.ts',
        '!frontend/node_modules/**',
        '!frontend/.next/**',
        '!frontend/coverage/**',
        '!frontend/**/*.test.{js,jsx,ts,tsx}',
        '!frontend/**/*.spec.{js,jsx,ts,tsx}',
        '!frontend/jest.config.js',
        '!frontend/jest.setup.js'
      ],
      coverageDirectory: '<rootDir>/coverage/frontend',
      coverageReporters: ['text', 'lcov', 'html'],
      moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],
      testPathIgnorePatterns: [
        '<rootDir>/frontend/.next/',
        '<rootDir>/frontend/node_modules/'
      ]
    }
  ],

  // Global settings
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  
  // Combined coverage threshold - enhanced for comprehensive testing
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 85,
      statements: 85
    },
    // Specific thresholds for critical modules
    './backend/src/services/': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './frontend/components/leads/': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },

  // Test timeouts
  testTimeout: 30000,
  
  // Verbose output
  verbose: true,
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/backend/node_modules/',
    '<rootDir>/frontend/node_modules/',
    '<rootDir>/backend/.next/',
    '<rootDir>/frontend/.next/'
  ],

  // Watch mode ignore
  watchPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/dist/',
    '<rootDir>/build/'
  ],

  // Global setup and teardown
  globalSetup: '<rootDir>/test-utils/global-setup.js',
  globalTeardown: '<rootDir>/test-utils/global-teardown.js',

  // Custom reporters
  reporters: [
    'default',
    [
      'jest-html-reporters', 
      {
        publicPath: './coverage',
        filename: 'test-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'Mailsender Test Results',
        logoImgPath: undefined,
        includeFailureMsg: true,
        includeSuiteFailure: true
      }
    ]
  ],

  // Error handling
  bail: false,
  errorOnDeprecated: true,

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,

  // Notification settings for watch mode
  notify: true,
  notifyMode: 'failure-change',

  // Test result cache
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',

  // Max worker processes
  maxWorkers: '50%',

  // Test retry configuration
  retry: 1
}