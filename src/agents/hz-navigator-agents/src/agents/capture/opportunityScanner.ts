/**
 * CAPTURE - Opportunity Scanner Agent
 * 
 * Federal and SLED contract opportunity discovery, bid/no-bid analysis,
 * competitive intelligence, and pipeline management.
 * 
 * Integrates with SAM.gov, GovWin, state procurement portals.
 */

import { PrismaClient, Prisma } from '@prisma/client';

export type OpportunityStatus = 
  | 'discovered' 
  | 'analyzing' 
  | 'qualified' 
  | 'pursuing' 
  | 'bid_submitted' 
  | 'won' 
  | 'lost' 
  | 'no_bid';

export type SetAsideType = 
  | 'hubzone' 
  | 'hubzone_sole' 
  | '8a' 
  | 'sdvosb' 
  | 'wosb' 
  | 'small_business' 
  | 'full_open';

export interface Opportunity {
  id: string;
  title: string;
  agency: string;
  noticeId: string;
  setAside: SetAsideType;
  estimatedValue: number;
  responseDeadline: Date;
  naicsCode: string;
  placeOfPerformance: string;
  description: string;
  matchScore: number;
  status: OpportunityStatus;
}

export interface BidDecision {
  opportunityId: string;
  decision: 'bid' | 'no_bid';
  confidence: number;
  factors: {
    favorable: string[];
    unfavorable: string[];
  };
  estimatedWinProbability: number;
  requiredResources: string[];
  recommendations: string[];
}

/**
 * CAPTURE Agent - Opportunity discovery and bid intelligence
 */
export class CaptureAgent {
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
    console.log(`[CAPTURE] Executing: ${taskType}`);

    switch (taskType) {
      case 'scan_opportunities':
        return await this.scanOpportunities(organizationId, input);

      case 'analyze_opportunity':
        return await this.analyzeOpportunity(
          organizationId,
          input.opportunityId as string
        );

      case 'bid_no_bid':
        return await this.bidNoBidAnalysis(
          organizationId,
          input.opportunityId as string
        );

      case 'get_pipeline':
        return await this.getPipeline(organizationId);

      case 'update_opportunity_status':
        return await this.updateOpportunityStatus(
          organizationId,
          input.opportunityId as string,
          input.status as OpportunityStatus
        );

      case 'competitive_analysis':
        return await this.competitiveAnalysis(
          organizationId,
          input.opportunityId as string
        );

      case 'match_capabilities':
        return await this.matchCapabilities(
          organizationId,
          input.requirements as string[]
        );

      case 'forecast_pipeline':
        return await this.forecastPipeline(organizationId);

      default:
        throw new Error(`[CAPTURE] Unknown task type: ${taskType}`);
    }
  }

  /**
   * Scan for new opportunities matching organization profile
   */
  async scanOpportunities(
    organizationId: string,
    filters: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    console.log(`[CAPTURE] Scanning opportunities for org: ${organizationId}`);

    // Get organization profile
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      throw new Error(`Organization not found: ${organizationId}`);
    }

    // Build search criteria
    const searchCriteria = {
      setAsides: filters.setAsides as string[] || ['hubzone', 'hubzone_sole', 'small_business'],
      naicsCodes: filters.naicsCodes as string[] || ['541511', '541512', '541519'],
      minValue: filters.minValue as number || 50000,
      maxValue: filters.maxValue as number || 5000000,
      states: filters.states as string[] || [],
      keywords: filters.keywords as string[] || [],
    };

    // In production, this would call SAM.gov API
    // For now, return mock opportunities
    const opportunities = await this.fetchOpportunities(searchCriteria);

    // Score and rank opportunities
    const scoredOpportunities = opportunities.map(opp => ({
      ...opp,
      matchScore: this.calculateMatchScore(opp, org),
    }));

    // Sort by match score
    scoredOpportunities.sort((a, b) => b.matchScore - a.matchScore);

    // Save new opportunities to database
    for (const opp of scoredOpportunities) {
      await this.saveOpportunity(organizationId, opp);
    }

    return {
      searchCriteria,
      totalFound: scoredOpportunities.length,
      hubzoneSetAsides: scoredOpportunities.filter(o => 
        o.setAside === 'hubzone' || o.setAside === 'hubzone_sole'
      ).length,
      opportunities: scoredOpportunities.slice(0, 20), // Top 20
      nextScan: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    };
  }

  /**
   * Deep analysis of a specific opportunity
   */
  async analyzeOpportunity(
    organizationId: string,
    opportunityId: string
  ): Promise<Record<string, unknown>> {
    const opportunity = await this.prisma.contractOpportunity.findFirst({
      where: { id: opportunityId, organizationId },
    });

    if (!opportunity) {
      throw new Error(`Opportunity not found: ${opportunityId}`);
    }

    // Get organization capabilities
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    // Analyze fit
    const analysis = {
      technicalFit: this.assessTechnicalFit(opportunity, org),
      pastPerformance: await this.assessPastPerformance(organizationId, opportunity),
      competitivePosition: this.assessCompetitivePosition(opportunity),
      resourceRequirements: this.estimateResources(opportunity),
      riskAssessment: this.assessRisks(opportunity),
    };

    // Update opportunity with analysis
    await this.prisma.contractOpportunity.update({
      where: { id: opportunityId },
      data: {
        status: 'analyzing',
        analysisData: analysis as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      opportunity: {
        id: opportunity.id,
        title: opportunity.title,
        agency: opportunity.agency,
        value: opportunity.estimatedValue,
        deadline: opportunity.responseDeadline,
      },
      analysis,
      recommendation: this.generateRecommendation(analysis),
    };
  }

  /**
   * Bid/No-Bid decision analysis
   */
  async bidNoBidAnalysis(
    organizationId: string,
    opportunityId: string
  ): Promise<Record<string, unknown>> {
    const opportunity = await this.prisma.contractOpportunity.findFirst({
      where: { id: opportunityId, organizationId },
    });

    if (!opportunity) {
      throw new Error(`Opportunity not found: ${opportunityId}`);
    }

    // Scoring factors
    const factors = {
      // Favorable factors
      favorable: [] as string[],
      unfavorable: [] as string[],
    };

    let score = 50; // Start neutral

    // HUBZone set-aside bonus
    if (opportunity.setAside === 'hubzone' || opportunity.setAside === 'hubzone_sole') {
      score += 20;
      factors.favorable.push('HUBZone set-aside aligns with certification');
    }

    // Value assessment
    const value = opportunity.estimatedValue || 0;
    if (value >= 100000 && value <= 2000000) {
      score += 10;
      factors.favorable.push('Contract value in target range');
    } else if (value > 5000000) {
      score -= 10;
      factors.unfavorable.push('Contract value may exceed capacity');
    }

    // Timeline assessment
    const daysToDeadline = opportunity.responseDeadline
      ? Math.floor((opportunity.responseDeadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 0;

    if (daysToDeadline < 7) {
      score -= 20;
      factors.unfavorable.push('Insufficient time to prepare quality response');
    } else if (daysToDeadline >= 30) {
      score += 5;
      factors.favorable.push('Adequate preparation time');
    }

    // NAICS alignment
    const orgNaics = ['541511', '541512', '541519']; // Would come from org profile
    if (opportunity.naicsCode && orgNaics.includes(opportunity.naicsCode)) {
      score += 15;
      factors.favorable.push('NAICS code matches capabilities');
    }

    // Calculate win probability
    const winProbability = Math.min(95, Math.max(5, score));

    // Make decision
    const decision: 'bid' | 'no_bid' = score >= 50 ? 'bid' : 'no_bid';

    const result: BidDecision = {
      opportunityId,
      decision,
      confidence: Math.abs(score - 50) / 50,
      factors,
      estimatedWinProbability: winProbability,
      requiredResources: this.estimateRequiredResources(opportunity),
      recommendations: this.getBidRecommendations(decision, factors),
    };

    // Save decision
    await this.prisma.contractOpportunity.update({
      where: { id: opportunityId },
      data: {
        status: decision === 'bid' ? 'pursuing' : 'no_bid',
        bidDecision: result as unknown as Prisma.InputJsonValue,
      },
    });

    return result as unknown as Record<string, unknown>;
  }

  /**
   * Get opportunity pipeline
   */
  async getPipeline(organizationId: string): Promise<Record<string, unknown>> {
    const opportunities = await this.prisma.contractOpportunity.findMany({
      where: { organizationId },
      orderBy: { responseDeadline: 'asc' },
    });

    const pipeline = {
      discovered: opportunities.filter(o => o.status === 'discovered'),
      analyzing: opportunities.filter(o => o.status === 'analyzing'),
      qualified: opportunities.filter(o => o.status === 'qualified'),
      pursuing: opportunities.filter(o => o.status === 'pursuing'),
      submitted: opportunities.filter(o => o.status === 'bid_submitted'),
    };

    const totalValue = opportunities
      .filter(o => ['qualified', 'pursuing', 'bid_submitted'].includes(o.status || ''))
      .reduce((sum, o) => sum + (o.estimatedValue || 0), 0);

    const weightedValue = opportunities
      .filter(o => ['qualified', 'pursuing', 'bid_submitted'].includes(o.status || ''))
      .reduce((sum, o) => {
        const probability = (o.winProbability || 30) / 100;
        return sum + ((o.estimatedValue || 0) * probability);
      }, 0);

    return {
      summary: {
        totalOpportunities: opportunities.length,
        activeOpportunities: opportunities.filter(o => 
          !['won', 'lost', 'no_bid'].includes(o.status || '')
        ).length,
        totalPipelineValue: totalValue,
        weightedPipelineValue: weightedValue,
      },
      byStatus: {
        discovered: pipeline.discovered.length,
        analyzing: pipeline.analyzing.length,
        qualified: pipeline.qualified.length,
        pursuing: pipeline.pursuing.length,
        submitted: pipeline.submitted.length,
      },
      upcomingDeadlines: opportunities
        .filter(o => o.responseDeadline && o.responseDeadline > new Date())
        .slice(0, 10)
        .map(o => ({
          id: o.id,
          title: o.title,
          deadline: o.responseDeadline,
          daysRemaining: Math.floor(
            ((o.responseDeadline?.getTime() || 0) - Date.now()) / (1000 * 60 * 60 * 24)
          ),
        })),
    };
  }

  /**
   * Update opportunity status
   */
  async updateOpportunityStatus(
    organizationId: string,
    opportunityId: string,
    status: OpportunityStatus
  ): Promise<Record<string, unknown>> {
    const opportunity = await this.prisma.contractOpportunity.findFirst({
      where: { id: opportunityId, organizationId },
    });

    if (!opportunity) {
      throw new Error(`Opportunity not found: ${opportunityId}`);
    }

    await this.prisma.contractOpportunity.update({
      where: { id: opportunityId },
      data: { status },
    });

    return {
      success: true,
      opportunity: {
        id: opportunityId,
        title: opportunity.title,
        previousStatus: opportunity.status,
        newStatus: status,
      },
    };
  }

  /**
   * Competitive analysis for an opportunity
   */
  async competitiveAnalysis(
    organizationId: string,
    opportunityId: string
  ): Promise<Record<string, unknown>> {
    const opportunity = await this.prisma.contractOpportunity.findFirst({
      where: { id: opportunityId, organizationId },
    });

    if (!opportunity) {
      throw new Error(`Opportunity not found: ${opportunityId}`);
    }

    // In production, would analyze:
    // - Incumbent contractor
    // - Known competitors
    // - Historical win data
    // - Pricing intelligence

    return {
      opportunity: {
        id: opportunity.id,
        title: opportunity.title,
        setAside: opportunity.setAside,
      },
      competitiveLandscape: {
        estimatedCompetitors: 5, // Placeholder
        incumbentAdvantage: opportunity.isRecompete || false,
        hubzoneCompetitors: 2, // Placeholder
        marketIntel: 'Limited competitive data available',
      },
      positioning: {
        strengths: [
          'HUBZone certification',
          'Technical capabilities match',
          'Competitive pricing',
        ],
        weaknesses: [
          'Limited past performance in this specific area',
        ],
        differentiators: [
          'AI-powered solutions',
          'Agile delivery methodology',
        ],
      },
      recommendations: [
        'Emphasize HUBZone certification in proposal',
        'Partner with experienced firm for past performance',
        'Price competitively given HUBZone set-aside',
      ],
    };
  }

  /**
   * Match organizational capabilities to requirements
   */
  async matchCapabilities(
    organizationId: string,
    requirements: string[]
  ): Promise<Record<string, unknown>> {
    // Would match against organization capability database
    const capabilities = [
      'Cloud Migration',
      'AI/ML Development',
      'Healthcare IT',
      'Cybersecurity',
      'Data Analytics',
      'Custom Software Development',
    ];

    const matches: Array<{ requirement: string; capability: string; confidence: number }> = [];
    const gaps: string[] = [];

    for (const req of requirements) {
      const match = capabilities.find(cap => 
        cap.toLowerCase().includes(req.toLowerCase()) ||
        req.toLowerCase().includes(cap.toLowerCase())
      );

      if (match) {
        matches.push({ requirement: req, capability: match, confidence: 0.8 });
      } else {
        gaps.push(req);
      }
    }

    return {
      requirements: requirements.length,
      matched: matches.length,
      gapCount: gaps.length,
      matchRate: requirements.length > 0 ? (matches.length / requirements.length) * 100 : 0,
      matches,
      gaps,
      recommendations: gaps.length > 0
        ? ['Consider teaming partner for gap capabilities', 'Identify subcontractors']
        : ['Strong capability alignment'],
    };
  }

  /**
   * Forecast pipeline outcomes
   */
  async forecastPipeline(organizationId: string): Promise<Record<string, unknown>> {
    const opportunities = await this.prisma.contractOpportunity.findMany({
      where: {
        organizationId,
        status: { in: ['qualified', 'pursuing', 'bid_submitted'] },
      },
    });

    const forecast = {
      next30Days: { opportunities: 0, expectedValue: 0 },
      next90Days: { opportunities: 0, expectedValue: 0 },
      next180Days: { opportunities: 0, expectedValue: 0 },
    };

    const now = Date.now();

    for (const opp of opportunities) {
      const expectedValue = (opp.estimatedValue || 0) * ((opp.winProbability || 30) / 100);
      const deadline = opp.responseDeadline?.getTime() || now;
      const daysOut = (deadline - now) / (1000 * 60 * 60 * 24);

      if (daysOut <= 30) {
        forecast.next30Days.opportunities++;
        forecast.next30Days.expectedValue += expectedValue;
      }
      if (daysOut <= 90) {
        forecast.next90Days.opportunities++;
        forecast.next90Days.expectedValue += expectedValue;
      }
      if (daysOut <= 180) {
        forecast.next180Days.opportunities++;
        forecast.next180Days.expectedValue += expectedValue;
      }
    }

    return {
      totalActive: opportunities.length,
      forecast,
      assumptions: 'Based on current win probability estimates',
      recommendation: this.getForecastRecommendation(forecast),
    };
  }

  // ============ PRIVATE HELPER METHODS ============

  private async fetchOpportunities(
    criteria: Record<string, unknown>
  ): Promise<Array<Partial<Opportunity>>> {
    // Mock data - would call SAM.gov API
    return [
      {
        id: 'opp-001',
        title: 'Cloud Migration Services',
        agency: 'Department of Health and Human Services',
        noticeId: 'HHS-2024-001',
        setAside: 'hubzone' as SetAsideType,
        estimatedValue: 500000,
        responseDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        naicsCode: '541512',
        placeOfPerformance: 'Washington, DC',
        description: 'Cloud migration and modernization services',
      },
      {
        id: 'opp-002',
        title: 'IT Help Desk Support',
        agency: 'Department of Veterans Affairs',
        noticeId: 'VA-2024-002',
        setAside: 'hubzone_sole' as SetAsideType,
        estimatedValue: 250000,
        responseDeadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        naicsCode: '541511',
        placeOfPerformance: 'Remote',
        description: 'IT help desk and support services',
      },
    ];
  }

  private calculateMatchScore(
    opportunity: Partial<Opportunity>,
    org: { id: string } | null
  ): number {
    let score = 50;

    // HUBZone set-aside bonus
    if (opportunity.setAside === 'hubzone' || opportunity.setAside === 'hubzone_sole') {
      score += 30;
    }

    // Value range scoring
    const value = opportunity.estimatedValue || 0;
    if (value >= 100000 && value <= 1000000) {
      score += 15;
    }

    return Math.min(100, score);
  }

  private async saveOpportunity(
    organizationId: string,
    opportunity: Partial<Opportunity> & { matchScore: number }
  ): Promise<void> {
    try {
      await this.prisma.contractOpportunity.upsert({
        where: {
          organizationId_noticeId: {
            organizationId,
            noticeId: opportunity.noticeId || '',
          },
        },
        update: {
          matchScore: opportunity.matchScore,
        },
        create: {
          organizationId,
          title: opportunity.title || '',
          agency: opportunity.agency || '',
          noticeId: opportunity.noticeId || '',
          setAside: opportunity.setAside || 'full_open',
          estimatedValue: opportunity.estimatedValue || 0,
          responseDeadline: opportunity.responseDeadline,
          naicsCode: opportunity.naicsCode,
          placeOfPerformance: opportunity.placeOfPerformance,
          description: opportunity.description,
          matchScore: opportunity.matchScore,
          status: 'discovered',
        },
      });
    } catch (error) {
      console.error('[CAPTURE] Failed to save opportunity:', error);
    }
  }

  private assessTechnicalFit(
    opportunity: { naicsCode: string | null },
    org: { id: string } | null
  ): { score: number; notes: string[] } {
    return {
      score: 75,
      notes: ['NAICS code aligns with capabilities', 'Technical requirements match'],
    };
  }

  private async assessPastPerformance(
    organizationId: string,
    opportunity: Record<string, unknown>
  ): Promise<{ score: number; relevantContracts: number }> {
    return {
      score: 60,
      relevantContracts: 2,
    };
  }

  private assessCompetitivePosition(
    opportunity: Record<string, unknown>
  ): { score: number; position: string } {
    return {
      score: 70,
      position: 'Competitive with HUBZone advantage',
    };
  }

  private estimateResources(
    opportunity: { estimatedValue: number | null }
  ): { proposalHours: number; teamSize: number } {
    const value = opportunity.estimatedValue || 100000;
    return {
      proposalHours: Math.min(200, Math.max(40, value / 5000)),
      teamSize: Math.min(10, Math.max(2, Math.floor(value / 200000))),
    };
  }

  private assessRisks(opportunity: Record<string, unknown>): string[] {
    return [
      'Competitive field may include incumbent',
      'Tight timeline for proposal preparation',
    ];
  }

  private generateRecommendation(analysis: Record<string, unknown>): string {
    return 'Recommend proceeding to bid/no-bid analysis';
  }

  private estimateRequiredResources(
    opportunity: { estimatedValue: number | null }
  ): string[] {
    return [
      'Proposal manager',
      'Technical writer',
      'Subject matter experts',
      'Pricing analyst',
    ];
  }

  private getBidRecommendations(
    decision: 'bid' | 'no_bid',
    factors: { favorable: string[]; unfavorable: string[] }
  ): string[] {
    if (decision === 'bid') {
      return [
        'Proceed with proposal development',
        'Assign proposal manager immediately',
        'Schedule kickoff meeting',
      ];
    }
    return [
      'Document decision rationale',
      'Monitor for recompete or similar opportunities',
    ];
  }

  private getForecastRecommendation(
    forecast: Record<string, { opportunities: number; expectedValue: number }>
  ): string {
    const thirtyDayValue = forecast.next30Days.expectedValue;
    if (thirtyDayValue < 100000) {
      return 'Pipeline needs strengthening - increase prospecting activities';
    }
    return 'Pipeline is healthy - maintain current capture activities';
  }
}
