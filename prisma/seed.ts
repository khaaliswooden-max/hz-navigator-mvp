import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo organization
  const org = await prisma.organization.upsert({
    where: { id: 'demo-org-001' },
    update: {},
    create: {
      id: 'demo-org-001',
      name: 'Visionblox LLC',
      einNumber: '12-3456789',
      cageCode: '8ABC1',
      hubzoneNumber: 'HZ-2024-001234',
    },
  });

  console.log('✅ Created organization:', org.name);

  // Create demo employees
  const employees = [
    {
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@visionblox.com',
      hireDate: new Date('2022-03-15'),
      streetAddress: '123 Main Street',
      city: 'Huntsville',
      state: 'AL',
      zipCode: '35801',
      isHubzoneResident: true,
      hubzoneType: 'QCT',
    },
    {
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'sarah.johnson@visionblox.com',
      hireDate: new Date('2021-08-01'),
      streetAddress: '456 Oak Avenue',
      city: 'Huntsville',
      state: 'AL',
      zipCode: '35802',
      isHubzoneResident: true,
      hubzoneType: 'QCT',
    },
    {
      firstName: 'Michael',
      lastName: 'Williams',
      email: 'michael.williams@visionblox.com',
      hireDate: new Date('2023-01-10'),
      streetAddress: '789 Pine Road',
      city: 'Madison',
      state: 'AL',
      zipCode: '35758',
      isHubzoneResident: false,
    },
    {
      firstName: 'Emily',
      lastName: 'Brown',
      email: 'emily.brown@visionblox.com',
      hireDate: new Date('2022-06-20'),
      streetAddress: '321 Cedar Lane',
      city: 'Decatur',
      state: 'AL',
      zipCode: '35601',
      isHubzoneResident: true,
      hubzoneType: 'QNMC',
    },
    {
      firstName: 'David',
      lastName: 'Davis',
      email: 'david.davis@visionblox.com',
      hireDate: new Date('2023-04-05'),
      streetAddress: '654 Maple Drive',
      city: 'Athens',
      state: 'AL',
      zipCode: '35611',
      isHubzoneResident: false,
    },
    {
      firstName: 'Jennifer',
      lastName: 'Miller',
      email: 'jennifer.miller@visionblox.com',
      hireDate: new Date('2021-11-15'),
      streetAddress: '987 Elm Street',
      city: 'Huntsville',
      state: 'AL',
      zipCode: '35805',
      isHubzoneResident: true,
      hubzoneType: 'QCT',
    },
    {
      firstName: 'Robert',
      lastName: 'Wilson',
      email: 'robert.wilson@visionblox.com',
      hireDate: new Date('2022-09-01'),
      streetAddress: '147 Birch Court',
      city: 'Florence',
      state: 'AL',
      zipCode: '35630',
      isHubzoneResident: true,
      hubzoneType: 'QNMC',
    },
    {
      firstName: 'Lisa',
      lastName: 'Anderson',
      email: 'lisa.anderson@visionblox.com',
      hireDate: new Date('2023-02-28'),
      streetAddress: '258 Walnut Way',
      city: 'Huntsville',
      state: 'AL',
      zipCode: '35806',
      isHubzoneResident: false,
    },
  ];

  for (const emp of employees) {
    await prisma.employee.upsert({
      where: {
        id: `${org.id}-${emp.email}`,
      },
      update: emp,
      create: {
        id: `${org.id}-${emp.email}`,
        organizationId: org.id,
        ...emp,
        lastVerified: new Date(),
      },
    });
  }

  console.log(`✅ Created ${employees.length} employees`);

  // Create principal office location
  const location = await prisma.location.upsert({
    where: { id: 'demo-location-001' },
    update: {},
    create: {
      id: 'demo-location-001',
      organizationId: org.id,
      name: 'Headquarters',
      isPrincipalOffice: true,
      streetAddress: '100 N Court Square',
      city: 'Huntsville',
      state: 'AL',
      zipCode: '35801',
      latitude: 34.7304,
      longitude: -86.5861,
      isInHubzone: true,
      hubzoneType: 'QCT',
      lastVerified: new Date(),
    },
  });

  console.log('✅ Created location:', location.name);

  // Create demo certification
  const certification = await prisma.certification.upsert({
    where: { id: 'demo-cert-001' },
    update: {},
    create: {
      id: 'demo-cert-001',
      organizationId: org.id,
      status: 'APPROVED',
      submittedAt: new Date('2024-01-15'),
      approvedAt: new Date('2024-02-01'),
      expiresAt: new Date('2027-02-01'),
      totalEmployees: 8,
      hubzoneResidents: 5,
      compliancePercent: 62.5,
    },
  });

  console.log('✅ Created certification');

  console.log('');
  console.log('🎉 Seed completed successfully!');
  console.log('');
  console.log('Demo organization:', org.name);
  console.log('Total employees:', employees.length);
  console.log('HUBZone residents:', employees.filter((e) => e.isHubzoneResident).length);
  console.log(
    'Compliance:',
    ((employees.filter((e) => e.isHubzoneResident).length / employees.length) * 100).toFixed(1) + '%'
  );
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
