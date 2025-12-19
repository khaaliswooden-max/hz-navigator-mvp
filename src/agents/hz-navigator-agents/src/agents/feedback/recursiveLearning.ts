/**
 * FEEDBACK - Recursive Learning Agent
 * 
 * The 11th agent that manages the feedback loop:
 * - Captures execution results from all agents
 * - Classifies feedback by category and severity
 * - Tracks resolution through build iterations
 * - Generates improvement recommendations
 * - Logs everything for audit trail
 */

import { PrismaClient, Prisma } from '@prisma/client';

export type FeedbackCategory = 
  | 'performance' 
  | 'accuracy' 
  | 'ux' 
  | 'edge_case' 
  | 'bug' 
  | 'compliance' 
  | 'security';

export type FeedbackSeverity = 'critical' | 'high' | 'medium' | 'low';

export type ResolutionStatus = 'open' | 'in_progress' | 'resolved' | 'wont_fix' | 'deferred';

export interface FeedbackEntry {
  id: string;
  timestamp: Date;
  source: {
    type: 'stress_test' | 'user_interaction' | 'agent_execution' | 'external_api';
    agentId: string;
    taskType: string;
    scenarioId?: string;
    organizationId?: string;
  };
  execution: {
    input: Record<string, unknown>;
    output: Record<string, unknown>;
    executionTimeMs: number;
    success: boolean;
    errorMessage?: string;
  };
  feedback: {
    category: FeedbackCategory;
    severity: FeedbackSeverity;
    description: string;
    expectedBehavior?: string;
    actualBehavior: string;
    userImpact?: string;
  };
  resolution?: {
    status: ResolutionStatus;
    buildVersion?: string;
    commitHash?: string;
    resolvedAt?: Date;
    changeDescription?: string;
    verifiedBy?: string;
  };
  impact: {
    usersAffected: number;
    complianceRisk: boolean;
    dataIntegrityRisk: boolean;
    securityRisk: boolean;
  };
}

export interface StressTestScenario {
  id: string;
  name: string;
  agentId: string;
  description: string;
  setup: Record<string, unknown>;
  tests: Array<{
    action: string;
    params?: Record<string, unknown>;
    expected: Record<string, unknown>;
  }>;
  successCriteria: Record<string, unknown>;
}

/**
 * FEEDBACK Agent - Recursive learning and build improvement
 */
export class FeedbackAgent {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Main execution router
   */
  async execute(
    taskType: string,
    input: Record<string, unknown>,
    organizationId?: string
  ): Promise<Record<string, unknown>> {
    console.log(`[FEEDBACK] Executing: ${taskType}`);

    switch (taskType) {
      case 'capture_feedback':
        return await this.captureFeedback(input as Partial<FeedbackEntry>);

      case 'run_stress_test':
        return await this.runStressTest(input.scenarioId as string);

      case 'run_all_stress_tests':
        return await this.runAllStressTests(input.agentId as string | undefined);

      case 'get_feedback_log':
        return await this.getFeedbackLog(input);

      case 'get_open_issues':
        return await this.getOpenIssues();

      case 'update_resolution':
        return await this.updateResolution(
          input.feedbackId as string,
          input.resolution as Partial<FeedbackEntry['resolution']>
        );

      case 'generate_improvement_report':
        return await this.generateImprovementReport();

      case 'get_metrics':
        return await this.getMetrics();

      case 'pattern_analysis':
        return await this.patternAnalysis();

      case 'log_agent_execution':
        return await this.logAgentExecution(input);

      default:
        throw new Error(`[FEEDBACK] Unknown task type: ${taskType}`);
    }
  }

  /**
   * Capture feedback from any source
   */
  async captureFeedback(entry: Partial<FeedbackEntry>): Promise<Record<string, unknown>> {
    const feedback = await this.prisma.feedbackLog.create({
      data: {
        sourceType: entry.source?.type || 'agent_execution',
        agentId: entry.source?.agentId || 'unknown',
        taskType: entry.source?.taskType || 'unknown',
        scenarioId: entry.source?.scenarioId,
        organizationId: entry.source?.organizationId,
        
        executionInput: entry.execution?.input as Prisma.InputJsonValue,
        executionOutput: entry.execution?.output as Prisma.InputJsonValue,
        executionTimeMs: entry.execution?.executionTimeMs,
        executionSuccess: entry.execution?.success ?? true,
        errorMessage: entry.execution?.errorMessage,
        
        category: entry.feedback?.category || 'bug',
        severity: entry.feedback?.severity || 'medium',
        description: entry.feedback?.description || '',
        expectedBehavior: entry.feedback?.expectedBehavior,
        actualBehavior: entry.feedback?.actualBehavior || '',
        userImpact: entry.feedback?.userImpact,
        
        resolutionStatus: 'open',
        
        usersAffected: entry.impact?.usersAffected || 0,
        complianceRisk: entry.impact?.complianceRisk || false,
        dataIntegrityRisk: entry.impact?.dataIntegrityRisk || false,
        securityRisk: entry.impact?.securityRisk || false,
      },
    });

    // Auto-escalate critical issues
    if (entry.feedback?.severity === 'critical') {
      await this.escalateCritical(feedback.id);
    }

    return {
      success: true,
      feedbackId: feedback.id,
      severity: entry.feedback?.severity,
      autoEscalated: entry.feedback?.severity === 'critical',
    };
  }

  /**
   * Run a specific stress test scenario
   */
  async runStressTest(scenarioId: string): Promise<Record<string, unknown>> {
    const scenario = this.getStressTestScenario(scenarioId);
    
    if (!scenario) {
      throw new Error(`Stress test scenario not found: ${scenarioId}`);
    }

    console.log(`[FEEDBACK] Running stress test: ${scenario.name}`);

    const results: Array<{
      testIndex: number;
      action: string;
      passed: boolean;
      expected: Record<string, unknown>;
      actual: Record<string, unknown>;
      discrepancies: string[];
    }> = [];

    // Run each test in the scenario
    for (let i = 0; i < scenario.tests.length; i++) {
      const test = scenario.tests[i];
      const startTime = Date.now();

      try {
        // Execute the test action
        const actual = await this.executeTestAction(
          scenario.agentId,
          test.action,
          { ...scenario.setup, ...test.params }
        );

        const executionTime = Date.now() - startTime;

        // Compare expected vs actual
        const discrepancies = this.compareResults(test.expected, actual);

        results.push({
          testIndex: i,
          action: test.action,
          passed: discrepancies.length === 0,
          expected: test.expected,
          actual,
          discrepancies,
        });

        // Log feedback for failures
        if (discrepancies.length > 0) {
          await this.captureFeedback({
            source: {
              type: 'stress_test',
              agentId: scenario.agentId,
              taskType: test.action,
              scenarioId: scenario.id,
            },
            execution: {
              input: { ...scenario.setup, ...test.params },
              output: actual,
              executionTimeMs: executionTime,
              success: false,
            },
            feedback: {
              category: 'edge_case',
              severity: this.determineSeverity(discrepancies),
              description: `Stress test failure: ${scenario.name}`,
              expectedBehavior: JSON.stringify(test.expected),
              actualBehavior: JSON.stringify(actual),
            },
            impact: {
              usersAffected: 0,
              complianceRisk: scenario.agentId === 'sentinel',
              dataIntegrityRisk: false,
              securityRisk: false,
            },
          });
        }
      } catch (error) {
        results.push({
          testIndex: i,
          action: test.action,
          passed: false,
          expected: test.expected,
          actual: { error: (error as Error).message },
          discrepancies: ['Execution error'],
        });
      }
    }

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    return {
      scenarioId,
      scenarioName: scenario.name,
      agent: scenario.agentId,
      totalTests: results.length,
      passed,
      failed,
      passRate: ((passed / results.length) * 100).toFixed(1),
      results,
      status: failed === 0 ? 'PASSED' : 'FAILED',
    };
  }

  /**
   * Run all stress tests (optionally for a specific agent)
   */
  async runAllStressTests(agentId?: string): Promise<Record<string, unknown>> {
    const scenarios = this.getAllScenarios().filter(
      s => !agentId || s.agentId === agentId
    );

    const results: Array<Record<string, unknown>> = [];
    
    for (const scenario of scenarios) {
      const result = await this.runStressTest(scenario.id);
      results.push(result);
    }

    const totalTests = results.reduce((sum, r) => sum + (r.totalTests as number), 0);
    const totalPassed = results.reduce((sum, r) => sum + (r.passed as number), 0);

    return {
      agentFilter: agentId || 'all',
      scenariosRun: results.length,
      totalTests,
      totalPassed,
      totalFailed: totalTests - totalPassed,
      overallPassRate: ((totalPassed / totalTests) * 100).toFixed(1),
      results,
      summary: this.generateTestSummary(results),
    };
  }

  /**
   * Get feedback log with filters
   */
  async getFeedbackLog(filters: Record<string, unknown>): Promise<Record<string, unknown>> {
    const where: Prisma.FeedbackLogWhereInput = {};

    if (filters.agentId) {
      where.agentId = filters.agentId as string;
    }
    if (filters.category) {
      where.category = filters.category as string;
    }
    if (filters.severity) {
      where.severity = filters.severity as string;
    }
    if (filters.status) {
      where.resolutionStatus = filters.status as string;
    }
    if (filters.startDate) {
      where.createdAt = { gte: new Date(filters.startDate as string) };
    }

    const logs = await this.prisma.feedbackLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters.limit as number || 100,
    });

    return {
      filters,
      totalCount: logs.length,
      logs: logs.map(log => ({
        id: log.id,
        timestamp: log.createdAt,
        agent: log.agentId,
        task: log.taskType,
        category: log.category,
        severity: log.severity,
        description: log.description,
        status: log.resolutionStatus,
        success: log.executionSuccess,
      })),
    };
  }

  /**
   * Get all open issues prioritized
   */
  async getOpenIssues(): Promise<Record<string, unknown>> {
    const issues = await this.prisma.feedbackLog.findMany({
      where: {
        resolutionStatus: { in: ['open', 'in_progress'] },
      },
      orderBy: [
        { severity: 'asc' }, // critical first
        { createdAt: 'asc' }, // oldest first
      ],
    });

    const prioritized = {
      critical: issues.filter(i => i.severity === 'critical'),
      high: issues.filter(i => i.severity === 'high'),
      medium: issues.filter(i => i.severity === 'medium'),
      low: issues.filter(i => i.severity === 'low'),
    };

    return {
      totalOpen: issues.length,
      bySeverity: {
        critical: prioritized.critical.length,
        high: prioritized.high.length,
        medium: prioritized.medium.length,
        low: prioritized.low.length,
      },
      prioritizedList: issues.map(i => ({
        id: i.id,
        severity: i.severity,
        agent: i.agentId,
        description: i.description,
        age: this.calculateAge(i.createdAt),
        status: i.resolutionStatus,
      })),
      actionRequired: prioritized.critical.length > 0
        ? 'CRITICAL ISSUES REQUIRE IMMEDIATE ATTENTION'
        : null,
    };
  }

  /**
   * Update resolution status
   */
  async updateResolution(
    feedbackId: string,
    resolution?: Partial<FeedbackEntry['resolution']>
  ): Promise<Record<string, unknown>> {
    const updated = await this.prisma.feedbackLog.update({
      where: { id: feedbackId },
      data: {
        resolutionStatus: resolution?.status,
        buildVersion: resolution?.buildVersion,
        commitHash: resolution?.commitHash,
        changeDescription: resolution?.changeDescription,
        resolvedAt: resolution?.status === 'resolved' ? new Date() : undefined,
        verifiedBy: resolution?.verifiedBy,
      },
    });

    // Log the resolution as a learning event
    if (resolution?.status === 'resolved') {
      await this.prisma.learningEvent.create({
        data: {
          eventType: 'feedback_resolved',
          inputData: { feedbackId },
          outputData: (resolution ?? {}) as Prisma.InputJsonValue,
          outcome: 'success',
        },
      });
    }

    return {
      success: true,
      feedbackId,
      newStatus: resolution?.status,
      buildVersion: resolution?.buildVersion,
    };
  }

  /**
   * Generate improvement report for the build cycle
   */
  async generateImprovementReport(): Promise<Record<string, unknown>> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [allFeedback, resolved, patterns] = await Promise.all([
      this.prisma.feedbackLog.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.feedbackLog.findMany({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          resolutionStatus: 'resolved',
        },
      }),
      this.patternAnalysis(),
    ]);

    // Calculate metrics
    const byAgent = this.groupBy(allFeedback, 'agentId');
    const byCategory = this.groupBy(allFeedback, 'category');
    const bySeverity = this.groupBy(allFeedback, 'severity');

    const avgResolutionTime = this.calculateAvgResolutionTime(resolved);

    return {
      reportPeriod: '30 days',
      generatedAt: new Date(),
      
      summary: {
        totalFeedbackItems: allFeedback.length,
        resolved: resolved.length,
        open: allFeedback.length - resolved.length,
        resolutionRate: ((resolved.length / allFeedback.length) * 100).toFixed(1),
        avgResolutionTimeHours: avgResolutionTime,
      },
      
      byAgent: Object.entries(byAgent).map(([agent, items]) => ({
        agent,
        count: items.length,
        critical: items.filter(i => i.severity === 'critical').length,
      })),
      
      byCategory: Object.entries(byCategory).map(([cat, items]) => ({
        category: cat,
        count: items.length,
      })),
      
      patterns: patterns,
      
      recommendations: this.generateRecommendations(allFeedback, patterns),
      
      buildPriorities: this.determineBuildPriorities(allFeedback),
    };
  }

  /**
   * Get system metrics
   */
  async getMetrics(): Promise<Record<string, unknown>> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [total, recent, resolved, critical] = await Promise.all([
      this.prisma.feedbackLog.count(),
      this.prisma.feedbackLog.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      this.prisma.feedbackLog.count({ where: { resolutionStatus: 'resolved' } }),
      this.prisma.feedbackLog.count({
        where: { severity: 'critical', resolutionStatus: { not: 'resolved' } },
      }),
    ]);

    return {
      totalFeedbackAllTime: total,
      feedbackLast7Days: recent,
      totalResolved: resolved,
      openCritical: critical,
      resolutionRateAllTime: ((resolved / total) * 100).toFixed(1),
      systemHealth: critical > 0 ? 'needs_attention' : 'healthy',
    };
  }

  /**
   * Analyze patterns in feedback
   */
  async patternAnalysis(): Promise<Record<string, unknown>> {
    const feedback = await this.prisma.feedbackLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    // Find recurring issues
    const recurring = this.findRecurringPatterns(feedback);

    // Find agent-specific patterns
    const agentPatterns = this.findAgentPatterns(feedback);

    return {
      analyzedItems: feedback.length,
      recurringPatterns: recurring,
      agentPatterns,
      insights: this.generatePatternInsights(recurring, agentPatterns),
    };
  }

  /**
   * Log agent execution for analysis
   */
  async logAgentExecution(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    const log = await this.prisma.agentExecution.create({
      data: {
        agentId: data.agentId as string,
        taskType: data.taskType as string,
        organizationId: data.organizationId as string | undefined,
        input: data.input as Prisma.InputJsonValue,
        output: data.output as Prisma.InputJsonValue,
        executionTimeMs: data.executionTimeMs as number,
        success: data.success as boolean,
        errorMessage: data.errorMessage as string | undefined,
      },
    });

    // Auto-capture feedback if execution failed or was slow
    if (!data.success || (data.executionTimeMs as number) > 5000) {
      await this.captureFeedback({
        source: {
          type: 'agent_execution',
          agentId: data.agentId as string,
          taskType: data.taskType as string,
          organizationId: data.organizationId as string,
        },
        execution: {
          input: data.input as Record<string, unknown>,
          output: data.output as Record<string, unknown>,
          executionTimeMs: data.executionTimeMs as number,
          success: data.success as boolean,
          errorMessage: data.errorMessage as string,
        },
        feedback: {
          category: !data.success ? 'bug' : 'performance',
          severity: !data.success ? 'high' : 'medium',
          description: !data.success
            ? `Agent execution failed: ${data.errorMessage}`
            : `Slow execution: ${data.executionTimeMs}ms`,
          actualBehavior: JSON.stringify(data.output),
        },
        impact: {
          usersAffected: 1,
          complianceRisk: data.agentId === 'sentinel',
          dataIntegrityRisk: false,
          securityRisk: false,
        },
      });
    }

    return {
      logged: true,
      executionId: log.id,
      autoFeedback: !data.success || (data.executionTimeMs as number) > 5000,
    };
  }

  // ============ STRESS TEST SCENARIOS ============

  private getStressTestScenario(scenarioId: string): StressTestScenario | null {
    const scenarios = this.getAllScenarios();
    return scenarios.find(s => s.id === scenarioId) || null;
  }

  private getAllScenarios(): StressTestScenario[] {
    return [
      // SENTINEL scenarios
      {
        id: 'S1_cliff_edge',
        name: 'Cliff Edge Compliance',
        agentId: 'sentinel',
        description: 'Test behavior at exact 35% threshold',
        setup: { totalEmployees: 20, hubzoneEmployees: 7 },
        tests: [
          {
            action: 'calculate_compliance',
            expected: {
              percentage: 35.0,
              compliant: true,
              alertType: 'thin_margin',
            },
          },
        ],
        successCriteria: { alertGenerated: true },
      },
      {
        id: 'S2_mass_termination',
        name: 'Mass Termination Event',
        agentId: 'sentinel',
        description: 'Handle 40% workforce reduction',
        setup: { totalEmployees: 50, hubzoneEmployees: 22 },
        tests: [
          {
            action: 'simulate_termination',
            params: { count: 20, hubzoneTerminations: 15 },
            expected: {
              newPercentage: 23.33,
              compliant: false,
              alertSeverity: 'critical',
            },
          },
        ],
        successCriteria: { correctCalculation: true },
      },
      {
        id: 'S3_legacy_limit',
        name: 'Legacy Employee Limit',
        agentId: 'sentinel',
        description: 'Test 4 legacy employee maximum',
        setup: { legacyEmployees: 4 },
        tests: [
          {
            action: 'promote_to_legacy',
            expected: {
              rejected: true,
              errorCode: 'LEGACY_LIMIT_EXCEEDED',
            },
          },
        ],
        successCriteria: { limitEnforced: true },
      },

      // CARTOGRAPH scenarios
      {
        id: 'C1_ambiguous_address',
        name: 'Ambiguous Address',
        agentId: 'cartograph',
        description: 'Handle incomplete addresses',
        setup: {},
        tests: [
          {
            action: 'verify_address',
            params: { address: '123 Main St' },
            expected: {
              status: 'incomplete',
              requiredFields: ['city', 'state'],
            },
          },
          {
            action: 'verify_address',
            params: { address: '123 Main St, Springfield' },
            expected: {
              status: 'ambiguous',
              requiredField: 'state',
            },
          },
        ],
        successCriteria: { handlesAmbiguity: true },
      },
      {
        id: 'C2_boundary_edge',
        name: 'HUBZone Boundary Edge',
        agentId: 'cartograph',
        description: 'Address on census tract boundary',
        setup: { address: '500 Border Road, Anytown, TX 75001' },
        tests: [
          {
            action: 'verify_address',
            expected: {
              isHubzone: true,
              confidenceNote: 'boundary_proximity',
            },
          },
        ],
        successCriteria: { boundaryHandled: true },
      },

      // WORKFORCE scenarios
      {
        id: 'W1_rapid_growth',
        name: 'Rapid Growth',
        agentId: 'workforce',
        description: 'Maintain compliance during 50 hires in 90 days',
        setup: { initialEmployees: 10, initialHubzone: 5 },
        tests: [
          {
            action: 'simulate_batch_hire',
            params: { hubzoneHires: 10, nonHubzoneHires: 40 },
            expected: {
              finalPercentage: 25,
              compliant: false,
              warningGenerated: true,
            },
          },
        ],
        successCriteria: { warningAtBreachPoint: true },
      },
      {
        id: 'W2_90day_residency',
        name: '90-Day Residency Rule',
        agentId: 'workforce',
        description: 'Handle 90-day residency waiting period',
        setup: {
          newHire: { moveInDate: 'today - 30 days' },
        },
        tests: [
          {
            action: 'check_hubzone_eligibility',
            expected: {
              countsAsHubzone: false,
              reason: 'residency_under_90_days',
            },
          },
        ],
        successCriteria: { residencyEnforced: true },
      },

      // CAPTURE scenarios
      {
        id: 'CA1_high_volume',
        name: 'High Volume Scan',
        agentId: 'capture',
        description: 'Process 500+ opportunities efficiently',
        setup: {
          setAsides: ['hubzone', 'small_business'],
          naicsCodes: ['541511', '541512'],
        },
        tests: [
          {
            action: 'scan_opportunities',
            expected: {
              executionTime: '<30s',
              duplicatesRemoved: true,
            },
          },
        ],
        successCriteria: { performanceAcceptable: true },
      },
      {
        id: 'CA2_tight_deadline',
        name: 'Tight Deadline',
        agentId: 'capture',
        description: 'Handle opportunity with 5-day deadline',
        setup: {
          opportunity: { deadline: 'today + 5 days', matchScore: 92 },
        },
        tests: [
          {
            action: 'bid_no_bid',
            expected: {
              decision: 'no_bid',
              primaryReason: 'insufficient_preparation_time',
            },
          },
        ],
        successCriteria: { timeConstraintConsidered: true },
      },

      // GUARDIAN scenarios
      {
        id: 'G1_audit_generation',
        name: 'SBA Examination Package',
        agentId: 'guardian',
        description: 'Generate complete audit package under time pressure',
        setup: { responseDeadline: 'today + 10 days' },
        tests: [
          {
            action: 'generate_evidence_package',
            expected: {
              executionTime: '<300s',
              completeness: 100,
            },
          },
        ],
        successCriteria: { completePackage: true },
      },

      // ORACLE scenarios
      {
        id: 'O1_black_swan',
        name: 'Black Swan Map Change',
        agentId: 'oracle',
        description: 'Major HUBZone map change affects 30% of workforce',
        setup: {
          currentCompliance: 42,
          affectedEmployees: 6,
          totalHubzone: 21,
        },
        tests: [
          {
            action: 'simulate_map_change',
            expected: {
              newCompliance: 30,
              breachSeverity: 'critical',
            },
          },
        ],
        successCriteria: { correctProjection: true },
      },
    ];
  }

  // ============ PRIVATE HELPER METHODS ============

  private async executeTestAction(
    agentId: string,
    action: string,
    params: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    // This would call the actual agent in production
    // For now, return mock results for testing
    console.log(`[FEEDBACK] Executing test action: ${agentId}.${action}`);
    
    return {
      executed: true,
      agentId,
      action,
      params,
      mockResult: true,
    };
  }

  private compareResults(
    expected: Record<string, unknown>,
    actual: Record<string, unknown>
  ): string[] {
    const discrepancies: string[] = [];

    for (const [key, expectedValue] of Object.entries(expected)) {
      const actualValue = actual[key];
      
      if (actualValue === undefined) {
        discrepancies.push(`Missing expected field: ${key}`);
      } else if (JSON.stringify(expectedValue) !== JSON.stringify(actualValue)) {
        discrepancies.push(
          `Field '${key}': expected ${JSON.stringify(expectedValue)}, got ${JSON.stringify(actualValue)}`
        );
      }
    }

    return discrepancies;
  }

  private determineSeverity(discrepancies: string[]): FeedbackSeverity {
    if (discrepancies.some(d => d.includes('compliance') || d.includes('critical'))) {
      return 'critical';
    }
    if (discrepancies.length > 3) return 'high';
    if (discrepancies.length > 1) return 'medium';
    return 'low';
  }

  private async escalateCritical(feedbackId: string): Promise<void> {
    console.log(`[FEEDBACK] ESCALATING CRITICAL ISSUE: ${feedbackId}`);
    // Would integrate with alerting system (email, Slack, etc.)
  }

  private calculateAge(date: Date): string {
    const hours = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  }

  private groupBy<T>(items: T[], key: keyof T): Record<string, T[]> {
    return items.reduce((acc, item) => {
      const groupKey = String(item[key]);
      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(item);
      return acc;
    }, {} as Record<string, T[]>);
  }

  private calculateAvgResolutionTime(resolved: Array<{ createdAt: Date; resolvedAt: Date | null }>): number {
    const withResolution = resolved.filter(r => r.resolvedAt);
    if (withResolution.length === 0) return 0;

    const totalMs = withResolution.reduce((sum, r) => {
      return sum + (r.resolvedAt!.getTime() - r.createdAt.getTime());
    }, 0);

    return Math.round(totalMs / withResolution.length / (1000 * 60 * 60)); // hours
  }

  private findRecurringPatterns(
    feedback: Array<{ description: string; agentId: string; taskType: string }>
  ): Array<{ pattern: string; count: number; agent: string }> {
    const patterns: Record<string, { count: number; agent: string }> = {};

    for (const f of feedback) {
      // Simple pattern detection - in production would use NLP
      const key = `${f.agentId}:${f.taskType}`;
      if (!patterns[key]) {
        patterns[key] = { count: 0, agent: f.agentId };
      }
      patterns[key].count++;
    }

    return Object.entries(patterns)
      .filter(([_, v]) => v.count > 1)
      .map(([pattern, v]) => ({ pattern, count: v.count, agent: v.agent }))
      .sort((a, b) => b.count - a.count);
  }

  private findAgentPatterns(
    feedback: Array<{ agentId: string; category: string; severity: string }>
  ): Record<string, { totalIssues: number; categories: Record<string, number> }> {
    const patterns: Record<string, { totalIssues: number; categories: Record<string, number> }> = {};

    for (const f of feedback) {
      if (!patterns[f.agentId]) {
        patterns[f.agentId] = { totalIssues: 0, categories: {} };
      }
      patterns[f.agentId].totalIssues++;
      patterns[f.agentId].categories[f.category] = 
        (patterns[f.agentId].categories[f.category] || 0) + 1;
    }

    return patterns;
  }

  private generatePatternInsights(
    recurring: Array<{ pattern: string; count: number }>,
    agentPatterns: Record<string, { totalIssues: number }>
  ): string[] {
    const insights: string[] = [];

    if (recurring.length > 0) {
      insights.push(`${recurring.length} recurring issue patterns detected`);
    }

    const mostProblematic = Object.entries(agentPatterns)
      .sort(([, a], [, b]) => b.totalIssues - a.totalIssues)[0];
    
    if (mostProblematic) {
      insights.push(`${mostProblematic[0]} agent has most issues (${mostProblematic[1].totalIssues})`);
    }

    return insights;
  }

  private generateRecommendations(
    feedback: Array<{ agentId: string; category: string; severity: string }>,
    patterns: Record<string, unknown>
  ): string[] {
    const recommendations: string[] = [];

    const critical = feedback.filter(f => f.severity === 'critical');
    if (critical.length > 0) {
      recommendations.push(`Address ${critical.length} critical issues immediately`);
    }

    const performance = feedback.filter(f => f.category === 'performance');
    if (performance.length > 5) {
      recommendations.push('Investigate performance bottlenecks');
    }

    recommendations.push('Continue regular stress testing');
    recommendations.push('Review edge case coverage');

    return recommendations;
  }

  private determineBuildPriorities(
    feedback: Array<{ agentId: string; severity: string; category: string }>
  ): Array<{ priority: number; action: string; rationale: string }> {
    const priorities: Array<{ priority: number; action: string; rationale: string }> = [];

    const critical = feedback.filter(f => f.severity === 'critical');
    if (critical.length > 0) {
      priorities.push({
        priority: 1,
        action: 'Fix critical issues',
        rationale: `${critical.length} critical issues blocking`,
      });
    }

    const byAgent = this.groupBy(feedback, 'agentId');
    const mostAffected = Object.entries(byAgent)
      .sort(([, a], [, b]) => b.length - a.length)[0];

    if (mostAffected && mostAffected[1].length > 10) {
      priorities.push({
        priority: 2,
        action: `Stabilize ${mostAffected[0]} agent`,
        rationale: `${mostAffected[1].length} issues in single agent`,
      });
    }

    priorities.push({
      priority: 3,
      action: 'Expand stress test coverage',
      rationale: 'Continuous improvement',
    });

    return priorities.sort((a, b) => a.priority - b.priority);
  }

  private generateTestSummary(
    results: Array<Record<string, unknown>>
  ): Record<string, unknown> {
    const byAgent: Record<string, { passed: number; failed: number }> = {};

    for (const r of results) {
      const agent = r.agent as string;
      if (!byAgent[agent]) {
        byAgent[agent] = { passed: 0, failed: 0 };
      }
      byAgent[agent].passed += r.passed as number;
      byAgent[agent].failed += r.failed as number;
    }

    return {
      byAgent,
      overallStatus: results.every(r => r.status === 'PASSED') ? 'ALL_PASSED' : 'FAILURES_DETECTED',
    };
  }
}
