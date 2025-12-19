/**
 * WORKFORCE - Employee Intelligence Agent
 *
 * Employee lifecycle management, residency tracking, and hiring optimization.
 * Ensures HUBZone compliance through intelligent workforce decisions.
 *
 * Key Responsibilities:
 * - Employee roster management
 * - Residency verification coordination
 * - Hire/termination impact analysis
 * - 90-day residency tracking
 * - Legacy employee management
 */

import { PrismaClient, Prisma } from '@prisma/client';

export interface EmployeeRecord {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  hireDate: Date;
  isActive: boolean;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  hubzoneStatus: {
    isResident: boolean;
    type?: string;
    isLegacy: boolean;
    lastVerified?: Date;
    atRisk: boolean;
  };
}

export interface HiringRecommendation {
  targetCount: number;
  hubzoneRequired: boolean;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  recommendations: string[];
  optimalLocations?: string[];
}

export class WorkforceAgent {
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
      case 'get_roster':
        return await this.getRoster(organizationId) as Record<string, unknown>;

      case 'add_employee':
        return await this.addEmployee(organizationId, input as Record<string, unknown>) as Record<string, unknown>;

      case 'update_employee':
        return await this.updateEmployee(
          input.employeeId as string,
          input.updates as Record<string, unknown>
        ) as Record<string, unknown>;

      case 'terminate_employee':
        return await this.terminateEmployee(
          organizationId,
          input.employeeId as string,
          input.reason as string
        ) as Record<string, unknown>;

      case 'get_hiring_recommendations':
        return await this.getHiringRecommendations(organizationId) as Record<string, unknown>;

      case 'analyze_workforce':
        return await this.analyzeWorkforce(organizationId) as Record<string, unknown>;

      case 'check_residency_requirements':
        return await this.checkResidencyRequirements(organizationId) as Record<string, unknown>;

      case 'get_legacy_employees':
        return await this.getLegacyEmployees(organizationId) as Record<string, unknown>;

      case 'promote_to_legacy':
        return await this.promoteToLegacy(
          organizationId,
          input.employeeId as string
        ) as Record<string, unknown>;

      case 'get_at_risk_employees':
        return await this.getAtRiskEmployees(organizationId) as Record<string, unknown>;

      default:
        throw new Error(`[WORKFORCE] Unknown task type: ${taskType}`);
    }
  }

  /**
   * Get full employee roster
   */
  async getRoster(organizationId: string) {
    const employees = await this.prisma.employee.findMany({
      where: { organizationId },
      orderBy: [{ isActive: 'desc' }, { lastName: 'asc' }],
    });

    const roster: EmployeeRecord[] = employees.map((e) => ({
      id: e.id,
      firstName: e.firstName,
      lastName: e.lastName,
      email: e.email || undefined,
      hireDate: e.hireDate,
      isActive: e.isActive,
      address: {
        street: e.streetAddress,
        city: e.city,
        state: e.state,
        zip: e.zipCode,
      },
      hubzoneStatus: {
        isResident: e.isHubzoneResident,
        type: e.hubzoneType || undefined,
        isLegacy: e.isLegacyEmployee,
        lastVerified: e.lastVerified || undefined,
        atRisk: e.atRiskRedesignation || false,
      },
    }));

    const stats = {
      total: employees.length,
      active: employees.filter((e) => e.isActive).length,
      hubzoneResidents: employees.filter((e) => e.isActive && e.isHubzoneResident).length,
      legacyEmployees: employees.filter((e) => e.isActive && e.isLegacyEmployee).length,
      atRisk: employees.filter((e) => e.isActive && e.atRiskRedesignation).length,
    };

    return { roster, stats };
  }

  /**
   * Add new employee
   */
  async addEmployee(organizationId: string, data: Record<string, unknown>) {
    // Validate required fields
    const required = ['firstName', 'lastName', 'streetAddress', 'city', 'state', 'zipCode'];
    for (const field of required) {
      if (!data[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Create employee
    const employee = await this.prisma.employee.create({
      data: {
        organizationId,
        firstName: data.firstName as string,
        lastName: data.lastName as string,
        email: data.email as string | undefined,
        hireDate: data.hireDate ? new Date(data.hireDate as string) : new Date(),
        streetAddress: data.streetAddress as string,
        city: data.city as string,
        state: data.state as string,
        zipCode: data.zipCode as string,
        isHubzoneResident: (data.isHubzoneResident as boolean) || false,
        hubzoneType: data.hubzoneType as string | undefined,
        residencyStartDate: data.residencyStartDate
          ? new Date(data.residencyStartDate as string)
          : new Date(),
      },
    });

    // Calculate compliance impact
    const impact = await this.calculateHireImpact(organizationId, employee.isHubzoneResident);

    return {
      employee: {
        id: employee.id,
        name: `${employee.firstName} ${employee.lastName}`,
      },
      impact,
      message: 'Employee added successfully',
    };
  }

  /**
   * Update employee record
   */
  async updateEmployee(employeeId: string, updates: Record<string, unknown>) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new Error(`Employee not found: ${employeeId}`);
    }

    const updateData: Record<string, unknown> = {};

    // Map allowed updates
    const allowedFields = [
      'firstName', 'lastName', 'email', 'streetAddress', 'city', 'state', 'zipCode',
      'isHubzoneResident', 'hubzoneType', 'isLegacyEmployee', 'isActive',
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }

    // If address changed, clear verification
    if (updates.streetAddress || updates.city || updates.state || updates.zipCode) {
      updateData.lastVerified = null;
      updateData.isHubzoneResident = false;
      updateData.hubzoneType = null;
    }

    const updated = await this.prisma.employee.update({
      where: { id: employeeId },
      data: updateData as Prisma.EmployeeUpdateInput,
    });

    return {
      employee: {
        id: updated.id,
        name: `${updated.firstName} ${updated.lastName}`,
      },
      updated: Object.keys(updateData),
      message: 'Employee updated successfully',
    };
  }

  /**
   * Terminate employee
   */
  async terminateEmployee(
    organizationId: string,
    employeeId: string,
    reason: string
  ) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId },
    });

    if (!employee) {
      throw new Error(`Employee not found: ${employeeId}`);
    }

    // Calculate impact before termination
    const impact = await this.calculateTerminationImpact(organizationId, employee);

    // Mark as inactive
    await this.prisma.employee.update({
      where: { id: employeeId },
      data: { isActive: false },
    });

    return {
      employee: {
        id: employee.id,
        name: `${employee.firstName} ${employee.lastName}`,
        wasHubzoneResident: employee.isHubzoneResident,
      },
      impact,
      reason,
      message: 'Employee terminated successfully',
    };
  }

  /**
   * Get hiring recommendations to maintain/improve compliance
   */
  async getHiringRecommendations(organizationId: string): Promise<{ recommendations: HiringRecommendation }> {
    const employees = await this.prisma.employee.findMany({
      where: { organizationId, isActive: true },
    });

    const total = employees.length;
    const hubzone = employees.filter((e) => e.isHubzoneResident).length;
    const percentage = total > 0 ? (hubzone / total) * 100 : 0;

    let targetCount = 0;
    let hubzoneRequired = false;
    let urgency: HiringRecommendation['urgency'] = 'low';
    const recommendations: string[] = [];

    if (percentage < 35) {
      // Need to hire HUBZone residents to get compliant
      const neededForCompliance = Math.ceil((0.35 * total - hubzone) / (1 - 0.35));
      targetCount = neededForCompliance;
      hubzoneRequired = true;
      urgency = 'critical';
      recommendations.push(
        `Hire ${neededForCompliance} HUBZone resident(s) to reach 35% compliance`
      );
      recommendations.push('Focus recruitment in HUBZone areas');
      recommendations.push('Consider relocation incentives for current employees');
    } else if (percentage < 40) {
      // Build buffer
      targetCount = 2;
      hubzoneRequired = true;
      urgency = 'medium';
      recommendations.push('Hire HUBZone residents to build compliance buffer');
      recommendations.push('Current compliance buffer is thin');
    } else if (percentage < 50) {
      urgency = 'low';
      recommendations.push('Prioritize HUBZone residents for open positions');
      recommendations.push('Maintain current compliance level');
    } else {
      recommendations.push('Compliance is healthy');
      recommendations.push('Can hire non-HUBZone residents if needed');
    }

    return {
      recommendations: {
        targetCount,
        hubzoneRequired,
        urgency,
        recommendations,
      },
    };
  }

  /**
   * Analyze workforce composition
   */
  async analyzeWorkforce(organizationId: string) {
    const employees = await this.prisma.employee.findMany({
      where: { organizationId, isActive: true },
    });

    const total = employees.length;
    const hubzone = employees.filter((e) => e.isHubzoneResident).length;
    const legacy = employees.filter((e) => e.isLegacyEmployee).length;
    const atRisk = employees.filter((e) => e.atRiskRedesignation).length;

    // Calculate tenure distribution
    const now = new Date();
    const tenureDistribution = {
      under1Year: 0,
      oneToThreeYears: 0,
      threeToFiveYears: 0,
      overFiveYears: 0,
    };

    for (const emp of employees) {
      const years = (now.getTime() - emp.hireDate.getTime()) / (365 * 24 * 60 * 60 * 1000);
      if (years < 1) tenureDistribution.under1Year++;
      else if (years < 3) tenureDistribution.oneToThreeYears++;
      else if (years < 5) tenureDistribution.threeToFiveYears++;
      else tenureDistribution.overFiveYears++;
    }

    // HUBZone type breakdown
    const hubzoneTypes: Record<string, number> = {};
    for (const emp of employees.filter((e) => e.isHubzoneResident && e.hubzoneType)) {
      hubzoneTypes[emp.hubzoneType!] = (hubzoneTypes[emp.hubzoneType!] || 0) + 1;
    }

    // State distribution
    const stateDistribution: Record<string, number> = {};
    for (const emp of employees) {
      stateDistribution[emp.state] = (stateDistribution[emp.state] || 0) + 1;
    }

    return {
      summary: {
        total,
        hubzoneResidents: hubzone,
        nonHubzoneResidents: total - hubzone,
        legacyEmployees: legacy,
        atRiskEmployees: atRisk,
        compliancePercentage: total > 0 ? (hubzone / total) * 100 : 0,
      },
      tenureDistribution,
      hubzoneTypes,
      stateDistribution,
      insights: this.generateWorkforceInsights(total, hubzone, legacy, atRisk),
    };
  }

  /**
   * Check 90-day residency requirements
   */
  async checkResidencyRequirements(organizationId: string) {
    const employees = await this.prisma.employee.findMany({
      where: { organizationId, isActive: true, isHubzoneResident: true },
    });

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const qualified: string[] = [];
    const pending: Array<{ id: string; name: string; daysRemaining: number }> = [];

    for (const emp of employees) {
      if (!emp.residencyStartDate || emp.residencyStartDate <= ninetyDaysAgo) {
        qualified.push(emp.id);
      } else {
        const daysRemaining = Math.ceil(
          (emp.residencyStartDate.getTime() - ninetyDaysAgo.getTime()) / (24 * 60 * 60 * 1000)
        );
        pending.push({
          id: emp.id,
          name: `${emp.firstName} ${emp.lastName}`,
          daysRemaining,
        });
      }
    }

    return {
      qualified: qualified.length,
      pending: pending.length,
      pendingDetails: pending,
      message: pending.length > 0
        ? `${pending.length} employee(s) pending 90-day residency qualification`
        : 'All HUBZone residents meet residency requirements',
    };
  }

  /**
   * Get legacy employees
   */
  async getLegacyEmployees(organizationId: string) {
    const employees = await this.prisma.employee.findMany({
      where: { organizationId, isActive: true, isLegacyEmployee: true },
    });

    return {
      count: employees.length,
      maxAllowed: 4,
      remaining: Math.max(0, 4 - employees.length),
      employees: employees.map((e) => ({
        id: e.id,
        name: `${e.firstName} ${e.lastName}`,
        hireDate: e.hireDate,
      })),
    };
  }

  /**
   * Promote employee to legacy status
   */
  async promoteToLegacy(organizationId: string, employeeId: string) {
    // Check current legacy count
    const currentLegacy = await this.prisma.employee.count({
      where: { organizationId, isActive: true, isLegacyEmployee: true },
    });

    if (currentLegacy >= 4) {
      throw new Error('Maximum legacy employees (4) already reached');
    }

    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId },
    });

    if (!employee) {
      throw new Error(`Employee not found: ${employeeId}`);
    }

    if (employee.isLegacyEmployee) {
      throw new Error('Employee is already a legacy employee');
    }

    await this.prisma.employee.update({
      where: { id: employeeId },
      data: { isLegacyEmployee: true },
    });

    return {
      employee: {
        id: employee.id,
        name: `${employee.firstName} ${employee.lastName}`,
      },
      legacyCount: currentLegacy + 1,
      message: 'Employee promoted to legacy status',
    };
  }

  /**
   * Get employees at risk due to redesignation
   */
  async getAtRiskEmployees(organizationId: string) {
    const employees = await this.prisma.employee.findMany({
      where: { organizationId, isActive: true, atRiskRedesignation: true },
    });

    return {
      count: employees.length,
      employees: employees.map((e) => ({
        id: e.id,
        name: `${e.firstName} ${e.lastName}`,
        hubzoneType: e.hubzoneType,
        censusTract: e.censusTract,
      })),
      recommendation: employees.length > 0
        ? 'Consider assisting these employees with relocation to stable HUBZone areas'
        : 'No employees at risk from redesignation',
    };
  }

  /**
   * Calculate impact of hiring
   */
  private async calculateHireImpact(organizationId: string, isHubzoneResident: boolean) {
    const employees = await this.prisma.employee.findMany({
      where: { organizationId, isActive: true },
    });

    const currentTotal = employees.length;
    const currentHubzone = employees.filter((e) => e.isHubzoneResident).length;
    const currentPercentage = currentTotal > 0 ? (currentHubzone / currentTotal) * 100 : 0;

    const newTotal = currentTotal + 1;
    const newHubzone = isHubzoneResident ? currentHubzone + 1 : currentHubzone;
    const newPercentage = (newHubzone / newTotal) * 100;

    return {
      before: { total: currentTotal, hubzone: currentHubzone, percentage: currentPercentage },
      after: { total: newTotal, hubzone: newHubzone, percentage: newPercentage },
      change: newPercentage - currentPercentage,
    };
  }

  /**
   * Calculate impact of termination
   */
  private async calculateTerminationImpact(
    organizationId: string,
    employee: { isHubzoneResident: boolean }
  ) {
    const employees = await this.prisma.employee.findMany({
      where: { organizationId, isActive: true },
    });

    const currentTotal = employees.length;
    const currentHubzone = employees.filter((e) => e.isHubzoneResident).length;
    const currentPercentage = currentTotal > 0 ? (currentHubzone / currentTotal) * 100 : 0;

    const newTotal = currentTotal - 1;
    const newHubzone = employee.isHubzoneResident ? currentHubzone - 1 : currentHubzone;
    const newPercentage = newTotal > 0 ? (newHubzone / newTotal) * 100 : 0;

    return {
      before: { total: currentTotal, hubzone: currentHubzone, percentage: currentPercentage },
      after: { total: newTotal, hubzone: newHubzone, percentage: newPercentage },
      change: newPercentage - currentPercentage,
      warning: newPercentage < 35 ? 'This termination will drop compliance below 35%' : null,
    };
  }

  /**
   * Generate workforce insights
   */
  private generateWorkforceInsights(
    total: number,
    hubzone: number,
    legacy: number,
    atRisk: number
  ): string[] {
    const insights: string[] = [];
    const percentage = total > 0 ? (hubzone / total) * 100 : 0;

    if (total < 5) {
      insights.push('Small workforce: each hire/termination significantly impacts compliance');
    }

    if (percentage >= 50) {
      insights.push('Strong HUBZone compliance position');
    } else if (percentage >= 40) {
      insights.push('Healthy compliance buffer');
    } else if (percentage >= 35) {
      insights.push('Thin compliance buffer - prioritize HUBZone hires');
    } else {
      insights.push('CRITICAL: Below 35% compliance threshold');
    }

    if (legacy >= 3) {
      insights.push(`Legacy employee limit nearly reached (${legacy}/4)`);
    }

    if (atRisk > 0) {
      insights.push(`${atRisk} employee(s) at risk from HUBZone redesignation`);
    }

    return insights;
  }
}
