/**
 * BuildCycle - Core module for the feedback recycling pipeline
 * 
 * Implements the cycle:
 * BUILD → TEST → ANALYZE → REPORT → TRIAGE → PATCH → (repeat)
 * 
 * Feedback classification:
 * - Critical issues → Build blockers (must fix before proceeding)
 * - High issues → Patches (can fix in parallel with next phase)
 * - Medium/Low issues → Backlog (addressed in polish phase)
 * - All issues → Learning events (training data for improvement)
 */

import { PrismaClient, Prisma } from '@prisma/client';

// ============================================================
// TYPES
// ============================================================

export type BuildPhase = 
  | 'database_foundation'
  | 'agent_integration' 
  | 'api_routes'
  | 'ui_components'
  | 'employee_management'
  | 'capture_pipeline'
  | 'analytics_forecasting'
  | 'audit_documentation'
  | 'partnership_features'
  | 'polish_production';

export type FeedbackSeverity = 'critical' | 'high' | 'medium' | 'low';

export type FeedbackCategory = 
  | 'bug' 
  | 'ux_issue' 
  | 'performance' 
  | 'feature_gap' 
  | 'data_quality'
  | 'security'
  | 'compliance';

export type FeedbackDestination = 
  | 'build_blocker'      // Critical - must fix before proceeding
  | 'parallel_patch'     // High - fix in parallel with next phase
  | 'backlog'            // Medium/Low - address in polish phase
  | 'learning_event';    // All - training data

export type CycleStatus = 
  | 'passed'             // All tests pass, no blockers
  | 'blocked'            // Critical issues prevent proceeding
  | 'needs_patches'      // Can proceed but patches needed
  | 'in_progress';       // Currently running

export interface FeedbackItem {
  id: string;
  cycleNumber: number;
  phase: BuildPhase;
  agentSource: string;
  taskType: string;
  category: FeedbackCategory;
  severity: FeedbackSeverity;
  description: string;
  expectedBehavior: string;
  actualBehavior: string;
  reproductionSteps: string[];
  inputData: Record<string, unknown>;
  outputData: Record<string, unknown>;
  status: 'open' | 'in_progress' | 'resolved' | 'wont_fix' | 'deferred';
  destination: FeedbackDestination;
  resolution?: string;
  preventionStrategy?: string;
  patchedInCycle?: number;
  addedToTestSuite: boolean;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface PatchItem {
  id: string;
  feedbackId: string;
  cycleNumber: number;
  phase: BuildPhase;
  priority: number;            // 1 = highest
  component: string;           // Which agent/module
  description: string;
  estimatedEffort: 'trivial' | 'small' | 'medium' | 'large' | 'xlarge';
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  suggestedFix: string;
  assignedTo?: string;
  completedAt?: Date;
  commitHash?: string;
  buildVersion?: string;
}

export interface CycleResult {
  cycleNumber: number;
  phase: BuildPhase;
  status: CycleStatus;
  healthScore: number;
  
  // Test results
  testsRun: number;
  testsPassed: number;
  testsFailed: number;
  
  // Feedback summary
  feedbackItems: FeedbackItem[];
  bySeverity: Record<FeedbackSeverity, number>;
  byCategory: Record<FeedbackCategory, number>;
  byDestination: Record<FeedbackDestination, number>;
  
  // Patches
  patches: PatchItem[];
  buildBlockers: string[];
  
  // Recommendations
  recommendation: string;
  canProceed: boolean;
  nextPhase?: BuildPhase;
  
  // Metadata
  startedAt: Date;
  completedAt: Date;
  durationMs: number;
}

export interface BuildCycleConfig {
  cycleNumber: number;
  phase: BuildPhase;
  features: string[];
  targetComponents: string[];
  blockOnCritical: boolean;
  parallelPatchThreshold: number;  // Max high issues before blocking
}

// ============================================================
// BUILD CYCLE CLASS
// ============================================================

export class BuildCycle {
  private prisma: PrismaClient;
  private config: BuildCycleConfig;
  private feedbackItems: FeedbackItem[] = [];
  private patches: PatchItem[] = [];
  private startTime: Date = new Date();

  constructor(prisma: PrismaClient, config: BuildCycleConfig) {
    this.prisma = prisma;
    this.config = config;
  }

  /**
   * Classify feedback severity into destination
   * Critical → build_blocker
   * High → parallel_patch
   * Medium/Low → backlog
   * All → learning_event (in addition)
   */
  static classifyFeedback(severity: FeedbackSeverity): FeedbackDestination {
    switch (severity) {
      case 'critical':
        return 'build_blocker';
      case 'high':
        return 'parallel_patch';
      case 'medium':
      case 'low':
      default:
        return 'backlog';
    }
  }

  /**
   * Calculate priority from severity and category
   */
  static calculatePriority(severity: FeedbackSeverity, category: FeedbackCategory): number {
    const severityWeight = { critical: 0, high: 10, medium: 20, low: 30 };
    const categoryWeight = { 
      security: 0, compliance: 1, bug: 2, 
      data_quality: 3, performance: 4, ux_issue: 5, feature_gap: 6 
    };
    return severityWeight[severity] + categoryWeight[category];
  }

  /**
   * Add feedback from an agent's self-test
   */
  addFeedback(feedback: Omit<FeedbackItem, 'id' | 'cycleNumber' | 'phase' | 'destination' | 'createdAt'>): FeedbackItem {
    const item: FeedbackItem = {
      ...feedback,
      id: `fb-${this.config.cycleNumber}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      cycleNumber: this.config.cycleNumber,
      phase: this.config.phase,
      destination: BuildCycle.classifyFeedback(feedback.severity),
      createdAt: new Date(),
    };
    
    this.feedbackItems.push(item);
    
    // Auto-generate patch for critical/high issues
    if (item.severity === 'critical' || item.severity === 'high') {
      this.generatePatch(item);
    }
    
    return item;
  }

  /**
   * Generate a patch item from feedback
   */
  private generatePatch(feedback: FeedbackItem): PatchItem {
    const patch: PatchItem = {
      id: `patch-${this.config.cycleNumber}-${Date.now()}`,
      feedbackId: feedback.id,
      cycleNumber: this.config.cycleNumber,
      phase: this.config.phase,
      priority: BuildCycle.calculatePriority(feedback.severity, feedback.category),
      component: feedback.agentSource,
      description: feedback.description,
      estimatedEffort: this.estimateEffort(feedback),
      status: 'pending',
      suggestedFix: feedback.preventionStrategy || `Fix ${feedback.category} in ${feedback.agentSource}: ${feedback.description}`,
    };
    
    this.patches.push(patch);
    return patch;
  }

  /**
   * Estimate effort based on category and description
   */
  private estimateEffort(feedback: FeedbackItem): PatchItem['estimatedEffort'] {
    if (feedback.category === 'bug') {
      return feedback.severity === 'critical' ? 'medium' : 'small';
    }
    if (feedback.category === 'performance') {
      return 'medium';
    }
    if (feedback.category === 'feature_gap') {
      return 'large';
    }
    if (feedback.category === 'security' || feedback.category === 'compliance') {
      return 'medium';
    }
    return 'small';
  }

  /**
   * Aggregate all feedback into summaries
   */
  aggregateFeedback(): {
    bySeverity: Record<FeedbackSeverity, number>;
    byCategory: Record<FeedbackCategory, number>;
    byDestination: Record<FeedbackDestination, number>;
  } {
    const bySeverity: Record<FeedbackSeverity, number> = {
      critical: 0, high: 0, medium: 0, low: 0
    };
    const byCategory: Record<FeedbackCategory, number> = {
      bug: 0, ux_issue: 0, performance: 0, 
      feature_gap: 0, data_quality: 0, security: 0, compliance: 0
    };
    const byDestination: Record<FeedbackDestination, number> = {
      build_blocker: 0, parallel_patch: 0, backlog: 0, learning_event: 0
    };

    for (const item of this.feedbackItems) {
      bySeverity[item.severity]++;
      byCategory[item.category]++;
      byDestination[item.destination]++;
      byDestination['learning_event']++; // All go to learning
    }

    return { bySeverity, byCategory, byDestination };
  }

  /**
   * Determine if the cycle can proceed
   */
  canProceed(): { proceed: boolean; reason: string } {
    const criticalCount = this.feedbackItems.filter(f => f.severity === 'critical').length;
    const highCount = this.feedbackItems.filter(f => f.severity === 'high').length;

    if (this.config.blockOnCritical && criticalCount > 0) {
      return {
        proceed: false,
        reason: `${criticalCount} critical issue(s) must be fixed before proceeding`,
      };
    }

    if (highCount > this.config.parallelPatchThreshold) {
      return {
        proceed: false,
        reason: `${highCount} high-priority issues exceed threshold (${this.config.parallelPatchThreshold})`,
      };
    }

    return {
      proceed: true,
      reason: criticalCount === 0 && highCount === 0
        ? 'All tests passed'
        : `${highCount} patches to address in parallel`,
    };
  }

  /**
   * Log all feedback as learning events
   */
  async logLearningEvents(): Promise<void> {
    for (const feedback of this.feedbackItems) {
      try {
        await this.prisma.learningEvent.create({
          data: {
            eventType: `feedback_${this.config.phase}`,
            inputData: feedback.inputData as Prisma.InputJsonValue,
            outputData: {
              ...feedback.outputData,
              feedback: {
                severity: feedback.severity,
                category: feedback.category,
                destination: feedback.destination,
              },
            } as Prisma.InputJsonValue,
            outcome: feedback.status,
            metadata: {
              cycleNumber: this.config.cycleNumber,
              phase: this.config.phase,
              agentSource: feedback.agentSource,
              taskType: feedback.taskType,
              description: feedback.description,
            } as Prisma.InputJsonValue,
          },
        });
      } catch (error) {
        console.error(`[BuildCycle] Failed to log learning event:`, error);
      }
    }
  }

  /**
   * Store feedback items in database
   */
  async persistFeedback(): Promise<void> {
    for (const feedback of this.feedbackItems) {
      try {
        await this.prisma.feedbackLog.create({
          data: {
            sourceType: 'build_cycle',
            agentId: feedback.agentSource,
            taskType: feedback.taskType,
            scenarioId: `cycle-${this.config.cycleNumber}-${this.config.phase}`,
            
            executionInput: feedback.inputData as Prisma.InputJsonValue,
            executionOutput: feedback.outputData as Prisma.InputJsonValue,
            executionSuccess: feedback.status !== 'open',
            
            category: feedback.category,
            severity: feedback.severity,
            description: feedback.description,
            expectedBehavior: feedback.expectedBehavior,
            actualBehavior: feedback.actualBehavior,
            
            resolutionStatus: feedback.status,
            
            complianceRisk: feedback.category === 'compliance',
            dataIntegrityRisk: feedback.category === 'data_quality',
            securityRisk: feedback.category === 'security',
          },
        });
      } catch (error) {
        console.error(`[BuildCycle] Failed to persist feedback:`, error);
      }
    }
  }

  /**
   * Generate final cycle result
   */
  generateResult(testsRun: number, testsPassed: number): CycleResult {
    const { bySeverity, byCategory, byDestination } = this.aggregateFeedback();
    const { proceed, reason } = this.canProceed();
    
    const completedAt = new Date();
    const healthScore = testsRun > 0 ? (testsPassed / testsRun) * 100 : 0;

    // Sort patches by priority
    const sortedPatches = [...this.patches].sort((a, b) => a.priority - b.priority);

    // Get build blockers
    const buildBlockers = this.feedbackItems
      .filter(f => f.destination === 'build_blocker')
      .map(f => f.description);

    // Determine status
    let status: CycleStatus;
    if (!proceed) {
      status = 'blocked';
    } else if (sortedPatches.length > 0) {
      status = 'needs_patches';
    } else {
      status = 'passed';
    }

    // Generate recommendation
    let recommendation: string;
    if (status === 'blocked') {
      recommendation = `BLOCKED: ${reason}. Fix ${bySeverity.critical} critical issue(s) before proceeding.`;
    } else if (status === 'needs_patches') {
      recommendation = `CAN PROCEED with ${sortedPatches.length} patches to address in parallel. ${reason}`;
    } else {
      recommendation = `✅ All tests passed. Ready for next phase.`;
    }

    return {
      cycleNumber: this.config.cycleNumber,
      phase: this.config.phase,
      status,
      healthScore,
      
      testsRun,
      testsPassed,
      testsFailed: testsRun - testsPassed,
      
      feedbackItems: this.feedbackItems,
      bySeverity,
      byCategory,
      byDestination,
      
      patches: sortedPatches,
      buildBlockers,
      
      recommendation,
      canProceed: proceed,
      nextPhase: proceed ? this.getNextPhase() : undefined,
      
      startedAt: this.startTime,
      completedAt,
      durationMs: completedAt.getTime() - this.startTime.getTime(),
    };
  }

  /**
   * Get the next phase in the build cycle
   */
  private getNextPhase(): BuildPhase | undefined {
    const phases: BuildPhase[] = [
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

    const currentIndex = phases.indexOf(this.config.phase);
    if (currentIndex >= 0 && currentIndex < phases.length - 1) {
      return phases[currentIndex + 1];
    }
    return undefined;
  }

  // ============================================================
  // GETTERS
  // ============================================================

  getFeedback(): FeedbackItem[] {
    return [...this.feedbackItems];
  }

  getPatches(): PatchItem[] {
    return [...this.patches];
  }

  getConfig(): BuildCycleConfig {
    return { ...this.config };
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Create default config for a phase
 */
export function createPhaseConfig(
  cycleNumber: number,
  phase: BuildPhase,
  options: Partial<BuildCycleConfig> = {}
): BuildCycleConfig {
  const defaultConfigs: Record<BuildPhase, Partial<BuildCycleConfig>> = {
    database_foundation: {
      features: ['PostgreSQL', 'Prisma', 'PostGIS', 'Seed Data'],
      targetComponents: ['database', 'schema', 'migrations'],
      parallelPatchThreshold: 3,
    },
    agent_integration: {
      features: ['NEXUS', 'SENTINEL', 'CARTOGRAPH', 'WORKFORCE'],
      targetComponents: ['agents', 'routing', 'execution'],
      parallelPatchThreshold: 5,
    },
    api_routes: {
      features: ['REST endpoints', 'Authentication', 'Validation'],
      targetComponents: ['api', 'routes', 'middleware'],
      parallelPatchThreshold: 5,
    },
    ui_components: {
      features: ['Dashboard', 'Forms', 'Tables', 'Charts'],
      targetComponents: ['components', 'pages', 'styles'],
      parallelPatchThreshold: 7,
    },
    employee_management: {
      features: ['CRUD', 'Address Integration', 'Bulk Import'],
      targetComponents: ['workforce', 'cartograph', 'forms'],
      parallelPatchThreshold: 5,
    },
    capture_pipeline: {
      features: ['SAM.gov', 'Pipeline', 'Bid/No-Bid'],
      targetComponents: ['capture', 'opportunities', 'analysis'],
      parallelPatchThreshold: 5,
    },
    analytics_forecasting: {
      features: ['Trends', 'Forecasts', 'Scenarios'],
      targetComponents: ['oracle', 'charts', 'reports'],
      parallelPatchThreshold: 5,
    },
    audit_documentation: {
      features: ['Evidence', 'Gaps', 'Packages'],
      targetComponents: ['guardian', 'archivist', 'exports'],
      parallelPatchThreshold: 5,
    },
    partnership_features: {
      features: ['Partners', 'Synergy', 'JV Analysis'],
      targetComponents: ['diplomat', 'advocate', 'regulatory'],
      parallelPatchThreshold: 5,
    },
    polish_production: {
      features: ['Performance', 'Security', 'Onboarding'],
      targetComponents: ['all'],
      parallelPatchThreshold: 10,
    },
  };

  return {
    cycleNumber,
    phase,
    features: defaultConfigs[phase]?.features || [],
    targetComponents: defaultConfigs[phase]?.targetComponents || [],
    blockOnCritical: true,
    parallelPatchThreshold: defaultConfigs[phase]?.parallelPatchThreshold || 5,
    ...options,
  };
}
