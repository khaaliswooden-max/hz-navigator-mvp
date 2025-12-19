/**
 * Feedback Loop API Routes
 * 
 * Copy these files to your src/app/api/ directory
 */

// ============================================
// src/app/api/feedback/route.ts
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { FeedbackAgent } from '@/agents/feedback/recursiveLearning';

const feedbackAgent = new FeedbackAgent(prisma);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskType, input, organizationId } = body;

    const result = await feedbackAgent.execute(taskType, input, organizationId);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[API] Feedback error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'metrics':
        const metrics = await feedbackAgent.execute('get_metrics', {});
        return NextResponse.json(metrics);

      case 'open_issues':
        const issues = await feedbackAgent.execute('get_open_issues', {});
        return NextResponse.json(issues);

      case 'log':
        const filters = {
          agentId: searchParams.get('agentId'),
          category: searchParams.get('category'),
          severity: searchParams.get('severity'),
          status: searchParams.get('status'),
          limit: parseInt(searchParams.get('limit') || '50'),
        };
        const log = await feedbackAgent.execute('get_feedback_log', filters);
        return NextResponse.json(log);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

// ============================================
// src/app/api/feedback/stress-test/route.ts
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { FeedbackAgent } from '@/agents/feedback/recursiveLearning';

const feedbackAgent = new FeedbackAgent(prisma);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scenarioId, agentId, runAll } = body;

    let result;
    if (runAll) {
      result = await feedbackAgent.execute('run_all_stress_tests', { agentId });
    } else if (scenarioId) {
      result = await feedbackAgent.execute('run_stress_test', { scenarioId });
    } else {
      return NextResponse.json({ error: 'scenarioId or runAll required' }, { status: 400 });
    }

    // Log the stress test run
    await prisma.stressTestRun.create({
      data: {
        scenarioId: scenarioId || 'all',
        scenarioName: (result.scenarioName as string) || 'All Scenarios',
        agentId: (result.agent as string) || agentId || 'all',
        totalTests: (result.totalTests as number) || 0,
        passed: (result.passed as number) || (result.totalPassed as number) || 0,
        failed: (result.failed as number) || (result.totalFailed as number) || 0,
        passRate: parseFloat((result.passRate as string) || (result.overallPassRate as string) || '0'),
        results: result as any,
      },
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[API] Stress test error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get recent stress test runs
    const runs = await prisma.stressTestRun.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({ runs });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

// ============================================
// src/app/api/feedback/report/route.ts
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { FeedbackAgent } from '@/agents/feedback/recursiveLearning';

const feedbackAgent = new FeedbackAgent(prisma);

export async function GET(request: NextRequest) {
  try {
    const report = await feedbackAgent.execute('generate_improvement_report', {});
    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

// ============================================
// src/app/api/feedback/patterns/route.ts
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { FeedbackAgent } from '@/agents/feedback/recursiveLearning';

const feedbackAgent = new FeedbackAgent(prisma);

export async function GET(request: NextRequest) {
  try {
    const patterns = await feedbackAgent.execute('pattern_analysis', {});
    return NextResponse.json(patterns);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

// ============================================
// src/app/api/feedback/resolve/route.ts
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { FeedbackAgent } from '@/agents/feedback/recursiveLearning';

const feedbackAgent = new FeedbackAgent(prisma);

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { feedbackId, resolution } = body;

    if (!feedbackId) {
      return NextResponse.json({ error: 'feedbackId required' }, { status: 400 });
    }

    const result = await feedbackAgent.execute('update_resolution', {
      feedbackId,
      resolution,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

// ============================================
// MIDDLEWARE: Auto-capture agent execution feedback
// Add to your agent orchestrator or create middleware
// ============================================

export async function captureAgentExecution(
  agentId: string,
  taskType: string,
  input: Record<string, unknown>,
  output: Record<string, unknown>,
  executionTimeMs: number,
  success: boolean,
  errorMessage?: string,
  organizationId?: string
) {
  const feedbackAgent = new FeedbackAgent(prisma);

  await feedbackAgent.execute('log_agent_execution', {
    agentId,
    taskType,
    input,
    output,
    executionTimeMs,
    success,
    errorMessage,
    organizationId,
  });
}

// ============================================
// NEXUS Orchestrator Integration
// Modify your orchestrator to capture feedback
// ============================================

/*
In your NexusOrchestrator.executeTask method, wrap execution like this:

async executeTask<T extends Record<string, unknown>>(
  taskId: string
): Promise<TaskResult<T>> {
  const task = await this.prisma.agentTask.findUnique({ where: { id: taskId } });
  
  const startTime = Date.now();
  let result: T;
  let success = true;
  let errorMessage: string | undefined;
  
  try {
    result = await this.routeTask(task);
  } catch (error) {
    success = false;
    errorMessage = (error as Error).message;
    throw error;
  } finally {
    const executionTime = Date.now() - startTime;
    
    // Auto-capture feedback
    await captureAgentExecution(
      task.agentType,
      task.taskType,
      task.input,
      result || {},
      executionTime,
      success,
      errorMessage,
      task.organizationId
    );
  }
  
  return { success: true, data: result };
}
*/
