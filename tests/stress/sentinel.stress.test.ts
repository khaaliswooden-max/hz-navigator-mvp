/**
 * SENTINEL Agent Stress Tests
 * 
 * Tests:
 * - Compliance calculation accuracy at edge cases (34.9%, 35.0%, 35.1%)
 * - Large workforce handling (500+ employees)
 * - Rapid state changes
 * - Dashboard gauge visibility
 * - Alert actionability
 */

import { PrismaClient } from '@prisma/client';
import { SentinelAgent } from '../../src/agents/sentinel/complianceMonitor';
import {
  generateEmployeesForCompliance,
  generateLargeWorkforce,
  generateComplianceHistory,
  generateId,
} from '../utils/mockDataGenerators';

describe('SENTINEL Agent Stress Tests', () => {
  let prisma: PrismaClient;
  let sentinel: SentinelAgent;
  const testOrgId = 'test-org-sentinel';

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = new PrismaClient();
    sentinel = new SentinelAgent(prisma);
  });

  describe('Compliance Calculation Accuracy - Boundary Edge Cases', () => {
    /**
     * Critical test: 35% threshold is the make-or-break compliance point
     * Tests values just below, at, and just above the threshold
     */
    
    test('should correctly identify 34.9% as NON_COMPLIANT', async () => {
      // 34.9% = 349 HUBZone out of 1000 employees
      const employees = generateEmployeesForCompliance(testOrgId, 1000, 34.9);
      
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);
      (prisma.complianceSnapshot.create as jest.Mock).mockResolvedValue({});
      (prisma.complianceAlert.create as jest.Mock).mockResolvedValue({});
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue([]);

      const result = await sentinel.calculateCompliance(testOrgId);

      expect(result.compliancePercentage).toBeCloseTo(34.9, 0);
      expect(result.status).toBe('non_compliant');
      expect(result.alerts.some(a => a.severity === 'critical')).toBe(true);
      expect(result.alerts.some(a => a.type === 'compliance_below_threshold')).toBe(true);
    });

    test('should correctly identify EXACTLY 35.0% as AT_RISK (not compliant)', async () => {
      // Exactly 35% - should be at_risk per determineComplianceStatus logic
      const employees = generateEmployeesForCompliance(testOrgId, 100, 35);
      
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);
      (prisma.complianceSnapshot.create as jest.Mock).mockResolvedValue({});
      (prisma.complianceAlert.create as jest.Mock).mockResolvedValue({});
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue([]);

      const result = await sentinel.calculateCompliance(testOrgId);

      expect(result.compliancePercentage).toBe(35);
      expect(result.status).toBe('at_risk'); // 35-40% is at_risk
      expect(result.alerts.some(a => a.type === 'thin_compliance_buffer')).toBe(true);
    });

    test('should correctly identify 35.1% as AT_RISK', async () => {
      // 35.1% = just above threshold
      const employees = generateEmployeesForCompliance(testOrgId, 1000, 35.1);
      
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);
      (prisma.complianceSnapshot.create as jest.Mock).mockResolvedValue({});
      (prisma.complianceAlert.create as jest.Mock).mockResolvedValue({});
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue([]);

      const result = await sentinel.calculateCompliance(testOrgId);

      expect(result.compliancePercentage).toBeCloseTo(35.1, 0);
      expect(result.status).toBe('at_risk');
    });

    test('should correctly identify 40% as COMPLIANT', async () => {
      const employees = generateEmployeesForCompliance(testOrgId, 100, 40);
      
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);
      (prisma.complianceSnapshot.create as jest.Mock).mockResolvedValue({});
      (prisma.complianceAlert.create as jest.Mock).mockResolvedValue({});
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue([]);

      const result = await sentinel.calculateCompliance(testOrgId);

      expect(result.compliancePercentage).toBe(40);
      expect(result.status).toBe('compliant');
    });

    test('should correctly handle 0 employees (edge case)', async () => {
      (prisma.employee.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.complianceSnapshot.create as jest.Mock).mockResolvedValue({});
      (prisma.complianceAlert.create as jest.Mock).mockResolvedValue({});
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue([]);

      const result = await sentinel.calculateCompliance(testOrgId);

      expect(result.totalEmployees).toBe(0);
      expect(result.compliancePercentage).toBe(0);
      expect(result.status).toBe('non_compliant');
    });

    test('should correctly handle 1 employee scenarios', async () => {
      // 1 HUBZone employee = 100% compliance
      const singleHubzoneEmployee = generateEmployeesForCompliance(testOrgId, 1, 100);
      
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(singleHubzoneEmployee);
      (prisma.complianceSnapshot.create as jest.Mock).mockResolvedValue({});
      (prisma.complianceAlert.create as jest.Mock).mockResolvedValue({});
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue([]);

      const result = await sentinel.calculateCompliance(testOrgId);

      expect(result.totalEmployees).toBe(1);
      expect(result.compliancePercentage).toBe(100);
      expect(result.status).toBe('compliant');
    });
  });

  describe('Large Workforce Handling (500+ employees)', () => {
    /**
     * Stress test: Verify system handles large workforces efficiently
     * Performance should remain acceptable (<5 seconds)
     */

    test('should handle 500 employees within performance threshold', async () => {
      const employees = generateLargeWorkforce(testOrgId, 500, 40);
      
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);
      (prisma.complianceSnapshot.create as jest.Mock).mockResolvedValue({});
      (prisma.complianceAlert.create as jest.Mock).mockResolvedValue({});
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue([]);

      const startTime = performance.now();
      const result = await sentinel.calculateCompliance(testOrgId);
      const duration = performance.now() - startTime;

      expect(result.totalEmployees).toBe(500);
      expect(duration).toBeLessThan(5000); // 5 seconds max
      expect(result.hubzoneEmployees).toBeGreaterThanOrEqual(175); // ~35% minimum
    });

    test('should handle 1000 employees within performance threshold', async () => {
      const employees = generateLargeWorkforce(testOrgId, 1000, 38);
      
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);
      (prisma.complianceSnapshot.create as jest.Mock).mockResolvedValue({});
      (prisma.complianceAlert.create as jest.Mock).mockResolvedValue({});
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue([]);

      const startTime = performance.now();
      const result = await sentinel.calculateCompliance(testOrgId);
      const duration = performance.now() - startTime;

      expect(result.totalEmployees).toBe(1000);
      expect(duration).toBeLessThan(5000);
    });

    test('should accurately calculate compliance with large dataset', async () => {
      const targetPercentage = 37.5;
      const employees = generateLargeWorkforce(testOrgId, 800, targetPercentage);
      
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);
      (prisma.complianceSnapshot.create as jest.Mock).mockResolvedValue({});
      (prisma.complianceAlert.create as jest.Mock).mockResolvedValue({});
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue([]);

      const result = await sentinel.calculateCompliance(testOrgId);

      // Allow for small variance due to rounding in employee generation
      expect(result.compliancePercentage).toBeGreaterThanOrEqual(targetPercentage - 1);
      expect(result.compliancePercentage).toBeLessThanOrEqual(targetPercentage + 1);
    });

    test('should correctly count legacy employees in large workforce', async () => {
      const employees = generateLargeWorkforce(testOrgId, 500, 40);
      // Add 4 legacy employees
      for (let i = 0; i < 4; i++) {
        employees[i].isLegacyEmployee = true;
      }
      
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);
      (prisma.complianceSnapshot.create as jest.Mock).mockResolvedValue({});
      (prisma.complianceAlert.create as jest.Mock).mockResolvedValue({});
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue([]);

      const result = await sentinel.calculateCompliance(testOrgId);

      expect(result.legacyEmployees).toBe(4);
      expect(result.alerts.some(a => a.type === 'legacy_employee_limit')).toBe(true);
    });
  });

  describe('Rapid State Changes', () => {
    /**
     * Stress test: System should handle rapid consecutive state changes
     * without data corruption or race conditions
     */

    test('should handle multiple rapid compliance calculations', async () => {
      const employees = generateEmployeesForCompliance(testOrgId, 50, 38);
      
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);
      (prisma.complianceSnapshot.create as jest.Mock).mockResolvedValue({});
      (prisma.complianceAlert.create as jest.Mock).mockResolvedValue({});
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue([]);

      // Run 10 rapid calculations
      const results = await Promise.all(
        Array(10).fill(null).map(() => sentinel.calculateCompliance(testOrgId))
      );

      // All results should be consistent
      const firstPercentage = results[0].compliancePercentage;
      results.forEach(result => {
        expect(result.compliancePercentage).toBe(firstPercentage);
        expect(result.totalEmployees).toBe(50);
      });
    });

    test('should handle hire simulation followed by immediate compliance check', async () => {
      const employees = generateEmployeesForCompliance(testOrgId, 50, 34);
      
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);
      (prisma.complianceSnapshot.create as jest.Mock).mockResolvedValue({});
      (prisma.complianceAlert.create as jest.Mock).mockResolvedValue({});
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue([]);

      // Check current (non-compliant)
      const before = await sentinel.calculateCompliance(testOrgId);
      expect(before.status).toBe('non_compliant');

      // Simulate hiring HUBZone employee
      const simulation = await sentinel.execute(
        'simulate_hire',
        { isHubzoneResident: true },
        testOrgId
      );

      expect(simulation).toHaveProperty('projected');
    });

    test('should track state transitions correctly through history', async () => {
      const history = generateComplianceHistory(testOrgId, 30, 36, 'declining');
      
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue(history);

      const result = await sentinel.execute(
        'get_compliance_history',
        { days: 30 },
        testOrgId
      );

      expect(result).toHaveProperty('snapshots');
      expect(result).toHaveProperty('trend');
    });
  });

  describe('Alert Actionability', () => {
    /**
     * Tests that alerts contain actionable information
     * and are properly prioritized
     */

    test('should generate actionable alerts for critical compliance', async () => {
      const employees = generateEmployeesForCompliance(testOrgId, 50, 30);
      
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);
      (prisma.complianceSnapshot.create as jest.Mock).mockResolvedValue({});
      (prisma.complianceAlert.create as jest.Mock).mockResolvedValue({});
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue([]);

      const result = await sentinel.calculateCompliance(testOrgId);

      const criticalAlerts = result.alerts.filter(a => a.severity === 'critical');
      
      expect(criticalAlerts.length).toBeGreaterThan(0);
      criticalAlerts.forEach(alert => {
        expect(alert.actionRequired).toBe(true);
        expect(alert.suggestedAction).toBeDefined();
        expect(alert.suggestedAction!.length).toBeGreaterThan(0);
      });
    });

    test('should include hiring recommendations in alerts', async () => {
      const employees = generateEmployeesForCompliance(testOrgId, 20, 30);
      
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);
      (prisma.complianceSnapshot.create as jest.Mock).mockResolvedValue({});
      (prisma.complianceAlert.create as jest.Mock).mockResolvedValue({});
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue([]);

      const result = await sentinel.calculateCompliance(testOrgId);

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some(r => r.toLowerCase().includes('hire'))).toBe(true);
    });

    test('should warn about small workforce volatility', async () => {
      const employees = generateEmployeesForCompliance(testOrgId, 5, 40);
      
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);
      (prisma.complianceSnapshot.create as jest.Mock).mockResolvedValue({});
      (prisma.complianceAlert.create as jest.Mock).mockResolvedValue({});
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue([]);

      const result = await sentinel.calculateCompliance(testOrgId);

      expect(result.alerts.some(a => a.type === 'small_workforce_risk')).toBe(true);
    });

    test('should alert on employees in at-risk redesignation areas', async () => {
      const employees = generateEmployeesForCompliance(testOrgId, 30, 40);
      // Mark 5 employees as at-risk
      for (let i = 0; i < 5; i++) {
        employees[i].atRiskRedesignation = true;
      }
      
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);
      (prisma.complianceSnapshot.create as jest.Mock).mockResolvedValue({});
      (prisma.complianceAlert.create as jest.Mock).mockResolvedValue({});
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue([]);

      const result = await sentinel.calculateCompliance(testOrgId);

      expect(result.alerts.some(a => a.type === 'redesignation_risk')).toBe(true);
    });
  });

  describe('Risk Score Calculation', () => {
    /**
     * Verify risk score calculation accuracy across various scenarios
     */

    test('should calculate high risk score for non-compliant small workforce', async () => {
      const employees = generateEmployeesForCompliance(testOrgId, 4, 25);
      
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);
      (prisma.complianceSnapshot.create as jest.Mock).mockResolvedValue({});
      (prisma.complianceAlert.create as jest.Mock).mockResolvedValue({});
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue([]);

      const result = await sentinel.calculateCompliance(testOrgId);

      // High risk due to: non-compliant (50) + small workforce (20) = 70+
      expect(result.riskScore).toBeGreaterThanOrEqual(70);
    });

    test('should calculate low risk score for healthy compliant workforce', async () => {
      const employees = generateEmployeesForCompliance(testOrgId, 50, 50);
      
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);
      (prisma.complianceSnapshot.create as jest.Mock).mockResolvedValue({});
      (prisma.complianceAlert.create as jest.Mock).mockResolvedValue({});
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue([]);

      const result = await sentinel.calculateCompliance(testOrgId);

      // Low risk: good compliance (5) + adequate workforce
      expect(result.riskScore).toBeLessThanOrEqual(25);
    });

    test('should increase risk score for max legacy employees', async () => {
      const employees = generateEmployeesForCompliance(testOrgId, 30, 50);
      // Mark 4 as legacy (max)
      for (let i = 0; i < 4; i++) {
        employees[i].isLegacyEmployee = true;
      }
      
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);
      (prisma.complianceSnapshot.create as jest.Mock).mockResolvedValue({});
      (prisma.complianceAlert.create as jest.Mock).mockResolvedValue({});
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue([]);

      const result = await sentinel.calculateCompliance(testOrgId);

      // Should include legacy penalty
      expect(result.riskScore).toBeGreaterThanOrEqual(20);
    });
  });

  describe('Simulation Accuracy', () => {
    /**
     * Tests hire/termination simulation predictions
     */

    test('should accurately predict hire impact on compliance', async () => {
      // 17 HUBZone out of 50 = 34% (non-compliant)
      const employees = generateEmployeesForCompliance(testOrgId, 50, 34);
      
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);

      const result = await sentinel.execute(
        'simulate_hire',
        { isHubzoneResident: true },
        testOrgId
      ) as { current: { compliancePercentage: number }; projected: { compliancePercentage: number } };

      // Adding 1 HUBZone to 51 total = 18/51 = 35.29%
      expect(result.projected.compliancePercentage).toBeGreaterThan(result.current.compliancePercentage);
      expect(result.projected.compliancePercentage).toBeGreaterThanOrEqual(35);
    });

    test('should accurately predict termination impact on compliance', async () => {
      const employees = generateEmployeesForCompliance(testOrgId, 50, 36);
      const hubzoneEmployee = employees.find(e => e.isHubzoneResident);
      
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);
      (prisma.employee.findFirst as jest.Mock).mockResolvedValue(hubzoneEmployee);

      const result = await sentinel.execute(
        'simulate_termination',
        { employeeId: hubzoneEmployee!.id },
        testOrgId
      ) as { impact: { critical: boolean } };

      // Losing a HUBZone employee from thin margin could be critical
      expect(result.impact).toHaveProperty('critical');
    });
  });

  describe('Projection Accuracy', () => {
    /**
     * Tests compliance projections based on historical data
     */

    test('should identify declining trend from historical data', async () => {
      const decliningHistory = generateComplianceHistory(testOrgId, 30, 45, 'declining');
      const currentEmployees = generateEmployeesForCompliance(testOrgId, 50, 38);
      
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(currentEmployees);
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue(decliningHistory);
      (prisma.complianceSnapshot.create as jest.Mock).mockResolvedValue({});
      (prisma.complianceAlert.create as jest.Mock).mockResolvedValue({});

      const result = await sentinel.calculateCompliance(testOrgId);

      expect(result.projections.trend).toBe('declining');
    });

    test('should identify improving trend from historical data', async () => {
      const improvingHistory = generateComplianceHistory(testOrgId, 30, 32, 'improving');
      const currentEmployees = generateEmployeesForCompliance(testOrgId, 50, 42);
      
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(currentEmployees);
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue(improvingHistory);
      (prisma.complianceSnapshot.create as jest.Mock).mockResolvedValue({});
      (prisma.complianceAlert.create as jest.Mock).mockResolvedValue({});

      const result = await sentinel.calculateCompliance(testOrgId);

      expect(result.projections.trend).toBe('improving');
    });
  });
});
