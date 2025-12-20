/**
 * WARDEN - FCL (Facility Clearance) Manager Agent
 * 
 * Manages readiness for FCL authorization including:
 * - NISPOM / 32 CFR Part 117 compliance tracking
 * - Personnel security management
 * - Foreign ownership/control/influence (FOCI) monitoring
 * - Insider threat program support
 * - DCSA integration readiness
 */

import { PrismaClient, Prisma } from '@prisma/client';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type ClearanceLevel = 'confidential' | 'secret' | 'top_secret';
export type ClearanceStatus = 'pending' | 'interim' | 'final' | 'suspended' | 'revoked' | 'expired';
export type FCLCategory = 'facility' | 'personnel' | 'it' | 'foci' | 'insider_threat' | 'training';
export type RequirementStatus = 'not_started' | 'in_progress' | 'ready' | 'not_applicable';

export interface FCLReadinessAssessment {
  timestamp: Date;
  organizationId: string;
  overallScore: number;
  byCategory: Record<FCLCategory, CategoryScore>;
  gaps: FCLGap[];
  recommendations: string[];
  nextSteps: string[];
  fclEligible: boolean;
  targetClearanceLevel: ClearanceLevel;
}

export interface CategoryScore {
  score: number;
  total: number;
  completed: number;
  inProgress: number;
  gaps: string[];
}

export interface FCLGap {
  category: FCLCategory;
  requirement: string;
  nispomReference: string;
  severity: 'critical' | 'major' | 'minor';
  remediation: string;
  estimatedEffort: string;
}

export interface PersonnelSecurityRecord {
  id: string;
  name: string;
  clearanceLevel: ClearanceLevel | null;
  clearanceStatus: ClearanceStatus;
  investigationType: string | null;
  nextPRDue: Date | null;
  ceEnrolled: boolean;
  briefings: string[];
  foreignTravel: ForeignTravelRecord[];
  foreignContacts: ForeignContactRecord[];
  riskIndicators: string[];
}

export interface ForeignTravelRecord {
  id: string;
  country: string;
  purpose: string;
  departureDate: Date;
  returnDate: Date;
  reported: boolean;
  approved: boolean;
}

export interface ForeignContactRecord {
  id: string;
  nationality: string;
  relationship: string;
  frequency: string;
  reported: boolean;
  approved: boolean;
}

export interface InsiderThreatIndicator {
  id: string;
  userId: string;
  indicator: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  details: string;
  resolved: boolean;
  resolution?: string;
}

export interface FOCIAssessment {
  hasForeignOwnership: boolean;
  foreignOwnershipPercent: number;
  hasForeignControl: boolean;
  hasForeignInfluence: boolean;
  fociMitigation: string | null;
  lastAssessed: Date;
  riskLevel: 'none' | 'low' | 'medium' | 'high';
  recommendations: string[];
}

// ============================================================================
// NISPOM REQUIREMENTS (32 CFR Part 117)
// ============================================================================

interface NISPOMRequirement {
  id: string;
  category: FCLCategory;
  chapter: string;
  section: string;
  title: string;
  description: string;
  clearanceLevels: ClearanceLevel[];
  mandatory: boolean;
}

const NISPOM_REQUIREMENTS: NISPOMRequirement[] = [
  // FACILITY REQUIREMENTS
  {
    id: 'FAC-001',
    category: 'facility',
    chapter: '5',
    section: '5-100',
    title: 'Facility Security Officer (FSO)',
    description: 'Designate an FSO who holds appropriate clearance and has completed FSO training.',
    clearanceLevels: ['confidential', 'secret', 'top_secret'],
    mandatory: true,
  },
  {
    id: 'FAC-002',
    category: 'facility',
    chapter: '5',
    section: '5-200',
    title: 'Physical Security Controls',
    description: 'Implement physical security controls appropriate for clearance level.',
    clearanceLevels: ['confidential', 'secret', 'top_secret'],
    mandatory: true,
  },
  {
    id: 'FAC-003',
    category: 'facility',
    chapter: '5',
    section: '5-300',
    title: 'Access Control System',
    description: 'Establish access control systems for cleared areas.',
    clearanceLevels: ['secret', 'top_secret'],
    mandatory: true,
  },
  {
    id: 'FAC-004',
    category: 'facility',
    chapter: '6',
    section: '6-100',
    title: 'Visitor Control Procedures',
    description: 'Establish procedures for controlling visitor access.',
    clearanceLevels: ['confidential', 'secret', 'top_secret'],
    mandatory: true,
  },

  // PERSONNEL REQUIREMENTS
  {
    id: 'PER-001',
    category: 'personnel',
    chapter: '2',
    section: '2-200',
    title: 'Personnel Security Program',
    description: 'Establish program for personnel security including investigations and clearances.',
    clearanceLevels: ['confidential', 'secret', 'top_secret'],
    mandatory: true,
  },
  {
    id: 'PER-002',
    category: 'personnel',
    chapter: '2',
    section: '2-300',
    title: 'Key Management Personnel',
    description: 'Identify and process KMP for appropriate clearances.',
    clearanceLevels: ['confidential', 'secret', 'top_secret'],
    mandatory: true,
  },
  {
    id: 'PER-003',
    category: 'personnel',
    chapter: '3',
    section: '3-100',
    title: 'Security Training',
    description: 'Provide initial and annual security awareness training.',
    clearanceLevels: ['confidential', 'secret', 'top_secret'],
    mandatory: true,
  },
  {
    id: 'PER-004',
    category: 'personnel',
    chapter: '2',
    section: '2-400',
    title: 'Continuous Evaluation',
    description: 'Enroll cleared personnel in Continuous Evaluation program.',
    clearanceLevels: ['secret', 'top_secret'],
    mandatory: true,
  },

  // IT SECURITY REQUIREMENTS
  {
    id: 'IT-001',
    category: 'it',
    chapter: '8',
    section: '8-100',
    title: 'Information System Security',
    description: 'Implement security controls per NIST 800-171 for CUI systems.',
    clearanceLevels: ['confidential', 'secret', 'top_secret'],
    mandatory: true,
  },
  {
    id: 'IT-002',
    category: 'it',
    chapter: '8',
    section: '8-200',
    title: 'Incident Reporting',
    description: 'Establish procedures for reporting security incidents to DCSA.',
    clearanceLevels: ['confidential', 'secret', 'top_secret'],
    mandatory: true,
  },
  {
    id: 'IT-003',
    category: 'it',
    chapter: '8',
    section: '8-300',
    title: 'Media Protection',
    description: 'Protect classified media and implement sanitization procedures.',
    clearanceLevels: ['secret', 'top_secret'],
    mandatory: true,
  },

  // FOCI REQUIREMENTS
  {
    id: 'FOCI-001',
    category: 'foci',
    chapter: '2',
    section: '2-100',
    title: 'FOCI Assessment',
    description: 'Complete foreign ownership, control, or influence assessment.',
    clearanceLevels: ['confidential', 'secret', 'top_secret'],
    mandatory: true,
  },
  {
    id: 'FOCI-002',
    category: 'foci',
    chapter: '2',
    section: '2-101',
    title: 'FOCI Mitigation',
    description: 'If FOCI exists, implement appropriate mitigation instrument.',
    clearanceLevels: ['confidential', 'secret', 'top_secret'],
    mandatory: false, // Only if FOCI exists
  },

  // INSIDER THREAT
  {
    id: 'ITP-001',
    category: 'insider_threat',
    chapter: '1',
    section: '1-300',
    title: 'Insider Threat Program',
    description: 'Establish an insider threat program per NISPOM requirements.',
    clearanceLevels: ['confidential', 'secret', 'top_secret'],
    mandatory: true,
  },
  {
    id: 'ITP-002',
    category: 'insider_threat',
    chapter: '1',
    section: '1-301',
    title: 'Insider Threat Training',
    description: 'Provide insider threat awareness training to all cleared personnel.',
    clearanceLevels: ['confidential', 'secret', 'top_secret'],
    mandatory: true,
  },

  // TRAINING
  {
    id: 'TRN-001',
    category: 'training',
    chapter: '3',
    section: '3-102',
    title: 'Initial Security Briefing',
    description: 'Provide initial security briefing before access to classified information.',
    clearanceLevels: ['confidential', 'secret', 'top_secret'],
    mandatory: true,
  },
  {
    id: 'TRN-002',
    category: 'training',
    chapter: '3',
    section: '3-103',
    title: 'Annual Refresher Training',
    description: 'Provide annual security refresher training.',
    clearanceLevels: ['confidential', 'secret', 'top_secret'],
    mandatory: true,
  },
  {
    id: 'TRN-003',
    category: 'training',
    chapter: '3',
    section: '3-104',
    title: 'Debriefing',
    description: 'Conduct security debriefing upon termination of access.',
    clearanceLevels: ['confidential', 'secret', 'top_secret'],
    mandatory: true,
  },
];

// ============================================================================
// WARDEN AGENT
// ============================================================================

export class WardenAgent {
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
    console.log(`[WARDEN] Executing: ${taskType}`);

    switch (taskType) {
      case 'assess_fcl_readiness':
        return await this.assessFCLReadiness(organizationId, input.targetLevel as ClearanceLevel);

      case 'get_nispom_requirements':
        return await this.getNISPOMRequirements(input.targetLevel as ClearanceLevel);

      case 'update_requirement_status':
        return await this.updateRequirementStatus(
          organizationId,
          input.requirementId as string,
          input.status as RequirementStatus,
          input.evidence as string[]
        );

      case 'assess_foci':
        return await this.assessFOCI(organizationId);

      case 'manage_personnel_clearances':
        return await this.managePersonnelClearances(organizationId);

      case 'report_foreign_travel':
        return await this.reportForeignTravel(
          organizationId,
          input.personnelId as string,
          input.travel as ForeignTravelRecord
        );

      case 'report_foreign_contact':
        return await this.reportForeignContact(
          organizationId,
          input.personnelId as string,
          input.contact as ForeignContactRecord
        );

      case 'check_insider_threat_indicators':
        return await this.checkInsiderThreatIndicators(organizationId);

      case 'generate_sf328':
        return await this.generateSF328(organizationId);

      case 'generate_dd441':
        return await this.generateDD441(organizationId);

      case 'prepare_dcsa_submission':
        return await this.prepareDCSASubmission(organizationId);

      default:
        throw new Error(`[WARDEN] Unknown task type: ${taskType}`);
    }
  }

  /**
   * Assess FCL readiness
   */
  async assessFCLReadiness(
    organizationId: string,
    targetLevel: ClearanceLevel = 'secret'
  ): Promise<Record<string, unknown>> {
    console.log(`[WARDEN] Assessing FCL readiness for ${targetLevel} clearance`);

    // Get applicable requirements
    const requirements = NISPOM_REQUIREMENTS.filter(
      r => r.clearanceLevels.includes(targetLevel) && r.mandatory
    );

    // Get current status of each requirement
    const statuses = await this.getRequirementStatuses(organizationId, requirements);

    // Calculate scores by category
    const byCategory: Record<string, CategoryScore> = {};
    const categories: FCLCategory[] = ['facility', 'personnel', 'it', 'foci', 'insider_threat', 'training'];

    for (const category of categories) {
      const categoryReqs = requirements.filter(r => r.category === category);
      const categoryStatuses = statuses.filter(s => 
        categoryReqs.some(r => r.id === s.requirementId)
      );

      const completed = categoryStatuses.filter(s => s.status === 'ready').length;
      const inProgress = categoryStatuses.filter(s => s.status === 'in_progress').length;
      const total = categoryReqs.length;

      byCategory[category] = {
        score: total > 0 ? Math.round((completed / total) * 100) : 100,
        total,
        completed,
        inProgress,
        gaps: categoryReqs
          .filter(r => {
            const status = categoryStatuses.find(s => s.requirementId === r.id);
            return !status || status.status === 'not_started';
          })
          .map(r => r.title),
      };
    }

    // Calculate overall score
    const totalCompleted = Object.values(byCategory).reduce((sum, c) => sum + c.completed, 0);
    const totalReqs = Object.values(byCategory).reduce((sum, c) => sum + c.total, 0);
    const overallScore = totalReqs > 0 ? Math.round((totalCompleted / totalReqs) * 100) : 0;

    // Generate gaps
    const gaps: FCLGap[] = [];
    for (const req of requirements) {
      const status = statuses.find(s => s.requirementId === req.id);
      if (!status || status.status === 'not_started') {
        gaps.push({
          category: req.category,
          requirement: req.title,
          nispomReference: `${req.chapter} CFR ${req.section}`,
          severity: req.mandatory ? 'critical' : 'major',
          remediation: req.description,
          estimatedEffort: this.estimateEffort(req),
        });
      }
    }

    // Generate recommendations
    const recommendations = this.generateFCLRecommendations(gaps, byCategory);

    // Generate next steps
    const nextSteps = this.generateNextSteps(gaps, overallScore);

    return {
      timestamp: new Date(),
      organizationId,
      targetClearanceLevel: targetLevel,
      overallScore,
      byCategory,
      totalRequirements: totalReqs,
      completedRequirements: totalCompleted,
      gaps,
      recommendations,
      nextSteps,
      fclEligible: overallScore >= 90 && gaps.filter(g => g.severity === 'critical').length === 0,
      estimatedTimeToReady: this.estimateTimeToReady(gaps),
    };
  }

  /**
   * Get NISPOM requirements for a clearance level
   */
  async getNISPOMRequirements(targetLevel: ClearanceLevel): Promise<Record<string, unknown>> {
    const requirements = NISPOM_REQUIREMENTS.filter(
      r => r.clearanceLevels.includes(targetLevel)
    );

    const byCategory = requirements.reduce((acc, req) => {
      if (!acc[req.category]) {
        acc[req.category] = [];
      }
      acc[req.category].push({
        id: req.id,
        chapter: req.chapter,
        section: req.section,
        title: req.title,
        description: req.description,
        mandatory: req.mandatory,
      });
      return acc;
    }, {} as Record<string, unknown[]>);

    return {
      targetLevel,
      totalRequirements: requirements.length,
      mandatoryCount: requirements.filter(r => r.mandatory).length,
      byCategory,
      referenceDocument: '32 CFR Part 117 (NISPOM)',
    };
  }

  /**
   * Update requirement status
   */
  async updateRequirementStatus(
    organizationId: string,
    requirementId: string,
    status: RequirementStatus,
    evidence: string[]
  ): Promise<Record<string, unknown>> {
    const requirement = NISPOM_REQUIREMENTS.find(r => r.id === requirementId);
    
    if (!requirement) {
      throw new Error(`Requirement not found: ${requirementId}`);
    }

    // In production, save to database
    console.log(`[WARDEN] Updated ${requirementId} to ${status}`);

    return {
      success: true,
      requirementId,
      title: requirement.title,
      newStatus: status,
      evidence,
      updatedAt: new Date(),
    };
  }

  /**
   * Assess Foreign Ownership, Control, or Influence (FOCI)
   */
  async assessFOCI(organizationId: string): Promise<Record<string, unknown>> {
    console.log(`[WARDEN] Assessing FOCI for organization: ${organizationId}`);

    // This would integrate with ownership records, SAM.gov, etc.
    // For now, provide assessment framework

    const assessment: FOCIAssessment = {
      hasForeignOwnership: false,
      foreignOwnershipPercent: 0,
      hasForeignControl: false,
      hasForeignInfluence: false,
      fociMitigation: null,
      lastAssessed: new Date(),
      riskLevel: 'none',
      recommendations: [],
    };

    // Check factors that would indicate FOCI
    const fociFactors = [
      { factor: 'Foreign ownership interest (voting)', threshold: 5, current: 0 },
      { factor: 'Foreign ownership interest (equity)', threshold: 10, current: 0 },
      { factor: 'Foreign board members', threshold: 0, current: 0 },
      { factor: 'Foreign officers/principals', threshold: 0, current: 0 },
      { factor: 'Foreign creditors with control', threshold: 0, current: 0 },
      { factor: 'Foreign contracts with control provisions', threshold: 0, current: 0 },
      { factor: 'Foreign joint ventures', threshold: 0, current: 0 },
    ];

    const fociIssues = fociFactors.filter(f => f.current > f.threshold);

    if (fociIssues.length > 0) {
      assessment.hasForeignInfluence = true;
      assessment.riskLevel = fociIssues.some(f => f.factor.includes('ownership')) ? 'high' : 'medium';
      assessment.recommendations.push(
        'Consult with DCSA about FOCI mitigation options',
        'Consider implementing a Security Control Agreement (SCA)',
        'Document all foreign relationships in SF 328',
      );
    }

    return {
      organizationId,
      assessment,
      fociFactors,
      mitigationOptions: assessment.riskLevel !== 'none' ? [
        { type: 'SCA', description: 'Security Control Agreement - Board resolution' },
        { type: 'SSA', description: 'Special Security Agreement - More restrictive' },
        { type: 'PA', description: 'Proxy Agreement - Foreign control negated' },
        { type: 'VTA', description: 'Voting Trust Agreement - Voting rights transferred' },
      ] : [],
      sf328Required: true,
      nextReviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    };
  }

  /**
   * Manage personnel clearances
   */
  async managePersonnelClearances(organizationId: string): Promise<Record<string, unknown>> {
    console.log(`[WARDEN] Managing personnel clearances for: ${organizationId}`);

    // In production, this would query the actual personnel database
    const personnel: PersonnelSecurityRecord[] = [
      {
        id: 'kmp-001',
        name: 'Executive Officer',
        clearanceLevel: null,
        clearanceStatus: 'pending',
        investigationType: 'T3/SF86',
        nextPRDue: null,
        ceEnrolled: false,
        briefings: [],
        foreignTravel: [],
        foreignContacts: [],
        riskIndicators: [],
      },
    ];

    // Identify personnel needing action
    const needsProcessing = personnel.filter(p => p.clearanceStatus === 'pending');
    const needsReinvestigation = personnel.filter(p => 
      p.nextPRDue && p.nextPRDue <= new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    );
    const notEnrolledInCE = personnel.filter(p => 
      p.clearanceLevel && !p.ceEnrolled
    );

    return {
      organizationId,
      totalPersonnel: personnel.length,
      byStatus: {
        pending: personnel.filter(p => p.clearanceStatus === 'pending').length,
        interim: personnel.filter(p => p.clearanceStatus === 'interim').length,
        final: personnel.filter(p => p.clearanceStatus === 'final').length,
        expired: personnel.filter(p => p.clearanceStatus === 'expired').length,
      },
      actionRequired: {
        needsProcessing: needsProcessing.map(p => ({ id: p.id, name: p.name })),
        needsReinvestigation: needsReinvestigation.map(p => ({ id: p.id, name: p.name, dueDate: p.nextPRDue })),
        notEnrolledInCE: notEnrolledInCE.map(p => ({ id: p.id, name: p.name })),
      },
      recommendations: [
        needsProcessing.length > 0 ? 'Submit clearance requests for pending personnel' : null,
        needsReinvestigation.length > 0 ? 'Initiate periodic reinvestigation for due personnel' : null,
        notEnrolledInCE.length > 0 ? 'Enroll cleared personnel in Continuous Evaluation' : null,
      ].filter(Boolean),
    };
  }

  /**
   * Report foreign travel
   */
  async reportForeignTravel(
    organizationId: string,
    personnelId: string,
    travel: ForeignTravelRecord
  ): Promise<Record<string, unknown>> {
    console.log(`[WARDEN] Reporting foreign travel for: ${personnelId}`);

    // Validate travel data
    const highRiskCountries = ['CN', 'RU', 'IR', 'KP', 'CU', 'SY'];
    const isHighRisk = highRiskCountries.includes(travel.country);

    return {
      success: true,
      travelId: `FT-${Date.now()}`,
      personnelId,
      travel: {
        ...travel,
        reported: true,
        highRiskCountry: isHighRisk,
      },
      requirements: [
        'Complete pre-travel briefing',
        'Submit travel itinerary',
        isHighRisk ? 'FSO approval required for high-risk country' : null,
        'Complete post-travel debriefing within 5 days of return',
      ].filter(Boolean),
      notification: isHighRisk 
        ? 'High-risk country travel requires FSO approval and enhanced briefing'
        : 'Standard pre-travel briefing required',
    };
  }

  /**
   * Report foreign contact
   */
  async reportForeignContact(
    organizationId: string,
    personnelId: string,
    contact: ForeignContactRecord
  ): Promise<Record<string, unknown>> {
    console.log(`[WARDEN] Reporting foreign contact for: ${personnelId}`);

    const concernCountries = ['CN', 'RU', 'IR', 'KP', 'CU', 'SY', 'VE'];
    const isConcernCountry = concernCountries.includes(contact.nationality);

    return {
      success: true,
      contactId: `FC-${Date.now()}`,
      personnelId,
      contact: {
        ...contact,
        reported: true,
        concernCountry: isConcernCountry,
      },
      followUp: isConcernCountry ? [
        'FSO review required',
        'May require counterintelligence interview',
        'Document all future contacts',
      ] : [
        'Document maintained for records',
        'Report any changes in relationship',
      ],
    };
  }

  /**
   * Check insider threat indicators
   */
  async checkInsiderThreatIndicators(organizationId: string): Promise<Record<string, unknown>> {
    console.log(`[WARDEN] Checking insider threat indicators`);

    // In production, this would integrate with UEBA and monitoring systems
    const indicators: InsiderThreatIndicator[] = [];

    // Define indicator categories
    const indicatorCategories = {
      behavioral: [
        'Unusual work hours',
        'Excessive data downloads',
        'Accessing resources outside job scope',
        'Disgruntlement or workplace conflicts',
      ],
      technical: [
        'Failed access attempts to restricted areas',
        'Use of unauthorized devices',
        'Attempts to bypass security controls',
        'Unusual network traffic patterns',
      ],
      personal: [
        'Unexplained affluence',
        'Foreign travel to concern countries',
        'Close and continuing contact with foreign nationals',
        'Unusual interest in classified matters outside responsibilities',
      ],
    };

    return {
      organizationId,
      assessmentDate: new Date(),
      activeIndicators: indicators.filter(i => !i.resolved).length,
      bySeverity: {
        critical: indicators.filter(i => i.severity === 'critical').length,
        high: indicators.filter(i => i.severity === 'high').length,
        medium: indicators.filter(i => i.severity === 'medium').length,
        low: indicators.filter(i => i.severity === 'low').length,
      },
      indicators,
      monitoringStatus: 'active',
      indicatorCategories,
      programCompliance: {
        seniorOfficialDesignated: true,
        trainingCompleted: true,
        proceduresDocumented: true,
        reportingMechanisms: true,
      },
    };
  }

  /**
   * Generate SF 328 (Certificate Pertaining to Foreign Interests)
   */
  async generateSF328(organizationId: string): Promise<Record<string, unknown>> {
    console.log(`[WARDEN] Generating SF 328 data`);

    const fociAssessment = await this.assessFOCI(organizationId);

    return {
      formNumber: 'SF 328',
      title: 'Certificate Pertaining to Foreign Interests',
      organizationId,
      generatedAt: new Date(),
      sections: {
        section1: {
          title: 'Contractor Information',
          status: 'requires_input',
          fields: ['Legal name', 'Address', 'UEI', 'CAGE Code'],
        },
        section2: {
          title: 'Foreign Ownership Interest',
          status: 'completed',
          data: fociAssessment.assessment,
        },
        section3: {
          title: 'Foreign Officers/Directors',
          status: 'requires_input',
          fields: ['Names', 'Citizenships', 'Positions'],
        },
        section4: {
          title: 'Foreign Contracts',
          status: 'requires_input',
          fields: ['Contract details', 'Control provisions'],
        },
        section5: {
          title: 'Certification',
          status: 'pending',
          signatoryRequired: true,
        },
      },
      submissionMethod: 'NISS (National Industrial Security System)',
      deadline: 'Prior to FCL processing',
    };
  }

  /**
   * Generate DD Form 441 (DoD Security Agreement)
   */
  async generateDD441(organizationId: string): Promise<Record<string, unknown>> {
    console.log(`[WARDEN] Generating DD 441 data`);

    return {
      formNumber: 'DD 441',
      title: 'Department of Defense Security Agreement',
      organizationId,
      generatedAt: new Date(),
      agreementType: 'Standard',
      sections: {
        articleI: 'General Provisions',
        articleII: 'Classified Information',
        articleIII: 'Security Requirements',
        articleIV: 'Contracting and Subcontracting',
        articleV: 'Termination',
      },
      signatories: {
        contractor: { required: true, status: 'pending' },
        governmentRepresentative: { required: true, status: 'pending' },
      },
      effectiveUponSignature: true,
      renewalRequired: false,
      amendments: [],
    };
  }

  /**
   * Prepare DCSA submission package
   */
  async prepareDCSASubmission(organizationId: string): Promise<Record<string, unknown>> {
    console.log(`[WARDEN] Preparing DCSA submission package`);

    const fclAssessment = await this.assessFCLReadiness(organizationId, 'secret');
    const sf328 = await this.generateSF328(organizationId);
    const dd441 = await this.generateDD441(organizationId);

    const requiredDocuments = [
      { name: 'SF 328', status: sf328.sections ? 'in_progress' : 'pending', required: true },
      { name: 'DD 441', status: 'pending', required: true },
      { name: 'Key Management Personnel List', status: 'pending', required: true },
      { name: 'Organizational Chart', status: 'pending', required: true },
      { name: 'Copies of Articles of Incorporation', status: 'pending', required: true },
      { name: 'Bylaws', status: 'pending', required: true },
      { name: 'List of Officers, Directors, Partners', status: 'pending', required: true },
      { name: 'Facility Address Verification', status: 'pending', required: true },
    ];

    const completedDocs = requiredDocuments.filter(d => d.status === 'completed').length;

    return {
      organizationId,
      generatedAt: new Date(),
      fclReadinessScore: fclAssessment.overallScore,
      submissionReadiness: Math.round((completedDocs / requiredDocuments.length) * 100),
      requiredDocuments,
      submissionChecklist: [
        'Complete all required forms',
        'Obtain required signatures',
        'Verify SAM.gov registration is current',
        'Confirm UEI/CAGE Code accuracy',
        'Prepare supporting documentation',
        'Submit via NISS portal',
      ],
      estimatedProcessingTime: '90-180 days',
      dcsaContacts: {
        general: 'dcsa.mil',
        industry: 'Industrial Security Field Operations',
      },
      nextSteps: fclAssessment.nextSteps,
    };
  }

  // ============ PRIVATE HELPER METHODS ============

  private async getRequirementStatuses(
    organizationId: string,
    requirements: NISPOMRequirement[]
  ): Promise<Array<{ requirementId: string; status: RequirementStatus }>> {
    // In production, query from database
    return requirements.map(r => ({
      requirementId: r.id,
      status: 'not_started' as RequirementStatus,
    }));
  }

  private estimateEffort(requirement: NISPOMRequirement): string {
    const effortMap: Record<FCLCategory, string> = {
      facility: '2-4 weeks',
      personnel: '4-8 weeks',
      it: '2-6 weeks',
      foci: '1-2 weeks',
      insider_threat: '2-4 weeks',
      training: '1-2 weeks',
    };
    return effortMap[requirement.category] || '2-4 weeks';
  }

  private generateFCLRecommendations(
    gaps: FCLGap[],
    byCategory: Record<string, CategoryScore>
  ): string[] {
    const recommendations: string[] = [];

    // Priority 1: Critical gaps
    const criticalGaps = gaps.filter(g => g.severity === 'critical');
    if (criticalGaps.length > 0) {
      recommendations.push(`Address ${criticalGaps.length} critical requirements first`);
    }

    // Priority 2: Low-scoring categories
    for (const [category, score] of Object.entries(byCategory)) {
      if (score.score < 50) {
        recommendations.push(`Focus on ${category.replace('_', ' ')} - currently at ${score.score}%`);
      }
    }

    // Standard recommendations
    if (byCategory.personnel?.score < 100) {
      recommendations.push('Designate FSO and initiate clearance processing');
    }
    if (byCategory.foci?.score < 100) {
      recommendations.push('Complete SF 328 foreign interests certification');
    }
    if (byCategory.insider_threat?.score < 100) {
      recommendations.push('Establish insider threat program');
    }

    return recommendations;
  }

  private generateNextSteps(gaps: FCLGap[], overallScore: number): string[] {
    const steps: string[] = [];

    if (overallScore < 50) {
      steps.push('Conduct comprehensive gap analysis with security consultant');
      steps.push('Develop FCL implementation roadmap');
    } else if (overallScore < 90) {
      steps.push('Address remaining gaps systematically');
      steps.push('Prepare documentation for DCSA submission');
    } else {
      steps.push('Finalize all required forms (SF 328, DD 441)');
      steps.push('Submit FCL package via NISS');
      steps.push('Schedule DCSA vulnerability assessment');
    }

    return steps;
  }

  private estimateTimeToReady(gaps: FCLGap[]): string {
    const criticalCount = gaps.filter(g => g.severity === 'critical').length;
    const majorCount = gaps.filter(g => g.severity === 'major').length;

    if (criticalCount === 0 && majorCount === 0) return '2-4 weeks';
    if (criticalCount <= 2 && majorCount <= 3) return '2-3 months';
    if (criticalCount <= 5) return '4-6 months';
    return '6-12 months';
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default WardenAgent;
