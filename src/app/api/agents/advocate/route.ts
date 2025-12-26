/**
 * API Route: /api/agents/advocate
 * ADVOCATE Agent - Regulatory Intelligence
 * 
 * Available tasks:
 * - scan_regulatory_updates: Scan for regulatory updates
 * - get_compliance_guidance: Get compliance guidance on a topic
 * - interpret_regulation: Interpret a specific regulation
 * - check_policy_impact: Check policy impact for an organization
 * - get_key_dates: Get key regulatory dates
 * - explain_35_percent_rule: Explain 35% rule in detail
 * - explain_legacy_employees: Explain legacy employee rules
 * - explain_grace_period: Explain grace period rules
 * - get_certification_requirements: Get certification requirements
 * - get_recertification_guidance: Get recertification guidance
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdvocateAgent, agentTasks } from '@/lib/agents';

// GET: Get available tasks and agent info
export async function GET() {
  return NextResponse.json({
    agent: 'advocate',
    name: 'ADVOCATE - Regulatory Intelligence',
    description: 'HUBZone regulation monitoring, policy change detection, compliance guidance, and regulatory interpretation',
    availableTasks: agentTasks.advocate,
    usage: {
      method: 'POST',
      body: {
        organizationId: 'required - Organization ID',
        taskType: 'required - One of the available tasks',
        '...input': 'Task-specific input parameters',
      },
    },
    taskParameters: {
      scan_regulatory_updates: {},
      get_compliance_guidance: { topic: '35_percent | legacy_employees | grace_period | recertification' },
      interpret_regulation: { citation: 'e.g., 126.200 or 13 CFR § 126.200', question: 'Your question' },
      check_policy_impact: {},
      get_key_dates: {},
      explain_35_percent_rule: {},
      explain_legacy_employees: {},
      explain_grace_period: {},
      get_certification_requirements: {},
      get_recertification_guidance: {},
    },
  });
}

// POST: Execute an ADVOCATE task
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
        { error: 'taskType is required', availableTasks: agentTasks.advocate },
        { status: 400 }
      );
    }

    // Validate task type
    if (!agentTasks.advocate.includes(taskType)) {
      return NextResponse.json(
        { error: `Invalid taskType. Available tasks: ${agentTasks.advocate.join(', ')}` },
        { status: 400 }
      );
    }

    // Execute the task
    const advocate = getAdvocateAgent();
    const result = await advocate.execute(taskType, input, organizationId);

    return NextResponse.json({
      success: true,
      agent: 'advocate',
      taskType,
      organizationId,
      result,
    });
  } catch (error) {
    console.error('[ADVOCATE API] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Task execution failed' 
      },
      { status: 500 }
    );
  }
}






