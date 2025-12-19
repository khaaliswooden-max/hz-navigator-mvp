/**
 * Feedback Cycle Runner
 * 
 * Orchestrates the complete feedback loop:
 * 1. Run health checks
 * 2. Execute agent self-tests
 * 3. Collect UI/UX feedback
 * 4. Aggregate and prioritize issues
 * 5. Generate patch list
 * 6. Log learning events
 */

import { PrismaClient, Prisma } from '@prisma/client';
import {
  HealthCheckRunner,
  phase1HealthChecks,
  phase2HealthChecks,
  phase3HealthChecks,
  phase4HealthChecks,
  PhaseHealthCheck,
  PhaseResult,
} from './health-check-runner';

// ============================================================
// TYPES
// ============================================================

export interface FeedbackEvent {
  id: string;
  cycleNumber: number;
  agentSource: string;
  taskType: string;
  category: 'bug' | 'ux_issue' | 'performance' | 'feature_gap' | 'data_quality';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  expectedBehavior: string;
  actualBehavior: string;
  reproductionSteps: string[];
  inputData: Record<string, unknown>;
  outputData: Record<string, unknown>;
  status: 'open' | 'in_progress' | 'resolved' | 'wont_fix';
  resolution?: string;
  preventionStrategy?: string;
  addedToTestSuite: boolean;
  createdAt: Date;
}

export interface Patch {
  id: string;
  feedbackId: string;
  description: string;
  priority: number;
  estimatedEffort: 'small' | 'medium' | 'large';
  component: string;
  suggestedFix: string;
}

export interface CycleResult {
  cycleNumber: number;
  phase: string;
  status: 'passed' | 'blocked' | 'needs_patches';
  healthScore: number;
  feedbackCount: number;
  bySeverity: Record<string, number>;
  blockers: string[];
  patches: Patch[];
  recommendation: string;
  timestamp: Date;
}

// ============================================================
// AGENT SELF-TEST FUNCTIONS
// ============================================================

async function runSentinelSelfTest(prisma: PrismaClient, cycleNumber: number): Promise<FeedbackEvent[]> {
  const feedback: FeedbackEvent[] = [];

  // Test 1: Compliance calculation accuracy
  try {
    const { SentinelAgent } = await import('../src/agents/sentinel/complianceMonitor');
    const sentinel = new SentinelAgent(prisma);

    // Find a test organization
    const org = await prisma.organization.findFirst();
    if (org) {
      const result = await sentinel.execute('calculate_compliance', {}, org.id);

      // Check if percentage is returned
      if (result.percentage === undefined) {
        feedback.push({
          id: `sentinel-${cycleNumber}-1`,
          cycleNumber,
          agentSource: 'SENTINEL',
          taskType: 'calculate_compliance',
          category: 'bug',
          severity: 'critical',
          description: 'Compliance calculation returns no percentage',
          expectedBehavior: 'Returns percentage between 0-100',
          actualBehavior: `Returns: ${JSON.stringify(result)}`,
          reproductionSteps: ['Call calculate_compliance', 'Check result.percentage'],
          inputData: { organizationId: org.id },
          outputData: result as Record<string, unknown>,
          status: 'open',
          addedToTestSuite: false,
          createdAt: new Date(),
        });
      }

      // Check if alerts are actionable
      if (result.alerts && Array.isArray(result.alerts)) {
        const nonActionable = (result.alerts as Array<Record<string, unknown>>).filter(
          (a) => !a.recommendedAction
        );
        if (nonActionable.length > 0) {
          feedback.push({
            id: `sentinel-${cycleNumber}-2`,
            cycleNumber,
            agentSource: 'SENTINEL',
            taskType: 'generate_alerts',
            category: 'ux_issue',
            severity: 'medium',
            description: `${nonActionable.length} alert(s) have no recommended action`,
            expectedBehavior: 'Every alert includes actionable next steps',
            actualBehavior: 'Some alerts show problems without solutions',
            reproductionSteps: ['Generate alerts', 'Check recommendedAction field'],
            inputData: {},
            outputData: { nonActionableCount: nonActionable.length },
            status: 'open',
            addedToTestSuite: false,
            createdAt: new Date(),
          });
        }
      }
    }
  } catch (error: unknown) {
    const e = error as Error;
    feedback.push({
      id: `sentinel-${cycleNumber}-error`,
      cycleNumber,
      agentSource: 'SENTINEL',
      taskType: 'self_test',
      category: 'bug',
      severity: 'critical',
      description: `SENTINEL self-test failed: ${e.message}`,
      expectedBehavior: 'Self-test completes successfully',
      actualBehavior: `Error: ${e.message}`,
      reproductionSteps: ['Import SentinelAgent', 'Run self-test'],
      inputData: {},
      outputData: { error: e.message },
      status: 'open',
      addedToTestSuite: false,
      createdAt: new Date(),
    });
  }

  return feedback;
}

async function runCartographSelfTest(prisma: PrismaClient, cycleNumber: number): Promise<FeedbackEvent[]> {
  const feedback: FeedbackEvent[] = [];

  try {
    const { CartographAgent } = await import('../src/agents/cartograph/geospatialIntelligence');
    const cartograph = new CartographAgent(prisma);

    // Test with known addresses
    const testAddresses = [
      { address: '100 F Street NE, Washington, DC 20549', expectedHubzone: true },
      { address: '1600 Pennsylvania Avenue, Washington, DC 20500', expectedHubzone: false },
    ];

    const org = await prisma.organization.findFirst();
    if (org) {
      for (const test of testAddresses) {
        const result = await cartograph.execute(
          'verify_address',
          { address: test.address },
          org.id
        );

        // Check if verification returns a result
        if (result.isHubzone === undefined) {
          feedback.push({
            id: `cartograph-${cycleNumber}-${test.address.substring(0, 10)}`,
            cycleNumber,
            agentSource: 'CARTOGRAPH',
            taskType: 'verify_address',
            category: 'bug',
            severity: 'high',
            description: 'Address verification returns no HUBZone status',
            expectedBehavior: 'Returns isHubzone boolean',
            actualBehavior: `Returns: ${JSON.stringify(result)}`,
            reproductionSteps: ['Call verify_address', 'Check result.isHubzone'],
            inputData: { address: test.address },
            outputData: result as Record<string, unknown>,
            status: 'open',
            addedToTestSuite: false,
            createdAt: new Date(),
          });
        }
      }
    }
  } catch (error: unknown) {
    const e = error as Error;
    feedback.push({
      id: `cartograph-${cycleNumber}-error`,
      cycleNumber,
      agentSource: 'CARTOGRAPH',
      taskType: 'self_test',
      category: 'bug',
      severity: 'critical',
      description: `CARTOGRAPH self-test failed: ${e.message}`,
      expectedBehavior: 'Self-test completes successfully',
      actualBehavior: `Error: ${e.message}`,
      reproductionSteps: ['Import CartographAgent', 'Run self-test'],
      inputData: {},
      outputData: { error: e.message },
      status: 'open',
      addedToTestSuite: false,
      createdAt: new Date(),
    });
  }

  return feedback;
}

async function runOracleSelfTest(prisma: PrismaClient, cycleNumber: number): Promise<FeedbackEvent[]> {
  const feedback: FeedbackEvent[] = [];

  try {
    const { OracleAgent } = await import('../src/agents/oracle/predictiveAnalytics');
    const oracle = new OracleAgent(prisma);

    const org = await prisma.organization.findFirst();
    if (org) {
      // Performance test
      const start = Date.now();
      await oracle.execute('forecast_compliance', { months: 6 }, org.id);
      const duration = Date.now() - start;

      if (duration > 5000) {
        feedback.push({
          id: `oracle-${cycleNumber}-perf`,
          cycleNumber,
          agentSource: 'ORACLE',
          taskType: 'forecast_compliance',
          category: 'performance',
          severity: duration > 10000 ? 'high' : 'medium',
          description: `Forecast taking ${duration}ms (target: < 5000ms)`,
          expectedBehavior: 'Forecasts complete within 5 seconds',
          actualBehavior: `Completed in ${duration}ms`,
          reproductionSteps: ['Call forecast_compliance with months=6', 'Measure duration'],
          inputData: { months: 6 },
          outputData: { durationMs: duration },
          status: 'open',
          preventionStrategy: 'Add caching for compliance history queries',
          addedToTestSuite: false,
          createdAt: new Date(),
        });
      }
    }
  } catch (error: unknown) {
    const e = error as Error;
    feedback.push({
      id: `oracle-${cycleNumber}-error`,
      cycleNumber,
      agentSource: 'ORACLE',
      taskType: 'self_test',
      category: 'bug',
      severity: 'high',
      description: `ORACLE self-test failed: ${e.message}`,
      expectedBehavior: 'Self-test completes successfully',
      actualBehavior: `Error: ${e.message}`,
      reproductionSteps: ['Import OracleAgent', 'Run self-test'],
      inputData: {},
      outputData: { error: e.message },
      status: 'open',
      addedToTestSuite: false,
      createdAt: new Date(),
    });
  }

  return feedback;
}

// ============================================================
// FEEDBACK AGGREGATOR
// ============================================================

function prioritizeFeedback(feedback: FeedbackEvent[]): FeedbackEvent[] {
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const categoryOrder = { bug: 0, performance: 1, ux_issue: 2, feature_gap: 3, data_quality: 4 };

  return [...feedback].sort((a, b) => {
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return categoryOrder[a.category] - categoryOrder[b.category];
  });
}

function generatePatches(feedback: FeedbackEvent[]): Patch[] {
  return feedback
    .filter((f) => f.status === 'open' && (f.severity === 'critical' || f.severity === 'high'))
    .map((f, index) => ({
      id: `patch-${f.cycleNumber}-${index}`,
      feedbackId: f.id,
      description: f.description,
      priority: f.severity === 'critical' ? 1 : 2,
      estimatedEffort: f.category === 'bug' ? 'medium' : 'small',
      component: f.agentSource,
      suggestedFix: f.preventionStrategy || `Fix ${f.category} in ${f.agentSource}`,
    }));
}

// ============================================================
// MAIN FEEDBACK CYCLE
// ============================================================

export async function runFeedbackCycle(
  prisma: PrismaClient,
  cycleNumber: number,
  phase: PhaseHealthCheck
): Promise<CycleResult> {
  console.log(`\n${'█'.repeat(60)}`);
  console.log(`FEEDBACK CYCLE ${cycleNumber}: ${phase.phase.toUpperCase()}`);
  console.log(`${'█'.repeat(60)}\n`);

  // Step 1: Run Health Checks
  console.log('📋 STEP 1: Running Health Checks...\n');
  const healthRunner = new HealthCheckRunner(prisma);
  const healthResult: PhaseResult = await healthRunner.runPhaseChecks(phase);

  if (!healthResult.canProceed) {
    return {
      cycleNumber,
      phase: phase.phase,
      status: 'blocked',
      healthScore: healthResult.passRate,
      feedbackCount: 0,
      bySeverity: {},
      blockers: healthResult.blockingFailed,
      patches: [],
      recommendation: 'Fix blocking health check failures before proceeding',
      timestamp: new Date(),
    };
  }

  // Step 2: Agent Self-Tests
  console.log('🤖 STEP 2: Running Agent Self-Tests...\n');
  const allFeedback: FeedbackEvent[] = [];

  const sentinelFeedback = await runSentinelSelfTest(prisma, cycleNumber);
  allFeedback.push(...sentinelFeedback);
  console.log(`   SENTINEL: ${sentinelFeedback.length} issue(s)`);

  const cartographFeedback = await runCartographSelfTest(prisma, cycleNumber);
  allFeedback.push(...cartographFeedback);
  console.log(`   CARTOGRAPH: ${cartographFeedback.length} issue(s)`);

  const oracleFeedback = await runOracleSelfTest(prisma, cycleNumber);
  allFeedback.push(...oracleFeedback);
  console.log(`   ORACLE: ${oracleFeedback.length} issue(s)`);

  // Step 3: Aggregate and Prioritize
  console.log('\n📊 STEP 3: Aggregating Feedback...\n');
  const prioritized = prioritizeFeedback(allFeedback);

  const bySeverity = {
    critical: prioritized.filter((f) => f.severity === 'critical').length,
    high: prioritized.filter((f) => f.severity === 'high').length,
    medium: prioritized.filter((f) => f.severity === 'medium').length,
    low: prioritized.filter((f) => f.severity === 'low').length,
  };

  // Step 4: Generate Patches
  console.log('🔧 STEP 4: Generating Patch List...\n');
  const patches = generatePatches(prioritized);

  // Step 5: Log Learning Events
  console.log('🧠 STEP 5: Logging Learning Events...\n');
  for (const feedback of prioritized) {
    try {
      await prisma.learningEvent.create({
        data: {
          eventType: 'feedback_cycle',
          inputData: feedback.inputData as Prisma.InputJsonValue,
          outputData: feedback.outputData as Prisma.InputJsonValue,
          outcome: feedback.status,
          metadata: {
            cycleNumber,
            phase: phase.phase,
            severity: feedback.severity,
            category: feedback.category,
            agentSource: feedback.agentSource,
          } as Prisma.InputJsonValue,
        },
      });
    } catch {
      // Learning events table may not exist yet
      console.log(`   Could not log learning event (table may not exist)`);
    }
  }

  // Step 6: Generate Report
  console.log('\n' + '─'.repeat(60));
  console.log('CYCLE SUMMARY');
  console.log('─'.repeat(60));
  console.log(`Health Score: ${healthResult.passRate.toFixed(1)}%`);
  console.log(`Feedback Items: ${prioritized.length}`);
  console.log(`  - Critical: ${bySeverity.critical}`);
  console.log(`  - High: ${bySeverity.high}`);
  console.log(`  - Medium: ${bySeverity.medium}`);
  console.log(`  - Low: ${bySeverity.low}`);
  console.log(`Patches Required: ${patches.length}`);

  const canProceed = bySeverity.critical === 0;
  const status = canProceed ? (patches.length > 0 ? 'needs_patches' : 'passed') : 'blocked';

  console.log(`\nStatus: ${status === 'passed' ? '✅' : status === 'needs_patches' ? '⚠️' : '⛔'} ${status.toUpperCase()}`);

  if (patches.length > 0) {
    console.log('\nRequired Patches:');
    patches.forEach((p, i) => console.log(`  ${i + 1}. [${p.component}] ${p.description}`));
  }

  const recommendation =
    status === 'passed'
      ? 'Proceed to next phase'
      : status === 'needs_patches'
        ? `Address ${patches.length} patches, then proceed`
        : `Fix ${bySeverity.critical} critical issue(s) before proceeding`;

  return {
    cycleNumber,
    phase: phase.phase,
    status,
    healthScore: healthResult.passRate,
    feedbackCount: prioritized.length,
    bySeverity,
    blockers: bySeverity.critical > 0 
      ? prioritized.filter((f) => f.severity === 'critical').map((f) => f.description)
      : [],
    patches,
    recommendation,
    timestamp: new Date(),
  };
}

// ============================================================
// CLI EXECUTION
// ============================================================

async function main() {
  const prisma = new PrismaClient();

  try {
    const phases = [
      { num: 1, phase: phase1HealthChecks },
      { num: 2, phase: phase2HealthChecks },
      { num: 3, phase: phase3HealthChecks },
      { num: 4, phase: phase4HealthChecks },
    ];

    // Check for specific cycle argument
    const args = process.argv.slice(2);
    const cycleArg = args.find((a) => a.startsWith('--cycle='));

    if (cycleArg) {
      const cycleNum = parseInt(cycleArg.split('=')[1], 10);
      const phaseConfig = phases.find((p) => p.num === cycleNum);
      if (phaseConfig) {
        await runFeedbackCycle(prisma, cycleNum, phaseConfig.phase);
      } else {
        console.log(`Unknown cycle: ${cycleNum}`);
        console.log(`Available: 1, 2, 3, 4`);
      }
    } else {
      // Run all cycles sequentially
      for (const { num, phase } of phases) {
        const result = await runFeedbackCycle(prisma, num, phase);

        if (result.status === 'blocked') {
          console.log(`\n🛑 BUILD BLOCKED AT CYCLE ${num}`);
          break;
        }

        console.log(`\n✅ CYCLE ${num} COMPLETE\n`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch(console.error);
}
