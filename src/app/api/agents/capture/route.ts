/**
 * API Route: /api/agents/capture
 * CAPTURE Agent - Opportunity Scanner
 * 
 * Available tasks:
 * - scan_opportunities: Scan for new opportunities matching organization profile
 * - analyze_opportunity: Deep analysis of a specific opportunity
 * - bid_no_bid: Bid/No-Bid decision analysis
 * - get_pipeline: Get opportunity pipeline
 * - update_opportunity_status: Update opportunity status
 * - competitive_analysis: Competitive analysis for an opportunity
 * - match_capabilities: Match organizational capabilities to requirements
 * - forecast_pipeline: Forecast pipeline outcomes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCaptureAgent, agentTasks } from '@/lib/agents';

// GET: Get available tasks and agent info
export async function GET() {
  return NextResponse.json({
    agent: 'capture',
    name: 'CAPTURE - Opportunity Scanner',
    description: 'Federal and SLED contract opportunity discovery, bid/no-bid analysis, competitive intelligence, and pipeline management',
    availableTasks: agentTasks.capture,
    usage: {
      method: 'POST',
      body: {
        organizationId: 'required - Organization ID',
        taskType: 'required - One of the available tasks',
        '...input': 'Task-specific input parameters',
      },
    },
    taskParameters: {
      scan_opportunities: {
        setAsides: 'optional array: hubzone, hubzone_sole, 8a, sdvosb, etc.',
        naicsCodes: 'optional array of NAICS codes',
        minValue: 'optional minimum contract value',
        maxValue: 'optional maximum contract value',
        states: 'optional array of state codes',
        keywords: 'optional array of search keywords',
      },
      analyze_opportunity: { opportunityId: 'required' },
      bid_no_bid: { opportunityId: 'required' },
      get_pipeline: {},
      update_opportunity_status: { opportunityId: 'required', status: 'required' },
      competitive_analysis: { opportunityId: 'required' },
      match_capabilities: { requirements: 'array of requirement strings' },
      forecast_pipeline: {},
    },
  });
}

// POST: Execute a CAPTURE task
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
        { error: 'taskType is required', availableTasks: agentTasks.capture },
        { status: 400 }
      );
    }

    // Validate task type
    if (!agentTasks.capture.includes(taskType)) {
      return NextResponse.json(
        { error: `Invalid taskType. Available tasks: ${agentTasks.capture.join(', ')}` },
        { status: 400 }
      );
    }

    // Execute the task
    const capture = getCaptureAgent();
    const result = await capture.execute(taskType, input, organizationId);

    return NextResponse.json({
      success: true,
      agent: 'capture',
      taskType,
      organizationId,
      result,
    });
  } catch (error) {
    console.error('[CAPTURE API] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Task execution failed' 
      },
      { status: 500 }
    );
  }
}






