/**
 * SENTINEL - Compliance Monitor Agent
 * 
 * Continuous 35% residency compliance tracking, early warning system,
 * grace period management, and "attempt to maintain" documentation.
 * 
 * Implements 2025 HUBZone rules per 13 CFR Part 126.
 */

import { PrismaClient, Prisma } from '@prisma/client';

// Compliance status types
export type ComplianceStatus = 'compliant' | 'at_risk' | 'non_compliant' | 'grace_period';

export interface ComplianceResult {
  timestamp: Date;
  totalEmployees: number;
  hubzoneEmployees: number;
  legacyEmployees: number;
  compliancePercentage: number;
  status: ComplianceStatus;
  riskScore: number;
  alerts: ComplianceAlert[];
  recommendations: string[];
  projections: ComplianceProjection;
}

export interface ComplianceAlert {
  severity: 'critical' | 'warning' | 'info';
  type: string;
  title: string;
  description: string;
  actionRequired: boolean;
  suggestedAction?: string;
}

export interface ComplianceProjection {
  days30: number;
  days90: number;
  days180: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface EmployeeComplianceStatus {
  employeeId: string;
  name: string;
  isHubzoneResident: boolean;
  isLegacyEmployee: boolean;
  hubzoneType: string | null;
  meetsResidencyRequirement: boolean;
  lastVerified: Date | null;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  riskFactors: string[];
}

/**
 * SENTINEL Agent - Compliance monitoring and early warning
 */
export class SentinelAgent {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Main execution router
   */
  async execute(
    taskType: string,
    input: Record<string, unknown>,
    organizationId: string
  ): Promise<Record<string, unknown>> {
    console.log(`[SENTINEL] Executing: ${taskType}`);

    switch (taskType) {
      case 'calculate_compliance':
        return await this.calculateCompliance(organizationId) as unknown as Record<string, unknown>;

      case 'check_employee_status':
        return await this.checkEmployeeStatus(
          organizationId,
          input.employeeId as string
        ) as unknown as Record<string, unknown>;

      case 'generate_alerts':
        return await this.generateAlerts(organizationId);

      case 'get_compliance_history':
        return await this.getComplianceHistory(
          organizationId,
          input.days as number || 30
        );

      case 'simulate_hire':
        return await this.simulateHire(
          organizationId,
          input.isHubzoneResident as boolean
        );

      case 'simulate_termination':
        return await this.simulateTermination(
          organizationId,
          input.employeeId as string
        );

      case 'check_grace_period':
        return await this.checkGracePeriod(organizationId);

      default:
        throw new Error(`[SENTINEL] Unknown task type: ${taskType}`);
    }
  }

  /**
   * Calculate current compliance status
   * Per 13 CFR § 126.200: At least 35% of employees must reside in HUBZone
   */
  async calculateCompliance(organizationId: string): Promise<ComplianceResult> {
    console.log(`[SENTINEL] Calculating compliance for org: ${organizationId}`);

    // Fetch all active employees
    const employees = await this.prisma.employee.findMany({
      where: {
        organizationId,
        isActive: true,
      },
    });

    const totalEmployees = employees.length;
    const hubzoneEmployees = employees.filter(e => e.isHubzoneResident).length;
    const legacyEmployees = employees.filter(e => e.isLegacyEmployee).length;

    // Calculate compliance percentage
    const compliancePercentage = totalEmployees > 0
      ? (hubzoneEmployees / totalEmployees) * 100
      : 0;

    // Determine status
    const status = this.determineComplianceStatus(compliancePercentage);

    // Calculate risk score
    const riskScore = this.calculateRiskScore(
      compliancePercentage,
      totalEmployees,
      legacyEmployees
    );

    // Generate alerts
    const alerts = this.buildAlerts(
      compliancePercentage,
      status,
      legacyEmployees,
      totalEmployees,
      employees
    );

    // Generate recommendations
    const recommendations = this.buildRecommendations(
      compliancePercentage,
      status,
      totalEmployees,
      hubzoneEmployees
    );

    // Calculate projections
    const projections = await this.calculateProjections(organizationId, compliancePercentage);

    // Save snapshot to database
    await this.saveComplianceSnapshot(organizationId, {
      totalEmployees,
      hubzoneEmployees,
      compliancePercentage,
      legacyEmployees,
      status,
      riskScore,
      projections,
    });

    // Save critical alerts to database
    await this.saveAlerts(organizationId, alerts);

    console.log(`[SENTINEL] Compliance: ${compliancePercentage.toFixed(1)}% (${status})`);

    return {
      timestamp: new Date(),
      totalEmployees,
      hubzoneEmployees,
      legacyEmployees,
      compliancePercentage,
      status,
      riskScore,
      alerts,
      recommendations,
      projections,
    };
  }

  /**
   * Check individual employee HUBZone status
   */
  async checkEmployeeStatus(
    organizationId: string,
    employeeId: string
  ): Promise<EmployeeComplianceStatus> {
    const employee = await this.prisma.employee.findFirst({
      where: {
        id: employeeId,
        organizationId,
      },
    });

    if (!employee) {
      throw new Error(`Employee not found: ${employeeId}`);
    }

    // Check 90-day residency rule (2025 update)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const meetsResidencyRequirement = employee.residencyStartDate
      ? employee.residencyStartDate <= ninetyDaysAgo
      : true;

    // Identify risk factors
    const riskFactors: string[] = [];
    
    if (!employee.isHubzoneResident) {
      riskFactors.push('Not a HUBZone resident');
    }
    
    if (employee.atRiskRedesignation) {
      riskFactors.push('Located in area at risk of redesignation');
    }
    
    if (!meetsResidencyRequirement) {
      riskFactors.push('Has not met 90-day residency requirement');
    }
    
    if (!employee.lastVerified || this.isStaleVerification(employee.lastVerified)) {
      riskFactors.push('Address verification is stale');
    }

    return {
      employeeId: employee.id,
      name: `${employee.firstName} ${employee.lastName}`,
      isHubzoneResident: employee.isHubzoneResident,
      isLegacyEmployee: employee.isLegacyEmployee,
      hubzoneType: employee.hubzoneType,
      meetsResidencyRequirement,
      lastVerified: employee.lastVerified,
      address: {
        street: employee.streetAddress,
        city: employee.city,
        state: employee.state,
        zip: employee.zipCode,
      },
      riskFactors,
    };
  }

  /**
   * Generate alerts for an organization
   */
  async generateAlerts(organizationId: string): Promise<Record<string, unknown>> {
    const compliance = await this.calculateCompliance(organizationId);
    return {
      alerts: compliance.alerts,
      summary: {
        critical: compliance.alerts.filter(a => a.severity === 'critical').length,
        warning: compliance.alerts.filter(a => a.severity === 'warning').length,
        info: compliance.alerts.filter(a => a.severity === 'info').length,
      },
    };
  }

  /**
   * Get compliance history for trend analysis
   */
  async getComplianceHistory(
    organizationId: string,
    days: number
  ): Promise<Record<string, unknown>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const snapshots = await this.prisma.complianceSnapshot.findMany({
      where: {
        organizationId,
        snapshotDate: { gte: startDate },
      },
      orderBy: { snapshotDate: 'asc' },
    });

    return {
      period: { days, startDate, endDate: new Date() },
      snapshots: snapshots.map(s => ({
        date: s.snapshotDate,
        percentage: s.compliancePercentage,
        status: s.complianceStatus,
        riskScore: s.riskScore,
      })),
      trend: this.calculateTrend(snapshots),
    };
  }

  /**
   * Simulate impact of a new hire
   */
  async simulateHire(
    organizationId: string,
    isHubzoneResident: boolean
  ): Promise<Record<string, unknown>> {
    const employees = await this.prisma.employee.findMany({
      where: { organizationId, isActive: true },
    });

    const currentTotal = employees.length;
    const currentHubzone = employees.filter(e => e.isHubzoneResident).length;
    const currentPercentage = currentTotal > 0 ? (currentHubzone / currentTotal) * 100 : 0;

    const newTotal = currentTotal + 1;
    const newHubzone = isHubzoneResident ? currentHubzone + 1 : currentHubzone;
    const newPercentage = (newHubzone / newTotal) * 100;

    const impact = newPercentage - currentPercentage;

    return {
      simulation: 'new_hire',
      isHubzoneResident,
      current: {
        totalEmployees: currentTotal,
        hubzoneEmployees: currentHubzone,
        compliancePercentage: currentPercentage,
        status: this.determineComplianceStatus(currentPercentage),
      },
      projected: {
        totalEmployees: newTotal,
        hubzoneEmployees: newHubzone,
        compliancePercentage: newPercentage,
        status: this.determineComplianceStatus(newPercentage),
      },
      impact: {
        percentageChange: impact,
        recommendation: this.getHireRecommendation(currentPercentage, newPercentage),
      },
    };
  }

  /**
   * Simulate impact of a termination
   */
  async simulateTermination(
    organizationId: string,
    employeeId: string
  ): Promise<Record<string, unknown>> {
    const employees = await this.prisma.employee.findMany({
      where: { organizationId, isActive: true },
    });

    const employee = employees.find(e => e.id === employeeId);
    if (!employee) {
      throw new Error(`Employee not found: ${employeeId}`);
    }

    const currentTotal = employees.length;
    const currentHubzone = employees.filter(e => e.isHubzoneResident).length;
    const currentPercentage = currentTotal > 0 ? (currentHubzone / currentTotal) * 100 : 0;

    const newTotal = currentTotal - 1;
    const newHubzone = employee.isHubzoneResident ? currentHubzone - 1 : currentHubzone;
    const newPercentage = newTotal > 0 ? (newHubzone / newTotal) * 100 : 0;

    const impact = newPercentage - currentPercentage;

    return {
      simulation: 'termination',
      employee: {
        id: employee.id,
        name: `${employee.firstName} ${employee.lastName}`,
        isHubzoneResident: employee.isHubzoneResident,
      },
      current: {
        totalEmployees: currentTotal,
        hubzoneEmployees: currentHubzone,
        compliancePercentage: currentPercentage,
        status: this.determineComplianceStatus(currentPercentage),
      },
      projected: {
        totalEmployees: newTotal,
        hubzoneEmployees: newHubzone,
        compliancePercentage: newPercentage,
        status: this.determineComplianceStatus(newPercentage),
      },
      impact: {
        percentageChange: impact,
        risk: impact < 0 ? 'Compliance will decrease' : 'Compliance will increase or stay same',
        critical: newPercentage < 35,
      },
    };
  }

  /**
   * Check grace period eligibility and status
   */
  async checkGracePeriod(organizationId: string): Promise<Record<string, unknown>> {
    const latestSnapshot = await this.prisma.complianceSnapshot.findFirst({
      where: { organizationId },
      orderBy: { snapshotDate: 'desc' },
    });

    // Check for active contracts that might qualify for grace period
    // Per 2025 rules: 12-month grace period for HUBZone contract awards

    return {
      gracePeriodActive: latestSnapshot?.gracePeriodActive || false,
      gracePeriodEnd: latestSnapshot?.gracePeriodEnd || null,
      eligibleForGracePeriod: false, // Would check contract awards
      requirements: [
        'Must have been awarded a HUBZone contract',
        'Must have been compliant at time of award',
        'Grace period lasts 12 months from award date',
        'Must demonstrate "attempt to maintain" compliance',
      ],
    };
  }

  // ============ PRIVATE HELPER METHODS ============

  private determineComplianceStatus(percentage: number): ComplianceStatus {
    if (percentage >= 35) {
      return percentage >= 40 ? 'compliant' : 'at_risk';
    }
    return 'non_compliant';
  }

  private calculateRiskScore(
    percentage: number,
    totalEmployees: number,
    legacyCount: number
  ): number {
    let score = 0;

    // Base score from compliance percentage
    if (percentage < 35) score += 50;
    else if (percentage < 40) score += 30;
    else if (percentage < 45) score += 15;
    else score += 5;

    // Small workforce amplifies risk
    if (totalEmployees < 5) score += 20;
    else if (totalEmployees < 10) score += 10;

    // Legacy employees near limit
    if (legacyCount >= 4) score += 15;
    else if (legacyCount >= 3) score += 10;

    return Math.min(100, score);
  }

  private buildAlerts(
    percentage: number,
    status: ComplianceStatus,
    legacyCount: number,
    totalEmployees: number,
    employees: Array<{ isHubzoneResident: boolean; atRiskRedesignation: boolean }>
  ): ComplianceAlert[] {
    const alerts: ComplianceAlert[] = [];

    // Critical: Below 35%
    if (percentage < 35) {
      alerts.push({
        severity: 'critical',
        type: 'compliance_below_threshold',
        title: 'Below HUBZone Compliance Threshold',
        description: `Current compliance is ${percentage.toFixed(1)}%, below the required 35%. Immediate action required.`,
        actionRequired: true,
        suggestedAction: 'Hire HUBZone residents or activate grace period if eligible',
      });
    }

    // Warning: Thin buffer (35-40%)
    if (percentage >= 35 && percentage < 40) {
      alerts.push({
        severity: 'warning',
        type: 'thin_compliance_buffer',
        title: 'Low Compliance Buffer',
        description: `Compliance at ${percentage.toFixed(1)}% is close to the 35% minimum.`,
        actionRequired: false,
        suggestedAction: 'Prioritize HUBZone residents for open positions',
      });
    }

    // Warning: Legacy employees near limit
    if (legacyCount >= 3) {
      alerts.push({
        severity: legacyCount >= 4 ? 'warning' : 'info',
        type: 'legacy_employee_limit',
        title: `Legacy Employees: ${legacyCount}/4`,
        description: legacyCount >= 4
          ? 'Maximum legacy employees reached. Future relocations will reduce compliance.'
          : 'Approaching legacy employee limit.',
        actionRequired: false,
      });
    }

    // Info: Small workforce risk
    if (totalEmployees < 10 && totalEmployees > 0) {
      const impactPerEmployee = (100 / totalEmployees).toFixed(1);
      alerts.push({
        severity: 'info',
        type: 'small_workforce_risk',
        title: 'Small Workforce Compliance Risk',
        description: `With ${totalEmployees} employees, each person represents ${impactPerEmployee}% of compliance.`,
        actionRequired: false,
      });
    }

    // Warning: Employees in at-risk areas
    const atRiskCount = employees.filter(e => e.atRiskRedesignation).length;
    if (atRiskCount > 0) {
      alerts.push({
        severity: 'warning',
        type: 'redesignation_risk',
        title: `${atRiskCount} Employee(s) in At-Risk Areas`,
        description: 'Some employees reside in HUBZone areas that may lose designation.',
        actionRequired: false,
        suggestedAction: 'Monitor SBA HUBZone map updates',
      });
    }

    return alerts;
  }

  private buildRecommendations(
    percentage: number,
    status: ComplianceStatus,
    totalEmployees: number,
    hubzoneEmployees: number
  ): string[] {
    const recommendations: string[] = [];

    if (percentage < 35) {
      const needed = Math.ceil((0.35 * totalEmployees) - hubzoneEmployees + 1);
      recommendations.push(`Hire ${needed} HUBZone resident(s) to reach 35% compliance`);
      recommendations.push('Review grace period eligibility if you have recent HUBZone contract awards');
      recommendations.push('Consider relocation assistance for current employees to HUBZone areas');
    }

    if (percentage >= 35 && percentage < 45) {
      recommendations.push('Build compliance buffer by prioritizing HUBZone residents for open positions');
      recommendations.push('Monitor employees in redesignated areas for potential impact');
    }

    if (percentage >= 45) {
      recommendations.push('Maintain current hiring practices');
      recommendations.push('Document "attempt to maintain" efforts for audit readiness');
    }

    // Universal recommendations
    recommendations.push('Verify all employee addresses are current in the system');
    recommendations.push('Set up quarterly compliance reviews');

    return recommendations;
  }

  private async calculateProjections(
    organizationId: string,
    currentPercentage: number
  ): Promise<ComplianceProjection> {
    // Get historical data for trend calculation
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const history = await this.prisma.complianceSnapshot.findMany({
      where: {
        organizationId,
        snapshotDate: { gte: thirtyDaysAgo },
      },
      orderBy: { snapshotDate: 'asc' },
    });

    // Simple linear projection (would use ML in production)
    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    let monthlyChange = 0;

    if (history.length >= 2) {
      const oldestPercentage = history[0].compliancePercentage;
      monthlyChange = currentPercentage - oldestPercentage;

      if (monthlyChange > 2) trend = 'improving';
      else if (monthlyChange < -2) trend = 'declining';
    }

    return {
      days30: Math.max(0, Math.min(100, currentPercentage + monthlyChange)),
      days90: Math.max(0, Math.min(100, currentPercentage + (monthlyChange * 3))),
      days180: Math.max(0, Math.min(100, currentPercentage + (monthlyChange * 6))),
      trend,
    };
  }

  private async saveComplianceSnapshot(
    organizationId: string,
    data: {
      totalEmployees: number;
      hubzoneEmployees: number;
      compliancePercentage: number;
      legacyEmployees: number;
      status: ComplianceStatus;
      riskScore: number;
      projections: ComplianceProjection;
    }
  ): Promise<void> {
    await this.prisma.complianceSnapshot.create({
      data: {
        organizationId,
        totalEmployees: data.totalEmployees,
        hubzoneEmployees: data.hubzoneEmployees,
        compliancePercentage: data.compliancePercentage,
        legacyEmployeeCount: data.legacyEmployees,
        complianceStatus: data.status,
        riskScore: data.riskScore,
        projections: data.projections as unknown as Prisma.InputJsonValue,
      },
    });
  }

  private async saveAlerts(
    organizationId: string,
    alerts: ComplianceAlert[]
  ): Promise<void> {
    const criticalAlerts = alerts.filter(a => a.severity !== 'info');

    for (const alert of criticalAlerts) {
      await this.prisma.complianceAlert.create({
        data: {
          organizationId,
          severity: alert.severity,
          type: alert.type,
          title: alert.title,
          description: alert.description,
          actionRequired: alert.actionRequired,
          suggestedAction: alert.suggestedAction,
          source: 'sentinel',
        },
      });
    }
  }

  private calculateTrend(
    snapshots: Array<{ compliancePercentage: number }>
  ): 'improving' | 'stable' | 'declining' {
    if (snapshots.length < 2) return 'stable';

    const first = snapshots[0].compliancePercentage;
    const last = snapshots[snapshots.length - 1].compliancePercentage;
    const change = last - first;

    if (change > 2) return 'improving';
    if (change < -2) return 'declining';
    return 'stable';
  }

  private isStaleVerification(lastVerified: Date): boolean {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    return lastVerified < ninetyDaysAgo;
  }

  private getHireRecommendation(current: number, projected: number): string {
    if (projected >= 35 && current < 35) {
      return 'This hire would bring you into compliance!';
    }
    if (projected < 35 && current >= 35) {
      return 'Warning: This hire would drop you below compliance threshold';
    }
    if (projected > current) {
      return 'This hire improves your compliance percentage';
    }
    return 'This hire slightly decreases your compliance percentage';
  }
}
