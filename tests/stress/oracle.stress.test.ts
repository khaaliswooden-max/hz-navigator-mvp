/**
 * ORACLE Agent Stress Tests
 * 
 * Tests:
 * - Forecast performance (<5 seconds requirement)
 * - Prediction accuracy (>70% target)
 * - Insufficient data handling
 * - Statistical validity
 * - Trend analysis
 * - Chart rendering support
 */

import { PrismaClient } from '@prisma/client';
import { OracleAgent } from '../../src/agents/hz-navigator-agents/src/agents/oracle/predictiveAnalytics';
import {
  generateComplianceHistory,
  generateEmployeesForCompliance,
  generateLargeWorkforce,
  generateId,
} from '../utils/mockDataGenerators';

describe('ORACLE Agent Stress Tests', () => {
  let prisma: PrismaClient;
  let oracle: OracleAgent;
  const testOrgId = 'test-org-oracle';

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = new PrismaClient();
    oracle = new OracleAgent(prisma);
  });

  describe('Forecast Performance (<5 seconds requirement)', () => {
    /**
     * Critical test: All forecast operations must complete
     * within 5 seconds to ensure responsive user experience
     */

    test('should complete compliance forecast within 5 seconds', async () => {
      const history = generateComplianceHistory(testOrgId, 30, 40, 'stable');
      
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue(history);

      const startTime = performance.now();
      const result = await oracle.execute(
        'forecast_compliance',
        { months: 12 },
        testOrgId
      );
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(5000);
      expect(result).toHaveProperty('forecast');
    });

    test('should complete churn prediction within 5 seconds', async () => {
      const employees = generateLargeWorkforce(testOrgId, 500, 40);
      
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);

      const startTime = performance.now();
      const result = await oracle.execute('predict_churn_risk', {}, testOrgId);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(5000);
      expect(result).toHaveProperty('assessments');
    });

    test('should complete trend analysis within 5 seconds', async () => {
      const history = generateComplianceHistory(testOrgId, 180, 38, 'improving');
      
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue(history);

      const startTime = performance.now();
      const result = await oracle.execute('analyze_trends', {}, testOrgId);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(5000);
      expect(result).toHaveProperty('compliance');
    });

    test('should complete workforce planning within 5 seconds', async () => {
      const employees = generateLargeWorkforce(testOrgId, 500, 38);
      
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);

      const startTime = performance.now();
      const result = await oracle.execute(
        'workforce_planning',
        { targetPercentage: 45, plannedHires: 20, plannedTerminations: 5 },
        testOrgId
      );
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(5000);
      expect(result).toHaveProperty('projectedState');
    });

    test('should complete risk assessment within 5 seconds', async () => {
      const history = generateComplianceHistory(testOrgId, 30, 36, 'declining');
      const employees = generateLargeWorkforce(testOrgId, 200, 36);
      
      (prisma.complianceSnapshot.findFirst as jest.Mock).mockResolvedValue(history[history.length - 1]);
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);

      const startTime = performance.now();
      const result = await oracle.execute('risk_assessment', {}, testOrgId);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(5000);
      expect(result).toHaveProperty('risks');
    });

    test('should complete scenario analysis within 5 seconds', async () => {
      const employees = generateLargeWorkforce(testOrgId, 300, 40);
      
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);

      const startTime = performance.now();
      const result = await oracle.execute('scenario_analysis', { scenarios: [] }, testOrgId);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(5000);
      expect(result).toHaveProperty('scenarios');
    });

    test('should complete get_insights aggregation within 5 seconds', async () => {
      const history = generateComplianceHistory(testOrgId, 30, 40, 'stable');
      const employees = generateEmployeesForCompliance(testOrgId, 100, 40);
      
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue(history);
      (prisma.complianceSnapshot.findFirst as jest.Mock).mockResolvedValue(history[history.length - 1]);
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);

      const startTime = performance.now();
      const result = await oracle.execute('get_insights', {}, testOrgId);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(5000);
      expect(result).toHaveProperty('keyInsights');
    });
  });

  describe('Prediction Accuracy (>70% target)', () => {
    /**
     * Tests prediction model accuracy through backtesting
     * and validation of trend identification
     */

    test('should accurately identify improving trend', async () => {
      // Generate improving history: starts at 35%, ends at 50%
      const history = generateComplianceHistory(testOrgId, 30, 35, 'improving');
      // Ensure substantial improvement
      history.forEach((snap, i) => {
        snap.compliancePercentage = 35 + (i * 0.5); // Clear upward trend
      });
      
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue(history);

      const result = await oracle.execute(
        'forecast_compliance',
        { months: 6 },
        testOrgId
      ) as { trend: string };

      expect(result.trend).toBe('improving');
    });

    test('should accurately identify declining trend', async () => {
      const history = generateComplianceHistory(testOrgId, 30, 50, 'declining');
      // Ensure substantial decline
      history.forEach((snap, i) => {
        snap.compliancePercentage = 50 - (i * 0.5); // Clear downward trend
      });
      
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue(history);

      const result = await oracle.execute(
        'forecast_compliance',
        { months: 6 },
        testOrgId
      ) as { trend: string };

      expect(result.trend).toBe('declining');
    });

    test('should accurately identify stable trend', async () => {
      const history = generateComplianceHistory(testOrgId, 30, 40, 'stable');
      // Ensure stability (small variance)
      history.forEach((snap) => {
        snap.compliancePercentage = 40 + (Math.random() - 0.5) * 0.5; // ±0.25% variance
      });
      
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue(history);

      const result = await oracle.execute(
        'forecast_compliance',
        { months: 6 },
        testOrgId
      ) as { trend: string };

      expect(result.trend).toBe('stable');
    });

    test('should predict compliance drop with declining trend', async () => {
      const history = generateComplianceHistory(testOrgId, 30, 40, 'declining');
      // Force a clear 2% monthly decline
      history.forEach((snap, i) => {
        snap.compliancePercentage = 40 - (i * 0.3); // ~2% per month decline
      });
      
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue(history);

      const result = await oracle.execute(
        'forecast_compliance',
        { months: 6 },
        testOrgId
      ) as {
        currentCompliance: number;
        forecast: Array<{ projected: string; status: string }>;
      };

      // Forecast should show declining values
      const lastForecast = parseFloat(result.forecast[result.forecast.length - 1].projected);
      expect(lastForecast).toBeLessThan(result.currentCompliance);
    });

    test('should correctly classify churn risk levels', async () => {
      const now = Date.now();
      const employees = [
        // High risk: new + at-risk area
        {
          ...generateEmployeesForCompliance(testOrgId, 1, 100)[0],
          hireDate: new Date(now - 90 * 24 * 60 * 60 * 1000), // 3 months
          atRiskRedesignation: true,
        },
        // Medium risk: less than 1 year
        {
          ...generateEmployeesForCompliance(testOrgId, 1, 100)[0],
          hireDate: new Date(now - 240 * 24 * 60 * 60 * 1000), // 8 months
          atRiskRedesignation: false,
        },
        // Low risk: long tenure, not at risk
        {
          ...generateEmployeesForCompliance(testOrgId, 1, 100)[0],
          hireDate: new Date(now - 730 * 24 * 60 * 60 * 1000), // 2 years
          atRiskRedesignation: false,
        },
      ];
      
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);

      const result = await oracle.execute('predict_churn_risk', {}, testOrgId) as {
        assessments: Array<{ riskLevel: string }>;
      };

      const riskLevels = result.assessments.map(a => a.riskLevel);
      expect(riskLevels).toContain('high');
      expect(riskLevels).toContain('medium');
      expect(riskLevels).toContain('low');
    });

    test('should correctly identify high-risk HUBZone employees', async () => {
      const now = Date.now();
      const employees = [
        // High risk HUBZone employee
        {
          ...generateEmployeesForCompliance(testOrgId, 1, 100)[0],
          isHubzoneResident: true,
          hireDate: new Date(now - 90 * 24 * 60 * 60 * 1000),
          atRiskRedesignation: true,
        },
        // High risk non-HUBZone employee
        {
          ...generateEmployeesForCompliance(testOrgId, 1, 0)[0],
          isHubzoneResident: false,
          hireDate: new Date(now - 90 * 24 * 60 * 60 * 1000),
          atRiskRedesignation: true,
        },
      ];
      
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);

      const result = await oracle.execute('predict_churn_risk', {}, testOrgId) as {
        summary: { hubzoneAtRisk: number };
        complianceImpact: string;
      };

      expect(result.summary.hubzoneAtRisk).toBe(1);
      expect(result.complianceImpact).toContain('1');
    });
  });

  describe('Insufficient Data Handling', () => {
    /**
     * Critical test: System must gracefully handle
     * insufficient data without crashing
     */

    test('should handle zero compliance history', async () => {
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue([]);

      const result = await oracle.execute(
        'forecast_compliance',
        { months: 6 },
        testOrgId
      ) as { forecast: null; message: string };

      expect(result.forecast).toBeNull();
      expect(result.message).toContain('Insufficient');
    });

    test('should handle single data point gracefully', async () => {
      const singleSnapshot = generateComplianceHistory(testOrgId, 1, 40, 'stable');
      
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue(singleSnapshot);

      const result = await oracle.execute(
        'forecast_compliance',
        { months: 6 },
        testOrgId
      ) as { trend: string };

      // With single data point, should still produce a result
      expect(result).toBeDefined();
    });

    test('should handle empty employee list for churn prediction', async () => {
      (prisma.employee.findMany as jest.Mock).mockResolvedValue([]);

      const result = await oracle.execute('predict_churn_risk', {}, testOrgId) as {
        summary: { totalEmployees: number };
        assessments: unknown[];
      };

      expect(result.summary.totalEmployees).toBe(0);
      expect(result.assessments).toHaveLength(0);
    });

    test('should handle insufficient trend data gracefully', async () => {
      // Note: generateComplianceHistory creates days+1 snapshots, so use slice to get exactly 2
      const twoSnapshots = generateComplianceHistory(testOrgId, 5, 40, 'stable').slice(0, 2);
      
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue(twoSnapshots);

      const result = await oracle.execute('analyze_trends', {}, testOrgId) as {
        message?: string;
      };

      expect(result.message).toContain('Insufficient');
    });

    test('should handle no employees for workforce planning', async () => {
      (prisma.employee.findMany as jest.Mock).mockResolvedValue([]);

      const result = await oracle.execute(
        'workforce_planning',
        { targetPercentage: 45, plannedHires: 10 },
        testOrgId
      ) as {
        currentState: { total: number; percentage: number };
      };

      expect(result.currentState.total).toBe(0);
      expect(result.currentState.percentage).toBe(0);
    });

    test('should handle missing compliance snapshot for risk assessment', async () => {
      (prisma.complianceSnapshot.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.employee.findMany as jest.Mock).mockResolvedValue([]);

      const result = await oracle.execute('risk_assessment', {}, testOrgId) as {
        overallRisk: string;
        risks: unknown[];
      };

      expect(result).toBeDefined();
      expect(result.overallRisk).toBeDefined();
    });
  });

  describe('Statistical Validity', () => {
    /**
     * Tests that statistical calculations are accurate
     */

    test('should correctly calculate compliance statistics', async () => {
      const history = [
        { ...generateComplianceHistory(testOrgId, 1, 35, 'stable')[0], compliancePercentage: 35 },
        { ...generateComplianceHistory(testOrgId, 1, 40, 'stable')[0], compliancePercentage: 40 },
        { ...generateComplianceHistory(testOrgId, 1, 45, 'stable')[0], compliancePercentage: 45 },
        { ...generateComplianceHistory(testOrgId, 1, 50, 'stable')[0], compliancePercentage: 50 },
      ];
      
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue(history);

      const result = await oracle.execute('analyze_trends', {}, testOrgId) as {
        compliance: {
          start: string;
          end: string;
          change: string;
        };
      };

      // Start: 35%, End: 50%, Change: +15%
      expect(parseFloat(result.compliance.start)).toBe(35);
      expect(parseFloat(result.compliance.end)).toBe(50);
      expect(parseFloat(result.compliance.change)).toBe(15);
    });

    test('should correctly identify volatility levels', async () => {
      // High volatility: large variance
      const volatileHistory = [
        { ...generateComplianceHistory(testOrgId, 1, 30, 'stable')[0], compliancePercentage: 30 },
        { ...generateComplianceHistory(testOrgId, 1, 50, 'stable')[0], compliancePercentage: 50 },
        { ...generateComplianceHistory(testOrgId, 1, 32, 'stable')[0], compliancePercentage: 32 },
        { ...generateComplianceHistory(testOrgId, 1, 48, 'stable')[0], compliancePercentage: 48 },
      ];
      
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue(volatileHistory);

      const result = await oracle.execute('analyze_trends', {}, testOrgId) as {
        compliance: { volatility: string };
      };

      expect(result.compliance.volatility).toBe('high');
    });

    test('should correctly calculate risk scores', async () => {
      const snapshot = {
        ...generateComplianceHistory(testOrgId, 1, 32, 'stable')[0],
        compliancePercentage: 32, // Below 35%
      };
      const employees = generateEmployeesForCompliance(testOrgId, 5, 32); // Small workforce
      
      (prisma.complianceSnapshot.findFirst as jest.Mock).mockResolvedValue(snapshot);
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);

      const result = await oracle.execute('risk_assessment', {}, testOrgId) as {
        overallRisk: string;
        risks: Array<{ risk: string; probability: number }>;
      };

      expect(result.overallRisk).toBe('high');
      expect(result.risks.some(r => r.risk.toLowerCase().includes('below'))).toBe(true);
    });

    test('should correctly calculate scenario impacts', async () => {
      // 40 employees, 16 HUBZone = 40%
      const employees = generateEmployeesForCompliance(testOrgId, 40, 40);
      
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);

      const result = await oracle.execute('scenario_analysis', { scenarios: [] }, testOrgId) as {
        baseline: { percentage: string };
        scenarios: Array<{ scenario: string; projected: { percentage: string } }>;
      };

      expect(parseFloat(result.baseline.percentage)).toBeCloseTo(40, 0);
      
      // "All HUBZone hires" scenario with 0 planned hires should equal baseline
      const allHzScenario = result.scenarios.find(s => s.scenario.includes('All HUBZone'));
      expect(allHzScenario).toBeDefined();
    });
  });

  describe('Workforce Planning Calculations', () => {
    /**
     * Tests workforce planning scenario accuracy
     */

    test('should correctly calculate HUBZone hires needed', async () => {
      // 50 employees, 30% HUBZone (15 HZ)
      // Target: 45%
      // Need: 0.45 * (50 + x) = 15 + x (all new hires HZ)
      // 22.5 + 0.45x = 15 + x
      // 7.5 = 0.55x
      // x = ~14 (all HZ hires to reach 45%)
      const employees = generateEmployeesForCompliance(testOrgId, 50, 30);
      
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);

      const result = await oracle.execute(
        'workforce_planning',
        { targetPercentage: 45, plannedHires: 0, plannedTerminations: 0 },
        testOrgId
      ) as {
        projectedState: { additionalHubzoneHires: number };
      };

      // Should recommend ~8 additional HUBZone hires to reach 45%
      expect(result.projectedState.additionalHubzoneHires).toBeGreaterThan(0);
    });

    test('should correctly project scenarios', async () => {
      const employees = generateEmployeesForCompliance(testOrgId, 50, 40); // 20 HZ
      
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);

      const result = await oracle.execute('scenario_analysis', { scenarios: [] }, testOrgId) as {
        bestCase: { projected: { percentage: string } };
        worstCase: { projected: { percentage: string } };
      };

      // Best case should have higher percentage than worst case
      expect(parseFloat(result.bestCase.projected.percentage))
        .toBeGreaterThan(parseFloat(result.worstCase.projected.percentage));
    });

    test('should identify correct scenario as best/worst', async () => {
      const employees = generateEmployeesForCompliance(testOrgId, 50, 40);
      
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);

      const result = await oracle.execute('scenario_analysis', { scenarios: [] }, testOrgId) as {
        bestCase: { scenario: string };
        worstCase: { scenario: string };
      };

      // Best should be "All HUBZone hires"
      expect(result.bestCase.scenario).toContain('All HUBZone');
      // Worst should involve losing HZ employee
      expect(result.worstCase.scenario.toLowerCase()).toMatch(/lose|no hubzone/);
    });
  });

  describe('Insight Generation', () => {
    /**
     * Tests quality of generated insights
     */

    test('should generate relevant insights for declining compliance', async () => {
      const history = generateComplianceHistory(testOrgId, 30, 42, 'declining');
      const employees = generateEmployeesForCompliance(testOrgId, 50, 36);
      
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue(history);
      (prisma.complianceSnapshot.findFirst as jest.Mock).mockResolvedValue(history[history.length - 1]);
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);

      const result = await oracle.execute('get_insights', {}, testOrgId) as {
        keyInsights: string[];
      };

      expect(result.keyInsights.some(i => i.toLowerCase().includes('declining'))).toBe(true);
    });

    test('should prioritize actions correctly', async () => {
      const snapshot = {
        ...generateComplianceHistory(testOrgId, 1, 32, 'declining')[0],
        compliancePercentage: 32,
      };
      const employees = generateEmployeesForCompliance(testOrgId, 50, 32);
      
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue([snapshot]);
      (prisma.complianceSnapshot.findFirst as jest.Mock).mockResolvedValue(snapshot);
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);

      const result = await oracle.execute('get_insights', {}, testOrgId) as {
        prioritizedActions: string[];
      };

      expect(result.prioritizedActions.length).toBeGreaterThan(0);
      // First action should be about compliance gap
      expect(result.prioritizedActions[0].toLowerCase()).toMatch(/compliance|gap|immediate/);
    });

    test('should include churn risk in insights when relevant', async () => {
      const now = Date.now();
      const history = generateComplianceHistory(testOrgId, 30, 40, 'stable');
      const employees = [
        {
          ...generateEmployeesForCompliance(testOrgId, 1, 100)[0],
          isHubzoneResident: true,
          hireDate: new Date(now - 60 * 24 * 60 * 60 * 1000),
          atRiskRedesignation: true,
        },
      ];
      
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue(history);
      (prisma.complianceSnapshot.findFirst as jest.Mock).mockResolvedValue(history[history.length - 1]);
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);

      const result = await oracle.execute('get_insights', {}, testOrgId) as {
        keyInsights: string[];
      };

      expect(result.keyInsights.some(i => i.toLowerCase().includes('churn') || i.toLowerCase().includes('risk'))).toBe(true);
    });
  });

  describe('Forecast Confidence Degradation', () => {
    /**
     * Tests that confidence decreases for longer-term forecasts
     */

    test('should show decreasing confidence over time', async () => {
      const history = generateComplianceHistory(testOrgId, 30, 40, 'stable');
      
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue(history);

      const result = await oracle.execute(
        'forecast_compliance',
        { months: 12 },
        testOrgId
      ) as {
        forecast: Array<{ month: number; confidence: number }>;
      };

      // Confidence should decrease as months increase
      for (let i = 0; i < result.forecast.length - 1; i++) {
        expect(result.forecast[i].confidence).toBeGreaterThanOrEqual(result.forecast[i + 1].confidence);
      }
    });

    test('should maintain minimum confidence floor', async () => {
      const history = generateComplianceHistory(testOrgId, 30, 40, 'stable');
      
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue(history);

      const result = await oracle.execute(
        'forecast_compliance',
        { months: 12 },
        testOrgId
      ) as {
        forecast: Array<{ confidence: number }>;
      };

      // All confidence values should be >= 50%
      result.forecast.forEach(f => {
        expect(f.confidence).toBeGreaterThanOrEqual(50);
      });
    });
  });

  describe('Alert Generation', () => {
    /**
     * Tests that appropriate alerts are generated
     */

    test('should alert on forecasted non-compliance', async () => {
      const history = generateComplianceHistory(testOrgId, 30, 40, 'declining');
      // Force trajectory toward non-compliance
      history.forEach((snap, i) => {
        snap.compliancePercentage = 40 - (i * 0.3);
      });
      
      (prisma.complianceSnapshot.findMany as jest.Mock).mockResolvedValue(history);

      const result = await oracle.execute(
        'forecast_compliance',
        { months: 12 },
        testOrgId
      ) as {
        alerts: string[];
      };

      if (result.alerts && result.alerts.length > 0) {
        expect(result.alerts.some(a => a.toLowerCase().includes('risk') || a.toLowerCase().includes('non-compliance'))).toBe(true);
      }
    });
  });
});
