/**
 * ADVOCATE - Regulatory Intelligence Agent
 * 
 * HUBZone regulation monitoring, policy change detection,
 * compliance guidance, and regulatory interpretation.
 * 
 * Tracks 13 CFR Part 126, SBA updates, and related federal policies.
 */

import { PrismaClient, Prisma } from '@prisma/client';

export interface RegulatoryUpdate {
  id: string;
  source: string;
  title: string;
  category: 'rule_change' | 'guidance' | 'policy' | 'announcement';
  effectiveDate: Date | null;
  summary: string;
  impact: 'high' | 'medium' | 'low';
  affectedAreas: string[];
  actionRequired: boolean;
  fullText?: string;
}

export interface ComplianceGuidance {
  topic: string;
  regulation: string;
  interpretation: string;
  examples: string[];
  commonMistakes: string[];
  bestPractices: string[];
}

/**
 * ADVOCATE Agent - Regulatory intelligence and compliance guidance
 */
export class AdvocateAgent {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async execute(
    taskType: string,
    input: Record<string, unknown>,
    organizationId: string
  ): Promise<Record<string, unknown>> {
    console.log(`[ADVOCATE] Executing: ${taskType}`);

    switch (taskType) {
      case 'scan_regulatory_updates':
        return await this.scanRegulatoryUpdates();

      case 'get_compliance_guidance':
        return await this.getComplianceGuidance(input.topic as string);

      case 'interpret_regulation':
        return await this.interpretRegulation(
          input.citation as string,
          input.question as string
        );

      case 'check_policy_impact':
        return await this.checkPolicyImpact(organizationId);

      case 'get_key_dates':
        return await this.getKeyDates();

      case 'explain_35_percent_rule':
        return await this.explain35PercentRule();

      case 'explain_legacy_employees':
        return await this.explainLegacyEmployees();

      case 'explain_grace_period':
        return await this.explainGracePeriod();

      case 'get_certification_requirements':
        return await this.getCertificationRequirements();

      case 'get_recertification_guidance':
        return await this.getRecertificationGuidance(organizationId);

      default:
        throw new Error(`[ADVOCATE] Unknown task type: ${taskType}`);
    }
  }

  async scanRegulatoryUpdates(): Promise<Record<string, unknown>> {
    const updates: RegulatoryUpdate[] = [
      {
        id: 'update-001',
        source: 'SBA',
        title: '2025 HUBZone Map Update',
        category: 'announcement',
        effectiveDate: new Date('2025-01-01'),
        summary: 'Annual HUBZone map redesignation based on latest Census data',
        impact: 'high',
        affectedAreas: ['employee_residency', 'compliance'],
        actionRequired: true,
      },
      {
        id: 'update-002',
        source: 'Federal Register',
        title: '90-Day Residency Requirement Clarification',
        category: 'guidance',
        effectiveDate: new Date('2024-06-01'),
        summary: 'SBA clarifies 90-day residency requirement for new HUBZone employees',
        impact: 'medium',
        affectedAreas: ['hiring', 'compliance'],
        actionRequired: false,
      },
    ];

    for (const update of updates) {
      await this.saveRegulatoryUpdate(update);
    }

    return {
      scanDate: new Date(),
      updatesFound: updates.length,
      highImpact: updates.filter(u => u.impact === 'high').length,
      actionRequired: updates.filter(u => u.actionRequired).length,
      updates,
      recommendations: this.getRegulatoryRecommendations(updates),
    };
  }

  async getComplianceGuidance(topic: string): Promise<Record<string, unknown>> {
    const guidance = this.getGuidanceForTopic(topic);

    if (!guidance) {
      return {
        topic,
        found: false,
        suggestion: 'Try topics: 35_percent, legacy_employees, grace_period, recertification',
      };
    }

    return {
      topic,
      found: true,
      guidance,
    };
  }

  async interpretRegulation(
    citation: string,
    question: string
  ): Promise<Record<string, unknown>> {
    const interpretations: Record<string, {
      title: string;
      text: string;
      interpretation: string;
    }> = {
      '126.200': {
        title: 'Residency Requirement',
        text: 'At least 35% of employees must reside in a HUBZone area',
        interpretation: 'This is calculated using the total number of employees who work at least 40 hours per month. Part-time employees pro-rated.',
      },
      '126.103': {
        title: 'HUBZone Employee Definition',
        text: 'Definition of who qualifies as a HUBZone employee',
        interpretation: 'Employee must reside in HUBZone for at least 90 days prior to being counted.',
      },
      '126.601': {
        title: 'Recertification',
        text: 'Annual recertification requirements',
        interpretation: 'Firms must recertify annually through SAM.gov and certify compliance at time of offer on HUBZone contracts.',
      },
    };

    const citationKey = citation.replace('13 CFR ', '').replace('§ ', '');
    const found = interpretations[citationKey];

    return {
      citation,
      question,
      found: !!found,
      regulation: found || null,
      disclaimer: 'This is general guidance. Consult SBA or legal counsel for specific situations.',
    };
  }

  async checkPolicyImpact(organizationId: string): Promise<Record<string, unknown>> {
    const recentUpdates = await this.prisma.regulatoryUpdate.findMany({
      where: {
        effectiveDate: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { effectiveDate: 'desc' },
    });

    const latestSnapshot = await this.prisma.complianceSnapshot.findFirst({
      where: { organizationId },
      orderBy: { snapshotDate: 'desc' },
    });

    const impacts: Array<{
      update: string;
      impact: string;
      action: string;
    }> = [];

    for (const update of recentUpdates) {
      const areas = update.affectedAreas as string[] || [];
      
      if (areas.includes('compliance') && latestSnapshot) {
        impacts.push({
          update: update.title,
          impact: `May affect your ${latestSnapshot.compliancePercentage?.toFixed(1)}% compliance`,
          action: 'Review employee residency status',
        });
      }
    }

    return {
      organizationId,
      recentUpdates: recentUpdates.length,
      potentialImpacts: impacts.length,
      impacts,
      recommendation: impacts.length > 0
        ? 'Review impacted areas and update compliance processes'
        : 'No significant policy impacts detected',
    };
  }

  async getKeyDates(): Promise<Record<string, unknown>> {
    const now = new Date();
    const year = now.getFullYear();

    return {
      annualDates: [
        {
          event: 'HUBZone Map Update',
          typicalDate: `January 1, ${year}`,
          description: 'Annual redesignation of HUBZone areas',
          action: 'Verify all employee addresses still in HUBZone',
        },
        {
          event: 'Annual Recertification',
          typicalDate: 'Anniversary of certification',
          description: 'Must recertify HUBZone status annually',
          action: 'Submit recertification through SAM.gov',
        },
      ],
      contractDates: [
        {
          event: 'Offer Certification',
          when: 'At time of offer on HUBZone contract',
          description: 'Must certify compliance when submitting offer',
          action: 'Verify 35% compliance before bid submission',
        },
        {
          event: 'Award Certification',
          when: 'At time of contract award',
          description: 'Must be compliant at award',
          action: 'Maintain compliance through award decision',
        },
      ],
      gracePeriodRules: {
        trigger: 'HUBZone contract award',
        duration: '12 months',
        requirement: 'Must demonstrate "attempt to maintain" compliance',
      },
    };
  }

  async explain35PercentRule(): Promise<Record<string, unknown>> {
    return {
      rule: '35% HUBZone Residency Requirement',
      citation: '13 CFR § 126.200',
      summary: 'At least 35% of employees must reside in a HUBZone area',
      details: {
        calculation: {
          formula: '(HUBZone Residents / Total Employees) × 100 ≥ 35%',
          includes: [
            'All full-time employees (40+ hours/month)',
            'Part-time employees pro-rated by hours',
            'Legacy employees (up to 4)',
          ],
          excludes: [
            'Independent contractors',
            'Temporary/seasonal workers',
            'Employees who have relocated within 90 days',
          ],
        },
        hubzoneTypes: [
          { type: 'QCT', name: 'Qualified Census Tract', basis: 'Poverty rate' },
          { type: 'QNMC', name: 'Qualified Non-Metropolitan County', basis: 'Unemployment/income' },
          { type: 'DDA', name: 'Difficult Development Area', basis: 'HUD designation' },
          { type: 'BRAC', name: 'Base Closure Area', basis: 'Military base closure' },
          { type: 'GOV', name: 'Governor-Designated', basis: 'State disaster declaration' },
          { type: 'INDIAN', name: 'Indian Lands', basis: 'Tribal designation' },
        ],
        timing: {
          when: 'Must maintain 35% at certification, recertification, and contract performance',
          verification: 'SBA may verify at any time',
        },
      },
      commonQuestions: [
        {
          q: 'What if I drop below 35%?',
          a: 'You may lose HUBZone status. Grace period may apply if you have active HUBZone contracts.',
        },
        {
          q: 'How are part-time employees counted?',
          a: 'Pro-rated based on hours worked. 20 hours = 0.5 employee.',
        },
        {
          q: 'When does residency count?',
          a: 'Employee must reside in HUBZone for 90 days before being counted (2025 rule).',
        },
      ],
    };
  }

  async explainLegacyEmployees(): Promise<Record<string, unknown>> {
    return {
      rule: 'Legacy Employee Exception',
      citation: '13 CFR § 126.103',
      summary: 'Employees who were HUBZone residents when hired but later moved out',
      details: {
        definition: 'An employee who resided in a HUBZone when hired but no longer does',
        limit: 'Maximum 4 legacy employees can count toward 35%',
        requirements: [
          'Must have been HUBZone resident at time of hire',
          'Must have worked for company at least 180 days',
          'Must continue to work for the company',
        ],
        counting: 'Legacy employees count as HUBZone residents for 35% calculation',
        expiration: 'Legacy status ends if employee leaves company',
      },
      bestPractices: [
        'Document HUBZone status at time of hire',
        'Track legacy employee count (max 4)',
        'Consider compliance impact before promoting to legacy',
        'Plan for legacy employee turnover',
      ],
      example: {
        scenario: '10 employees total, 2 current HUBZone residents, 2 legacy employees',
        calculation: '(2 + 2) / 10 = 40% - COMPLIANT',
        note: 'Legacy employees can make the difference for compliance',
      },
    };
  }

  async explainGracePeriod(): Promise<Record<string, unknown>> {
    return {
      rule: 'HUBZone Grace Period',
      citation: '13 CFR § 126.503',
      summary: '12-month period to regain compliance after HUBZone contract award',
      details: {
        trigger: 'Award of a HUBZone set-aside or sole-source contract',
        duration: '12 months from contract award date',
        requirement: 'Must demonstrate "attempt to maintain" compliance',
        scope: 'Applies to HUBZone residency requirement only',
      },
      attemptToMaintain: {
        definition: 'Good faith efforts to return to 35% compliance',
        documentation: [
          'Job postings targeting HUBZone residents',
          'Partnerships with HUBZone community organizations',
          'Employee relocation assistance programs',
          'Hiring records showing HUBZone recruitment efforts',
        ],
        notSufficient: [
          'No action taken',
          'Solely hiring non-HUBZone residents',
          'Not documenting efforts',
        ],
      },
      consequences: {
        success: 'Return to compliant status, continue HUBZone participation',
        failure: 'May lose HUBZone certification, affect active contracts',
      },
      timeline: {
        month1_3: 'Document current status, develop remediation plan',
        month4_6: 'Implement hiring initiatives, track progress',
        month7_9: 'Assess progress, adjust strategy if needed',
        month10_12: 'Final push to compliance, prepare documentation',
      },
    };
  }

  async getCertificationRequirements(): Promise<Record<string, unknown>> {
    return {
      initialCertification: {
        requirements: [
          'Small business per SBA size standards',
          'At least 35% employees reside in HUBZone',
          'Principal office in HUBZone',
          'Owned and controlled by US citizens',
        ],
        documentation: [
          'SAM.gov registration',
          'Employee roster with addresses',
          'Principal office lease/ownership proof',
          'Ownership documentation',
        ],
        process: [
          'Register in SAM.gov',
          'Complete HUBZone application',
          'Submit supporting documents',
          'SBA review (90 days typical)',
          'Certification decision',
        ],
      },
      annualRecertification: {
        timing: 'Within 365 days of initial certification and each anniversary',
        requirements: [
          'Confirm continued compliance',
          'Update any changed information',
          'Certify accuracy of submissions',
        ],
        consequences: 'Failure to recertify = decertification',
      },
      contractCertification: {
        when: [
          'At time of initial offer',
          'At time of contract award',
          'During performance (SBA may verify)',
        ],
        attestation: 'Certify that firm meets HUBZone requirements',
      },
    };
  }

  async getRecertificationGuidance(
    organizationId: string
  ): Promise<Record<string, unknown>> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    const snapshot = await this.prisma.complianceSnapshot.findFirst({
      where: { organizationId },
      orderBy: { snapshotDate: 'desc' },
    });

    const isCompliant = (snapshot?.compliancePercentage || 0) >= 35;

    return {
      organizationId,
      currentStatus: {
        compliancePercentage: snapshot?.compliancePercentage || 0,
        isCompliant,
        lastChecked: snapshot?.snapshotDate,
      },
      recertificationChecklist: [
        {
          item: 'Verify employee roster is current',
          status: 'pending',
          action: 'Run WORKFORCE agent roster check',
        },
        {
          item: 'Confirm all addresses are verified',
          status: 'pending',
          action: 'Run CARTOGRAPH batch verification',
        },
        {
          item: 'Calculate current compliance',
          status: isCompliant ? 'ready' : 'needs_attention',
          action: 'Run SENTINEL compliance check',
        },
        {
          item: 'Update SAM.gov profile',
          status: 'pending',
          action: 'Review and update SAM.gov registration',
        },
        {
          item: 'Submit recertification',
          status: 'pending',
          action: 'Complete HUBZone recertification in SAM.gov',
        },
      ],
      warnings: isCompliant ? [] : [
        'Current compliance is below 35%',
        'Address compliance before recertification',
        'Consider grace period if applicable',
      ],
    };
  }

  // ============ PRIVATE HELPER METHODS ============

  private async saveRegulatoryUpdate(update: RegulatoryUpdate): Promise<void> {
    try {
      await this.prisma.regulatoryUpdate.upsert({
        where: { id: update.id },
        update: {
          title: update.title,
          summary: update.summary,
          impact: update.impact,
        },
        create: {
          id: update.id,
          source: update.source,
          title: update.title,
          category: update.category,
          effectiveDate: update.effectiveDate,
          summary: update.summary,
          impact: update.impact,
          affectedAreas: update.affectedAreas,
          actionRequired: update.actionRequired,
        },
      });
    } catch (error) {
      console.error('[ADVOCATE] Failed to save regulatory update:', error);
    }
  }

  private getRegulatoryRecommendations(updates: RegulatoryUpdate[]): string[] {
    const recommendations: string[] = [];

    const highImpact = updates.filter(u => u.impact === 'high');
    if (highImpact.length > 0) {
      recommendations.push(`Review ${highImpact.length} high-impact update(s) immediately`);
    }

    const actionRequired = updates.filter(u => u.actionRequired);
    if (actionRequired.length > 0) {
      recommendations.push(`${actionRequired.length} update(s) require action`);
    }

    recommendations.push('Subscribe to SBA HUBZone announcements');
    recommendations.push('Schedule quarterly regulatory review');

    return recommendations;
  }

  private getGuidanceForTopic(topic: string): ComplianceGuidance | null {
    const guidance: Record<string, ComplianceGuidance> = {
      '35_percent': {
        topic: '35% Residency Requirement',
        regulation: '13 CFR § 126.200',
        interpretation: 'At least 35% of employees must reside in HUBZone areas',
        examples: [
          '10 employees: need 4 HUBZone residents',
          '25 employees: need 9 HUBZone residents',
        ],
        commonMistakes: [
          'Counting contractors as employees',
          'Not verifying addresses regularly',
          'Ignoring 90-day residency requirement',
        ],
        bestPractices: [
          'Verify addresses quarterly',
          'Track compliance in real-time',
          'Maintain buffer above 35%',
        ],
      },
      legacy_employees: {
        topic: 'Legacy Employee Rules',
        regulation: '13 CFR § 126.103',
        interpretation: 'Up to 4 employees who moved out of HUBZone can still count',
        examples: [
          'Employee hired while in HUBZone, later moved = legacy eligible',
        ],
        commonMistakes: [
          'Exceeding 4 legacy limit',
          'Not documenting original HUBZone status',
        ],
        bestPractices: [
          'Document HUBZone status at hire',
          'Track legacy count carefully',
          'Plan for legacy turnover',
        ],
      },
      grace_period: {
        topic: 'Grace Period After Contract Award',
        regulation: '13 CFR § 126.503',
        interpretation: '12-month period to regain compliance after HUBZone contract award',
        examples: [
          'Win HUBZone contract at 38%, drop to 32% = grace period available',
        ],
        commonMistakes: [
          'Not documenting "attempt to maintain" efforts',
          'Waiting too long to take corrective action',
        ],
        bestPractices: [
          'Document all hiring efforts',
          'Partner with HUBZone community organizations',
          'Track progress monthly',
        ],
      },
    };

    return guidance[topic.toLowerCase()] || null;
  }
}
