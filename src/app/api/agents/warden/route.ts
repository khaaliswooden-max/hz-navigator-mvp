/**
 * WARDEN Agent API Route
 * 
 * FCL (Facility Clearance) management and readiness
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { WardenAgent } from '@/agents/warden';

const warden = new WardenAgent(prisma);

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

    const result = await warden.execute(taskType, input, organizationId);

    return NextResponse.json({
      success: true,
      agent: 'warden',
      taskType,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[WARDEN API] Error:', error);
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
  const taskType = searchParams.get('task') || 'assess_fcl_readiness';
  const targetLevel = searchParams.get('level') || 'secret';

  if (!organizationId) {
    return NextResponse.json(
      { error: 'Missing required query parameter: orgId' },
      { status: 400 }
    );
  }

  try {
    const result = await warden.execute(taskType, { targetLevel }, organizationId);

    return NextResponse.json({
      success: true,
      agent: 'warden',
      taskType,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[WARDEN API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Agent execution failed', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
