/** @type {import('jest').Config} */

// Shared configuration for TypeScript transformation
const sharedConfig = {
  preset: 'ts-jest',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: false,
      tsconfig: '<rootDir>/tsconfig.json',
    }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
};

const config = {
  // Root-level settings
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts?(x)',
    '**/?(*.)+(spec|test).ts?(x)',
    '**/stress/**/*.test.ts?(x)',
  ],
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
  
  // Project configurations - each inherits shared config
  projects: [
    {
      ...sharedConfig,
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
      testEnvironment: 'node',
      testTimeout: 30000,
    },
    {
      ...sharedConfig,
      displayName: 'stress',
      testMatch: ['<rootDir>/tests/stress/**/*.test.ts'],
      testEnvironment: 'node',
      testTimeout: 60000, // 60 seconds for stress tests
    },
    {
      ...sharedConfig,
      displayName: 'ui',
      testMatch: ['<rootDir>/tests/ui/**/*.test.tsx'],
      testEnvironment: 'jsdom',
      testTimeout: 30000,
    },
  ],
};

module.exports = config;
