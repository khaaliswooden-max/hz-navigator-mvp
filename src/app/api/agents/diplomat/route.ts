/**
 * API Route: /api/agents/diplomat
 * DIPLOMAT Agent - Partnership Intelligence
 * 
 * Available tasks:
 * - discover_partners: Discover potential teaming partners
 * - analyze_synergy: Analyze synergy with a specific partner
 * - evaluate_jv: Evaluate joint venture viability
 * - get_partner_portfolio: Get current partner portfolio
 * - add_partner: Add a new partner to portfolio
 * - find_complementary_certs: Find complementary certifications
 * - prepare_teaming_brief: Prepare teaming brief for partnership
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDiplomatAgent, agentTasks } from '@/lib/agents';

// GET: Get available tasks and agent info
export async function GET() {
  return NextResponse.json({
    agent: 'diplomat',
    name: 'DIPLOMAT - Partnership Intelligence',
    description: 'Teaming partner discovery, synergy analysis, JV evaluation, and partnership management for federal contracting',
    availableTasks: agentTasks.diplomat,
    usage: {
      method: 'POST',
      body: {
        organizationId: 'required - Organization ID',
        taskType: 'required - One of the available tasks',
        '...input': 'Task-specific input parameters',
      },
    },
    taskParameters: {
      discover_partners: {
        certifications: 'optional array: 8a, SDVOSB, WOSB, etc.',
        capabilities: 'optional array of capability areas',
        naicsCodes: 'optional array of NAICS codes',
      },
      analyze_synergy: { partnerId: 'required' },
      evaluate_jv: { partnerId: 'optional', structure: 'optional' },
      get_partner_portfolio: {},
      add_partner: {
        name: 'required',
        cageCode: 'optional',
        uei: 'optional',
        certifications: 'optional array',
        capabilities: 'optional array',
      },
      find_complementary_certs: {},
      prepare_teaming_brief: { partnerId: 'optional', opportunityId: 'optional' },
    },
  });
}

// POST: Execute a DIPLOMAT task
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
        { error: 'taskType is required', availableTasks: agentTasks.diplomat },
        { status: 400 }
      );
    }

    // Validate task type
    if (!agentTasks.diplomat.includes(taskType)) {
      return NextResponse.json(
        { error: `Invalid taskType. Available tasks: ${agentTasks.diplomat.join(', ')}` },
        { status: 400 }
      );
    }

    // Execute the task
    const diplomat = getDiplomatAgent();
    const result = await diplomat.execute(taskType, input, organizationId);

    return NextResponse.json({
      success: true,
      agent: 'diplomat',
      taskType,
      organizationId,
      result,
    });
  } catch (error) {
    console.error('[DIPLOMAT API] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Task execution failed' 
      },
      { status: 500 }
    );
  }
}


