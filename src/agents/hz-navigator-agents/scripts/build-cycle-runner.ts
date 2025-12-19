#!/usr/bin/env npx ts-node
/**
 * Build Cycle Runner - Master orchestrator for feedback recycling
 * 
 * Implements the complete cycle:
 * BUILD → TEST → ANALYZE → REPORT → TRIAGE → PATCH → (repeat)
 * 
 * Usage:
 *   npx ts-node scripts/build-cycle-runner.ts --phase=database_foundation
 *   npx ts-node scripts/build-cycle-runner.ts --cycle=1
 *   npx ts-node scripts/build-cycle-runner.ts --all
 */

import { PrismaClient } from '@prisma/client';

// Import build system components
import { 
  BuildCycle, 
  BuildPhase, 
  CycleResult, 
  FeedbackItem,
  createPhaseConfig 
} from '../src/build/BuildCycle';
import { TriageSystem, TriageReport, triageReportToPatches } from '../src/build/TriageSystem';
import { FeedbackAnalyzer, FeedbackAnalysisReport } from '../src/build/FeedbackAnalyzer';
import { ReportGenerator, FeedbackReport } from '../src/build/ReportGenerator';
import { PatchManager } from '../src/build/PatchManager';

// ============================================================
// TYPES
// ============================================================

interface AgentSelfTestResult {
  agentId: string;
  testsRun: number;
  testsPassed: number;
  testsFailed: number;
  feedback: Omit<FeedbackItem, 'id' | 'cycleNumber' | 'phase' | 'destination' | 'createdAt'>[];
  duration: number;
}

interface CyclePhaseResult {
  phase: string;
  duration: number;
  success: boolean;
  data: unknown;
}

interface FullCycleResult {
  cycleNumber: number;
  buildPhase: BuildPhase;
  status: 'passed' | 'blocked' | 'needs_patches';
  
  // Phase results
  buildResult: CyclePhaseResult;
  testResult: CyclePhaseResult;
  analyzeResult: CyclePhaseResult;
  reportResult: CyclePhaseResult;
  triageResult: CyclePhaseResult;
  
  // Outputs
  cycleResult: CycleResult;
  triageReport: TriageReport;
  analysisReport: FeedbackAnalysisReport;
  feedbackReport: FeedbackReport;
  
  // Summary
  totalDuration: number;
  recommendation: string;
  canProceed: boolean;
}

// ============================================================
// AGENT SELF-TEST RUNNERS
// ============================================================

async function runSentinelSelfTest(prisma: PrismaClient): Promise<AgentSelfTestResult> {
  const start = Date.now();
  const feedback: AgentSelfTestResult['feedback'] = [];
  let testsRun = 0;
  let testsPassed = 0;

  try {
    const { SentinelAgent } = await import('../src/agents/sentinel/complianceMonitor');
    const sentinel = new SentinelAgent(prisma);
    const org = await prisma.organization.findFirst();

    if (org) {
      // Test 1: Compliance calculation
      testsRun++;
      const result = await sentinel.execute('calculate_compliance', {}, org.id);
      if (result.percentage !== undefined) {
        testsPassed++;
      } else {
        feedback.push({
          agentSource: 'SENTINEL',
          taskType: 'calculate_compliance',
          category: 'bug',
          severity: 'critical',
          description: 'Compliance calculation returns no percentage',
          expectedBehavior: 'Returns percentage between 0-100',
          actualBehavior: `Returns: ${JSON.stringify(result)}`,
          reproductionSteps: ['Call calculate_compliance'],
          inputData: { organizationId: org.id },
          outputData: result as Record<string, unknown>,
          status: 'open',
          addedToTestSuite: false,
        });
      }

      // Test 2: Alert generation
      testsRun++;
      if (result.alerts && Array.isArray(result.alerts)) {
        testsPassed++;
        const nonActionable = (result.alerts as Array<Record<string, unknown>>).filter(a => !a.recommendedAction);
        if (nonActionable.length > 0) {
          feedback.push({
            agentSource: 'SENTINEL',
            taskType: 'generate_alerts',
            category: 'ux_issue',
            severity: 'medium',
            description: `${nonActionable.length} alert(s) without recommended actions`,
            expectedBehavior: 'All alerts include actionable next steps',
            actualBehavior: 'Some alerts lack recommendations',
            reproductionSteps: ['Generate compliance alerts', 'Check recommendedAction field'],
            inputData: {},
            outputData: { nonActionableCount: nonActionable.length },
            status: 'open',
            addedToTestSuite: false,
          });
        }
      }
    }
  } catch (error: unknown) {
    const e = error as Error;
    feedback.push({
      agentSource: 'SENTINEL',
      taskType: 'self_test',
      category: 'bug',
      severity: 'critical',
      description: `SENTINEL self-test error: ${e.message}`,
      expectedBehavior: 'Self-test completes successfully',
      actualBehavior: `Error: ${e.message}`,
      reproductionSteps: ['Run SENTINEL self-test'],
      inputData: {},
      outputData: { error: e.message },
      status: 'open',
      addedToTestSuite: false,
    });
  }

  return {
    agentId: 'SENTINEL',
    testsRun,
    testsPassed,
    testsFailed: testsRun - testsPassed,
    feedback,
    duration: Date.now() - start,
  };
}

async function runCartographSelfTest(prisma: PrismaClient): Promise<AgentSelfTestResult> {
  const start = Date.now();
  const feedback: AgentSelfTestResult['feedback'] = [];
  let testsRun = 0;
  let testsPassed = 0;

  try {
    const { CartographAgent } = await import('../src/agents/cartograph/geospatialIntelligence');
    const cartograph = new CartographAgent(prisma);
    const org = await prisma.organization.findFirst();

    if (org) {
      // Test 1: Address verification
      testsRun++;
      const testAddress = '100 F Street NE, Washington, DC 20549';
      const result = await cartograph.execute('verify_address', { address: testAddress }, org.id);
      
      if (result.isHubzone !== undefined) {
        testsPassed++;
      } else {
        feedback.push({
          agentSource: 'CARTOGRAPH',
          taskType: 'verify_address',
          category: 'bug',
          severity: 'high',
          description: 'Address verification missing HUBZone status',
          expectedBehavior: 'Returns isHubzone boolean',
          actualBehavior: `Returns: ${JSON.stringify(result)}`,
          reproductionSteps: ['Call verify_address with valid address'],
          inputData: { address: testAddress },
          outputData: result as Record<string, unknown>,
          status: 'open',
          addedToTestSuite: false,
        });
      }
    }
  } catch (error: unknown) {
    const e = error as Error;
    feedback.push({
      agentSource: 'CARTOGRAPH',
      taskType: 'self_test',
      category: 'bug',
      severity: 'high',
      description: `CARTOGRAPH self-test error: ${e.message}`,
      expectedBehavior: 'Self-test completes successfully',
      actualBehavior: `Error: ${e.message}`,
      reproductionSteps: ['Run CARTOGRAPH self-test'],
      inputData: {},
      outputData: { error: e.message },
      status: 'open',
      addedToTestSuite: false,
    });
  }

  return {
    agentId: 'CARTOGRAPH',
    testsRun,
    testsPassed,
    testsFailed: testsRun - testsPassed,
    feedback,
    duration: Date.now() - start,
  };
}

async function runOracleSelfTest(prisma: PrismaClient): Promise<AgentSelfTestResult> {
  const start = Date.now();
  const feedback: AgentSelfTestResult['feedback'] = [];
  let testsRun = 0;
  let testsPassed = 0;

  try {
    const { OracleAgent } = await import('../src/agents/oracle/predictiveAnalytics');
    const oracle = new OracleAgent(prisma);
    const org = await prisma.organization.findFirst();

    if (org) {
      // Test 1: Forecast performance
      testsRun++;
      const forecastStart = Date.now();
      await oracle.execute('forecast_compliance', { months: 6 }, org.id);
      const forecastDuration = Date.now() - forecastStart;
      
      if (forecastDuration < 5000) {
        testsPassed++;
      } else {
        feedback.push({
          agentSource: 'ORACLE',
          taskType: 'forecast_compliance',
          category: 'performance',
          severity: forecastDuration > 10000 ? 'high' : 'medium',
          description: `Forecast took ${forecastDuration}ms (target: <5000ms)`,
          expectedBehavior: 'Forecasts complete within 5 seconds',
          actualBehavior: `Completed in ${forecastDuration}ms`,
          reproductionSteps: ['Call forecast_compliance with months=6'],
          inputData: { months: 6 },
          outputData: { durationMs: forecastDuration },
          status: 'open',
          preventionStrategy: 'Add caching for compliance history queries',
          addedToTestSuite: false,
        });
      }
    }
  } catch (error: unknown) {
    const e = error as Error;
    feedback.push({
      agentSource: 'ORACLE',
      taskType: 'self_test',
      category: 'bug',
      severity: 'high',
      description: `ORACLE self-test error: ${e.message}`,
      expectedBehavior: 'Self-test completes successfully',
      actualBehavior: `Error: ${e.message}`,
      reproductionSteps: ['Run ORACLE self-test'],
      inputData: {},
      outputData: { error: e.message },
      status: 'open',
      addedToTestSuite: false,
    });
  }

  return {
    agentId: 'ORACLE',
    testsRun,
    testsPassed,
    testsFailed: testsRun - testsPassed,
    feedback,
    duration: Date.now() - start,
  };
}

async function runWorkforceSelfTest(prisma: PrismaClient): Promise<AgentSelfTestResult> {
  const start = Date.now();
  const feedback: AgentSelfTestResult['feedback'] = [];
  let testsRun = 0;
  let testsPassed = 0;

  try {
    const { WorkforceAgent } = await import('../src/agents/workforce/employeeIntelligence');
    const workforce = new WorkforceAgent(prisma);
    const org = await prisma.organization.findFirst();

    if (org) {
      // Test 1: List employees
      testsRun++;
      const result = await workforce.execute('list_employees', {}, org.id);
      if (result.employees !== undefined) {
        testsPassed++;
      } else {
        feedback.push({
          agentSource: 'WORKFORCE',
          taskType: 'list_employees',
          category: 'bug',
          severity: 'high',
          description: 'List employees returns no data',
          expectedBehavior: 'Returns employee array',
          actualBehavior: `Returns: ${JSON.stringify(result)}`,
          reproductionSteps: ['Call list_employees'],
          inputData: { organizationId: org.id },
          outputData: result as Record<string, unknown>,
          status: 'open',
          addedToTestSuite: false,
        });
      }
    }
  } catch (error: unknown) {
    const e = error as Error;
    feedback.push({
      agentSource: 'WORKFORCE',
      taskType: 'self_test',
      category: 'bug',
      severity: 'high',
      description: `WORKFORCE self-test error: ${e.message}`,
      expectedBehavior: 'Self-test completes successfully',
      actualBehavior: `Error: ${e.message}`,
      reproductionSteps: ['Run WORKFORCE self-test'],
      inputData: {},
      outputData: { error: e.message },
      status: 'open',
      addedToTestSuite: false,
    });
  }

  return {
    agentId: 'WORKFORCE',
    testsRun,
    testsPassed,
    testsFailed: testsRun - testsPassed,
    feedback,
    duration: Date.now() - start,
  };
}

// ============================================================
// MAIN CYCLE RUNNER
// ============================================================

async function runBuildCycle(
  prisma: PrismaClient,
  cycleNumber: number,
  phase: BuildPhase
): Promise<FullCycleResult> {
  const cycleStart = Date.now();
  
  console.log('\n' + '█'.repeat(70));
  console.log(`  FEEDBACK RECYCLING CYCLE ${cycleNumber}: ${phase.toUpperCase()}`);
  console.log('█'.repeat(70) + '\n');

  // Initialize components
  const config = createPhaseConfig(cycleNumber, phase);
  const buildCycle = new BuildCycle(prisma, config);
  const triageSystem = new TriageSystem(prisma);
  const feedbackAnalyzer = new FeedbackAnalyzer(prisma);
  const reportGenerator = new ReportGenerator(prisma);
  const patchManager = new PatchManager(prisma);

  // Phase results
  const phaseResults: Record<string, CyclePhaseResult> = {};

  // ============================================================
  // PHASE 1: BUILD
  // ============================================================
  console.log('┌─────────────┐');
  console.log('│   BUILD     │ Phase 1: Initialization');
  console.log('└─────────────┘\n');
  
  const buildStart = Date.now();
  try {
    // Would run actual build steps here
    console.log('  ✓ Configuration loaded');
    console.log(`  ✓ Phase: ${phase}`);
    console.log(`  ✓ Target components: ${config.targetComponents.join(', ')}`);
    console.log(`  ✓ Features: ${config.features.join(', ')}`);
    
    phaseResults.build = {
      phase: 'BUILD',
      duration: Date.now() - buildStart,
      success: true,
      data: config,
    };
  } catch (error) {
    phaseResults.build = {
      phase: 'BUILD',
      duration: Date.now() - buildStart,
      success: false,
      data: { error: (error as Error).message },
    };
  }
  console.log(`\n  Duration: ${phaseResults.build.duration}ms\n`);

  // ============================================================
  // PHASE 2: TEST (Agents run self-tests)
  // ============================================================
  console.log('┌─────────────┐');
  console.log('│   TEST      │ Phase 2: Agent Self-Tests');
  console.log('└─────────────┘\n');
  
  const testStart = Date.now();
  const testResults: AgentSelfTestResult[] = [];
  let totalTests = 0;
  let totalPassed = 0;

  // Run self-tests for each agent
  console.log('  Running agent self-tests...\n');

  const sentinelTest = await runSentinelSelfTest(prisma);
  testResults.push(sentinelTest);
  totalTests += sentinelTest.testsRun;
  totalPassed += sentinelTest.testsPassed;
  console.log(`  SENTINEL: ${sentinelTest.testsPassed}/${sentinelTest.testsRun} passed (${sentinelTest.duration}ms)`);

  const cartographTest = await runCartographSelfTest(prisma);
  testResults.push(cartographTest);
  totalTests += cartographTest.testsRun;
  totalPassed += cartographTest.testsPassed;
  console.log(`  CARTOGRAPH: ${cartographTest.testsPassed}/${cartographTest.testsRun} passed (${cartographTest.duration}ms)`);

  const oracleTest = await runOracleSelfTest(prisma);
  testResults.push(oracleTest);
  totalTests += oracleTest.testsRun;
  totalPassed += oracleTest.testsPassed;
  console.log(`  ORACLE: ${oracleTest.testsPassed}/${oracleTest.testsRun} passed (${oracleTest.duration}ms)`);

  const workforceTest = await runWorkforceSelfTest(prisma);
  testResults.push(workforceTest);
  totalTests += workforceTest.testsRun;
  totalPassed += workforceTest.testsPassed;
  console.log(`  WORKFORCE: ${workforceTest.testsPassed}/${workforceTest.testsRun} passed (${workforceTest.duration}ms)`);

  // Collect all feedback
  for (const result of testResults) {
    for (const fb of result.feedback) {
      buildCycle.addFeedback(fb);
    }
  }

  phaseResults.test = {
    phase: 'TEST',
    duration: Date.now() - testStart,
    success: totalPassed === totalTests,
    data: { totalTests, totalPassed, testsFailed: totalTests - totalPassed },
  };
  console.log(`\n  Total: ${totalPassed}/${totalTests} tests passed`);
  console.log(`  Duration: ${phaseResults.test.duration}ms\n`);

  // ============================================================
  // PHASE 3: ANALYZE (ORACLE aggregates metrics)
  // ============================================================
  console.log('┌─────────────┐');
  console.log('│  ANALYZE    │ Phase 3: ORACLE Analysis');
  console.log('└─────────────┘\n');
  
  const analyzeStart = Date.now();
  const feedback = buildCycle.getFeedback();
  
  console.log('  Analyzing feedback patterns...');
  const analysisReport = await feedbackAnalyzer.analyze(feedback, cycleNumber, phase);
  
  console.log(`  ✓ Analyzed ${feedback.length} feedback items`);
  console.log(`  ✓ Overall health: ${analysisReport.overallHealthScore.toFixed(1)}%`);
  console.log(`  ✓ Root causes identified: ${analysisReport.rootCauses.length}`);
  console.log(`  ✓ Trends analyzed: ${analysisReport.trends.length}`);
  
  for (const insight of analysisReport.insights.slice(0, 3)) {
    console.log(`  → ${insight}`);
  }

  phaseResults.analyze = {
    phase: 'ANALYZE',
    duration: Date.now() - analyzeStart,
    success: true,
    data: analysisReport,
  };
  console.log(`\n  Duration: ${phaseResults.analyze.duration}ms\n`);

  // ============================================================
  // PHASE 4: TRIAGE (NEXUS prioritizes)
  // ============================================================
  console.log('┌─────────────┐');
  console.log('│   TRIAGE    │ Phase 4: NEXUS Prioritization');
  console.log('└─────────────┘\n');
  
  const triageStart = Date.now();
  
  console.log('  Triaging feedback...');
  const triageReport = triageSystem.triageAll(feedback, cycleNumber, phase);
  
  console.log(`  ✓ Build blockers: ${triageReport.buildBlockers}`);
  console.log(`  ✓ Parallel patches: ${triageReport.parallelPatches}`);
  console.log(`  ✓ Backlog items: ${triageReport.backlogItems}`);
  console.log(`  ✓ Auto-escalations: ${triageReport.autoEscalations}`);
  
  for (const rec of triageReport.recommendations.slice(0, 3)) {
    console.log(`  → ${rec}`);
  }

  phaseResults.triage = {
    phase: 'TRIAGE',
    duration: Date.now() - triageStart,
    success: triageReport.buildBlockers === 0,
    data: triageReport,
  };
  console.log(`\n  Duration: ${phaseResults.triage.duration}ms\n`);

  // ============================================================
  // PHASE 5: REPORT (ARCHIVIST generates reports)
  // ============================================================
  console.log('┌─────────────┐');
  console.log('│   REPORT    │ Phase 5: ARCHIVIST Reporting');
  console.log('└─────────────┘\n');
  
  const reportStart = Date.now();
  
  // Generate cycle result
  const cycleResult = buildCycle.generateResult(totalTests, totalPassed);
  
  // Generate comprehensive report
  console.log('  Generating feedback report...');
  const feedbackReport = await reportGenerator.generateReport(
    cycleResult,
    triageReport,
    analysisReport
  );
  
  console.log(`  ✓ Report generated: ${feedbackReport.reportId}`);
  console.log(`  ✓ Status: ${feedbackReport.executiveSummary.status}`);
  console.log(`  ✓ Action items: ${feedbackReport.actionItems.length}`);
  
  // Log learning events
  await buildCycle.logLearningEvents();
  await buildCycle.persistFeedback();
  console.log('  ✓ Learning events logged');

  phaseResults.report = {
    phase: 'REPORT',
    duration: Date.now() - reportStart,
    success: true,
    data: feedbackReport,
  };
  console.log(`\n  Duration: ${phaseResults.report.duration}ms\n`);

  // ============================================================
  // PHASE 6: PATCH (Generate patch queue)
  // ============================================================
  console.log('┌─────────────┐');
  console.log('│   PATCH     │ Phase 6: Patch Management');
  console.log('└─────────────┘\n');
  
  // Import patches from triage
  const patches = patchManager.importFromTriage(triageReport);
  const summary = patchManager.getQueueSummary();
  
  console.log(`  ✓ Patches created: ${patches.length}`);
  console.log(`  ✓ Estimated work: ${summary.estimatedTotalHours.toFixed(1)}h`);
  
  if (triageReport.buildBlockers > 0) {
    console.log('\n  🛑 BUILD BLOCKERS (must fix before proceeding):');
    for (const blocker of patchManager.getBuildBlockers()) {
      console.log(`     • ${blocker.component}: ${blocker.description}`);
    }
  }

  // ============================================================
  // FINAL SUMMARY
  // ============================================================
  const totalDuration = Date.now() - cycleStart;
  
  console.log('\n' + '═'.repeat(70));
  console.log('  CYCLE SUMMARY');
  console.log('═'.repeat(70) + '\n');
  
  console.log(reportGenerator.formatForConsole(feedbackReport));
  
  // Determine final status
  let status: 'passed' | 'blocked' | 'needs_patches';
  if (triageReport.buildBlockers > 0) {
    status = 'blocked';
  } else if (triageReport.parallelPatches > 0) {
    status = 'needs_patches';
  } else {
    status = 'passed';
  }

  const canProceed = status !== 'blocked';
  const recommendation = canProceed
    ? `✅ Can proceed to next phase${triageReport.parallelPatches > 0 ? ` with ${triageReport.parallelPatches} patches in parallel` : ''}`
    : `🛑 BLOCKED: Fix ${triageReport.buildBlockers} critical issue(s) before proceeding`;

  console.log(`\nFinal Status: ${status.toUpperCase()}`);
  console.log(`Recommendation: ${recommendation}`);
  console.log(`Total Duration: ${totalDuration}ms\n`);

  return {
    cycleNumber,
    buildPhase: phase,
    status,
    
    buildResult: phaseResults.build,
    testResult: phaseResults.test,
    analyzeResult: phaseResults.analyze,
    reportResult: phaseResults.report,
    triageResult: phaseResults.triage,
    
    cycleResult,
    triageReport,
    analysisReport,
    feedbackReport,
    
    totalDuration,
    recommendation,
    canProceed,
  };
}

// ============================================================
// CLI ENTRY POINT
// ============================================================

async function main() {
  const args = process.argv.slice(2);
  const prisma = new PrismaClient();

  // Default phases in order
  const allPhases: BuildPhase[] = [
    'database_foundation',
    'agent_integration',
    'api_routes',
    'ui_components',
    'employee_management',
    'capture_pipeline',
    'analytics_forecasting',
    'audit_documentation',
    'partnership_features',
    'polish_production',
  ];

  try {
    // Parse arguments
    let cycleNumber = 1;
    let phase: BuildPhase | undefined;
    let runAll = false;

    for (const arg of args) {
      if (arg.startsWith('--cycle=')) {
        cycleNumber = parseInt(arg.split('=')[1], 10);
      } else if (arg.startsWith('--phase=')) {
        phase = arg.split('=')[1] as BuildPhase;
      } else if (arg === '--all') {
        runAll = true;
      } else if (arg === '--help') {
        console.log(`
Build Cycle Runner - Feedback Recycling System

Usage:
  npx ts-node scripts/build-cycle-runner.ts [options]

Options:
  --phase=<phase>   Run specific phase (e.g., --phase=agent_integration)
  --cycle=<number>  Set cycle number (default: 1)
  --all             Run all phases sequentially
  --help            Show this help message

Phases:
  ${allPhases.map((p, i) => `${i + 1}. ${p}`).join('\n  ')}

Examples:
  npx ts-node scripts/build-cycle-runner.ts --phase=database_foundation
  npx ts-node scripts/build-cycle-runner.ts --cycle=3 --phase=api_routes
  npx ts-node scripts/build-cycle-runner.ts --all
`);
        return;
      }
    }

    // Run cycles
    if (runAll) {
      // Run all phases sequentially
      for (let i = 0; i < allPhases.length; i++) {
        const result = await runBuildCycle(prisma, i + 1, allPhases[i]);
        
        if (!result.canProceed) {
          console.log(`\n🛑 BUILD STOPPED AT PHASE: ${allPhases[i]}`);
          break;
        }
        
        console.log(`\n✅ PHASE ${i + 1} COMPLETE: ${allPhases[i]}\n`);
      }
    } else if (phase) {
      // Run specific phase
      await runBuildCycle(prisma, cycleNumber, phase);
    } else {
      // Default: run first phase
      await runBuildCycle(prisma, cycleNumber, 'agent_integration');
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

// Export for programmatic use
export { runBuildCycle, FullCycleResult };
