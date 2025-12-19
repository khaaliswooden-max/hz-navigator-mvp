/**
 * API Route: /api/agents
 * NEXUS Orchestrator - Unified Agent API
 * 
 * This route provides:
 * 1. GET: List all available agents and their capabilities
 * 2. POST: Execute any agent task through the unified orchestrator
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeAgentTask, agentTasks, AgentType } from '@/lib/agents';

// GET: List all agents and their capabilities
export async function GET() {
  return NextResponse.json({
    name: 'HZ Navigator Agent Constellation',
    version: '1.0.0',
    description: 'AI-powered HUBZone compliance automation system',
    agents: [
      {
        id: 'sentinel',
        name: 'SENTINEL - Compliance Monitor',
        description: 'Continuous 35% residency compliance tracking, early warning system, and grace period management',
        endpoint: '/api/agents/sentinel',
        tasks: agentTasks.sentinel,
      },
      {
        id: 'cartograph',
        name: 'CARTOGRAPH - Geospatial Intelligence',
        description: 'HUBZone boundary verification, address geocoding, map change detection',
        endpoint: '/api/agents/cartograph',
        tasks: agentTasks.cartograph,
      },
      {
        id: 'workforce',
        name: 'WORKFORCE - Employee Intelligence',
        description: 'Employee lifecycle management, residency tracking, and hiring optimization',
        endpoint: '/api/agents/workforce',
        tasks: agentTasks.workforce,
      },
      {
        id: 'capture',
        name: 'CAPTURE - Opportunity Scanner',
        description: 'Federal contract opportunity discovery, bid/no-bid analysis, pipeline management',
        endpoint: '/api/agents/capture',
        tasks: agentTasks.capture,
      },
      {
        id: 'advocate',
        name: 'ADVOCATE - Regulatory Intelligence',
        description: 'HUBZone regulation monitoring, policy interpretation, compliance guidance',
        endpoint: '/api/agents/advocate',
        tasks: agentTasks.advocate,
      },
      {
        id: 'guardian',
        name: 'GUARDIAN - Audit Defense',
        description: 'Audit preparation, evidence collection, documentation management',
        endpoint: '/api/agents/guardian',
        tasks: agentTasks.guardian,
      },
      {
        id: 'oracle',
        name: 'ORACLE - Predictive Analytics',
        description: 'Compliance forecasting, risk prediction, workforce planning',
        endpoint: '/api/agents/oracle',
        tasks: agentTasks.oracle,
      },
      {
        id: 'diplomat',
        name: 'DIPLOMAT - Partnership Intelligence',
        description: 'Teaming partner discovery, synergy analysis, JV evaluation',
        endpoint: '/api/agents/diplomat',
        tasks: agentTasks.diplomat,
      },
      {
        id: 'archivist',
        name: 'ARCHIVIST - Document Intelligence',
        description: 'Document parsing, report generation, intelligent filing',
        endpoint: '/api/agents/archivist',
        tasks: agentTasks.archivist,
      },
    ],
    usage: {
      unified: {
        method: 'POST',
        endpoint: '/api/agents',
        body: {
          agentType: 'One of: sentinel, cartograph, workforce, capture, advocate, guardian, oracle, diplomat, archivist',
          organizationId: 'required - Organization ID',
          taskType: 'required - Task specific to the agent',
          '...input': 'Task-specific input parameters',
        },
      },
      direct: {
        method: 'POST',
        endpoint: '/api/agents/{agentType}',
        body: {
          organizationId: 'required - Organization ID',
          taskType: 'required - Task specific to the agent',
          '...input': 'Task-specific input parameters',
        },
      },
    },
  });
}

// POST: Execute any agent task through unified orchestrator
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentType, organizationId, taskType, ...input } = body;

    // Validate required fields
    if (!agentType) {
      return NextResponse.json(
        { 
          error: 'agentType is required',
          availableAgents: Object.keys(agentTasks),
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

    if (!taskType) {
      return NextResponse.json(
        { 
          error: 'taskType is required',
          availableTasks: agentTasks[agentType as AgentType] || [],
        },
        { status: 400 }
      );
    }

    // Validate agent type
    if (!(agentType in agentTasks)) {
      return NextResponse.json(
        { 
          error: `Invalid agentType: ${agentType}`,
          availableAgents: Object.keys(agentTasks),
        },
        { status: 400 }
      );
    }

    // Validate task type
    const validTasks = agentTasks[agentType as AgentType];
    if (!validTasks.includes(taskType)) {
      return NextResponse.json(
        { 
          error: `Invalid taskType for ${agentType}: ${taskType}`,
          availableTasks: validTasks,
        },
        { status: 400 }
      );
    }

    // Execute the task
    const result = await executeAgentTask(
      agentType as AgentType,
      taskType,
      input,
      organizationId
    );

    return NextResponse.json({
      success: true,
      agent: agentType,
      taskType,
      organizationId,
      result,
    });
  } catch (error) {
    console.error('[NEXUS API] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Task execution failed' 
      },
      { status: 500 }
    );
  }
}
