/**
 * API Route: /api/agents/guardian
 * GUARDIAN Agent - Audit Defense
 * 
 * Available tasks:
 * - assess_audit_readiness: Assess overall audit readiness
 * - generate_evidence_package: Generate comprehensive evidence package for audit
 * - get_compliance_history: Get detailed compliance history
 * - document_attempt_to_maintain: Document an "attempt to maintain" action
 * - get_documentation_gaps: Identify documentation gaps
 * - prepare_audit_response: Prepare response for specific audit type
 * - log_compliance_event: Log a compliance event
 * - get_audit_trail: Get complete audit trail
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGuardianAgent, agentTasks } from '@/lib/agents';

// GET: Get available tasks and agent info
export async function GET() {
  return NextResponse.json({
    agent: 'guardian',
    name: 'GUARDIAN - Audit Defense',
    description: 'Audit preparation, evidence collection, documentation management, and compliance history tracking for SBA reviews',
    availableTasks: agentTasks.guardian,
    usage: {
      method: 'POST',
      body: {
        organizationId: 'required - Organization ID',
        taskType: 'required - One of the available tasks',
        '...input': 'Task-specific input parameters',
      },
    },
    taskParameters: {
      assess_audit_readiness: {},
      generate_evidence_package: { startDate: 'ISO date string', endDate: 'ISO date string' },
      get_compliance_history: { months: 'optional number, default 12' },
      document_attempt_to_maintain: {
        action: 'hiring_effort | relocation_assistance | job_posting | partnership',
        description: 'Description of the action taken',
        evidence: 'Supporting evidence',
      },
      get_documentation_gaps: {},
      prepare_audit_response: { auditType: 'sba_review | recertification | protest' },
      log_compliance_event: { eventType: 'string', details: 'object' },
      get_audit_trail: {},
    },
  });
}

// POST: Execute a GUARDIAN task
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
        { error: 'taskType is required', availableTasks: agentTasks.guardian },
        { status: 400 }
      );
    }

    // Validate task type
    if (!agentTasks.guardian.includes(taskType)) {
      return NextResponse.json(
        { error: `Invalid taskType. Available tasks: ${agentTasks.guardian.join(', ')}` },
        { status: 400 }
      );
    }

    // Execute the task
    const guardian = getGuardianAgent();
    const result = await guardian.execute(taskType, input, organizationId);

    return NextResponse.json({
      success: true,
      agent: 'guardian',
      taskType,
      organizationId,
      result,
    });
  } catch (error) {
    console.error('[GUARDIAN API] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Task execution failed' 
      },
      { status: 500 }
    );
  }
}



