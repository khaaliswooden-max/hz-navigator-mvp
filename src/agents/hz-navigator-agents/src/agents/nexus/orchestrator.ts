/**
 * NEXUS - Agent Orchestration Core
 * The central nervous system coordinating all agent activities
 * 
 * Routes tasks to appropriate agents, manages execution,
 * tracks performance, and logs learning events.
 */

import { PrismaClient, Prisma } from '@prisma/client';

// Agent type definitions
export type AgentType =
  | 'nexus'
  | 'sentinel'
  | 'cartograph'
  | 'workforce'
  | 'capture'
  | 'advocate'
  | 'guardian'
  | 'diplomat'
  | 'oracle'
  | 'archivist';

export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface TaskInput {
  agentType: AgentType;
  taskType: string;
  input: Record<string, unknown>;
  organizationId: string;
  priority?: number;
}

export interface TaskResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  executionTimeMs?: number;
}

/**
 * NEXUS Orchestrator - Central command for the agent constellation
 */
export class NexusOrchestrator {
  private prisma: PrismaClient;
  private agentCache: Map<AgentType, unknown> = new Map();

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Create and execute a task
   */
  async createTask(params: TaskInput): Promise<{
    id: string;
    output: Record<string, unknown> | null;
  }> {
    const task = await this.prisma.agentTask.create({
      data: {
        agentType: params.agentType,
        taskType: params.taskType,
        input: params.input as Prisma.InputJsonValue,
        organizationId: params.organizationId,
        priority: params.priority || 5,
        status: 'pending',
      },
    });

    console.log(`[NEXUS] Task created: ${task.id} → ${params.agentType}:${params.taskType}`);

    // Execute immediately
    const result = await this.dispatchTask(task.id);

    return {
      id: task.id,
      output: result,
    };
  }

  /**
   * Dispatch a task to the appropriate agent
   */
  async dispatchTask(taskId: string): Promise<Record<string, unknown> | null> {
    const task = await this.prisma.agentTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const startTime = Date.now();

    try {
      await this.prisma.agentTask.update({
        where: { id: taskId },
        data: { status: 'processing' },
      });

      // Route to appropriate agent
      const result = await this.routeToAgent(
        task.agentType as AgentType,
        task.taskType,
        task.input as Record<string, unknown>,
        task.organizationId
      );

      const executionTimeMs = Date.now() - startTime;

      // Mark completed
      await this.prisma.agentTask.update({
        where: { id: taskId },
        data: {
          status: 'completed',
          output: result as Prisma.InputJsonValue,
          completedAt: new Date(),
          executionTimeMs,
        },
      });

      // Log learning event
      await this.logLearningEvent(
        task.agentType,
        task.taskType,
        task.input as Record<string, unknown>,
        result,
        'success',
        task.organizationId
      );

      console.log(`[NEXUS] Task completed: ${taskId} in ${executionTimeMs}ms`);

      return result;
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.prisma.agentTask.update({
        where: { id: taskId },
        data: {
          status: 'failed',
          errorMessage,
          completedAt: new Date(),
          executionTimeMs,
        },
      });

      // Log failure for learning
      await this.logLearningEvent(
        task.agentType,
        task.taskType,
        task.input as Record<string, unknown>,
        { error: errorMessage },
        'failure',
        task.organizationId
      );

      console.error(`[NEXUS] Task failed: ${taskId}`, error);
      throw error;
    }
  }

  /**
   * Route task to the appropriate agent
   */
  private async routeToAgent(
    agentType: AgentType,
    taskType: string,
    input: Record<string, unknown>,
    organizationId: string
  ): Promise<Record<string, unknown>> {
    switch (agentType) {
      case 'sentinel': {
        const { SentinelAgent } = await import('../sentinel/complianceMonitor');
        const agent = new SentinelAgent(this.prisma);
        return await agent.execute(taskType, input, organizationId);
      }

      case 'cartograph': {
        const { CartographAgent } = await import('../cartograph/geospatialIntelligence');
        const agent = new CartographAgent(this.prisma);
        return await agent.execute(taskType, input, organizationId);
      }

      case 'workforce': {
        const { WorkforceAgent } = await import('../workforce/employeeIntelligence');
        const agent = new WorkforceAgent(this.prisma);
        return await agent.execute(taskType, input, organizationId);
      }

      case 'capture': {
        const { CaptureAgent } = await import('../capture/opportunityScanner');
        const agent = new CaptureAgent(this.prisma);
        return await agent.execute(taskType, input, organizationId);
      }

      case 'advocate': {
        const { AdvocateAgent } = await import('../advocate/regulatoryIntelligence');
        const agent = new AdvocateAgent(this.prisma);
        return await agent.execute(taskType, input, organizationId);
      }

      case 'guardian': {
        const { GuardianAgent } = await import('../guardian/auditDefense');
        const agent = new GuardianAgent(this.prisma);
        return await agent.execute(taskType, input, organizationId);
      }

      case 'diplomat': {
        const { DiplomatAgent } = await import('../diplomat/partnershipIntelligence');
        const agent = new DiplomatAgent(this.prisma);
        return await agent.execute(taskType, input, organizationId);
      }

      case 'oracle': {
        const { OracleAgent } = await import('../oracle/predictiveAnalytics');
        const agent = new OracleAgent(this.prisma);
        return await agent.execute(taskType, input, organizationId);
      }

      case 'archivist': {
        const { ArchivistAgent } = await import('../archivist/documentIntelligence');
        const agent = new ArchivistAgent(this.prisma);
        return await agent.execute(taskType, input, organizationId);
      }

      default:
        throw new Error(`[NEXUS] Unknown agent type: ${agentType}`);
    }
  }

  /**
   * Log events for ML training and system improvement
   */
  private async logLearningEvent(
    agentType: string,
    taskType: string,
    input: Record<string, unknown>,
    output: Record<string, unknown>,
    outcome: string,
    organizationId?: string
  ): Promise<void> {
    try {
      await this.prisma.learningEvent.create({
        data: {
          eventType: `${agentType}_${taskType}`,
          inputData: input as Prisma.InputJsonValue,
          outputData: output as Prisma.InputJsonValue,
          outcome,
          organizationId,
          metadata: {
            timestamp: new Date().toISOString(),
            agentVersion: '1.0.0',
          } as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      console.error('[NEXUS] Failed to log learning event:', error);
    }
  }

  /**
   * Get task status
   */
  async getTaskStatus(taskId: string) {
    return await this.prisma.agentTask.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        agentType: true,
        taskType: true,
        status: true,
        output: true,
        errorMessage: true,
        executionTimeMs: true,
        createdAt: true,
        completedAt: true,
      },
    });
  }

  /**
   * Get recent tasks for an organization
   */
  async getRecentTasks(organizationId: string, limit: number = 10) {
    return await this.prisma.agentTask.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        agentType: true,
        taskType: true,
        status: true,
        executionTimeMs: true,
        createdAt: true,
        completedAt: true,
      },
    });
  }

  /**
   * Get agent performance metrics
   */
  async getAgentMetrics(agentType?: AgentType) {
    const where = agentType ? { agentType } : {};

    const tasks = await this.prisma.agentTask.groupBy({
      by: ['agentType', 'status'],
      where,
      _count: true,
      _avg: {
        executionTimeMs: true,
      },
    });

    return tasks;
  }
}

// Singleton instance
let nexusInstance: NexusOrchestrator | null = null;
let prismaInstance: PrismaClient | null = null;

/**
 * Get or create NEXUS orchestrator singleton
 */
export function getNexusOrchestrator(): NexusOrchestrator {
  if (!nexusInstance) {
    if (!prismaInstance) {
      prismaInstance = new PrismaClient();
    }
    nexusInstance = new NexusOrchestrator(prismaInstance);
  }
  return nexusInstance;
}

/**
 * Initialize NEXUS with a specific Prisma instance
 */
export function initNexus(prisma: PrismaClient): NexusOrchestrator {
  nexusInstance = new NexusOrchestrator(prisma);
  return nexusInstance;
}
