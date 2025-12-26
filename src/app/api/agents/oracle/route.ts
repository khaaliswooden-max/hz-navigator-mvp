/**
 * API Route: /api/agents/oracle
 * ORACLE Agent - Predictive Analytics
 * 
 * Available tasks:
 * - forecast_compliance: Forecast compliance for upcoming months
 * - predict_churn_risk: Predict employee churn risk
 * - analyze_trends: Analyze compliance and workforce trends
 * - workforce_planning: Workforce planning with scenario analysis
 * - risk_assessment: Comprehensive risk assessment
 * - scenario_analysis: Analyze multiple hiring/termination scenarios
 * - get_insights: Get comprehensive insights combining all analyses
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOracleAgent, agentTasks } from '@/lib/agents';

// GET: Get available tasks and agent info
export async function GET() {
  return NextResponse.json({
    agent: 'oracle',
    name: 'ORACLE - Predictive Analytics',
    description: 'Compliance forecasting, workforce planning, risk prediction, and trend analysis using ML models',
    availableTasks: agentTasks.oracle,
    usage: {
      method: 'POST',
      body: {
        organizationId: 'required - Organization ID',
        taskType: 'required - One of the available tasks',
        '...input': 'Task-specific input parameters',
      },
    },
    taskParameters: {
      forecast_compliance: { months: 'optional number, default 6' },
      predict_churn_risk: {},
      analyze_trends: {},
      workforce_planning: {
        targetPercentage: 'optional, default 45',
        plannedHires: 'optional number',
        plannedTerminations: 'optional number',
      },
      risk_assessment: {},
      scenario_analysis: { scenarios: 'optional array of scenario objects' },
      get_insights: {},
    },
  });
}

// POST: Execute an ORACLE task
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
        { error: 'taskType is required', availableTasks: agentTasks.oracle },
        { status: 400 }
      );
    }

    // Validate task type
    if (!agentTasks.oracle.includes(taskType)) {
      return NextResponse.json(
        { error: `Invalid taskType. Available tasks: ${agentTasks.oracle.join(', ')}` },
        { status: 400 }
      );
    }

    // Execute the task
    const oracle = getOracleAgent();
    const result = await oracle.execute(taskType, input, organizationId);

    return NextResponse.json({
      success: true,
      agent: 'oracle',
      taskType,
      organizationId,
      result,
    });
  } catch (error) {
    console.error('[ORACLE API] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Task execution failed' 
      },
      { status: 500 }
    );
  }
}






