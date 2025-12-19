/**
 * GUARDIAN Agent Stress Tests
 * 
 * Tests:
 * - Evidence completeness
 * - Gap detection accuracy
 * - Audit readiness scoring
 * - Documentation workflows
 * - Audit trail integrity
 */

import { PrismaClient } from '@prisma/client';
import { GuardianAgent } from '../../src/agents/hz-navigator-agents/src/agents/guardian/auditDefense';
import {
  generateComplianceHistory,
  generateEmployeesForCompliance,
  generateLargeWorkforce,
  generateMockEmployee,
  generateId,
} from '../utils/mockDataGenerators';

describe('GUARDIAN Agent Stress Tests', () => {
  let prisma: PrismaClient;
  let guardian: GuardianAgent;
  const testOrgId = 'test-org-guardian';

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = new PrismaClient();
    guardian = new GuardianAgent(prisma);
  });

  describe('Evidence Completeness', () => {
    /**
     * Critical test: Evidence packages must contain all
     * required documentation for SBA audits
     */

    test('should include all required evidence sections', async () => {
      const history = generateComplianceHistory(testOrgId, 30, 40, 'stable');
      const employees = generateEmployeesForCompliance(testOrgId, 50, 40);

      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue(history);
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);
      (prisma.addressVerification.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.attemptToMaintain.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.complianceAlert.findMany as jest.Mock).mockResolvedValue([]);

      const result = await guardian.execute(
        'generate_evidence_package',
        { startDate: '2024-01-01', endDate: '2024-12-31' },
        testOrgId
      ) as {
        evidence: {
          complianceHistory: unknown[];
          employeeRoster: unknown[];
          addressVerifications: unknown[];
          attemptToMaintain: unknown[];
          alerts: unknown[];
        };
        certifications: object;
      };

      // All evidence sections must be present
      expect(result.evidence).toHaveProperty('complianceHistory');
      expect(result.evidence).toHaveProperty('employeeRoster');
      expect(result.evidence).toHaveProperty('addressVerifications');
      expect(result.evidence).toHaveProperty('attemptToMaintain');
      expect(result.evidence).toHaveProperty('alerts');
      
      // Package must be certified
      expect(result.certifications).toBeDefined();
    });

    test('should include compliance snapshots for entire period', async () => {
      const history = generateComplianceHistory(testOrgId, 365, 40, 'stable');
      const employees = generateEmployeesForCompliance(testOrgId, 50, 40);

      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue(history);
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);
      (prisma.addressVerification.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.attemptToMaintain.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.complianceAlert.findMany as jest.Mock).mockResolvedValue([]);

      const result = await guardian.execute(
        'generate_evidence_package',
        { startDate: '2024-01-01', endDate: '2024-12-31' },
        testOrgId
      ) as {
        summary: { complianceSnapshots: number };
      };

      expect(result.summary.complianceSnapshots).toBeGreaterThan(0);
    });

    test('should include both active and inactive employees', async () => {
      const activeEmployees = generateEmployeesForCompliance(testOrgId, 40, 40);
      const inactiveEmployees = generateEmployeesForCompliance(testOrgId, 10, 50)
        .map(e => ({ ...e, isActive: false }));
      const allEmployees = [...activeEmployees, ...inactiveEmployees];

      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(allEmployees);
      (prisma.addressVerification.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.attemptToMaintain.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.complianceAlert.findMany as jest.Mock).mockResolvedValue([]);

      const result = await guardian.execute(
        'generate_evidence_package',
        { startDate: '2024-01-01', endDate: '2024-12-31' },
        testOrgId
      ) as {
        summary: { employees: number; activeEmployees: number };
      };

      expect(result.summary.employees).toBe(50);
      expect(result.summary.activeEmployees).toBe(40);
    });

    test('should properly format employee roster for audit', async () => {
      const employees = [
        generateMockEmployee(testOrgId, {
          firstName: 'John',
          lastName: 'Doe',
          isHubzoneResident: true,
          hubzoneType: 'QCT',
          isLegacyEmployee: false,
        }),
      ];

      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);
      (prisma.addressVerification.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.attemptToMaintain.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.complianceAlert.findMany as jest.Mock).mockResolvedValue([]);

      const result = await guardian.execute(
        'generate_evidence_package',
        { startDate: '2024-01-01', endDate: '2024-12-31' },
        testOrgId
      ) as {
        evidence: {
          employeeRoster: Array<{
            name: string;
            hubzoneStatus: string;
            hubzoneType: string;
          }>;
        };
      };

      const roster = result.evidence.employeeRoster;
      expect(roster[0]).toHaveProperty('name');
      expect(roster[0]).toHaveProperty('hubzoneStatus');
      expect(roster[0]).toHaveProperty('hubzoneType');
    });

    test('should generate unique package ID', async () => {
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.employee.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.addressVerification.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.attemptToMaintain.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.complianceAlert.findMany as jest.Mock).mockResolvedValue([]);

      const result1 = await guardian.execute(
        'generate_evidence_package',
        { startDate: '2024-01-01', endDate: '2024-12-31' },
        testOrgId
      ) as { packageId: string };

      const result2 = await guardian.execute(
        'generate_evidence_package',
        { startDate: '2024-01-01', endDate: '2024-12-31' },
        testOrgId
      ) as { packageId: string };

      expect(result1.packageId).not.toBe(result2.packageId);
      expect(result1.packageId).toContain('EVD-');
    });
  });

  describe('Gap Detection Accuracy', () => {
    /**
     * Critical test: System must accurately identify
     * documentation gaps that could fail an audit
     */

    test('should detect outdated address verifications', async () => {
      const ninetyOneDaysAgo = new Date();
      ninetyOneDaysAgo.setDate(ninetyOneDaysAgo.getDate() - 91);

      const employees = [
        generateMockEmployee(testOrgId, { lastVerified: ninetyOneDaysAgo }),
        generateMockEmployee(testOrgId, { lastVerified: ninetyOneDaysAgo }),
        generateMockEmployee(testOrgId, { lastVerified: new Date() }),
      ];

      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);
      (prisma.complianceSnapshot.count as jest.Mock).mockResolvedValue(10);
      (prisma.complianceSnapshot.findFirst as jest.Mock).mockResolvedValue({
        compliancePercentage: 45,
      });
      (prisma.attemptToMaintain.count as jest.Mock).mockResolvedValue(5);

      const result = await guardian.execute('get_documentation_gaps', {}, testOrgId) as {
        gaps: Array<{ category: string; issue: string }>;
      };

      const verificationGap = result.gaps.find(g => g.category === 'Address Verification');
      expect(verificationGap).toBeDefined();
      expect(verificationGap!.issue).toContain('2');
    });

    test('should detect infrequent compliance snapshots', async () => {
      const employees = generateEmployeesForCompliance(testOrgId, 20, 40);

      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);
      (prisma.complianceSnapshot.count as jest.Mock).mockResolvedValue(1); // Only 1 in 30 days
      (prisma.complianceSnapshot.findFirst as jest.Mock).mockResolvedValue({
        compliancePercentage: 45,
      });
      (prisma.attemptToMaintain.count as jest.Mock).mockResolvedValue(5);

      const result = await guardian.execute('get_documentation_gaps', {}, testOrgId) as {
        gaps: Array<{ category: string }>;
      };

      expect(result.gaps.some(g => g.category === 'Compliance Monitoring')).toBe(true);
    });

    test('should detect missing attempt-to-maintain when below 35%', async () => {
      const employees = generateEmployeesForCompliance(testOrgId, 20, 30);

      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);
      (prisma.complianceSnapshot.count as jest.Mock).mockResolvedValue(10);
      (prisma.complianceSnapshot.findFirst as jest.Mock).mockResolvedValue({
        compliancePercentage: 30, // Below threshold
      });
      (prisma.attemptToMaintain.count as jest.Mock).mockResolvedValue(0); // No ATM records

      const result = await guardian.execute('get_documentation_gaps', {}, testOrgId) as {
        gaps: Array<{ category: string; severity: string }>;
      };

      const atmGap = result.gaps.find(g => g.category === 'Attempt to Maintain');
      expect(atmGap).toBeDefined();
      expect(atmGap!.severity).toBe('high');
    });

    test('should detect missing residency start dates', async () => {
      const employees = [
        generateMockEmployee(testOrgId, { isHubzoneResident: true, residencyStartDate: null }),
        generateMockEmployee(testOrgId, { isHubzoneResident: true, residencyStartDate: null }),
        generateMockEmployee(testOrgId, { isHubzoneResident: true, residencyStartDate: new Date() }),
      ];

      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);
      (prisma.complianceSnapshot.count as jest.Mock).mockResolvedValue(10);
      (prisma.complianceSnapshot.findFirst as jest.Mock).mockResolvedValue({
        compliancePercentage: 45,
      });
      (prisma.attemptToMaintain.count as jest.Mock).mockResolvedValue(5);

      const result = await guardian.execute('get_documentation_gaps', {}, testOrgId) as {
        gaps: Array<{ category: string; issue: string }>;
      };

      const recordsGap = result.gaps.find(g => g.category === 'Employee Records');
      expect(recordsGap).toBeDefined();
      expect(recordsGap!.issue).toContain('2');
    });

    test('should return good status when no gaps', async () => {
      const recentDate = new Date();
      const employees = [
        generateMockEmployee(testOrgId, { 
          isHubzoneResident: true, 
          residencyStartDate: new Date(),
          lastVerified: recentDate,
        }),
      ];

      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);
      (prisma.complianceSnapshot.count as jest.Mock).mockResolvedValue(10);
      (prisma.complianceSnapshot.findFirst as jest.Mock).mockResolvedValue({
        compliancePercentage: 50,
      });
      (prisma.attemptToMaintain.count as jest.Mock).mockResolvedValue(5);

      const result = await guardian.execute('get_documentation_gaps', {}, testOrgId) as {
        overallStatus: string;
        totalGaps: number;
      };

      expect(result.overallStatus).toBe('good');
      expect(result.totalGaps).toBe(0);
    });

    test('should correctly categorize gaps by severity', async () => {
      const ninetyOneDaysAgo = new Date();
      ninetyOneDaysAgo.setDate(ninetyOneDaysAgo.getDate() - 91);

      // Create multiple gap conditions
      const employees = Array(10).fill(null).map(() => 
        generateMockEmployee(testOrgId, { 
          lastVerified: ninetyOneDaysAgo,
          isHubzoneResident: true,
          residencyStartDate: null,
        })
      );

      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);
      (prisma.complianceSnapshot.count as jest.Mock).mockResolvedValue(1);
      (prisma.complianceSnapshot.findFirst as jest.Mock).mockResolvedValue({
        compliancePercentage: 30,
      });
      (prisma.attemptToMaintain.count as jest.Mock).mockResolvedValue(0);

      const result = await guardian.execute('get_documentation_gaps', {}, testOrgId) as {
        bySeverity: { high: number; medium: number; low: number };
        overallStatus: string;
      };

      expect(result.bySeverity.high).toBeGreaterThan(0);
      expect(result.overallStatus).toBe('action_required');
    });
  });

  describe('Audit Readiness Scoring', () => {
    /**
     * Tests accuracy of audit readiness assessment
     */

    test('should score all five categories', async () => {
      const history = generateComplianceHistory(testOrgId, 30, 45, 'stable');
      const employees = generateEmployeesForCompliance(testOrgId, 50, 45);

      // Mock all scoring methods' dependencies
      (prisma.complianceSnapshot.findFirst as jest.Mock).mockResolvedValue(history[0]);
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue(history);
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);
      (prisma.attemptToMaintain.count as jest.Mock).mockResolvedValue(10);

      const result = await guardian.execute('assess_audit_readiness', {}, testOrgId) as {
        scores: {
          overall: number;
          documentation: number;
          complianceHistory: number;
          employeeRecords: number;
          addressVerification: number;
          attemptToMaintain: number;
        };
      };

      expect(result.scores.overall).toBeDefined();
      expect(result.scores.documentation).toBeDefined();
      expect(result.scores.complianceHistory).toBeDefined();
      expect(result.scores.employeeRecords).toBeDefined();
      expect(result.scores.addressVerification).toBeDefined();
      expect(result.scores.attemptToMaintain).toBeDefined();
    });

    test('should calculate overall score as average of categories', async () => {
      (prisma.complianceSnapshot.findFirst as jest.Mock).mockResolvedValue({
        compliancePercentage: 50,
      });
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue(
        generateComplianceHistory(testOrgId, 30, 50, 'stable')
      );
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(
        generateEmployeesForCompliance(testOrgId, 50, 50)
      );
      (prisma.attemptToMaintain.count as jest.Mock).mockResolvedValue(10);

      const result = await guardian.execute('assess_audit_readiness', {}, testOrgId) as {
        scores: {
          overall: number;
          documentation: number;
          complianceHistory: number;
          employeeRecords: number;
          addressVerification: number;
          attemptToMaintain: number;
        };
      };

      const calculatedAverage = Math.round(
        (result.scores.documentation +
          result.scores.complianceHistory +
          result.scores.employeeRecords +
          result.scores.addressVerification +
          result.scores.attemptToMaintain) / 5
      );

      expect(result.scores.overall).toBe(calculatedAverage);
    });

    test('should classify audit_ready status for 80%+ score', async () => {
      const recentDate = new Date();
      const history = generateComplianceHistory(testOrgId, 30, 50, 'stable');
      const employees = generateEmployeesForCompliance(testOrgId, 50, 50)
        .map(e => ({
          ...e,
          lastVerified: recentDate,
          residencyStartDate: recentDate,
          streetAddress: '123 Main St',
          city: 'Washington',
          state: 'DC',
          zipCode: '20001',
        }));

      (prisma.complianceSnapshot.findFirst as jest.Mock).mockResolvedValue({
        compliancePercentage: 50,
        snapshotDate: recentDate,
      });
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue(history);
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);
      (prisma.attemptToMaintain.count as jest.Mock).mockResolvedValue(10);

      const result = await guardian.execute('assess_audit_readiness', {}, testOrgId) as {
        status: string;
        scores: { overall: number };
      };

      if (result.scores.overall >= 80) {
        expect(result.status).toBe('audit_ready');
      }
    });

    test('should identify gaps from low-scoring categories', async () => {
      // Create conditions for low documentation score
      (prisma.complianceSnapshot.findFirst as jest.Mock).mockResolvedValue({
        compliancePercentage: 30,
        snapshotDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Old snapshot
      });
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.employee.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.attemptToMaintain.count as jest.Mock).mockResolvedValue(0);

      const result = await guardian.execute('assess_audit_readiness', {}, testOrgId) as {
        gaps: string[];
        scores: { documentation: number };
      };

      expect(result.gaps.length).toBeGreaterThan(0);
    });

    test('should generate actionable recommendations', async () => {
      (prisma.complianceSnapshot.findFirst as jest.Mock).mockResolvedValue({
        compliancePercentage: 40,
      });
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue(
        generateComplianceHistory(testOrgId, 10, 40, 'stable')
      );
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(
        generateEmployeesForCompliance(testOrgId, 30, 40)
      );
      (prisma.attemptToMaintain.count as jest.Mock).mockResolvedValue(2);

      const result = await guardian.execute('assess_audit_readiness', {}, testOrgId) as {
        recommendations: string[];
      };

      expect(result.recommendations.length).toBeGreaterThan(0);
      // Recommendations should be actionable
      result.recommendations.forEach(r => {
        expect(r.length).toBeGreaterThan(10);
      });
    });
  });

  describe('Attempt to Maintain Documentation', () => {
    /**
     * Tests ATM documentation workflow
     */

    test('should successfully document ATM action', async () => {
      const mockRecord = {
        id: generateId('atm'),
        organizationId: testOrgId,
        actionType: 'hiring_effort',
        description: 'Posted job openings in HUBZone areas',
        evidence: 'Job posting URLs',
        documentedBy: 'GUARDIAN',
        createdAt: new Date(),
      };

      (prisma.attemptToMaintain.create as jest.Mock).mockResolvedValue(mockRecord);

      const result = await guardian.execute(
        'document_attempt_to_maintain',
        {
          action: 'hiring_effort',
          description: 'Posted job openings in HUBZone areas',
          evidence: 'Job posting URLs',
        },
        testOrgId
      ) as {
        success: boolean;
        record: { actionType: string };
        note: string;
      };

      expect(result.success).toBe(true);
      expect(result.record.actionType).toBe('hiring_effort');
      expect(result.note).toContain('grace period');
    });

    test('should include timestamp in ATM record', async () => {
      const now = new Date();
      const mockRecord = {
        id: generateId('atm'),
        organizationId: testOrgId,
        actionType: 'relocation_assistance',
        description: 'Provided relocation assistance',
        evidence: 'Receipts',
        documentedBy: 'GUARDIAN',
        createdAt: now,
      };

      (prisma.attemptToMaintain.create as jest.Mock).mockResolvedValue(mockRecord);

      const result = await guardian.execute(
        'document_attempt_to_maintain',
        {
          action: 'relocation_assistance',
          description: 'Provided relocation assistance',
          evidence: 'Receipts',
        },
        testOrgId
      ) as {
        record: { createdAt: Date };
      };

      expect(result.record.createdAt).toBeDefined();
    });
  });

  describe('Compliance History', () => {
    /**
     * Tests compliance history retrieval and analysis
     */

    test('should calculate correct statistics', async () => {
      const history = [
        { ...generateComplianceHistory(testOrgId, 1, 35, 'stable')[0], compliancePercentage: 35 },
        { ...generateComplianceHistory(testOrgId, 1, 40, 'stable')[0], compliancePercentage: 40 },
        { ...generateComplianceHistory(testOrgId, 1, 45, 'stable')[0], compliancePercentage: 45 },
        { ...generateComplianceHistory(testOrgId, 1, 50, 'stable')[0], compliancePercentage: 50 },
      ];

      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue(history);

      const result = await guardian.execute(
        'get_compliance_history',
        { months: 12 },
        testOrgId
      ) as {
        statistics: {
          average: string;
          minimum: string;
          maximum: string;
        };
      };

      expect(parseFloat(result.statistics.average)).toBeCloseTo(42.5, 1);
      expect(parseFloat(result.statistics.minimum)).toBe(35);
      expect(parseFloat(result.statistics.maximum)).toBe(50);
    });

    test('should identify significant compliance drops', async () => {
      const history = [
        { ...generateComplianceHistory(testOrgId, 1, 50, 'stable')[0], compliancePercentage: 50, snapshotDate: new Date('2024-01-01') },
        { ...generateComplianceHistory(testOrgId, 1, 40, 'stable')[0], compliancePercentage: 40, snapshotDate: new Date('2024-01-15') }, // 10% drop
        { ...generateComplianceHistory(testOrgId, 1, 38, 'stable')[0], compliancePercentage: 38, snapshotDate: new Date('2024-02-01') },
      ];

      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue(history);

      const result = await guardian.execute(
        'get_compliance_history',
        { months: 12 },
        testOrgId
      ) as {
        complianceRecord: {
          significantDrops: number;
          drops: Array<{ from: number; to: number }>;
        };
      };

      expect(result.complianceRecord.significantDrops).toBe(1);
      expect(result.complianceRecord.drops[0].from).toBe(50);
      expect(result.complianceRecord.drops[0].to).toBe(40);
    });

    test('should count time below threshold', async () => {
      const history = [
        { ...generateComplianceHistory(testOrgId, 1, 36, 'stable')[0], compliancePercentage: 36 },
        { ...generateComplianceHistory(testOrgId, 1, 34, 'stable')[0], compliancePercentage: 34 }, // Below
        { ...generateComplianceHistory(testOrgId, 1, 33, 'stable')[0], compliancePercentage: 33 }, // Below
        { ...generateComplianceHistory(testOrgId, 1, 38, 'stable')[0], compliancePercentage: 38 },
      ];

      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue(history);

      const result = await guardian.execute(
        'get_compliance_history',
        { months: 12 },
        testOrgId
      ) as {
        complianceRecord: { belowThresholdCount: number };
      };

      expect(result.complianceRecord.belowThresholdCount).toBe(2);
    });
  });

  describe('Audit Response Preparation', () => {
    /**
     * Tests audit response preparation for different audit types
     */

    test('should prepare SBA review response', async () => {
      (prisma.complianceSnapshot.findFirst as jest.Mock).mockResolvedValue({
        compliancePercentage: 45,
      });
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.employee.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.attemptToMaintain.count as jest.Mock).mockResolvedValue(5);

      const result = await guardian.execute(
        'prepare_audit_response',
        { auditType: 'sba_review' },
        testOrgId
      ) as {
        title: string;
        requiredDocuments: string[];
        keyQuestions: string[];
        preparationSteps: string[];
      };

      expect(result.title).toContain('SBA');
      expect(result.requiredDocuments.length).toBeGreaterThan(0);
      expect(result.keyQuestions.length).toBeGreaterThan(0);
      expect(result.preparationSteps.length).toBeGreaterThan(0);
    });

    test('should prepare recertification response', async () => {
      (prisma.complianceSnapshot.findFirst as jest.Mock).mockResolvedValue({
        compliancePercentage: 45,
      });
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.employee.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.attemptToMaintain.count as jest.Mock).mockResolvedValue(5);

      const result = await guardian.execute(
        'prepare_audit_response',
        { auditType: 'recertification' },
        testOrgId
      ) as {
        title: string;
        requiredDocuments: string[];
      };

      expect(result.title).toContain('Recertification');
      expect(result.requiredDocuments.some(d => d.toLowerCase().includes('roster'))).toBe(true);
    });

    test('should prepare protest response', async () => {
      (prisma.complianceSnapshot.findFirst as jest.Mock).mockResolvedValue({
        compliancePercentage: 45,
      });
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.employee.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.attemptToMaintain.count as jest.Mock).mockResolvedValue(5);

      const result = await guardian.execute(
        'prepare_audit_response',
        { auditType: 'protest' },
        testOrgId
      ) as {
        title: string;
        keyQuestions: string[];
      };

      expect(result.title).toContain('Protest');
      expect(result.keyQuestions.some(q => q.toLowerCase().includes('compliant'))).toBe(true);
    });

    test('should default to SBA review for unknown audit type', async () => {
      (prisma.complianceSnapshot.findFirst as jest.Mock).mockResolvedValue({
        compliancePercentage: 45,
      });
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.employee.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.attemptToMaintain.count as jest.Mock).mockResolvedValue(5);

      const result = await guardian.execute(
        'prepare_audit_response',
        { auditType: 'unknown_type' },
        testOrgId
      ) as {
        title: string;
      };

      expect(result.title).toContain('SBA');
    });
  });

  describe('Audit Trail Integrity', () => {
    /**
     * Tests audit trail completeness and ordering
     */

    test('should combine all event types in audit trail', async () => {
      const events = [{ id: 'evt-1', eventType: 'compliance_check', createdAt: new Date() }];
      const snapshots = [{ id: 'snap-1', snapshotDate: new Date() }];
      const alerts = [{ id: 'alert-1', createdAt: new Date() }];
      const atmRecords = [{ id: 'atm-1', createdAt: new Date() }];

      (prisma.complianceEvent.findMany as jest.Mock).mockResolvedValue(events);
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue(snapshots);
      (prisma.complianceAlert.findMany as jest.Mock).mockResolvedValue(alerts);
      (prisma.attemptToMaintain.findMany as jest.Mock).mockResolvedValue(atmRecords);

      const result = await guardian.execute('get_audit_trail', {}, testOrgId) as {
        breakdown: {
          events: number;
          snapshots: number;
          alerts: number;
          attemptToMaintain: number;
        };
        totalRecords: number;
      };

      expect(result.breakdown.events).toBe(1);
      expect(result.breakdown.snapshots).toBe(1);
      expect(result.breakdown.alerts).toBe(1);
      expect(result.breakdown.attemptToMaintain).toBe(1);
      expect(result.totalRecords).toBe(4);
    });

    test('should sort timeline by date (most recent first)', async () => {
      const now = Date.now();
      const events = [
        { id: 'evt-1', eventType: 'check', createdAt: new Date(now - 1000) },
        { id: 'evt-2', eventType: 'check', createdAt: new Date(now - 2000) },
      ];
      const snapshots = [
        { id: 'snap-1', snapshotDate: new Date(now) }, // Most recent
      ];

      (prisma.complianceEvent.findMany as jest.Mock).mockResolvedValue(events);
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue(snapshots);
      (prisma.complianceAlert.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.attemptToMaintain.findMany as jest.Mock).mockResolvedValue([]);

      const result = await guardian.execute('get_audit_trail', {}, testOrgId) as {
        timeline: Array<{ type: string; date: Date }>;
      };

      // First item should be most recent (snapshot)
      expect(result.timeline[0].type).toBe('snapshot');
    });

    test('should limit timeline to 100 entries', async () => {
      const events = Array(60).fill(null).map((_, i) => ({
        id: `evt-${i}`,
        eventType: 'check',
        createdAt: new Date(Date.now() - i * 1000),
      }));
      const snapshots = Array(60).fill(null).map((_, i) => ({
        id: `snap-${i}`,
        snapshotDate: new Date(Date.now() - i * 1000),
      }));

      (prisma.complianceEvent.findMany as jest.Mock).mockResolvedValue(events);
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue(snapshots);
      (prisma.complianceAlert.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.attemptToMaintain.findMany as jest.Mock).mockResolvedValue([]);

      const result = await guardian.execute('get_audit_trail', {}, testOrgId) as {
        timeline: unknown[];
      };

      expect(result.timeline.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Compliance Event Logging', () => {
    /**
     * Tests compliance event logging
     */

    test('should successfully log compliance event', async () => {
      const mockEvent = {
        id: generateId('evt'),
        organizationId: testOrgId,
        eventType: 'manual_verification',
        details: { note: 'Manual review completed' },
        source: 'GUARDIAN',
        createdAt: new Date(),
      };

      (prisma.complianceEvent.create as jest.Mock).mockResolvedValue(mockEvent);

      const result = await guardian.execute(
        'log_compliance_event',
        { eventType: 'manual_verification', details: { note: 'Manual review completed' } },
        testOrgId
      ) as {
        success: boolean;
        event: { type: string };
      };

      expect(result.success).toBe(true);
      expect(result.event.type).toBe('manual_verification');
    });
  });

  describe('Performance Under Load', () => {
    /**
     * Tests system performance with large datasets
     */

    test('should generate evidence package for large org within 10 seconds', async () => {
      const history = generateComplianceHistory(testOrgId, 365, 40, 'stable');
      const employees = generateLargeWorkforce(testOrgId, 500, 40);
      const verifications = Array(1000).fill(null).map((_, i) => ({
        id: `ver-${i}`,
        employeeId: `emp-${i}`,
        verifiedAt: new Date(),
      }));

      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue(history);
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);
      (prisma.addressVerification.findMany as jest.Mock).mockResolvedValue(verifications);
      (prisma.attemptToMaintain.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.complianceAlert.findMany as jest.Mock).mockResolvedValue([]);

      const startTime = performance.now();
      const result = await guardian.execute(
        'generate_evidence_package',
        { startDate: '2024-01-01', endDate: '2024-12-31' },
        testOrgId
      );
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(10000);
      expect(result).toBeDefined();
    });

    test('should assess audit readiness within 5 seconds', async () => {
      const history = generateComplianceHistory(testOrgId, 180, 40, 'stable');
      const employees = generateLargeWorkforce(testOrgId, 500, 40);

      (prisma.complianceSnapshot.findFirst as jest.Mock).mockResolvedValue(history[0]);
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue(history);
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);
      (prisma.attemptToMaintain.count as jest.Mock).mockResolvedValue(20);

      const startTime = performance.now();
      await guardian.execute('assess_audit_readiness', {}, testOrgId);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(5000);
    });
  });
});
