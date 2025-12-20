/**
 * CENTURION Agent API Route
 * 
 * Security compliance monitoring and enforcement
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CenturionAgent } from '@/agents/centurion';

const centurion = new CenturionAgent(prisma);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskType, input = {}, organizationId } = body;

    if (!taskType || !organizationId) {
      return NextResponse.json(
        { error: 'Missing required fields: taskType, organizationId' },
        { status: 400 }
      );
    }

    const result = await centurion.execute(taskType, input, organizationId);

    return NextResponse.json({
      success: true,
      agent: 'centurion',
      taskType,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[CENTURION API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Agent execution failed', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('orgId');
  const taskType = searchParams.get('task') || 'get_compliance_dashboard';

  if (!organizationId) {
    return NextResponse.json(
      { error: 'Missing required query parameter: orgId' },
      { status: 400 }
    );
  }

  try {
    const result = await centurion.execute(taskType, {}, organizationId);

    return NextResponse.json({
      success: true,
      agent: 'centurion',
      taskType,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[CENTURION API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Agent execution failed', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
