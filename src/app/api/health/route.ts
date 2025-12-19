/**
 * Health Check API Endpoint
 * 
 * Returns server health status including database connectivity.
 * Used by the health-check-runner for Phase 3 validation.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const startTime = Date.now();
  
  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1 as health_check`;
    
    // Get basic stats
    const [orgCount, employeeCount, taskCount] = await Promise.all([
      prisma.organization.count(),
      prisma.employee.count(),
      prisma.agentTask.count(),
    ]);

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTimeMs: responseTime,
      database: {
        connected: true,
        organizations: orgCount,
        employees: employeeCount,
        tasks: taskCount,
      },
      version: process.env.npm_package_version || '1.0.0',
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTimeMs: responseTime,
        database: {
          connected: false,
          error: errorMessage,
        },
      },
      { status: 503 }
    );
  }
}
