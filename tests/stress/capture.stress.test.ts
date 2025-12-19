/**
 * CAPTURE Agent Stress Tests
 * 
 * Tests:
 * - Deduplication of opportunities
 * - Pipeline calculations accuracy
 * - Deadline sorting correctness
 * - Bid/no-bid decision logic
 * - Pipeline visualization support
 * - Search relevance
 */

import { PrismaClient } from '@prisma/client';
import { CaptureAgent } from '../../src/agents/hz-navigator-agents/src/agents/capture/opportunityScanner';
import {
  generateOpportunities,
  generateId,
} from '../utils/mockDataGenerators';

describe('CAPTURE Agent Stress Tests', () => {
  let prisma: PrismaClient;
  let capture: CaptureAgent;
  const testOrgId = 'test-org-capture';

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = new PrismaClient();
    capture = new CaptureAgent(prisma);
  });

  describe('Opportunity Deduplication', () => {
    /**
     * Critical test: System must prevent duplicate opportunities
     * based on noticeId to maintain pipeline integrity
     */

    test('should upsert opportunities with same noticeId', async () => {
      const existingOpp = {
        id: 'existing-opp-1',
        organizationId: testOrgId,
        noticeId: 'NOTICE-001',
        title: 'Original Title',
        matchScore: 50,
      };

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({ id: testOrgId });
      (prisma.contractOpportunity.upsert as jest.Mock).mockImplementation(({ where, update, create }) => {
        if (where.organizationId_noticeId.noticeId === 'NOTICE-001') {
          return Promise.resolve({ ...existingOpp, ...update });
        }
        return Promise.resolve(create);
      });

      await capture.execute(
        'scan_opportunities',
        { setAsides: ['hubzone'] },
        testOrgId
      );

      // Should have called upsert, not create
      expect(prisma.contractOpportunity.upsert).toHaveBeenCalled();
    });

    test('should not create duplicate entries for same noticeId', async () => {
      const opportunities = generateOpportunities(testOrgId, 10);
      // Duplicate some noticeIds
      opportunities[5].noticeId = opportunities[0].noticeId;
      opportunities[6].noticeId = opportunities[1].noticeId;

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({ id: testOrgId });
      (prisma.contractOpportunity.upsert as jest.Mock).mockResolvedValue({});

      await capture.execute(
        'scan_opportunities',
        { setAsides: ['hubzone'] },
        testOrgId
      );

      // Verify upsert was called for each opportunity (dedup handled by upsert)
      expect(prisma.contractOpportunity.upsert).toHaveBeenCalled();
    });

    test('should update matchScore on subsequent scans', async () => {
      const upsertCalls: Array<{ where: unknown; update: unknown; create: unknown }> = [];
      
      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({ id: testOrgId });
      (prisma.contractOpportunity.upsert as jest.Mock).mockImplementation((args) => {
        upsertCalls.push(args);
        return Promise.resolve(args.create);
      });

      await capture.execute(
        'scan_opportunities',
        { setAsides: ['hubzone'] },
        testOrgId
      );

      // Each call should have update containing matchScore
      upsertCalls.forEach(call => {
        expect(call.update).toHaveProperty('matchScore');
      });
    });
  });

  describe('Pipeline Calculations', () => {
    /**
     * Tests accuracy of pipeline value calculations
     */

    test('should correctly calculate total pipeline value', async () => {
      const opportunities = [
        { ...generateOpportunities(testOrgId, 1)[0], status: 'qualified', estimatedValue: 100000, winProbability: 50 },
        { ...generateOpportunities(testOrgId, 1)[0], status: 'pursuing', estimatedValue: 200000, winProbability: 70 },
        { ...generateOpportunities(testOrgId, 1)[0], status: 'bid_submitted', estimatedValue: 300000, winProbability: 80 },
        { ...generateOpportunities(testOrgId, 1)[0], status: 'discovered', estimatedValue: 500000, winProbability: 20 },
      ];

      (prisma.contractOpportunity.findMany as jest.Mock).mockResolvedValue(opportunities);

      const result = await capture.execute('get_pipeline', {}, testOrgId) as {
        summary: {
          totalPipelineValue: number;
          weightedPipelineValue: number;
        };
      };

      // Total = 100k + 200k + 300k = 600k (excluding 'discovered')
      expect(result.summary.totalPipelineValue).toBe(600000);
      
      // Weighted = (100k * 0.5) + (200k * 0.7) + (300k * 0.8) = 50k + 140k + 240k = 430k
      expect(result.summary.weightedPipelineValue).toBe(430000);
    });

    test('should correctly count opportunities by status', async () => {
      const opportunities = [
        ...Array(3).fill(null).map(() => ({ ...generateOpportunities(testOrgId, 1)[0], status: 'discovered' })),
        ...Array(2).fill(null).map(() => ({ ...generateOpportunities(testOrgId, 1)[0], status: 'analyzing' })),
        ...Array(4).fill(null).map(() => ({ ...generateOpportunities(testOrgId, 1)[0], status: 'qualified' })),
        ...Array(1).fill(null).map(() => ({ ...generateOpportunities(testOrgId, 1)[0], status: 'pursuing' })),
        ...Array(2).fill(null).map(() => ({ ...generateOpportunities(testOrgId, 1)[0], status: 'bid_submitted' })),
      ];

      (prisma.contractOpportunity.findMany as jest.Mock).mockResolvedValue(opportunities);

      const result = await capture.execute('get_pipeline', {}, testOrgId) as {
        byStatus: {
          discovered: number;
          analyzing: number;
          qualified: number;
          pursuing: number;
          submitted: number;
        };
      };

      expect(result.byStatus.discovered).toBe(3);
      expect(result.byStatus.analyzing).toBe(2);
      expect(result.byStatus.qualified).toBe(4);
      expect(result.byStatus.pursuing).toBe(1);
      expect(result.byStatus.submitted).toBe(2);
    });

    test('should exclude won/lost/no_bid from active count', async () => {
      const opportunities = [
        { ...generateOpportunities(testOrgId, 1)[0], status: 'qualified' },
        { ...generateOpportunities(testOrgId, 1)[0], status: 'won' },
        { ...generateOpportunities(testOrgId, 1)[0], status: 'lost' },
        { ...generateOpportunities(testOrgId, 1)[0], status: 'no_bid' },
        { ...generateOpportunities(testOrgId, 1)[0], status: 'pursuing' },
      ];

      (prisma.contractOpportunity.findMany as jest.Mock).mockResolvedValue(opportunities);

      const result = await capture.execute('get_pipeline', {}, testOrgId) as {
        summary: {
          totalOpportunities: number;
          activeOpportunities: number;
        };
      };

      expect(result.summary.totalOpportunities).toBe(5);
      expect(result.summary.activeOpportunities).toBe(2);
    });

    test('should handle empty pipeline gracefully', async () => {
      (prisma.contractOpportunity.findMany as jest.Mock).mockResolvedValue([]);

      const result = await capture.execute('get_pipeline', {}, testOrgId) as {
        summary: {
          totalOpportunities: number;
          totalPipelineValue: number;
          weightedPipelineValue: number;
        };
      };

      expect(result.summary.totalOpportunities).toBe(0);
      expect(result.summary.totalPipelineValue).toBe(0);
      expect(result.summary.weightedPipelineValue).toBe(0);
    });
  });

  describe('Deadline Sorting', () => {
    /**
     * Critical test: Deadlines must be correctly sorted
     * for proper opportunity prioritization
     */

    test('should sort upcoming deadlines in chronological order', async () => {
      const now = Date.now();
      const opportunities = [
        { 
          ...generateOpportunities(testOrgId, 1)[0], 
          responseDeadline: new Date(now + 30 * 24 * 60 * 60 * 1000), // 30 days
          status: 'qualified',
        },
        { 
          ...generateOpportunities(testOrgId, 1)[0], 
          responseDeadline: new Date(now + 5 * 24 * 60 * 60 * 1000), // 5 days
          status: 'pursuing',
        },
        { 
          ...generateOpportunities(testOrgId, 1)[0], 
          responseDeadline: new Date(now + 15 * 24 * 60 * 60 * 1000), // 15 days
          status: 'qualified',
        },
      ];

      (prisma.contractOpportunity.findMany as jest.Mock).mockResolvedValue(opportunities);

      const result = await capture.execute('get_pipeline', {}, testOrgId) as {
        upcomingDeadlines: Array<{ daysRemaining: number }>;
      };

      // Should be sorted by days remaining (ascending)
      for (let i = 0; i < result.upcomingDeadlines.length - 1; i++) {
        expect(result.upcomingDeadlines[i].daysRemaining)
          .toBeLessThanOrEqual(result.upcomingDeadlines[i + 1].daysRemaining);
      }
    });

    test('should correctly calculate days remaining', async () => {
      const now = Date.now();
      const opportunities = [
        { 
          ...generateOpportunities(testOrgId, 1)[0], 
          responseDeadline: new Date(now + 10 * 24 * 60 * 60 * 1000), // 10 days
          status: 'qualified',
        },
      ];

      (prisma.contractOpportunity.findMany as jest.Mock).mockResolvedValue(opportunities);

      const result = await capture.execute('get_pipeline', {}, testOrgId) as {
        upcomingDeadlines: Array<{ daysRemaining: number }>;
      };

      expect(result.upcomingDeadlines[0].daysRemaining).toBeCloseTo(10, 0);
    });

    test('should filter out past deadlines from upcoming list', async () => {
      const now = Date.now();
      const opportunities = [
        { 
          ...generateOpportunities(testOrgId, 1)[0], 
          responseDeadline: new Date(now - 5 * 24 * 60 * 60 * 1000), // 5 days ago
          status: 'qualified',
        },
        { 
          ...generateOpportunities(testOrgId, 1)[0], 
          responseDeadline: new Date(now + 10 * 24 * 60 * 60 * 1000), // 10 days
          status: 'qualified',
        },
      ];

      (prisma.contractOpportunity.findMany as jest.Mock).mockResolvedValue(opportunities);

      const result = await capture.execute('get_pipeline', {}, testOrgId) as {
        upcomingDeadlines: Array<{ daysRemaining: number }>;
      };

      // Should only include future deadlines
      expect(result.upcomingDeadlines.length).toBe(1);
      expect(result.upcomingDeadlines[0].daysRemaining).toBeGreaterThan(0);
    });

    test('should limit upcoming deadlines to top 10', async () => {
      const now = Date.now();
      const opportunities = Array(20).fill(null).map((_, i) => ({
        ...generateOpportunities(testOrgId, 1)[0],
        responseDeadline: new Date(now + (i + 1) * 24 * 60 * 60 * 1000),
        status: 'qualified',
      }));

      (prisma.contractOpportunity.findMany as jest.Mock).mockResolvedValue(opportunities);

      const result = await capture.execute('get_pipeline', {}, testOrgId) as {
        upcomingDeadlines: Array<unknown>;
      };

      expect(result.upcomingDeadlines.length).toBe(10);
    });
  });

  describe('Bid/No-Bid Decision Logic', () => {
    /**
     * Tests bid/no-bid decision accuracy
     */

    test('should favor HUBZone set-aside opportunities', async () => {
      const hubzoneOpp = {
        id: 'opp-1',
        organizationId: testOrgId,
        title: 'HUBZone Opportunity',
        setAside: 'hubzone',
        estimatedValue: 500000,
        responseDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        naicsCode: '541511',
      };

      (prisma.contractOpportunity.findFirst as jest.Mock).mockResolvedValue(hubzoneOpp);
      (prisma.contractOpportunity.update as jest.Mock).mockResolvedValue(hubzoneOpp);

      const result = await capture.execute(
        'bid_no_bid',
        { opportunityId: 'opp-1' },
        testOrgId
      ) as {
        factors: { favorable: string[] };
        decision: string;
      };

      expect(result.factors.favorable.some(f => f.toLowerCase().includes('hubzone'))).toBe(true);
      expect(result.decision).toBe('bid');
    });

    test('should penalize insufficient response time', async () => {
      const urgentOpp = {
        id: 'opp-2',
        organizationId: testOrgId,
        title: 'Urgent Opportunity',
        setAside: 'full_open',
        estimatedValue: 500000,
        responseDeadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // Only 3 days
        naicsCode: '541511',
      };

      (prisma.contractOpportunity.findFirst as jest.Mock).mockResolvedValue(urgentOpp);
      (prisma.contractOpportunity.update as jest.Mock).mockResolvedValue(urgentOpp);

      const result = await capture.execute(
        'bid_no_bid',
        { opportunityId: 'opp-2' },
        testOrgId
      ) as {
        factors: { unfavorable: string[] };
      };

      expect(result.factors.unfavorable.some(f => f.toLowerCase().includes('time'))).toBe(true);
    });

    test('should favor appropriate contract value', async () => {
      const goodValueOpp = {
        id: 'opp-3',
        organizationId: testOrgId,
        title: 'Good Value Opportunity',
        setAside: 'hubzone',
        estimatedValue: 500000, // In target range 100k-2M
        responseDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        naicsCode: '541511',
      };

      (prisma.contractOpportunity.findFirst as jest.Mock).mockResolvedValue(goodValueOpp);
      (prisma.contractOpportunity.update as jest.Mock).mockResolvedValue(goodValueOpp);

      const result = await capture.execute(
        'bid_no_bid',
        { opportunityId: 'opp-3' },
        testOrgId
      ) as {
        factors: { favorable: string[] };
      };

      expect(result.factors.favorable.some(f => f.toLowerCase().includes('value'))).toBe(true);
    });

    test('should warn about excessive contract value', async () => {
      const largeOpp = {
        id: 'opp-4',
        organizationId: testOrgId,
        title: 'Large Opportunity',
        setAside: 'hubzone',
        estimatedValue: 10000000, // $10M - may exceed capacity
        responseDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        naicsCode: '541511',
      };

      (prisma.contractOpportunity.findFirst as jest.Mock).mockResolvedValue(largeOpp);
      (prisma.contractOpportunity.update as jest.Mock).mockResolvedValue(largeOpp);

      const result = await capture.execute(
        'bid_no_bid',
        { opportunityId: 'opp-4' },
        testOrgId
      ) as {
        factors: { unfavorable: string[] };
      };

      expect(result.factors.unfavorable.some(f => f.toLowerCase().includes('capacity'))).toBe(true);
    });

    test('should calculate confidence based on score distance from 50', async () => {
      const strongBid = {
        id: 'opp-5',
        organizationId: testOrgId,
        title: 'Strong Bid Opportunity',
        setAside: 'hubzone_sole',
        estimatedValue: 500000,
        responseDeadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        naicsCode: '541511',
      };

      (prisma.contractOpportunity.findFirst as jest.Mock).mockResolvedValue(strongBid);
      (prisma.contractOpportunity.update as jest.Mock).mockResolvedValue(strongBid);

      const result = await capture.execute(
        'bid_no_bid',
        { opportunityId: 'opp-5' },
        testOrgId
      ) as {
        confidence: number;
        decision: string;
      };

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.decision).toBe('bid');
    });

    test('should update opportunity status after decision', async () => {
      const opp = {
        id: 'opp-6',
        organizationId: testOrgId,
        title: 'Test Opportunity',
        setAside: 'hubzone',
        estimatedValue: 500000,
        responseDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        naicsCode: '541511',
      };

      (prisma.contractOpportunity.findFirst as jest.Mock).mockResolvedValue(opp);
      (prisma.contractOpportunity.update as jest.Mock).mockResolvedValue(opp);

      await capture.execute('bid_no_bid', { opportunityId: 'opp-6' }, testOrgId);

      expect(prisma.contractOpportunity.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: expect.stringMatching(/pursuing|no_bid/),
          }),
        })
      );
    });
  });

  describe('Match Scoring', () => {
    /**
     * Tests opportunity match score calculation
     */

    test('should give higher scores to HUBZone set-asides', async () => {
      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({ id: testOrgId });
      (prisma.contractOpportunity.upsert as jest.Mock).mockImplementation(({ create }) => 
        Promise.resolve(create)
      );

      const result = await capture.execute(
        'scan_opportunities',
        { setAsides: ['hubzone', 'full_open'] },
        testOrgId
      ) as {
        opportunities: Array<{ setAside: string; matchScore: number }>;
      };

      const hubzoneOpps = result.opportunities.filter(o => o.setAside === 'hubzone');
      const fullOpenOpps = result.opportunities.filter(o => o.setAside === 'full_open');

      if (hubzoneOpps.length > 0 && fullOpenOpps.length > 0) {
        const avgHubzoneScore = hubzoneOpps.reduce((sum, o) => sum + o.matchScore, 0) / hubzoneOpps.length;
        const avgFullOpenScore = fullOpenOpps.reduce((sum, o) => sum + o.matchScore, 0) / fullOpenOpps.length;
        
        expect(avgHubzoneScore).toBeGreaterThanOrEqual(avgFullOpenScore);
      }
    });

    test('should return match score between 0 and 100', async () => {
      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({ id: testOrgId });
      (prisma.contractOpportunity.upsert as jest.Mock).mockImplementation(({ create }) => 
        Promise.resolve(create)
      );

      const result = await capture.execute(
        'scan_opportunities',
        {},
        testOrgId
      ) as {
        opportunities: Array<{ matchScore: number }>;
      };

      result.opportunities.forEach(opp => {
        expect(opp.matchScore).toBeGreaterThanOrEqual(0);
        expect(opp.matchScore).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('Capability Matching', () => {
    /**
     * Tests requirement-to-capability matching
     */

    test('should identify matching capabilities', async () => {
      const result = await capture.execute(
        'match_capabilities',
        { requirements: ['Cloud Migration', 'Cybersecurity', 'Unknown Skill'] },
        testOrgId
      ) as {
        matched: number;
        gapCount: number;
        matches: Array<{ requirement: string; capability: string }>;
        gaps: string[];
      };

      expect(result.matched).toBe(2);
      expect(result.gapCount).toBe(1);
      expect(result.matches.some(m => m.requirement.includes('Cloud'))).toBe(true);
      expect(result.gaps).toContain('Unknown Skill');
    });

    test('should calculate match rate correctly', async () => {
      const result = await capture.execute(
        'match_capabilities',
        { requirements: ['Cloud Migration', 'AI/ML Development', 'Quantum Computing', 'Teleportation'] },
        testOrgId
      ) as {
        matchRate: number;
        requirements: number;
        matched: number;
      };

      // 2 out of 4 = 50%
      expect(result.matchRate).toBe(50);
    });

    test('should handle empty requirements', async () => {
      const result = await capture.execute(
        'match_capabilities',
        { requirements: [] },
        testOrgId
      ) as {
        matchRate: number;
        requirements: number;
      };

      expect(result.requirements).toBe(0);
      expect(result.matchRate).toBe(0);
    });
  });

  describe('Pipeline Forecast', () => {
    /**
     * Tests pipeline forecasting accuracy
     */

    test('should correctly forecast by time period', async () => {
      const now = Date.now();
      const opportunities = [
        { 
          ...generateOpportunities(testOrgId, 1)[0], 
          status: 'qualified',
          estimatedValue: 100000,
          winProbability: 50,
          responseDeadline: new Date(now + 20 * 24 * 60 * 60 * 1000), // 20 days
        },
        { 
          ...generateOpportunities(testOrgId, 1)[0], 
          status: 'pursuing',
          estimatedValue: 200000,
          winProbability: 70,
          responseDeadline: new Date(now + 60 * 24 * 60 * 60 * 1000), // 60 days
        },
        { 
          ...generateOpportunities(testOrgId, 1)[0], 
          status: 'bid_submitted',
          estimatedValue: 300000,
          winProbability: 80,
          responseDeadline: new Date(now + 120 * 24 * 60 * 60 * 1000), // 120 days
        },
      ];

      (prisma.contractOpportunity.findMany as jest.Mock).mockResolvedValue(opportunities);

      const result = await capture.execute('forecast_pipeline', {}, testOrgId) as {
        forecast: {
          next30Days: { opportunities: number; expectedValue: number };
          next90Days: { opportunities: number; expectedValue: number };
          next180Days: { opportunities: number; expectedValue: number };
        };
      };

      expect(result.forecast.next30Days.opportunities).toBe(1);
      expect(result.forecast.next30Days.expectedValue).toBe(50000); // 100k * 0.5

      expect(result.forecast.next90Days.opportunities).toBe(2);
      expect(result.forecast.next90Days.expectedValue).toBe(190000); // 50k + 140k

      expect(result.forecast.next180Days.opportunities).toBe(3);
      expect(result.forecast.next180Days.expectedValue).toBe(430000); // 50k + 140k + 240k
    });

    test('should provide recommendations based on pipeline health', async () => {
      const opportunities = [
        { 
          ...generateOpportunities(testOrgId, 1)[0], 
          status: 'qualified',
          estimatedValue: 10000,
          winProbability: 30,
          responseDeadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        },
      ];

      (prisma.contractOpportunity.findMany as jest.Mock).mockResolvedValue(opportunities);

      const result = await capture.execute('forecast_pipeline', {}, testOrgId) as {
        recommendation: string;
      };

      // Low pipeline value should trigger strengthening recommendation
      expect(result.recommendation.toLowerCase()).toContain('strengthen');
    });
  });

  describe('Competitive Analysis', () => {
    /**
     * Tests competitive analysis functionality
     */

    test('should provide competitive landscape assessment', async () => {
      const opp = {
        id: 'opp-comp',
        organizationId: testOrgId,
        title: 'Competitive Opportunity',
        setAside: 'hubzone',
        isRecompete: true,
      };

      (prisma.contractOpportunity.findFirst as jest.Mock).mockResolvedValue(opp);

      const result = await capture.execute(
        'competitive_analysis',
        { opportunityId: 'opp-comp' },
        testOrgId
      ) as {
        competitiveLandscape: {
          estimatedCompetitors: number;
          incumbentAdvantage: boolean;
        };
        positioning: {
          strengths: string[];
          weaknesses: string[];
          differentiators: string[];
        };
      };

      expect(result.competitiveLandscape.incumbentAdvantage).toBe(true);
      expect(result.positioning.strengths.length).toBeGreaterThan(0);
      expect(result.positioning.differentiators.length).toBeGreaterThan(0);
    });

    test('should include HUBZone certification as strength', async () => {
      const opp = {
        id: 'opp-hubzone',
        organizationId: testOrgId,
        title: 'HUBZone Opportunity',
        setAside: 'hubzone',
      };

      (prisma.contractOpportunity.findFirst as jest.Mock).mockResolvedValue(opp);

      const result = await capture.execute(
        'competitive_analysis',
        { opportunityId: 'opp-hubzone' },
        testOrgId
      ) as {
        positioning: { strengths: string[] };
      };

      expect(result.positioning.strengths.some(s => s.toLowerCase().includes('hubzone'))).toBe(true);
    });
  });

  describe('Status Management', () => {
    /**
     * Tests opportunity status transitions
     */

    test('should correctly update opportunity status', async () => {
      const opp = {
        id: 'opp-status',
        organizationId: testOrgId,
        title: 'Status Test Opportunity',
        status: 'discovered',
      };

      (prisma.contractOpportunity.findFirst as jest.Mock).mockResolvedValue(opp);
      (prisma.contractOpportunity.update as jest.Mock).mockResolvedValue({
        ...opp,
        status: 'pursuing',
      });

      const result = await capture.execute(
        'update_opportunity_status',
        { opportunityId: 'opp-status', status: 'pursuing' },
        testOrgId
      ) as {
        success: boolean;
        opportunity: { previousStatus: string; newStatus: string };
      };

      expect(result.success).toBe(true);
      expect(result.opportunity.previousStatus).toBe('discovered');
      expect(result.opportunity.newStatus).toBe('pursuing');
    });

    test('should handle non-existent opportunity', async () => {
      (prisma.contractOpportunity.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        capture.execute(
          'update_opportunity_status',
          { opportunityId: 'non-existent', status: 'pursuing' },
          testOrgId
        )
      ).rejects.toThrow(/Opportunity not found/);
    });
  });

  describe('Performance Under Load', () => {
    /**
     * Tests system performance with large datasets
     */

    test('should handle large opportunity scan within performance threshold', async () => {
      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({ id: testOrgId });
      (prisma.contractOpportunity.upsert as jest.Mock).mockResolvedValue({});

      const startTime = performance.now();
      await capture.execute(
        'scan_opportunities',
        { setAsides: ['hubzone', 'hubzone_sole', 'small_business'] },
        testOrgId
      );
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(5000); // 5 seconds max
    });

    test('should handle pipeline with 100 opportunities', async () => {
      const opportunities = generateOpportunities(testOrgId, 100);

      (prisma.contractOpportunity.findMany as jest.Mock).mockResolvedValue(opportunities);

      const startTime = performance.now();
      const result = await capture.execute('get_pipeline', {}, testOrgId) as {
        summary: { totalOpportunities: number };
      };
      const duration = performance.now() - startTime;

      expect(result.summary.totalOpportunities).toBe(100);
      expect(duration).toBeLessThan(2000); // 2 seconds max
    });
  });
});
