/**
 * WORKFORCE Agent Stress Tests
 * 
 * Tests:
 * - 90-day residency requirement tracking
 * - Legacy employee limit (max 4)
 * - Data integrity across operations
 * - Employee form validation
 * - Roster management at scale
 */

import { PrismaClient } from '@prisma/client';
import { WorkforceAgent } from '../../src/agents/workforce/employeeIntelligence';
import {
  generateMockEmployee,
  generateEmployeesForCompliance,
  generateEmployeesWithResidencyStatus,
  generateEmployeesWithLegacyStatus,
  generateLargeWorkforce,
  generateId,
} from '../utils/mockDataGenerators';

describe('WORKFORCE Agent Stress Tests', () => {
  let prisma: PrismaClient;
  let workforce: WorkforceAgent;
  const testOrgId = 'test-org-workforce';

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = new PrismaClient();
    workforce = new WorkforceAgent(prisma);
  });

  describe('90-Day Residency Requirement', () => {
    /**
     * Critical test: HUBZone employees must reside 90 days before counting
     * Tests the precise boundary conditions
     */

    test('should correctly identify employees meeting 90-day requirement', async () => {
      const employees = generateEmployeesWithResidencyStatus(testOrgId, 10, 5);
      
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);

      const result = await workforce.execute(
        'check_residency_requirements',
        {},
        testOrgId
      ) as { qualified: number; pending: number };

      expect(result.qualified).toBe(10);
      expect(result.pending).toBe(5);
    });

    test('should correctly handle exactly 90 days (edge case)', async () => {
      // Create date exactly 90 days ago at midnight for consistent comparison
      const exactlyNinetyDaysAgo = new Date();
      exactlyNinetyDaysAgo.setDate(exactlyNinetyDaysAgo.getDate() - 90);
      exactlyNinetyDaysAgo.setHours(0, 0, 0, 0);

      const employee = generateMockEmployee(testOrgId, {
        isHubzoneResident: true,
        residencyStartDate: exactlyNinetyDaysAgo,
      });

      (prisma.employee.findMany as jest.Mock).mockResolvedValue([employee]);

      const result = await workforce.execute(
        'check_residency_requirements',
        {},
        testOrgId
      ) as { qualified: number; pending: number };

      // Exactly 90 days should be pending (need >90 days to qualify)
      expect(result.pending).toBe(1);
      expect(result.qualified).toBe(0);
    });

    test('should correctly handle 91 days (just qualified)', async () => {
      const ninetyOneDaysAgo = new Date();
      ninetyOneDaysAgo.setDate(ninetyOneDaysAgo.getDate() - 91);

      const employee = generateMockEmployee(testOrgId, {
        isHubzoneResident: true,
        residencyStartDate: ninetyOneDaysAgo,
      });

      (prisma.employee.findMany as jest.Mock).mockResolvedValue([employee]);

      const result = await workforce.execute(
        'check_residency_requirements',
        {},
        testOrgId
      ) as { qualified: number; pending: number };

      expect(result.qualified).toBe(1);
      expect(result.pending).toBe(0);
    });

    test('should correctly handle 89 days (not yet qualified)', async () => {
      const eightyNineDaysAgo = new Date();
      eightyNineDaysAgo.setDate(eightyNineDaysAgo.getDate() - 89);

      const employee = generateMockEmployee(testOrgId, {
        isHubzoneResident: true,
        residencyStartDate: eightyNineDaysAgo,
      });

      (prisma.employee.findMany as jest.Mock).mockResolvedValue([employee]);

      const result = await workforce.execute(
        'check_residency_requirements',
        {},
        testOrgId
      ) as { qualified: number; pending: number; pendingDetails: Array<{ daysRemaining: number }> };

      expect(result.pending).toBe(1);
      expect(result.qualified).toBe(0);
      expect(result.pendingDetails[0].daysRemaining).toBeGreaterThan(0);
    });

    test('should handle employees without residency start date', async () => {
      const employee = generateMockEmployee(testOrgId, {
        isHubzoneResident: true,
        residencyStartDate: null,
      });

      (prisma.employee.findMany as jest.Mock).mockResolvedValue([employee]);

      const result = await workforce.execute(
        'check_residency_requirements',
        {},
        testOrgId
      ) as { qualified: number };

      // No start date = assumed qualified (legacy handling)
      expect(result.qualified).toBe(1);
    });

    test('should correctly calculate days remaining for pending employees', async () => {
      const fiftyDaysAgo = new Date();
      fiftyDaysAgo.setDate(fiftyDaysAgo.getDate() - 50);

      const employee = generateMockEmployee(testOrgId, {
        isHubzoneResident: true,
        residencyStartDate: fiftyDaysAgo,
      });

      (prisma.employee.findMany as jest.Mock).mockResolvedValue([employee]);

      const result = await workforce.execute(
        'check_residency_requirements',
        {},
        testOrgId
      ) as { pendingDetails: Array<{ daysRemaining: number }> };

      // 90 - 50 = 40 days remaining
      expect(result.pendingDetails[0].daysRemaining).toBeCloseTo(40, 0);
    });
  });

  describe('Legacy Employee Limits', () => {
    /**
     * Critical test: Max 4 legacy employees allowed
     * Tests boundary conditions at limit
     */

    test('should correctly count legacy employees', async () => {
      const employees = generateEmployeesWithLegacyStatus(testOrgId, 30, 3);
      // Mock should only return legacy employees (filtered by isLegacyEmployee: true)
      const legacyEmployees = employees.filter(e => e.isLegacyEmployee);
      
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(legacyEmployees);

      const result = await workforce.execute(
        'get_legacy_employees',
        {},
        testOrgId
      ) as { count: number; maxAllowed: number; remaining: number };

      expect(result.count).toBe(3);
      expect(result.maxAllowed).toBe(4);
      expect(result.remaining).toBe(1);
    });

    test('should correctly identify when at legacy limit (4)', async () => {
      const employees = generateEmployeesWithLegacyStatus(testOrgId, 30, 4);
      // Mock should only return legacy employees (filtered by isLegacyEmployee: true)
      const legacyEmployees = employees.filter(e => e.isLegacyEmployee);
      
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(legacyEmployees);

      const result = await workforce.execute(
        'get_legacy_employees',
        {},
        testOrgId
      ) as { count: number; remaining: number };

      expect(result.count).toBe(4);
      expect(result.remaining).toBe(0);
    });

    test('should prevent promotion to legacy when at limit', async () => {
      (prisma.employee.count as jest.Mock).mockResolvedValue(4);

      await expect(
        workforce.execute(
          'promote_to_legacy',
          { employeeId: 'emp-123' },
          testOrgId
        )
      ).rejects.toThrow(/Maximum legacy employees.*already reached/);
    });

    test('should allow promotion to legacy when under limit', async () => {
      const employee = generateMockEmployee(testOrgId, {
        isLegacyEmployee: false,
      });

      (prisma.employee.count as jest.Mock).mockResolvedValue(3);
      (prisma.employee.findFirst as jest.Mock).mockResolvedValue(employee);
      (prisma.employee.update as jest.Mock).mockResolvedValue({
        ...employee,
        isLegacyEmployee: true,
      });

      const result = await workforce.execute(
        'promote_to_legacy',
        { employeeId: employee.id },
        testOrgId
      ) as { legacyCount: number };

      expect(result.legacyCount).toBe(4);
    });

    test('should reject promoting already-legacy employee', async () => {
      const employee = generateMockEmployee(testOrgId, {
        isLegacyEmployee: true,
      });

      (prisma.employee.count as jest.Mock).mockResolvedValue(3);
      (prisma.employee.findFirst as jest.Mock).mockResolvedValue(employee);

      await expect(
        workforce.execute(
          'promote_to_legacy',
          { employeeId: employee.id },
          testOrgId
        )
      ).rejects.toThrow(/already a legacy employee/);
    });
  });

  describe('Data Integrity', () => {
    /**
     * Tests data integrity across employee operations
     */

    test('should validate required fields on employee creation', async () => {
      const incompleteData = {
        firstName: 'John',
        // Missing lastName, address fields
      };

      await expect(
        workforce.execute('add_employee', incompleteData, testOrgId)
      ).rejects.toThrow(/Missing required field/);
    });

    test('should validate all required fields are present', async () => {
      const requiredFields = ['firstName', 'lastName', 'streetAddress', 'city', 'state', 'zipCode'];
      
      for (const field of requiredFields) {
        const data = {
          firstName: 'John',
          lastName: 'Doe',
          streetAddress: '123 Main St',
          city: 'Washington',
          state: 'DC',
          zipCode: '20001',
        };
        delete (data as Record<string, unknown>)[field];

        await expect(
          workforce.execute('add_employee', data, testOrgId)
        ).rejects.toThrow(new RegExp(`Missing required field: ${field}`));
      }
    });

    test('should clear HUBZone status when address is updated', async () => {
      const employee = generateMockEmployee(testOrgId, {
        isHubzoneResident: true,
        hubzoneType: 'QCT',
        lastVerified: new Date(),
      });

      (prisma.employee.findUnique as jest.Mock).mockResolvedValue(employee);
      (prisma.employee.update as jest.Mock).mockImplementation(({ data }) => 
        Promise.resolve({ ...employee, ...data })
      );

      const result = await workforce.execute(
        'update_employee',
        {
          employeeId: employee.id,
          updates: { streetAddress: '456 New Address' },
        },
        testOrgId
      ) as { updated: string[] };

      // Should have cleared HUBZone status due to address change
      expect(prisma.employee.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lastVerified: null,
            isHubzoneResident: false,
            hubzoneType: null,
          }),
        })
      );
    });

    test('should not clear HUBZone status for non-address updates', async () => {
      const employee = generateMockEmployee(testOrgId, {
        isHubzoneResident: true,
        hubzoneType: 'QCT',
        lastVerified: new Date(),
      });

      (prisma.employee.findUnique as jest.Mock).mockResolvedValue(employee);
      (prisma.employee.update as jest.Mock).mockImplementation(({ data }) => 
        Promise.resolve({ ...employee, ...data })
      );

      await workforce.execute(
        'update_employee',
        {
          employeeId: employee.id,
          updates: { email: 'newemail@example.com' },
        },
        testOrgId
      );

      // Should NOT have cleared HUBZone status
      expect(prisma.employee.update).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lastVerified: null,
          }),
        })
      );
    });

    test('should maintain data consistency after termination', async () => {
      const employee = generateMockEmployee(testOrgId, {
        isActive: true,
        isHubzoneResident: true,
      });

      (prisma.employee.findFirst as jest.Mock).mockResolvedValue(employee);
      (prisma.employee.findMany as jest.Mock).mockResolvedValue([employee]);
      (prisma.employee.update as jest.Mock).mockResolvedValue({
        ...employee,
        isActive: false,
      });

      const result = await workforce.execute(
        'terminate_employee',
        { employeeId: employee.id, reason: 'Voluntary resignation' },
        testOrgId
      ) as { employee: { wasHubzoneResident: boolean } };

      expect(result.employee.wasHubzoneResident).toBe(true);
      expect(prisma.employee.update).toHaveBeenCalledWith({
        where: { id: employee.id },
        data: { isActive: false },
      });
    });
  });

  describe('Roster Management at Scale', () => {
    /**
     * Stress test: System must handle large rosters efficiently
     */

    test('should handle roster of 500 employees within performance threshold', async () => {
      const employees = generateLargeWorkforce(testOrgId, 500, 40);
      
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);

      const startTime = performance.now();
      const result = await workforce.execute('get_roster', {}, testOrgId) as {
        roster: unknown[];
        stats: { total: number };
      };
      const duration = performance.now() - startTime;

      expect(result.roster.length).toBe(500);
      expect(result.stats.total).toBe(500);
      expect(duration).toBeLessThan(5000); // 5 seconds max
    });

    test('should correctly calculate statistics for large roster', async () => {
      const employees = generateLargeWorkforce(testOrgId, 300, 42);
      // Add specific test conditions
      employees[0].isLegacyEmployee = true;
      employees[1].isLegacyEmployee = true;
      employees[2].atRiskRedesignation = true;
      
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);

      const result = await workforce.execute('get_roster', {}, testOrgId) as {
        stats: {
          total: number;
          hubzoneResidents: number;
          legacyEmployees: number;
          atRisk: number;
        };
      };

      expect(result.stats.total).toBe(300);
      expect(result.stats.hubzoneResidents).toBeCloseTo(126, 5); // ~42%
      expect(result.stats.legacyEmployees).toBe(2);
      expect(result.stats.atRisk).toBeGreaterThanOrEqual(1);
    });

    test('should correctly order roster (active first, then by name)', async () => {
      const employees = [
        generateMockEmployee(testOrgId, { isActive: false, lastName: 'Anderson' }),
        generateMockEmployee(testOrgId, { isActive: true, lastName: 'Zebra' }),
        generateMockEmployee(testOrgId, { isActive: true, lastName: 'Adams' }),
      ];

      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);

      const result = await workforce.execute('get_roster', {}, testOrgId) as {
        roster: Array<{ lastName: string; isActive: boolean }>;
      };

      // Active employees should come first, sorted by lastName
      expect(result.roster[0].isActive).toBe(true);
      expect(result.roster[0].lastName).toBe('Adams');
    });
  });

  describe('Workforce Analysis', () => {
    /**
     * Tests workforce composition analysis accuracy
     */

    test('should correctly analyze tenure distribution', async () => {
      const now = Date.now();
      const employees = [
        // Under 1 year
        generateMockEmployee(testOrgId, { hireDate: new Date(now - 180 * 24 * 60 * 60 * 1000) }),
        // 1-3 years
        generateMockEmployee(testOrgId, { hireDate: new Date(now - 730 * 24 * 60 * 60 * 1000) }),
        // 3-5 years
        generateMockEmployee(testOrgId, { hireDate: new Date(now - 1460 * 24 * 60 * 60 * 1000) }),
        // Over 5 years
        generateMockEmployee(testOrgId, { hireDate: new Date(now - 2190 * 24 * 60 * 60 * 1000) }),
      ];

      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);

      const result = await workforce.execute('analyze_workforce', {}, testOrgId) as {
        tenureDistribution: {
          under1Year: number;
          oneToThreeYears: number;
          threeToFiveYears: number;
          overFiveYears: number;
        };
      };

      expect(result.tenureDistribution.under1Year).toBe(1);
      expect(result.tenureDistribution.oneToThreeYears).toBe(1);
      expect(result.tenureDistribution.threeToFiveYears).toBe(1);
      expect(result.tenureDistribution.overFiveYears).toBe(1);
    });

    test('should correctly analyze HUBZone type distribution', async () => {
      const employees = [
        generateMockEmployee(testOrgId, { isHubzoneResident: true, hubzoneType: 'QCT' }),
        generateMockEmployee(testOrgId, { isHubzoneResident: true, hubzoneType: 'QCT' }),
        generateMockEmployee(testOrgId, { isHubzoneResident: true, hubzoneType: 'QNMC' }),
        generateMockEmployee(testOrgId, { isHubzoneResident: true, hubzoneType: 'DDA' }),
        generateMockEmployee(testOrgId, { isHubzoneResident: false }),
      ];

      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);

      const result = await workforce.execute('analyze_workforce', {}, testOrgId) as {
        hubzoneTypes: Record<string, number>;
      };

      expect(result.hubzoneTypes['QCT']).toBe(2);
      expect(result.hubzoneTypes['QNMC']).toBe(1);
      expect(result.hubzoneTypes['DDA']).toBe(1);
    });

    test('should generate appropriate workforce insights', async () => {
      // Small workforce, low compliance
      const employees = generateEmployeesForCompliance(testOrgId, 4, 30);

      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);

      const result = await workforce.execute('analyze_workforce', {}, testOrgId) as {
        insights: string[];
      };

      expect(result.insights.some(i => i.toLowerCase().includes('small workforce'))).toBe(true);
      expect(result.insights.some(i => i.toLowerCase().includes('critical') || i.toLowerCase().includes('below'))).toBe(true);
    });
  });

  describe('Hiring Recommendations', () => {
    /**
     * Tests hiring recommendation logic
     */

    test('should recommend urgent HUBZone hires when below 35%', async () => {
      const employees = generateEmployeesForCompliance(testOrgId, 50, 30);

      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);

      const result = await workforce.execute('get_hiring_recommendations', {}, testOrgId) as {
        recommendations: {
          urgency: string;
          hubzoneRequired: boolean;
          targetCount: number;
        };
      };

      expect(result.recommendations.urgency).toBe('critical');
      expect(result.recommendations.hubzoneRequired).toBe(true);
      expect(result.recommendations.targetCount).toBeGreaterThan(0);
    });

    test('should recommend buffer building when at 35-40%', async () => {
      const employees = generateEmployeesForCompliance(testOrgId, 50, 37);

      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);

      const result = await workforce.execute('get_hiring_recommendations', {}, testOrgId) as {
        recommendations: {
          urgency: string;
          hubzoneRequired: boolean;
        };
      };

      expect(result.recommendations.urgency).toBe('medium');
      expect(result.recommendations.hubzoneRequired).toBe(true);
    });

    test('should indicate healthy compliance when above 50%', async () => {
      const employees = generateEmployeesForCompliance(testOrgId, 50, 55);

      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);

      const result = await workforce.execute('get_hiring_recommendations', {}, testOrgId) as {
        recommendations: {
          urgency: string;
          recommendations: string[];
        };
      };

      expect(result.recommendations.urgency).toBe('low');
      expect(result.recommendations.recommendations.some(r => r.toLowerCase().includes('healthy'))).toBe(true);
    });

    test('should calculate correct number of HUBZone hires needed', async () => {
      // 15 HUBZone out of 50 = 30%
      // Need: 0.35 * (50 + x) = 15 + x
      // 17.5 + 0.35x = 15 + x
      // 2.5 = 0.65x
      // x = ~4 HUBZone hires
      const employees = generateEmployeesForCompliance(testOrgId, 50, 30);

      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);

      const result = await workforce.execute('get_hiring_recommendations', {}, testOrgId) as {
        recommendations: {
          targetCount: number;
        };
      };

      expect(result.recommendations.targetCount).toBeGreaterThanOrEqual(3);
      expect(result.recommendations.targetCount).toBeLessThanOrEqual(5);
    });
  });

  describe('At-Risk Employee Management', () => {
    /**
     * Tests at-risk employee identification and tracking
     */

    test('should correctly identify at-risk employees', async () => {
      const employees = [
        generateMockEmployee(testOrgId, { atRiskRedesignation: true, isHubzoneResident: true }),
        generateMockEmployee(testOrgId, { atRiskRedesignation: true, isHubzoneResident: true }),
        generateMockEmployee(testOrgId, { atRiskRedesignation: false, isHubzoneResident: true }),
      ];

      (prisma.employee.findMany as jest.Mock).mockResolvedValue(
        employees.filter(e => e.atRiskRedesignation && e.isActive)
      );

      const result = await workforce.execute('get_at_risk_employees', {}, testOrgId) as {
        count: number;
        employees: Array<{ hubzoneType: string | null }>;
      };

      expect(result.count).toBe(2);
      expect(result.employees.length).toBe(2);
    });

    test('should provide recommendation when at-risk employees exist', async () => {
      const employees = [
        generateMockEmployee(testOrgId, { atRiskRedesignation: true }),
      ];

      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);

      const result = await workforce.execute('get_at_risk_employees', {}, testOrgId) as {
        recommendation: string;
      };

      expect(result.recommendation.toLowerCase()).toContain('relocation');
    });

    test('should indicate no risk when no at-risk employees', async () => {
      (prisma.employee.findMany as jest.Mock).mockResolvedValue([]);

      const result = await workforce.execute('get_at_risk_employees', {}, testOrgId) as {
        recommendation: string;
        count: number;
      };

      expect(result.count).toBe(0);
      expect(result.recommendation.toLowerCase()).toContain('no employees at risk');
    });
  });

  describe('Hire/Termination Impact Calculation', () => {
    /**
     * Tests impact calculation accuracy for workforce changes
     */

    test('should accurately calculate hire impact', async () => {
      // 18 HUBZone out of 50 = 36%
      const employees = generateEmployeesForCompliance(testOrgId, 50, 36);

      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);
      (prisma.employee.create as jest.Mock).mockResolvedValue(
        generateMockEmployee(testOrgId, { isHubzoneResident: true })
      );

      const result = await workforce.execute(
        'add_employee',
        {
          firstName: 'New',
          lastName: 'Employee',
          streetAddress: '123 Test St',
          city: 'Washington',
          state: 'DC',
          zipCode: '20001',
          isHubzoneResident: true,
        },
        testOrgId
      ) as { impact: { before: { percentage: number }; after: { percentage: number } } };

      // 19/51 = 37.25% (slightly higher)
      expect(result.impact.after.percentage).toBeGreaterThan(result.impact.before.percentage);
    });

    test('should accurately calculate termination impact and warn if critical', async () => {
      // 18 HUBZone out of 51 = 35.3%
      const employees = generateEmployeesForCompliance(testOrgId, 51, 35.3);
      const hubzoneEmployee = employees.find(e => e.isHubzoneResident)!;

      (prisma.employee.findFirst as jest.Mock).mockResolvedValue(hubzoneEmployee);
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);
      (prisma.employee.update as jest.Mock).mockResolvedValue({ ...hubzoneEmployee, isActive: false });

      const result = await workforce.execute(
        'terminate_employee',
        { employeeId: hubzoneEmployee.id, reason: 'Test' },
        testOrgId
      ) as { impact: { warning: string | null; before: { percentage: number }; after: { percentage: number } } };

      // 17/50 = 34% (below threshold)
      expect(result.impact.after.percentage).toBeLessThan(35);
      expect(result.impact.warning).not.toBeNull();
    });
  });
});
