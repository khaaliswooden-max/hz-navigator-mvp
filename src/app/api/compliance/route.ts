import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/compliance
 * Returns compliance status for an organization
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const orgId = searchParams.get('orgId');

  if (!orgId) {
    return NextResponse.json(
      { error: 'Organization ID required', success: false },
      { status: 400 }
    );
  }

  // Check if we have a valid database connection
  const hasDatabase = process.env.DATABASE_URL && 
    process.env.DATABASE_URL.startsWith('postgresql://');

  if (!hasDatabase) {
    // Return demo compliance data
    return NextResponse.json({
      success: true,
      organizationId: orgId,
      compliance: {
        percentage: 62.5,
        status: 'compliant',
        threshold: 35,
        surplus: 27.5,
        lastCalculated: new Date().toISOString(),
      },
      employees: {
        total: 8,
        hubzoneResidents: 5,
        nonHubzoneResidents: 3,
      },
      alerts: [],
    });
  }

  try {
    const { default: prisma } = await import('@/lib/prisma');
    
    // Get organization with employees
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        employees: {
          where: { isActive: true },
        },
      },
    });

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found', success: false },
        { status: 404 }
      );
    }

    const totalEmployees = org.employees.length;
    const hubzoneResidents = org.employees.filter((e) => e.isHubzoneResident).length;
    const percentage = totalEmployees > 0 
      ? (hubzoneResidents / totalEmployees) * 100 
      : 0;

    // Determine compliance status
    let status: 'compliant' | 'at_risk' | 'non_compliant';
    if (percentage >= 40) {
      status = 'compliant';
    } else if (percentage >= 35) {
      status = 'at_risk';
    } else {
      status = 'non_compliant';
    }

    // Generate alerts
    const alerts: Array<{ type: string; severity: string; message: string }> = [];
    
    if (percentage < 35) {
      alerts.push({
        type: 'compliance_below_threshold',
        severity: 'critical',
        message: `Compliance at ${percentage.toFixed(1)}% is below the 35% threshold`,
      });
    } else if (percentage < 40) {
      alerts.push({
        type: 'thin_compliance_buffer',
        severity: 'warning',
        message: `Compliance buffer is thin at ${(percentage - 35).toFixed(1)}%`,
      });
    }

    return NextResponse.json({
      success: true,
      organizationId: orgId,
      compliance: {
        percentage,
        status,
        threshold: 35,
        surplus: percentage - 35,
        lastCalculated: new Date().toISOString(),
      },
      employees: {
        total: totalEmployees,
        hubzoneResidents,
        nonHubzoneResidents: totalEmployees - hubzoneResidents,
      },
      alerts,
    });
  } catch (error) {
    console.error('Error fetching compliance:', error);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}

/**
 * POST /api/compliance
 * Trigger a compliance recalculation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId } = body;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID required', success: false },
        { status: 400 }
      );
    }

    // Check if we have a valid database connection
    const hasDatabase = process.env.DATABASE_URL && 
      process.env.DATABASE_URL.startsWith('postgresql://');

    if (!hasDatabase) {
      return NextResponse.json({
        success: true,
        message: 'Compliance recalculated (demo mode)',
        organizationId,
        newPercentage: 62.5,
        status: 'compliant',
      });
    }

    const { default: prisma } = await import('@/lib/prisma');
    
    // Get organization with employees
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        employees: {
          where: { isActive: true },
        },
      },
    });

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found', success: false },
        { status: 404 }
      );
    }

    const totalEmployees = org.employees.length;
    const hubzoneResidents = org.employees.filter((e) => e.isHubzoneResident).length;
    const percentage = totalEmployees > 0 
      ? (hubzoneResidents / totalEmployees) * 100 
      : 0;

    // Determine status
    let status: 'compliant' | 'at_risk' | 'non_compliant';
    if (percentage >= 40) {
      status = 'compliant';
    } else if (percentage >= 35) {
      status = 'at_risk';
    } else {
      status = 'non_compliant';
    }

    // Create a compliance snapshot
    await prisma.complianceSnapshot.create({
      data: {
        organizationId,
        totalEmployees,
        hubzoneEmployees: hubzoneResidents,
        compliancePercentage: percentage,
        complianceStatus: status,
        legacyEmployeeCount: org.employees.filter(e => e.isLegacyEmployee).length,
        riskScore: percentage < 35 ? 75 : percentage < 40 ? 30 : 10,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Compliance recalculated successfully',
      organizationId,
      newPercentage: percentage,
      status,
      snapshotCreated: true,
    });
  } catch (error) {
    console.error('Error recalculating compliance:', error);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}
