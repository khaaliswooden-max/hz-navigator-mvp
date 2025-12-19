/**
 * Universal Agent API Route
 * 
 * Route: /api/agents/[agent]
 * 
 * Handles requests for all 10 HZ Navigator agents:
 * - sentinel, cartograph, workforce, capture, advocate
 * - guardian, diplomat, oracle, archivist
 * 
 * Usage: POST /api/agents/sentinel { taskType: 'calculate_compliance', organizationId: '...' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeAgentTask, agentTasks, type AgentTypeLocal } from '@/lib/agents';

// Valid agent types
const validAgents = [
  'sentinel',
  'cartograph', 
  'workforce',
  'capture',
  'advocate',
  'guardian',
  'diplomat',
  'oracle',
  'archivist',
] as const;

type AgentParam = typeof validAgents[number];

function isValidAgent(agent: string): agent is AgentParam {
  return validAgents.includes(agent as AgentParam);
}

// GET: Get available tasks for an agent
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agent: string }> }
) {
  try {
    const { agent } = await params;

    if (!isValidAgent(agent)) {
      return NextResponse.json(
        { 
          error: `Invalid agent: ${agent}`,
          validAgents,
        },
        { status: 400 }
      );
    }

    const tasks = agentTasks[agent as AgentTypeLocal];

    return NextResponse.json({
      agent,
      availableTasks: tasks,
      description: getAgentDescription(agent),
    });
  } catch (error) {
    console.error('Agent GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get agent info' },
      { status: 500 }
    );
  }
}

// POST: Execute an agent task
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agent: string }> }
) {
  try {
    const { agent } = await params;
    const body = await request.json();
    const { taskType, organizationId, ...input } = body;

    // Validate agent
    if (!isValidAgent(agent)) {
      return NextResponse.json(
        { 
          error: `Invalid agent: ${agent}`,
          validAgents,
        },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!taskType) {
      return NextResponse.json(
        { 
          error: 'taskType is required',
          availableTasks: agentTasks[agent as AgentTypeLocal],
        },
        { status: 400 }
      );
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      );
    }

    // Validate task type
    const validTasks = agentTasks[agent as AgentTypeLocal];
    if (!validTasks.includes(taskType)) {
      return NextResponse.json(
        {
          error: `Invalid taskType: ${taskType}`,
          availableTasks: validTasks,
        },
        { status: 400 }
      );
    }

    // Execute the task
    const startTime = Date.now();
    const result = await executeAgentTask(
      agent as AgentTypeLocal,
      taskType,
      input,
      organizationId
    );
    const executionTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      agent,
      taskType,
      organizationId,
      executionTimeMs: executionTime,
      result,
    });
  } catch (error) {
    console.error('Agent POST error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Task execution failed',
        agent: (await params).agent,
      },
      { status: 500 }
    );
  }
}

/**
 * Get agent description for documentation
 */
function getAgentDescription(agent: string): string {
  const descriptions: Record<string, string> = {
    sentinel: 'Compliance Monitor - 35% tracking, alerts, grace period management',
    cartograph: 'Geospatial Intelligence - Address verification, HUBZone boundaries',
    workforce: 'Employee Intelligence - Roster management, hire/term impact',
    capture: 'Opportunity Scanner - SAM.gov scanning, bid/no-bid analysis',
    advocate: 'Regulatory Intelligence - Policy monitoring, compliance guidance',
    guardian: 'Audit Defense - Evidence packages, audit preparation',
    diplomat: 'Partnership Intelligence - Teaming analysis, JV evaluation',
    oracle: 'Predictive Analytics - Forecasting, risk prediction',
    archivist: 'Document Intelligence - Report generation, document parsing',
  };
  return descriptions[agent] || 'Unknown agent';
}
