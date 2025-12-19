/**
 * GUARDIAN - Audit Defense Agent
 * 
 * Audit preparation, evidence collection, documentation management,
 * and compliance history tracking for SBA reviews.
 */

import { PrismaClient, Prisma } from '@prisma/client';

export interface AuditReadinessScore {
  overall: number;
  categories: {
    documentation: number;
    compliance_history: number;
    employee_records: number;
    address_verification: number;
    attempt_to_maintain: number;
  };
  gaps: string[];
  recommendations: string[];
}

export interface EvidencePackage {
  organizationId: string;
  generatedAt: Date;
  period: { start: Date; end: Date };
  sections: {
    compliance_snapshots: unknown[];
    employee_roster: unknown[];
    address_verifications: unknown[];
    hubzone_status_changes: unknown[];
    attempt_to_maintain: unknown[];
  };
}

/**
 * GUARDIAN Agent - Audit defense and documentation
 */
export class GuardianAgent {
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
    console.log(`[GUARDIAN] Executing: ${taskType}`);

    switch (taskType) {
      case 'assess_audit_readiness':
        return await this.assessAuditReadiness(organizationId);

      case 'generate_evidence_package':
        return await this.generateEvidencePackage(
          organizationId,
          input.startDate as string,
          input.endDate as string
        );

      case 'get_compliance_history':
        return await this.getComplianceHistory(
          organizationId,
          input.months as number || 12
        );

      case 'document_attempt_to_maintain':
        return await this.documentAttemptToMaintain(
          organizationId,
          input.action as string,
          input.description as string,
          input.evidence as string
        );

      case 'get_documentation_gaps':
        return await this.getDocumentationGaps(organizationId);

      case 'prepare_audit_response':
        return await this.prepareAuditResponse(
          organizationId,
          input.auditType as string
        );

      case 'log_compliance_event':
        return await this.logComplianceEvent(
          organizationId,
          input.eventType as string,
          input.details as Record<string, unknown>
        );

      case 'get_audit_trail':
        return await this.getAuditTrail(organizationId);

      default:
        throw new Error(`[GUARDIAN] Unknown task type: ${taskType}`);
    }
  }

  /**
   * Assess overall audit readiness
   */
  async assessAuditReadiness(organizationId: string): Promise<Record<string, unknown>> {
    console.log(`[GUARDIAN] Assessing audit readiness for: ${organizationId}`);

    // Score each category
    const documentation = await this.scoreDocumentation(organizationId);
    const complianceHistory = await this.scoreComplianceHistory(organizationId);
    const employeeRecords = await this.scoreEmployeeRecords(organizationId);
    const addressVerification = await this.scoreAddressVerification(organizationId);
    const attemptToMaintain = await this.scoreAttemptToMaintain(organizationId);

    const overall = Math.round(
      (documentation + complianceHistory + employeeRecords + 
       addressVerification + attemptToMaintain) / 5
    );

    // Identify gaps
    const gaps: string[] = [];
    if (documentation < 70) gaps.push('Documentation needs improvement');
    if (complianceHistory < 70) gaps.push('Compliance history has gaps');
    if (employeeRecords < 70) gaps.push('Employee records incomplete');
    if (addressVerification < 70) gaps.push('Address verifications outdated');
    if (attemptToMaintain < 70) gaps.push('Attempt to maintain not documented');

    // Generate recommendations
    const recommendations = this.generateReadinessRecommendations(
      { documentation, complianceHistory, employeeRecords, addressVerification, attemptToMaintain }
    );

    return {
      organizationId,
      assessmentDate: new Date(),
      scores: {
        overall,
        documentation,
        complianceHistory,
        employeeRecords,
        addressVerification,
        attemptToMaintain,
      },
      status: overall >= 80 ? 'audit_ready' : overall >= 60 ? 'needs_improvement' : 'at_risk',
      gaps,
      recommendations,
    };
  }

  /**
   * Generate comprehensive evidence package for audit
   */
  async generateEvidencePackage(
    organizationId: string,
    startDate: string,
    endDate: string
  ): Promise<Record<string, unknown>> {
    const start = new Date(startDate);
    const end = new Date(endDate);

    console.log(`[GUARDIAN] Generating evidence package: ${startDate} to ${endDate}`);

    // Gather all evidence
    const complianceSnapshots = await this.prisma.complianceSnapshot.findMany({
      where: {
        organizationId,
        snapshotDate: { gte: start, lte: end },
      },
      orderBy: { snapshotDate: 'asc' },
    });

    const employees = await this.prisma.employee.findMany({
      where: { organizationId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        hireDate: true,
        streetAddress: true,
        city: true,
        state: true,
        zipCode: true,
        isHubzoneResident: true,
        hubzoneType: true,
        isLegacyEmployee: true,
        lastVerified: true,
        residencyStartDate: true,
        isActive: true,
      },
    });

    const verifications = await this.prisma.addressVerification.findMany({
      where: {
        employee: { organizationId },
        verifiedAt: { gte: start, lte: end },
      },
      orderBy: { verifiedAt: 'desc' },
    });

    const attemptToMaintain = await this.prisma.attemptToMaintain.findMany({
      where: {
        organizationId,
        createdAt: { gte: start, lte: end },
      },
      orderBy: { createdAt: 'desc' },
    });

    const alerts = await this.prisma.complianceAlert.findMany({
      where: {
        organizationId,
        createdAt: { gte: start, lte: end },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      packageId: `EVD-${organizationId}-${Date.now()}`,
      generatedAt: new Date(),
      period: { start, end },
      summary: {
        complianceSnapshots: complianceSnapshots.length,
        employees: employees.length,
        activeEmployees: employees.filter(e => e.isActive).length,
        verifications: verifications.length,
        attemptToMaintainRecords: attemptToMaintain.length,
        alerts: alerts.length,
      },
      evidence: {
        complianceHistory: this.formatComplianceHistory(complianceSnapshots),
        employeeRoster: this.formatEmployeeRoster(employees),
        addressVerifications: verifications,
        attemptToMaintain,
        alerts,
      },
      certifications: {
        dataAccuracy: 'Records generated from HZ Navigator system',
        generatedBy: 'GUARDIAN Agent',
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Get detailed compliance history
   */
  async getComplianceHistory(
    organizationId: string,
    months: number
  ): Promise<Record<string, unknown>> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const snapshots = await this.prisma.complianceSnapshot.findMany({
      where: {
        organizationId,
        snapshotDate: { gte: startDate },
      },
      orderBy: { snapshotDate: 'asc' },
    });

    // Calculate statistics
    const percentages = snapshots.map(s => s.compliancePercentage);
    const average = percentages.length > 0
      ? percentages.reduce((a, b) => a + b, 0) / percentages.length
      : 0;
    const min = percentages.length > 0 ? Math.min(...percentages) : 0;
    const max = percentages.length > 0 ? Math.max(...percentages) : 0;

    // Find compliance drops
    const significantDrops: Array<{ date: Date; from: number; to: number }> = [];
    for (let i = 1; i < snapshots.length; i++) {
      const drop = snapshots[i - 1].compliancePercentage - snapshots[i].compliancePercentage;
      if (drop > 5) {
        significantDrops.push({
          date: snapshots[i].snapshotDate,
          from: snapshots[i - 1].compliancePercentage,
          to: snapshots[i].compliancePercentage,
        });
      }
    }

    // Count time below threshold
    const belowThreshold = snapshots.filter(s => s.compliancePercentage < 35).length;

    return {
      period: { months, startDate, endDate: new Date() },
      totalSnapshots: snapshots.length,
      statistics: {
        average: average.toFixed(2),
        minimum: min.toFixed(2),
        maximum: max.toFixed(2),
        current: snapshots.length > 0 
          ? snapshots[snapshots.length - 1].compliancePercentage.toFixed(2) 
          : 'N/A',
      },
      complianceRecord: {
        belowThresholdCount: belowThreshold,
        significantDrops: significantDrops.length,
        drops: significantDrops,
      },
      trend: this.calculateTrend(snapshots),
      snapshots: snapshots.map(s => ({
        date: s.snapshotDate,
        percentage: s.compliancePercentage,
        status: s.complianceStatus,
        employees: s.totalEmployees,
        hubzoneEmployees: s.hubzoneEmployees,
      })),
    };
  }

  /**
   * Document an "attempt to maintain" action
   */
  async documentAttemptToMaintain(
    organizationId: string,
    action: string,
    description: string,
    evidence: string
  ): Promise<Record<string, unknown>> {
    const record = await this.prisma.attemptToMaintain.create({
      data: {
        organizationId,
        actionType: action,
        description,
        evidence,
        documentedBy: 'GUARDIAN',
      },
    });

    return {
      success: true,
      record: {
        id: record.id,
        actionType: record.actionType,
        description: record.description,
        createdAt: record.createdAt,
      },
      message: 'Attempt to maintain action documented successfully',
      note: 'This documentation supports grace period compliance',
    };
  }

  /**
   * Identify documentation gaps
   */
  async getDocumentationGaps(organizationId: string): Promise<Record<string, unknown>> {
    const gaps: Array<{
      category: string;
      issue: string;
      severity: 'high' | 'medium' | 'low';
      recommendation: string;
    }> = [];

    // Check employee address verification
    const employees = await this.prisma.employee.findMany({
      where: { organizationId, isActive: true },
    });

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const unverifiedCount = employees.filter(e => 
      !e.lastVerified || e.lastVerified < ninetyDaysAgo
    ).length;

    if (unverifiedCount > 0) {
      gaps.push({
        category: 'Address Verification',
        issue: `${unverifiedCount} employee(s) have outdated address verification`,
        severity: unverifiedCount > employees.length * 0.3 ? 'high' : 'medium',
        recommendation: 'Run CARTOGRAPH batch verification',
      });
    }

    // Check compliance snapshot frequency
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentSnapshots = await this.prisma.complianceSnapshot.count({
      where: {
        organizationId,
        snapshotDate: { gte: thirtyDaysAgo },
      },
    });

    if (recentSnapshots < 4) {
      gaps.push({
        category: 'Compliance Monitoring',
        issue: 'Compliance snapshots not taken weekly',
        severity: 'medium',
        recommendation: 'Schedule weekly SENTINEL compliance checks',
      });
    }

    // Check attempt to maintain documentation
    const latestSnapshot = await this.prisma.complianceSnapshot.findFirst({
      where: { organizationId },
      orderBy: { snapshotDate: 'desc' },
    });

    if (latestSnapshot && latestSnapshot.compliancePercentage < 35) {
      const atmRecords = await this.prisma.attemptToMaintain.count({
        where: {
          organizationId,
          createdAt: { gte: thirtyDaysAgo },
        },
      });

      if (atmRecords < 2) {
        gaps.push({
          category: 'Attempt to Maintain',
          issue: 'Below 35% but insufficient ATM documentation',
          severity: 'high',
          recommendation: 'Document hiring efforts and compliance actions',
        });
      }
    }

    // Check for missing employee documentation
    const missingDocs = employees.filter(e => 
      e.isHubzoneResident && !e.residencyStartDate
    ).length;

    if (missingDocs > 0) {
      gaps.push({
        category: 'Employee Records',
        issue: `${missingDocs} HUBZone employee(s) missing residency start date`,
        severity: 'medium',
        recommendation: 'Update employee records with residency dates',
      });
    }

    return {
      organizationId,
      assessmentDate: new Date(),
      totalGaps: gaps.length,
      bySeverity: {
        high: gaps.filter(g => g.severity === 'high').length,
        medium: gaps.filter(g => g.severity === 'medium').length,
        low: gaps.filter(g => g.severity === 'low').length,
      },
      gaps,
      overallStatus: gaps.filter(g => g.severity === 'high').length > 0
        ? 'action_required'
        : gaps.length > 0
          ? 'needs_attention'
          : 'good',
    };
  }

  /**
   * Prepare response for specific audit type
   */
  async prepareAuditResponse(
    organizationId: string,
    auditType: string
  ): Promise<Record<string, unknown>> {
    const auditTypes: Record<string, {
      title: string;
      requiredDocuments: string[];
      keyQuestions: string[];
      preparationSteps: string[];
    }> = {
      sba_review: {
        title: 'SBA Program Examination',
        requiredDocuments: [
          'Current employee roster with addresses',
          'Proof of HUBZone residency for each qualifying employee',
          'Compliance calculation showing 35% threshold',
          'Principal office lease/documentation',
          'Ownership documentation',
        ],
        keyQuestions: [
          'How do you verify employee residency?',
          'How often do you calculate compliance?',
          'What actions have you taken to maintain compliance?',
          'How do you track HUBZone map changes?',
        ],
        preparationSteps: [
          'Run comprehensive compliance check',
          'Verify all employee addresses',
          'Gather supporting documentation',
          'Prepare compliance history report',
          'Document any remediation efforts',
        ],
      },
      recertification: {
        title: 'Annual Recertification',
        requiredDocuments: [
          'Updated employee roster',
          'Current compliance calculation',
          'Any changes to ownership or structure',
          'Updated SAM.gov registration',
        ],
        keyQuestions: [
          'Has ownership changed?',
          'Has principal office moved?',
          'Are you currently compliant?',
        ],
        preparationSteps: [
          'Calculate current compliance',
          'Update employee records',
          'Review and update SAM.gov',
          'Submit recertification',
        ],
      },
      protest: {
        title: 'HUBZone Status Protest Response',
        requiredDocuments: [
          'Detailed compliance history',
          'All employee documentation',
          'Address verification evidence',
          'Attempt to maintain documentation',
          'Timeline of compliance efforts',
        ],
        keyQuestions: [
          'Were you compliant at time of offer?',
          'Were you compliant at award?',
          'What is your current compliance status?',
        ],
        preparationSteps: [
          'Gather all historical compliance data',
          'Compile address verification records',
          'Document all compliance efforts',
          'Prepare detailed response narrative',
          'Consult legal counsel if needed',
        ],
      },
    };

    const audit = auditTypes[auditType] || auditTypes.sba_review;

    // Generate current status
    const readiness = await this.assessAuditReadiness(organizationId);

    return {
      auditType,
      ...audit,
      currentReadiness: readiness,
      generatedDocuments: {
        available: true,
        instruction: 'Use generate_evidence_package to create documentation',
      },
    };
  }

  /**
   * Log a compliance event
   */
  async logComplianceEvent(
    organizationId: string,
    eventType: string,
    details: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const event = await this.prisma.complianceEvent.create({
      data: {
        organizationId,
        eventType,
        details: details as Prisma.InputJsonValue,
        source: 'GUARDIAN',
      },
    });

    return {
      success: true,
      event: {
        id: event.id,
        type: event.eventType,
        timestamp: event.createdAt,
      },
    };
  }

  /**
   * Get complete audit trail
   */
  async getAuditTrail(organizationId: string): Promise<Record<string, unknown>> {
    // Gather all audit-relevant events
    const [events, snapshots, alerts, atmRecords] = await Promise.all([
      this.prisma.complianceEvent.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.complianceSnapshot.findMany({
        where: { organizationId },
        orderBy: { snapshotDate: 'desc' },
        take: 50,
      }),
      this.prisma.complianceAlert.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.attemptToMaintain.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    // Combine and sort by date
    const timeline = [
      ...events.map(e => ({ type: 'event', date: e.createdAt, data: e })),
      ...snapshots.map(s => ({ type: 'snapshot', date: s.snapshotDate, data: s })),
      ...alerts.map(a => ({ type: 'alert', date: a.createdAt, data: a })),
      ...atmRecords.map(r => ({ type: 'attempt_to_maintain', date: r.createdAt, data: r })),
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    return {
      organizationId,
      totalRecords: timeline.length,
      breakdown: {
        events: events.length,
        snapshots: snapshots.length,
        alerts: alerts.length,
        attemptToMaintain: atmRecords.length,
      },
      timeline: timeline.slice(0, 100), // Latest 100 entries
    };
  }

  // ============ PRIVATE HELPER METHODS ============

  private async scoreDocumentation(organizationId: string): Promise<number> {
    let score = 100;

    // Check for recent compliance snapshots
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentSnapshot = await this.prisma.complianceSnapshot.findFirst({
      where: { organizationId, snapshotDate: { gte: weekAgo } },
    });
    if (!recentSnapshot) score -= 20;

    // Check for ATM documentation if below threshold
    const latestSnapshot = await this.prisma.complianceSnapshot.findFirst({
      where: { organizationId },
      orderBy: { snapshotDate: 'desc' },
    });
    if (latestSnapshot && latestSnapshot.compliancePercentage < 35) {
      const atmCount = await this.prisma.attemptToMaintain.count({
        where: { organizationId },
      });
      if (atmCount < 3) score -= 30;
    }

    return Math.max(0, score);
  }

  private async scoreComplianceHistory(organizationId: string): Promise<number> {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const snapshots = await this.prisma.complianceSnapshot.findMany({
      where: { organizationId, snapshotDate: { gte: sixMonthsAgo } },
    });

    if (snapshots.length < 6) return 50; // Not enough history

    const compliantCount = snapshots.filter(s => s.compliancePercentage >= 35).length;
    return Math.round((compliantCount / snapshots.length) * 100);
  }

  private async scoreEmployeeRecords(organizationId: string): Promise<number> {
    const employees = await this.prisma.employee.findMany({
      where: { organizationId, isActive: true },
    });

    if (employees.length === 0) return 100;

    let score = 100;

    // Check for complete records
    for (const emp of employees) {
      if (!emp.streetAddress || !emp.city || !emp.state || !emp.zipCode) {
        score -= 5;
      }
      if (emp.isHubzoneResident && !emp.residencyStartDate) {
        score -= 5;
      }
    }

    return Math.max(0, score);
  }

  private async scoreAddressVerification(organizationId: string): Promise<number> {
    const employees = await this.prisma.employee.findMany({
      where: { organizationId, isActive: true },
    });

    if (employees.length === 0) return 100;

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const verifiedCount = employees.filter(e =>
      e.lastVerified && e.lastVerified >= ninetyDaysAgo
    ).length;

    return Math.round((verifiedCount / employees.length) * 100);
  }

  private async scoreAttemptToMaintain(organizationId: string): Promise<number> {
    const latestSnapshot = await this.prisma.complianceSnapshot.findFirst({
      where: { organizationId },
      orderBy: { snapshotDate: 'desc' },
    });

    // If compliant, ATM not required
    if (!latestSnapshot || latestSnapshot.compliancePercentage >= 35) {
      return 100;
    }

    // If below threshold, check ATM documentation
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const atmCount = await this.prisma.attemptToMaintain.count({
      where: { organizationId, createdAt: { gte: sixMonthsAgo } },
    });

    if (atmCount >= 10) return 100;
    if (atmCount >= 5) return 70;
    if (atmCount >= 2) return 40;
    return 10;
  }

  private generateReadinessRecommendations(
    scores: Record<string, number>
  ): string[] {
    const recommendations: string[] = [];

    if (scores.documentation < 70) {
      recommendations.push('Increase compliance snapshot frequency');
    }
    if (scores.complianceHistory < 70) {
      recommendations.push('Focus on maintaining 35%+ compliance');
    }
    if (scores.employeeRecords < 70) {
      recommendations.push('Complete missing employee documentation');
    }
    if (scores.addressVerification < 70) {
      recommendations.push('Run batch address verification');
    }
    if (scores.attemptToMaintain < 70) {
      recommendations.push('Document compliance improvement efforts');
    }

    if (recommendations.length === 0) {
      recommendations.push('Maintain current documentation practices');
    }

    return recommendations;
  }

  private calculateTrend(
    snapshots: Array<{ compliancePercentage: number }>
  ): 'improving' | 'stable' | 'declining' {
    if (snapshots.length < 3) return 'stable';

    const recent = snapshots.slice(-3);
    const older = snapshots.slice(-6, -3);

    if (older.length === 0) return 'stable';

    const recentAvg = recent.reduce((a, b) => a + b.compliancePercentage, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b.compliancePercentage, 0) / older.length;

    const change = recentAvg - olderAvg;

    if (change > 3) return 'improving';
    if (change < -3) return 'declining';
    return 'stable';
  }

  private formatComplianceHistory(
    snapshots: Array<{
      snapshotDate: Date;
      compliancePercentage: number;
      totalEmployees: number;
      hubzoneEmployees: number;
    }>
  ): unknown[] {
    return snapshots.map(s => ({
      date: s.snapshotDate,
      percentage: s.compliancePercentage,
      totalEmployees: s.totalEmployees,
      hubzoneEmployees: s.hubzoneEmployees,
      compliant: s.compliancePercentage >= 35,
    }));
  }

  private formatEmployeeRoster(
    employees: Array<{
      id: string;
      firstName: string;
      lastName: string;
      hireDate: Date;
      isActive: boolean;
      isHubzoneResident: boolean;
      hubzoneType: string | null;
      isLegacyEmployee: boolean;
    }>
  ): unknown[] {
    return employees.map(e => ({
      id: e.id,
      name: `${e.firstName} ${e.lastName}`,
      hireDate: e.hireDate,
      status: e.isActive ? 'active' : 'inactive',
      hubzoneStatus: e.isHubzoneResident ? 'resident' : 'non-resident',
      hubzoneType: e.hubzoneType,
      isLegacy: e.isLegacyEmployee,
    }));
  }
}
