# Agent Stress Testing Guide

## Overview

This document describes the comprehensive stress testing suite for HZ Navigator MVP agents. Each agent has tests covering their specific responsibilities per the testing matrix.

## Testing Matrix Summary

| Agent | Tests Own Functionality | Tests UI/UX | Provides Feedback On |
|-------|------------------------|-------------|---------------------|
| **SENTINEL** | Compliance calculation accuracy, edge cases (34.9%, 35.0%, 35.1%) | Dashboard gauge visibility, alert actionability | Compliance display clarity |
| **CARTOGRAPH** | Address parsing, HUBZone boundary precision, API reliability | Address form autocomplete, error messages | Map interface, address forms |
| **WORKFORCE** | 90-day residency, legacy limits, data integrity | Employee forms, roster tables | Employee management flows |
| **CAPTURE** | Deduplication, pipeline calculations, deadline sorting | Pipeline visualization, opportunity cards | Search relevance, bid/no-bid UX |
| **ORACLE** | Forecast accuracy (backtest), statistical validity | Chart rendering, confidence display | Performance metrics |
| **GUARDIAN** | Evidence completeness, gap detection | Audit wizard, checklists | Documentation workflows |

## Running Tests

```bash
# Install dependencies (if not already done)
npm install

# Run all tests
npm test

# Run specific test suites
npm run test:stress          # All stress tests
npm run test:unit            # Unit tests only
npm run test:ui              # UI tests only

# Run individual agent tests
npm run test:sentinel        # SENTINEL agent tests
npm run test:cartograph      # CARTOGRAPH agent tests
npm run test:workforce       # WORKFORCE agent tests
npm run test:capture         # CAPTURE agent tests
npm run test:oracle          # ORACLE agent tests
npm run test:guardian        # GUARDIAN agent tests

# Watch mode for development
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Key Stress Tests Per Agent

### SENTINEL
- **Boundary compliance (35% threshold)**: Tests exact values at 34.9%, 35.0%, 35.1%
- **Large workforce (500+ employees)**: Performance under load
- **Rapid state changes**: Concurrent calculations without data corruption

### CARTOGRAPH
- **Malformed addresses**: 20+ edge cases including empty, unicode, special chars
- **HUBZone boundary edges**: All HUBZone types (QCT, QNMC, DDA, BRAC, GOV, INDIAN)
- **Batch verification (200 addresses)**: Performance with rate limiting

### WORKFORCE
- **90-day residency**: Exact boundary testing (89, 90, 91 days)
- **Legacy limits**: Max 4 legacy employees enforcement
- **Data integrity**: Address change clears verification status

### CAPTURE
- **Deduplication**: Same noticeId handling via upsert
- **Pipeline calculations**: Weighted value, status counts
- **Deadline sorting**: Chronological ordering, past deadline filtering

### ORACLE
- **Forecast performance**: All operations < 5 seconds
- **Prediction accuracy**: 70%+ trend identification target
- **Insufficient data**: Graceful handling with clear messages

### GUARDIAN
- **Evidence completeness**: All required sections in audit package
- **Gap detection**: Outdated verifications, missing ATM records
- **Audit readiness scoring**: 5-category assessment

## Performance Thresholds

| Operation | Max Time |
|-----------|----------|
| Compliance calculation (500 employees) | 5 seconds |
| Batch address verification (200) | 30 seconds |
| Forecast generation | 5 seconds |
| Evidence package generation | 10 seconds |
| Risk assessment | 5 seconds |

## Test File Structure

```
tests/
├── setup.ts                      # Global test configuration
├── utils/
│   └── mockDataGenerators.ts     # Mock data factories
├── stress/
│   ├── sentinel.stress.test.ts   # SENTINEL stress tests
│   ├── cartograph.stress.test.ts # CARTOGRAPH stress tests
│   ├── workforce.stress.test.ts  # WORKFORCE stress tests
│   ├── capture.stress.test.ts    # CAPTURE stress tests
│   ├── oracle.stress.test.ts     # ORACLE stress tests
│   └── guardian.stress.test.ts   # GUARDIAN stress tests
├── unit/                         # Unit tests (future)
└── ui/                           # UI component tests (future)
```

## Mock Data Generators

The `mockDataGenerators.ts` file provides:

- `generateMockEmployee()` - Single employee with configurable options
- `generateEmployeesForCompliance()` - Employees targeting specific compliance %
- `generateLargeWorkforce()` - 500+ employees for stress testing
- `generateComplianceHistory()` - Historical snapshots with trend simulation
- `generateMalformedAddresses()` - 20 edge case addresses
- `generateValidAddresses()` - Batch of valid addresses
- `generateOpportunities()` - Contract opportunities
- `generateEmployeesWithResidencyStatus()` - 90-day testing scenarios
- `generateEmployeesWithLegacyStatus()` - Legacy limit testing

## Coverage Thresholds

The test suite enforces:
- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

## Adding New Tests

1. Identify the agent and test category
2. Add test to appropriate `tests/stress/{agent}.stress.test.ts`
3. Use mock data generators for consistency
4. Include performance assertions where applicable
5. Document edge cases being tested

## Continuous Integration

Tests are configured to run in CI with:
- 30-second timeout for standard tests
- 60-second timeout for stress tests
- Parallel execution where possible
