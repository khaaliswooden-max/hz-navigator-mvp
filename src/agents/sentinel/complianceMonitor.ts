/**
 * SENTINEL - Compliance Monitor Agent
 * 
 * Continuous 35% residency compliance tracking, early warning system,
 * and "attempt to maintain" documentation (2025 HUBZone rules).
 */

import { PrismaClient } from '@prisma/client';

export interface ComplianceResult {
  timestamp: Date;
  totalEmployees: number;
  hubzoneEmployees: number;
  legacyEmployees: number;
  compliancePercentage: number;
  status: 'compliant' | 'at_risk' | 'non_compliant' | 'grace_period';
  alerts: ComplianceAlert[];
  recommendations: string[];
}

export interface ComplianceAlert {
  severity: 'critical' | 'warning' | 'info';
  type: string;
  title: string;
  description: string;
  actionRequired: boolean;
}

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
    switch (taskType) {
      case 'calculate_compliance':
        return await this.calculateCompliance(organizationId) as unknown as Record<string, unknown>;
      
      case 'check_employee_status':
        return await this.checkEmployeeStatus(organizationId, input.employeeId as string) as unknown as Record<string, unknown>;
      
      case 'generate_alerts':
        return await this.generateAlerts(organizationId) as unknown as Record<string, unknown>;
      
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
    
    // Per 2025 rules: Legacy employees count toward the 35% (max 4)
    const effectiveHubzoneCount = hubzoneEmployees; // Legacy already included if isHubzoneResident
    
    const compliancePercentage = totalEmployees > 0 
      ? (effectiveHubzoneCount / totalEmployees) * 100 
      : 0;

    // Determine status
    let status: ComplianceResult['status'] = 'compliant';
    if (compliancePercentage < 35) {
      status = 'non_compliant';
      // TODO: Check for active grace period
    } else if (compliancePercentage < 40) {
      status = 'at_risk';
    }

    // Generate alerts based on current state
    const alerts = this.buildAlerts(compliancePercentage, status, legacyEmployees, totalEmployees);
    
    // Generate recommendations
    const recommendations = this.buildRecommendations(compliancePercentage, status, totalEmployees, hubzoneEmployees);

    // Save snapshot to database
    await this.prisma.complianceSnapshot.create({
      data: {
        organizationId,
        totalEmployees,
        hubzoneEmployees: effectiveHubzoneCount,
        compliancePercentage,
        legacyEmployeeCount: legacyEmployees,
        complianceStatus: status,
        riskScore: this.calculateRiskScore(compliancePercentage, status, alerts),
        projections: {
          days30: Math.max(0, compliancePercentage - 0.5),
          days90: Math.max(0, compliancePercentage - 1.5),
          days180: Math.max(0, compliancePercentage - 3),
        },
      },
    });

    // Save any critical/warning alerts to database
    for (const alert of alerts.filter(a => a.severity !== 'info')) {
      await this.prisma.complianceAlert.create({
        data: {
          organizationId,
          severity: alert.severity,
          type: alert.type,
          title: alert.title,
          description: alert.description,
          actionRequired: alert.actionRequired,
          source: 'sentinel',
        },
      });
    }

    console.log(`[SENTINEL] Compliance: ${compliancePercentage.toFixed(1)}% (${status})`);

    return {
      timestamp: new Date(),
      totalEmployees,
      hubzoneEmployees: effectiveHubzoneCount,
      legacyEmployees,
      compliancePercentage,
      status,
      alerts,
      recommendations,
    };
  }

  /**
   * Check individual employee HUBZone status
   */
  async checkEmployeeStatus(organizationId: string, employeeId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { 
        id: employeeId,
        organizationId,
      },
    });

    if (!employee) {
      throw new Error(`Employee not found: ${employeeId}`);
    }

    // Check 90-day residency rule (2025 update: reduced from 180 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const meetsResidencyRequirement = employee.residencyStartDate 
      ? employee.residencyStartDate <= ninetyDaysAgo 
      : true; // If no start date, assume they qualify

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
    };
  }

  /**
   * Generate alerts for an organization
   */
  async generateAlerts(organizationId: string) {
    const compliance = await this.calculateCompliance(organizationId);
    return { alerts: compliance.alerts };
  }

  /**
   * Build alerts based on compliance state
   */
  private buildAlerts(
    percentage: number,
    status: string,
    legacyCount: number,
    totalEmployees: number
  ): ComplianceAlert[] {
    const alerts: ComplianceAlert[] = [];

    // Critical: Below 35% without grace period
    if (percentage < 35) {
      alerts.push({
        severity: 'critical',
        type: 'compliance_below_threshold',
        title: 'Below HUBZone Compliance Threshold',
        description: `Current compliance is ${percentage.toFixed(1)}%, below the required 35%. Immediate action required.`,
        actionRequired: true,
      });
    }

    // Warning: Thin buffer (35-40%)
    if (percentage >= 35 && percentage < 40) {
      alerts.push({
        severity: 'warning',
        type: 'thin_compliance_buffer',
        title: 'Low Compliance Buffer',
        description: `Compliance at ${percentage.toFixed(1)}% is close to the 35% minimum. Consider hiring HUBZone residents.`,
        actionRequired: false,
      });
    }

    // Warning: Legacy employees near limit (per 2025 rules: max 4)
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

    // Info: Small workforce amplifies risk
    if (totalEmployees < 10 && totalEmployees > 0) {
      const impactPerEmployee = (100 / totalEmployees).toFixed(1);
      alerts.push({
        severity: 'info',
        type: 'small_workforce_risk',
        title: 'Small Workforce Compliance Risk',
        description: `With ${totalEmployees} employees, each person represents ${impactPerEmployee}% of compliance. One departure could be significant.`,
        actionRequired: false,
      });
    }

    return alerts;
  }

  /**
   * Build actionable recommendations
   */
  private buildRecommendations(
    percentage: number,
    status: string,
    totalEmployees: number,
    hubzoneEmployees: number
  ): string[] {
    const recommendations: string[] = [];

    if (percentage < 35) {
      const needed = Math.ceil((0.35 * totalEmployees) - hubzoneEmployees);
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

    // Always recommend
    recommendations.push('Verify all employee addresses are current in the system');

    return recommendations;
  }

  /**
   * Calculate overall risk score (0-100, higher = more risk)
   */
  private calculateRiskScore(
    percentage: number,
    status: string,
    alerts: ComplianceAlert[]
  ): number {
    let score = 0;

    // Base score from compliance percentage
    if (percentage < 35) score += 50;
    else if (percentage < 40) score += 30;
    else if (percentage < 45) score += 15;
    else score += 5;

    // Add for alerts
    score += alerts.filter(a => a.severity === 'critical').length * 20;
    score += alerts.filter(a => a.severity === 'warning').length * 10;

    return Math.min(100, score);
  }
}
