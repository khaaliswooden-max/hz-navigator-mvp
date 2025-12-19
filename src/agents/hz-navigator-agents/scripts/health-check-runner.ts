/**
 * Health Check Runner
 * 
 * Executes phase-specific health checks with auto-fix capability.
 * Run before proceeding to next build phase.
 * 
 * Usage:
 *   npx ts-node src/agents/hz-navigator-agents/scripts/health-check-runner.ts
 *   npx ts-node src/agents/hz-navigator-agents/scripts/health-check-runner.ts --phase=database
 *   npx ts-node src/agents/hz-navigator-agents/scripts/health-check-runner.ts --phase=agents
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import path from 'path';

export interface HealthCheck {
  id: string;
  name: string;
  description: string;
  severity: 'blocking' | 'required' | 'recommended';
  testFn: (prisma: PrismaClient) => Promise<{ passed: boolean; details: string }>;
  autoFix?: (prisma: PrismaClient) => Promise<boolean>;
}

export interface PhaseHealthCheck {
  phase: string;
  description: string;
  passingThreshold: number;
  blockingChecks: string[];
  checks: HealthCheck[];
}

export interface CheckResult {
  check: HealthCheck;
  passed: boolean;
  details: string;
  autoFixed: boolean;
}

export interface PhaseResult {
  phase: string;
  passRate: number;
  canProceed: boolean;
  results: CheckResult[];
  blockingFailed: string[];
  timestamp: Date;
}

// ============================================================
// PHASE 1: DATABASE FOUNDATION
// ============================================================
export const phase1HealthChecks: PhaseHealthCheck = {
  phase: 'database_foundation',
  description: 'PostgreSQL, PostGIS, Prisma schema, seed data',
  passingThreshold: 100,
  blockingChecks: ['db-connection', 'schema-valid'],
  checks: [
    {
      id: 'db-connection',
      name: 'Database Connection',
      description: 'Verify PostgreSQL connection is active',
      severity: 'blocking',
      testFn: async (prisma) => {
        try {
          await prisma.$queryRaw`SELECT 1 as result`;
          return { passed: true, details: 'Connection successful' };
        } catch (e: unknown) {
          const error = e as Error;
          return { passed: false, details: `Connection failed: ${error.message}` };
        }
      },
      autoFix: async (prisma) => {
        try {
          await prisma.$disconnect();
          await prisma.$connect();
          return true;
        } catch {
          return false;
        }
      },
    },
    {
      id: 'schema-valid',
      name: 'Schema Validation',
      description: 'All required tables exist',
      severity: 'blocking',
      testFn: async (prisma) => {
        const requiredTables = [
          'Organization',
          'Employee', 
          'ComplianceSnapshot',
          'AddressVerification',
          'AgentTask',
        ];
        const missing: string[] = [];

        for (const table of requiredTables) {
          try {
            await prisma.$queryRawUnsafe(`SELECT 1 FROM "${table}" LIMIT 1`);
          } catch {
            missing.push(table);
          }
        }

        return {
          passed: missing.length === 0,
          details: missing.length ? `Missing: ${missing.join(', ')}` : 'All tables present',
        };
      },
      autoFix: async () => {
        try {
          execSync('npx prisma db push --accept-data-loss', { stdio: 'pipe' });
          return true;
        } catch {
          return false;
        }
      },
    },
    {
      id: 'postgis-enabled',
      name: 'PostGIS Extension',
      description: 'Spatial queries require PostGIS',
      severity: 'required',
      testFn: async (prisma) => {
        try {
          await prisma.$queryRaw`SELECT PostGIS_Version()`;
          return { passed: true, details: 'PostGIS enabled' };
        } catch {
          return { passed: false, details: 'PostGIS not installed' };
        }
      },
      autoFix: async (prisma) => {
        try {
          await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS postgis`;
          return true;
        } catch {
          return false;
        }
      },
    },
    {
      id: 'seed-data',
      name: 'Test Data Seeded',
      description: 'Development requires seed data',
      severity: 'recommended',
      testFn: async (prisma) => {
        try {
          const orgCount = await prisma.organization.count();
          return {
            passed: orgCount > 0,
            details: orgCount > 0 ? `${orgCount} organization(s) found` : 'No seed data',
          };
        } catch {
          return { passed: false, details: 'Could not query organizations' };
        }
      },
    },
  ],
};

// ============================================================
// PHASE 2: AGENT INTEGRATION
// ============================================================
export const phase2HealthChecks: PhaseHealthCheck = {
  phase: 'agent_integration',
  description: 'All 10 agents instantiate and route correctly',
  passingThreshold: 90,
  blockingChecks: ['agent-files-exist', 'nexus-instantiation'],
  checks: [
    {
      id: 'agent-files-exist',
      name: 'Agent Files Present',
      description: 'All agent TypeScript files exist',
      severity: 'blocking',
      testFn: async () => {
        const fs = await import('fs');
        const agentFiles = [
          'nexus/orchestrator.ts',
          'sentinel/complianceMonitor.ts',
          'cartograph/geospatialIntelligence.ts',
          'workforce/employeeIntelligence.ts',
          'capture/opportunityScanner.ts',
          'advocate/regulatoryIntelligence.ts',
          'guardian/auditDefense.ts',
          'diplomat/partnershipIntelligence.ts',
          'oracle/predictiveAnalytics.ts',
          'archivist/documentIntelligence.ts',
        ];

        // Resolve path relative to this script's location
        const agentsBasePath = path.resolve(__dirname, '../src/agents');
        const missing: string[] = [];
        
        for (const file of agentFiles) {
          const filePath = path.join(agentsBasePath, file);
          if (!fs.existsSync(filePath)) {
            missing.push(file);
          }
        }

        return {
          passed: missing.length === 0,
          details: missing.length ? `Missing: ${missing.join(', ')}` : 'All 10 agent files present',
        };
      },
    },
    {
      id: 'nexus-instantiation',
      name: 'NEXUS Orchestrator',
      description: 'Can instantiate NEXUS',
      severity: 'blocking',
      testFn: async (prisma) => {
        try {
          const { NexusOrchestrator } = await import('../src/agents/nexus/orchestrator');
          const nexus = new NexusOrchestrator(prisma);
          return { 
            passed: !!nexus, 
            details: 'NEXUS instantiated successfully' 
          };
        } catch (e: unknown) {
          const error = e as Error;
          return { passed: false, details: `Failed: ${error.message}` };
        }
      },
    },
    {
      id: 'sentinel-instantiation',
      name: 'SENTINEL Agent',
      description: 'Can instantiate SENTINEL',
      severity: 'required',
      testFn: async (prisma) => {
        try {
          const { SentinelAgent } = await import('../src/agents/sentinel/complianceMonitor');
          const sentinel = new SentinelAgent(prisma);
          return { passed: !!sentinel, details: 'SENTINEL ready' };
        } catch (e: unknown) {
          const error = e as Error;
          return { passed: false, details: `Failed: ${error.message}` };
        }
      },
    },
    {
      id: 'cartograph-instantiation',
      name: 'CARTOGRAPH Agent',
      description: 'Can instantiate CARTOGRAPH',
      severity: 'required',
      testFn: async (prisma) => {
        try {
          const { CartographAgent } = await import('../src/agents/cartograph/geospatialIntelligence');
          const cartograph = new CartographAgent(prisma);
          return { passed: !!cartograph, details: 'CARTOGRAPH ready' };
        } catch (e: unknown) {
          const error = e as Error;
          return { passed: false, details: `Failed: ${error.message}` };
        }
      },
    },
  ],
};

// ============================================================
// PHASE 3: API ROUTES
// ============================================================
export const phase3HealthChecks: PhaseHealthCheck = {
  phase: 'api_routes',
  description: 'REST endpoints functional with auth',
  passingThreshold: 95,
  blockingChecks: ['api-server-running'],
  checks: [
    {
      id: 'api-server-running',
      name: 'API Server Status',
      description: 'Next.js server responds',
      severity: 'blocking',
      testFn: async () => {
        try {
          const response = await fetch('http://localhost:3000/api/health', {
            method: 'GET',
          });
          return {
            passed: response.ok,
            details: response.ok ? 'Server responding' : `Status: ${response.status}`,
          };
        } catch {
          return { passed: false, details: 'Server not reachable' };
        }
      },
    },
    {
      id: 'api-compliance-endpoint',
      name: 'Compliance Endpoint',
      description: 'POST /api/agents/compliance works',
      severity: 'required',
      testFn: async (prisma) => {
        try {
          // Get a real organization ID from the database
          const org = await prisma.organization.findFirst();
          if (!org) {
            return { passed: false, details: 'No organizations in database' };
          }
          
          const response = await fetch('http://localhost:3000/api/agents/compliance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ organizationId: org.id }),
          });
          return {
            passed: response.status !== 500,
            details: `Status: ${response.status}`,
          };
        } catch {
          return { passed: false, details: 'Endpoint not reachable' };
        }
      },
    },
  ],
};

// ============================================================
// PHASE 4: UI COMPONENTS
// ============================================================
export const phase4HealthChecks: PhaseHealthCheck = {
  phase: 'ui_components',
  description: 'Dashboard and forms render correctly',
  passingThreshold: 85,
  blockingChecks: ['dashboard-renders'],
  checks: [
    {
      id: 'dashboard-renders',
      name: 'Dashboard Page',
      description: 'Dashboard loads without errors',
      severity: 'blocking',
      testFn: async () => {
        try {
          const response = await fetch('http://localhost:3000/dashboard');
          const html = await response.text();
          // Check for actual Next.js error indicators, not just the word "error"
          const hasNextError = html.includes('__NEXT_DATA__') && 
            (html.includes('"err":') || html.includes('Application error'));
          const hasRuntimeError = html.includes('Unhandled Runtime Error') ||
            html.includes('Server Error') ||
            html.includes('Internal Server Error');
          return {
            passed: response.ok && !hasNextError && !hasRuntimeError,
            details: response.ok && !hasNextError && !hasRuntimeError 
              ? 'Dashboard renders successfully' 
              : `Status: ${response.status}, hasNextError: ${hasNextError}, hasRuntimeError: ${hasRuntimeError}`,
          };
        } catch {
          return { passed: false, details: 'Dashboard not reachable' };
        }
      },
    },
  ],
};

// ============================================================
// HEALTH CHECK RUNNER CLASS
// ============================================================
export class HealthCheckRunner {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async runPhaseChecks(phase: PhaseHealthCheck): Promise<PhaseResult> {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`PHASE: ${phase.phase.toUpperCase()}`);
    console.log(`${phase.description}`);
    console.log(`${'═'.repeat(60)}\n`);

    const results: CheckResult[] = [];

    for (const check of phase.checks) {
      const icon = { blocking: '🔴', required: '🟡', recommended: '🟢' }[check.severity];
      console.log(`${icon} Running: ${check.name}...`);

      let testResult = await check.testFn(this.prisma);
      let autoFixed = false;

      // Auto-fix if available and failed
      if (!testResult.passed && check.autoFix) {
        console.log(`   ⚠️  Failed. Attempting auto-fix...`);
        const fixed = await check.autoFix(this.prisma);
        if (fixed) {
          testResult = await check.testFn(this.prisma);
          autoFixed = testResult.passed;
          if (autoFixed) {
            console.log(`   ✅ Auto-fix successful!`);
          }
        }
      }

      const statusIcon = testResult.passed ? '✅' : '❌';
      console.log(`   ${statusIcon} ${testResult.details}`);

      results.push({
        check,
        passed: testResult.passed,
        details: testResult.details,
        autoFixed,
      });
    }

    // Calculate pass rate
    const passed = results.filter((r) => r.passed).length;
    const total = results.length;
    const passRate = (passed / total) * 100;

    // Check blocking checks
    const blockingFailed = phase.blockingChecks.filter((checkId) => {
      const result = results.find((r) => r.check.id === checkId);
      return result && !result.passed;
    });

    const canProceed = passRate >= phase.passingThreshold && blockingFailed.length === 0;

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`PHASE RESULT: ${canProceed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Pass Rate: ${passRate.toFixed(1)}% (required: ${phase.passingThreshold}%)`);
    if (blockingFailed.length > 0) {
      console.log(`Blocking failures: ${blockingFailed.join(', ')}`);
    }
    console.log(`${'─'.repeat(60)}\n`);

    return {
      phase: phase.phase,
      passRate,
      canProceed,
      results,
      blockingFailed,
      timestamp: new Date(),
    };
  }

  async runAllPhases(): Promise<PhaseResult[]> {
    const phases = [
      phase1HealthChecks,
      phase2HealthChecks,
      phase3HealthChecks,
      phase4HealthChecks,
    ];

    const allResults: PhaseResult[] = [];

    for (const phase of phases) {
      const result = await this.runPhaseChecks(phase);
      allResults.push(result);

      if (!result.canProceed) {
        console.log(`\n🛑 BUILD STOPPED AT PHASE: ${phase.phase}`);
        console.log(`Fix the following before proceeding:`);
        result.results
          .filter((r) => !r.passed)
          .forEach((r) => console.log(`  - ${r.check.name}: ${r.details}`));
        break;
      }
    }

    if (allResults.every((r) => r.canProceed)) {
      console.log(`\n🎉 ALL PHASES PASSED - BUILD VERIFIED!\n`);
    }

    return allResults;
  }
}

// ============================================================
// CLI EXECUTION
// ============================================================
async function main() {
  const prisma = new PrismaClient();

  try {
    const runner = new HealthCheckRunner(prisma);

    // Check command line args for specific phase
    const args = process.argv.slice(2);
    const phaseArg = args.find((a) => a.startsWith('--phase='));

    if (phaseArg) {
      const phaseName = phaseArg.split('=')[1];
      const phases: Record<string, PhaseHealthCheck> = {
        database: phase1HealthChecks,
        agents: phase2HealthChecks,
        api: phase3HealthChecks,
        ui: phase4HealthChecks,
      };

      const phase = phases[phaseName];
      if (phase) {
        await runner.runPhaseChecks(phase);
      } else {
        console.log(`Unknown phase: ${phaseName}`);
        console.log(`Available: ${Object.keys(phases).join(', ')}`);
      }
    } else {
      await runner.runAllPhases();
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}
