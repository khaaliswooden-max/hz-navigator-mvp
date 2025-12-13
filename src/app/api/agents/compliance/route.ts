/**
 * API Route: /api/agents/compliance
 * Trigger compliance calculations via SENTINEL agent
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getNexus } from '@/agents/nexus/orchestrator';

// GET: Fetch latest compliance snapshot
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      );
    }

    // Get latest snapshot
    const snapshot = await prisma.complianceSnapshot.findFirst({
      where: { organizationId },
      orderBy: { snapshotDate: 'desc' },
    });

    if (!snapshot) {
      return NextResponse.json(
        { error: 'No compliance data found. Run a compliance check first.' },
        { status: 404 }
      );
    }

    return NextResponse.json(snapshot);
  } catch (error) {
    console.error('Compliance GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch compliance data' },
      { status: 500 }
    );
  }
}

// POST: Trigger a new compliance calculation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId } = body;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      );
    }

    // Get NEXUS orchestrator and dispatch task to SENTINEL
    const nexus = getNexus(prisma);
    
    const result = await nexus.createTask({
      agentType: 'sentinel',
      taskType: 'calculate_compliance',
      input: {},
      organizationId,
      priority: 1,
    });

    return NextResponse.json({
      success: true,
      message: 'Compliance calculation completed',
      taskId: result.id,
      result: result.output,
    });
  } catch (error) {
    console.error('Compliance POST error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate compliance' },
      { status: 500 }
    );
  }
}
