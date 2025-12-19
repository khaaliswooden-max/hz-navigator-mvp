/**
 * Feedback Cycle Runner
 * 
 * Phase-Gated Verification with Feedback Loop System
 * 
 * Orchestrates the complete feedback loop:
 * 1. Run health checks for the phase
 * 2. Execute agent self-tests (all 10 agents)
 * 3. Collect and classify feedback
 * 4. Aggregate and prioritize issues
 * 5. Generate patch list
 * 6. Log learning events for continuous improvement
 * 
 * Usage:
 *   npx ts-node scripts/feedback-cycle-runner.ts               # Run all cycles
 *   npx ts-node scripts/feedback-cycle-runner.ts --cycle=1     # Database cycle
 *   npx ts-node scripts/feedback-cycle-runner.ts --cycle=2     # Agent cycle
 *   npx ts-node scripts/feedback-cycle-runner.ts --cycle=3     # API cycle
 *   npx ts-node scripts/feedback-cycle-runner.ts --cycle=4     # UI cycle
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
// TYPE DEFINITIONS
// ============================================================

export interface FeedbackEvent {
  id: string;
  cycleNumber: number;
  agentSource: string;
  taskType: string;
  category: 'bug' | 'ux_issue' | 'performance' | 'feature_gap' | 'data_quality' | 'compliance';
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

export interface AgentTestResult {
  agent: string;
  tests: number;
  passed: number;
  failed: number;
  duration: number;
  feedback: FeedbackEvent[];
}

export interface CycleResult {
  cycleNumber: number;
  phase: string;
  status: 'passed' | 'blocked' | 'needs_patches';
  healthScore: number;
  agentTestScore: number;
  feedbackCount: number;
  bySeverity: Record<string, number>;
  byCategory: Record<string, number>;
  blockers: string[];
  patches: Patch[];
  agentResults: AgentTestResult[];
  recommendation: string;
  timestamp: Date;
  duration: number;
}

// ============================================================
// AGENT SELF-TEST IMPLEMENTATIONS
// ============================================================

/**
 * NEXUS Self-Test: Task routing and orchestration
 */
async function runNexusSelfTest(
  prisma: PrismaClient,
  cycleNumber: number
): Promise<FeedbackEvent[]> {
  const feedback: FeedbackEvent[] = [];
  console.log('   🔷 NEXUS: Testing task routing...');

  try {
    const { NexusOrchestrator } = await import(
      '../src/agents/hz-navigator-agents/src/agents/nexus/orchestrator'
    );
    const nexus = new NexusOrchestrator(prisma);

    const org = await prisma.organization.findFirst();
    if (!org) {
      feedback.push(createFeedback(cycleNumber, 'NEXUS', 'self_test', 'bug', 'high',
        'No organization exists to test with',
        'At least one organization should exist for testing',
        'No organizations found in database', {}));
      return feedback;
    }

    // Test 1: Task creation
    const startTime = Date.now();
    const result = await nexus.createTask({
      agentType: 'sentinel',
      taskType: 'calculate_compliance',
      input: {},
      organizationId: org.id,
    });
    const duration = Date.now() - startTime;

    if (!result.id) {
      feedback.push(createFeedback(cycleNumber, 'NEXUS', 'create_task', 'bug', 'critical',
        'Task creation returns no ID',
        'createTask should return { id, output }',
        `Returned: ${JSON.stringify(result)}`, { duration }));
    }

    // Test 2: Performance check
    if (duration > 5000) {
      feedback.push(createFeedback(cycleNumber, 'NEXUS', 'create_task', 'performance', 
        duration > 10000 ? 'high' : 'medium',
        `Task creation took ${duration}ms (target: <5000ms)`,
        'Task creation should complete within 5 seconds',
        `Completed in ${duration}ms`, { duration }));
    }

    // Test 3: Task status retrieval
    const status = await nexus.getTaskStatus(result.id);
    if (!status || status.status !== 'completed') {
      feedback.push(createFeedback(cycleNumber, 'NEXUS', 'get_task_status', 'bug', 'medium',
        'Task status retrieval failed or shows incorrect status',
        'getTaskStatus should return completed task status',
        `Status: ${status?.status || 'null'}`, { taskId: result.id }));
    }

  } catch (error: unknown) {
    const e = error as Error;
    feedback.push(createFeedback(cycleNumber, 'NEXUS', 'self_test', 'bug', 'critical',
      `NEXUS self-test failed: ${e.message}`,
      'Self-test should complete without errors',
      e.message, { stack: e.stack }));
  }

  return feedback;
}

/**
 * SENTINEL Self-Test: Compliance monitoring
 */
async function runSentinelSelfTest(
  prisma: PrismaClient,
  cycleNumber: number
): Promise<FeedbackEvent[]> {
  const feedback: FeedbackEvent[] = [];
  console.log('   🔷 SENTINEL: Testing compliance monitoring...');

  try {
    const { SentinelAgent } = await import(
      '../src/agents/hz-navigator-agents/src/agents/sentinel/complianceMonitor'
    );
    const sentinel = new SentinelAgent(prisma);

    const org = await prisma.organization.findFirst();
    if (!org) return feedback;

    // Test 1: Compliance calculation
    const result = await sentinel.execute('calculate_compliance', {}, org.id);

    const percentage = result.percentage as number | null | undefined;
    if (percentage == null) {
      feedback.push(createFeedback(cycleNumber, 'SENTINEL', 'calculate_compliance', 'bug', 'critical',
        'Compliance calculation returns no percentage',
        'Returns percentage between 0-100',
        `Returns: ${JSON.stringify(result)}`, {}));
    } else if (percentage < 0 || percentage > 100) {
      feedback.push(createFeedback(cycleNumber, 'SENTINEL', 'calculate_compliance', 'bug', 'high',
        `Invalid compliance percentage: ${percentage}`,
        'Percentage should be between 0 and 100',
        `Got: ${percentage}`, { result }));
    }

    // Test 2: Alert generation
    if (result.alerts && Array.isArray(result.alerts)) {
      const nonActionable = (result.alerts as Array<Record<string, unknown>>).filter(
        (a) => !a.recommendedAction && !a.suggestedAction
      );
      if (nonActionable.length > 0) {
        feedback.push(createFeedback(cycleNumber, 'SENTINEL', 'generate_alerts', 'ux_issue', 'medium',
          `${nonActionable.length} alert(s) have no recommended action`,
          'Every alert includes actionable next steps',
          'Some alerts show problems without solutions', { count: nonActionable.length }));
      }
    }

    // Test 3: Risk assessment
    const riskScore = result.riskScore as number | undefined;
    if (riskScore !== undefined && (riskScore < 0 || riskScore > 100)) {
      feedback.push(createFeedback(cycleNumber, 'SENTINEL', 'risk_assessment', 'data_quality', 'medium',
        `Invalid risk score: ${riskScore}`,
        'Risk score should be 0-100',
        `Got: ${riskScore}`, {}));
    }

  } catch (error: unknown) {
    const e = error as Error;
    feedback.push(createFeedback(cycleNumber, 'SENTINEL', 'self_test', 'bug', 'critical',
      `SENTINEL self-test failed: ${e.message}`,
      'Self-test completes successfully',
      e.message, {}));
  }

  return feedback;
}

/**
 * CARTOGRAPH Self-Test: Geospatial verification
 */
async function runCartographSelfTest(
  prisma: PrismaClient,
  cycleNumber: number
): Promise<FeedbackEvent[]> {
  const feedback: FeedbackEvent[] = [];
  console.log('   🔷 CARTOGRAPH: Testing address verification...');

  try {
    const { CartographAgent } = await import(
      '../src/agents/hz-navigator-agents/src/agents/cartograph/geospatialIntelligence'
    );
    const cartograph = new CartographAgent(prisma);

    const org = await prisma.organization.findFirst();
    if (!org) return feedback;

    // Test addresses with expected outcomes
    const testCases = [
      { address: '100 F Street NE, Washington, DC 20549', description: 'SEC HQ' },
      { address: '1600 Pennsylvania Avenue NW, Washington, DC 20500', description: 'White House' },
    ];

    for (const test of testCases) {
      const startTime = Date.now();
      const result = await cartograph.execute(
        'verify_address',
        { address: test.address },
        org.id
      );
      const duration = Date.now() - startTime;

      // Check if verification returns required fields
      if (result.isHubzone === undefined && result.verified === undefined) {
        feedback.push(createFeedback(cycleNumber, 'CARTOGRAPH', 'verify_address', 'bug', 'high',
          `Address verification missing HUBZone status for: ${test.description}`,
          'Returns isHubzone boolean',
          `Returns: ${JSON.stringify(result).substring(0, 200)}`, { address: test.address }));
      }

      // Performance check
      if (duration > 10000) {
        feedback.push(createFeedback(cycleNumber, 'CARTOGRAPH', 'verify_address', 'performance', 'medium',
          `Address verification took ${duration}ms for ${test.description}`,
          'Address verification should complete within 10 seconds',
          `Completed in ${duration}ms`, { address: test.address, duration }));
      }
    }

    // Test batch verification
    const employees = await prisma.employee.findMany({ where: { organizationId: org.id }, take: 5 });
    if (employees.length > 0) {
      const startTime = Date.now();
      const batchResult = await cartograph.execute('batch_verify', { employeeIds: employees.map(e => e.id) }, org.id);
      const duration = Date.now() - startTime;

      if (!batchResult.results && !batchResult.verified) {
        feedback.push(createFeedback(cycleNumber, 'CARTOGRAPH', 'batch_verify', 'feature_gap', 'medium',
          'Batch verification does not return expected results array',
          'Returns results array with verification status per employee',
          `Returns: ${JSON.stringify(batchResult).substring(0, 200)}`, {}));
      }
    }

  } catch (error: unknown) {
    const e = error as Error;
    feedback.push(createFeedback(cycleNumber, 'CARTOGRAPH', 'self_test', 'bug', 'critical',
      `CARTOGRAPH self-test failed: ${e.message}`,
      'Self-test completes successfully',
      e.message, {}));
  }

  return feedback;
}

/**
 * WORKFORCE Self-Test: Employee intelligence
 */
async function runWorkforceSelfTest(
  prisma: PrismaClient,
  cycleNumber: number
): Promise<FeedbackEvent[]> {
  const feedback: FeedbackEvent[] = [];
  console.log('   🔷 WORKFORCE: Testing employee intelligence...');

  try {
    const { WorkforceAgent } = await import(
      '../src/agents/hz-navigator-agents/src/agents/workforce/employeeIntelligence'
    );
    const workforce = new WorkforceAgent(prisma);

    const org = await prisma.organization.findFirst();
    if (!org) return feedback;

    // Test 1: Hiring impact analysis
    const hireResult = await workforce.execute('analyze_hire_impact', {
      isHubzoneResident: true,
      hubzoneType: 'QCT',
    }, org.id);

    if (hireResult.newPercentage === undefined && hireResult.impact === undefined) {
      feedback.push(createFeedback(cycleNumber, 'WORKFORCE', 'analyze_hire_impact', 'bug', 'medium',
        'Hire impact analysis returns no impact data',
        'Returns newPercentage and impact assessment',
        `Returns: ${JSON.stringify(hireResult).substring(0, 200)}`, {}));
    }

    // Test 2: Termination impact analysis
    const employees = await prisma.employee.findMany({
      where: { organizationId: org.id, isActive: true },
      take: 1,
    });

    if (employees.length > 0) {
      const termResult = await workforce.execute('analyze_termination_impact', {
        employeeId: employees[0].id,
      }, org.id);

      if (termResult.newPercentage === undefined && termResult.impact === undefined) {
        feedback.push(createFeedback(cycleNumber, 'WORKFORCE', 'analyze_termination_impact', 'bug', 'medium',
          'Termination impact analysis returns no impact data',
          'Returns newPercentage and impact assessment',
          `Returns: ${JSON.stringify(termResult).substring(0, 200)}`, {}));
      }
    }

    // Test 3: Workforce summary
    const summary = await workforce.execute('get_workforce_summary', {}, org.id);
    if (!summary.totalEmployees && summary.totalEmployees !== 0) {
      feedback.push(createFeedback(cycleNumber, 'WORKFORCE', 'get_workforce_summary', 'bug', 'medium',
        'Workforce summary missing totalEmployees',
        'Returns totalEmployees, hubzoneCount, etc.',
        `Returns: ${JSON.stringify(summary).substring(0, 200)}`, {}));
    }

  } catch (error: unknown) {
    const e = error as Error;
    feedback.push(createFeedback(cycleNumber, 'WORKFORCE', 'self_test', 'bug', 'critical',
      `WORKFORCE self-test failed: ${e.message}`,
      'Self-test completes successfully',
      e.message, {}));
  }

  return feedback;
}

/**
 * CAPTURE Self-Test: Opportunity scanning
 */
async function runCaptureSelfTest(
  prisma: PrismaClient,
  cycleNumber: number
): Promise<FeedbackEvent[]> {
  const feedback: FeedbackEvent[] = [];
  console.log('   🔷 CAPTURE: Testing opportunity scanning...');

  try {
    const { CaptureAgent } = await import(
      '../src/agents/hz-navigator-agents/src/agents/capture/opportunityScanner'
    );
    const capture = new CaptureAgent(prisma);

    const org = await prisma.organization.findFirst();
    if (!org) return feedback;

    // Test 1: Opportunity search
    const searchResult = await capture.execute('search_opportunities', {
      setAside: 'hubzone',
      limit: 5,
    }, org.id);

    if (!searchResult.opportunities && !Array.isArray(searchResult)) {
      feedback.push(createFeedback(cycleNumber, 'CAPTURE', 'search_opportunities', 'feature_gap', 'medium',
        'Opportunity search does not return opportunities array',
        'Returns array of matching opportunities',
        `Returns: ${JSON.stringify(searchResult).substring(0, 200)}`, {}));
    }

    // Test 2: Bid/No-Bid analysis (if opportunities exist)
    const opp = await prisma.contractOpportunity.findFirst({ where: { organizationId: org.id } });
    if (opp) {
      const bidResult = await capture.execute('analyze_bid_decision', {
        opportunityId: opp.id,
      }, org.id);

      if (bidResult.recommendation === undefined && bidResult.decision === undefined) {
        feedback.push(createFeedback(cycleNumber, 'CAPTURE', 'analyze_bid_decision', 'bug', 'medium',
          'Bid decision analysis returns no recommendation',
          'Returns recommendation (bid/no-bid) with rationale',
          `Returns: ${JSON.stringify(bidResult).substring(0, 200)}`, {}));
      }
    }

  } catch (error: unknown) {
    const e = error as Error;
    feedback.push(createFeedback(cycleNumber, 'CAPTURE', 'self_test', 'bug', 'high',
      `CAPTURE self-test failed: ${e.message}`,
      'Self-test completes successfully',
      e.message, {}));
  }

  return feedback;
}

/**
 * ADVOCATE Self-Test: Regulatory intelligence
 */
async function runAdvocateSelfTest(
  prisma: PrismaClient,
  cycleNumber: number
): Promise<FeedbackEvent[]> {
  const feedback: FeedbackEvent[] = [];
  console.log('   🔷 ADVOCATE: Testing regulatory intelligence...');

  try {
    const { AdvocateAgent } = await import(
      '../src/agents/hz-navigator-agents/src/agents/advocate/regulatoryIntelligence'
    );
    const advocate = new AdvocateAgent(prisma);

    const org = await prisma.organization.findFirst();
    if (!org) return feedback;

    // Test 1: Get regulatory updates
    const updates = await advocate.execute('get_recent_updates', { days: 90 }, org.id);

    if (!updates.updates && !Array.isArray(updates)) {
      feedback.push(createFeedback(cycleNumber, 'ADVOCATE', 'get_recent_updates', 'feature_gap', 'low',
        'Regulatory updates does not return updates array',
        'Returns array of recent regulatory changes',
        `Returns: ${JSON.stringify(updates).substring(0, 200)}`, {}));
    }

    // Test 2: Compliance guidance
    const guidance = await advocate.execute('get_compliance_guidance', {
      topic: '35_percent_rule',
    }, org.id);

    if (!guidance.guidance && !guidance.explanation) {
      feedback.push(createFeedback(cycleNumber, 'ADVOCATE', 'get_compliance_guidance', 'feature_gap', 'medium',
        'Compliance guidance returns no actionable guidance',
        'Returns clear guidance with regulatory citations',
        `Returns: ${JSON.stringify(guidance).substring(0, 200)}`, {}));
    }

  } catch (error: unknown) {
    const e = error as Error;
    feedback.push(createFeedback(cycleNumber, 'ADVOCATE', 'self_test', 'bug', 'high',
      `ADVOCATE self-test failed: ${e.message}`,
      'Self-test completes successfully',
      e.message, {}));
  }

  return feedback;
}

/**
 * GUARDIAN Self-Test: Audit defense
 */
async function runGuardianSelfTest(
  prisma: PrismaClient,
  cycleNumber: number
): Promise<FeedbackEvent[]> {
  const feedback: FeedbackEvent[] = [];
  console.log('   🔷 GUARDIAN: Testing audit defense...');

  try {
    const { GuardianAgent } = await import(
      '../src/agents/hz-navigator-agents/src/agents/guardian/auditDefense'
    );
    const guardian = new GuardianAgent(prisma);

    const org = await prisma.organization.findFirst();
    if (!org) return feedback;

    // Test 1: Audit readiness assessment
    const readiness = await guardian.execute('assess_audit_readiness', {}, org.id);

    if (readiness.scores?.overall === undefined) {
      feedback.push(createFeedback(cycleNumber, 'GUARDIAN', 'assess_audit_readiness', 'bug', 'high',
        'Audit readiness returns no overall score',
        'Returns overall score 0-100 with breakdown',
        `Returns: ${JSON.stringify(readiness).substring(0, 200)}`, {}));
    } else if (readiness.scores.overall < 0 || readiness.scores.overall > 100) {
      feedback.push(createFeedback(cycleNumber, 'GUARDIAN', 'assess_audit_readiness', 'data_quality', 'medium',
        `Invalid audit readiness score: ${readiness.scores.overall}`,
        'Score should be between 0 and 100',
        `Got: ${readiness.scores.overall}`, {}));
    }

    // Test 2: Audit trail verification
    const trail = await guardian.execute('get_audit_trail', {}, org.id);

    if (!trail.timeline && !trail.events) {
      feedback.push(createFeedback(cycleNumber, 'GUARDIAN', 'get_audit_trail', 'feature_gap', 'medium',
        'Audit trail returns no timeline or events',
        'Returns chronological timeline of compliance events',
        `Returns: ${JSON.stringify(trail).substring(0, 200)}`, {}));
    }

    // Test 3: Compliance event logging
    const logResult = await guardian.execute('log_compliance_event', {
      eventType: 'self_test',
      details: { test: true, cycleNumber },
    }, org.id);

    if (!logResult.success && !logResult.event) {
      feedback.push(createFeedback(cycleNumber, 'GUARDIAN', 'log_compliance_event', 'bug', 'medium',
        'Compliance event logging did not confirm success',
        'Returns success: true with event details',
        `Returns: ${JSON.stringify(logResult).substring(0, 200)}`, {}));
    }

  } catch (error: unknown) {
    const e = error as Error;
    feedback.push(createFeedback(cycleNumber, 'GUARDIAN', 'self_test', 'bug', 'critical',
      `GUARDIAN self-test failed: ${e.message}`,
      'Self-test completes successfully',
      e.message, {}));
  }

  return feedback;
}

/**
 * DIPLOMAT Self-Test: Partnership intelligence
 */
async function runDiplomatSelfTest(
  prisma: PrismaClient,
  cycleNumber: number
): Promise<FeedbackEvent[]> {
  const feedback: FeedbackEvent[] = [];
  console.log('   🔷 DIPLOMAT: Testing partnership intelligence...');

  try {
    const { DiplomatAgent } = await import(
      '../src/agents/hz-navigator-agents/src/agents/diplomat/partnershipIntelligence'
    );
    const diplomat = new DiplomatAgent(prisma);

    const org = await prisma.organization.findFirst();
    if (!org) return feedback;

    // Test 1: Partner search
    const partners = await diplomat.execute('search_partners', {
      certifications: ['hubzone'],
    }, org.id);

    if (!partners.partners && !Array.isArray(partners)) {
      feedback.push(createFeedback(cycleNumber, 'DIPLOMAT', 'search_partners', 'feature_gap', 'low',
        'Partner search does not return partners array',
        'Returns array of potential teaming partners',
        `Returns: ${JSON.stringify(partners).substring(0, 200)}`, {}));
    }

    // Test 2: Synergy analysis (if partners exist)
    const partner = await prisma.teamingPartner.findFirst({ where: { organizationId: org.id } });
    if (partner) {
      const synergy = await diplomat.execute('analyze_synergy', {
        partnerId: partner.id,
      }, org.id);

      if (synergy.score === undefined && synergy.synergyScore === undefined) {
        feedback.push(createFeedback(cycleNumber, 'DIPLOMAT', 'analyze_synergy', 'feature_gap', 'low',
          'Synergy analysis returns no score',
          'Returns synergy score with capability gaps/overlaps',
          `Returns: ${JSON.stringify(synergy).substring(0, 200)}`, {}));
      }
    }

  } catch (error: unknown) {
    const e = error as Error;
    feedback.push(createFeedback(cycleNumber, 'DIPLOMAT', 'self_test', 'bug', 'high',
      `DIPLOMAT self-test failed: ${e.message}`,
      'Self-test completes successfully',
      e.message, {}));
  }

  return feedback;
}

/**
 * ORACLE Self-Test: Predictive analytics
 */
async function runOracleSelfTest(
  prisma: PrismaClient,
  cycleNumber: number
): Promise<FeedbackEvent[]> {
  const feedback: FeedbackEvent[] = [];
  console.log('   🔷 ORACLE: Testing predictive analytics...');

  try {
    const { OracleAgent } = await import(
      '../src/agents/hz-navigator-agents/src/agents/oracle/predictiveAnalytics'
    );
    const oracle = new OracleAgent(prisma);

    const org = await prisma.organization.findFirst();
    if (!org) return feedback;

    // Test 1: Compliance forecast with performance check
    const startTime = Date.now();
    const forecast = await oracle.execute('forecast_compliance', { months: 6 }, org.id);
    const duration = Date.now() - startTime;

    if (!forecast.predictions && !forecast.forecast) {
      feedback.push(createFeedback(cycleNumber, 'ORACLE', 'forecast_compliance', 'bug', 'high',
        'Compliance forecast returns no predictions',
        'Returns predictions array with monthly forecasts',
        `Returns: ${JSON.stringify(forecast).substring(0, 200)}`, {}));
    }

    // Performance check
    if (duration > 5000) {
      feedback.push(createFeedback(cycleNumber, 'ORACLE', 'forecast_compliance', 'performance',
        duration > 10000 ? 'high' : 'medium',
        `Forecast taking ${duration}ms (target: < 5000ms)`,
        'Forecasts complete within 5 seconds',
        `Completed in ${duration}ms`, { duration }));
    }

    // Test 2: Risk prediction
    const risk = await oracle.execute('predict_risk', { scenario: 'employee_departure' }, org.id);

    if (risk.riskLevel === undefined && risk.probability === undefined) {
      feedback.push(createFeedback(cycleNumber, 'ORACLE', 'predict_risk', 'feature_gap', 'medium',
        'Risk prediction returns no risk level or probability',
        'Returns riskLevel and probability with mitigation strategies',
        `Returns: ${JSON.stringify(risk).substring(0, 200)}`, {}));
    }

    // Test 3: Trend analysis
    const trends = await oracle.execute('analyze_trends', { period: 'quarterly' }, org.id);

    if (!trends.trends && !trends.analysis) {
      feedback.push(createFeedback(cycleNumber, 'ORACLE', 'analyze_trends', 'feature_gap', 'low',
        'Trend analysis returns no trends data',
        'Returns historical trends with insights',
        `Returns: ${JSON.stringify(trends).substring(0, 200)}`, {}));
    }

  } catch (error: unknown) {
    const e = error as Error;
    feedback.push(createFeedback(cycleNumber, 'ORACLE', 'self_test', 'bug', 'critical',
      `ORACLE self-test failed: ${e.message}`,
      'Self-test completes successfully',
      e.message, {}));
  }

  return feedback;
}

/**
 * ARCHIVIST Self-Test: Document intelligence
 */
async function runArchivistSelfTest(
  prisma: PrismaClient,
  cycleNumber: number
): Promise<FeedbackEvent[]> {
  const feedback: FeedbackEvent[] = [];
  console.log('   🔷 ARCHIVIST: Testing document intelligence...');

  try {
    const { ArchivistAgent } = await import(
      '../src/agents/hz-navigator-agents/src/agents/archivist/documentIntelligence'
    );
    const archivist = new ArchivistAgent(prisma);

    const org = await prisma.organization.findFirst();
    if (!org) return feedback;

    // Test 1: Compliance report generation
    const report = await archivist.execute('generate_compliance_report', {}, org.id);

    if (!report.title) {
      feedback.push(createFeedback(cycleNumber, 'ARCHIVIST', 'generate_compliance_report', 'bug', 'high',
        'Compliance report missing title',
        'Returns complete report with title, summary, sections',
        `Returns: ${JSON.stringify(report).substring(0, 200)}`, {}));
    }

    if (!report.executiveSummary && !report.summary) {
      feedback.push(createFeedback(cycleNumber, 'ARCHIVIST', 'generate_compliance_report', 'ux_issue', 'medium',
        'Compliance report missing executive summary',
        'Report should include executive summary for quick review',
        `Missing summary section`, {}));
    }

    // Test 2: Employee roster generation
    const roster = await archivist.execute('generate_employee_roster', {}, org.id);

    if (!roster.employees && !roster.summary) {
      feedback.push(createFeedback(cycleNumber, 'ARCHIVIST', 'generate_employee_roster', 'bug', 'medium',
        'Employee roster generation incomplete',
        'Returns employee list with HUBZone status',
        `Returns: ${JSON.stringify(roster).substring(0, 200)}`, {}));
    }

    // Test 3: Document indexing
    const indexResult = await archivist.execute('index_document', {
      title: 'Self-Test Document',
      type: 'test',
      content: 'Test content for feedback cycle',
    }, org.id);

    if (!indexResult.documentId && !indexResult.success) {
      feedback.push(createFeedback(cycleNumber, 'ARCHIVIST', 'index_document', 'bug', 'medium',
        'Document indexing did not return document ID',
        'Returns documentId confirming successful indexing',
        `Returns: ${JSON.stringify(indexResult).substring(0, 200)}`, {}));
    }

    // Test 4: Document search
    const searchResult = await archivist.execute('search_documents', {
      query: 'compliance',
    }, org.id);

    if (searchResult.results === undefined && searchResult.documents === undefined) {
      feedback.push(createFeedback(cycleNumber, 'ARCHIVIST', 'search_documents', 'feature_gap', 'low',
        'Document search returns no results array',
        'Returns results array with matching documents',
        `Returns: ${JSON.stringify(searchResult).substring(0, 200)}`, {}));
    }

  } catch (error: unknown) {
    const e = error as Error;
    feedback.push(createFeedback(cycleNumber, 'ARCHIVIST', 'self_test', 'bug', 'critical',
      `ARCHIVIST self-test failed: ${e.message}`,
      'Self-test completes successfully',
      e.message, {}));
  }

  return feedback;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function createFeedback(
  cycleNumber: number,
  agent: string,
  taskType: string,
  category: FeedbackEvent['category'],
  severity: FeedbackEvent['severity'],
  description: string,
  expectedBehavior: string,
  actualBehavior: string,
  outputData: Record<string, unknown>
): FeedbackEvent {
  return {
    id: `${agent.toLowerCase()}-${cycleNumber}-${Date.now()}`,
    cycleNumber,
    agentSource: agent,
    taskType,
    category,
    severity,
    description,
    expectedBehavior,
    actualBehavior,
    reproductionSteps: [`Run ${agent} ${taskType}`, 'Observe result'],
    inputData: {},
    outputData,
    status: 'open',
    addedToTestSuite: false,
    createdAt: new Date(),
  };
}

function prioritizeFeedback(feedback: FeedbackEvent[]): FeedbackEvent[] {
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const categoryOrder = {
    bug: 0,
    compliance: 1,
    performance: 2,
    ux_issue: 3,
    feature_gap: 4,
    data_quality: 5,
  };

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
      estimatedEffort: f.category === 'bug' ? 'medium' as const : 'small' as const,
      component: f.agentSource,
      suggestedFix: f.preventionStrategy || `Fix ${f.category} in ${f.agentSource}: ${f.taskType}`,
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
  const cycleStart = Date.now();

  console.log(`\n${'█'.repeat(70)}`);
  console.log(`  FEEDBACK CYCLE ${cycleNumber}: ${phase.phase.toUpperCase()}`);
  console.log(`  ${phase.description}`);
  console.log(`${'█'.repeat(70)}\n`);

  // ========================================
  // STEP 1: Run Health Checks
  // ========================================
  console.log('📋 STEP 1: Running Health Checks...\n');
  const healthRunner = new HealthCheckRunner(prisma);
  const healthResult: PhaseResult = await healthRunner.runPhaseChecks(phase);

  if (!healthResult.canProceed) {
    return {
      cycleNumber,
      phase: phase.phase,
      status: 'blocked',
      healthScore: healthResult.passRate,
      agentTestScore: 0,
      feedbackCount: 0,
      bySeverity: {},
      byCategory: {},
      blockers: healthResult.blockingFailed,
      patches: [],
      agentResults: [],
      recommendation: 'Fix blocking health check failures before proceeding',
      timestamp: new Date(),
      duration: Date.now() - cycleStart,
    };
  }

  // ========================================
  // STEP 2: Agent Self-Tests (All 10 Agents)
  // ========================================
  console.log('\n🤖 STEP 2: Running Agent Self-Tests (All 10 Agents)...\n');
  const agentResults: AgentTestResult[] = [];
  const allFeedback: FeedbackEvent[] = [];

  // Run all agent tests
  const agentTests = [
    { name: 'NEXUS', fn: runNexusSelfTest },
    { name: 'SENTINEL', fn: runSentinelSelfTest },
    { name: 'CARTOGRAPH', fn: runCartographSelfTest },
    { name: 'WORKFORCE', fn: runWorkforceSelfTest },
    { name: 'CAPTURE', fn: runCaptureSelfTest },
    { name: 'ADVOCATE', fn: runAdvocateSelfTest },
    { name: 'GUARDIAN', fn: runGuardianSelfTest },
    { name: 'DIPLOMAT', fn: runDiplomatSelfTest },
    { name: 'ORACLE', fn: runOracleSelfTest },
    { name: 'ARCHIVIST', fn: runArchivistSelfTest },
  ];

  for (const { name, fn } of agentTests) {
    const start = Date.now();
    const feedback = await fn(prisma, cycleNumber);
    const duration = Date.now() - start;

    allFeedback.push(...feedback);

    const passed = feedback.filter((f) => f.severity !== 'critical' && f.severity !== 'high').length === feedback.length;
    
    agentResults.push({
      agent: name,
      tests: feedback.length > 0 ? feedback.length : 1, // At least 1 test if no issues
      passed: passed ? (feedback.length > 0 ? feedback.length : 1) : 0,
      failed: passed ? 0 : feedback.length,
      duration,
      feedback,
    });

    const icon = feedback.length === 0 ? '✅' : feedback.some(f => f.severity === 'critical') ? '❌' : '⚠️';
    console.log(`   ${icon} ${name}: ${feedback.length} issue(s) (${duration}ms)`);
  }

  // Calculate agent test score
  const totalAgentTests = agentResults.reduce((sum, r) => sum + r.tests, 0);
  const passedAgentTests = agentResults.reduce((sum, r) => sum + r.passed, 0);
  const agentTestScore = totalAgentTests > 0 ? (passedAgentTests / totalAgentTests) * 100 : 100;

  // ========================================
  // STEP 3: Aggregate and Prioritize
  // ========================================
  console.log('\n📊 STEP 3: Aggregating Feedback...\n');
  const prioritized = prioritizeFeedback(allFeedback);

  const bySeverity = {
    critical: prioritized.filter((f) => f.severity === 'critical').length,
    high: prioritized.filter((f) => f.severity === 'high').length,
    medium: prioritized.filter((f) => f.severity === 'medium').length,
    low: prioritized.filter((f) => f.severity === 'low').length,
  };

  const byCategory = {
    bug: prioritized.filter((f) => f.category === 'bug').length,
    performance: prioritized.filter((f) => f.category === 'performance').length,
    ux_issue: prioritized.filter((f) => f.category === 'ux_issue').length,
    feature_gap: prioritized.filter((f) => f.category === 'feature_gap').length,
    data_quality: prioritized.filter((f) => f.category === 'data_quality').length,
    compliance: prioritized.filter((f) => f.category === 'compliance').length,
  };

  console.log(`   By Severity: Critical(${bySeverity.critical}), High(${bySeverity.high}), Medium(${bySeverity.medium}), Low(${bySeverity.low})`);
  console.log(`   By Category: Bug(${byCategory.bug}), Perf(${byCategory.performance}), UX(${byCategory.ux_issue}), Gap(${byCategory.feature_gap})`);

  // ========================================
  // STEP 4: Generate Patches
  // ========================================
  console.log('\n🔧 STEP 4: Generating Patch List...\n');
  const patches = generatePatches(prioritized);
  console.log(`   ${patches.length} patch(es) required`);

  // ========================================
  // STEP 5: Log Learning Events
  // ========================================
  console.log('\n🧠 STEP 5: Logging Learning Events...\n');
  let loggedEvents = 0;

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
            taskType: feedback.taskType,
          } as Prisma.InputJsonValue,
        },
      });
      loggedEvents++;
    } catch {
      // Continue if logging fails
    }
  }
  console.log(`   ${loggedEvents}/${prioritized.length} events logged`);

  // ========================================
  // STEP 6: Generate Report
  // ========================================
  const cycleDuration = Date.now() - cycleStart;

  console.log(`\n${'─'.repeat(70)}`);
  console.log(`  CYCLE ${cycleNumber} SUMMARY`);
  console.log(`${'─'.repeat(70)}`);
  console.log(`  Health Score:      ${healthResult.passRate.toFixed(1)}%`);
  console.log(`  Agent Test Score:  ${agentTestScore.toFixed(1)}%`);
  console.log(`  Feedback Items:    ${prioritized.length}`);
  console.log(`    - Critical:      ${bySeverity.critical}`);
  console.log(`    - High:          ${bySeverity.high}`);
  console.log(`    - Medium:        ${bySeverity.medium}`);
  console.log(`    - Low:           ${bySeverity.low}`);
  console.log(`  Patches Required:  ${patches.length}`);
  console.log(`  Duration:          ${cycleDuration}ms`);

  const canProceed = bySeverity.critical === 0;
  const status: CycleResult['status'] = canProceed
    ? patches.length > 0
      ? 'needs_patches'
      : 'passed'
    : 'blocked';

  const statusIcon = status === 'passed' ? '✅' : status === 'needs_patches' ? '⚠️' : '⛔';
  console.log(`\n  Status: ${statusIcon} ${status.toUpperCase()}`);

  if (patches.length > 0) {
    console.log('\n  Required Patches:');
    patches.forEach((p, i) => {
      console.log(`    ${i + 1}. [${p.component}] ${p.description}`);
    });
  }

  const recommendation =
    status === 'passed'
      ? 'Proceed to next phase'
      : status === 'needs_patches'
        ? `Address ${patches.length} patches, then proceed`
        : `Fix ${bySeverity.critical} critical issue(s) before proceeding`;

  console.log(`\n  Recommendation: ${recommendation}`);
  console.log(`${'─'.repeat(70)}\n`);

  return {
    cycleNumber,
    phase: phase.phase,
    status,
    healthScore: healthResult.passRate,
    agentTestScore,
    feedbackCount: prioritized.length,
    bySeverity,
    byCategory,
    blockers:
      bySeverity.critical > 0
        ? prioritized.filter((f) => f.severity === 'critical').map((f) => f.description)
        : [],
    patches,
    agentResults,
    recommendation,
    timestamp: new Date(),
    duration: cycleDuration,
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

    console.log(`\n${'█'.repeat(70)}`);
    console.log(`  HZ NAVIGATOR - FEEDBACK LOOP VERIFICATION SYSTEM`);
    console.log(`${'█'.repeat(70)}`);

    if (cycleArg) {
      const cycleNum = parseInt(cycleArg.split('=')[1], 10);
      const phaseConfig = phases.find((p) => p.num === cycleNum);

      if (phaseConfig) {
        const result = await runFeedbackCycle(prisma, cycleNum, phaseConfig.phase);
        process.exit(result.status === 'blocked' ? 1 : 0);
      } else {
        console.log(`\nUnknown cycle: ${cycleNum}`);
        console.log(`Available cycles: 1 (database), 2 (agents), 3 (api), 4 (ui)`);
        process.exit(1);
      }
    } else {
      // Run all cycles sequentially (stops on blocker)
      const allResults: CycleResult[] = [];

      for (const { num, phase } of phases) {
        const result = await runFeedbackCycle(prisma, num, phase);
        allResults.push(result);

        if (result.status === 'blocked') {
          console.log(`\n🛑 BUILD BLOCKED AT CYCLE ${num}`);
          console.log(`\nBlockers:`);
          result.blockers.forEach((b) => console.log(`  ⛔ ${b}`));
          break;
        }

        if (result.status === 'needs_patches') {
          console.log(`\n⚠️  CYCLE ${num} NEEDS PATCHES - Continuing with warnings\n`);
        } else {
          console.log(`\n✅ CYCLE ${num} COMPLETE\n`);
        }
      }

      // Final summary
      console.log(`\n${'█'.repeat(70)}`);
      console.log(`  FINAL VERIFICATION SUMMARY`);
      console.log(`${'█'.repeat(70)}`);

      for (const result of allResults) {
        const icon =
          result.status === 'passed'
            ? '✅'
            : result.status === 'needs_patches'
              ? '⚠️'
              : '❌';
        console.log(
          `  ${icon} Cycle ${result.cycleNumber}: ${result.phase} - Health: ${result.healthScore.toFixed(1)}%, Agents: ${result.agentTestScore.toFixed(1)}%`
        );
      }

      const totalPatches = allResults.reduce((sum, r) => sum + r.patches.length, 0);
      const totalFeedback = allResults.reduce((sum, r) => sum + r.feedbackCount, 0);

      console.log(`\n  Total Feedback: ${totalFeedback}`);
      console.log(`  Total Patches: ${totalPatches}`);

      if (allResults.every((r) => r.status !== 'blocked')) {
        console.log(`\n🎉 ALL CYCLES COMPLETE - BUILD VERIFIED!\n`);
        process.exit(0);
      } else {
        console.log(`\n❌ BUILD VERIFICATION FAILED\n`);
        process.exit(1);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Feedback cycle runner failed:', error);
    process.exit(1);
  });
}
