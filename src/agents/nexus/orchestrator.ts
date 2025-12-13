/**
 * NEXUS Orchestrator
 * 
 * The central coordinator for the HUBZone Navigator agent constellation.
 * NEXUS routes tasks to specialized agents and manages the overall
 * compliance assessment workflow.
 * 
 * Agent Constellation:
 * - NEXUS (this): Central orchestrator and task router
 * - SENTINEL: Compliance monitoring and alerting
 * - CARTOGRAPH: HUBZone map data and geocoding
 * - WORKFORCE: Employee residency analysis
 */

import { prisma } from '@/lib/prisma';
import type { AgentTask, Organization, ComplianceSnapshot } from '@prisma/client';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type AgentType = 'nexus' | 'sentinel' | 'cartograph' | 'workforce';

export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type TaskPriority = 1 | 2 | 3 | 4 | 5; // 1 = critical, 5 = routine

export interface TaskInput {
  [key: string]: unknown;
}

export interface TaskOutput {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: {
    executionTimeMs?: number;
    [key: string]: unknown;
  };
}

export interface CreateTaskOptions {
  agentType: AgentType;
  taskType: string;
  organizationId: string;
  input: TaskInput;
  priority?: TaskPriority;
}

export interface OrchestrationResult {
  success: boolean;
  taskId?: string;
  data?: unknown;
  error?: string;
}

export interface ComplianceAssessment {
  organizationId: string;
  totalEmployees: number;
  hubzoneEmployees: number;
  compliancePercentage: number;
  legacyEmployeeCount: number;
  riskScore: number;
  status: 'compliant' | 'at_risk' | 'non_compliant' | 'grace_period';
  projections: {
    days30: number;
    days90: number;
    days180: number;
  };
}

// ============================================================================
// NEXUS Orchestrator Class
// ============================================================================

export class NexusOrchestrator {
  private static instance: NexusOrchestrator;

  private constructor() {}

  /**
   * Get singleton instance of the orchestrator
   */
  public static getInstance(): NexusOrchestrator {
    if (!NexusOrchestrator.instance) {
      NexusOrchestrator.instance = new NexusOrchestrator();
    }
    return NexusOrchestrator.instance;
  }

  // ==========================================================================
  // Task Management
  // ==========================================================================

  /**
   * Create a new agent task
   */
  async createTask(options: CreateTaskOptions): Promise<AgentTask> {
    const { agentType, taskType, organizationId, input, priority = 5 } = options;

    const task = await prisma.agentTask.create({
      data: {
        agentType,
        taskType,
        organizationId,
        input: input as object,
        priority,
        status: 'pending',
      },
    });

    // Log task creation for learning
    await this.logLearningEvent('task_created', {
      taskId: task.id,
      agentType,
      taskType,
    });

    return task;
  }

  /**
   * Execute a task and update its status
   */
  async executeTask(taskId: string): Promise<OrchestrationResult> {
    const startTime = Date.now();

    try {
      // Mark task as processing
      const task = await prisma.agentTask.update({
        where: { id: taskId },
        data: { status: 'processing' },
      });

      // Route to appropriate agent handler
      const result = await this.routeTask(task);

      // Calculate execution time
      const executionTimeMs = Date.now() - startTime;

      // Update task with results
      await prisma.agentTask.update({
        where: { id: taskId },
        data: {
          status: result.success ? 'completed' : 'failed',
          output: result as object,
          completedAt: new Date(),
          executionTimeMs,
          errorMessage: result.error,
        },
      });

      // Log completion for learning
      await this.logLearningEvent('task_completed', {
        taskId,
        success: result.success,
        executionTimeMs,
      });

      return {
        success: result.success,
        taskId,
        data: result.data,
        error: result.error,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Mark task as failed
      await prisma.agentTask.update({
        where: { id: taskId },
        data: {
          status: 'failed',
          completedAt: new Date(),
          executionTimeMs: Date.now() - startTime,
          errorMessage,
        },
      });

      return {
        success: false,
        taskId,
        error: errorMessage,
      };
    }
  }

  /**
   * Route task to the appropriate agent handler
   */
  private async routeTask(task: AgentTask): Promise<TaskOutput> {
    const input = task.input as TaskInput;

    switch (task.agentType) {
      case 'nexus':
        return this.handleNexusTask(task.taskType, input, task.organizationId);

      case 'sentinel':
        return this.handleSentinelTask(task.taskType, input, task.organizationId);

      case 'cartograph':
        return this.handleCartographTask(task.taskType, input, task.organizationId);

      case 'workforce':
        return this.handleWorkforceTask(task.taskType, input, task.organizationId);

      default:
        return {
          success: false,
          error: `Unknown agent type: ${task.agentType}`,
        };
    }
  }

  // ==========================================================================
  // NEXUS Task Handlers (Self-handled)
  // ==========================================================================

  private async handleNexusTask(
    taskType: string,
    input: TaskInput,
    organizationId: string
  ): Promise<TaskOutput> {
    switch (taskType) {
      case 'full_compliance_assessment':
        return this.performFullComplianceAssessment(organizationId);

      case 'generate_compliance_snapshot':
        return this.generateComplianceSnapshot(organizationId);

      case 'health_check':
        return this.performHealthCheck();

      default:
        return {
          success: false,
          error: `Unknown NEXUS task type: ${taskType}`,
        };
    }
  }

  // ==========================================================================
  // Agent Task Handlers (Delegated - Stubs for now)
  // ==========================================================================

  private async handleSentinelTask(
    taskType: string,
    input: TaskInput,
    organizationId: string
  ): Promise<TaskOutput> {
    // TODO: Implement SENTINEL agent
    // SENTINEL handles: compliance monitoring, alert generation, risk assessment
    switch (taskType) {
      case 'check_compliance_threshold':
      case 'generate_alerts':
      case 'assess_risk':
        return {
          success: true,
          data: { message: 'SENTINEL agent not yet implemented' },
        };
      default:
        return {
          success: false,
          error: `Unknown SENTINEL task type: ${taskType}`,
        };
    }
  }

  private async handleCartographTask(
    taskType: string,
    input: TaskInput,
    organizationId: string
  ): Promise<TaskOutput> {
    // TODO: Implement CARTOGRAPH agent
    // CARTOGRAPH handles: geocoding, HUBZone lookups, map change detection
    switch (taskType) {
      case 'geocode_address':
      case 'lookup_hubzone_status':
      case 'detect_map_changes':
        return {
          success: true,
          data: { message: 'CARTOGRAPH agent not yet implemented' },
        };
      default:
        return {
          success: false,
          error: `Unknown CARTOGRAPH task type: ${taskType}`,
        };
    }
  }

  private async handleWorkforceTask(
    taskType: string,
    input: TaskInput,
    organizationId: string
  ): Promise<TaskOutput> {
    // TODO: Implement WORKFORCE agent
    // WORKFORCE handles: employee residency analysis, hiring recommendations
    switch (taskType) {
      case 'analyze_residency':
      case 'recommend_hiring_zones':
      case 'track_relocations':
        return {
          success: true,
          data: { message: 'WORKFORCE agent not yet implemented' },
        };
      default:
        return {
          success: false,
          error: `Unknown WORKFORCE task type: ${taskType}`,
        };
    }
  }

  // ==========================================================================
  // Core Orchestration Methods
  // ==========================================================================

  /**
   * Perform a full compliance assessment for an organization
   */
  async performFullComplianceAssessment(
    organizationId: string
  ): Promise<TaskOutput> {
    try {
      // Fetch organization with employees
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
          employees: {
            where: { isActive: true },
          },
        },
      });

      if (!organization) {
        return {
          success: false,
          error: 'Organization not found',
        };
      }

      const employees = organization.employees;
      const totalEmployees = employees.length;
      const hubzoneEmployees = employees.filter((e) => e.isHubzoneResident).length;
      const legacyEmployeeCount = employees.filter((e) => e.isLegacyEmployee).length;

      // Calculate compliance percentage
      const compliancePercentage =
        totalEmployees > 0 ? (hubzoneEmployees / totalEmployees) * 100 : 0;

      // Determine compliance status
      let status: ComplianceAssessment['status'];
      if (compliancePercentage >= 35) {
        status = 'compliant';
      } else if (compliancePercentage >= 25) {
        status = 'at_risk';
      } else {
        status = 'non_compliant';
      }

      // Calculate risk score (0-100, higher = more risk)
      const riskScore = this.calculateRiskScore({
        compliancePercentage,
        legacyEmployeeCount,
        totalEmployees,
        atRiskEmployees: employees.filter((e) => e.atRiskRedesignation).length,
      });

      // Generate projections (simplified for now)
      const projections = this.generateProjections(compliancePercentage);

      const assessment: ComplianceAssessment = {
        organizationId,
        totalEmployees,
        hubzoneEmployees,
        compliancePercentage,
        legacyEmployeeCount,
        riskScore,
        status,
        projections,
      };

      return {
        success: true,
        data: assessment,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Assessment failed',
      };
    }
  }

  /**
   * Generate and store a compliance snapshot
   */
  async generateComplianceSnapshot(organizationId: string): Promise<TaskOutput> {
    try {
      const assessmentResult = await this.performFullComplianceAssessment(organizationId);

      if (!assessmentResult.success || !assessmentResult.data) {
        return assessmentResult;
      }

      const assessment = assessmentResult.data as ComplianceAssessment;

      // Check for existing grace period
      const lastSnapshot = await prisma.complianceSnapshot.findFirst({
        where: { organizationId },
        orderBy: { snapshotDate: 'desc' },
      });

      const gracePeriodActive = lastSnapshot?.gracePeriodActive ?? false;
      const gracePeriodEnd = lastSnapshot?.gracePeriodEnd ?? null;

      // Create snapshot
      const snapshot = await prisma.complianceSnapshot.create({
        data: {
          organizationId,
          totalEmployees: assessment.totalEmployees,
          hubzoneEmployees: assessment.hubzoneEmployees,
          compliancePercentage: assessment.compliancePercentage,
          legacyEmployeeCount: assessment.legacyEmployeeCount,
          riskScore: assessment.riskScore,
          complianceStatus: assessment.status,
          gracePeriodActive,
          gracePeriodEnd,
          projections: assessment.projections,
        },
      });

      return {
        success: true,
        data: snapshot,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Snapshot generation failed',
      };
    }
  }

  /**
   * System health check
   */
  async performHealthCheck(): Promise<TaskOutput> {
    try {
      // Check database connectivity
      await prisma.$queryRaw`SELECT 1`;

      // Get pending task count
      const pendingTasks = await prisma.agentTask.count({
        where: { status: 'pending' },
      });

      // Get failed tasks in last hour
      const failedTasksLastHour = await prisma.agentTask.count({
        where: {
          status: 'failed',
          completedAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000),
          },
        },
      });

      return {
        success: true,
        data: {
          status: 'healthy',
          database: 'connected',
          pendingTasks,
          failedTasksLastHour,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Health check failed',
        data: {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Calculate risk score based on various factors
   */
  private calculateRiskScore(params: {
    compliancePercentage: number;
    legacyEmployeeCount: number;
    totalEmployees: number;
    atRiskEmployees: number;
  }): number {
    const { compliancePercentage, legacyEmployeeCount, totalEmployees, atRiskEmployees } = params;

    let riskScore = 0;

    // Distance from 35% threshold (max 40 points)
    if (compliancePercentage < 35) {
      riskScore += Math.min(40, (35 - compliancePercentage) * 2);
    }

    // Legacy employee dependency (max 20 points)
    // Having more than 2 legacy employees increases risk
    if (legacyEmployeeCount > 2) {
      riskScore += Math.min(20, (legacyEmployeeCount - 2) * 5);
    }

    // At-risk employees in redesignated areas (max 30 points)
    if (totalEmployees > 0 && atRiskEmployees > 0) {
      const atRiskPercentage = (atRiskEmployees / totalEmployees) * 100;
      riskScore += Math.min(30, atRiskPercentage);
    }

    // Small employee base volatility (max 10 points)
    if (totalEmployees < 10) {
      riskScore += 10 - totalEmployees;
    }

    return Math.min(100, riskScore);
  }

  /**
   * Generate compliance projections
   */
  private generateProjections(currentPercentage: number): ComplianceAssessment['projections'] {
    // Simplified projections - in reality, this would use historical data
    // and machine learning models
    return {
      days30: currentPercentage, // Assume stable for now
      days90: currentPercentage,
      days180: currentPercentage,
    };
  }

  /**
   * Log an event for machine learning
   */
  private async logLearningEvent(
    eventType: string,
    data: Record<string, unknown>
  ): Promise<void> {
    try {
      await prisma.learningEvent.create({
        data: {
          eventType: `nexus_${eventType}`,
          inputData: data,
          outputData: {},
          outcome: 'success',
        },
      });
    } catch {
      // Silently fail - learning events are non-critical
    }
  }

  // ==========================================================================
  // Queue Processing
  // ==========================================================================

  /**
   * Process pending tasks in the queue
   */
  async processQueue(batchSize: number = 10): Promise<number> {
    const pendingTasks = await prisma.agentTask.findMany({
      where: { status: 'pending' },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
      take: batchSize,
    });

    let processed = 0;

    for (const task of pendingTasks) {
      await this.executeTask(task.id);
      processed++;
    }

    return processed;
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    const [pending, processing, completed, failed] = await Promise.all([
      prisma.agentTask.count({ where: { status: 'pending' } }),
      prisma.agentTask.count({ where: { status: 'processing' } }),
      prisma.agentTask.count({ where: { status: 'completed' } }),
      prisma.agentTask.count({ where: { status: 'failed' } }),
    ]);

    return { pending, processing, completed, failed };
  }
}

// ============================================================================
// Convenience Exports
// ============================================================================

/**
 * Get the NEXUS orchestrator instance
 */
export function getNexusOrchestrator(): NexusOrchestrator {
  return NexusOrchestrator.getInstance();
}

/**
 * Quick helper to create and execute a task
 */
export async function orchestrate(options: CreateTaskOptions): Promise<OrchestrationResult> {
  const orchestrator = getNexusOrchestrator();
  const task = await orchestrator.createTask(options);
  return orchestrator.executeTask(task.id);
}

export default NexusOrchestrator;
