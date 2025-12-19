/**
 * ORACLE - Predictive Analytics Agent
 * 
 * Compliance forecasting, workforce planning, risk prediction,
 * and trend analysis using ML models.
 */

import { PrismaClient, Prisma } from '@prisma/client';

/**
 * ORACLE Agent - Predictive analytics and forecasting
 */
export class OracleAgent {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async execute(
    taskType: string,
    input: Record<string, unknown>,
    organizationId: string
  ): Promise<Record<string, unknown>> {
    console.log(`[ORACLE] Executing: ${taskType}`);

    switch (taskType) {
      case 'forecast_compliance':
        return await this.forecastCompliance(organizationId, input.months as number || 6);

      case 'predict_churn_risk':
        return await this.predictChurnRisk(organizationId);

      case 'analyze_trends':
        return await this.analyzeTrends(organizationId);

      case 'workforce_planning':
        return await this.workforcePlanning(organizationId, input);

      case 'risk_assessment':
        return await this.riskAssessment(organizationId);

      case 'scenario_analysis':
        return await this.scenarioAnalysis(organizationId, input.scenarios as unknown[]);

      case 'get_insights':
        return await this.getInsights(organizationId);

      default:
        throw new Error(`[ORACLE] Unknown task type: ${taskType}`);
    }
  }

  async forecastCompliance(
    organizationId: string,
    months: number
  ): Promise<Record<string, unknown>> {
    // Get historical data
    const snapshots = await this.prisma.complianceSnapshot.findMany({
      where: { organizationId },
      orderBy: { snapshotDate: 'desc' },
      take: 30,
    });

    if (snapshots.length === 0) {
      return {
        forecast: null,
        message: 'Insufficient historical data for forecasting',
        recommendation: 'Run SENTINEL compliance checks regularly to build history',
      };
    }

    // Ensure proper sorting (newest first) - mock might not honor orderBy
    snapshots.sort((a, b) => b.snapshotDate.getTime() - a.snapshotDate.getTime());

    const current = snapshots[0].compliancePercentage;

    // Simple linear projection (ML model in production)
    const trend = this.calculateTrend(snapshots.map(s => s.compliancePercentage));

    const forecast = [];
    for (let i = 1; i <= months; i++) {
      const projected = Math.max(0, Math.min(100, current + (trend * i)));
      forecast.push({
        month: i,
        projected: projected.toFixed(1),
        confidence: Math.max(50, 95 - (i * 5)),
        status: projected >= 35 ? 'compliant' : 'at_risk',
      });
    }

    const riskMonth = forecast.findIndex(f => f.status === 'at_risk');

    return {
      currentCompliance: current,
      // Lower threshold (0.2) to detect meaningful trends accurately
      // Average daily change: >0.2 = improving, <-0.2 = declining
      trend: trend > 0.2 ? 'improving' : trend < -0.2 ? 'declining' : 'stable',
      monthlyChange: trend.toFixed(2),
      forecast,
      alerts: riskMonth >= 0 ? [`Risk of non-compliance in month ${riskMonth + 1}`] : [],
      recommendations: this.getForecastRecommendations(current, trend),
    };
  }

  async predictChurnRisk(organizationId: string): Promise<Record<string, unknown>> {
    const employees = await this.prisma.employee.findMany({
      where: { organizationId, isActive: true },
    });

    const riskAssessments = employees.map(emp => {
      let riskScore = 0;
      const factors: string[] = [];

      // Tenure risk
      const tenureMonths = Math.floor(
        (Date.now() - emp.hireDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
      );
      if (tenureMonths < 6) {
        riskScore += 30;
        factors.push('New employee (<6 months)');
      } else if (tenureMonths < 12) {
        riskScore += 15;
        factors.push('Less than 1 year tenure');
      }

      // Redesignation risk
      if (emp.atRiskRedesignation) {
        riskScore += 25;
        factors.push('In redesignation risk area');
      }

      return {
        id: emp.id,
        name: `${emp.firstName} ${emp.lastName}`,
        isHubzoneResident: emp.isHubzoneResident,
        riskScore,
        // Adjusted thresholds: high >= 35, medium >= 10, low < 10
        riskLevel: riskScore >= 35 ? 'high' : riskScore >= 10 ? 'medium' : 'low',
        factors,
      };
    });

    const highRisk = riskAssessments.filter(r => r.riskLevel === 'high');
    const highRiskHubzone = highRisk.filter(r => r.isHubzoneResident);

    return {
      summary: {
        totalEmployees: employees.length,
        highRisk: highRisk.length,
        mediumRisk: riskAssessments.filter(r => r.riskLevel === 'medium').length,
        hubzoneAtRisk: highRiskHubzone.length,
      },
      complianceImpact: highRiskHubzone.length > 0
        ? `${highRiskHubzone.length} HUBZone resident(s) at churn risk`
        : 'No significant compliance impact predicted',
      assessments: riskAssessments.sort((a, b) => b.riskScore - a.riskScore),
      recommendations: this.getChurnRecommendations(highRiskHubzone.length),
    };
  }

  async analyzeTrends(organizationId: string): Promise<Record<string, unknown>> {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const snapshots = await this.prisma.complianceSnapshot.findMany({
      where: { organizationId, snapshotDate: { gte: sixMonthsAgo } },
      orderBy: { snapshotDate: 'asc' },
    });

    if (snapshots.length < 3) {
      return { message: 'Insufficient data for trend analysis' };
    }

    const percentages = snapshots.map(s => s.compliancePercentage);
    const employees = snapshots.map(s => s.totalEmployees);

    return {
      period: '6 months',
      compliance: {
        start: percentages[0].toFixed(1),
        end: percentages[percentages.length - 1].toFixed(1),
        change: (percentages[percentages.length - 1] - percentages[0]).toFixed(1),
        trend: this.getTrendDirection(percentages),
        volatility: this.calculateVolatility(percentages),
      },
      workforce: {
        start: employees[0],
        end: employees[employees.length - 1],
        netChange: employees[employees.length - 1] - employees[0],
        trend: this.getTrendDirection(employees),
      },
      insights: this.generateTrendInsights(percentages, employees),
    };
  }

  async workforcePlanning(
    organizationId: string,
    input: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const employees = await this.prisma.employee.findMany({
      where: { organizationId, isActive: true },
    });

    const current = {
      total: employees.length,
      hubzone: employees.filter(e => e.isHubzoneResident).length,
      percentage: 0,
    };
    current.percentage = current.total > 0 ? (current.hubzone / current.total) * 100 : 0;

    const targetPercentage = input.targetPercentage as number || 45;
    const plannedHires = input.plannedHires as number || 0;
    const plannedTerminations = input.plannedTerminations as number || 0;

    // Calculate hiring requirements
    const futureTotal = current.total + plannedHires - plannedTerminations;
    const requiredHubzone = Math.ceil((targetPercentage / 100) * futureTotal);
    const additionalHubzoneNeeded = Math.max(0, requiredHubzone - current.hubzone);

    return {
      currentState: current,
      target: { percentage: targetPercentage, compliance: targetPercentage >= 35 },
      plannedChanges: { hires: plannedHires, terminations: plannedTerminations },
      projectedState: {
        total: futureTotal,
        minHubzoneNeeded: requiredHubzone,
        additionalHubzoneHires: additionalHubzoneNeeded,
      },
      scenarios: [
        {
          name: 'All HUBZone hires',
          hubzonePercentage: futureTotal > 0
            ? ((current.hubzone + plannedHires) / futureTotal) * 100
            : 0,
        },
        {
          name: 'No HUBZone hires',
          hubzonePercentage: futureTotal > 0
            ? (current.hubzone / futureTotal) * 100
            : 0,
        },
        {
          name: '50% HUBZone hires',
          hubzonePercentage: futureTotal > 0
            ? ((current.hubzone + Math.floor(plannedHires / 2)) / futureTotal) * 100
            : 0,
        },
      ],
      recommendation: additionalHubzoneNeeded > 0
        ? `Prioritize ${additionalHubzoneNeeded} HUBZone resident hire(s)`
        : 'Current hiring plan maintains compliance',
    };
  }

  async riskAssessment(organizationId: string): Promise<Record<string, unknown>> {
    const [snapshot, employees] = await Promise.all([
      this.prisma.complianceSnapshot.findFirst({
        where: { organizationId },
        orderBy: { snapshotDate: 'desc' },
      }),
      this.prisma.employee.findMany({
        where: { organizationId, isActive: true },
      }),
    ]);

    const risks: Array<{
      category: string;
      risk: string;
      probability: number;
      impact: string;
      mitigation: string;
    }> = [];

    // Compliance risk
    const percentage = snapshot?.compliancePercentage || 0;
    if (percentage < 35) {
      risks.push({
        category: 'Compliance',
        risk: 'Currently below 35% threshold',
        probability: 100,
        impact: 'HUBZone certification at risk',
        mitigation: 'Immediate hiring of HUBZone residents',
      });
    } else if (percentage < 40) {
      risks.push({
        category: 'Compliance',
        risk: 'Thin compliance buffer',
        probability: 60,
        impact: 'Single departure could cause non-compliance',
        mitigation: 'Build buffer through HUBZone hiring',
      });
    }

    // Small workforce risk
    if (employees.length < 10) {
      risks.push({
        category: 'Workforce',
        risk: 'Small workforce volatility',
        probability: 50,
        impact: 'Each employee change significantly affects compliance',
        mitigation: 'Grow workforce or maintain higher compliance buffer',
      });
    }

    // Redesignation risk
    const atRiskCount = employees.filter(e => e.atRiskRedesignation).length;
    if (atRiskCount > 0) {
      risks.push({
        category: 'Geospatial',
        risk: `${atRiskCount} employee(s) in redesignation risk areas`,
        probability: 30,
        impact: 'Map changes could reduce HUBZone employee count',
        mitigation: 'Monitor SBA map updates, plan contingencies',
      });
    }

    const overallRisk = risks.length === 0 ? 'low' :
      risks.some(r => r.probability >= 80) ? 'high' : 'medium';

    return {
      assessmentDate: new Date(),
      overallRisk,
      riskCount: risks.length,
      risks,
      recommendations: risks.length > 0
        ? risks.map(r => r.mitigation)
        : ['Maintain current practices'],
    };
  }

  async scenarioAnalysis(
    organizationId: string,
    scenarios: unknown[]
  ): Promise<Record<string, unknown>> {
    const employees = await this.prisma.employee.findMany({
      where: { organizationId, isActive: true },
    });

    const current = {
      total: employees.length,
      hubzone: employees.filter(e => e.isHubzoneResident).length,
    };
    const currentPercentage = current.total > 0 ? (current.hubzone / current.total) * 100 : 0;

    // Default scenarios if none provided
    const defaultScenarios = [
      { name: 'All HUBZone hires (+2)', hubzoneHires: 2, otherHires: 0, terminations: 0 },
      { name: 'Mixed hires (1 HZ + 1 non-HZ)', hubzoneHires: 1, otherHires: 1, terminations: 0 },
      { name: 'Lose 1 HUBZone resident', hubzoneHires: 0, otherHires: 0, terminations: 1, hubzoneTermination: true },
      { name: 'No HUBZone hires (+3 non-HZ)', hubzoneHires: 0, otherHires: 3, terminations: 0 },
    ];

    const analyzedScenarios = defaultScenarios.map(scenario => {
      const newTotal = current.total + scenario.hubzoneHires + scenario.otherHires - scenario.terminations;
      const hubzoneChange = scenario.hubzoneHires - (scenario.hubzoneTermination ? scenario.terminations : 0);
      const newHubzone = current.hubzone + hubzoneChange;
      const newPercentage = newTotal > 0 ? (newHubzone / newTotal) * 100 : 0;

      return {
        scenario: scenario.name,
        current: { total: current.total, hubzone: current.hubzone, percentage: currentPercentage.toFixed(1) },
        projected: { total: newTotal, hubzone: newHubzone, percentage: newPercentage.toFixed(1) },
        change: (newPercentage - currentPercentage).toFixed(1),
        compliant: newPercentage >= 35,
        risk: newPercentage < 35 ? 'high' : newPercentage < 40 ? 'medium' : 'low',
      };
    });

    return {
      baseline: { ...current, percentage: currentPercentage.toFixed(1) },
      scenarios: analyzedScenarios,
      bestCase: analyzedScenarios.reduce((best, s) =>
        parseFloat(s.projected.percentage) > parseFloat(best.projected.percentage) ? s : best
      ),
      worstCase: analyzedScenarios.reduce((worst, s) =>
        parseFloat(s.projected.percentage) < parseFloat(worst.projected.percentage) ? s : worst
      ),
    };
  }

  async getInsights(organizationId: string): Promise<Record<string, unknown>> {
    const [forecast, churn, trends, risks] = await Promise.all([
      this.forecastCompliance(organizationId, 3),
      this.predictChurnRisk(organizationId),
      this.analyzeTrends(organizationId),
      this.riskAssessment(organizationId),
    ]);

    return {
      generatedAt: new Date(),
      summary: {
        complianceTrend: (forecast as Record<string, unknown>).trend,
        churnRisk: (churn as Record<string, unknown>).summary,
        overallRisk: (risks as Record<string, unknown>).overallRisk,
      },
      keyInsights: this.generateKeyInsights(forecast, churn, trends, risks),
      prioritizedActions: this.prioritizeActions(forecast, churn, risks),
    };
  }

  // ============ PRIVATE HELPER METHODS ============

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    const changes = [];
    for (let i = 1; i < values.length; i++) {
      changes.push(values[i - 1] - values[i]); // Reversed because sorted desc
    }
    return changes.reduce((a, b) => a + b, 0) / changes.length;
  }

  private getTrendDirection(values: number[]): string {
    if (values.length < 2) return 'stable';
    const change = values[values.length - 1] - values[0];
    if (change > 2) return 'improving';
    if (change < -2) return 'declining';
    return 'stable';
  }

  private calculateVolatility(values: number[]): string {
    if (values.length < 2) return 'low';
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    if (stdDev > 5) return 'high';
    if (stdDev > 2) return 'medium';
    return 'low';
  }

  private getForecastRecommendations(current: number, trend: number): string[] {
    const recommendations: string[] = [];
    if (current < 35) {
      recommendations.push('URGENT: Implement immediate hiring plan for HUBZone residents');
    } else if (current < 40) {
      recommendations.push('Build compliance buffer through targeted hiring');
    }
    if (trend < -0.5) {
      recommendations.push('Address declining trend - review hiring and retention');
    }
    if (recommendations.length === 0) {
      recommendations.push('Maintain current hiring practices');
    }
    return recommendations;
  }

  private getChurnRecommendations(hubzoneAtRisk: number): string[] {
    if (hubzoneAtRisk === 0) return ['Continue standard retention practices'];
    return [
      `Focus retention on ${hubzoneAtRisk} at-risk HUBZone employee(s)`,
      'Consider retention incentives for critical staff',
      'Proactively recruit backup HUBZone candidates',
    ];
  }

  private generateTrendInsights(percentages: number[], employees: number[]): string[] {
    const insights: string[] = [];
    const complianceChange = percentages[percentages.length - 1] - percentages[0];
    const employeeChange = employees[employees.length - 1] - employees[0];

    if (complianceChange > 5) {
      insights.push('Strong compliance improvement over period');
    } else if (complianceChange < -5) {
      insights.push('Significant compliance decline - investigate causes');
    }

    if (employeeChange > 5) {
      insights.push('Rapid workforce growth - monitor compliance impact');
    }

    return insights;
  }

  private generateKeyInsights(
    forecast: Record<string, unknown>,
    churn: Record<string, unknown>,
    trends: Record<string, unknown>,
    risks: Record<string, unknown>
  ): string[] {
    const insights: string[] = [];

    if (forecast.trend === 'declining') {
      insights.push('Compliance is declining - immediate action needed');
    }

    const summary = churn.summary as Record<string, number>;
    if (summary?.hubzoneAtRisk > 0) {
      insights.push(`${summary.hubzoneAtRisk} HUBZone employee(s) at churn risk`);
    }

    if (risks.overallRisk === 'high') {
      insights.push('High overall risk level - prioritize mitigation');
    }

    return insights;
  }

  private prioritizeActions(
    forecast: Record<string, unknown>,
    churn: Record<string, unknown>,
    risks: Record<string, unknown>
  ): string[] {
    const actions: Array<{ action: string; priority: number }> = [];

    if (risks.overallRisk === 'high') {
      actions.push({ action: 'Address compliance gap immediately', priority: 1 });
    }

    const riskList = risks.risks as Array<{ mitigation: string }>;
    if (riskList?.length > 0) {
      actions.push({ action: riskList[0].mitigation, priority: 2 });
    }

    actions.push({ action: 'Schedule weekly compliance monitoring', priority: 3 });

    return actions.sort((a, b) => a.priority - b.priority).map(a => a.action);
  }
}
