/**
 * Jest Test Setup
 * Global configuration and mocks for all tests
 */

// Extend Jest matchers
import '@testing-library/jest-dom';

// Mock Prisma Client
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    employee: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
    complianceSnapshot: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    complianceAlert: {
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    addressLookupCache: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    hubzoneArea: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    hubzoneMapChange: {
      findMany: jest.fn(),
    },
    contractOpportunity: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    attemptToMaintain: {
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    addressVerification: {
      findMany: jest.fn(),
    },
    complianceEvent: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };

  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
    Prisma: {
      InputJsonValue: {},
    },
  };
});

// Global test utilities
global.console = {
  ...console,
  log: jest.fn(), // Suppress console.log in tests
  error: console.error,
  warn: console.warn,
  info: jest.fn(),
  debug: jest.fn(),
};

// Performance measurement helper
global.measurePerformance = async <T>(
  fn: () => Promise<T>,
  label: string
): Promise<{ result: T; durationMs: number }> => {
  const start = performance.now();
  const result = await fn();
  const durationMs = performance.now() - start;
  return { result, durationMs };
};

// Type declarations
declare global {
  function measurePerformance<T>(
    fn: () => Promise<T>,
    label: string
  ): Promise<{ result: T; durationMs: number }>;
}

export {};
