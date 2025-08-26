/**
 * Simplified Jest Configuration
 * Basic testing setup for essential functionality
 */

export default {
  projects: [
    // Backend Tests
    {
      displayName: 'Backend Tests',
      testMatch: ['<rootDir>/backend/tests/**/*.test.js'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/backend/tests/setup.cjs'],
      collectCoverageFrom: [
        'backend/src/**/*.js',
        '!backend/src/**/*.test.js'
      ]
    },
    
    // Frontend Tests
    {
      displayName: 'Frontend Tests',
      testMatch: ['<rootDir>/frontend/**/*.test.{js,jsx,ts,tsx}'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/frontend/jest.setup.js'],
      transform: {
        '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
          presets: [['next/babel']]
        }]
      },
      collectCoverageFrom: [
        'frontend/**/*.{js,jsx,ts,tsx}',
        '!frontend/**/*.test.{js,jsx,ts,tsx}',
        '!frontend/.next/**'
      ]
    }
  ],

  collectCoverage: false,
  testTimeout: 10000,
  clearMocks: true
}