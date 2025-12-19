/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts?(x)',
    '**/?(*.)+(spec|test).ts?(x)',
    '**/stress/**/*.test.ts?(x)',
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
    }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 30000, // 30 seconds for stress tests
  collectCoverageFrom: [
    'src/agents/**/*.ts',
    '!src/agents/**/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  verbose: true,
  // Separate configurations for stress tests
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
      testEnvironment: 'node',
    },
    {
      displayName: 'stress',
      testMatch: ['<rootDir>/tests/stress/**/*.test.ts'],
      testEnvironment: 'node',
      testTimeout: 60000, // 60 seconds for stress tests
    },
    {
      displayName: 'ui',
      testMatch: ['<rootDir>/tests/ui/**/*.test.tsx'],
      testEnvironment: 'jsdom',
    },
  ],
};

module.exports = config;
