/**
 * API Route: /api/agents/sentinel
 * SENTINEL Agent - Compliance Monitoring & Early Warning
 * 
 * Available tasks:
 * - calculate_compliance: Calculate current compliance status
 * - check_employee_status: Check individual employee HUBZone status
 * - generate_alerts: Generate compliance alerts
 * - get_compliance_history: Get compliance history for trend analysis
 * - simulate_hire: Simulate impact of a new hire
 * - simulate_termination: Simulate impact of a termination
 * - check_grace_period: Check grace period eligibility and status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSentinelAgent, agentTasks } from '@/lib/agents';

// GET: Get available tasks and agent info
export async function GET() {
  return NextResponse.json({
    agent: 'sentinel',
    name: 'SENTINEL - Compliance Monitor',
    description: 'Continuous 35% residency compliance tracking, early warning system, and grace period management',
    availableTasks: agentTasks.sentinel,
    usage: {
      method: 'POST',
      body: {
        organizationId: 'required - Organization ID',
        taskType: 'required - One of the available tasks',
        '...input': 'Task-specific input parameters',
      },
    },
  });
}

// POST: Execute a SENTINEL task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, taskType, ...input } = body;

    // Validate required fields
    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      );
    }

    if (!taskType) {
      return NextResponse.json(
        { error: 'taskType is required', availableTasks: agentTasks.sentinel },
        { status: 400 }
      );
    }

    // Validate task type
    if (!agentTasks.sentinel.includes(taskType)) {
      return NextResponse.json(
        { error: `Invalid taskType. Available tasks: ${agentTasks.sentinel.join(', ')}` },
        { status: 400 }
      );
    }

    // Execute the task
    const sentinel = getSentinelAgent();
    const result = await sentinel.execute(taskType, input, organizationId);

    return NextResponse.json({
      success: true,
      agent: 'sentinel',
      taskType,
      organizationId,
      result,
    });
  } catch (error) {
    console.error('[SENTINEL API] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Task execution failed' 
      },
      { status: 500 }
    );
  }
}






