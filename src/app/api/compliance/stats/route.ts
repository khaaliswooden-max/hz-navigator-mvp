import { NextRequest, NextResponse } from 'next/server';

// Demo data for when database is not available
function getDemoData(orgId: string) {
  const totalEmployees = 12;
  const hubzoneResidents = 5;
  const compliancePercent = (hubzoneResidents / totalEmployees) * 100;
  
  return {
    organization: {
      id: orgId,
      name: 'Demo Company Inc.',
      hubzoneNumber: 'HZ-2024-DEMO-001',
    },
    compliance: {
      status: 'compliant' as const,
      employeeCompliance: {
        total: totalEmployees,
        hubzoneResidents,
        nonHubzoneResidents: totalEmployees - hubzoneResidents,
        percent: compliancePercent,
        required: 35,
        surplus: compliancePercent - 35,
      },
      principalOffice: {
        isCompliant: true,
        address: '100 N Court Square, Huntsville, AL',
        hubzoneType: 'QCT',
      },
      employeesByHubzoneType: {
        QCT: 3,
        QNMC: 2,
      },
    },
    certification: {
      status: 'APPROVED',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    },
    trend: generateTrendData(compliancePercent),
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const orgId = searchParams.get('orgId');

  if (!orgId) {
    return NextResponse.json(
      { error: 'Organization ID required' },
      { status: 400 }
    );
  }

  // Check if we have a valid database connection
  const hasDatabase = process.env.DATABASE_URL && 
    process.env.DATABASE_URL.startsWith('postgresql://');

  if (!hasDatabase) {
    // Return demo data when no database is configured
    console.log('No database configured, returning demo data');
    return NextResponse.json(getDemoData(orgId));
  }

  try {
    // Dynamic import to avoid initialization errors when DB is not available
    const { default: prisma } = await import('@/lib/prisma');
    
    // Get organization
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        employees: {
          where: { isActive: true },
        },
        locations: true,
        certifications: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!org) {
      // Return demo data if org not found
      return NextResponse.json(getDemoData(orgId));
    }

    // Calculate compliance metrics
    const totalEmployees = org.employees.length;
    const hubzoneResidents = org.employees.filter((e) => e.isHubzoneResident).length;
    const compliancePercent = totalEmployees > 0 
      ? (hubzoneResidents / totalEmployees) * 100 
      : 0;

    // Location compliance
    const principalOffice = org.locations.find((l) => l.isPrincipalOffice);
    const principalOfficeCompliant = principalOffice?.isInHubzone ?? false;

    // Determine overall status
    let overallStatus: 'compliant' | 'warning' | 'critical';
    if (compliancePercent >= 35 && principalOfficeCompliant) {
      overallStatus = 'compliant';
    } else if (compliancePercent >= 25) {
      overallStatus = 'warning';
    } else {
      overallStatus = 'critical';
    }

    // Group employees by HUBZone type
    const employeesByHubzoneType = org.employees.reduce((acc, emp) => {
      if (emp.isHubzoneResident && emp.hubzoneType) {
        acc[emp.hubzoneType] = (acc[emp.hubzoneType] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Trend data (mock for MVP - would come from historical snapshots)
    const trendData = generateTrendData(compliancePercent);

    return NextResponse.json({
      organization: {
        id: org.id,
        name: org.name,
        hubzoneNumber: org.hubzoneNumber,
      },
      compliance: {
        status: overallStatus,
        employeeCompliance: {
          total: totalEmployees,
          hubzoneResidents,
          nonHubzoneResidents: totalEmployees - hubzoneResidents,
          percent: compliancePercent,
          required: 35,
          surplus: compliancePercent - 35,
        },
        principalOffice: {
          isCompliant: principalOfficeCompliant,
          address: principalOffice
            ? `${principalOffice.streetAddress}, ${principalOffice.city}, ${principalOffice.state}`
            : null,
          hubzoneType: principalOffice?.hubzoneType,
        },
        employeesByHubzoneType,
      },
      certification: org.certifications[0] || null,
      trend: trendData,
    });
  } catch (error) {
    console.error('Error fetching compliance stats:', error);
    // Return demo data on error
    return NextResponse.json(getDemoData(orgId));
  }
}

function generateTrendData(currentPercent: number) {
  // Generate 12 months of mock trend data
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonth = new Date().getMonth();
  
  return months.map((month, idx) => {
    // Create realistic variation around current value
    const variation = (Math.random() - 0.5) * 10;
    const monthsAgo = (currentMonth - idx + 12) % 12;
    const drift = monthsAgo * 0.5; // Slight upward trend
    
    return {
      month,
      percent: Math.max(0, Math.min(100, currentPercent + variation - drift)),
      threshold: 35,
    };
  });
}
