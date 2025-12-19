/**
 * Mock Data Generators for Stress Testing
 * Generates realistic test data for all agent tests
 */

export interface MockEmployee {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  email: string;
  hireDate: Date;
  isActive: boolean;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  isHubzoneResident: boolean;
  hubzoneType: string | null;
  isLegacyEmployee: boolean;
  atRiskRedesignation: boolean;
  residencyStartDate: Date | null;
  lastVerified: Date | null;
  censusTract: string | null;
}

export interface MockComplianceSnapshot {
  id: string;
  organizationId: string;
  snapshotDate: Date;
  totalEmployees: number;
  hubzoneEmployees: number;
  legacyEmployeeCount: number;
  compliancePercentage: number;
  complianceStatus: string;
  riskScore: number;
  projections: Record<string, unknown>;
  gracePeriodActive: boolean;
  gracePeriodEnd: Date | null;
}

export interface MockOpportunity {
  id: string;
  organizationId: string;
  title: string;
  agency: string;
  noticeId: string;
  setAside: string;
  estimatedValue: number;
  responseDeadline: Date;
  naicsCode: string;
  placeOfPerformance: string;
  description: string;
  matchScore: number;
  status: string;
  winProbability: number;
  isRecompete: boolean;
  analysisData: Record<string, unknown> | null;
  bidDecision: Record<string, unknown> | null;
}

// First names and last names for generating realistic data
const firstNames = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
  'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Charles', 'Karen', 'Daniel', 'Nancy', 'Matthew', 'Lisa',
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
];

const states = ['DC', 'MD', 'VA', 'WV', 'PA', 'NY', 'NJ', 'DE'];
const cities = [
  'Washington', 'Baltimore', 'Arlington', 'Alexandria', 'Richmond', 'Charleston',
  'Pittsburgh', 'Philadelphia', 'Newark', 'Wilmington',
];

const hubzoneTypes = ['QCT', 'QNMC', 'DDA', 'BRAC', 'GOV', 'INDIAN', null];

/**
 * Generate a unique ID
 */
export function generateId(prefix: string = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a single mock employee
 */
export function generateMockEmployee(
  organizationId: string,
  options: Partial<MockEmployee> = {}
): MockEmployee {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const state = states[Math.floor(Math.random() * states.length)];
  const city = cities[Math.floor(Math.random() * cities.length)];
  const isHubzoneResident = options.isHubzoneResident ?? Math.random() > 0.5;

  return {
    id: generateId('emp'),
    organizationId,
    firstName,
    lastName,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
    hireDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000 * 3),
    isActive: true,
    streetAddress: `${Math.floor(Math.random() * 9999) + 1} Main Street`,
    city,
    state,
    zipCode: String(10000 + Math.floor(Math.random() * 89999)),
    isHubzoneResident,
    hubzoneType: isHubzoneResident ? hubzoneTypes[Math.floor(Math.random() * (hubzoneTypes.length - 1))] : null,
    isLegacyEmployee: false,
    atRiskRedesignation: Math.random() > 0.9,
    residencyStartDate: isHubzoneResident 
      ? new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000)
      : null,
    lastVerified: Math.random() > 0.3
      ? new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000)
      : null,
    censusTract: isHubzoneResident ? `1100${Math.floor(Math.random() * 100)}` : null,
    ...options,
  };
}

/**
 * Generate multiple employees with specific compliance percentage
 */
export function generateEmployeesForCompliance(
  organizationId: string,
  totalCount: number,
  targetPercentage: number
): MockEmployee[] {
  const hubzoneCount = Math.round((targetPercentage / 100) * totalCount);
  const nonHubzoneCount = totalCount - hubzoneCount;

  const employees: MockEmployee[] = [];

  // Generate HUBZone employees
  for (let i = 0; i < hubzoneCount; i++) {
    employees.push(generateMockEmployee(organizationId, { isHubzoneResident: true }));
  }

  // Generate non-HUBZone employees
  for (let i = 0; i < nonHubzoneCount; i++) {
    employees.push(generateMockEmployee(organizationId, { isHubzoneResident: false }));
  }

  return employees;
}

/**
 * Generate large workforce for stress testing
 */
export function generateLargeWorkforce(
  organizationId: string,
  count: number = 500,
  hubzonePercentage: number = 40
): MockEmployee[] {
  return generateEmployeesForCompliance(organizationId, count, hubzonePercentage);
}

/**
 * Generate compliance snapshot history
 */
export function generateComplianceHistory(
  organizationId: string,
  days: number = 30,
  startPercentage: number = 38,
  trend: 'improving' | 'declining' | 'stable' = 'stable'
): MockComplianceSnapshot[] {
  const snapshots: MockComplianceSnapshot[] = [];
  let currentPercentage = startPercentage;

  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    // Apply trend
    if (trend === 'improving') {
      currentPercentage = Math.min(100, currentPercentage + Math.random() * 0.5);
    } else if (trend === 'declining') {
      currentPercentage = Math.max(0, currentPercentage - Math.random() * 0.5);
    } else {
      currentPercentage += (Math.random() - 0.5) * 0.3;
    }

    const totalEmployees = 50 + Math.floor(Math.random() * 10);
    const hubzoneEmployees = Math.round((currentPercentage / 100) * totalEmployees);

    snapshots.push({
      id: generateId('snap'),
      organizationId,
      snapshotDate: date,
      totalEmployees,
      hubzoneEmployees,
      legacyEmployeeCount: Math.floor(Math.random() * 4),
      compliancePercentage: currentPercentage,
      complianceStatus: currentPercentage >= 35 ? 'compliant' : 'non_compliant',
      riskScore: Math.max(0, 100 - currentPercentage * 2),
      projections: {},
      gracePeriodActive: false,
      gracePeriodEnd: null,
    });
  }

  return snapshots;
}

/**
 * Generate mock addresses with various edge cases
 */
export function generateMalformedAddresses(): string[] {
  return [
    '', // Empty address
    '   ', // Whitespace only
    '123', // Number only
    'Main Street', // No number
    '123 Main St, , , ', // Missing components
    '123 Main St, Washington, DC, 20001, USA, Extra', // Too many components
    '!@#$%^&*()', // Special characters
    'A'.repeat(500), // Very long address
    '123 Main St\nWashington\nDC 20001', // Newlines
    '123 Main St\tWashington\tDC\t20001', // Tabs
    '１２３ Main Street', // Unicode numbers
    '123 MAIN STREET, WASHINGTON, DC 20001', // All caps
    '123 main street, washington, dc 20001', // All lowercase
    '   123   Main   Street  ,  Washington  ,  DC   20001   ', // Extra spaces
    '123 Main St., Washington, D.C., 20001', // With periods
    '123 Main St #404, Washington, DC 20001', // With unit number
    'PO Box 123, Washington, DC 20001', // PO Box
    '123-A Main Street, Washington, DC 20001', // Alphanumeric street number
    '123 N Main St NW, Washington, DC 20001', // Directionals
    '123 Martin Luther King Jr Blvd, Washington, DC 20001', // Long street name
  ];
}

/**
 * Generate valid addresses for batch testing
 */
export function generateValidAddresses(count: number): string[] {
  const addresses: string[] = [];
  for (let i = 0; i < count; i++) {
    const streetNum = Math.floor(Math.random() * 9999) + 1;
    const streetNames = ['Main', 'Oak', 'Pine', 'Maple', 'Cedar', 'Elm', 'Park', 'Lake'];
    const streetTypes = ['Street', 'Avenue', 'Boulevard', 'Drive', 'Lane', 'Way'];
    const street = streetNames[Math.floor(Math.random() * streetNames.length)];
    const type = streetTypes[Math.floor(Math.random() * streetTypes.length)];
    const city = cities[Math.floor(Math.random() * cities.length)];
    const state = states[Math.floor(Math.random() * states.length)];
    const zip = String(10000 + Math.floor(Math.random() * 89999));
    
    addresses.push(`${streetNum} ${street} ${type}, ${city}, ${state} ${zip}`);
  }
  return addresses;
}

/**
 * Generate mock opportunities for pipeline testing
 */
export function generateOpportunities(
  organizationId: string,
  count: number = 50
): MockOpportunity[] {
  const agencies = [
    'Department of Health and Human Services',
    'Department of Veterans Affairs',
    'Department of Defense',
    'Department of Homeland Security',
    'General Services Administration',
    'Department of Commerce',
    'Department of Energy',
  ];

  const setAsides = ['hubzone', 'hubzone_sole', '8a', 'sdvosb', 'wosb', 'small_business', 'full_open'];
  const statuses = ['discovered', 'analyzing', 'qualified', 'pursuing', 'bid_submitted', 'won', 'lost', 'no_bid'];
  const naicsCodes = ['541511', '541512', '541519', '541330', '541611', '541613'];

  const opportunities: MockOpportunity[] = [];

  for (let i = 0; i < count; i++) {
    const daysUntilDeadline = Math.floor(Math.random() * 90) - 10; // Some past deadlines
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + daysUntilDeadline);

    opportunities.push({
      id: generateId('opp'),
      organizationId,
      title: `Opportunity ${i + 1} - IT Services`,
      agency: agencies[Math.floor(Math.random() * agencies.length)],
      noticeId: `NOTICE-${Date.now()}-${i}`,
      setAside: setAsides[Math.floor(Math.random() * setAsides.length)],
      estimatedValue: Math.floor(Math.random() * 5000000) + 50000,
      responseDeadline: deadline,
      naicsCode: naicsCodes[Math.floor(Math.random() * naicsCodes.length)],
      placeOfPerformance: `${cities[Math.floor(Math.random() * cities.length)]}, ${states[Math.floor(Math.random() * states.length)]}`,
      description: `Contract opportunity for IT services - ${i + 1}`,
      matchScore: Math.floor(Math.random() * 100),
      status: statuses[Math.floor(Math.random() * statuses.length)],
      winProbability: Math.floor(Math.random() * 100),
      isRecompete: Math.random() > 0.7,
      analysisData: null,
      bidDecision: null,
    });
  }

  // Sort by deadline for deadline sorting tests
  return opportunities.sort((a, b) => a.responseDeadline.getTime() - b.responseDeadline.getTime());
}

/**
 * Generate employees with specific 90-day residency status
 */
export function generateEmployeesWithResidencyStatus(
  organizationId: string,
  qualified: number,
  pending: number
): MockEmployee[] {
  const employees: MockEmployee[] = [];
  const ninetyOneDaysAgo = new Date();
  ninetyOneDaysAgo.setDate(ninetyOneDaysAgo.getDate() - 91);

  const fiftyDaysAgo = new Date();
  fiftyDaysAgo.setDate(fiftyDaysAgo.getDate() - 50);

  // Qualified employees (91+ days residency)
  for (let i = 0; i < qualified; i++) {
    employees.push(generateMockEmployee(organizationId, {
      isHubzoneResident: true,
      residencyStartDate: ninetyOneDaysAgo,
    }));
  }

  // Pending employees (less than 90 days residency)
  for (let i = 0; i < pending; i++) {
    employees.push(generateMockEmployee(organizationId, {
      isHubzoneResident: true,
      residencyStartDate: fiftyDaysAgo,
    }));
  }

  return employees;
}

/**
 * Generate employees for legacy limit testing
 */
export function generateEmployeesWithLegacyStatus(
  organizationId: string,
  totalCount: number,
  legacyCount: number
): MockEmployee[] {
  const employees: MockEmployee[] = [];

  // Generate legacy employees
  for (let i = 0; i < legacyCount; i++) {
    employees.push(generateMockEmployee(organizationId, {
      isLegacyEmployee: true,
      isHubzoneResident: false, // Legacy employees moved out of HUBZone
    }));
  }

  // Generate remaining employees
  for (let i = legacyCount; i < totalCount; i++) {
    employees.push(generateMockEmployee(organizationId, {
      isLegacyEmployee: false,
    }));
  }

  return employees;
}

export default {
  generateId,
  generateMockEmployee,
  generateEmployeesForCompliance,
  generateLargeWorkforce,
  generateComplianceHistory,
  generateMalformedAddresses,
  generateValidAddresses,
  generateOpportunities,
  generateEmployeesWithResidencyStatus,
  generateEmployeesWithLegacyStatus,
};
