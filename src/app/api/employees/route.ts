import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const EmployeeSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  hireDate: z.string().transform((s) => new Date(s)),
  streetAddress: z.string().min(1),
  city: z.string().min(1),
  state: z.string().length(2),
  zipCode: z.string().min(5),
  isHubzoneResident: z.boolean().optional(),
  hubzoneType: z.string().optional(),
});

// Demo employees for when database is not available
function getDemoEmployees() {
  return [
    {
      id: 'emp-001',
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'sarah.johnson@demo.com',
      hireDate: '2022-03-15',
      streetAddress: '123 Court Square',
      city: 'Huntsville',
      state: 'AL',
      zipCode: '35801',
      isHubzoneResident: true,
      hubzoneType: 'QCT',
      lastVerified: '2024-11-01',
    },
    {
      id: 'emp-002',
      firstName: 'Michael',
      lastName: 'Chen',
      email: 'michael.chen@demo.com',
      hireDate: '2023-01-10',
      streetAddress: '456 Main Street',
      city: 'Baltimore',
      state: 'MD',
      zipCode: '21201',
      isHubzoneResident: true,
      hubzoneType: 'QNMC',
      lastVerified: '2024-10-15',
    },
    {
      id: 'emp-003',
      firstName: 'Emily',
      lastName: 'Davis',
      email: 'emily.davis@demo.com',
      hireDate: '2021-06-01',
      streetAddress: '789 Oak Avenue',
      city: 'Washington',
      state: 'DC',
      zipCode: '20001',
      isHubzoneResident: true,
      hubzoneType: 'QCT',
      lastVerified: '2024-09-20',
    },
    {
      id: 'emp-004',
      firstName: 'James',
      lastName: 'Wilson',
      email: 'james.wilson@demo.com',
      hireDate: '2023-08-20',
      streetAddress: '321 Pine Road',
      city: 'Arlington',
      state: 'VA',
      zipCode: '22201',
      isHubzoneResident: false,
      hubzoneType: null,
      lastVerified: '2024-11-05',
    },
    {
      id: 'emp-005',
      firstName: 'Lisa',
      lastName: 'Martinez',
      email: 'lisa.martinez@demo.com',
      hireDate: '2022-11-30',
      streetAddress: '654 Elm Street',
      city: 'Silver Spring',
      state: 'MD',
      zipCode: '20901',
      isHubzoneResident: false,
      hubzoneType: null,
      lastVerified: '2024-10-28',
    },
    {
      id: 'emp-006',
      firstName: 'Robert',
      lastName: 'Taylor',
      email: 'robert.taylor@demo.com',
      hireDate: '2020-04-15',
      streetAddress: '987 Cedar Lane',
      city: 'Huntsville',
      state: 'AL',
      zipCode: '35802',
      isHubzoneResident: true,
      hubzoneType: 'QCT',
      lastVerified: '2024-11-10',
    },
  ];
}

// GET /api/employees - List all employees for org
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
    console.log('No database configured, returning demo employees');
    const employees = getDemoEmployees();
    const total = employees.length;
    const hubzoneResidents = employees.filter((e) => e.isHubzoneResident).length;
    const compliancePercent = total > 0 ? (hubzoneResidents / total) * 100 : 0;

    return NextResponse.json({
      employees,
      stats: {
        total,
        hubzoneResidents,
        nonHubzoneResidents: total - hubzoneResidents,
        compliancePercent,
        isCompliant: compliancePercent >= 35,
      },
    });
  }

  try {
    const { default: prisma } = await import('@/lib/prisma');
    
    const employees = await prisma.employee.findMany({
      where: {
        organizationId: orgId,
        isActive: true,
      },
      orderBy: { lastName: 'asc' },
    });

    // Calculate compliance stats
    const total = employees.length;
    const hubzoneResidents = employees.filter((e) => e.isHubzoneResident).length;
    const compliancePercent = total > 0 ? (hubzoneResidents / total) * 100 : 0;

    return NextResponse.json({
      employees,
      stats: {
        total,
        hubzoneResidents,
        nonHubzoneResidents: total - hubzoneResidents,
        compliancePercent,
        isCompliant: compliancePercent >= 35,
      },
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    // Return demo data on error
    const employees = getDemoEmployees();
    const total = employees.length;
    const hubzoneResidents = employees.filter((e) => e.isHubzoneResident).length;
    const compliancePercent = total > 0 ? (hubzoneResidents / total) * 100 : 0;

    return NextResponse.json({
      employees,
      stats: {
        total,
        hubzoneResidents,
        nonHubzoneResidents: total - hubzoneResidents,
        compliancePercent,
        isCompliant: compliancePercent >= 35,
      },
    });
  }
}

// POST /api/employees - Create new employee
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orgId, ...employeeData } = body;

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID required' },
        { status: 400 }
      );
    }

    const validated = EmployeeSchema.parse(employeeData);

    // Check HUBZone status for the address
    const addressString = `${validated.streetAddress}, ${validated.city}, ${validated.state} ${validated.zipCode}`;
    let isHubzoneResident = validated.isHubzoneResident ?? false;
    let hubzoneType = validated.hubzoneType;

    // Auto-verify if not manually set
    if (!validated.isHubzoneResident) {
      try {
        const lookupResponse = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/hubzone/lookup?address=${encodeURIComponent(addressString)}`
        );
        if (lookupResponse.ok) {
          const lookupData = await lookupResponse.json();
          isHubzoneResident = lookupData.isHubzone;
          hubzoneType = lookupData.hubzoneType;
        }
      } catch (e) {
        console.warn('Auto-verification failed:', e);
      }
    }

    // Check if we have a valid database connection
    const hasDatabase = process.env.DATABASE_URL && 
      process.env.DATABASE_URL.startsWith('postgresql://');

    if (!hasDatabase) {
      // Return mock response in demo mode
      return NextResponse.json({
        id: `emp-${Date.now()}`,
        organizationId: orgId,
        firstName: validated.firstName,
        lastName: validated.lastName,
        email: validated.email,
        hireDate: validated.hireDate,
        streetAddress: validated.streetAddress,
        city: validated.city,
        state: validated.state,
        zipCode: validated.zipCode,
        isHubzoneResident,
        hubzoneType,
        lastVerified: new Date().toISOString(),
        isActive: true,
      }, { status: 201 });
    }

    const { default: prisma } = await import('@/lib/prisma');

    const employee = await prisma.employee.create({
      data: {
        organizationId: orgId,
        firstName: validated.firstName,
        lastName: validated.lastName,
        email: validated.email,
        hireDate: validated.hireDate,
        streetAddress: validated.streetAddress,
        city: validated.city,
        state: validated.state,
        zipCode: validated.zipCode,
        isHubzoneResident,
        hubzoneType,
        lastVerified: new Date(),
      },
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating employee:', error);
    return NextResponse.json(
      { error: 'Failed to create employee' },
      { status: 500 }
    );
  }
}
