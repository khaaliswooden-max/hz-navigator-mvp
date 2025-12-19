/**
 * API Route: /api/agents/workforce
 * WORKFORCE Agent - Employee Intelligence
 * 
 * Available tasks:
 * - get_roster: Get full employee roster
 * - add_employee: Add new employee
 * - update_employee: Update employee record
 * - terminate_employee: Terminate employee
 * - get_hiring_recommendations: Get hiring recommendations to maintain/improve compliance
 * - analyze_workforce: Analyze workforce composition
 * - check_residency_requirements: Check 90-day residency requirements
 * - get_legacy_employees: Get legacy employees
 * - promote_to_legacy: Promote employee to legacy status
 * - get_at_risk_employees: Get employees at risk due to redesignation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWorkforceAgent, agentTasks } from '@/lib/agents';

// GET: Get available tasks and agent info
export async function GET() {
  return NextResponse.json({
    agent: 'workforce',
    name: 'WORKFORCE - Employee Intelligence',
    description: 'Employee lifecycle management, residency tracking, and hiring optimization',
    availableTasks: agentTasks.workforce,
    usage: {
      method: 'POST',
      body: {
        organizationId: 'required - Organization ID',
        taskType: 'required - One of the available tasks',
        '...input': 'Task-specific input parameters',
      },
    },
    taskParameters: {
      get_roster: {},
      add_employee: {
        firstName: 'required',
        lastName: 'required',
        streetAddress: 'required',
        city: 'required',
        state: 'required',
        zipCode: 'required',
        email: 'optional',
        hireDate: 'optional (defaults to now)',
        isHubzoneResident: 'optional boolean',
        hubzoneType: 'optional',
      },
      update_employee: { employeeId: 'required', updates: 'object with fields to update' },
      terminate_employee: { employeeId: 'required', reason: 'required' },
      get_hiring_recommendations: {},
      analyze_workforce: {},
      check_residency_requirements: {},
      get_legacy_employees: {},
      promote_to_legacy: { employeeId: 'required' },
      get_at_risk_employees: {},
    },
  });
}

// POST: Execute a WORKFORCE task
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
        { error: 'taskType is required', availableTasks: agentTasks.workforce },
        { status: 400 }
      );
    }

    // Validate task type
    if (!agentTasks.workforce.includes(taskType)) {
      return NextResponse.json(
        { error: `Invalid taskType. Available tasks: ${agentTasks.workforce.join(', ')}` },
        { status: 400 }
      );
    }

    // Execute the task
    const workforce = getWorkforceAgent();
    const result = await workforce.execute(taskType, input, organizationId);

    return NextResponse.json({
      success: true,
      agent: 'workforce',
      taskType,
      organizationId,
      result,
    });
  } catch (error) {
    console.error('[WORKFORCE API] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Task execution failed' 
      },
      { status: 500 }
    );
  }
}
